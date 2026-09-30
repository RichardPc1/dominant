export type Categoria =
  | 'ERP / PCP'
  | 'Integrador de automação'
  | 'Fabricante de máquinas'
  | 'Cliente direto'
  | 'Automação RPA'
  | 'Polo / Associação'
  | 'Programa / Fomento'
  | 'Concorrente';

export type Prioridade = '1' | '2' | '3';

export type Status =
  | 'A contatar'
  | 'A pesquisar'
  | 'Pausado'
  | 'Monitorar'
  | 'Contatado'
  | 'Em conversa'
  | 'Reunião marcada'
  | 'Proposta enviada'
  | 'Piloto'
  | 'Parceiro ativo'
  | 'Fechado';

export type ResultadoChamada =
  | 'Atendeu'
  | 'Não atendeu'
  | 'Caixa postal'
  | 'Callback agendado'
  | 'Sem interesse'
  | 'Número errado';

export type Coluna =
  | "ligar"
  | "tentar"
  | "email"
  | "whatsapp"
  | "aguardando"
  | "avancado"
  | "pesquisar"
  | "novos"
  | "pausados"
  | "descartados";

export interface EmailRascunho {
  status: "pendente" | "pronto" | "enviado";
  para: string;
  assunto: string;
  corpo: string;
  /** Contexto da conversa que originou o e-mail (transcrição/notas), lido pelo /emails. */
  contexto: string;
  atualizadoEm: string;
}

export interface Chamada {
  id: string;
  data: string;
  hora: string;
  resultado: ResultadoChamada;
  notas: string;
  /** Transcrição da conversa (captura ao vivo no navegador). */
  transcricao?: string;
  /** id do resultado detalhado (lib/outcomes.ts), ex.: "pediu-email". */
  classificacao?: string;
}

export interface Lead {
  id: string;
  nome: string;
  categoria: Categoria;
  localizacao: string;
  perfil: string;
  porqueFazSentido: string;
  contato: string;
  prioridade: Prioridade;
  status: Status;
  proximoPasso: string;
  responsavel: string;
  dataProxPasso: string;
  ultimaInteracao: string;
  observacoes: string;
  fonte: string;
  telefone: string;
  site: string;
  cnpj: string;
  segmento: string;
  porte: string;
  score: number;
  dataInclusao: string;
  notasLigacao: string;
  chamadas: Chamada[];
  /** Coluna do kanban escolhida manualmente; se ausente, é derivada do histórico (lib/kanban.ts). */
  coluna?: Coluna;
  /** Data do próximo contato (YYYY-MM-DD). */
  agendaData?: string;
  /** Hora do próximo contato: "09:30" ou texto livre ("cedo", "tarde"). */
  agendaHora?: string;
  /** E-mail personalizado para este lead (escrito pelo Claude Code via /emails). */
  emailRascunho?: EmailRascunho;
  /** Data de follow-up do e-mail enviado (YYYY-MM-DD). */
  followUpEm?: string;
  createdAt: string;
  updatedAt: string;
}
