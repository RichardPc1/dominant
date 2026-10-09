# Robô de Mensalidades — D&P Contabilidade

POC (prova de conceito) de automação da **Dominant**: um robô que envia, sozinho, os
e-mails de mensalidade para os clientes de um escritório contábil — lê os recibos em PDF
de uma pasta, descobre a qual cliente cada recibo pertence, monta um e-mail HTML com o
histórico de pagamentos e dispara com o recibo anexado.

> **O que o robô faz na prática**
> 1. Lê a planilha de pagamentos do mês (`.xlsx`).
> 2. Varre a pasta de recibos e casa cada recibo com o cliente certo (por nome).
> 3. Extrai do PDF o vencimento, a referência e o histórico de pagamentos.
> 4. Monta um e-mail HTML (saudação + tabela de histórico + dados bancários).
> 5. Envia para cada cliente com o recibo em anexo.
> 6. Gera um relatório das ocorrências (recibos faltando, clientes sem histórico, etc.).

---

## Duas formas de rodar

Esta POC tem duas versões do mesmo robô — escolha uma:

| Arquivo | Como envia | Autenticação | Interface |
|---|---|---|---|
| **`portal.py`** | Gmail (SMTP) | Senha de app do Google | Página web local (recomendado) |
| **`enviar_mensalidades.py`** | Microsoft 365 (Graph API) | Login Microsoft (device flow) | Linha de comando |

A versão **`portal.py`** é a mais simples de usar: tem uma telinha no navegador, dá para
acompanhar o envio em tempo real e botão de parar. Use essa se estiver em dúvida.

---

## Pré-requisitos

- **Python 3.10+**
- Instalar as dependências:

```bash
pip install flask openpyxl pdfplumber          # para o portal.py
pip install msal requests openpyxl pdfplumber   # para o enviar_mensalidades.py
```

---

## Preparar os arquivos (recibos + planilha)

O robô lê de uma pasta no seu computador. Por padrão ela está apontada em:

```python
DIR_RECIBOS = r"C:\Users\...\POC"      # pasta com os PDFs
EXCEL_PATH  = r"C:\Users\...\Lista_Pagamentos_... .xlsx"
```

Ajuste esses dois caminhos no topo do `portal.py` (ou do `enviar_mensalidades.py`) para
onde estão os seus arquivos. Dentro da pasta devem existir:

- **Recibos numerados** — ex.: `41447_Mensalidade_Fulano.pdf` (é o anexo oficial do mês).
- **PDFs de histórico** (opcional) — ex.: `Fulano - Assessoria Contábil Mensal.pdf`
  (e-mails anteriores de onde o robô lê o histórico de pagamentos).
- **A planilha** do mês, com uma linha por cliente (nº, empresa, descrição, data de
  pagamento, forma, pagador, valor).

---

## Versão 1 — Portal (Gmail) · recomendada

### 1. Autenticar: gerar a senha de app do Google (uma vez só)

O Gmail não aceita a senha normal da conta em robôs — é preciso uma **senha de app**:

1. Acesse <https://myaccount.google.com> → **Segurança**.
2. Ative a **Verificação em 2 etapas** (obrigatória para liberar senhas de app).
3. Busque por **"Senhas de app"** → crie uma nova (nome: "D&P Portal", por exemplo).
4. Copie os **16 caracteres** gerados (ex.: `abcd efgh ijkl mnop`).

Guarde essa senha — você a usa no campo do portal. Ela fica salva localmente em
`credenciais.json` (esse arquivo **nunca** vai para o Git).

### 2. Usar

```bash
python portal.py
```

- Abre sozinho em <http://localhost:5000>.
- Preencha: Gmail do remetente, a senha de app, o e-mail de destino (na POC todos os
  recibos chegam nesse e-mail) e o e-mail do relatório de erros.
- Clique em **▶ Enviar mensalidades** e acompanhe o log em tempo real.
- No Windows dá para só dar dois cliques em **`Abrir Portal.bat`**.

---

## Versão 2 — Script (Microsoft 365 / Graph)

Essa versão envia pela conta Microsoft 365 via Graph API.

### 1. Autenticar: login Microsoft (device flow)

No topo do `enviar_mensalidades.py` estão o `CLIENT_ID` e o `TENANT_ID` do app registrado
no Azure. Ao rodar com envio ligado, o script mostra um código e um link:

```
Acesse: https://microsoft.com/devicelogin
Código: ABCD-EFGH
```

Abra o link, digite o código e autorize com a conta que vai enviar os e-mails. O token
fica em cache — nas próximas vezes não precisa logar de novo.

### 2. Configurar os e-mails dos clientes

Edite o `config_mensalidades.json` — a chave é o nome da empresa (igual ao da planilha) e
o valor é o e-mail de destino:

```json
{
  "email_erro": "seu-admin@email.com",
  "clientes": {
    "Nome da Empresa": "cliente@email.com"
  }
}
```

### 3. Usar

```bash
python enviar_mensalidades.py
```

> **Modo simulação:** no topo do arquivo há `MODO_SIMULACAO = True`. Com ele ligado, o
> robô mostra tudo que **faria** sem enviar nenhum e-mail de verdade. Teste assim primeiro;
> troque para `False` só quando estiver tudo certo.

---

## Arquivos do projeto

```
portal.py                 Robô com interface web (Gmail/SMTP)
enviar_mensalidades.py    Robô por linha de comando (Microsoft Graph)
config_mensalidades.json  E-mails dos clientes + e-mail de erro (usado pelo script)
Abrir Portal.bat          Atalho Windows para abrir o portal
COMO USAR.txt             Guia rápido do portal
credenciais.json          Gerado localmente pelo portal — NÃO vai para o Git
```

---

## Observação

Esta é uma POC — feita para demonstrar o conceito. Em produção, o robô roda do início ao
fim sozinho, agendado, sem precisar de interface. Os dados de exemplo (recibos, planilha)
ficam fora do repositório.
