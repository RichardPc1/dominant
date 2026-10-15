import {
  EstadoEvento, Evento, EtapaFunil, Lado, Lead, Reuniao, StatusReuniao, TipoReuniao,
} from './types';
import { t } from './i18n';

/**
 * Funil de clientes — camada paralela ao kanban (pós-prospecção).
 *
 * REGRA DE OURO: nada aqui escreve `coluna` nem `status` do lead. O funil é
 * dono apenas de `etapaFunil` e `timeline`. Assim um cliente NUNCA é movido
 * da coluna onde você o deixou no kanban. Os dois quadros são independentes e
 * leem o MESMO lead — não existe cadastro duplicado.
 *
 * A unidade de acompanhamento é o EVENTO (lib/types → Evento): reunião, tarefa,
 * pendência ou nota, tudo numa linha do tempo só. Reunião virou um tipo de
 * evento. As funções de reunião abaixo passaram a derivar da timeline, então a
 * tela não muda — só ganhou o resto.
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
  /** cor sólida (hex) — usada no mapa/graph view */
  cor: string;
  /** true = desfecho (ganho ou perdido): coluna fica "fora do fluxo" */
  desfecho?: boolean;
}

export const ETAPAS: EtapaDef[] = [
  { id: 'poc-marcada',      titulo: 'POC marcada',         icone: '🎯', dica: 'Reunião de POC agendada',            header: 'from-sky-500 to-sky-600',       faixa: 'border-l-sky-500',     selo: 'bg-sky-100 text-sky-800',         cor: '#0ea5e9' },
  { id: 'poc-feita',        titulo: 'POC feita',           icone: '🧪', dica: 'Demonstrou; marcar a proposta',      header: 'from-violet-500 to-violet-600', faixa: 'border-l-violet-500',  selo: 'bg-violet-100 text-violet-800',   cor: '#8b5cf6' },
  { id: 'reuniao-proposta', titulo: 'Reunião de proposta', icone: '📋', dica: 'Mapeando o processo do cliente',     header: 'from-indigo-500 to-indigo-600', faixa: 'border-l-indigo-500',  selo: 'bg-indigo-100 text-indigo-800',   cor: '#6366f1' },
  { id: 'proposta-enviada', titulo: 'Proposta enviada',    icone: '📄', dica: 'Proposta enviada, em negociação',    header: 'from-purple-500 to-purple-600', faixa: 'border-l-purple-500',  selo: 'bg-purple-100 text-purple-800',   cor: '#a855f7' },
  { id: 'cliente',          titulo: 'Cliente',             icone: '🏆', dica: 'Fechou — virou cliente',             header: 'from-emerald-500 to-emerald-600', faixa: 'border-l-emerald-500', selo: 'bg-emerald-100 text-emerald-800', cor: '#10b981', desfecho: true },
  { id: 'perdido',          titulo: 'Perdido',             icone: '💤', dica: 'Não fechou',                         header: 'from-gray-400 to-gray-500',     faixa: 'border-l-gray-300',    selo: 'bg-gray-200 text-gray-600',       cor: '#9ca3af', desfecho: true },
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
  return { etapaFunil: null as unknown as undefined, reunioes: [], timeline: [] };
}

// ---- Catálogos de reunião ---------------------------------------------------

export const TIPOS_REUNIAO: TipoReuniao[] = ['Apresentação', 'POC', 'Proposta', 'Follow-up', 'Outra'];

export const STATUS_REUNIAO: StatusReuniao[] = ['Agendada', 'Realizada', 'Não compareceu', 'Remarcada', 'Cancelada'];

export const STATUS_REUNIAO_COR: Record<StatusReuniao, string> = {
  'Agendada': 'bg-blue-100 text-blue-800',
  'Realizada': 'bg-emerald-100 text-emerald-800',
  'Não compareceu': 'bg-red-100 text-red-700',
  'Remarcada': 'bg-amber-100 text-amber-800',
  'Cancelada': 'bg-gray-100 text-gray-500',
};

/** Tipo de reunião = nome livre + emoji. Estes são só o ponto de partida do dropdown. */
export interface TipoReuniaoDef { rotulo: string; icone: string }

export const PRESETS_REUNIAO: TipoReuniaoDef[] = [
  { rotulo: 'Apresentação', icone: '👋' },
  { rotulo: 'POC',          icone: '🧪' },
  { rotulo: 'Proposta',     icone: '📋' },
  { rotulo: 'Follow-up',    icone: '🔁' },
  { rotulo: 'Reunião',      icone: '🤝' },
];

const ICONE_PRESET: Record<string, string> = Object.fromEntries(PRESETS_REUNIAO.map(p => [p.rotulo, p.icone]));

/** Paleta do seletor de ícones — você escolhe o que combinar com a reunião. */
export const PALETA_ICONES: string[] = [
  '👋', '🧪', '📋', '📄', '🤝', '📞', '💬', '📧',
  '🎯', '🏆', '🚀', '🔁', '📎', '🗓️', '💡', '⚙️',
  '🛠️', '🤖', '📊', '💰', '🧩', '🏭', '🏢', '👀',
  '✅', '⏳', '⚠️', '🔥', '⭐', '📌', '🧾', '🗣️',
];

export const ICONE_TIPO_EVENTO: Record<string, string> = {
  reuniao: '🤝', tarefa: '✅', nota: '📝', marco: '🏁',
};

export const LADO_LABEL: Record<Lado, string> = { eu: 'Minha', cliente: 'Do cliente', ambos: 'Dos dois' };
export const LADO_COR: Record<Lado, string> = {
  eu: 'bg-blue-100 text-blue-800',
  cliente: 'bg-amber-100 text-amber-800',
  ambos: 'bg-violet-100 text-violet-800',
};

// ---- Timeline (eventos) -----------------------------------------------------

/** Converte uma reunião do formato antigo num evento da timeline. */
export function migrarReuniao(r: Reuniao): Evento {
  return {
    id: r.id,
    tipo: 'reuniao',
    titulo: r.tipo,
    rotulo: r.tipo,
    icone: ICONE_PRESET[r.tipo] ?? '🤝',
    data: r.data || undefined,
    hora: r.hora,
    statusReuniao: r.status,
    pauta: r.notas ? { assunto: r.notas } : undefined,
    estado: r.status === 'Realizada' ? 'feito' : r.status === 'Cancelada' ? 'cancelado' : 'aberto',
    criadoEm: r.registradaEm ?? new Date().toISOString(),
  };
}

/** A timeline do lead. Se ainda não migrou, deriva da lista antiga de reuniões. */
export function eventosDe(lead: Lead): Evento[] {
  if (lead.timeline) return lead.timeline;
  return (lead.reunioes ?? []).map(migrarReuniao);
}

/** true se o lead ainda guarda reuniões no formato legado (sem `timeline`). */
export function precisaMigrar(lead: Lead): boolean {
  return !lead.timeline && !!(lead.reunioes && lead.reunioes.length);
}

const hora2 = (h?: string) => (h && /^\d{1,2}:\d{2}$/.test(h) ? h.padStart(5, '0') : '99:99');

/** Instante efetivo do evento, pra ordenar (data+hora, ou o carimbo de criação). */
export function tempoEvento(ev: Evento): number {
  if (ev.data) return Date.parse(`${ev.data}T${hora2(ev.hora)}:00`);
  return Date.parse(ev.criadoEm) || 0;
}

/** Timeline ordenada do mais recente pro mais antigo. */
export function timelineOrdenada(lead: Lead): Evento[] {
  return [...eventosDe(lead)].sort((a, b) => tempoEvento(b) - tempoEvento(a));
}

export const ehReuniao = (ev: Evento) => ev.tipo === 'reuniao';
export const ehTarefa = (ev: Evento) => ev.tipo === 'tarefa';

export function reunioesDe(lead: Lead): Evento[] {
  return eventosDe(lead).filter(ehReuniao);
}

/** Tarefas/pendências em aberto. */
export function tarefasAbertas(lead: Lead): Evento[] {
  return eventosDe(lead).filter(ev => ev.tipo === 'tarefa' && ev.estado !== 'feito' && ev.estado !== 'cancelado');
}

export interface ContagemTarefas { minhas: number; doCliente: number; total: number }
export function contarTarefas(lead: Lead): ContagemTarefas {
  const ab = tarefasAbertas(lead);
  return {
    minhas: ab.filter(ev => ev.lado === 'eu' || ev.lado === 'ambos' || !ev.lado).length,
    doCliente: ab.filter(ev => ev.lado === 'cliente' || ev.lado === 'ambos').length,
    total: ab.length,
  };
}

/** Rótulos de reunião pra alimentar o dropdown: presets + os que você já usou. */
export function tiposReuniaoSugeridos(lead: Lead): TipoReuniaoDef[] {
  const vistos = new Map<string, TipoReuniaoDef>();
  for (const p of PRESETS_REUNIAO) vistos.set(p.rotulo.toLowerCase(), p);
  for (const ev of reunioesDe(lead)) {
    const rotulo = (ev.rotulo || ev.titulo || '').trim();
    if (rotulo && !vistos.has(rotulo.toLowerCase())) vistos.set(rotulo.toLowerCase(), { rotulo, icone: ev.icone || '🤝' });
  }
  return [...vistos.values()];
}

// ---- Resumos pro card -------------------------------------------------------

export interface ContagemReunioes {
  total: number;
  realizadas: number;
  faltou: number;
  agendadas: number;
}

export function contarReunioes(lead: Lead): ContagemReunioes {
  const rs = reunioesDe(lead);
  return {
    total: rs.length,
    realizadas: rs.filter(r => r.statusReuniao === 'Realizada').length,
    faltou: rs.filter(r => r.statusReuniao === 'Não compareceu').length,
    agendadas: rs.filter(r => r.statusReuniao === 'Agendada' || r.statusReuniao === 'Remarcada').length,
  };
}

/** Reunião futura mais próxima (agendada/remarcada). */
export function proximaReuniao(lead: Lead): Evento | undefined {
  return reunioesDe(lead)
    .filter(r => r.statusReuniao === 'Agendada' || r.statusReuniao === 'Remarcada')
    .sort((a, b) => tempoEvento(a) - tempoEvento(b))[0];
}

/** Última reunião registrada (ordem cronológica). */
export function ultimaReuniao(lead: Lead): Evento | undefined {
  return reunioesDe(lead).sort((a, b) => tempoEvento(a) - tempoEvento(b)).at(-1);
}

/** Evento mais recente da timeline (de qualquer tipo). */
export function ultimoEvento(lead: Lead): Evento | undefined {
  return timelineOrdenada(lead)[0];
}

/** Texto curto de um evento pro preview do card. */
export function previewEvento(ev: Evento): string {
  if (ev.tipo === 'reuniao') {
    return (ev.pauta?.assunto || ev.pauta?.acoes || ev.pauta?.contexto || ev.titulo || '').trim();
  }
  return (ev.titulo || ev.nota || '').trim();
}

// ---- Chip de agenda da reunião ----------------------------------------------

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
    const c = tempoEvento(ra) - tempoEvento(rb);
    if (c !== 0) return c;
  } else if (ra) return -1;
  else if (rb) return 1;
  return (b.score ?? 0) - (a.score ?? 0);
}

// ---- Fábricas de evento (usadas pela timeline e pela migração lazy) ---------

const novoId = () => Math.random().toString(36).slice(2);

export function novaReuniao(p: {
  rotulo: string; icone: string; data?: string; hora?: string;
  statusReuniao: StatusReuniao; pauta?: Evento['pauta'];
}): Evento {
  return {
    id: novoId(), tipo: 'reuniao', titulo: p.rotulo, rotulo: p.rotulo, icone: p.icone,
    data: p.data || undefined, hora: p.hora || undefined, statusReuniao: p.statusReuniao,
    pauta: p.pauta, estado: p.statusReuniao === 'Realizada' ? 'feito' : 'aberto',
    criadoEm: new Date().toISOString(),
  };
}

export function novaTarefa(p: { titulo: string; lado: Lado; prazo?: string; nota?: string; estado?: EstadoEvento }): Evento {
  return {
    id: novoId(), tipo: 'tarefa', titulo: p.titulo, lado: p.lado,
    prazo: p.prazo || undefined, nota: p.nota || undefined, data: p.prazo || undefined,
    estado: p.estado ?? 'aberto', criadoEm: new Date().toISOString(),
  };
}

export function novaNota(p: { titulo: string; nota?: string; data?: string }): Evento {
  return {
    id: novoId(), tipo: 'nota', titulo: p.titulo, nota: p.nota || undefined,
    data: p.data || HOJE_ISO(), criadoEm: new Date().toISOString(),
  };
}
