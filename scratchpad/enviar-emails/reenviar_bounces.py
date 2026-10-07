"""
Reenvia e-mails da campanha para leads que voltaram.
Após cada envio, aguarda 90s e verifica a caixa de entrada por bounces.
Se bounce detectado, move o lead para 'Achar contato' no Kanban do CRM.
"""
import json, time, urllib.request, urllib.parse
from datetime import datetime, timezone
import msal

CLIENT_ID = "eab9ff97-5ecd-469c-9aff-b052f5292276"
TENANT_ID = "4d165578-37cc-47a0-8c26-824f756e9301"
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES    = ["Mail.ReadWrite", "Mail.Send"]

INTERVALO_SEG   = 300   # intervalo total entre envios (5 min)
ESPERA_BOUNCE   = 180   # 3 min aguardando bounce antes de verificar
CRM_BASE        = "https://dominant-annalogyc.vercel.app/api/leads"

# Leads restantes (1-5 já enviados na rodada anterior)
LEADS = [
    "comercial@trb.log.br",
    "carlos.fignorelli@oliveirar.com.br",
    "felipe.pereira@calvalcancepereira.adv.br",
    "juridico@salacontabilidade.com.br",
    "marcketing@contabilidadeclassea.com.br",
    "marcketing@aliancaimoveis.net",
    "gdgerente@escrilex.com.br",
    "contato@csrpadvogados.com",
]

def autenticar():
    app  = msal.PublicClientApplication(CLIENT_ID, authority=AUTHORITY)
    flow = app.initiate_device_flow(scopes=SCOPES)
    print("\n" + "=" * 60)
    print(flow["message"])
    print("=" * 60 + "\n")
    result = app.acquire_token_by_device_flow(flow)
    if "access_token" not in result:
        raise RuntimeError(result.get("error_description", "Falha"))
    print("✓ Autenticado!\n")
    return result["access_token"]

def graph_get(token, url):
    req = urllib.request.Request(url, headers={
        "Authorization":    f"Bearer {token}",
        "ConsistencyLevel": "eventual",
    })
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def buscar_email_enviado(token, destinatario):
    termo = urllib.parse.quote(f'"{destinatario}"')
    url = (
        f"https://graph.microsoft.com/v1.0/me/mailFolders/SentItems/messages"
        f"?$search={termo}"
        f"&$select=id,subject,body,toRecipients,ccRecipients,hasAttachments"
        f"&$top=5"
    )
    data = graph_get(token, url)
    for m in data.get("value", []):
        for r in m.get("toRecipients", []):
            if r["emailAddress"]["address"].lower() == destinatario.lower():
                return m
    return None

def buscar_anexos(token, message_id):
    url = f"https://graph.microsoft.com/v1.0/me/messages/{message_id}/attachments"
    return graph_get(token, url).get("value", [])

def reenviar(token, msg, anexos):
    payload_msg = {
        "subject":      msg["subject"],
        "body":         msg["body"],
        "toRecipients": msg["toRecipients"],
        "ccRecipients": msg.get("ccRecipients", []),
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
    data = json.dumps({"message": payload_msg}).encode("utf-8")
    req  = urllib.request.Request(
        "https://graph.microsoft.com/v1.0/me/sendMail",
        data=data, method="POST",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req):
        pass

def checar_bounce(token, destinatario, desde_iso):
    """Verifica se chegou NDR para este destinatário após 'desde_iso'."""
    desde_enc = urllib.parse.quote(desde_iso)
    url = (
        f"https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages"
        f"?$filter=receivedDateTime gt {desde_enc}"
        f"&$select=subject,receivedDateTime,body"
        f"&$top=20"
    )
    try:
        data = graph_get(token, url)
        for msg in data.get("value", []):
            subj = msg.get("subject", "").lower()
            body = msg.get("body", {}).get("content", "").lower()
            if "undeliverable" in subj or "não foi possível entregar" in subj:
                if destinatario.lower() in body or destinatario.lower() in subj:
                    return True
    except Exception as e:
        print(f"    ⚠ Erro ao checar bounce: {e}")
    return False

def mover_kanban_achar_contato(nome_busca):
    """Move o lead para coluna 'pesquisar' (Achar contato) no CRM."""
    try:
        req   = urllib.request.Request(CRM_BASE)
        with urllib.request.urlopen(req) as r:
            leads = json.loads(r.read())
        lead = next((l for l in leads if nome_busca.lower() in l["nome"].lower()), None)
        if not lead:
            print(f"    ⚠ Lead não encontrado no CRM: {nome_busca}")
            return
        payload = json.dumps({"coluna": "pesquisar"}).encode("utf-8")
        req2 = urllib.request.Request(
            f"{CRM_BASE}/{lead['id']}",
            data=payload, method="PATCH",
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(req2):
            pass
        print(f"    ✓ CRM: '{lead['nome']}' movido para Achar contato")
    except Exception as e:
        print(f"    ⚠ Erro ao atualizar CRM: {e}")

def extrair_nome_empresa(destinatario):
    """Tenta extrair nome da empresa a partir do e-mail para buscar no CRM."""
    dominio = destinatario.split("@")[-1].split(".")[0]
    mapa = {
        "seguroshtscorretora": "HTS",
        "trb":                 "TRB Transporte",
        "oliveirar":           "Oliveira Ritzmann",
        "calvalcancepereira":  "Cavalcante",
        "salacontabilidade":   "SALA Contabilidade",
        "contabilidadeclassea":"Classe A Contábil",
        "aliancaimoveis":      "Aliança Imóveis",
        "escrilex":            "Escrilex",
        "csrpadvogados":       "CRSP",
    }
    for k, v in mapa.items():
        if k in destinatario.lower():
            return v
    return dominio

def main():
    total = len(LEADS)
    print(f"Reenvio — {total} leads restantes (leads 6-13)")
    print(f"Após cada envio aguarda {ESPERA_BOUNCE}s e verifica bounce\n")

    token = autenticar()

    ok, bounceados, erros = 0, [], []

    for i, dest in enumerate(LEADS):
        num = i + 6  # começa no 6
        print(f"[{num}/13] {dest}")
        try:
            msg = buscar_email_enviado(token, dest)
            if not msg:
                print(f"  ⚠ Original não encontrado nos Enviados, pulando.")
                erros.append(dest)
                continue

            print(f"  Assunto: {msg['subject']}")
            anexos  = buscar_anexos(token, msg["id"]) if msg.get("hasAttachments") else []
            enviado_em = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
            reenviar(token, msg, anexos)
            print(f"  ✓ Enviado!")
            ok += 1
        except Exception as e:
            print(f"  ✗ Erro no envio: {e}")
            erros.append(dest)
            if i < total - 1:
                for r in range(INTERVALO_SEG, 0, -1):
                    print(f"  próximo em {r}s...   ", end="\r", flush=True)
                    time.sleep(1)
                print(" " * 30, end="\r", flush=True)
            continue

        # --- Aguarda bounces e verifica inbox ---
        print(f"  Aguardando {ESPERA_BOUNCE}s para checar bounce...", flush=True)
        for r in range(ESPERA_BOUNCE, 0, -1):
            print(f"  verificando bounce em {r}s...   ", end="\r", flush=True)
            time.sleep(1)
        print(" " * 40, end="\r", flush=True)

        bounce = checar_bounce(token, dest, enviado_em)
        if bounce:
            print(f"  ✗ BOUNCE detectado!")
            bounceados.append(dest)
            nome_empresa = extrair_nome_empresa(dest)
            mover_kanban_achar_contato(nome_empresa)
        else:
            print(f"  ✓ Sem bounce detectado — e-mail chegou!")

        # --- Aguarda o restante do intervalo antes do próximo ---
        restante = INTERVALO_SEG - ESPERA_BOUNCE
        if i < total - 1 and restante > 0:
            for r in range(restante, 0, -1):
                print(f"  próximo em {r}s...   ", end="\r", flush=True)
                time.sleep(1)
            print(" " * 30, end="\r", flush=True)

    print("\n" + "=" * 60)
    print(f"Concluído!  ✓ {ok} enviados  |  ✗ {len(erros)} erros  |  ⚠ {len(bounceados)} bounces")
    if bounceados:
        print("\nBounceados → movidos para Achar contato:")
        for b in bounceados: print(f"  - {b}")
    if erros:
        print("\nErros:")
        for e in erros: print(f"  - {e}")

if __name__ == "__main__":
    main()
