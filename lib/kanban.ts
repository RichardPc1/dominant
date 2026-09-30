import { Chamada, Coluna, Lead, ResultadoChamada } from './types';

export interface ColunaDef {
  id: Coluna;
  titulo: string;
  icone: string;
  dica: string;
  /** classes tailwind do cabeçalho e da faixa do card */
  header: string;
  faixa: string;
}

export const COLUNAS: ColunaDef[] = [
  { id: 'ligar', titulo: 'Ligar', icone: '📞', dica: 'Ligação com dia/hora marcados', header: 'bg-blue-600 text-white', faixa: 'border-l-blue-500' },
  { id: 'tentar', titulo: 'Tentar de novo', icone: '🔁', dica: 'Não atendeu / caixa postal', header: 'bg-amber-500 text-white', faixa: 'border-l-amber-400' },
  { id: 'email', titulo: 'Enviar e-mail', icone: '✉️', dica: 'Pediram e-mail', header: 'bg-emerald-600 text-white', faixa: 'border-l-emerald-500' },
  { id: 'whatsapp', titulo: 'Mandar WhatsApp', icone: '💬', dica: 'Pediram WhatsApp / mensagem', header: 'bg-green-600 text-white', faixa: 'border-l-green-500' },
  { id: 'aguardando', titulo: 'Aguardando retorno', icone: '⏳', dica: 'Bola com eles', header: 'bg-cyan-600 text-white', faixa: 'border-l-cyan-500' },
  { id: 'avancado', titulo: 'Reunião / proposta', icone: '🤝', dica: 'Evoluiu de verdade', header: 'bg-indigo-600 text-white', faixa: 'border-l-indigo-500' },
  { id: 'pesquisar', titulo: 'Achar contato', icone: '🔎', dica: 'Número errado ou sem telefone', header: 'bg-orange-500 text-white', faixa: 'border-l-orange-400' },
  { id: 'novos', titulo: 'Novos (nunca ligados)', icone: '🆕', dica: 'Base ainda não trabalhada', header: 'bg-slate-600 text-white', faixa: 'border-l-slate-400' },
  { id: 'pausados', titulo: 'Pausados', icone: '⏸️', dica: 'Fora de foco por enquanto', header: 'bg-gray-400 text-white', faixa: 'border-l-gray-300' },
  { id: 'descartados', titulo: 'Sem interesse', icone: '❌', dica: 'Morreram', header: 'bg-red-500 text-white', faixa: 'border-l-red-400' },
];

const STATUS_AVANCADO = ['Reunião marcada', 'Proposta enviada', 'Piloto', 'Parceiro ativo'];

export function ultimaChamada(lead: Lead): Chamada | undefined {
  const cs = lead.chamadas ?? [];
  return cs[cs.length - 1];
}

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:[.,][\w-]+)+/;

/** Primeiro e-mail encontrado nas notas (da ligação mais recente pra trás). Corrige "a@b,com,br". */
export function extrairEmail(lead: Lead): string {
  const fontes = [...(lead.chamadas ?? [])].reverse().map(c => c.notas).concat(lead.notasLigacao ?? '');
  for (const t of fontes) {
    const m = (t ?? '').match(EMAIL_RE);
    if (m) return m[0].replace(/,/g, '.');
  }
  return '';
}

function pedeContatoEscrito(notas: string): boolean {
  return EMAIL_RE.test(notas) || /e-?mail|whats/i.test(notas);
}

/** Coluna sugerida a partir do resultado (e notas) de uma ligação recém-registrada. */
export function colunaPorChamada(resultado: ResultadoChamada, notas: string): Coluna {
  switch (resultado) {
    case 'Callback agendado': return 'ligar';
    case 'Atendeu':
      if (/whats/i.test(notas) && !EMAIL_RE.test(notas) && !/e-?mail/i.test(notas)) return 'whatsapp';
      return pedeContatoEscrito(notas) ? 'email' : 'aguardando';
    case 'Sem interesse': return 'descartados';
    case 'Número errado': return 'pesquisar';
    default: return 'tentar';
  }
}

/** Coluna efetiva: a escolhida manualmente ou, na falta dela, a derivada do histórico. */
export function colunaDe(lead: Lead): Coluna {
  if (lead.coluna) return lead.coluna;
  const ultima = ultimaChamada(lead);
  if (!ultima) {
    return lead.status === 'Pausado' || lead.status === 'Monitorar' ? 'pausados'
      : lead.status === 'Fechado' ? 'descartados'
      : 'novos';
  }
  if (STATUS_AVANCADO.includes(lead.status)) return 'avancado';
  return colunaPorChamada(ultima.resultado, ultima.notas ?? '');
}

/** Telefone utilizável: campo telefone, ou um número achado nas notas. */
export function telefoneDe(lead: Lead): string {
  const ok = (s: string) => (s || '').replace(/\D/g, '').length >= 8 && !/[a-z]{3,}/i.test(s);
  if (ok(lead.telefone)) return lead.telefone.trim();
  const m = (lead.notasLigacao ?? '').match(/\(?\d{2}\)?\s?\d{4,5}-?\d{4}|\b\d{4,5}-\d{4}\b/);
  return m ? m[0] : '';
}

/** Link wa.me para o telefone (assume Brasil, DDI 55). */
export function linkWhatsApp(fone: string): string {
  const d = fone.replace(/\D/g, '');
  if (d.length < 10) return '';
  return `https://wa.me/${d.length <= 11 ? '55' + d : d}`;
}

const HOJE_ISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function diasEntre(a: string, b: string): number {
  return Math.round((Date.parse(b + 'T00:00:00') - Date.parse(a + 'T00:00:00')) / 86400000);
}

const DIA_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export interface ChipAgenda {
  texto: string;
  classes: string;
  urgencia: number;
}

export function chipAgenda(lead: Lead): ChipAgenda | null {
  if (!lead.agendaData) return null;
  const d = diasEntre(HOJE_ISO(), lead.agendaData);
  const [, m, dia] = lead.agendaData.split('-');
  const hora = lead.agendaHora ? ` ${lead.agendaHora}` : '';
  const dow = DIA_SEMANA[new Date(lead.agendaData + 'T00:00:00').getDay()];
  if (d < 0) return { texto: `ATRASADO · ${dia}/${m}${hora}`, classes: 'bg-red-600 text-white', urgencia: 0 };
  if (d === 0) return { texto: `HOJE${hora}`, classes: 'bg-amber-400 text-amber-950', urgencia: 1 };
  if (d === 1) return { texto: `AMANHÃ${hora}`, classes: 'bg-blue-600 text-white', urgencia: 2 };
  if (d < 7) return { texto: `${dow.toUpperCase()} ${dia}/${m}${hora}`, classes: 'bg-sky-100 text-sky-800', urgencia: 3 };
  return { texto: `${dow} ${dia}/${m}${hora}`, classes: 'bg-gray-100 text-gray-700', urgencia: 4 };
}

function horaOrdenavel(h?: string): string {
  if (!h) return '99:99';
  if (/^\d{1,2}:\d{2}$/.test(h)) return h.padStart(5, '0');
  if (/cedo|manh/i.test(h)) return '08:00';
  if (/tarde/i.test(h)) return '14:00';
  return '12:00';
}

/** Ordena: com agenda primeiro (mais cedo antes), depois por score. */
export function compararNaColuna(a: Lead, b: Lead): number {
  if (a.agendaData && b.agendaData) {
    const c = (a.agendaData + horaOrdenavel(a.agendaHora)).localeCompare(b.agendaData + horaOrdenavel(b.agendaHora));
    if (c !== 0) return c;
  } else if (a.agendaData) return -1;
  else if (b.agendaData) return 1;
  return b.score - a.score;
}
