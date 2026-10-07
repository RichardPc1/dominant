# Bloqueios de E-mail — Causas e Ações

Documento os tipos de rejeição encontrados na campanha de out/2026 ao enviar pelo Microsoft 365 (`servico@dominanttec.com.br`), com as ações para cada caso.

---

## Tipo 1 — Conta bloqueada pela Microsoft (AS42004)

**Erro:** `550 5.1.8 Access denied, bad outbound sender AS(42004)`  
**Rejeitado por:** Microsoft (próprio servidor de saída)  
**Causa:** Volume de envios considerado spam pela Microsoft. A conta de envio é suspensa.

**Ação imediata:**
1. Acesse https://security.microsoft.com/restrictedentities
2. Localize o endereço bloqueado e clique em "Solicitar remoção"
3. Aguarde liberação (geralmente minutos a horas)

**Prevenção:**
- Manter intervalo mínimo de **2 minutos** entre envios (`INTERVALO_SEG = 120` no `enviar.py`)
- Máximo recomendado: ~30 e-mails/dia pelo Office 365 pessoal
- Para campanhas maiores: migrar para serviço dedicado (Resend, Brevo, SendGrid)

---

## Tipo 2 — Blacklist SPFBL

**Erro:** `550 5.7.1` com menção a `spfbl.net`  
**Rejeitado por:** Servidor do destinatário que usa SPFBL como filtro  
**Causa:** Domínio `dominanttec.com.br` ou IP de envio listado na blacklist SPFBL.

**Ação:**
1. Acesse http://spfbl.net/en/feedback
2. Informe o domínio `dominanttec.com.br`
3. Solicite remoção da blacklist

**Observação:** Pode afetar múltiplos destinatários simultaneamente. Verificar periodicamente.

---

## Tipo 3 — DNS sem registros A/MX (spamblock.cloud e similares)

**Erro:** `550 Sender (dominanttec.com.br) has no A, AAAA, or MX DNS records`  
**Rejeitado por:** `control.spamblock.cloud` (filtro da Paulista Express) e outros  
**Causa:** O filtro do destinatário verifica se o domínio remetente tem registros DNS válidos e não encontra.

**Ação:**
- Verificar registros DNS do `dominanttec.com.br` no painel do registrador (registro.br)
- Garantir que existam registros: **MX**, **A** (ou AAAA), **SPF** (TXT), **DKIM**
- Verificação rápida: https://mxtoolbox.com/SuperTool.aspx (digitar `dominanttec.com.br`)

**Alternativa de longo prazo:** Serviço de envio dedicado (ver Tipo 5).

---

## Tipo 4 — MX do remetente não encontrado (chkuser)

**Erro:** `sorry, can't find a valid MX for sender domain (chkuser)`  
**Rejeitado por:** Servidor próprio do destinatário (ex: `mx.falavinhacontabil.com.br`)  
**Causa:** O servidor do destinatário faz "sender callout verification" — tenta confirmar que `dominanttec.com.br` aceita e-mails de volta. Sem MX configurado corretamente, falha.

**Ação:** Mesma do Tipo 3 — configurar registros MX corretos para o domínio.

---

## Tipo 5 — PTR (rDNS) incorreto

**Erro:** `550 5.7.363 Verification failed for <servico@dominanttec.com.br>; The mail server does not recognize servico@dominanttec.com.br as a valid sender`  
**Rejeitado por:** Servidor do destinatário (ex: `dedi-13486346.trb.log.br`)  
**Causa:** O servidor destino faz lookup reverso de DNS (PTR) no IP de envio. Como o e-mail sai pelos servidores do Microsoft 365, o IP reverso aponta para a Microsoft, não para `dominanttec.com.br`.

**Ação de curto prazo:** Não há solução pelo Office 365 — o PTR do IP de envio é controlado pela Microsoft.

**Solução definitiva:** Migrar envio de campanhas para serviço com IP dedicado e PTR configurável:
- **Resend** (https://resend.com) — fácil integração, bom custo/benefício
- **Brevo** (https://brevo.com) — plano gratuito generoso
- **SendGrid** (https://sendgrid.com) — robusto para volumes maiores

Com esses serviços, você configura o PTR e todos os registros DNS corretamente no painel, e a entregabilidade sobe para próximo de 100%.

---

## Resumo rápido

| Tipo | Código | Causa raiz | Solução imediata | Solução definitiva |
|------|--------|-----------|-------------------|---------------------|
| Conta bloqueada MS | `550 5.1.8 AS42004` | Volume excessivo | Desbloquear em security.microsoft.com | Rate limit + serviço dedicado |
| SPFBL blacklist | `550 5.7.1` | Domínio/IP na lista | Pedir remoção em spfbl.net | Serviço dedicado com IP limpo |
| DNS sem A/MX | `550 ... no DNS records` | Registros DNS ausentes | Configurar DNS no registro.br | Serviço dedicado |
| MX remetente ausente | `chkuser` | MX não configurado | Configurar MX no DNS | Serviço dedicado |
| PTR incorreto | `550 5.7.363` | IP da Microsoft ≠ domínio | Não tem (limitação do O365) | **Serviço dedicado com PTR** |

---

## Scripts disponíveis

| Script | Função |
|--------|--------|
| `enviar.py` | Envio de campanha com rate limit de 2 min |
| `reenviar_bounces.py` | Reenvia bounces com verificação automática pós-envio |
| `ver_bounces.py` | Lista todos os NDRs na caixa de entrada |
| `limpar_bounces.py` | Apaga NDRs da entrada + originais enviados que voltaram |
| `teste_envio.py` | Envia 1 e-mail de teste para verificar se o envio funciona |

Todos usam autenticação via **Microsoft Graph API + MSAL device flow**.  
Credenciais: `CLIENT_ID` e `TENANT_ID` hardcoded nos scripts (Azure App Registration da Dominant).
