"""
Busca o e-mail original enviado para um lead na pasta Itens Enviados
e reenvia exatamente igual (mesmo subject, mesmo HTML, mesmos anexos).
"""
import json, urllib.request, urllib.parse, base64
import msal

CLIENT_ID = "eab9ff97-5ecd-469c-9aff-b052f5292276"
TENANT_ID = "4d165578-37cc-47a0-8c26-824f756e9301"
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES    = ["Mail.ReadWrite", "Mail.Send"]

# Lead de teste — DEP Contabilidade (voltou por bloqueio MS, não SPFBL)
DESTINATARIO = "contato@depcontabil.com.br"

def autenticar():
    app  = msal.PublicClientApplication(CLIENT_ID, authority=AUTHORITY)
    flow = app.initiate_device_flow(scopes=SCOPES)
    print("\n" + "=" * 60)
    print(flow["message"])
    print("=" * 60 + "\n")
    result = app.acquire_token_by_device_flow(flow)
    if "access_token" not in result:
        raise RuntimeError(result.get("error_description", "Falha na autenticação"))
    print("✓ Autenticado!\n")
    return result["access_token"]

def get(token, url):
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def buscar_email_enviado(token, destinatario):
    """Busca na pasta Itens Enviados o e-mail original para este destinatário."""
    termo = urllib.parse.quote(f'"{destinatario}"')
    url = (
        "https://graph.microsoft.com/v1.0/me/mailFolders/SentItems/messages"
        f"?$search={termo}"
        f"&$select=id,subject,body,toRecipients,ccRecipients,hasAttachments"
        f"&$top=5"
    )
    req = urllib.request.Request(url, headers={
        "Authorization": f"Bearer {token}",
        "ConsistencyLevel": "eventual",
    })
    with urllib.request.urlopen(req) as r:
        data = json.loads(r.read())
    msgs = data.get("value", [])
    if not msgs:
        raise RuntimeError(f"Nenhum e-mail enviado encontrado para {destinatario}")
    return msgs[0]

def buscar_anexos(token, message_id):
    url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/attachments"
    data = get(token, url)
    return data.get("value", [])

def reenviar(token, msg, anexos):
    """Monta e envia uma cópia exata do e-mail original."""
    payload_msg = {
        "subject":        msg["subject"],
        "body":           msg["body"],
        "toRecipients":   msg["toRecipients"],
        "ccRecipients":   msg.get("ccRecipients", []),
    }
    if anexos:
        payload_msg["attachments"] = [
            {
                "@odata.type": "#microsoft.graph.fileAttachment",
                "name":        a["name"],
                "contentType": a["contentType"],
                "contentBytes": a.get("contentBytes", ""),
            }
            for a in anexos
            if a.get("@odata.type") == "#microsoft.graph.fileAttachment"
        ]

    payload = {"message": payload_msg}
    data    = json.dumps(payload).encode("utf-8")
    req     = urllib.request.Request(
        "https://graph.microsoft.com/v1.0/me/sendMail",
        data=data, method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req):
        pass

def main():
    print(f"Buscando e-mail original enviado para: {DESTINATARIO}")
    token = autenticar()

    msg = buscar_email_enviado(token, DESTINATARIO)
    print(f"✓ Encontrado: \"{msg['subject']}\"")

    anexos = []
    if msg.get("hasAttachments"):
        print("  Carregando anexos...")
        # Precisa buscar o corpo completo com anexos
        msg_full = get(token, f"https://graph.microsoft.com/v1.0/me/messages/{msg['id']}?$expand=attachments")
        anexos   = buscar_anexos(token, msg["id"])
        print(f"  {len(anexos)} anexo(s) encontrado(s)")

    print(f"\nReenviando para {DESTINATARIO}...")
    try:
        reenviar(token, msg, anexos)
        print(f"✓ E-mail reenviado com sucesso!")
        print(f"  Assunto: {msg['subject']}")
        print(f"  Para:    {DESTINATARIO}")
        print(f"\n  Aguarda alguns minutos e verifica se chegou sem bounce.")
    except Exception as e:
        print(f"✗ Falhou: {e}")

if __name__ == "__main__":
    main()
