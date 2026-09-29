# Roteiro — ERP / PCP

**Canal ideal:** LinkedIn → WhatsApp → Telefone  
**Duração média:** 8–12 min  
**Com quem falar:** Diretor de produto, Gerente de parcerias, CTO ou sócio-fundador

---

## Contexto

Você está falando com alguém que vende ERP ou PCP para indústrias. Eles já têm o ERP instalado na fábrica do cliente. O problema: o apontamento de produção ainda entra manualmente — o operador digita no terminal, preenche planilha ou usa papel. O Coletor resolve exatamente isso: coleta automaticamente do CLP/IHM e manda via API pro ERP deles. Para o ERP, o Coletor é um módulo que complementa — não concorre.

---

## Abertura (30–40 seg)

> "Oi [nome], aqui é [seu nome] da Dominant. Vi que a [empresa] atende indústrias com ERP — tenho um parceiro de automação industrial aqui no Paraná que implanta nas mesmas fábricas que vocês. Surgiu uma situação interessante que pode ser sinergia: a maioria dos clientes que a gente atende usa ERP, mas ainda faz o apontamento de produção na mão. Você tem 5 minutos pra eu te explicar como a gente está resolvendo isso?"

**Alternativa por mensagem:**
> "Oi [nome], sou [seu nome] da Dominant. A gente faz coleta automática de dados de máquina via Modbus — os dados vão direto pra API, sem digitação do operador. Achei que fazia sentido conversar sobre uma integração com o [nome do ERP]. Quando você tem 15 min?"

---

## Perguntas de diagnóstico

1. "Como funciona hoje o apontamento de produção nos clientes de vocês — o operador informa manualmente ou tem coleta automática?"
2. "O ERP de vocês tem integração com o chão de fábrica, ou isso é feito por fora?"
3. "Vocês têm API aberta pra terceiros integrarem?"
4. "Existe algum programa de parceiros ou marketplace dentro da plataforma?"
5. "Quais setores industriais vocês mais atendem hoje?"

---

## Proposta de valor

> "O que a gente faz é simples: instalamos um software na máquina que lê o CLP via Modbus e coleta dados de produção em tempo real — peças produzidas, paradas, tempo rodando. Esses dados ficam disponíveis como endpoint de API. O ERP de vocês consome essa API e o apontamento já entra automaticamente, sem o operador tocar em nada.
>
> Para o cliente de vocês, o valor é claro: fim do apontamento manual, dado confiável, relatório em tempo real. Para vocês, é um diferencial no produto — o ERP que já 'fala' com a máquina."

---

## Objeções comuns

**"Já temos um módulo de chão de fábrica."**
> "Entendo. Esse módulo coleta direto do CLP via Modbus, ou depende de entrada do operador? A maioria dos módulos que a gente vê ainda precisa que o operador confirme — o Coletor elimina essa etapa. Posso mandar um diagrama de como funciona a integração?"

**"Nossa API não é aberta / não temos API."**
> "Faz sentido. Nesse caso, o Coletor pode funcionar de forma paralela — os dados ficam disponíveis para o cliente via dashboard próprio, sem precisar da integração agora. Mas se a integração for possível no futuro, a gente já deixa o dado estruturado. Vale conversar com o time de produto?"

**"Não temos interesse em parceria agora."**
> "Tranquilo. Posso te mandar um resumo de 2 páginas de como funciona? Se surgir um cliente com esse problema, você já tem o contexto. Qual e-mail?"

---

## Fechamento / próximo passo

> "Faz sentido pra você explorar uma integração? O próximo passo mais simples seria uma call de 30 minutos com o nosso técnico e alguém do produto de vocês pra mapear como a API se encaixa. Quando você tem agenda?"

**Alternativa mais leve:**
> "Posso te mandar um vídeo de 8 minutos mostrando o Coletor funcionando numa extrusora? Você assiste quando puder e aí a gente conversa se faz sentido."
