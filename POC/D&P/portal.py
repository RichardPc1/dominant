#!/usr/bin/env python3
"""
Portal de Mensalidades — D&P Contabilidade
Execute: python portal.py
Abre automaticamente em http://localhost:5000
"""

import re, time, unicodedata, threading, webbrowser, json, smtplib, html
from pathlib import Path
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from flask import Flask, request, jsonify, Response
import openpyxl
import pdfplumber

app = Flask(__name__)

# ─── Caminhos ────────────────────────────────────────────
DIR_RECIBOS = r"C:\Users\richa\Downloads\POC\POC"
EXCEL_PATH  = r"C:\Users\richa\Downloads\POC\POC\Lista_Pagamentos_Assessoria_ em 09.2026.xlsx"

# Credenciais salvas (arquivo local, fora do Git) — preenche os campos sozinho
CRED_PATH = Path(__file__).with_name("credenciais.json")

def carregar_cred():
    try:
        return json.loads(CRED_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}

def salvar_cred(remetente, senha, email_sucesso, email_erro):
    try:
        CRED_PATH.write_text(json.dumps({
            "remetente": remetente, "senha": senha,
            "email_sucesso": email_sucesso, "email_erro": email_erro,
        }, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        log("warn", f"Não consegui salvar credenciais: {e}")

DADOS_BANCARIOS = """Chave PIX CNPJ: <strong>30.842.467/0001-40</strong><br>
Banco: 290 – PagSeguro Internet Instituição de Pagamento S.A.<br>
AG. 0001 | C/C: 06800987-7 | Tipo: Conta de pagamento<br>
Nome: PAULA SALETE CARDOSO DE MEIRELES ME"""

_log_queue = []
_running   = False
_stop      = False       # sinaliza pedido de parada no meio do envio
_pdf_cache = {}          # texto já extraído de cada PDF (evita reabrir)


# ═══════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════

def log(tipo, msg):
    """tipo: info | ok | erro | warn"""
    _log_queue.append({"tipo": tipo, "msg": msg})

def norm(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode()
    return re.sub(r'\W+', ' ', s).lower().strip()

STOP = {'ltda','me','de','da','do','e','em','a','o'}

def palavras(empresa):
    ws = [p for p in norm(empresa).split() if p not in STOP]
    long_ws = [p for p in ws if len(p) > 2]
    return long_ws if long_ws else ws  # fallback p/ nomes curtos como J&O

def encontrar_pdfs(empresa):
    pdfs = list(Path(DIR_RECIBOS).glob("*.pdf"))
    pk   = palavras(empresa)
    rec  = (None, 0)
    hist = (None, 0)
    for pdf in pdfs:
        n_words = norm(pdf.stem).split()
        h = sum(1 for p in pk if p in n_words)  # word match, não substring
        if h == 0: continue
        if re.match(r'^\d{5}', pdf.name):
            if h > rec[1]: rec = (pdf, h)
        else:
            if h > hist[1]: hist = (pdf, h)
    return rec[0], hist[0]

def ler_texto_pdf(pdf_path):
    """Extrai o texto do PDF uma única vez e guarda em cache."""
    if not pdf_path: return ""
    key = str(pdf_path)
    if key in _pdf_cache:
        return _pdf_cache[key]
    txt = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            txt = "\n".join(p.extract_text() or "" for p in pdf.pages)
    except Exception as e:
        log("warn", f"Erro ao ler PDF {Path(pdf_path).name}: {e}")
    _pdf_cache[key] = txt
    return txt

# Sinais genéricos (independem do formato que a contadora escreveu)
_RE_VENC   = re.compile(r'(?:venc\.?|vencimento)\s*:?\s*(\d{2}/\d{2}/\d{4})', re.I)
_RE_VALOR  = re.compile(r'R\$\s*([\d.]*\d,\d{2}|\d+)')
_RE_REF    = re.compile(r'ref(?:erente)?\.?\s*(\d{2}/\d{4})', re.I)
_RE_PAGO   = re.compile(r'pagamento\s+em\s*(\d{2}/\d{2}/\d{4})', re.I)
_RE_ABERTO = re.compile(r'n[aã]o\s+localizad|em\s+aberto|pendente|n[aã]o\s+pag', re.I)
_RE_CABECALHO = re.compile(r'hist[oó]rico\s+de\s+pagamento|controle\s+de\s+pagamento', re.I)
_RE_RODAPE    = re.compile(r'dados\s+banc|atenciosamente|chave\s+pix', re.I)

def extrair_historico(pdf_path):
    """Parser genérico: cada linha que tem um vencimento é uma parcela.
    O status (paga / em aberto / mês atual) é deduzido por palavras-sinal,
    e marcadores que quebraram em 2 linhas (ex: '**não\\nlocalizado**') são
    recolados. Funciona para qualquer formato de recibo, não é chumbado."""
    if not pdf_path:
        return []
    itens = []
    try:
        texto = ler_texto_pdf(pdf_path)
        tem_cabecalho = bool(_RE_CABECALHO.search(texto))
        linhas = texto.split('\n')
        dentro = False
        atual  = None

        def fechar(it):
            if not it:
                return
            txt = it.pop("_resto")
            mp = _RE_PAGO.search(txt)
            if mp:
                it["status"], it["pago_em"] = "pago", mp.group(1)
            elif _RE_ABERTO.search(txt):
                it["status"], it["pago_em"] = "aberto", None
            else:
                it["status"], it["pago_em"] = "atual", None
            itens.append(it)

        for ln in linhas:
            l = ln.strip()
            if not l:
                continue
            if _RE_CABECALHO.search(l):
                dentro = True
                continue
            if _RE_RODAPE.search(l):
                break
            if not dentro:
                if tem_cabecalho:
                    continue   # há cabeçalho no doc: só começa depois dele (ignora Assunto etc.)
                # sem cabeçalho claro: começa na 1ª linha que tiver vencimento
                if not _RE_VENC.search(l):
                    continue
                dentro = True
            mvenc = _RE_VENC.search(l)
            if mvenc:
                fechar(atual)
                mval = _RE_VALOR.search(l)
                mref = _RE_REF.search(l)
                atual = {
                    "valor":      f"R$ {mval.group(1)}" if mval else "—",
                    "vencimento": mvenc.group(1),
                    "ref":        mref.group(1) if mref else None,
                    "_resto":     l[mvenc.end():],   # status que veio na mesma linha
                }
            elif atual is not None:
                atual["_resto"] += " " + l            # continuação (status quebrado)
        fechar(atual)
    except Exception as e:
        log("warn", f"Erro ao extrair histórico: {e}")
    return itens

def extrair_vencimento(pdf_path):
    if not pdf_path: return None
    m = re.search(r'Vencimento\s+(\d{2}/\d{2}/\d{4})', ler_texto_pdf(pdf_path))
    return m.group(1) if m else None

def extrair_ref(pdf_path):
    if not pdf_path: return None
    m = re.search(r'Ref\.\s*(\d{2}/\d{4})', ler_texto_pdf(pdf_path))
    return m.group(1) if m else None

def fmt_valor(v):
    return f"R$ {v:,.2f}".replace(',','X').replace('.',',').replace('X','.')

def valor_num(s):
    """'R$ 1.250,00' -> 1250.0 ; '180' -> 180.0"""
    m = re.search(r'([\d.]*\d,\d{2}|\d+)', str(s))
    if not m:
        return 0.0
    v = m.group(1).replace('.', '').replace(',', '.')
    try:
        return float(v)
    except ValueError:
        return 0.0

def ler_excel():
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active
    dados = []
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row[0] or not isinstance(row[0], int): continue
        dados.append({
            "empresa": str(row[1] or "").strip(),
            "pagador": str(row[5] or "").strip(),
            "valor":   float(row[6] or 0),
            "data_pag": row[3],
        })
    return dados


# ═══════════════════════════════════════════════════════
# TEMPLATES DE E-MAIL
# ═══════════════════════════════════════════════════════

def email_cliente(empresa, pagador, historico, valor, vencimento, ref):
    nome = pagador.strip() if pagador else empresa
    rows = ""
    em_aberto = [it for it in historico if it.get("status") == "aberto"]

    def desc_de(it):
        return f"Assessoria mensal ref. {it['ref']}" if it.get("ref") else "Assessoria Contábil"

    # Linhas do histórico: pagas (verde) e em aberto (vermelho).
    # As entradas "atual" (mês corrente, sem marcador) saem na linha azul abaixo.
    linhas_hist = [it for it in historico if it.get("status") in ("pago", "aberto")]
    if not linhas_hist and not historico:
        rows += f"""<tr>
          <td colspan="4" style="padding:10px;text-align:center;color:#64748b;font-style:italic;
              border-bottom:1px solid #e2e8f0">Primeiro pagamento registrado</td></tr>"""
    else:
        for it in linhas_hist:
            if it["status"] == "pago":
                st = f'<span style="color:#15803d;font-weight:600">✓ Pago em {it["pago_em"]}</span>'
                bg = ""
            else:  # aberto
                st = '<span style="color:#b91c1c;font-weight:700">✗ Em aberto</span>'
                bg = "background:#fef2f2;"
            rows += f"""<tr style="{bg}">
              <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0">{desc_de(it)}</td>
              <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:center">{it["vencimento"]}</td>
              <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right">{it["valor"]}</td>
              <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0">{st}</td></tr>"""

    desc_prox = f"Assessoria mensal referente {ref}" if ref else "Assessoria Contábil Mensal"
    rows += f"""<tr style="background:#eff6ff">
      <td style="padding:8px 10px;font-weight:700;color:#1e40af">{desc_prox}</td>
      <td style="padding:8px 10px;text-align:center;font-weight:700;color:#1e40af">{vencimento or '—'}</td>
      <td style="padding:8px 10px;text-align:right;font-weight:700;color:#1e40af">{fmt_valor(valor)}</td>
      <td style="padding:8px 10px;color:#b45309;font-weight:700">⏳ Aguardando pagamento</td></tr>"""

    # Destaque das parcelas realmente em aberto (não localizadas)
    aviso_aberto = ""
    if em_aberto:
        total_ab = sum(valor_num(it["valor"]) for it in em_aberto)
        total_geral = total_ab + float(valor or 0)
        itens_ab = "".join(
            f'<li style="margin:3px 0">{desc_de(it)} — venc. {it["vencimento"]} — <strong>{it["valor"]}</strong></li>'
            for it in em_aberto
        )
        aviso_aberto = f"""
<div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #b91c1c;border-radius:6px;padding:14px 16px;margin-top:20px;font-size:10pt">
  <strong style="color:#b91c1c">⚠ {len(em_aberto)} parcela(s) em aberto</strong>
  <ul style="margin:8px 0 0;padding-left:20px;color:#1a202c">{itens_ab}</ul>
  <p style="margin:10px 0 0">Total em aberto: <strong style="color:#b91c1c">{fmt_valor(total_ab)}</strong>
  &nbsp;·&nbsp; Com a mensalidade atual: <strong>{fmt_valor(total_geral)}</strong></p>
</div>"""

    return (
        f"{empresa} - Assessoria Contábil Mensal - venc. {vencimento or '??'} - {fmt_valor(valor)}",
        f"""<!DOCTYPE html><html><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1a202c;max-width:620px;margin:0 auto">
<p>Olá, <strong>{nome}</strong>! Tudo bem?</p>
<p>Segue em anexo o recibo de mensalidade de assessoria contábil.<br>
Confira o histórico abaixo e efetue o pagamento até o vencimento.</p>
<h3 style="color:#1e40af;border-left:4px solid #1e40af;padding-left:10px;margin:24px 0 10px">
  Histórico de Pagamentos — {empresa}</h3>
<table style="width:100%;border-collapse:collapse;font-size:10pt">
  <thead><tr style="background:#1e40af;color:#fff">
    <th style="padding:8px 10px;text-align:left">Descrição</th>
    <th style="padding:8px 10px;width:110px;text-align:center">Vencimento</th>
    <th style="padding:8px 10px;width:110px;text-align:right">Valor</th>
    <th style="padding:8px 10px;width:170px">Status</th>
  </tr></thead>
  <tbody>{rows}</tbody>
</table>
{aviso_aberto}
<div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #1e40af;border-radius:6px;padding:14px 16px;margin-top:20px;font-size:10pt">
  <strong>Dados para pagamento:</strong><br>{DADOS_BANCARIOS}</div>
<p style="margin-top:20px">O recibo de {fmt_valor(valor)} está em anexo.<br>Qualquer dúvida, estamos à disposição!</p>
<p>Atenciosamente,<br><strong>D&amp;P Contabilidade</strong><br>
<a href="mailto:paula@depcontabil.com.br">paula@depcontabil.com.br</a></p>
</body></html>"""
    )


def email_relatorio_erros(erros, orfaos=None, sem_historico=None):
    """erros = [{empresa,pagador,valor,motivo}] (não enviados);
    sem_historico = [{empresa,pagador,valor,motivo}] (enviados sem histórico);
    orfaos = [Path] PDFs sem empresa na planilha."""
    secao_erros = ""
    if erros:
        rows = ""
        for e in erros:
            rows += f"""<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0"><strong>{e["empresa"]}</strong></td>
              <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">{e["pagador"]}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">{fmt_valor(e["valor"])}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#b91c1c">{e["motivo"]}</td>
            </tr>"""
        total_val = sum(e["valor"] for e in erros)
        secao_erros = f"""
<h3 style="color:#b91c1c;margin:20px 0 8px">❌ Não enviados — sem recibo ({len(erros)})</h3>
<table style="width:100%;border-collapse:collapse;font-size:10.5pt">
  <thead><tr style="background:#b91c1c;color:#fff">
    <th style="padding:9px 12px;text-align:left">Empresa</th>
    <th style="padding:9px 12px;text-align:left">Pagador</th>
    <th style="padding:9px 12px;text-align:right">Valor</th>
    <th style="padding:9px 12px;text-align:left">Motivo</th>
  </tr></thead>
  <tbody>{rows}</tbody>
</table>
<p style="color:#64748b;font-size:10pt">Total não enviado: <strong>{fmt_valor(total_val)}</strong></p>"""

    secao_sem_hist = ""
    if sem_historico:
        rows_h = ""
        for e in sem_historico:
            rows_h += f"""<tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0"><strong>{e["empresa"]}</strong></td>
              <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">{e["pagador"]}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#92400e">{e["motivo"]}</td>
            </tr>"""
        secao_sem_hist = f"""
<h3 style="color:#92400e;margin:24px 0 8px">⚠ Enviados sem histórico de pagamentos ({len(sem_historico)})</h3>
<p style="font-size:10pt;color:#64748b">Estes foram enviados só com o mês atual — o PDF de histórico não foi encontrado ou estava ilegível:</p>
<table style="width:100%;border-collapse:collapse;font-size:10.5pt">
  <thead><tr style="background:#92400e;color:#fff">
    <th style="padding:9px 12px;text-align:left">Empresa</th>
    <th style="padding:9px 12px;text-align:left">Pagador</th>
    <th style="padding:9px 12px;text-align:left">Motivo</th>
  </tr></thead>
  <tbody>{rows_h}</tbody>
</table>"""

    secao_orfaos = ""
    if orfaos:
        rows_o = "".join(
            f'<tr><td style="padding:7px 12px;border-bottom:1px solid #e2e8f0;color:#92400e">{p.name}</td></tr>'
            for p in orfaos
        )
        secao_orfaos = f"""
<h3 style="color:#92400e;margin:24px 0 8px">⚠ Recibos sem empresa na planilha ({len(orfaos)})</h3>
<p style="font-size:10pt;color:#64748b">Estes PDFs estão na pasta mas nenhuma empresa da planilha foi associada a eles:</p>
<table style="width:100%;border-collapse:collapse;font-size:10.5pt">
  <thead><tr style="background:#92400e;color:#fff">
    <th style="padding:9px 12px;text-align:left">Arquivo PDF</th>
  </tr></thead>
  <tbody>{rows_o}</tbody>
</table>"""

    total_problemas = len(erros) + len(sem_historico or []) + len(orfaos or [])
    return f"""<!DOCTYPE html><html><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1a202c;max-width:700px;margin:0 auto">
<div style="background:#fef2f2;border-left:4px solid #b91c1c;border-radius:6px;padding:14px 16px;margin-bottom:20px">
  <strong>⚠ Relatório de Ocorrências — Campanha de Mensalidades</strong><br>
  <span style="font-size:10pt;color:#64748b">Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')} — {total_problemas} ocorrência(s)</span>
</div>
{secao_erros}
{secao_sem_hist}
{secao_orfaos}
<p style="margin-top:24px;font-size:9.5pt;color:#94a3b8">Mensagem automática — robô de mensalidades D&P Contabilidade</p>
</body></html>"""


# ═══════════════════════════════════════════════════════
# SMTP (Gmail)
# ═══════════════════════════════════════════════════════

def montar_msg(remetente, para, assunto, html_body, anexo_path=None):
    msg = MIMEMultipart("mixed")
    msg["Subject"] = assunto
    msg["From"]    = remetente
    msg["To"]      = para
    msg.attach(MIMEText(html_body, "html", "utf-8"))
    if anexo_path and Path(anexo_path).exists():
        with open(anexo_path, "rb") as f:
            part = MIMEApplication(f.read(), Name=Path(anexo_path).name)
        part["Content-Disposition"] = f'attachment; filename="{Path(anexo_path).name}"'
        msg.attach(part)
    return msg

def conectar_smtp(remetente, senha):
    """Abre UMA conexão autenticada e reusa para todos os envios."""
    smtp = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30)
    smtp.login(remetente, senha)
    return smtp

def enviar_por(smtp, remetente, para, assunto, html_body, anexo_path=None):
    """Envia reusando a conexão aberta. Só constrói a mensagem e manda."""
    msg = montar_msg(remetente, para, assunto, html_body, anexo_path)
    smtp.sendmail(remetente, para, msg.as_string())

def enviar_smtp(remetente, senha, para, assunto, html_body, anexo_path=None):
    """Envio avulso (conexão própria) — usado para o relatório final."""
    with smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=30) as smtp:
        smtp.login(remetente, senha)
        enviar_por(smtp, remetente, para, assunto, html_body, anexo_path)


# ═══════════════════════════════════════════════════════
# LÓGICA DE ENVIO (roda em thread)
# ═══════════════════════════════════════════════════════

def processo_envio(email_sucesso, email_erro, remetente, senha):
    global _running, _stop
    _running = True
    _stop = False
    erros = []
    sem_historico = []     # enviados, mas sem histórico de pagamentos encontrado
    pdfs_usados = set()
    interrompido = False
    smtp = None

    try:
        clientes = ler_excel()
        log("info", f"📋 {len(clientes)} clientes encontrados na planilha")

        # Uma única conexão autenticada para todos os envios
        try:
            smtp = conectar_smtp(remetente, senha)
            log("info", "🔌 Conectado ao Gmail — enviando em sequência")
        except Exception as e:
            log("erro", f"✗ Não consegui conectar ao Gmail: {e}")
            return

        for c in clientes:
            if _stop:
                interrompido = True
                log("warn", "\n⏹ Parado por você — não vou enviar os clientes restantes.")
                break

            empresa = c["empresa"]
            log("info", f"── {empresa}")

            recibo, hist = encontrar_pdfs(empresa)

            # Recibo numerado é o anexo oficial. Sem ele, não envia e vai pro relatório.
            if not recibo:
                motivo = "Recibo numerado não encontrado na pasta"
                log("erro", f"  ✗ {motivo} — não enviado")
                erros.append({**c, "motivo": motivo})
                continue

            pdfs_usados.add(recibo)
            log("info", f"  Recibo: {recibo.name}")

            # Histórico vem do PDF não-numerado; se faltar, envia mesmo assim mas registra
            historico  = extrair_historico(hist) if hist else []
            if not historico:
                motivo_h = "PDF de histórico não encontrado" if not hist else "Histórico ilegível no PDF"
                log("warn", f"  ⚠ Sem histórico de pagamentos ({motivo_h}) — enviando só o mês atual")
                sem_historico.append({**c, "motivo": motivo_h})

            vencimento = extrair_vencimento(recibo)
            ref        = extrair_ref(recibo)

            assunto, html = email_cliente(
                empresa, c["pagador"], historico,
                c["valor"], vencimento, ref
            )

            try:
                try:
                    enviar_por(smtp, remetente, email_sucesso, assunto, html, recibo)
                except (smtplib.SMTPServerDisconnected, smtplib.SMTPConnectError, OSError):
                    # conexão caiu — reconecta uma vez e tenta de novo
                    log("warn", "  ↻ Conexão caiu, reconectando...")
                    smtp = conectar_smtp(remetente, senha)
                    enviar_por(smtp, remetente, email_sucesso, assunto, html, recibo)
                log("ok", f"  ✓ Enviado → {email_sucesso}")
            except Exception as e:
                motivo = str(e)
                log("erro", f"  ✗ Falha ao enviar: {motivo}")
                erros.append({**c, "motivo": motivo})

        orfaos = []
        if interrompido:
            log("warn", f"\n━━━ INTERROMPIDO: {len(pdfs_usados)} enviados · {len(erros)} falhas · restante não enviado ━━━")
        else:
            # Detectar recibos órfãos (na pasta mas sem empresa na planilha)
            todos_numerados = [p for p in Path(DIR_RECIBOS).glob("*.pdf")
                               if re.match(r'^\d{5}', p.name)]
            orfaos = [p for p in todos_numerados if p not in pdfs_usados]
            if orfaos:
                log("warn", f"\n⚠ {len(orfaos)} recibo(s) na pasta sem empresa associada na planilha:")
                for o in orfaos:
                    log("warn", f"  - {o.name}")

            # Relatório final (falhas de envio + sem histórico + recibos órfãos)
            if erros or orfaos or sem_historico:
                n_prob = len(erros) + len(orfaos) + len(sem_historico)
                log("info", f"\n📊 {n_prob} ocorrência(s) — enviando relatório para {email_erro}")
                try:
                    html_rel = email_relatorio_erros(erros, orfaos, sem_historico)
                    assunto_rel = (f"⚠ Relatório D&P — {len(erros)} sem recibo · "
                                   f"{len(sem_historico)} sem histórico · {len(orfaos)} órfão(s)")
                    enviar_smtp(remetente, senha, email_erro, assunto_rel, html_rel)
                    log("ok", f"  ✓ Relatório enviado para {email_erro}")
                except Exception as e:
                    log("erro", f"  ✗ Erro ao enviar relatório: {e}")
            else:
                log("ok", "\n✅ Todos enviados, com histórico completo e nenhum recibo órfão!")

            total_ok = len(clientes) - len(erros)
            log("info", f"\n━━━ CONCLUÍDO: {total_ok} enviados · {len(erros)} sem recibo · "
                        f"{len(sem_historico)} sem histórico · {len(orfaos)} órfãos ━━━")

    finally:
        if smtp is not None:
            try: smtp.quit()
            except Exception: pass
        _running = False
        _stop = False


# ═══════════════════════════════════════════════════════
# ROTAS
# ═══════════════════════════════════════════════════════

@app.route("/")
def index():
    c = carregar_cred()
    page = (HTML_PAGE
        .replace("__REM__",       html.escape(c.get("remetente", ""),     quote=True))
        .replace("__SENHA__",     html.escape(c.get("senha", ""),         quote=True))
        .replace("__EMAIL_OK__",  html.escape(c.get("email_sucesso", ""), quote=True))
        .replace("__EMAIL_ERR__", html.escape(c.get("email_erro", ""),    quote=True)))
    return page

@app.route("/api/enviar", methods=["POST"])
def api_enviar():
    global _log_queue, _running
    if _running:
        return jsonify({"erro": "Já em andamento"}), 409
    dados = request.json
    email_ok  = dados.get("email_sucesso", "").strip()
    email_err = dados.get("email_erro", "").strip()
    remetente = dados.get("remetente", "").strip()
    senha     = dados.get("senha", "").strip()
    if not all([email_ok, email_err, remetente, senha]):
        return jsonify({"erro": "Preencha todos os campos"}), 400
    salvar_cred(remetente, senha, email_ok, email_err)
    _log_queue = []
    t = threading.Thread(target=processo_envio,
                         args=(email_ok, email_err, remetente, senha), daemon=True)
    t.start()
    return jsonify({"ok": True})

@app.route("/api/parar", methods=["POST"])
def api_parar():
    global _stop
    if _running:
        _stop = True
        return jsonify({"ok": True})
    return jsonify({"ok": False, "erro": "Nada em andamento"})

@app.route("/api/log")
def api_log():
    """SSE — envia logs em tempo real"""
    idx = int(request.args.get("from", 0))
    def stream():
        pos = idx
        while True:
            while pos < len(_log_queue):
                item = _log_queue[pos]
                yield f"data: {json.dumps(item)}\n\n"
                pos += 1
            if not _running and pos >= len(_log_queue):
                yield "data: {\"tipo\":\"fim\"}\n\n"
                return
            time.sleep(0.3)
    return Response(stream(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


# ═══════════════════════════════════════════════════════
# INTERFACE
# ═══════════════════════════════════════════════════════

HTML_PAGE = """<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Portal Mensalidades — D&P</title>
<style>
  :root{--blue:#1e40af;--blue-lt:#eff6ff;--green:#15803d;--green-lt:#f0fdf4;
        --red:#b91c1c;--red-lt:#fef2f2;--yellow:#b45309;--yellow-lt:#fffbeb;
        --border:#e2e8f0;--muted:#64748b;--text:#1a202c;--bg:#f1f5f9;--card:#fff;
        color-scheme:light}
  @media(prefers-color-scheme:dark){:root:not([data-theme=light]){
    --bg:#0f172a;--card:#1e293b;--border:#334155;--text:#f1f5f9;--muted:#94a3b8;
    --blue:#60a5fa;--blue-lt:#1e3a5f;--green:#4ade80;--green-lt:#052e16;
    --red:#f87171;--red-lt:#450a0a;--yellow:#fbbf24;--yellow-lt:#451a03;
    color-scheme:dark}}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,-apple-system,sans-serif;background:var(--bg);color:var(--text);
       font-size:14px;padding-inline:16px;padding-block:0 32px}
  /* Header */
  .topbar{background:var(--blue);color:#fff;padding:18px 32px;margin-inline:-16px;
          display:flex;align-items:center;gap:14px;margin-bottom:28px}
  .logo{width:40px;height:40px;min-width:40px;background:rgba(255,255,255,.18);
        border-radius:9px;display:flex;align-items:center;justify-content:center;
        font-weight:800;font-size:17px}
  .topbar h1{font-size:16px;font-weight:700}
  .topbar p{font-size:12px;opacity:.75;margin-top:2px}
  /* Layout */
  .page{max-width:600px;margin:0 auto;display:flex;flex-direction:column;gap:16px}
  .card{background:var(--card);border:1px solid var(--border);border-radius:12px;
        padding:22px 24px;box-shadow:0 1px 3px rgba(0,0,0,.06)}
  .card-title{font-size:13px;font-weight:700;color:var(--blue);
              margin-bottom:16px;display:flex;align-items:center;gap:7px}
  /* Campos */
  .field{margin-bottom:14px}
  .field:last-child{margin-bottom:0}
  label{display:block;font-size:12px;font-weight:600;color:var(--muted);margin-bottom:5px}
  input[type=email],input[type=password],input[type=text]{
    width:100%;border:1.5px solid var(--border);border-radius:8px;
    padding:9px 12px;font-size:13.5px;font-family:inherit;
    background:var(--bg);color:var(--text);outline:none;
    transition:border-color .15s}
  input[type=email]:focus,input[type=password]:focus,input[type=text]:focus{border-color:var(--blue)}
  input[type=email].ok,input[type=text].ok{border-color:var(--green);background:var(--green-lt)}
  .hint{font-size:11px;color:var(--muted);margin-top:4px}
  /* Botão play */
  .play-btn{
    width:100%;border:none;border-radius:10px;
    padding:15px;font-size:15px;font-weight:700;
    cursor:pointer;font-family:inherit;
    background:var(--blue);color:#fff;
    display:flex;align-items:center;justify-content:center;gap:10px;
    transition:opacity .15s;letter-spacing:.3px}
  .play-btn:hover{opacity:.88}
  .play-btn:disabled{opacity:.4;cursor:not-allowed}
  .stop-btn{
    width:100%;border:none;border-radius:10px;
    padding:15px;font-size:15px;font-weight:700;
    cursor:pointer;font-family:inherit;
    background:var(--red);color:#fff;
    display:flex;align-items:center;justify-content:center;gap:10px;
    transition:opacity .15s;letter-spacing:.3px}
  .stop-btn:hover{opacity:.88}
  .stop-btn:disabled{opacity:.4;cursor:not-allowed}
  /* Log */
  #log-wrap{display:none}
  .log-header{font-size:12px;font-weight:700;color:var(--muted);
              text-transform:uppercase;letter-spacing:.8px;margin-bottom:8px}
  #log-box{
    background:#0f172a;color:#e2e8f0;
    border-radius:10px;padding:16px;
    font-size:12.5px;font-family:'Courier New',monospace;line-height:1.8;
    height:280px;overflow-y:auto}
  .l-ok{color:#4ade80}.l-erro{color:#f87171}.l-warn{color:#fbbf24}.l-info{color:#e2e8f0}
  /* Spinner */
  .spin{display:inline-block;width:16px;height:16px;border:2.5px solid rgba(255,255,255,.4);
        border-top-color:#fff;border-radius:50%;animation:sp .6s linear infinite}
  @keyframes sp{to{transform:rotate(360deg)}}
  /* Mini badge auth */
  .badge-ok{display:inline-flex;align-items:center;gap:5px;background:var(--green-lt);
            color:var(--green);padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600}
</style>
</head>
<body>

<div class="topbar">
  <div class="logo">D</div>
  <div>
    <h1>Portal de Mensalidades</h1>
    <p>D&amp;P Contabilidade — Envio automático de recibos</p>
  </div>
</div>

<div class="page">

  <!-- Remetente -->
  <div class="card">
    <div class="card-title">📬 Remetente (conta que vai enviar os e-mails)</div>
    <div class="field">
      <label>Gmail do remetente</label>
      <input type="email" id="remetente" placeholder="seugmail@gmail.com" value="__REM__"
             oninput="this.classList.toggle('ok', this.value.includes('@'))">
    </div>
    <div class="field">
      <label>Senha de app do Google</label>
      <input type="password" id="senha-app" placeholder="xxxx xxxx xxxx xxxx" value="__SENHA__">
      <div class="hint">Gere em: Conta Google → Segurança → Senhas de app (precisa de verificação em 2 etapas ativa)</div>
    </div>
  </div>

  <!-- Configuração -->
  <div class="card">
    <div class="card-title">📧 Configuração de destino</div>

    <div class="field">
      <label>E-mail para envios (todos os recibos chegam aqui durante a POC)</label>
      <input type="email" id="email-sucesso"
             placeholder="destino@email.com.br" value="__EMAIL_OK__"
             oninput="this.classList.toggle('ok', this.value.includes('@'))">
    </div>

    <div class="field">
      <label>E-mail para relatório de erros (recibos que falharem)</label>
      <input type="email" id="email-erro"
             placeholder="seu@email.com.br" value="__EMAIL_ERR__"
             oninput="this.classList.toggle('ok', this.value.includes('@'))">
    </div>
  </div>

  <!-- Botões play / parar -->
  <button class="play-btn" id="btn-play" onclick="enviar()">
    ▶ Enviar mensalidades
  </button>
  <button class="stop-btn" id="btn-stop" onclick="parar()" style="display:none">
    ⏹ Parar envio
  </button>

  <!-- Log -->
  <div id="log-wrap">
    <div class="card">
      <div class="log-header">Log de execução</div>
      <div id="log-box"></div>
    </div>
  </div>

</div>

<script>
async function parar() {
  const btnStop = document.getElementById('btn-stop');
  btnStop.disabled = true;
  btnStop.innerHTML = '⏹ Parando...';
  await fetch('/api/parar', { method: 'POST' });
}
async function enviar() {
  const emailS  = document.getElementById('email-sucesso').value.trim();
  const emailE  = document.getElementById('email-erro').value.trim();
  const rem     = document.getElementById('remetente').value.trim();
  const senha   = document.getElementById('senha-app').value.trim();
  if (!rem || !senha)   { alert('Preencha o Gmail e a senha de app do remetente.'); return; }
  if (!emailS || !emailE) { alert('Preencha os dois e-mails de destino.'); return; }

  const btn = document.getElementById('btn-play');
  const btnStop = document.getElementById('btn-stop');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Enviando...';
  btnStop.style.display = 'flex';
  btnStop.disabled = false;
  btnStop.innerHTML = '⏹ Parar envio';

  document.getElementById('log-wrap').style.display = 'block';
  const logBox = document.getElementById('log-box');
  logBox.innerHTML = '';

  await fetch('/api/enviar', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({
      email_sucesso: emailS, email_erro: emailE,
      remetente: rem, senha: senha
    }),
  });

  const es = new EventSource('/api/log?from=0');
  es.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.tipo === 'fim') {
      es.close();
      btn.disabled = false;
      btn.innerHTML = '▶ Enviar mensalidades';
      btnStop.style.display = 'none';
      return;
    }
    const cls = {ok:'l-ok',erro:'l-erro',warn:'l-warn',info:'l-info'}[d.tipo] || 'l-info';
    logBox.innerHTML += `<span class="${cls}">${d.msg}</span>\n`;
    logBox.scrollTop = logBox.scrollHeight;
  };
}
</script>
</body></html>"""


if __name__ == "__main__":
    print("=" * 50)
    print("  Portal de Mensalidades — D&P Contabilidade")
    print("  Abrindo em http://localhost:5000 ...")
    print("=" * 50)
    threading.Timer(1.2, lambda: webbrowser.open("http://localhost:5000")).start()
    app.run(debug=False, port=5000)
