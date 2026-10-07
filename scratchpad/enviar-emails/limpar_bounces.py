"""
Limpa a caixa de e-mail após uma campanha:
1. Encontra todos os NDR (bounce) na Caixa de Entrada
2. Para cada NDR, encontra o e-mail original nos Itens Enviados
3. Apaga ambos

Deixa a caixa limpa, só com e-mails que realmente chegaram.
"""
import json, urllib.request, urllib.parse, re
import msal

CLIENT_ID = "eab9ff97-5ecd-469c-9aff-b052f5292276"
TENANT_ID = "4d165578-37cc-47a0-8c26-824f756e9301"
AUTHORITY = f"https://login.microsoftonline.com/{TENANT_ID}"
SCOPES    = ["Mail.ReadWrite"]

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

def graph_delete(token, url):
    req = urllib.request.Request(url, method="DELETE",
                                 headers={"Authorization": f"Bearer {token}"})
    urllib.request.urlopen(req)

def buscar_ndrs(token):
    """Busca todos os NDRs na Caixa de Entrada."""
    termos = ["Undeliverable", "Não foi possível entregar", "Non-Delivery"]
    encontrados, visto = [], set()
    for termo in termos:
        search = urllib.parse.quote(f'"{termo}"')
        url = (
            f"https://graph.microsoft.com/v1.0/me/mailFolders/Inbox/messages"
            f"?$search={search}"
            f"&$select=id,subject,receivedDateTime,body"
            f"&$top=50"
        )
        data = graph_get(token, url)
        for msg in data.get("value", []):
            if msg["id"] not in visto:
                visto.add(msg["id"])
                encontrados.append(msg)
    return encontrados

def extrair_destinatario(ndr):
    """Extrai o e-mail original do destinatário do corpo do NDR."""
    corpo = ndr.get("body", {}).get("content", "")
    # Tenta extrair via regex
    matches = re.findall(r"[\w.+-]+@[\w-]+\.[a-z]{2,}", corpo, re.IGNORECASE)
    # Filtra e-mails internos/microsoft
    externos = [m for m in matches if "microsoft" not in m.lower()
                and "outlook" not in m.lower()
                and "dominanttec" not in m.lower()]
    return externos[0] if externos else None

def buscar_enviado_para(token, destinatario):
    """Busca o e-mail enviado para este destinatário nos Itens Enviados."""
    termo = urllib.parse.quote(f'"{destinatario}"')
    url = (
        f"https://graph.microsoft.com/v1.0/me/mailFolders/SentItems/messages"
        f"?$search={termo}"
        f"&$select=id,subject,toRecipients"
        f"&$top=5"
    )
    data = graph_get(token, url)
    for m in data.get("value", []):
        for r in m.get("toRecipients", []):
            if r["emailAddress"]["address"].lower() == destinatario.lower():
                return m
    return None

def main():
    token = autenticar()

    print("Buscando NDRs na Caixa de Entrada...")
    ndrs = buscar_ndrs(token)
    print(f"  {len(ndrs)} NDR(s) encontrado(s)\n")

    if not ndrs:
        print("Caixa limpa — nenhum bounce encontrado!")
        return

    apagados_ndr      = 0
    apagados_enviados = 0
    nao_encontrado    = []

    for ndr in ndrs:
        subj = ndr.get("subject", "")
        data = ndr.get("receivedDateTime", "")[:10]
        print(f"NDR: {subj} ({data})")

        dest = extrair_destinatario(ndr)
        if dest:
            print(f"  → Destinatário original: {dest}")
            enviado = buscar_enviado_para(token, dest)
            if enviado:
                graph_delete(token, f"https://graph.microsoft.com/v1.0/me/messages/{enviado['id']}")
                print(f"  ✓ Enviado apagado: \"{enviado['subject']}\"")
                apagados_enviados += 1
            else:
                print(f"  ⚠ Enviado original não encontrado nos Itens Enviados")
                nao_encontrado.append(dest)
        else:
            print(f"  ⚠ Não conseguiu extrair destinatário do NDR")

        # Apaga o próprio NDR
        graph_delete(token, f"https://graph.microsoft.com/v1.0/me/messages/{ndr['id']}")
        print(f"  ✓ NDR apagado da Caixa de Entrada")
        apagados_ndr += 1
        print()

    print("=" * 60)
    print(f"Limpeza concluída!")
    print(f"  NDRs apagados da entrada: {apagados_ndr}")
    print(f"  Enviados apagados:        {apagados_enviados}")
    if nao_encontrado:
        print(f"\n  Enviados não encontrados:")
        for n in nao_encontrado: print(f"    - {n}")

if __name__ == "__main__":
    main()
