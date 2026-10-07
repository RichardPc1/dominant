"""Consulta a caixa de entrada e lista e-mails que voltaram (bounces)."""
import json, urllib.request, urllib.parse
import msal

CLIENT_ID = "eab9ff97-5ecd-469c-9aff-b052f5292276"
TENANT_ID = "4d165578-37cc-47a0-8c26-824f756e9301"
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES    = ["Mail.Read"]

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

def buscar_bounces(token):
    termos = ["Undeliverable", "Non-Delivery", "Mail Delivery"]
    encontrados = []
    chaves = set()

    for termo in termos:
        search = urllib.parse.quote(f'"{termo}"')
        url = (
            f"https://graph.microsoft.com/v1.0/me/messages"
            f"?$search={search}"
            f"&$select=subject,receivedDateTime,toRecipients,from"
            f"&$top=50"
        )
        req = urllib.request.Request(
            url, headers={
                "Authorization": f"Bearer {token}",
                "ConsistencyLevel": "eventual",
            }
        )
        try:
            with urllib.request.urlopen(req) as r:
                data = json.loads(r.read())
            for msg in data.get("value", []):
                subj = msg.get("subject", "")
                recv = msg.get("receivedDateTime", "")[:10]
                to   = msg.get("toRecipients", [])
                dest = to[0]["emailAddress"]["address"] if to else "?"
                key  = subj + recv + dest
                if key not in chaves:
                    chaves.add(key)
                    encontrados.append({
                        "assunto": subj,
                        "data":    recv,
                        "para":    dest,
                    })
        except Exception as e:
            print(f"  ⚠ Erro buscando '{termo}': {e}")

    return encontrados

def main():
    token    = autenticar()
    bounces  = buscar_bounces(token)

    print(f"{'='*60}")
    print(f"E-mails que voltaram encontrados: {len(bounces)}")
    print(f"{'='*60}")
    for i, b in enumerate(bounces, 1):
        print(f"\n{i}. {b['assunto']}")
        print(f"   Para:  {b['para']}")
        print(f"   Data:  {b['data']}")

if __name__ == "__main__":
    main()
