import { EtapaFunil, Lead, Reuniao, StatusReuniao, TipoReuniao } from './types';
import { t } from './i18n';

/**
 * Funil de clientes — camada paralela ao kanban (pós-prospecção).
 *
 * REGRA DE OURO: nada aqui escreve `coluna` nem `status` do lead. O funil é
 * dono apenas de `etapaFunil` e `reunioes`. Assim um cliente NUNCA é movido
 * da coluna onde você o deixou no kanban. Os dois quadros são independentes e
 * leem o MESMO lead — não existe cadastro duplicado.
 */

export interface EtapaDef {
  id: EtapaFunil;
  titulo: string;
  icone: string;
  dica: string;
  /** gradiente do cabeçalho da coluna */
  header: string;
  /** cor da faixa lateral do card */
  faixa: string;
  /** cor do selo/texto da fase */
  selo: string;
  /** true = desfecho (ganho ou perdido): coluna fica "fora do fluxo" */
  desfecho?: boolean;
}

export const ETAPAS: EtapaDef[] = [
  { id: 'poc-marcada',      titulo: 'POC marcada',         icone: '🎯', dica: 'Reunião de POC agendada',            header: 'from-sky-500 to-sky-600',       faixa: 'border-l-sky-500',     selo: 'bg-sky-100 text-sky-800' },
  { id: 'poc-feita',        titulo: 'POC feita',           icone: '🧪', dica: 'Demonstrou; marcar a proposta',      header: 'from-violet-500 to-violet-600', faixa: 'border-l-violet-500',  selo: 'bg-violet-100 text-violet-800' },
  { id: 'reuniao-proposta', titulo: 'Reunião de proposta', icone: '📋', dica: 'Mapeando o processo do cliente',     header: 'from-indigo-500 to-indigo-600', faixa: 'border-l-indigo-500',  selo: 'bg-indigo-100 text-indigo-800' },
  { id: 'proposta-enviada', titulo: 'Proposta enviada',    icone: '📄', dica: 'Proposta enviada, em negociação',    header: 'from-purple-500 to-purple-600', faixa: 'border-l-purple-500',  selo: 'bg-purple-100 text-purple-800' },
  { id: 'cliente',          titulo: 'Cliente',             icone: '🏆', dica: 'Fechou — virou cliente',             header: 'from-emerald-500 to-emerald-600', faixa: 'border-l-emerald-500', selo: 'bg-emerald-100 text-emerald-800', desfecho: true },
  { id: 'perdido',          titulo: 'Perdido',             icone: '💤', dica: 'Não fechou',                         header: 'from-gray-400 to-gray-500',     faixa: 'border-l-gray-300',    selo: 'bg-gray-200 text-gray-600', desfecho: true },
];

export const ETAPA_ENTRADA: EtapaFunil = 'poc-marcada';

export function etapaDef(id: EtapaFunil): EtapaDef {
  return ETAPAS.find(e => e.id === id) ?? ETAPAS[0];
}

/** Está no funil de clientes? Decidido SÓ por `etapaFunil` — sem olhar o kanban. */
export function estaNoFunil(lead: Lead): boolean {
  return !!lead.etapaFunil;
}

/**
 * Campos a gravar ao mover um lead para uma etapa do funil.
 * Devolve APENAS `etapaFunil` — de propósito, pra não encostar no kanban.
 */
export function patchParaEtapa(etapa: EtapaFunil): Partial<Lead> {
  return { etapaFunil: etapa };
}

/**
 * Patch para tirar o lead do funil (volta a ser só um lead do kanban).
 * Usa `null` (e não `undefined`): JSON.stringify descarta `undefined`, então o
 * PATCH nunca limparia o campo. `null` é falsy → estaNoFunil volta a ser false.
 */
export function patchSairDoFunil(): Partial<Lead> {
  return { etapaFunil: null as unknown as undefined, reunioes: [] };
}

// ---- Reuniões ---------------------------------------------------------------

export const TIPOS_REUNIAO: TipoReuniao[] = ['POC', 'Proposta', 'Follow-up', 'Outra'];

export const STATUS_REUNIAO: StatusReuniao[] = ['Agendada', 'Realizada', 'Não compareceu', 'Remarcada', 'Cancelada'];

export const TIPO_REUNIAO_ICONE: Record<TipoReuniao, string> = {
  'POC': '🧪', 'Proposta': '📋', 'Follow-up': '🔁', 'Outra': '📎',
};

export const STATUS_REUNIAO_COR: Record<StatusReuniao, string> = {
  'Agendada': 'bg-blue-100 text-blue-800',
  'Realizada': 'bg-emerald-100 text-emerald-800',
  'Não compareceu': 'bg-red-100 text-red-700',
  'Remarcada': 'bg-amber-100 text-amber-800',
  'Cancelada': 'bg-gray-100 text-gray-500',
};

export interface ContagemReunioes {
  total: number;
  realizadas: number;
  faltou: number;
  agendadas: number;
}

export function contarReunioes(lead: Lead): ContagemReunioes {
  const rs = lead.reunioes ?? [];
  return {
    total: rs.length,
    realizadas: rs.filter(r => r.status === 'Realizada').length,
    faltou: rs.filter(r => r.status === 'Não compareceu').length,
    agendadas: rs.filter(r => r.status === 'Agendada' || r.status === 'Remarcada').length,
  };
}

const chave = (r: Reuniao) => `${r.data}T${(r.hora && /^\d{1,2}:\d{2}$/.test(r.hora) ? r.hora.padStart(5, '0') : '99:99')}`;

/** Reunião futura mais próxima (agendada/remarcada). */
export function proximaReuniao(lead: Lead): Reuniao | undefined {
  return (lead.reunioes ?? [])
    .filter(r => r.status === 'Agendada' || r.status === 'Remarcada')
    .sort((a, b) => chave(a).localeCompare(chave(b)))[0];
}

/** Última reunião registrada (ordem cronológica). */
export function ultimaReuniao(lead: Lead): Reuniao | undefined {
  return [...(lead.reunioes ?? [])].sort((a, b) => chave(a).localeCompare(chave(b))).at(-1);
}

// ---- Chip de agenda da reunião (reaproveita a ideia do kanban) --------------

const HOJE_ISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const DIA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00') - Date.parse(a + 'T00:00:00')) / 86400000);
}

export interface ChipReuniao {
  texto: string;
  classes: string;
  urgencia: number;
}

/** Chip "quando é a próxima reunião", pros cards do funil. */
export function chipProximaReuniao(lead: Lead): ChipReuniao | null {
  const r = proximaReuniao(lead);
  if (!r?.data) return null;
  const d = diasEntre(HOJE_ISO(), r.data);
  const [, m, dia] = r.data.split('-');
  const hora = r.hora ? ` ${r.hora}` : '';
  const dow = DIA_SEMANA[new Date(r.data + 'T00:00:00').getDay()] ?? '';
  if (d < 0) return { texto: `${t('ATRASADA')} · ${dia}/${m}${hora}`, classes: 'bg-red-600 text-white', urgencia: 0 };
  if (d === 0) return { texto: `${t('HOJE')}${hora}`, classes: 'bg-amber-400 text-amber-950', urgencia: 1 };
  if (d === 1) return { texto: `${t('AMANHÃ')}${hora}`, classes: 'bg-blue-600 text-white', urgencia: 2 };
  if (d < 7) return { texto: `${t(dow).toUpperCase()} ${dia}/${m}${hora}`, classes: 'bg-sky-100 text-sky-800', urgencia: 3 };
  return { texto: `${t(dow)} ${dia}/${m}${hora}`, classes: 'bg-gray-100 text-gray-700', urgencia: 4 };
}

/** Ordena os cards dentro de uma coluna: próxima reunião primeiro, depois score. */
export function compararNoFunil(a: Lead, b: Lead): number {
  const ra = proximaReuniao(a), rb = proximaReuniao(b);
  if (ra && rb) {
    const c = chave(ra).localeCompare(chave(rb));
    if (c !== 0) return c;
  } else if (ra) return -1;
  else if (rb) return 1;
  return (b.score ?? 0) - (a.score ?? 0);
}
