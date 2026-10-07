#!/usr/bin/env python3
"""
Envio automatizado de mensalidades — D&P Contabilidade
- Lê planilha de pagamentos confirmados (setembro/2026)
- Encontra recibos PDF de outubro para cada cliente
- Extrai histórico de pagamentos dos e-mails anteriores
- Envia e-mail com recibo anexado + tabela de histórico
- Notifica admin quando recibo não for encontrado
"""

import os, re, base64, time, unicodedata, json
from pathlib import Path
from datetime import datetime
import openpyxl
import pdfplumber
import msal
import requests

# ══════════════════════════════════════════════════════════════
#  CONFIGURAÇÃO
# ══════════════════════════════════════════════════════════════

DIR_RECIBOS = r"C:\Users\richa\Downloads\POC\POC"
EXCEL_PATH  = r"C:\Users\richa\Downloads\POC\POC\Lista_Pagamentos_Assessoria_ em 09.2026.xlsx"
CONFIG_PATH = Path(__file__).parent / "config_mensalidades.json"

# Azure / MSAL
CLIENT_ID = "eab9ff97-5ecd-469c-9aff-b052f5292276"
TENANT_ID = "4d165578-37cc-47a0-8c26-824f756e9301"
SCOPES    = ["Mail.Send"]

# True = só mostra o que FARIA (sem enviar). False = envia de verdade.
MODO_SIMULACAO = True

def carregar_config():
    """Lê e-mails do config_mensalidades.json"""
    if not CONFIG_PATH.exists():
        print(f"⚠ config_mensalidades.json não encontrado em {CONFIG_PATH}")
        return {}, ""
    with open(CONFIG_PATH, encoding="utf-8") as f:
        cfg = json.load(f)
    return cfg.get("clientes", {}), cfg.get("email_erro", "")

# Dados bancários que aparecem no rodapé de cada e-mail
DADOS_BANCARIOS = """Chave PIX CNPJ: <strong>30.842.467/0001-40</strong><br>
Banco: 290 – PagSeguro Internet Instituição de Pagamento S.A.<br>
AG. 0001 | C/C: 06800987-7 | Tipo: Conta de pagamento<br>
Nome: PAULA SALETE CARDOSO DE MEIRELES ME"""

ASSINATURA = """D&amp;P Contabilidade<br>
<a href="mailto:paula@depcontabil.com.br">paula@depcontabil.com.br</a>"""


# ══════════════════════════════════════════════════════════════
# AUTENTICAÇÃO
# ══════════════════════════════════════════════════════════════

def autenticar():
    app = msal.PublicClientApplication(
        CLIENT_ID, authority=f"https://login.microsoftonline.com/{TENANT_ID}"
    )
    contas = app.get_accounts()
    if contas:
        r = app.acquire_token_silent(SCOPES, account=contas[0])
        if r and "access_token" in r:
            print("✓ Autenticado (token em cache)!")
            return r["access_token"]
    flow = app.initiate_device_flow(scopes=SCOPES)
    print("=" * 60)
    print(f"Acesse: {flow['verification_uri']}")
    print(f"Código: {flow['user_code']}")
    print("=" * 60)
    r = app.acquire_token_by_device_flow(flow)
    if "access_token" not in r:
        raise RuntimeError(r.get("error_description", "Autenticação falhou"))
    print("✓ Autenticado!")
    return r["access_token"]


# ══════════════════════════════════════════════════════════════
# LEITURA DO EXCEL
# ══════════════════════════════════════════════════════════════

def ler_excel(path):
    wb = openpyxl.load_workbook(path)
    ws = wb.active
    dados = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row[0] or not isinstance(row[0], int):
            continue
        dados.append({
            "num":      row[0],
            "empresa":  str(row[1] or "").strip(),
            "descricao":str(row[2] or "").strip(),
            "data_pag": row[3],   # datetime object
            "forma":    str(row[4] or "").strip(),
            "pagador":  str(row[5] or "").strip(),
            "valor":    float(row[6] or 0),
        })
    return dados


# ══════════════════════════════════════════════════════════════
# MATCHING DE PDFs
# ══════════════════════════════════════════════════════════════

def norm(s):
    """Normaliza string: remove acentos, pontuação, lowercase."""
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode()
    return re.sub(r'\W+', ' ', s).lower().strip()

STOP_WORDS = {'ltda', 'me', 'de', 'da', 'do', 'e', 'em', 'the', 'a', 'o'}

def palavras_chave(empresa):
    return [p for p in norm(empresa).split() if len(p) > 2 and p not in STOP_WORDS]

def encontrar_pdfs(empresa, dir_path):
    """
    Retorna (recibo_path, historico_path):
    - recibo_path: PDF numerado (41xxx) = recibo do mês atual
    - historico_path: PDF nomeado = e-mail histórico anterior
    """
    pdfs = list(Path(dir_path).glob("*.pdf"))
    palavras = palavras_chave(empresa)

    melhor_recibo   = (None, 0)
    melhor_historico = (None, 0)

    for pdf in pdfs:
        nome_norm = norm(pdf.stem)
        hits = sum(1 for p in palavras if p in nome_norm)
        if hits == 0:
            continue
        if re.match(r'^\d{5}', pdf.name):
            if hits > melhor_recibo[1]:
                melhor_recibo = (pdf, hits)
        else:
            # Exclui a própria planilha
            if pdf.suffix.lower() == '.pdf' and hits > melhor_historico[1]:
                melhor_historico = (pdf, hits)

    return melhor_recibo[0], melhor_historico[0]


# ══════════════════════════════════════════════════════════════
# EXTRAÇÃO DE DADOS DOS PDFs
# ══════════════════════════════════════════════════════════════

def extrair_historico(pdf_path):
    """
    Extrai linhas de histórico do PDF de e-mail anterior.
    Retorna lista de dicts: {descricao, vencimento, valor, pago_em}
    """
    if not pdf_path:
        return []
    itens = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            texto = "\n".join(p.extract_text() or "" for p in pdf.pages)
        linhas = texto.split('\n')
        i = 0
        while i < len(linhas):
            linha = linhas[i].strip()
            m = re.match(
                r'(R\$\s+[\d.,]+)\s+-\s+(Assessoria[^–]*?)(?:\s*[–-]+\s*venc\.\s*(\d{2}/\d{2}/\d{4}))?$',
                linha
            )
            if m:
                item = {
                    "valor":      m.group(1).strip(),
                    "descricao":  m.group(2).strip(),
                    "vencimento": m.group(3) or "—",
                    "pago_em":    None,
                }
                # Próxima linha pode ser confirmação de pagamento
                if i+1 < len(linhas) and 'agradecemos o pagamento' in linhas[i+1].lower():
                    m2 = re.search(r'(\d{2}/\d{2}/\d{4})', linhas[i+1])
                    item["pago_em"] = m2.group(1) if m2 else "—"
                    i += 1
                itens.append(item)
            i += 1
    except Exception as e:
        print(f"    ⚠ Erro ao extrair histórico: {e}")
    return itens

def extrair_vencimento_recibo(pdf_path):
    """Extrai data de vencimento do recibo numerado."""
    if not pdf_path:
        return None
    try:
        with pdfplumber.open(pdf_path) as pdf:
            texto = "\n".join(p.extract_text() or "" for p in pdf.pages)
        m = re.search(r'Vencimento\s+(\d{2}/\d{2}/\d{4})', texto)
        if m:
            return m.group(1)
    except Exception as e:
        print(f"    ⚠ Erro ao extrair vencimento: {e}")
    return None

def extrair_ref_recibo(pdf_path):
    """Extrai referência (Ref. MM/YYYY) do recibo numerado."""
    if not pdf_path:
        return None
    try:
        with pdfplumber.open(pdf_path) as pdf:
            texto = "\n".join(p.extract_text() or "" for p in pdf.pages)
        m = re.search(r'Ref\.\s*(\d{2}/\d{4})', texto)
        if m:
            return m.group(1)
    except:
        pass
    return None


# ══════════════════════════════════════════════════════════════
# CONSTRUÇÃO DO E-MAIL HTML
# ══════════════════════════════════════════════════════════════

def fmt_valor(v):
    return f"R$ {v:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

def build_html(empresa, pagador, historico, valor, vencimento_str, ref_str):
    nome_curto = pagador.split()[0].capitalize() if pagador else empresa

    # Linhas da tabela de histórico (passado)
    rows_hist = ""
    for item in historico:
        if item["pago_em"]:
            status_html = f'<span style="color:#15803d;font-weight:600">✓ Pago em {item["pago_em"]}</span>'
        else:
            status_html = f'<span style="color:#b45309;font-weight:600">⏳ Pendente</span>'
        rows_hist += f"""
        <tr>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0">{item["descricao"]}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:center">{item["vencimento"]}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right">{item["valor"]}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0">{status_html}</td>
        </tr>"""

    # Linha do próximo (atual) pagamento, destacada
    desc_prox = f"Assessoria mensal referente {ref_str}" if ref_str else "Assessoria Contábil Mensal"
    venc_prox  = vencimento_str or "—"
    rows_hist += f"""
        <tr style="background:#eff6ff">
          <td style="padding:8px 10px;font-weight:700;color:#1e40af">{desc_prox}</td>
          <td style="padding:8px 10px;text-align:center;font-weight:700;color:#1e40af">{venc_prox}</td>
          <td style="padding:8px 10px;text-align:right;font-weight:700;color:#1e40af">{fmt_valor(valor)}</td>
          <td style="padding:8px 10px;color:#b45309;font-weight:700">⏳ Aguardando pagamento</td>
        </tr>"""

    return f"""<!DOCTYPE html>
<html><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1a202c;max-width:620px;margin:0 auto">

<p>Olá, <strong>{nome_curto}</strong>! Tudo bem?</p>

<p>Segue em anexo o recibo de mensalidade de assessoria contábil.<br>
Confira o histórico de pagamentos abaixo e efetue o pagamento até o vencimento.</p>

<h3 style="color:#1e40af;border-left:4px solid #1e40af;padding-left:10px;margin:24px 0 10px">
  Histórico de Pagamentos — {empresa}
</h3>

<table style="width:100%;border-collapse:collapse;font-size:10pt">
  <thead>
    <tr style="background:#1e40af;color:#ffffff">
      <th style="padding:8px 10px;text-align:left">Descrição</th>
      <th style="padding:8px 10px;text-align:center;width:110px">Vencimento</th>
      <th style="padding:8px 10px;text-align:right;width:110px">Valor</th>
      <th style="padding:8px 10px;text-align:left;width:170px">Status</th>
    </tr>
  </thead>
  <tbody>{rows_hist}
  </tbody>
</table>

<div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #1e40af;
            border-radius:6px;padding:14px 16px;margin-top:20px;font-size:10pt">
  <strong>Dados para pagamento:</strong><br>
  {DADOS_BANCARIOS}
</div>

<p style="margin-top:20px">
  O recibo de {fmt_valor(valor)} está em anexo neste e-mail.<br>
  Qualquer dúvida, estamos à disposição!
</p>

<p>Atenciosamente,<br>
<strong>{ASSINATURA}</strong></p>

</body></html>"""


def build_html_alerta(empresa, pagador, valor, data_pag):
    data_str = data_pag.strftime('%d/%m/%Y') if data_pag else "—"
    return f"""<!DOCTYPE html>
<html><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1a202c">
<h3 style="color:#b91c1c">⚠ Recibo não encontrado — {empresa}</h3>
<p>O robô de envio de mensalidades não encontrou o arquivo PDF de recibo para o cliente abaixo.</p>
<table style="border-collapse:collapse;margin:12px 0;font-size:10.5pt">
  <tr><td style="padding:5px 16px 5px 0;font-weight:700;color:#64748b">Empresa:</td><td>{empresa}</td></tr>
  <tr><td style="padding:5px 16px 5px 0;font-weight:700;color:#64748b">Pagador:</td><td>{pagador}</td></tr>
  <tr><td style="padding:5px 16px 5px 0;font-weight:700;color:#64748b">Valor:</td><td>R$ {valor:,.2f}</td></tr>
  <tr><td style="padding:5px 16px 5px 0;font-weight:700;color:#64748b">Último pagamento:</td><td>{data_str}</td></tr>
</table>
<p><strong>Ação necessária:</strong> gerar o recibo manualmente e enviar para o cliente.</p>
<p style="color:#64748b;font-size:9.5pt">Mensagem automática — robô de mensalidades D&P</p>
</body></html>"""


# ══════════════════════════════════════════════════════════════
# ENVIO VIA GRAPH API
# ══════════════════════════════════════════════════════════════

def enviar_email(token, para, assunto, html_body, anexo_path=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    anexos = []
    if anexo_path and Path(anexo_path).exists():
        with open(anexo_path, 'rb') as f:
            conteudo_b64 = base64.b64encode(f.read()).decode()
        anexos.append({
            "@odata.type": "#microsoft.graph.fileAttachment",
            "name": Path(anexo_path).name,
            "contentType": "application/pdf",
            "contentBytes": conteudo_b64,
        })
    payload = {
        "message": {
            "subject": assunto,
            "body": {"contentType": "HTML", "content": html_body},
            "toRecipients": [{"emailAddress": {"address": para}}],
            "attachments": anexos,
        },
        "saveToSentItems": True,
    }
    r = requests.post(
        "https://graph.microsoft.com/v1.0/me/sendMail",
        headers=headers, json=payload
    )
    if r.status_code not in (200, 202):
        raise RuntimeError(f"Erro HTTP {r.status_code}: {r.text[:300]}")


# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════

def main():
    print("=" * 64)
    print("  Envio de Mensalidades — D&P Contabilidade")
    print("=" * 64)
    if MODO_SIMULACAO:
        print("⚠  MODO SIMULAÇÃO — nenhum e-mail será enviado de verdade\n")

    EMAILS_CLIENTES, EMAIL_ADMIN = carregar_config()
    print(f"📧 Config carregada: {sum(1 for v in EMAILS_CLIENTES.values() if v)} e-mails preenchidos")
    if EMAIL_ADMIN:
        print(f"📬 Alertas de erro → {EMAIL_ADMIN}")

    token = autenticar() if not MODO_SIMULACAO else "TOKEN_SIMULADO"
    clientes = ler_excel(EXCEL_PATH)
    print(f"📋 {len(clientes)} clientes na planilha\n")

    enviados  = []
    faltantes = []
    sem_email = []

    for c in clientes:
        empresa = c["empresa"]
        email   = EMAILS_CLIENTES.get(empresa, "").strip()

        print(f"── {empresa} {'─'*(50 - len(empresa))}")

        # Verifica se e-mail está configurado
        if not email:
            print(f"  ⚠ E-mail não configurado — pulando")
            sem_email.append(empresa)
            continue

        # Busca PDFs
        recibo_path, hist_path = encontrar_pdfs(empresa, DIR_RECIBOS)

        if recibo_path:
            print(f"  ✓ Recibo:    {recibo_path.name}")
        else:
            print(f"  ✗ Recibo:    não encontrado")

        if hist_path:
            print(f"  ✓ Histórico: {hist_path.name}")
        else:
            print(f"  ⚠ Histórico: não encontrado (usará apenas dados da planilha)")

        # Caso sem recibo → notificar admin
        if not recibo_path:
            faltantes.append(empresa)
            assunto_alerta = f"⚠ Recibo faltante — {empresa}"
            html_alerta = build_html_alerta(empresa, c["pagador"], c["valor"], c["data_pag"])
            if MODO_SIMULACAO:
                print(f"  → [SIM] Enviaria alerta para {EMAIL_ADMIN}")
            else:
                try:
                    enviar_email(token, EMAIL_ADMIN, assunto_alerta, html_alerta)
                    print(f"  → ✓ Alerta enviado para {EMAIL_ADMIN}")
                except Exception as e:
                    print(f"  → ✗ Erro ao enviar alerta: {e}")
            continue

        # Extrai dados do recibo e do histórico
        historico     = extrair_historico(hist_path)
        vencimento    = extrair_vencimento_recibo(recibo_path)
        ref           = extrair_ref_recibo(recibo_path)

        print(f"  Vencimento: {vencimento}  |  Ref: {ref}  |  Histórico: {len(historico)} linhas")

        # Monta e-mail
        assunto = (
            f"{empresa} - Assessoria Contábil Mensal"
            f" - venc. {vencimento or '??'}"
            f" - {fmt_valor(c['valor'])}"
        )
        html_body = build_html(
            empresa, c["pagador"], historico,
            c["valor"], vencimento, ref
        )

        print(f"  Para:    {email}")
        print(f"  Assunto: {assunto}")

        if MODO_SIMULACAO:
            print(f"  → [SIM] E-mail pronto ✓")
        else:
            try:
                enviar_email(token, email, assunto, html_body, recibo_path)
                print(f"  → ✓ Enviado!")
                enviados.append(empresa)
                time.sleep(10)   # pausa entre envios
            except Exception as e:
                print(f"  → ✗ Erro: {e}")

        print()

    # Resumo final
    print("\n" + "=" * 64)
    print(f"  RESUMO")
    print(f"  Enviados:           {len(enviados)}")
    print(f"  Recibos faltantes:  {len(faltantes)}  → alerta enviado ao admin")
    print(f"  Sem e-mail config.: {len(sem_email)}")
    if faltantes:
        print(f"  Faltantes: {', '.join(faltantes)}")
    if sem_email:
        print(f"  Sem e-mail: {', '.join(sem_email)}")
    print("=" * 64)


if __name__ == "__main__":
    main()
