'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Coluna, Lead } from '@/lib/types';
import {
  BOARD, COLUNAS, GAVETA, GrupoBoard, MAX_SEM_RESPOSTA, chipAgenda, colunaDe, compararNaColuna, extrairEmail,
  linkWhatsApp, semRespostaSeguidas, telefoneDe, ultimaChamada,
} from '@/lib/kanban';
import { PriorityBadge } from '../components/Badges';

type FiltroLigacao = 'todos' | 'com' | 'sem';

const PASSO_FILA = 12;

function CopyBtn({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        navigator.clipboard?.writeText(value);
        setOk(true);
        setTimeout(() => setOk(false), 1200);
      }}
      className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500"
    >
      {ok ? '✓' : 'copiar'}
    </button>
  );
}

function Card({
  lead, coluna, onMove, onAgenda,
}: {
  lead: Lead;
  coluna: Coluna;
  onMove: (id: string, c: Coluna) => void;
  onAgenda: (id: string, data: string, hora: string) => void;
}) {
  const def = COLUNAS.find(c => c.id === coluna)!;
  const podeAgendar = coluna === 'ligar' || coluna === 'aguardando' || coluna === 'tentar';
  const chip = podeAgendar ? chipAgenda(lead) : null;
  const fone = telefoneDe(lead);
  const email = extrairEmail(lead) || lead.emails?.[0]?.endereco || '';
  const ult = ultimaChamada(lead);
  const nChamadas = (lead.chamadas ?? []).length;
  const semResp = semRespostaSeguidas(lead);
  const [editando, setEditando] = useState(false);
  const [data, setData] = useState(lead.agendaData ?? '');
  const [hora, setHora] = useState(lead.agendaHora ?? '');

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('text/plain', lead.id); e.dataTransfer.effectAllowed = 'move'; }}
      className={`bg-white border border-gray-200 border-l-4 ${def.faixa} rounded-lg p-3 shadow-sm hover:shadow cursor-grab active:cursor-grabbing`}
    >
      {chip && (
        <div className={`-mt-1 mb-2 inline-block rounded px-2 py-0.5 text-xs font-bold tracking-wide ${chip.classes}`}>
          🕒 {chip.texto}
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <Link href={`/call/${lead.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 leading-snug">
          {lead.nome}
        </Link>
        <PriorityBadge p={lead.prioridade} />
      </div>
      <p className="text-[11px] text-gray-400 mt-0.5">{lead.categoria}{lead.localizacao ? ` · ${lead.localizacao}` : ''}</p>

      {fone ? (
        <div className="mt-1.5 flex items-center gap-1.5">
          <a href={`tel:${fone.replace(/\D/g, '')}`} className="text-sm font-medium text-blue-700 hover:underline">📞 {fone}</a>
          <CopyBtn value={fone} />
          {linkWhatsApp(fone) && (
            <a href={linkWhatsApp(fone)} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-green-100 hover:bg-green-200 text-green-800 font-semibold">💬 WhatsApp</a>
          )}
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-orange-600">sem telefone cadastrado</p>
      )}

      {email && (
        <div className="mt-1 flex items-center gap-1.5">
          <a href={`mailto:${email}`} className="text-xs font-medium text-emerald-700 hover:underline break-all">✉️ {email}</a>
          <CopyBtn value={email} />
        </div>
      )}

      {semResp >= 1 && coluna !== 'pausados' && (
        <p className={`mt-2 w-fit text-[11px] font-semibold rounded px-1.5 py-0.5 ${semResp >= 2 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
          📵 {semResp} ligaç{semResp > 1 ? 'ões' : 'ão'} sem resposta{semResp >= 2 ? ' — tente por mensagem' : ''}
        </p>
      )}
      {semResp >= MAX_SEM_RESPOSTA && coluna === 'pausados' && (
        <p className="mt-2 w-fit text-[11px] font-semibold rounded px-1.5 py-0.5 bg-gray-200 text-gray-700">
          📵 {semResp} ligações sem resposta — fila esgotada
        </p>
      )}

      {lead.emailRascunho && (
        <span className={`mt-2 block w-fit text-[11px] font-semibold rounded px-1.5 py-0.5 ${lead.emailRascunho.status === 'pronto' ? 'bg-emerald-100 text-emerald-800' : lead.emailRascunho.status === 'enviado' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-800'}`}>
          {lead.emailRascunho.status === 'pronto' ? '✉️ rascunho pronto pra enviar' : lead.emailRascunho.status === 'enviado' ? '✉️ enviado' : '✉️ aguardando /emails'}
        </span>
      )}

      {ult?.notas && (
        <p className="mt-2 text-xs text-gray-700 bg-yellow-50 border border-yellow-100 rounded px-2 py-1 whitespace-pre-line line-clamp-3">
          {ult.notas}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-400">
        <span>{nChamadas && ult ? `${nChamadas}× · últ. ${ult.data.slice(0, 5)} ${ult.hora}` : 'nunca ligado'}</span>
        <select
          value={coluna}
          onChange={e => onMove(lead.id, e.target.value as Coluna)}
          className="text-[11px] text-gray-500 border border-gray-200 rounded px-1 py-0.5 bg-white max-w-28"
          title="Mover para..."
        >
          {COLUNAS.map(c => <option key={c.id} value={c.id}>{c.icone} {c.titulo}</option>)}
        </select>
      </div>

      {podeAgendar && (
        <div className="mt-2">
          {!editando ? (
            <button onClick={() => setEditando(true)} className="text-[11px] text-blue-600 hover:underline">
              📅 {lead.agendaData ? 'mudar data/hora' : 'marcar data/hora'}
            </button>
          ) : (
            <div className="flex items-center gap-1 flex-wrap">
              <input type="date" value={data} onChange={e => setData(e.target.value)} className="text-xs border border-gray-300 rounded px-1 py-0.5" />
              <input
                type="text" value={hora} onChange={e => setHora(e.target.value)} placeholder="09:30 ou tarde"
                className="text-xs border border-gray-300 rounded px-1 py-0.5 w-24"
              />
              <button
                onClick={() => { onAgenda(lead.id, data, hora); setEditando(false); }}
                className="text-xs bg-blue-600 text-white rounded px-2 py-0.5"
              >
                ok
              </button>
              <button onClick={() => setEditando(false)} className="text-xs text-gray-400">x</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ColunaBoard({
  grupo, leads, colunaDoLead, over, setOver, onDropLead, onMove, onAgenda, largura = 'w-80',
}: {
  grupo: GrupoBoard;
  leads: Lead[];
  colunaDoLead: Map<string, Coluna>;
  over: string | null;
  setOver: (id: string | null) => void;
  onDropLead: (id: string, grupo: GrupoBoard) => void;
  onMove: (id: string, c: Coluna) => void;
  onAgenda: (id: string, data: string, hora: string) => void;
  largura?: string;
}) {
  const [mostrar, setMostrar] = useState(grupo.limite ?? Infinity);
  const visiveis = leads.slice(0, mostrar);
  return (
    <section
      onDragOver={e => { e.preventDefault(); setOver(grupo.id); }}
      onDragLeave={() => setOver(null)}
      onDrop={e => {
        e.preventDefault();
        setOver(null);
        const id = e.dataTransfer.getData('text/plain');
        if (id) onDropLead(id, grupo);
      }}
      className={`${largura} shrink-0 rounded-xl bg-gray-100 border ${over === grupo.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
    >
      <div className={`${grupo.header} rounded-t-xl px-3 py-2 flex items-center justify-between`} title={grupo.dica}>
        <h2 className="text-sm font-bold">{grupo.icone} {grupo.titulo}</h2>
        <span className="text-xs font-bold bg-white/25 rounded-full px-2 py-0.5">{leads.length}</span>
      </div>
      <p className="px-3 pt-2 text-[11px] text-gray-400 leading-snug">{grupo.dica}</p>
      <div className="p-2 space-y-2 max-h-[calc(100vh-11rem)] overflow-y-auto">
        {leads.length === 0 && <p className="text-xs text-gray-300 text-center py-4">vazio</p>}
        {visiveis.map(l => (
          <Card key={l.id} lead={l} coluna={colunaDoLead.get(l.id)!} onMove={onMove} onAgenda={onAgenda} />
        ))}
        {leads.length > visiveis.length && (
          <button
            onClick={() => setMostrar(m => m + PASSO_FILA)}
            className="w-full text-xs text-blue-600 hover:bg-white rounded-lg py-2 border border-dashed border-gray-300"
          >
            ver mais {Math.min(PASSO_FILA, leads.length - visiveis.length)} · faltam {leads.length - visiveis.length}
          </button>
        )}
      </div>
    </section>
  );
}

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [over, setOver] = useState<string | null>(null);
  const [filtroLigacao, setFiltroLigacao] = useState<FiltroLigacao>('todos');
  const [gavetaAberta, setGavetaAberta] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [atualizadoEm, setAtualizadoEm] = useState('');
  const [filtrosLidos, setFiltrosLidos] = useState(false);

  // filtros sobrevivem a recarregar a página (F5)
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const f = JSON.parse(localStorage.getItem('kanban-filtros') ?? '{}');
      if (typeof f.busca === 'string') setBusca(f.busca);
      if (f.ligacao === 'com' || f.ligacao === 'sem') setFiltroLigacao(f.ligacao);
      if (f.gaveta === true) setGavetaAberta(true);
    } catch {}
    setFiltrosLidos(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (!filtrosLidos) return;
    try { localStorage.setItem('kanban-filtros', JSON.stringify({ busca, ligacao: filtroLigacao, gaveta: gavetaAberta })); } catch {}
  }, [busca, filtroLigacao, gavetaAberta, filtrosLidos]);

  const carregar = useCallback(async () => {
    try {
      const d: Lead[] = await fetch('/api/leads', { cache: 'no-store' }).then(r => r.json());
      if (Array.isArray(d)) {
        setLeads(d);
        setAtualizadoEm(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    } catch {}
    setLoading(false);
    setAtualizando(false);
  }, []);

  const atualizarAgora = () => { setAtualizando(true); carregar(); };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  async function patch(id: string, updates: Partial<Lead>) {
    setLeads(prev => prev.map(l => (l.id === id ? { ...l, ...updates } : l)));
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }

  const move = (id: string, coluna: Coluna) => patch(id, { coluna });
  const agenda = (id: string, agendaData: string, agendaHora: string) => patch(id, { agendaData, agendaHora });

  // Soltar em "Mandar mensagem": e-mail se o lead tem e-mail, senão WhatsApp.
  const soltar = (id: string, grupo: GrupoBoard) => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return;
    const alvo = grupo.etapas.length > 1 && !extrairEmail(lead) && !(lead.emails ?? []).length ? 'whatsapp' : grupo.alvo;
    move(id, alvo);
  };

  const { porEtapa, colunaDoLead } = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const map = Object.fromEntries(COLUNAS.map(c => [c.id, [] as Lead[]])) as Record<Coluna, Lead[]>;
    const cols = new Map<string, Coluna>();
    for (const l of leads) {
      if (q && !l.nome.toLowerCase().includes(q)) continue;
      const temLigacao = (l.chamadas ?? []).length > 0;
      if (filtroLigacao === 'com' && !temLigacao) continue;
      if (filtroLigacao === 'sem' && temLigacao) continue;
      const c = colunaDe(l);
      cols.set(l.id, c);
      map[c].push(l);
    }
    for (const c of COLUNAS) map[c.id].sort(compararNaColuna);
    return { porEtapa: map, colunaDoLead: cols };
  }, [leads, busca, filtroLigacao]);

  const doGrupo = (g: GrupoBoard) => g.etapas.flatMap(e => porEtapa[e]).sort(compararNaColuna);

  const ligar = porEtapa.ligar;
  const atrasados = ligar.filter(l => chipAgenda(l)?.urgencia === 0).length;
  const hoje = ligar.filter(l => chipAgenda(l)?.urgencia === 1).length;
  const amanha = ligar.filter(l => chipAgenda(l)?.urgencia === 2).length;
  const foraDeJogo = GAVETA.reduce((n, g) => n + doGrupo(g).length, 0);

  const propsComuns = { colunaDoLead, over, setOver, onDropLead: soltar, onMove: move, onAgenda: agenda };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4 flex-wrap">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← Lista</Link>
        <h1 className="text-lg font-bold text-gray-900">Kanban de leads</h1>
        <div className="flex gap-2 text-xs font-semibold">
          {atrasados > 0 && <span className="bg-red-600 text-white rounded px-2 py-1">{atrasados} atrasado{atrasados > 1 ? 's' : ''}</span>}
          {hoje > 0 && <span className="bg-amber-400 text-amber-950 rounded px-2 py-1">{hoje} pra hoje</span>}
          {amanha > 0 && <span className="bg-blue-600 text-white rounded px-2 py-1">{amanha} pra amanhã</span>}
        </div>
        <select
          value={filtroLigacao} onChange={e => setFiltroLigacao(e.target.value as FiltroLigacao)}
          className={`ml-auto text-sm border rounded-lg px-2 py-1.5 outline-none bg-white ${filtroLigacao === 'todos' ? 'border-gray-300 text-gray-700' : 'border-blue-500 text-blue-700 font-semibold'}`}
          title="Filtrar por ligação registrada"
        >
          <option value="todos">Todos os leads</option>
          <option value="com">📞 Com ligação registrada</option>
          <option value="sem">🆕 Sem ligação ainda</option>
        </select>
        <button
          onClick={atualizarAgora} disabled={atualizando}
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-60"
          title={atualizadoEm ? `Atualizado às ${atualizadoEm}` : 'Atualizar'}
        >
          <span className={atualizando ? 'inline-block animate-spin' : 'inline-block'}>🔄</span> Atualizar{atualizadoEm && <span className="text-gray-400 text-xs"> · {atualizadoEm}</span>}
        </button>
        <input
          type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar empresa..."
          className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 w-56"
        />
      </header>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Carregando...</div>
      ) : (
        <div className="flex-1 overflow-x-auto p-4 space-y-4">
          <div className="flex gap-3 items-start min-w-max">
            {BOARD.map(g => <ColunaBoard key={g.id} grupo={g} leads={doGrupo(g)} {...propsComuns} />)}
          </div>

          <div>
            <button
              onClick={() => setGavetaAberta(a => !a)}
              className="text-sm text-gray-600 hover:text-gray-900 border border-gray-300 bg-white rounded-lg px-3 py-1.5"
            >
              {gavetaAberta ? '▼' : '▶'} Fora de jogo ({foraDeJogo}) — {GAVETA.map(g => `${g.titulo} ${doGrupo(g).length}`).join(' · ')}
            </button>
            {gavetaAberta && (
              <div className="flex gap-3 items-start min-w-max mt-3">
                {GAVETA.map(g => <ColunaBoard key={g.id} grupo={{ ...g, limite: 25 }} leads={doGrupo(g)} {...propsComuns} />)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
