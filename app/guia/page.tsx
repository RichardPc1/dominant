'use client';
import { t } from '@/lib/i18n';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="flex items-center gap-3 text-xl font-bold tracking-tight text-gray-900 mb-4">
        <span className="tema-fixo w-1.5 h-6 rounded-full bg-gradient-to-b from-blue-600 to-indigo-600" />
        {t(title)}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Card({ title, badge, badgeColor, children }: { title: string; badge?: string; badgeColor?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        {badge && (
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${badgeColor}`}>
            {t(badge)}
          </span>
        )}
        <h3 className="font-semibold text-gray-900">{t(title)}</h3>
      </div>
      <div className="text-sm text-gray-600 space-y-2">{children}</div>
    </div>
  );
}

function Field({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded h-fit mt-0.5 whitespace-nowrap">{t(name)}</span>
      <p className="text-sm text-gray-600">{children}</p>
    </div>
  );
}

const NAV = [
  { id: 'produto', label: 'O produto' },
  { id: 'categorias', label: 'Categorias de lead' },
  { id: 'score', label: 'Score e prioridade' },
  { id: 'status', label: 'Status' },
  { id: 'campos', label: 'Campos do lead' },
  { id: 'fluxo', label: 'Fluxo completo' },
  { id: 'agente', label: 'O agente de IA' },
];

export default function GuiaPage() {
  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("Guia completo do sistema")}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{t("O que a Dominant vende, como os leads são classificados e como usar o CRM")}</p>
        <nav className="lg:hidden flex gap-2 overflow-x-auto mt-4 pb-1">
          {NAV.map(n => (
            <a key={n.id} href={`#${n.id}`} className="shrink-0 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-full px-3 py-1.5 shadow-sm">
              {t(n.label)}
            </a>
          ))}
        </nav>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-8 items-start">
        {/* Sidebar nav */}
        <aside className="hidden lg:block w-56 shrink-0 sticky top-6">
          <nav className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-2 space-y-0.5">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">{t("Nesta página")}</p>
            {NAV.map(n => (
              <a key={n.id} href={`#${n.id}`} className="block text-sm text-gray-700 hover:text-blue-700 hover:bg-blue-50 px-3 py-2 rounded-xl transition-colors">
                {t(n.label)}
              </a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 space-y-10 min-w-0">

          {/* O produto */}
          <Section id="produto" title={t("O produto: o que é o Coletor")}>
            <div className="bg-white border border-gray-200/80 shadow-sm rounded-2xl p-5 sm:p-6 text-sm text-gray-700 space-y-5 leading-relaxed">
              <p className="font-semibold text-blue-700">{t("A Dominant vende três soluções:")}</p>

              <div className="border-l-4 border-blue-400 pl-4 space-y-1">
                <p className="font-semibold text-gray-800">{t("1. Coletor — dados de chão de fábrica")}</p>
                <p>{t("Software que se conecta a")} <strong>{t("CLPs e IHMs")}</strong> {t("via protocolo")} <strong>{t("Modbus")}</strong> {t("e coleta automaticamente dados de produção em tempo real — peças produzidas, tempo de máquina, paradas e motivos. Os dados ficam disponíveis como")} <strong>{t("endpoints de API REST")}</strong>{t(", prontos para alimentar ERP, PCP, Power BI ou qualquer sistema.")}</p>
                <p>{t("O problema que resolve:")} <strong>{t("a maioria das fábricas ainda faz o apontamento de produção na mão")}</strong> {t("— papel, planilha ou o operador digitando no terminal do ERP. O Coletor elimina isso sem trocar o ERP existente.")}</p>
                <p><strong>{t("Hardware:")}</strong> {t("a parceira Automatic instala o CLP e a IHM. A Dominant configura o software remotamente.")}</p>
                <p><strong>{t("Modelo:")}</strong> {t("aluguel por máquina por mês ou licença com manutenção anual.")}</p>
              </div>

              <div className="border-l-4 border-violet-400 pl-4 space-y-1">
                <p className="font-semibold text-gray-800">{t("2. Automação RPA — eliminação de processos manuais")}</p>
                <p>{t("A Dominant desenvolve")} <strong>{t("robôs de software (RPA)")}</strong> {t("para empresas de qualquer setor que têm processos manuais e repetitivos: digitação entre sistemas, preenchimento de formulários, conciliação de dados, relatórios, integração entre plataformas sem API.")}</p>
                <p>{t("O robô opera por cima dos sistemas existentes — igual a um funcionário usando mouse e teclado — sem precisar trocar nenhum sistema e sem acesso ao banco de dados. A TI não precisa se envolver.")}</p>
                <p><strong>{t("Modelo:")}</strong> {t("projeto de implementação + manutenção mensal.")}</p>
              </div>

              <div className="border-l-4 border-green-400 pl-4 space-y-1">
                <p className="font-semibold text-gray-800">{t("3. Aplicações com IA e software sob medida")}</p>
                <p>{t("A Dominant também desenvolve")} <strong>{t("aplicações customizadas com Inteligência Artificial")}</strong> {t("— dashboards inteligentes, sistemas de apoio à decisão, automação com LLMs, integrações complexas e aplicações sob medida para necessidades específicas do cliente.")}</p>
              </div>
            </div>
          </Section>

          {/* Categorias */}
          <Section id="categorias" title={t("Categorias de lead — o que é cada uma")}>
            <p className="text-sm text-gray-500">{t("Cada lead pertence a exatamente uma categoria. Ela define quem é a empresa e como a Dominant vai se relacionar com ela.")}</p>

            <Card title={t("ERP / PCP")} badge="ERP / PCP" badgeColor="bg-blue-50 text-blue-700">
              <p><strong>{t("O que é:")}</strong> {t("empresa brasileira que vende ou implementa ERP (sistema de gestão), PCP (planejamento e controle da produção) ou MES (Manufacturing Execution System) para indústrias de pequeno e médio porte.")}</p>
              <p><strong>{t("Por que interessa:")}</strong> {t("o ERP deles já está instalado na fábrica — mas o apontamento de produção ainda entra manualmente (operador digita, usa terminal, tablet ou papel). O Coletor pode virar um módulo complementar que alimenta o ERP com dados automáticos da máquina, sem o cliente trocar de sistema.")}</p>
              <p><strong>{t("Tipo de parceria:")}</strong> {t("revenda, integração via API ou marketplace dentro do próprio ERP.")}</p>
              <p><strong>{t("Sinal de encaixe:")}</strong> {t("o site ou demo do ERP mostra apontamento por terminal, tablet do operador ou entrada manual. API aberta é bom sinal. Programa de parceiros é porta de entrada.")}</p>
            </Card>

            <Card title={t("Integrador de automação")} badge="Integrador de automação" badgeColor="bg-orange-50 text-orange-700">
              <p><strong>{t("O que é:")}</strong> {t("empresa que instala e programa CLPs e IHMs em fábricas — faz retrofit de máquinas antigas, monta painéis elétricos, faz adequação de segurança NR-12. É o tipo de empresa que a parceira Automatic representa.")}</p>
              <p><strong>{t("Por que interessa:")}</strong> {t("eles já colocam a mão na máquina e têm acesso direto às fábricas. Poderiam instalar o hardware e indicar o Coletor como serviço complementar.")}</p>
              <p><strong>{t("Atenção:")}</strong> {t("esses leads ficam sempre com status")} <strong>{t("Pausado")}</strong> {t("— só devem ser contatados depois de um alinhamento interno com a Automatic, para não causar conflito com a parceria já existente.")}</p>
              <p><strong>{t("Sinal de encaixe:")}</strong> {t("site com portfólio de automação industrial, sem produto de software de coleta ou IoT próprio.")}</p>
            </Card>

            <Card title={t("Fabricante de máquinas")} badge="Fabricante de máquinas" badgeColor="bg-yellow-50 text-yellow-700">
              <p><strong>{t("O que é:")}</strong> {t("empresa brasileira que fabrica máquinas industriais — extrusoras, injetoras, sopradoras, CNCs, máquinas para madeira, entre outras. Seus equipamentos já têm CLPs e IHMs embutidos.")}</p>
              <p><strong>{t("Por que interessa:")}</strong> {t("eles poderiam oferecer o Coletor")} <em>{t("junto com a máquina")}</em>{t(", como um diferencial de produto — \"a máquina já vem com monitoramento em tempo real\". Ou fazer integração nativa para os clientes deles.")}</p>
              <p><strong>{t("Atenção:")}</strong> {t("ficam com status")} <strong>{t("Pausado")}</strong> {t("até o case da extrusora estar concluído. Sem case real e documentado, a conversa com fabricantes não avança.")}</p>
              <p><strong>{t("Sinal de encaixe:")}</strong> {t("fabrica máquinas controladas por CLP/IHM e não tem plataforma própria de monitoramento ou telemetria.")}</p>
            </Card>

            <Card title={t("Cliente direto")} badge="Cliente direto" badgeColor="bg-green-50 text-green-700">
              <p><strong>{t("O que é:")}</strong> {t("indústria de pequeno ou médio porte com parque de máquinas — plástico, metalmecânica, usinagem, móveis, embalagens, borracha, alimentos com linha automatizada.")}</p>
              <p><strong>{t("Por que interessa:")}</strong> {t("é o cliente final do Coletor. A fábrica tem máquinas com CLP/IHM mas ainda faz apontamento manual. O Coletor entra diretamente para automatizar esse processo.")}</p>
              <p><strong>{t("Sinais de encaixe:")}</strong> {t("vaga de emprego para \"apontador de produção\", \"auxiliar de PCP\" ou \"analista de PCP\" que menciona Excel; certificação ISO ou IATF em andamento (exige rastreabilidade); notícia de expansão ou compra de máquinas novas.")}</p>
            </Card>

            <Card title={t("Automação RPA")} badge="Automação RPA" badgeColor="bg-violet-50 text-violet-700">
              <p><strong>{t("O que é:")}</strong> {t("empresa de qualquer setor com processos manuais e repetitivos que a Dominant pode automatizar com RPA. O robô opera por cima dos sistemas existentes — igual a um funcionário no teclado — sem trocar nenhum sistema e sem envolver TI.")}</p>
              <p><strong>{t("Por que interessa:")}</strong> {t("a Dominant")} <em>{t("vende")}</em> {t("automação RPA. Esse lead é um potencial")} <strong>{t("comprador")}</strong> {t("— não um parceiro técnico. A dor: muita gente fazendo trabalho chato, repetitivo, caro e sujeito a erro.")}</p>
              <p><strong>{t("Setores que mais precisam (em ordem de prioridade):")}</strong></p>
              <ol className="list-decimal list-inside space-y-1 pl-1">
                <li><strong>{t("Escritórios contábeis")}</strong> {t("— lançamento de NF, SPED, folha, conciliação bancária manual todo mês")}</li>
                <li><strong>{t("E-commerce e varejo online")}</strong> {t("— NF, integração com Mercado Livre/Shopee/Amazon, atualização de estoque entre sistemas")}</li>
                <li><strong>{t("Distribuidoras e atacadistas")}</strong> {t("— pedidos via WhatsApp digitados no ERP, cotação de frete manual, conciliação de boletos")}</li>
                <li><strong>{t("Transportadoras e logística")}</strong> {t("— emissão de CTe/MDFe, cotação em múltiplos sites, romaneio no Excel")}</li>
                <li><strong>{t("Clínicas e saúde")}</strong> {t("— faturamento TISS de convênios, agendamento, glosas manuais")}</li>
                <li><strong>{t("Construtoras e incorporadoras")}</strong> {t("— medições de obra, pagamentos de subempreiteiros, relatórios")}</li>
                <li><strong>{t("Imobiliárias")}</strong> {t("— contratos de locação, cobranças, registros")}</li>
                <li><strong>{t("RH e departamento pessoal")}</strong> {t("— e-Social, admissão, folha de pagamento")}</li>
              </ol>
              <p><strong>{t("Sinais de encaixe:")}</strong> {t("vagas para \"digitador\", \"assistente administrativo com Excel\", \"auxiliar de backoffice\"; empresa com 20+ pessoas e muitos sistemas sem integração; time crescendo só para dar conta do volume.")}</p>
              <p className="text-violet-700 font-medium">{t("NÃO é esse perfil: empresas de TI, consultorias de automação, implementadoras de UiPath/Automation Anywhere.")}</p>
            </Card>

            <Card title={t("Polo / Associação")} badge="Polo / Associação" badgeColor="bg-teal-50 text-teal-700">
              <p><strong>{t("O que é:")}</strong> {t("sindicato patronal, associação industrial setorial, APL (arranjo produtivo local), polo industrial ou organização de feira do setor.")}</p>
              <p><strong>{t("Por que interessa:")}</strong> {t("dá acesso a dezenas ou centenas de fábricas de uma vez. Uma parceria com a FIESP, FIEP, SIMA ou um APL de plásticos pode abrir toda uma região ou setor de uma vez.")}</p>
              <p><strong>{t("Próximo passo típico:")}</strong> {t("pedir lista de associados, propor apresentação em evento, publicar artigo na newsletter do polo.")}</p>
            </Card>

            <Card title={t("Programa / Fomento")} badge="Programa / Fomento" badgeColor="bg-indigo-50 text-indigo-700">
              <p><strong>{t("O que é:")}</strong> {t("programa público ou privado que financia ou leva digitalização para pequenas e médias indústrias — SENAI, Sebrae, BNDES, Finep, Embrapii, editais estaduais de inovação industrial.")}</p>
              <p><strong>{t("Por que interessa:")}</strong> {t("o programa paga ou subsidia o custo do Coletor para a fábrica. Em vez de vender para uma fábrica por vez, o Coletor entra como solução habilitada dentro de um programa que já tem orçamento e lista de beneficiários.")}</p>
              <p><strong>{t("Próximo passo típico:")}</strong> {t("identificar o gestor do programa, entender o edital e verificar se o Coletor se encaixa nos critérios de elegibilidade.")}</p>
            </Card>

            <Card title={t("Concorrente")} badge="Concorrente" badgeColor="bg-red-50 text-red-600">
              <p><strong>{t("O que é:")}</strong> {t("empresa que já vende coleta automática de dados de máquina, apontamento automático de produção, IoT industrial ou MES com coleta de chão de fábrica.")}</p>
              <p><strong>{t("Por que registrar:")}</strong> {t("para monitorar o mercado — entender o que cobram, como posicionam, quais clientes atendem e onde estão falhando. Essa informação ajuda a afinar o discurso de vendas e a encontrar brechas.")}</p>
              <p><strong>{t("Atenção:")}</strong> {t("concorrentes são sempre")} <strong>{t("Prioridade 3")}</strong> {t("e status")} <strong>{t("Monitorar")}</strong>{t(". Nunca são abordados como oportunidade de venda ou parceria.")}</p>
            </Card>
          </Section>

          {/* Score e prioridade */}
          <Section id="score" title={t("Score e prioridade — como funciona a pontuação")}>
            <p className="text-sm text-gray-500">{t("O agente dá uma nota de 0 a 10 para cada lead somando quatro critérios. Essa nota vira a prioridade.")}</p>

            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{t("Critério")}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{t("Pontos")}</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-700">{t("O que avalia")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-800">{t("Encaixe com a dor")}</td>
                    <td className="px-4 py-3 text-gray-600">0 – 4</td>
                    <td className="px-4 py-3 text-gray-600">{t("Evidência clara de apontamento manual = 4. Indício (vaga, ISO) = 2. Sem evidência = 0.")}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-800">{t("Escala")}</td>
                    <td className="px-4 py-3 text-gray-600">0 – 3</td>
                    <td className="px-4 py-3 text-gray-600">{t("Acesso a muitas máquinas (ERP com base grande, fabricante, associação) = 3. Médio = 2. Uma fábrica pequena = 1.")}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-800">{t("Acessibilidade")}</td>
                    <td className="px-4 py-3 text-gray-600">0 – 2</td>
                    <td className="px-4 py-3 text-gray-600">{t("Empresa pequena/média com decisor identificável = 2. Grande e burocrática = 0.")}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-gray-800">{t("Proximidade")}</td>
                    <td className="px-4 py-3 text-gray-600">0 – 1</td>
                    <td className="px-4 py-3 text-gray-600">{t("Paraná, Santa Catarina ou São Paulo = 1. Demais estados = 0. (Visita presencial possível.)")}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded border border-red-200">P1</span>
                  <span className="font-semibold text-red-700">{t("Prioridade 1")}</span>
                </div>
                <p className="text-sm text-gray-600">{t("Score 8 a 10. Abordar primeiro. Evidência forte de dor + boa escala + decisor acessível.")}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded border border-amber-200">P2</span>
                  <span className="font-semibold text-amber-700">{t("Prioridade 2")}</span>
                </div>
                <p className="text-sm text-gray-600">{t("Score 5 a 7. Bom potencial, mas algum critério fraco — vale abordar depois dos P1.")}</p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-0.5 rounded border border-gray-200">P3</span>
                  <span className="font-semibold text-gray-600">{t("Prioridade 3")}</span>
                </div>
                <p className="text-sm text-gray-600">{t("Score 0 a 4. Encaixe fraco ou desconhecido. Abordar só depois dos demais. Concorrentes são sempre P3.")}</p>
              </div>
            </div>
          </Section>

          {/* Status */}
          <Section id="status" title={t("Status — o que significa cada etapa")}>
            <p className="text-sm text-gray-500">
              {t("Os status")} <strong>{t("A contatar")}</strong>, <strong>{t("A pesquisar")}</strong>, <strong>{t("Pausado")}</strong> e <strong>{t("Monitorar")}</strong> {t("são definidos pelo agente de IA ao criar o lead. Os demais são exclusivos de humanos — você atualiza manualmente na tela de chamada.")}
            </p>

            <div className="space-y-3">
              {[
                { status: 'A contatar', color: 'bg-green-100 text-green-700', quem: 'IA', desc: 'Lead qualificado com contato identificado. Pronto para ser abordado. Este é o principal filtro de trabalho diário — todos os "A contatar" são a fila de ligações.', quando: 'Agente encontrou o lead com contato claro (site, e-mail comercial, LinkedIn da empresa).' },
                { status: 'A pesquisar', color: 'bg-blue-100 text-blue-700', quem: 'IA', desc: 'Lead identificado mas falta informação básica — não foi possível confirmar o contato, o decisor ou o encaixe com o produto. Precisa de pesquisa adicional antes de abordar.', quando: 'Agente encontrou a empresa mas não conseguiu confirmar todos os dados necessários.' },
                { status: 'Pausado', color: 'bg-gray-100 text-gray-600', quem: 'IA', desc: 'Lead válido mas que não deve ser abordado agora — por decisão estratégica (Integrador: alinhamento com a Automatic; Fabricante: aguardar case) ou por falta de maturidade do momento.', quando: 'Integradores de automação e fabricantes de máquinas entram sempre como Pausado.' },
                { status: 'Monitorar', color: 'bg-purple-100 text-purple-700', quem: 'IA', desc: 'Concorrente ou empresa que vale acompanhar mas não abordar. Serve para análise de mercado e posicionamento.', quando: 'Todos os concorrentes entram como Monitorar.' },
                { status: 'Contatado', color: 'bg-teal-100 text-teal-700', quem: 'Você', desc: 'Primeira abordagem feita — mensagem enviada, ligação realizada ou e-mail disparado. Aguardando resposta.', quando: 'Você fez o primeiro contato mas ainda não teve retorno.' },
                { status: 'Em conversa', color: 'bg-cyan-100 text-cyan-700', quem: 'Você', desc: 'Há troca ativa de mensagens ou o lead demonstrou interesse. A conversa está viva.', quando: 'O lead respondeu e a conversa está em andamento.' },
                { status: 'Reunião marcada', color: 'bg-indigo-100 text-indigo-700', quem: 'Você', desc: 'Reunião ou demo agendada. Prepare material para apresentar o Coletor e o caso de uso específico desse lead.', quando: 'Data e hora confirmadas.' },
                { status: 'Proposta enviada', color: 'bg-violet-100 text-violet-700', quem: 'Você', desc: 'Proposta comercial formal enviada ao lead. Aguardando decisão.', quando: 'Proposta com valor e condições enviada.' },
                { status: 'Piloto', color: 'bg-orange-100 text-orange-700', quem: 'Você', desc: 'Piloto técnico ou comercial em andamento — o Coletor está sendo testado na máquina do cliente ou parceiro.', quando: 'Contrato de piloto assinado ou acordo informal estabelecido.' },
                { status: 'Parceiro ativo', color: 'bg-emerald-100 text-emerald-700', quem: 'Você', desc: 'Parceiro comercial ativo — ERP integrado, integrador revendendo ou fabricante embarcando o Coletor. Receita recorrente gerada.', quando: 'Contrato assinado e operação rodando.' },
                { status: 'Fechado', color: 'bg-red-100 text-red-600', quem: 'Você', desc: 'Negociação encerrada sem sucesso — sem interesse, projeto cancelado, perdido para concorrente ou fora do perfil. Pode ser reaberto no futuro.', quando: 'Lead descartado ou perdido.' },
              ].map(s => (
                <div key={s.status} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 flex gap-4 flex-col sm:flex-row">
                  <div className="flex sm:flex-col items-center sm:items-start gap-1.5 pt-0.5 sm:w-36 shrink-0">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${s.color}`}>{t(s.status)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${s.quem === 'IA' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                      {s.quem === 'IA' ? t("Define: IA") : t("Define: você")}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-700 mb-1">{t(s.desc)}</p>
                    <p className="text-xs text-gray-400"><strong>{t("Quando usar:")}</strong> {t(s.quando)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Campos */}
          <Section id="campos" title={t("Campos do lead — o que cada um significa")}>
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 space-y-4">
              <Field name="Nome">{t("Nome da empresa. Único no sistema — o agente não cadastra a mesma empresa duas vezes.")}</Field>
              <Field name="Categoria">{t("Tipo do lead (veja seção Categorias). Define a estratégia de abordagem e o status inicial.")}</Field>
              <Field name="Localização">{t("Cidade e estado no formato \"Cidade – UF\". Usado para planejar visitas e calcular o ponto Proximidade do score.")}</Field>
              <Field name="Perfil / o que faz">{t("Resumo em 1–2 frases do que a empresa faz. Base para entender o contexto antes de ligar.")}</Field>
              <Field name="Por que faz sentido">{t("Explicação do encaixe com o Coletor. Começa com \"Evidência:\" para dados verificados na fonte ou \"Hipótese:\" para inferências. É o argumento central da abordagem.")}</Field>
              <Field name="Contato / canal de entrada">{t("Como chegar até a empresa: site, e-mail comercial genérico (contato@, comercial@), LinkedIn da empresa, telefone comercial. Nunca dados pessoais de colaboradores.")}</Field>
              <Field name="Prioridade">{t("P1 / P2 / P3 derivada do score. Determina a ordem de abordagem.")}</Field>
              <Field name="Status">{t("Etapa atual no funil (veja seção Status).")}</Field>
              <Field name="Próximo passo">{t("Ação concreta e específica sugerida pelo agente — ex.: \"Mensagem exploratória no LinkedIn ao diretor de produto\". Você pode reescrever depois.")}</Field>
              <Field name="Responsável">{t("Nome do vendedor/sócio que está tocando esse lead. Preenchido manualmente por você.")}</Field>
              <Field name="Data próx. passo">{t("Quando executar o próximo passo. Preenchido manualmente.")}</Field>
              <Field name="Última interação">{t("Data da última ação real (ligação, e-mail, reunião). Atualizado automaticamente ao mudar o status na tela de chamada.")}</Field>
              <Field name="Observações">{t("Riscos, dúvidas, pontos para confirmar na conversa. Preenchido pelo agente com alertas relevantes.")}</Field>
              <Field name="Fonte">{t("URL da página que comprova o encaixe — geralmente a página do produto do ERP, o site do integrador ou a notícia que gerou o lead. Clique para abrir na tela de chamada.")}</Field>
              <Field name="Telefone">{t("Telefone comercial da empresa, exibido na máscara (XX) XXXXX-XXXX. Se o agente não encontrar, aparece \"capturar manualmente\" na tela de chamada.")}</Field>
              <Field name="Site">{t("URL do site institucional, pronta para copiar e colar no navegador. Se o agente não encontrar, aparece \"capturar manualmente\".")}</Field>
              <Field name="CNPJ">{t("Número do CNPJ da empresa, confirmado na Receita Federal. Garante que é uma empresa real e ativa.")}</Field>
              <Field name="Segmento / CNAE">{t("Setor econômico e código CNAE da empresa. Útil para relatórios por setor.")}</Field>
              <Field name="Porte">{t("Tamanho da empresa: MEI, ME, EPP, médio, grande. Indica o ticket potencial e o processo de decisão esperado.")}</Field>
              <Field name="Score">{t("Nota de 0 a 10 calculada pelo agente (veja seção Score). Quanto maior, mais urgente abordar.")}</Field>
              <Field name="Data de inclusão">{t("Data em que o lead foi adicionado ao sistema. Gerada automaticamente.")}</Field>
              <Field name="Notas da ligação">{t("Campo livre para você registrar o que aconteceu em cada contato — objeções, nomes de pessoas, combinados, tom da conversa. Visível só na tela de chamada.")}</Field>
            </div>
          </Section>

          {/* Fluxo completo */}
          <Section id="fluxo" title={t("Fluxo completo — do zero ao fechamento")}>
            <div className="space-y-3">
              {[
                { step: '1', title: 'Pedir rodada', desc: 'Você clica em "+ Pedir rodada", escolhe cidades e segmentos e copia o comando. Cola no Claude Code aberto nesta pasta: ele pesquisa na web e adiciona os leads ao arquivo. Depois clique em "Atualizar lista".' },
                { step: '2', title: 'Revisar leads novos', desc: 'Filtre por "Data de inclusão" ou prioridade para ver o que chegou. Leia o campo "Por que faz sentido" e a fonte. Ajuste o responsável e a data do próximo passo.' },
                { step: '3', title: 'Trabalhar os P1 primeiro', desc: 'Filtre por Prioridade 1 + Status "A contatar". Clique em "Ligar" para abrir a tela de chamada com tudo que você precisa para a abordagem.' },
                { step: '4', title: 'Fazer o contato', desc: 'Use o canal sugerido (LinkedIn, e-mail, telefone). Durante ou depois da conversa, abra a tela de chamada e anote o resultado no campo "Notas da ligação".' },
                { step: '5', title: 'Atualizar o status', desc: 'Na tela de chamada, clique no botão do novo status (Contatado, Em conversa, Reunião marcada etc.). O sistema registra a data automaticamente.' },
                { step: '6', title: 'Rodar nova rodada', desc: 'A cada semana ou quando a fila "A contatar" estiver vazia, rode nova rodada — idealmente em uma região ou segmento diferente (o agente segue o rodízio Sul → Sudeste → Centro-Oeste → Nordeste → Norte).' },
                { step: '7', title: 'Exportar para relatório', desc: 'Use "Exportar CSV" para gerar a planilha com todos os campos. Útil para reuniões de pipeline ou para enviar ao time.' },
              ].map(s => (
                <div key={s.step} className="flex gap-4 bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4">
                  <div className="tema-fixo w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-bold flex items-center justify-center shrink-0 shadow-md shadow-blue-600/25">{s.step}</div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">{t(s.title)}</p>
                    <p className="text-sm text-gray-600">{t(s.desc)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* O agente */}
          <Section id="agente" title={t("O agente de IA — como ele pesquisa")}>
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5 space-y-4 text-sm text-gray-700">
              <p>{t("A pesquisa é feita pelo")} <strong>{t("Claude Code")}</strong>{t(", com o comando")} <code className="bg-gray-100 px-1 rounded">/rodada</code>{t(" e busca na web em tempo real — sem API paga. A cada rodada, ele:")}</p>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>{t("Recebe as cidades, os segmentos e a quantidade de leads que você escolheu em \"Pedir rodada\"")}</li>
                <li>{t("Faz buscas reais na web (sites de empresas, diretórios B2B, portais de associações, vagas de emprego)")}</li>
                <li>{t("Qualifica cada empresa encontrada usando os critérios de score")}</li>
                <li>{t("Verifica se a empresa já está no sistema para não duplicar")}</li>
                <li>{t("Gera o CSV estruturado com todos os campos preenchidos")}</li>
                <li>{t("Grava os leads novos no arquivo de leads do projeto")}</li>
              </ol>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="font-medium text-amber-800 mb-1">{t("Regras de qualidade que o agente segue:")}</p>
                <ul className="list-disc list-inside space-y-1 text-amber-700">
                  <li>{t("Não inventa nada — todo dado tem uma URL de fonte")}</li>
                  <li>{t("Diferencia \"Evidência:\" (visto na fonte) de \"Hipótese:\" (inferência)")}</li>
                  <li>{t("Respeita a LGPD — registra apenas dados públicos e institucionais, nunca CPF, celular pessoal ou e-mail pessoal")}</li>
                  <li>{t("Meta: a quantidade pedida na rodada (padrão 10), pelo menos 3 com Prioridade 1 ou 2")}</li>
                  <li>{t("Busca telefone comercial e site institucional de cada empresa (quando não acha, marca para captura manual)")}</li>
                </ul>
              </div>
              <p className="text-gray-500 text-xs">{t("Onde os dados ficam: no site publicado, os leads são guardados num banco de dados na nuvem (Redis, na Vercel). Rodando o sistema no seu computador, ficam no arquivo")} <code className="bg-gray-100 px-1 rounded">data/leads.json</code>{t(". O comando /rodada grava nesse arquivo local.")}</p>
            </div>
          </Section>

        </main>
      </div>
    </div>
  );
}
