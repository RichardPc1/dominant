#!/usr/bin/env python3
"""
Portal de Mensalidades — D&P Contabilidade
Execute: python portal.py
Abre automaticamente em http://localhost:5000
"""

import re, base64, time, unicodedata, threading, webbrowser, json
from pathlib import Path
from datetime import datetime
from flask import Flask, request, jsonify, Response
import openpyxl
import pdfplumber
import msal
import requests as req

app = Flask(__name__)

# ─── Caminhos ────────────────────────────────────────────
DIR_RECIBOS = r"C:\Users\richa\Downloads\POC\POC"
EXCEL_PATH  = r"C:\Users\richa\Downloads\POC\POC\Lista_Pagamentos_Assessoria_ em 09.2026.xlsx"

CLIENT_ID = "eab9ff97-5ecd-469c-9aff-b052f5292276"
TENANT_ID = "4d165578-37cc-47a0-8c26-824f756e9301"
SCOPES    = ["Mail.Send"]

DADOS_BANCARIOS = """Chave PIX CNPJ: <strong>30.842.467/0001-40</strong><br>
Banco: 290 – PagSeguro Internet Instituição de Pagamento S.A.<br>
AG. 0001 | C/C: 06800987-7 | Tipo: Conta de pagamento<br>
Nome: PAULA SALETE CARDOSO DE MEIRELES ME"""

_token_cache = {}
_log_queue   = []
_running     = False


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
    return [p for p in norm(empresa).split() if len(p) > 2 and p not in STOP]

def encontrar_pdfs(empresa):
    pdfs = list(Path(DIR_RECIBOS).glob("*.pdf"))
    pk   = palavras(empresa)
    rec  = (None, 0)
    hist = (None, 0)
    for pdf in pdfs:
        n = norm(pdf.stem)
        h = sum(1 for p in pk if p in n)
        if h == 0: continue
        if re.match(r'^\d{5}', pdf.name):
            if h > rec[1]: rec = (pdf, h)
        else:
            if h > hist[1]: hist = (pdf, h)
    return rec[0], hist[0]

def extrair_historico(pdf_path):
    if not pdf_path: return []
    itens = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            texto = "\n".join(p.extract_text() or "" for p in pdf.pages)
        linhas = texto.split('\n')
        i = 0
        while i < len(linhas):
            linha = linhas[i].strip()
            m = re.match(
                r'(R\$\s+[\d.,]+)\s+-\s+(Assessoria[^–\-]*?)(?:\s*[–\-]+\s*venc\.\s*(\d{2}/\d{2}/\d{4}))?$',
                linha)
            if m:
                item = {"valor": m.group(1).strip(), "descricao": m.group(2).strip(),
                        "vencimento": m.group(3) or "—", "pago_em": None}
                if i+1 < len(linhas) and 'agradecemos' in linhas[i+1].lower():
                    m2 = re.search(r'(\d{2}/\d{2}/\d{4})', linhas[i+1])
                    item["pago_em"] = m2.group(1) if m2 else "—"
                    i += 1
                itens.append(item)
            i += 1
    except Exception as e:
        log("warn", f"Erro ao extrair histórico: {e}")
    return itens

def extrair_vencimento(pdf_path):
    if not pdf_path: return None
    try:
        with pdfplumber.open(pdf_path) as pdf:
            texto = "\n".join(p.extract_text() or "" for p in pdf.pages)
        m = re.search(r'Vencimento\s+(\d{2}/\d{2}/\d{4})', texto)
        if m: return m.group(1)
    except: pass
    return None

def extrair_ref(pdf_path):
    if not pdf_path: return None
    try:
        with pdfplumber.open(pdf_path) as pdf:
            texto = "\n".join(p.extract_text() or "" for p in pdf.pages)
        m = re.search(r'Ref\.\s*(\d{2}/\d{4})', texto)
        if m: return m.group(1)
    except: pass
    return None

def fmt_valor(v):
    return f"R$ {v:,.2f}".replace(',','X').replace('.',',').replace('X','.')

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
    nome = pagador.split()[0].capitalize() if pagador else empresa
    rows = ""
    for it in historico:
        if it["pago_em"]:
            st = f'<span style="color:#15803d;font-weight:600">✓ Pago em {it["pago_em"]}</span>'
        else:
            st = '<span style="color:#b45309;font-weight:600">⏳ Pendente</span>'
        rows += f"""<tr>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0">{it["descricao"]}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:center">{it["vencimento"]}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0;text-align:right">{it["valor"]}</td>
          <td style="padding:7px 10px;border-bottom:1px solid #e2e8f0">{st}</td></tr>"""
    desc_prox = f"Assessoria mensal referente {ref}" if ref else "Assessoria Contábil Mensal"
    rows += f"""<tr style="background:#eff6ff">
      <td style="padding:8px 10px;font-weight:700;color:#1e40af">{desc_prox}</td>
      <td style="padding:8px 10px;text-align:center;font-weight:700;color:#1e40af">{vencimento or '—'}</td>
      <td style="padding:8px 10px;text-align:right;font-weight:700;color:#1e40af">{fmt_valor(valor)}</td>
      <td style="padding:8px 10px;color:#b45309;font-weight:700">⏳ Aguardando pagamento</td></tr>"""
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
<div style="background:#eff6ff;border:1px solid #bfdbfe;border-left:4px solid #1e40af;border-radius:6px;padding:14px 16px;margin-top:20px;font-size:10pt">
  <strong>Dados para pagamento:</strong><br>{DADOS_BANCARIOS}</div>
<p style="margin-top:20px">O recibo de {fmt_valor(valor)} está em anexo.<br>Qualquer dúvida, estamos à disposição!</p>
<p>Atenciosamente,<br><strong>D&amp;P Contabilidade</strong><br>
<a href="mailto:paula@depcontabil.com.br">paula@depcontabil.com.br</a></p>
</body></html>"""
    )


def email_relatorio_erros(erros):
    """erros = lista de {empresa, pagador, valor, motivo}"""
    rows = ""
    for e in erros:
        rows += f"""<tr>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0"><strong>{e["empresa"]}</strong></td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">{e["pagador"]}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;text-align:right">{fmt_valor(e["valor"])}</td>
          <td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#b91c1c">{e["motivo"]}</td>
        </tr>"""
    total_val = sum(e["valor"] for e in erros)
    return f"""<!DOCTYPE html><html><body style="font-family:Calibri,Arial,sans-serif;font-size:11pt;color:#1a202c;max-width:700px;margin:0 auto">
<div style="background:#fef2f2;border-left:4px solid #b91c1c;border-radius:6px;padding:14px 16px;margin-bottom:20px">
  <strong>⚠ Relatório de Falhas — Campanha de Mensalidades</strong><br>
  <span style="font-size:10pt;color:#64748b">Gerado em {datetime.now().strftime('%d/%m/%Y %H:%M')} — {len(erros)} cliente(s) não processados</span>
</div>
<table style="width:100%;border-collapse:collapse;font-size:10.5pt">
  <thead><tr style="background:#b91c1c;color:#fff">
    <th style="padding:9px 12px;text-align:left">Empresa</th>
    <th style="padding:9px 12px;text-align:left">Pagador</th>
    <th style="padding:9px 12px;text-align:right">Valor</th>
    <th style="padding:9px 12px;text-align:left">Motivo da falha</th>
  </tr></thead>
  <tbody>{rows}</tbody>
</table>
<p style="margin-top:16px;color:#64748b;font-size:10pt">
  Total não enviado: <strong>{fmt_valor(total_val)}</strong>
</p>
<p style="margin-top:20px;font-size:9.5pt;color:#94a3b8">Mensagem automática — robô de mensalidades D&P Contabilidade</p>
</body></html>"""


# ═══════════════════════════════════════════════════════
# GRAPH API
# ═══════════════════════════════════════════════════════

def get_token():
    return _token_cache.get("token")

def enviar_graph(token, para, assunto, html_body, anexo_path=None):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    anexos = []
    if anexo_path and Path(anexo_path).exists():
        with open(anexo_path, 'rb') as f:
            cb64 = base64.b64encode(f.read()).decode()
        anexos.append({
            "@odata.type": "#microsoft.graph.fileAttachment",
            "name": Path(anexo_path).name,
            "contentType": "application/pdf",
            "contentBytes": cb64,
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
    r = req.post("https://graph.microsoft.com/v1.0/me/sendMail", headers=headers, json=payload)
    if r.status_code not in (200, 202):
        raise RuntimeError(f"HTTP {r.status_code}: {r.text[:200]}")


# ═══════════════════════════════════════════════════════
# LÓGICA DE ENVIO (roda em thread)
# ═══════════════════════════════════════════════════════

def processo_envio(email_sucesso, email_erro):
    global _running
    _running = True
    erros = []

    try:
        token = get_token()
        if not token:
            log("erro", "Não autenticado. Clique em Autenticar primeiro.")
            return

        clientes = ler_excel()
        log("info", f"📋 {len(clientes)} clientes encontrados na planilha")

        for c in clientes:
            empresa = c["empresa"]
            log("info", f"── {empresa}")

            recibo, hist = encontrar_pdfs(empresa)

            if not recibo:
                motivo = "Recibo PDF não encontrado no diretório"
                log("warn", f"  ✗ {motivo}")
                erros.append({**c, "motivo": motivo})
                continue

            log("info", f"  Recibo: {recibo.name}")

            historico  = extrair_historico(hist)
            vencimento = extrair_vencimento(recibo)
            ref        = extrair_ref(recibo)

            assunto, html = email_cliente(
                empresa, c["pagador"], historico,
                c["valor"], vencimento, ref
            )

            try:
                enviar_graph(token, email_sucesso, assunto, html, recibo)
                log("ok", f"  ✓ Enviado → {email_sucesso}")
                time.sleep(5)
            except Exception as e:
                motivo = str(e)
                log("erro", f"  ✗ Falha ao enviar: {motivo}")
                erros.append({**c, "motivo": motivo})

        # Relatório final de erros
        if erros:
            log("info", f"\n📊 {len(erros)} falha(s) — enviando relatório para {email_erro}")
            try:
                html_rel = email_relatorio_erros(erros)
                assunto_rel = f"⚠ Relatório de falhas — {len(erros)} mensalidade(s) não enviada(s)"
                enviar_graph(token, email_erro, assunto_rel, html_rel)
                log("ok", f"  ✓ Relatório enviado para {email_erro}")
            except Exception as e:
                log("erro", f"  ✗ Erro ao enviar relatório: {e}")
        else:
            log("ok", "\n✅ Todos os e-mails enviados com sucesso!")

        total_ok = len(clientes) - len(erros)
        log("info", f"\n━━━ CONCLUÍDO: {total_ok} enviados · {len(erros)} falhas ━━━")

    finally:
        _running = False


# ═══════════════════════════════════════════════════════
# ROTAS
# ═══════════════════════════════════════════════════════

@app.route("/")
def index():
    return HTML_PAGE

@app.route("/api/auth/iniciar", methods=["POST"])
def auth_iniciar():
    msal_app = msal.PublicClientApplication(
        CLIENT_ID, authority=f"https://login.microsoftonline.com/{TENANT_ID}"
    )
    contas = msal_app.get_accounts()
    if contas:
        r = msal_app.acquire_token_silent(SCOPES, account=contas[0])
        if r and "access_token" in r:
            _token_cache["token"] = r["access_token"]
            return jsonify({"status": "ok", "mensagem": "Já autenticado!"})
    flow = msal_app.initiate_device_flow(scopes=SCOPES)
    _token_cache["_flow"] = flow
    _token_cache["_app"]  = msal_app
    return jsonify({
        "status": "device_flow",
        "url":    flow["verification_uri"],
        "codigo": flow["user_code"],
    })

@app.route("/api/auth/confirmar", methods=["POST"])
def auth_confirmar():
    msal_app = _token_cache.get("_app")
    flow     = _token_cache.get("_flow")
    if not msal_app or not flow:
        return jsonify({"status": "erro", "mensagem": "Inicie a autenticação primeiro"}), 400
    r = msal_app.acquire_token_by_device_flow(flow)
    if "access_token" not in r:
        return jsonify({"status": "erro", "mensagem": r.get("error_description", "Falhou")}), 400
    _token_cache["token"] = r["access_token"]
    return jsonify({"status": "ok"})

@app.route("/api/enviar", methods=["POST"])
def api_enviar():
    global _log_queue, _running
    if _running:
        return jsonify({"erro": "Já em andamento"}), 409
    dados = request.json
    email_ok  = dados.get("email_sucesso", "").strip()
    email_err = dados.get("email_erro", "").strip()
    if not email_ok or not email_err:
        return jsonify({"erro": "Preencha os dois e-mails"}), 400
    _log_queue = []
    t = threading.Thread(target=processo_envio, args=(email_ok, email_err), daemon=True)
    t.start()
    return jsonify({"ok": True})

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
  input[type=email]{
    width:100%;border:1.5px solid var(--border);border-radius:8px;
    padding:9px 12px;font-size:13.5px;font-family:inherit;
    background:var(--bg);color:var(--text);outline:none;
    transition:border-color .15s}
  input[type=email]:focus{border-color:var(--blue)}
  input[type=email].ok{border-color:var(--green);background:var(--green-lt)}
  /* Auth */
  .auth-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  #auth-status{font-size:12px;color:var(--muted)}
  #auth-status.ok{color:var(--green);font-weight:600}
  .code-box{background:var(--yellow-lt);border:1px solid var(--border);border-radius:8px;
            padding:12px 14px;margin-top:12px;font-size:13px;display:none}
  .code-box code{font-size:15px;font-weight:800;letter-spacing:2px;
                 color:var(--blue);background:var(--card);padding:2px 8px;border-radius:4px}
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

  <!-- Autenticação -->
  <div class="card">
    <div class="card-title">🔐 Autenticação Microsoft</div>
    <div class="auth-row">
      <button class="play-btn" style="width:auto;padding:9px 18px;font-size:13px"
              onclick="iniciarAuth()" id="btn-auth">Autenticar</button>
      <span id="auth-status">Não autenticado</span>
    </div>
    <div class="code-box" id="code-box">
      Acesse <a id="auth-url" href="#" target="_blank" style="color:var(--blue)">login.microsoft.com/device</a>
      e insira o código &nbsp;<code id="auth-code">——</code>
      <br><br>
      <button class="play-btn" style="width:auto;padding:8px 16px;font-size:12.5px"
              onclick="confirmarAuth()">✓ Já entrei com o código</button>
    </div>
  </div>

  <!-- Configuração -->
  <div class="card">
    <div class="card-title">📧 Configuração de destino</div>

    <div class="field">
      <label>E-mail para envios (todos os recibos chegam aqui durante a POC)</label>
      <input type="email" id="email-sucesso"
             placeholder="destino@email.com.br"
             oninput="this.classList.toggle('ok', this.value.includes('@'))">
    </div>

    <div class="field">
      <label>E-mail para relatório de erros (recibos que falharem)</label>
      <input type="email" id="email-erro"
             placeholder="seu@email.com.br"
             oninput="this.classList.toggle('ok', this.value.includes('@'))">
    </div>
  </div>

  <!-- Botão play -->
  <button class="play-btn" id="btn-play" onclick="enviar()">
    ▶ Enviar mensalidades
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
let autenticado = false;

async function iniciarAuth() {
  document.getElementById('btn-auth').disabled = true;
  const r = await fetch('/api/auth/iniciar', {method:'POST'});
  const d = await r.json();
  document.getElementById('btn-auth').disabled = false;
  if (d.status === 'ok') {
    setAutenticado();
  } else {
    const box = document.getElementById('code-box');
    document.getElementById('auth-url').href = d.url;
    document.getElementById('auth-url').textContent = d.url;
    document.getElementById('auth-code').textContent = d.codigo;
    box.style.display = 'block';
  }
}

async function confirmarAuth() {
  const r = await fetch('/api/auth/confirmar', {method:'POST'});
  const d = await r.json();
  if (d.status === 'ok') {
    document.getElementById('code-box').style.display = 'none';
    setAutenticado();
  } else {
    alert('Erro: ' + d.mensagem);
  }
}

function setAutenticado() {
  autenticado = true;
  document.getElementById('auth-status').innerHTML =
    '<span class="badge-ok">✓ Autenticado</span>';
}

async function enviar() {
  const emailS = document.getElementById('email-sucesso').value.trim();
  const emailE = document.getElementById('email-erro').value.trim();
  if (!autenticado) { alert('Autentique-se primeiro.'); return; }
  if (!emailS || !emailE) { alert('Preencha os dois e-mails.'); return; }

  const btn = document.getElementById('btn-play');
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span> Enviando...';

  document.getElementById('log-wrap').style.display = 'block';
  const logBox = document.getElementById('log-box');
  logBox.innerHTML = '';

  await fetch('/api/enviar', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({email_sucesso: emailS, email_erro: emailE}),
  });

  // SSE — lê logs em tempo real
  const es = new EventSource('/api/log?from=0');
  es.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.tipo === 'fim') {
      es.close();
      btn.disabled = false;
      btn.innerHTML = '✓ Concluído — clique para enviar novamente';
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
