# Dominant — CRM de Prospecção

Ferramenta interna da Dominant Tecnologia para gerenciar o pipeline de prospecção ativa de clientes. Combina CRM, kanban de contatos, rodadas de geração de leads com IA e envio de e-mails personalizados com proposta em PDF.

---

## O que o sistema faz

- **Kanban de leads** — pipeline visual com colunas: Ligar, Tentar, E-mail, WhatsApp, Aguardando, Avançado, Pesquisar, Novos, Pausados, Descartados
- **Rodadas de prospecção** — gera lotes de leads via GPT-4.1-mini com score, categoria, localização e racional de fit
- **Modo ligação** — ficha do lead com roteiro, histórico de chamadas, registro de resultado e notas em tempo real
- **Rascunho de e-mail** — e-mail personalizado por lead gerado por IA, editável no CRM
- **Envio em massa** — script Python que envia HTML + PDF + assinatura via Microsoft Graph API (sem SMTP, funciona com MFA)
- **Histórico de mensagens** — registro de WhatsApp, e-mail, LinkedIn e outros canais por lead
- **Guia de prospecção** — roteiros e scripts de abordagem por nicho

---

## Stack

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS |
| Backend  | API Routes do Next.js |
| Banco    | Upstash Redis (REST API via Vercel) |
| IA       | OpenAI GPT-4.1-mini |
| Deploy   | Vercel |

---

## Rodar localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000.

**Variáveis de ambiente necessárias** (crie um `.env.local`):

```env
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
OPENAI_API_KEY=sk-...
```

---

## Estrutura de pastas

```
app/
├── page.tsx              # Tabela de leads
├── kanban/               # Quadro kanban
├── call/[id]/            # Modo ligação (ficha do lead)
├── emails/               # Geração e gestão de rascunhos de e-mail
├── roteiros/             # Scripts de abordagem por nicho
├── guia/                 # Guia de prospecção
├── config/               # Configurações da rodada (prompt, modelo)
├── components/           # Componentes compartilhados
└── api/
    └── leads/            # GET /api/leads, PATCH /api/leads/[id]

lib/
├── types.ts              # Tipos: Lead, Chamada, Mensagem, Kanban
├── kanban.ts             # Lógica de derivação da coluna
└── outcomes.ts           # Classificações de resultado de chamada

scratchpad/
└── enviar-emails/        # Script standalone de envio via Graph API
```

---

## Envio de e-mails (Microsoft Graph API)

O sistema usa autenticação via **device code flow** — sem senha no código, funciona com MFA ativo.

Veja o guia completo em [`scratchpad/enviar-emails/README.md`](scratchpad/enviar-emails/README.md).

Resumo:
1. Instale: `pip install msal`
2. Preencha `CLIENT_ID` e `TENANT_ID` em `enviar.py`
3. Monte `contatos.json` com os destinatários (use `contatos.exemplo.json` como base)
4. Execute: `python enviar.py`
5. Autentique no navegador com o código exibido → o script envia tudo automaticamente

---

## Geração de slides (PPTX → PDF)

Cada lead da prospecção tem uma apresentação personalizada gerada com `python-pptx`.

Os PDFs ficam em `slides/slidesparaclientes/` com o padrão de nome `Dominant_x_[Empresa].pdf`.

---

## Deploy

O projeto está em produção na Vercel. O Redis de produção é gerenciado via Upstash; as variáveis de ambiente ficam no painel da Vercel.

Repositório: https://github.com/RichardPc1/dominant
