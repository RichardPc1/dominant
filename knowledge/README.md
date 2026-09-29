# Base de Conhecimento de Vendas — Dominant

Esta pasta contém todo o material de conhecimento sobre vendas e abordagem comercial do Coletor.

## Estrutura

```
knowledge/
  roteiros/          Scripts de abordagem por categoria de lead (fonte de verdade)
  videos/            Transcrições brutas de vídeos e materiais externos importados
  README.md          Este arquivo
```

## Como atualizar um roteiro a partir de um vídeo

1. Salve a transcrição bruta em `knowledge/videos/nome-do-video.md`
2. Peça ao Claude para transformar o conteúdo no roteiro da categoria correspondente
3. O Claude atualiza o arquivo em `knowledge/roteiros/` e o código em `lib/roteiros-data.ts`

## Categorias com roteiro

- `erp-pcp.md` — ERP / PCP
- `integrador-automacao.md` — Integrador de automação
- `fabricante-maquinas.md` — Fabricante de máquinas
- `cliente-direto.md` — Cliente direto (indústria)
- `automacao-rpa.md` — Automação RPA
- `polo-associacao.md` — Polo / Associação
- `programa-fomento.md` — Programa / Fomento
