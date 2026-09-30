import { Coluna, ResultadoChamada } from './types';

/** Ação automática disparada ao salvar a ligação com este resultado. */
export type AcaoAuto = 'nenhuma' | 'email' | 'agendar-ligacao' | 'agendar-reuniao';

export interface Outcome {
  id: string;
  emoji: string;
  label: string;
  proximaAcao: string;
  acao: AcaoAuto;
  /** coluna do kanban para onde o lead vai */
  coluna: Coluna;
  /** como o resultado entra no histórico simples de ligações */
  resultadoChamada: ResultadoChamada;
  /** frases (minúsculas, sem acento não é exigido) que indicam este resultado na transcrição */
  palavras: string[];
  /** cor de destaque (tailwind) */
  cor: string;
}

export interface OutcomesConfig {
  /** dias até o follow-up de um e-mail enviado */
  followUpDias: number;
  outcomes: Outcome[];
}

export const DEFAULT_CONFIG: OutcomesConfig = {
  followUpDias: 3,
  outcomes: [
    {
      id: 'reuniao', emoji: '🔥', label: 'Reunião combinada', proximaAcao: 'Criar compromisso',
      acao: 'agendar-reuniao', coluna: 'avancado', resultadoChamada: 'Atendeu', cor: 'bg-orange-600 text-white',
      palavras: ['marcar uma reunião', 'marcar reunião', 'agendar uma reunião', 'agendar reunião', 'vamos marcar', 'podemos marcar', 'reunião às', 'reunião amanhã', 'pode ser às', 'combinado', 'me manda o convite', 'fechado então'],
    },
    {
      id: 'interesse', emoji: '🟢', label: 'Interesse', proximaAcao: 'Tentar agendar reunião',
      acao: 'agendar-reuniao', coluna: 'avancado', resultadoChamada: 'Atendeu', cor: 'bg-green-600 text-white',
      palavras: ['tenho interesse', 'temos interesse', 'me interessa', 'interessante', 'gostei', 'como funciona', 'quanto custa', 'qual o valor', 'faz sentido', 'quero saber mais', 'me conta mais'],
    },
    {
      id: 'retorno', emoji: '🟠', label: 'Pediu retorno', proximaAcao: 'Agendar ligação',
      acao: 'agendar-ligacao', coluna: 'ligar', resultadoChamada: 'Callback agendado', cor: 'bg-amber-500 text-white',
      palavras: ['liga amanhã', 'ligue amanhã', 'ligar amanhã', 'liga mais tarde', 'ligue mais tarde', 'ligue depois', 'liga depois', 'volte a ligar', 'retorna', 'retornar', 'não está disponível', 'não se encontra', 'está em reunião', 'está em outra ligação', 'ligar às', 'liga às', 'ligue às'],
    },
    {
      id: 'pediu-email', emoji: '🟡', label: 'Pediu e-mail', proximaAcao: 'Enviar + follow-up automático',
      acao: 'email', coluna: 'email', resultadoChamada: 'Atendeu', cor: 'bg-yellow-400 text-yellow-950',
      palavras: ['manda por e-mail', 'manda por email', 'mande por e-mail', 'mande por email', 'envia por e-mail', 'envia por email', 'envie por e-mail', 'envie por email', 'manda no e-mail', 'manda um e-mail', 'mande um e-mail', 'mande um email', 'manda um email', 'enviar um e-mail', 'enviar um email', 'pode mandar', 'whatsapp', 'arroba'],
    },
    {
      id: 'sem-interesse', emoji: '🔴', label: 'Sem interesse', proximaAcao: 'Encerrar',
      acao: 'nenhuma', coluna: 'descartados', resultadoChamada: 'Sem interesse', cor: 'bg-red-600 text-white',
      palavras: ['não tenho interesse', 'não temos interesse', 'sem interesse', 'não precisamos', 'não precisa', 'não queremos', 'não obrigado', 'não é conosco', 'já temos', 'já possuímos', 'não trabalhamos com isso', 'pode tirar'],
    },
    {
      id: 'caixa-postal', emoji: '🟡', label: 'Caixa postal', proximaAcao: 'Tentar novamente',
      acao: 'nenhuma', coluna: 'tentar', resultadoChamada: 'Caixa postal', cor: 'bg-amber-400 text-amber-950',
      palavras: ['caixa postal', 'deixe sua mensagem', 'após o sinal', 'mensagem após', 'não está disponível no momento'],
    },
    {
      id: 'nao-atendeu', emoji: '🟡', label: 'Não atendeu', proximaAcao: 'Tentar novamente',
      acao: 'nenhuma', coluna: 'tentar', resultadoChamada: 'Não atendeu', cor: 'bg-amber-400 text-amber-950',
      palavras: [],
    },
    {
      id: 'numero-invalido', emoji: '⚫', label: 'Número inválido', proximaAcao: 'Corrigir/enriquecer lead',
      acao: 'nenhuma', coluna: 'pesquisar', resultadoChamada: 'Número errado', cor: 'bg-gray-700 text-white',
      palavras: ['número não existe', 'número inexistente', 'não é possível completar', 'número errado', 'não pertence', 'foi desligado', 'número inválido', 'engano'],
    },
  ],
};

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Escolhe o resultado mais provável pela transcrição. Vence quem tiver mais frases batendo;
 * empate é resolvido pela ordem da lista (a lista vai do mais quente pro mais frio).
 * Sem transcrição útil: "Não atendeu".
 */
export function classificar(transcricao: string, cfg: OutcomesConfig): { outcome: Outcome; acertos: string[] } {
  const texto = norm(transcricao);
  const fallback = cfg.outcomes.find(o => o.id === 'nao-atendeu') ?? cfg.outcomes[cfg.outcomes.length - 1];
  if (texto.trim().split(/\s+/).length < 4) return { outcome: fallback, acertos: [] };
  let melhor: { outcome: Outcome; acertos: string[] } | null = null;
  // Negativas ("não temos interesse") são tiradas do texto antes dos outros testes,
  // senão "temos interesse" dentro delas contaria como interesse.
  const neg = cfg.outcomes.find(o => o.id === "sem-interesse");
  let sobra = texto;
  for (const p of neg?.palavras ?? []) sobra = sobra.split(norm(p)).join(" ");
  for (const o of cfg.outcomes) {
    const base = o.id === "sem-interesse" ? texto : sobra;
    const acertos = o.palavras.filter(p => base.includes(norm(p)));
    if (acertos.length && (!melhor || acertos.length > melhor.acertos.length)) melhor = { outcome: o, acertos };
  }
  // Conversa longa sem nenhuma frase-chave: houve conversa, então não é "não atendeu".
  return melhor ?? { outcome: cfg.outcomes.find(o => o.id === 'interesse') ?? fallback, acertos: [] };
}

const DIAS = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function somarDias(base: Date, n: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return iso(d);
}

/** Tenta ler "amanhã", "segunda", "às 14h30" etc. da transcrição. Devolve só o que achou. */
export function sugerirAgenda(transcricao: string, hoje = new Date()): { data?: string; hora?: string } {
  const t = norm(transcricao);
  const r: { data?: string; hora?: string } = {};
  const h = t.match(/as (\d{1,2})(?:[:h](\d{2}))?\s*(?:h|horas)?/);
  if (h && Number(h[1]) <= 23) r.hora = `${h[1].padStart(2, '0')}:${h[2] ?? '00'}`;
  if (/depois de amanha/.test(t)) r.data = somarDias(hoje, 2);
  else if (/amanha/.test(t)) r.data = somarDias(hoje, 1);
  else {
    for (let i = 1; i < DIAS.length + 1; i++) {
      const idx = i % 7;
      if (new RegExp(`\\b${DIAS[idx]}`).test(t)) {
        const delta = (idx - hoje.getDay() + 7) % 7 || 7;
        r.data = somarDias(hoje, delta);
        break;
      }
    }
  }
  if (!r.hora) {
    if (/de manha|cedo/.test(t)) r.hora = 'cedo';
    else if (/a tarde|de tarde/.test(t)) r.hora = 'tarde';
  }
  return r;
}

/** Gera um arquivo .ics (evento de 30 min) para abrir no Google Calendar/Outlook. */
export function gerarIcs(titulo: string, data: string, hora: string, descricao: string): string {
  const [y, m, d] = data.split('-').map(Number);
  const [hh, mm] = /^\d{1,2}:\d{2}$/.test(hora) ? hora.split(':').map(Number) : [10, 0];
  const p = (n: number) => String(n).padStart(2, '0');
  const ini = `${y}${p(m)}${p(d)}T${p(hh)}${p(mm)}00`;
  const fimDate = new Date(y, m - 1, d, hh, mm + 30);
  const fim = `${fimDate.getFullYear()}${p(fimDate.getMonth() + 1)}${p(fimDate.getDate())}T${p(fimDate.getHours())}${p(fimDate.getMinutes())}00`;
  const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, m2 => '\\' + m2);
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Dominant//Prospeccao//PT', 'BEGIN:VEVENT',
    `UID:${Date.now()}@dominant`, `DTSTAMP:${ini}`, `DTSTART:${ini}`, `DTEND:${fim}`,
    `SUMMARY:${esc(titulo)}`, `DESCRIPTION:${esc(descricao)}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
}
