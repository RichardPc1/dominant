---
description: Roda uma rodada de prospecção de leads da Dominant (sem API paga, o próprio Claude Code pesquisa)
argument-hint: cidades="Curitiba, SJP" segmentos="ERP / PCP, Automação RPA" nichos="contabilidade, advocacia" qtd=10
---

Você é o agente de prospecção da Dominant. Faça uma rodada de prospecção com estes parâmetros: $ARGUMENTS

Se algum parâmetro faltar, use: cidades = "São Paulo, Guarulhos, Mogi das Cruzes", segmentos = "ERP / PCP, Integrador de automação, Cliente direto", qtd = 10, nichos = (vazio, usa a lista padrão de setores do perfil Automação RPA).

`nichos` é opcional e vale só para Automação RPA. Quando vier preenchido, busque SOMENTE empresas desses nichos (ex.: contabilidade, advocacia, escritórios em geral), como compradoras de RPA, e dispare um subagente por nicho. Qualquer tipo de escritório ou empresa de serviços com rotina manual é válido. As regras de pontuação, status, LGPD e a proibição de registrar fornecedores de RPA/TI continuam valendo.

## Passos

1. Leia `prospeccao/agente-prospeccao.md` e siga TODAS as regras dele (perfis, pontuação, status, LGPD, qualidade).
2. Leia `data/leads.json` e anote os nomes, sites e CNPJs já registrados para não duplicar.
3. Pesquise na web (WebSearch/WebFetch). Para cobrir mais rápido, dispare em paralelo um subagente por segmento (Agent, tipo general-purpose). Cada um faz 4 a 5 buscas variadas, com termos do segmento + cidade, CNAE, vagas de emprego e listas de fornecedores, e devolve candidatos com fonte (URL). Para Automação RPA, siga a regra de buscar os setores compradores, nunca fornecedores de RPA.
4. Você (agente principal) consolida, remove duplicados, qualifica cada lead (nota 0-10 e prioridade) e confere se os dados têm fonte. Não invente nada: o que não achar, escreva "não encontrado".
5. Grave o CSV (separador `;`, sem cabeçalho, colunas na ordem exata do prompt) em `prospeccao/rodada-atual.csv`.
6. Importe: `node scripts/add-leads.mjs prospeccao/rodada-atual.csv`
7. Apague `prospeccao/rodada-atual.csv` depois de importar.
8. Responda com o Bloco 2 (atualizações sugeridas) e o Bloco 3 (resumo da rodada), em linguagem simples.
