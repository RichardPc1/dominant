# Envio de E-mails em Massa via Microsoft Graph API

Envia e-mails HTML personalizados com PDF anexo e assinatura Outlook para qualquer lista de contatos, usando a conta Microsoft 365 da empresa — sem SMTP, sem senha no código, com autenticação segura por código de dispositivo (funciona mesmo com MFA ativo).

---

## Pré-requisitos

### 1. Python 3.10+

Baixe em https://python.org. Na instalação, marque **"Add Python to PATH"**.

### 2. Dependências Python

```bash
pip install msal
```

> `msal` é a única biblioteca necessária. `json`, `base64`, `urllib` são da stdlib.

### 3. Azure App Registration (uma vez só — já configurado na Dominant)

Se precisar configurar do zero em outra conta:

1. Acesse https://portal.azure.com → **Microsoft Entra ID** → **Registros de aplicativo** → **Novo registro**
2. Nome: qualquer (ex: `Email Sender`)
3. Tipo de conta: *Somente esta organização*
4. URI de redirecionamento: deixar vazio
5. Clique em **Registrar**

Após criar:

- Vá em **Permissões de API** → **Adicionar permissão** → Microsoft Graph → **Permissões delegadas** → `Mail.Send` → Conceder consentimento de administrador
- Vá em **Autenticação** → role até **Configurações avançadas** → **Permitir fluxos de clientes públicos** = **Sim** → Salvar

Anote o **ID do aplicativo (cliente)** e o **ID do diretório (locatário)**.

---

## Configuração do script

Abra `enviar.py` e preencha as constantes no topo:

```python
CLIENT_ID   = "SEU_CLIENT_ID_AQUI"
TENANT_ID   = "SEU_TENANT_ID_AQUI"
REMETENTE   = "conta@suaempresa.com.br"   # conta do M365 que vai enviar
PDF_DIR     = r"C:\caminho\para\seus\pdfs"
LOGO_PATH   = r"C:\caminho\para\logo.png"  # opcional — deixe "" para sem logo
```

---

## Formato dos contatos

Crie um arquivo `contatos.json` na mesma pasta:

```json
[
  {
    "nome": "Empresa ABC",
    "para": "contato@empresaabc.com.br",
    "assunto": "DOMINANT X EMPRESA ABC",
    "corpo": "Olá, prezados!\n\nTexto do e-mail aqui...\n\nAtenciosamente,\nBruno",
    "pdf": "C:\\caminho\\para\\Dominant_x_Empresa_ABC.pdf"
  }
]
```

- `pdf` pode ser caminho absoluto ou relativo ao `PDF_DIR`
- `pdf` pode ser `null` ou omitido para enviar sem anexo

---

## Como executar

```bash
python enviar.py
```

O script vai:

1. Mostrar quantos e-mails serão enviados
2. Pedir autenticação: exibir uma URL + código (ex: `ABCD1234`)
3. Você abre https://microsoft.com/devicelogin no navegador, digita o código e loga com a conta M365
4. O script autentica automaticamente e começa a enviar
5. Exibe `✓ Empresa → email@empresa.com` para cada envio bem-sucedido

> A autenticação dura ~1 hora. Se der timeout, rode novamente e autentique de novo.

---

## Assinatura HTML (opcional)

Se quiser incluir assinatura HTML com logo inline:

1. Extraia a assinatura do Outlook via script ou copie o HTML do seu cliente
2. Salve como `assinatura.html` na mesma pasta
3. No `contatos.json`, o campo `corpo` não precisa incluir a assinatura — ela é anexada automaticamente

O logo é embutido no e-mail como imagem inline (não como anexo visível), igual ao Outlook faz.

---

## Estrutura de arquivos

```
enviar-emails/
├── README.md          ← este arquivo
├── enviar.py          ← script principal
├── contatos.json      ← sua lista (você cria)
├── assinatura.html    ← assinatura HTML (opcional)
└── logo.png           ← logo para assinatura (opcional)
```

---

## Perguntas frequentes

**O SMTP da minha conta não funciona (erro 535)**  
→ O M365 desativa SMTP AUTH por padrão. Use este script (Graph API) — não precisa habilitar SMTP.

**Tenho MFA ativo na conta**  
→ Sem problema. O fluxo de device code é exatamente para isso — você autentica no navegador normalmente com MFA.

**Quero enviar de uma conta diferente**  
→ Mude `REMETENTE` e autentique com a conta desejada. O app registration precisa estar no mesmo tenant.

**Preciso enviar para centenas de contatos**  
→ O Graph API tem limite de ~4 req/s. Para grandes volumes, adicione `time.sleep(0.3)` entre envios (já incluído no script).
