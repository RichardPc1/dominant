"""
Envia e-mails HTML com PDF anexo e assinatura via Microsoft Graph API.
Leia o README.md antes de usar.

Uso:
  python enviar.py                  # envia todos de contatos.json
  python enviar.py --teste email@x  # envia só o primeiro para um e-mail de teste
"""
import json, base64, os, re, sys, time, unicodedata, urllib.request
from pathlib import Path
import msal

# ── Configuração ──────────────────────────────────────────────────────────────
CLIENT_ID   = "PREENCHA_SEU_CLIENT_ID"
TENANT_ID   = "PREENCHA_SEU_TENANT_ID"
REMETENTE   = "conta@suaempresa.com.br"   # apenas para referência; o Graph usa a conta autenticada
PDF_DIR     = r"."                         # pasta padrão para PDFs (pode ser absoluta)
LOGO_PATH   = r"logo.png"                  # deixe "" para não usar logo
LOGO_CID    = "logo-dominant-inline"       # ID interno do logo no e-mail (qualquer string única)

# Assinatura HTML — lida do arquivo assinatura.html se existir, senão vazia
_sig_file = Path(__file__).parent / "assinatura.html"
ASSINATURA_HTML = _sig_file.read_text(encoding="utf-8") if _sig_file.exists() else ""

AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES    = ["Mail.Send"]

# ── Helpers ───────────────────────────────────────────────────────────────────

def texto_para_html(texto: str) -> str:
    """Converte texto plano em parágrafos HTML."""
    import html as h
    linhas = []
    for linha in texto.split("\n"):
        if linha.strip() == "":
            linhas.append("<br>")
        else:
            linhas.append(
                f'<p style="margin:0 0 4px 0;font-family:Aptos,Calibri,sans-serif;'
                f'font-size:11pt;color:#000">{h.escape(linha)}</p>'
            )
    return "\n".join(linhas)


def montar_html(corpo: str) -> str:
    return (
        "<html><body>"
        "<div style='font-family:Aptos,Calibri,sans-serif;font-size:11pt;color:#000'>\n"
        + texto_para_html(corpo)
        + "\n</div>"
        + ("<br>" + ASSINATURA_HTML if ASSINATURA_HTML else "")
        + "</body></html>"
    )


def resolver_pdf(caminho: str | None) -> str | None:
    if not caminho:
        return None
    p = Path(caminho)
    if p.is_absolute():
        return str(p) if p.exists() else None
    # tenta relativo ao PDF_DIR e depois ao diretório do script
    for base in [PDF_DIR, Path(__file__).parent]:
        full = Path(base) / p
        if full.exists():
            return str(full)
    return None


def b64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


# ── Autenticação ──────────────────────────────────────────────────────────────

def autenticar() -> str:
    app    = msal.PublicClientApplication(CLIENT_ID, authority=AUTHORITY)
    flow   = app.initiate_device_flow(scopes=SCOPES)
    print("\n" + "=" * 60)
    print(flow["message"])
    print("=" * 60)
    print("Aguardando autenticação...\n")
    result = app.acquire_token_by_device_flow(flow)
    if "access_token" not in result:
        raise RuntimeError("Falha na autenticação: " + result.get("error_description", ""))
    print("✓ Autenticado!\n")
    return result["access_token"]


# ── Envio ─────────────────────────────────────────────────────────────────────

def enviar(contato: dict, token: str, logo_b64: str | None, teste_para: str | None) -> bool:
    destinatario = teste_para or contato["para"]
    assunto      = contato["assunto"]
    corpo        = contato["corpo"]
    pdf_path     = resolver_pdf(contato.get("pdf"))

    attachments = []
    if pdf_path:
        attachments.append({
            "@odata.type":  "#microsoft.graph.fileAttachment",
            "name":         Path(pdf_path).name,
            "contentType":  "application/pdf",
            "contentBytes": b64(pdf_path),
        })
    if logo_b64:
        attachments.append({
            "@odata.type":  "#microsoft.graph.fileAttachment",
            "name":         "logo.png",
            "contentType":  "image/png",
            "contentBytes": logo_b64,
            "isInline":     True,
            "contentId":    LOGO_CID,
        })

    payload = {
        "message": {
            "subject":       assunto,
            "body":          {"contentType": "HTML", "content": montar_html(corpo)},
            "toRecipients":  [{"emailAddress": {"address": destinatario}}],
            "attachments":   attachments,
        }
    }

    data = json.dumps(payload).encode("utf-8")
    req  = urllib.request.Request(
        "https://graph.microsoft.com/v1.0/me/sendMail",
        data=data, method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req):
        pass
    return True


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    # Argumentos
    modo_teste  = "--teste" in sys.argv
    teste_para  = sys.argv[sys.argv.index("--teste") + 1] if modo_teste else None

    # Carrega contatos
    contatos_path = Path(__file__).parent / "contatos.json"
    if not contatos_path.exists():
        print("❌ contatos.json não encontrado. Leia o README.md.")
        sys.exit(1)
    contatos = json.loads(contatos_path.read_text(encoding="utf-8"))

    fila = contatos[:1] if modo_teste else contatos
    print(f"{'MODO TESTE → ' + teste_para if modo_teste else ''}")
    print(f"{len(fila)} e-mail(s) na fila\n")

    # Verifica PDFs antes de autenticar
    sem_pdf = []
    for c in fila:
        if c.get("pdf") and not resolver_pdf(c["pdf"]):
            sem_pdf.append(f"  ✗ {c['nome']} — PDF não encontrado: {c['pdf']}")
    if sem_pdf:
        print("Atenção, PDFs não encontrados:")
        print("\n".join(sem_pdf))
        print()

    # Logo
    logo_b64 = None
    if LOGO_PATH and Path(LOGO_PATH).exists():
        logo_b64 = b64(LOGO_PATH)
        print(f"Logo carregado: {LOGO_PATH}")
    elif LOGO_PATH:
        print(f"⚠ Logo não encontrado: {LOGO_PATH} — e-mail será enviado sem logo")

    # Autentica
    token = autenticar()

    # Envia
    ok, erros = 0, []
    for c in fila:
        try:
            enviar(c, token, logo_b64, teste_para)
            print(f"  ✓ {c['nome']} → {teste_para or c['para']}")
            ok += 1
            time.sleep(0.3)   # respeita rate limit do Graph API
        except Exception as e:
            print(f"  ✗ {c['nome']} — {e}")
            erros.append(c["nome"])

    print(f"\n{'='*50}")
    print(f"Enviados: {ok}  |  Erros: {len(erros)}")
    if erros:
        print("Falhas:", ", ".join(erros))


if __name__ == "__main__":
    main()
