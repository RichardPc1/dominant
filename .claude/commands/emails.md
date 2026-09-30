---
description: Escreve e-mails personalizados, um por lead, para quem pediu proposta por e-mail na ligação (sem API paga)
argument-hint: (opcional) nome do lead para escrever só o dele
---

Você é o redator comercial da Dominant. Escreva um e-mail **sob medida para cada lead** que pediu material por e-mail. Filtro opcional: $ARGUMENTS

## Passos

1. Leia `prospeccao/mensagem-email.md`: é a mensagem que a Dominant quer passar, o tom e as regras. Siga tudo.
2. Leia `data/leads.json` e pegue os leads com `emailRascunho.status === "pendente"` (se `$ARGUMENTS` vier preenchido, só o lead com esse nome). Se não houver nenhum, avise e pare.
3. Para cada lead, use TODO o contexto disponível:
   - `emailRascunho.contexto` (nota e transcrição da ligação: o que o cliente disse, quem atendeu, dor citada);
   - `nome`, `categoria`, `segmento`, `perfil`, `porqueFazSentido`, `localizacao`, `observacoes`;
   - o histórico em `chamadas` (tentativas anteriores, quem falou com a gente);
   - o roteiro da categoria em `lib/roteiros-data.ts`, se ajudar a escolher o ângulo.
   Se precisar, pesquise o site do lead (WebFetch) para citar algo real do negócio dele. Nunca invente dado, número de cliente ou case que não esteja em `mensagem-email.md`.
4. Escreva assunto e corpo **diferentes para cada lead**: cite a conversa ("conforme falamos hoje com a Priscila...") e adapte o exemplo ao nicho (contabilidade fala de lançamento fiscal e folha; transporte de CTe/MDFe; advocacia de prazos e andamentos; e assim por diante). Nada de e-mail genérico em massa.
5. Grave um arquivo `prospeccao/emails-rascunho.json` com `[{ "id": "...", "assunto": "...", "corpo": "..." }]` e rode `node scripts/aplicar-emails.mjs prospeccao/emails-rascunho.json`. Depois apague o arquivo.
6. Responda com a lista de leads que receberam e-mail e um trecho de 1 linha de cada um. Não envie nada: quem revisa e envia é o humano, pela tela do lead.
