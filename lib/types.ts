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

export interface Chamada {
  id: string;
  data: string;
  hora: string;
  resultado: ResultadoChamada;
  notas: string;
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
  createdAt: string;
  updatedAt: string;
}
