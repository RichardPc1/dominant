export interface ScriptItem {
  type: 'script' | 'tip' | 'list' | 'warning' | 'text';
  text?: string;
  items?: string[];
}

export interface ScriptSection {
  id: string;
  icon: string;
  title: string;
  items: ScriptItem[];
}

export interface Roteiro {
  id: string;
  categoria: string;
  tagline: string;
  duracao: string;
  canal: string;
  alvo: string;
  sections: ScriptSection[];
}

export const ROTEIROS: Roteiro[] = [
  {
    id: 'erp-pcp',
    categoria: 'ERP / PCP',
    tagline: 'Parceria que complementa — o Coletor alimenta o ERP sem trocar nada',
    duracao: '8–12 min',
    canal: 'LinkedIn → WhatsApp → Telefone',
    alvo: 'Diretor de produto, Gerente de parcerias ou CTO',
    sections: [
      {
        id: 'contexto',
        icon: '🎯',
        title: 'Contexto — quem é esse lead',
        items: [
          { type: 'text', text: 'Empresa que vende ERP ou PCP para indústrias. O ERP deles já está na fábrica. O problema: o apontamento de produção entra manualmente — operador digita, usa terminal ou papel. O Coletor coleta direto do CLP via Modbus e manda via API pro ERP deles automaticamente. Para eles, não é concorrência — é um módulo que completa o produto.' },
          { type: 'tip', text: '💡 Jordan Belfort: sua certeza precisa chegar em 3 — eles precisam confiar em VOCÊ, no PRODUTO e na EMPRESA. Antes de apresentar, colete inteligência suficiente para adaptar a proposta ao vocabulário deles.' },
        ],
      },
      {
        id: 'abertura',
        icon: '🚀',
        title: 'Abertura — primeiros 4 segundos',
        items: [
          { type: 'tip', text: '⚡ Você tem 4 segundos para ser percebido como: afiado, entusiasmado (contido, não exagerado) e especialista. Isso está na tonalidade — não nas palavras.' },
          { type: 'script', text: '"Oi [nome], aqui é [seu nome] da Dominant. Eu faço software de coleta de dados de chão de fábrica — os dados saem direto do CLP e entram no ERP automaticamente, sem o operador tocar em nada. Vi que a [empresa ERP] atende indústrias — e esse é exatamente o problema que aparece nos clientes de vocês. Você tem 5 minutos?"' },
          { type: 'tip', text: '📱 Por mensagem (LinkedIn/WhatsApp): "Oi [nome], vi que a [empresa] tem ERP para indústria. A maioria das fábricas que a gente atende usa ERP mas ainda aponta produção na mão. A gente resolve isso via API. Faz sentido conversar?"' },
        ],
      },
      {
        id: 'spin',
        icon: '🔍',
        title: 'Diagnóstico SPIN — perguntas obrigatórias',
        items: [
          { type: 'tip', text: '📌 Thiago Concer: a pergunta certa faz o cliente vender para ele mesmo. Ouça de verdade — uh-huh, entendo, me conta mais. Não pule para a proposta antes de entender a dor.' },
          { type: 'tip', text: 'S — Situação (contexto atual):' },
          { type: 'list', items: [
            '"Como funciona hoje o apontamento de produção nos clientes de vocês — o operador informa manualmente ou tem coleta automática?"',
            '"O ERP de vocês tem integração com o chão de fábrica, ou isso fica por fora?"',
            '"Vocês têm API aberta pra terceiros integrarem?"',
          ]},
          { type: 'tip', text: 'P — Problema (o que está travando):' },
          { type: 'list', items: [
            '"Quando o cliente pede relatório de OEE ou eficiência de máquina, de onde vem esse dado hoje?"',
            '"Vocês já perderam algum deal porque o apontamento manual era um problema que o ERP não resolvia?"',
          ]},
          { type: 'tip', text: 'I — Implicação (quanto custa o problema):' },
          { type: 'list', items: [
            '"Esse apontamento manual — o cliente perde quanto de dado por turno, na estimativa de vocês?"',
            '"Já tiveram caso de cliente churnar por causa disso, ou de não renovar por falta de visibilidade do chão de fábrica?"',
          ]},
          { type: 'tip', text: 'N — Necessidade (visão do futuro resolvido):' },
          { type: 'list', items: [
            '"Se o ERP de vocês chegasse no cliente com apontamento já automático — isso mudaria o argumento de vendas de vocês?"',
            '"Existe programa de parceiros ou marketplace onde a gente poderia figurar como integração oficial?"',
          ]},
        ],
      },
      {
        id: 'proposta',
        icon: '💎',
        title: 'Transição + Proposta de valor',
        items: [
          { type: 'tip', text: '🎯 Jordan Belfort: use a frase de transição DEPOIS de coletar a inteligência. Ela só funciona se o cliente sentiu que foi ouvido.' },
          { type: 'script', text: '"Com base no que você me contou — o apontamento ainda é manual na maioria dos clientes — o Coletor é perfeito pra vocês. Deixa eu te dizer o porquê."' },
          { type: 'script', text: '"O que a gente faz: um software que lê o CLP via Modbus e coleta produção em tempo real — peças produzidas, paradas, tempo rodando. Fica disponível como endpoint de API. O ERP de vocês consome e o apontamento entra automático, sem o operador tocar. Para o cliente final: fim do papel. Para vocês: diferencial no produto — o ERP que já fala com a máquina."' },
          { type: 'tip', text: '🏢 Construir certeza na empresa: "A gente já rodou piloto em extrusora aqui no Paraná — posso te passar os números se quiser."' },
        ],
      },
      {
        id: 'objecoes',
        icon: '🛡️',
        title: 'Objeções — loop de volta, não só rebater',
        items: [
          { type: 'tip', text: '🔄 Thiago + Jordan: objeção é cortina de fumaça para incerteza. Não rebata e peça o pedido de novo — faça loop de volta para construir mais certeza, depois feche.' },
          { type: 'tip', text: '"Já temos módulo de chão de fábrica."' },
          { type: 'script', text: '"Entendo. Esse módulo coleta direto do CLP via Modbus ou ainda depende do operador confirmar? A maioria dos módulos que a gente encontra ainda precisa da entrada manual. Se o de vocês já é automático, vocês estão na frente — mas é raro. Posso te mandar um diagrama de como funciona pra vocês avaliarem a diferença?"' },
          { type: 'tip', text: '"Nossa API não é aberta."' },
          { type: 'script', text: '"Faz sentido. O Coletor pode funcionar em paralelo — o cliente acessa via dashboard próprio, sem precisar da integração agora. Se a integração for viável no futuro, o dado já está estruturado esperando. Vale uma call com o time de produto de vocês pra mapear o que seria necessário?"' },
          { type: 'tip', text: '"Não temos interesse em parceria no momento."' },
          { type: 'script', text: '"Entendo, timing é tudo. Deixa eu te mandar um resumo de 2 páginas — quando aparecer um cliente com esse problema, você já tem o contexto pra indicar. Qual e-mail?"' },
        ],
      },
      {
        id: 'fechamento',
        icon: '✅',
        title: 'Fechamento — peça diretamente',
        items: [
          { type: 'tip', text: '📌 Jordan Belfort: o médico não deixa você sem prescrição. Feche com clareza — sem rodeios.' },
          { type: 'script', text: '"Faz sentido explorar uma integração? O próximo passo mais simples seria uma call de 30 minutos — você, nosso técnico e alguém do produto de vocês — pra mapear como a API se encaixa. Quando você tem agenda essa semana?"' },
          { type: 'script', text: '(alternativa mais leve) "Posso te mandar um vídeo de 8 minutos mostrando o Coletor numa extrusora? Você assiste quando puder e aí a gente decide se faz sentido continuar."' },
          { type: 'tip', text: '💡 Baixar o limiar de ação (Jordan): "O compromisso agora é só de 30 minutos. Se não fizer sentido depois da call, tudo bem — mas se fizer, a gente já vai com a informação certa."' },
        ],
      },
      {
        id: 'pos-agendamento',
        icon: '📅',
        title: 'Depois de marcar — mantenha o engajamento',
        items: [
          { type: 'tip', text: 'Envie no mesmo dia que confirmou a reunião. Não deixe esfriar.' },
          { type: 'script', text: '"[Nome], ótimo papo. Te mando dois materiais antes da nossa call de [dia/hora]: (1) um vídeo de 8 min mostrando o Coletor numa extrusora — dados de produção em tempo real; (2) um resumo de como funcionaria a integração com o ERP de vocês via API. Confirma o e-mail?"' },
          { type: 'tip', text: '📲 No dia anterior: "Oi [Nome], só confirmando nossa call amanhã às [hora]. Se quiser, leva alguém do produto ou da TI — pode ajudar a responder as perguntas técnicas mais rápido."' },
        ],
      },
    ],
  },
  {
    id: 'cliente-direto',
    categoria: 'Cliente direto',
    tagline: 'Fim do apontamento manual — dado da máquina sem trocar o que já existe',
    duracao: '5–10 min',
    canal: 'Telefone → WhatsApp',
    alvo: 'Dono, diretor industrial ou gerente de produção/PCP',
    sections: [
      {
        id: 'contexto',
        icon: '🎯',
        title: 'Contexto — quem é esse lead',
        items: [
          { type: 'text', text: 'Indústria com máquinas e CLP/IHM. Apontamento ainda manual — papel, planilha ou operador digitando no ERP. Você fala com quem manda na produção. Sinal de oportunidade: vaga de "apontador de produção", ISO em andamento, notícia de expansão.' },
          { type: 'tip', text: '⚡ Primeiros 4 segundos: você é o especialista em chão de fábrica. Tom direto, confiante, sem rodeios. Quem manda na produção odeia enrolação.' },
        ],
      },
      {
        id: 'abertura',
        icon: '🚀',
        title: 'Abertura',
        items: [
          { type: 'script', text: '"Oi, posso falar com o [gerente de produção]? Aqui é [seu nome] da Dominant. A gente faz software que coleta dados das máquinas automaticamente — produção, paradas, tempo rodando — sem o operador anotar nada. Vocês trabalham com [plástico/usinagem/etc.] e esse é o perfil que a gente atende. Você tem 5 minutos?"' },
          { type: 'script', text: '(WhatsApp) "Oi [nome], [seu nome] da Dominant. Vi que a [empresa] trabalha com [setor]. A gente liga na máquina e coleta produção automaticamente — sem operador digitar. Você ainda faz apontamento manual? Posso te explicar em 2 minutos."' },
        ],
      },
      {
        id: 'spin',
        icon: '🔍',
        title: 'Diagnóstico SPIN',
        items: [
          { type: 'tip', text: 'S — Situação:' },
          { type: 'list', items: [
            '"Como vocês fazem o apontamento de produção hoje — manual, planilha ou tem sistema?"',
            '"Quantas máquinas vocês têm no parque?"',
            '"As máquinas têm CLP ou são mais antigas?"',
          ]},
          { type: 'tip', text: 'P — Problema:' },
          { type: 'list', items: [
            '"Qual é a dor maior: saber o que foi produzido, entender as paradas ou controlar tempo de máquina?"',
            '"O dado de produção que entra no ERP — você confia nele ou sabe que tem erro de digitação?"',
          ]},
          { type: 'tip', text: 'I — Implicação (deixe a dor aparecer):' },
          { type: 'list', items: [
            '"Quando você precisa saber a eficiência de uma máquina específica, de onde tira esse número hoje?"',
            '"Já teve situação de meta não bater porque o apontamento estava errado ou atrasado?"',
          ]},
          { type: 'tip', text: 'N — Necessidade:' },
          { type: 'list', items: [
            '"Se você tivesse o dado da máquina em tempo real no celular, o que mudaria na sua gestão?"',
          ]},
          { type: 'warning', text: '🔑 Pergunta obrigatória (Thiago Concer): nunca pule essa. Se o cliente mencionar preço ou restrição, pergunte: "Por que esse é o limite?" Pode ser um número antigo não revisado.' },
        ],
      },
      {
        id: 'proposta',
        icon: '💎',
        title: 'Transição + Proposta',
        items: [
          { type: 'script', text: '"Com base no que você me contou, o Coletor resolve exatamente isso. Deixa eu te dizer o porquê."' },
          { type: 'script', text: '"A gente instala um software na máquina que lê direto do CLP — sem hardware novo, só configuração. Ele coleta em tempo real: peças feitas, paradas e motivo, tempo rodando. Esses dados vão pro dashboard e também pra API que alimenta o ERP de vocês automaticamente. O operador para de anotar. Você vê o chão de fábrica em tempo real pelo celular."' },
          { type: 'script', text: '(sem ERP) "Se vocês não têm ERP ainda, a gente tem um PCP básico que configura junto — saem do zero pra ter controle de produção em semanas."' },
          { type: 'tip', text: '🏢 Certeza na empresa: "A gente rodou piloto em extrusora aqui no PR — posso te mostrar os números reais."' },
        ],
      },
      {
        id: 'objecoes',
        icon: '🛡️',
        title: 'Objeções comuns',
        items: [
          { type: 'tip', text: '"Não tenho tempo pra isso agora."' },
          { type: 'script', text: '"Entendo, você tá no meio da produção. Te mando um vídeo curto — você assiste quando tiver 8 minutos. Se fizer sentido, a gente marca 20 minutos quando você quiser."' },
          { type: 'tip', text: '"Já tentei coisa assim e não funcionou."' },
          { type: 'script', text: '"Faz sentido a desconfiança. O que trava é a instalação — precisa de técnico de automação, é caro e para a produção. A diferença nossa: o parceiro de automação (Automatic) instala o hardware e a gente configura o software remotamente. Não para a produção."' },
          { type: 'tip', text: '"Deve ser caro."' },
          { type: 'script', text: '"É aluguel por máquina por mês — você paga só pelo que usar, sem investimento alto na entrada. Quando a gente mapear quantas máquinas fazem sentido, posso te passar os valores. Mas pensa: qual é o custo de uma análise de eficiência errada hoje?"' },
          { type: 'tip', text: '"Meu ERP já tem isso."' },
          { type: 'script', text: '"Que ótimo. Ele coleta direto do CLP ou o operador ainda confirma? A maioria dos ERPs tem o módulo, mas o dado ainda entra manual. Se vocês já têm automático, estão na frente — não precisa de nada."' },
        ],
      },
      {
        id: 'fechamento',
        icon: '✅',
        title: 'Fechamento',
        items: [
          { type: 'script', text: '"Que tal isso: te mando um vídeo de 8 minutos mostrando o Coletor numa extrusora. Você assiste, mostra pro pessoal. Se fizer sentido, a gente marca uma call pra ver se encaixa no parque de vocês. Qual o seu WhatsApp?"' },
          { type: 'tip', text: '🩹 Reintroduzir dor no final (Jordan Belfort): "Pensa — em mais 6 meses com apontamento manual, você vai ter dados mais confiáveis do que tem hoje ou vai estar no mesmo lugar?"' },
        ],
      },
      {
        id: 'pos-agendamento',
        icon: '📅',
        title: 'Depois de marcar — mantenha o engajamento',
        items: [
          { type: 'tip', text: 'Envie no mesmo dia que confirmou. Ele precisa te lembrar antes da reunião.' },
          { type: 'script', text: '"[Nome], te mando o vídeo de 8 minutos que mencionei — é o Coletor rodando numa extrusora aqui no PR, dados em tempo real de produção e paradas. Reunião confirmada [dia] às [hora], certo? Se quiser levar o gerente de produção, pode ajudar."' },
          { type: 'tip', text: '📲 No dia anterior: "Oi [Nome], amanhã às [hora] — confirma? Posso preparar já a estimativa pro parque de máquinas de vocês se você me contar quantas máquinas têm CLP."' },
        ],
      },
    ],
  },
  {
    id: 'automacao-rpa',
    categoria: 'Automação RPA',
    tagline: 'Vender RPA — eliminar processos manuais repetitivos com robôs de software',
    duracao: '8–12 min',
    canal: 'LinkedIn → Telefone → WhatsApp',
    alvo: 'Dono, diretor de operações, gerente administrativo ou gerente de TI',
    sections: [
      {
        id: 'contexto',
        icon: '🎯',
        title: 'Contexto — quem é esse lead',
        items: [
          { type: 'text', text: 'A Dominant vende RPA para empresas COMPRADORAS — aquelas que têm processos manuais e repetitivos e precisam automatizá-los. O robô opera por cima dos sistemas existentes sem trocar nada e sem envolver TI.' },
          { type: 'tip', text: '🎯 Setores prioritários (em ordem): (1) Escritórios contábeis — NF, SPED, folha manual; (2) E-commerce/varejo online — NF, marketplaces, estoque; (3) Distribuidoras — pedidos por WhatsApp no ERP, frete; (4) Transportadoras — CTe/MDFe, cotação; (5) Clínicas/saúde — TISS, convênios; (6) Construtoras; (7) Imobiliárias; (8) RH/DP.' },
          { type: 'tip', text: '🔎 Sinais de oportunidade: vagas para "digitador", "assistente administrativo com Excel", "auxiliar de backoffice"; muitos sistemas sem integração; time crescendo só para dar conta do volume.' },
          { type: 'tip', text: '⚡ Primeiros 4 segundos: você é o especialista em automação de processos. Tom direto, confiante — quem sofre com processo manual quer solução, não explicação técnica.' },
        ],
      },
      {
        id: 'abertura',
        icon: '🚀',
        title: 'Abertura',
        items: [
          { type: 'script', text: '"Oi [nome], aqui é [seu nome] da Dominant. A gente faz automação de processos com RPA — eliminamos tarefas repetitivas que o time faz na mão hoje: digitação, preenchimento de sistemas, conciliação, relatórios. Vi que a [empresa] trabalha com [setor/contexto]. Você tem 5 minutos pra eu te mostrar como funciona?"' },
          { type: 'script', text: '(LinkedIn) "Oi [nome], vi que a [empresa] tem [sinal de processo manual]. A gente automatiza esse tipo de tarefa com RPA — o robô faz o trabalho repetitivo, o time faz o trabalho que importa. Faz sentido conversar?"' },
        ],
      },
      {
        id: 'spin',
        icon: '🔍',
        title: 'Diagnóstico SPIN',
        items: [
          { type: 'tip', text: 'S — Situação:' },
          { type: 'list', items: [
            '"Quais são os processos que mais ocupam tempo do time hoje — digitação, conciliação, relatórios, integração entre sistemas?"',
            '"Quantas pessoas trabalham nessas tarefas repetitivas?"',
            '"Vocês têm muitos sistemas diferentes que não se comunicam entre si?"',
          ]},
          { type: 'tip', text: 'P — Problema:' },
          { type: 'list', items: [
            '"Qual é a maior dor desses processos manuais — erro humano, atraso, custo ou gargalo de escala?"',
            '"Já teve situação de multa, perda de prazo ou cliente insatisfeito por causa de um processo manual que falhou?"',
          ]},
          { type: 'tip', text: 'I — Implicação (deixe o custo aparecer):' },
          { type: 'list', items: [
            '"Quanto tempo por dia seu time gasta nessas tarefas? [X horas × N pessoas × 22 dias] — quanto é só em mão de obra por mês?"',
            '"Se o volume dobrar nos próximos 12 meses, vocês precisariam contratar mais gente só pra continuar fazendo o que fazem hoje?"',
          ]},
          { type: 'tip', text: 'N — Necessidade:' },
          { type: 'list', items: [
            '"Se essas tarefas fossem automáticas, o que seu time faria com o tempo liberado?"',
          ]},
          { type: 'warning', text: '🔑 Pergunta obrigatória se mencionar preço: "Por que esse é o seu orçamento?" — pode ser um número antigo, uma estimativa ou uma tentativa de negociar. Nunca aceite sem perguntar.' },
        ],
      },
      {
        id: 'proposta',
        icon: '💎',
        title: 'Transição + Proposta de valor',
        items: [
          { type: 'script', text: '"Com base no que você me contou — [repita o processo específico que a pessoa mencionou] — o RPA resolve exatamente isso. Deixa eu te explicar."' },
          { type: 'script', text: '"A gente cria um robô de software que faz exatamente o que o seu funcionário faz hoje, mas 24 horas por dia, sem erro e sem precisar de intervalo. Ele abre os sistemas, preenche os campos, extrai os dados, gera o relatório e manda pro e-mail certo. O time para de fazer essa tarefa e começa a fazer o trabalho que agrega valor."' },
          { type: 'script', text: '"O robô não troca nenhum sistema que vocês já têm — ele opera por cima, igual a um funcionário usando mouse e teclado. Sem integração complexa, sem mexer na TI."' },
          { type: 'tip', text: '🏢 Certeza na empresa: "A gente já automatizou [processo similar] em [setor parecido] — posso te mostrar o antes e depois."' },
        ],
      },
      {
        id: 'objecoes',
        icon: '🛡️',
        title: 'Objeções — loop de volta, não só rebater',
        items: [
          { type: 'tip', text: '"Deve ser caro."' },
          { type: 'script', text: '"Depende de quantas horas por mês o robô vai trabalhar. Se o processo manual custa R$X por mês em mão de obra — qual é o payback? Na maioria dos casos é em menos de 6 meses. Quer que eu faça essa conta com os números de vocês?"' },
          { type: 'tip', text: '"Nossa TI não vai deixar."' },
          { type: 'script', text: '"Faz sentido. O RPA opera na camada de interface — ele usa os sistemas como qualquer usuário, sem API, sem acesso ao banco de dados. A maioria das TIs aprova porque não tem risco de quebrar nada. Posso mandar uma ficha técnica pra vocês apresentarem internamente?"' },
          { type: 'tip', text: '"Não temos tempo pra implementar agora."' },
          { type: 'script', text: '"Entendo. Processos simples ficam prontos em 2 a 4 semanas. E enquanto a gente implementa, o time continua trabalhando normal. Posso te mostrar um caso parecido pra você ter uma ideia do esforço real?"' },
          { type: 'tip', text: '"Já tentamos automatizar e não funcionou."' },
          { type: 'script', text: '"O que costuma falhar é integração via API — é caro e depende de TI. O RPA é diferente: opera como usuário humano, por cima do sistema. Se o processo existe hoje com um humano fazendo, o robô consegue replicar. Qual foi a tentativa anterior?"' },
        ],
      },
      {
        id: 'fechamento',
        icon: '✅',
        title: 'Fechamento',
        items: [
          { type: 'script', text: '"Que tal isso: me conta qual é o processo que mais dói — o que toma mais tempo ou gera mais erro. A gente faz um mapeamento de 1 hora e te devolve uma estimativa de tempo e custo pra automatizar. Sem compromisso. Quando você tem 1 hora essa semana?"' },
          { type: 'script', text: '(alternativa) "Posso te mandar um exemplo de automação que a gente fez em [setor parecido]? Você vê o antes/depois e a gente decide se faz sentido avançar."' },
          { type: 'tip', text: '🩹 Reintroduzir dor (Jordan Belfort): "Pensa — em mais 6 meses com esse processo manual, você vai ter mais pessoas fazendo a mesma coisa ou vai estar no mesmo gargalo que hoje?"' },
        ],
      },
      {
        id: 'pos-agendamento',
        icon: '📅',
        title: 'Depois de marcar — mantenha o engajamento',
        items: [
          { type: 'tip', text: 'Envie no mesmo dia. Para RPA, o que prende é mostrar o antes/depois de um processo parecido com o deles.' },
          { type: 'script', text: '"[Nome], ótimo. Te mando um exemplo de automação que fizemos num [setor parecido] — você vê o processo antes e depois. Reunião [dia] às [hora] confirmada. Se quiser levar quem cuida da operação, melhor ainda."' },
          { type: 'tip', text: '📲 No dia anterior: "Oi [Nome], amanhã às [hora]. Se conseguir me contar antes qual é o processo que mais dói, já chego com uma ideia do que dá pra automatizar."' },
        ],
      },
    ],
  },
  {
    id: 'integrador-automacao',
    categoria: 'Integrador de automação',
    tagline: 'Parceiro que instala o hardware — alinhar com a Automatic antes de qualquer contato',
    duracao: '10–15 min',
    canal: 'Telefone → Visita presencial',
    alvo: 'Sócio ou diretor técnico',
    sections: [
      {
        id: 'atencao',
        icon: '⚠️',
        title: 'Atenção — regra de status',
        items: [
          { type: 'warning', text: 'Integradores de automação ficam sempre com status PAUSADO. Só aborde depois de alinhar internamente com a Automatic. Contato prematuro pode gerar conflito com a parceria já existente.' },
        ],
      },
      {
        id: 'contexto',
        icon: '🎯',
        title: 'Contexto',
        items: [
          { type: 'text', text: 'Empresa que instala e programa CLPs e IHMs em fábricas. Eles já colocam a mão na máquina e têm acesso direto às fábricas. São o elo de hardware — a Dominant é o elo de software. Podem instalar o hardware e indicar o Coletor como serviço complementar.' },
        ],
      },
      {
        id: 'abertura',
        icon: '🚀',
        title: 'Abertura (depois de alinhar com a Automatic)',
        items: [
          { type: 'script', text: '"Oi [nome], aqui é [seu nome] da Dominant. A gente faz software de coleta de dados de máquina — se comunica com o CLP via Modbus e coleta produção em tempo real. Eu sei que vocês instalam e programam CLPs nas fábricas. A gente tá montando uma rede de parceiros de automação aqui no [estado] e o nome de vocês apareceu. Você tem 5 minutos?"' },
        ],
      },
      {
        id: 'spin',
        icon: '🔍',
        title: 'Diagnóstico SPIN',
        items: [
          { type: 'list', items: [
            '"S — Quando vocês instalam um CLP numa fábrica, o cliente costuma pedir algum sistema de monitoramento junto?"',
            '"P — Já perderam oportunidade porque o cliente queria monitoramento e vocês não tinham essa solução?"',
            '"I — Quantos projetos por mês vocês fazem em média? E em quantos desses o cliente pediu alguma visualização de dados?"',
            '"N — Se vocês pudessem oferecer coleta automática como serviço complementar à automação, isso mudaria o ticket do projeto?"',
          ]},
        ],
      },
      {
        id: 'proposta',
        icon: '💎',
        title: 'Proposta',
        items: [
          { type: 'script', text: '"Com base no que você me contou, a parceria faz sentido dos dois lados. Vocês fazem o hardware — instalação do CLP, IHM, painéis. A gente faz o software — conecta no CLP de vocês via Modbus e coleta produção em tempo real. O cliente paga pelos dois separado ou vocês podem incluir o software no projeto de vocês. A gente configura tudo remotamente."' },
        ],
      },
      {
        id: 'fechamento',
        icon: '✅',
        title: 'Fechamento',
        items: [
          { type: 'script', text: '"O próximo passo seria uma call de 30 minutos com nosso sócio técnico pra mapear como funcionaria nos projetos de vocês. Quando você tem agenda?"' },
        ],
      },
      {
        id: 'pos-agendamento',
        icon: '📅',
        title: 'Depois de marcar — mantenha o engajamento',
        items: [
          { type: 'tip', text: 'Integradores são técnicos — o que prende é mostrar que a integração com o CLP é simples.' },
          { type: 'script', text: '"[Nome], te mando a ficha técnica do Coletor — mostra exatamente como ele se comunica com CLP via Modbus. Reunião [dia] às [hora] com nosso sócio técnico. Se puder levar alguém do time de programação, melhor."' },
          { type: 'tip', text: '📲 No dia anterior: "Oi [Nome], amanhã às [hora]. Se tiver um projeto em andamento com CLP que você usa bastante, pode mencionar — a gente já verifica a compatibilidade antes."' },
        ],
      },
    ],
  },
  {
    id: 'fabricante-maquinas',
    categoria: 'Fabricante de máquinas',
    tagline: 'A máquina já vem com monitoramento — diferencial de produto, não custo extra',
    duracao: '10–15 min',
    canal: 'LinkedIn → Telefone → Visita em feira',
    alvo: 'Diretor comercial ou diretor de produto',
    sections: [
      {
        id: 'atencao',
        icon: '⚠️',
        title: 'Atenção — regra de timing',
        items: [
          { type: 'warning', text: 'Fabricantes ficam PAUSADOS até o case da extrusora estar concluído e documentado. Sem um resultado real para mostrar, a conversa não avança.' },
        ],
      },
      {
        id: 'contexto',
        icon: '🎯',
        title: 'Contexto',
        items: [
          { type: 'text', text: 'Empresa que fabrica máquinas com CLP/IHM embutidos. Podem oferecer o Coletor junto com a máquina — "a máquina já vem com monitoramento em tempo real". Ou fazer integração nativa para os clientes deles. Transformam o Coletor de custo em diferencial de produto.' },
        ],
      },
      {
        id: 'abertura',
        icon: '🚀',
        title: 'Abertura (após o case estar pronto)',
        items: [
          { type: 'script', text: '"Oi [nome], aqui é [seu nome] da Dominant. A gente faz software de monitoramento de máquinas — coleta produção, paradas e eficiência direto do CLP. Acabamos de fechar um case com uma extrusora aqui no PR — a fábrica passou de apontamento manual para coleta automática em tempo real. Vi que a [empresa] fabrica [tipo de máquina] e os CLPs de vocês são exatamente o tipo que a gente se conecta. Você tem 5 minutos?"' },
        ],
      },
      {
        id: 'spin',
        icon: '🔍',
        title: 'Diagnóstico SPIN',
        items: [
          { type: 'list', items: [
            '"S — As máquinas de vocês saem com CLP embarcado de fábrica? Qual CLP geralmente?"',
            '"P — Os clientes de vocês pedem monitoramento remoto ou relatório de produção? Vocês têm isso hoje?"',
            '"I — Quantos clientes já pediram monitoramento e vocês não conseguiram atender?"',
            '"N — Se vocês pudessem oferecer a máquina já com monitoramento incluso, isso mudaria o argumento de vendas?"',
          ]},
        ],
      },
      {
        id: 'proposta',
        icon: '💎',
        title: 'Proposta',
        items: [
          { type: 'script', text: '"Com base no que você me contou, a parceria faz sentido assim: a gente preconfigura o Coletor para o CLP que vocês usam. Quando a máquina sai da fábrica, ela já vem com o software pronto. O cliente só precisa apontar o endereço IP e ligar. Vocês podem oferecer como opcional pago ou diferencial padrão — a máquina da [empresa] já monitorada de fábrica."' },
        ],
      },
      {
        id: 'fechamento',
        icon: '✅',
        title: 'Fechamento',
        items: [
          { type: 'script', text: '"Posso te mandar o case da extrusora — números reais de antes e depois? Se fizer sentido, a gente marca uma call técnica pra ver a viabilidade com o CLP que vocês usam. Qual e-mail?"' },
        ],
      },
      {
        id: 'pos-agendamento',
        icon: '📅',
        title: 'Depois de marcar — mantenha o engajamento',
        items: [
          { type: 'tip', text: 'Fabricante quer ver o case com números reais — é isso que justifica a decisão de produto.' },
          { type: 'script', text: '"[Nome], te mando o case da extrusora com os dados reais — antes e depois da instalação. Reunião [dia] às [hora]. Se puder trazer alguém do produto ou engenharia, ótimo."' },
          { type: 'tip', text: '📲 No dia anterior: "Oi [Nome], amanhã às [hora]. Já revisei o CLP que vocês usam — tenho boas notícias pra trazer."' },
        ],
      },
    ],
  },
  {
    id: 'polo-associacao',
    categoria: 'Polo / Associação',
    tagline: 'Uma parceria que abre dezenas de fábricas de uma vez',
    duracao: '15–20 min',
    canal: 'LinkedIn → E-mail institucional → Telefone',
    alvo: 'Presidente, diretor executivo ou gerente de projetos da associação',
    sections: [
      {
        id: 'contexto',
        icon: '🎯',
        title: 'Contexto',
        items: [
          { type: 'text', text: 'Associação industrial, sindicato patronal, APL ou polo. Eles representam dezenas ou centenas de fábricas. Uma parceria aqui pode abrir toda uma região de uma vez. Seu pitch é diferente: não é "vender o Coletor" — é "levar uma solução de valor para os seus associados".' },
        ],
      },
      {
        id: 'abertura',
        icon: '🚀',
        title: 'Abertura',
        items: [
          { type: 'script', text: '"Oi [nome], aqui é [seu nome] da Dominant. A gente faz software de coleta automática de dados de chão de fábrica — ajuda indústrias PME a eliminar o apontamento manual de produção. Vi que a [associação] representa [setor/região]. A gente tá montando parcerias com associações pra levar digitalização de chão de fábrica para os associados de forma simples e acessível. Você tem 10 minutos?"' },
        ],
      },
      {
        id: 'spin',
        icon: '🔍',
        title: 'Diagnóstico SPIN',
        items: [
          { type: 'list', items: [
            '"S — Quantas empresas vocês representam? Qual o perfil médio — porte, setor?"',
            '"P — Digitalização de chão de fábrica é uma pauta que aparece nos associados? Eles pedem isso?"',
            '"I — Quais os principais gargalos que os associados de vocês enfrentam em produção hoje?"',
            '"N — Se vocês levassem uma solução de coleta automática de dados de máquina para os associados, seria algo que faria sentido comunicar em newsletter, evento ou programa?"',
          ]},
        ],
      },
      {
        id: 'proposta',
        icon: '💎',
        title: 'Proposta',
        items: [
          { type: 'script', text: '"Com base no que você me contou, a parceria pode funcionar assim: a gente apresenta o Coletor num evento da associação, ou via newsletter, ou num programa de digitalização. Os associados que quiserem testar entram num piloto com condições especiais por ser membro. Vocês levam valor concreto para os associados — e a gente tem acesso à base de fábricas de vocês."' },
        ],
      },
      {
        id: 'fechamento',
        icon: '✅',
        title: 'Fechamento',
        items: [
          { type: 'script', text: '"O próximo passo seria uma reunião de 30 minutos — você, eu e nosso sócio — pra mapear como a gente pode levar isso pros associados de vocês. Quando você tem agenda?"' },
          { type: 'script', text: '(alternativa) "Posso te mandar uma apresentação de 2 páginas com o que a gente faz e como funcionaria a parceria? Você avalia e me diz se faz sentido apresentar para a diretoria."' },
        ],
      },
      {
        id: 'pos-agendamento',
        icon: '📅',
        title: 'Depois de marcar — mantenha o engajamento',
        items: [
          { type: 'tip', text: 'Associações recebem muita coisa — você precisa chegar com algo concreto pra não sumir na caixa de entrada.' },
          { type: 'script', text: '"[Nome], te mando a apresentação de 2 páginas que mencionei — fácil de levar pra diretoria. Reunião [dia] às [hora]. Se quiser incluir mais alguém da equipe, fica à vontade."' },
          { type: 'tip', text: '📲 No dia anterior: "Oi [Nome], amanhã às [hora]. Se tiver algum evento ou programa nos próximos meses onde faria sentido apresentar o Coletor para os associados, já podemos discutir isso."' },
        ],
      },
    ],
  },
  {
    id: 'programa-fomento',
    categoria: 'Programa / Fomento',
    tagline: 'O programa paga o Coletor para as fábricas — escala sem vender uma por uma',
    duracao: '15–20 min',
    canal: 'E-mail institucional → LinkedIn → Telefone',
    alvo: 'Gestor do programa, consultor ou coordenador de projetos',
    sections: [
      {
        id: 'contexto',
        icon: '🎯',
        title: 'Contexto',
        items: [
          { type: 'text', text: 'SENAI, Sebrae, BNDES, Finep, Embrapii, ou editais estaduais. Eles financiam ou levam digitalização para PMEs industriais. Uma parceria aqui é diferente: o programa subsidia o Coletor para as fábricas. Você não precisa vender para cada fábrica — o programa já tem lista de beneficiários e orçamento aprovado.' },
        ],
      },
      {
        id: 'abertura',
        icon: '🚀',
        title: 'Abertura',
        items: [
          { type: 'script', text: '"Oi [nome], aqui é [seu nome] da Dominant. A gente faz software de coleta automática de dados de chão de fábrica para indústrias PME — conecta no CLP via Modbus e elimina o apontamento manual. Entrei em contato porque o [programa] atua com digitalização industrial e o Coletor pode ser habilitado como solução dentro do programa. Você tem 10 minutos pra entender se faz sentido?"' },
        ],
      },
      {
        id: 'spin',
        icon: '🔍',
        title: 'Diagnóstico SPIN',
        items: [
          { type: 'list', items: [
            '"S — Como funciona o programa hoje — vocês indicam soluções para as empresas ou as empresas buscam?"',
            '"P — Digitalização de chão de fábrica e coleta de dados de máquina está na pauta do programa?"',
            '"I — Quantas indústrias o programa atende por ciclo? Qual o principal gargalo que elas têm em produção?"',
            '"N — Se uma solução de coleta automática fosse habilitada no programa, os critérios de elegibilidade permitiriam isso?"',
          ]},
        ],
      },
      {
        id: 'proposta',
        icon: '💎',
        title: 'Proposta',
        items: [
          { type: 'script', text: '"Com base no que você me contou, o Coletor pode entrar como solução elegível no programa. O que a gente faz: software que conecta no CLP da fábrica via Modbus e coleta produção, paradas e eficiência em tempo real. As PMEs que o programa atende são exatamente o perfil — elas têm máquinas, mas o apontamento ainda é manual. O programa subsidia o Coletor, a gente instala e configura remotamente."' },
        ],
      },
      {
        id: 'fechamento',
        icon: '✅',
        title: 'Fechamento',
        items: [
          { type: 'script', text: '"O próximo passo seria entender os critérios de elegibilidade do programa para ver se o Coletor se encaixa. Posso te mandar uma ficha técnica e um sumário executivo pra você avaliar internamente? Qual e-mail? E tem alguma janela de inscrição de soluções chegando?"' },
        ],
      },
      {
        id: 'pos-agendamento',
        icon: '📅',
        title: 'Depois de marcar — mantenha o engajamento',
        items: [
          { type: 'tip', text: 'Programas de fomento são burocráticos — facilite o trabalho deles mandando tudo formatado.' },
          { type: 'script', text: '"[Nome], te mando a ficha técnica e o sumário executivo — já no formato que costuma ser pedido nesses processos. Reunião [dia] às [hora]. Se precisar de mais algum documento antes, é só falar."' },
          { type: 'tip', text: '📲 No dia anterior: "Oi [Nome], amanhã às [hora]. Se souber até lá quais são os critérios de elegibilidade do programa, já consigo te dizer na call se o Coletor se enquadra."' },
        ],
      },
    ],
  },
];

