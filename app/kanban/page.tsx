'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Coluna, Lead } from '@/lib/types';
import {
  COLUNAS, chipAgenda, colunaDe, compararNaColuna, extrairEmail, linkWhatsApp, telefoneDe, ultimaChamada,
} from '@/lib/kanban';
import { PriorityBadge } from '../components/Badges';

type FiltroLigacao = 'todos' | 'com' | 'sem';

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
  const chip = coluna === 'ligar' || coluna === 'aguardando' || coluna === 'tentar' ? chipAgenda(lead) : null;
  const fone = telefoneDe(lead);
  const email = extrairEmail(lead);
  const ult = ultimaChamada(lead);
  const nChamadas = (lead.chamadas ?? []).length;
  const [editando, setEditando] = useState(false);
  const [data, setData] = useState(lead.agendaData ?? '');
  const [hora, setHora] = useState(lead.agendaHora ?? '');
  const podeAgendar = coluna === 'ligar' || coluna === 'aguardando' || coluna === 'tentar';

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

      {lead.emailRascunho && (
        <span className={`mt-2 inline-block text-[11px] font-semibold rounded px-1.5 py-0.5 ${lead.emailRascunho.status === 'pronto' ? 'bg-emerald-100 text-emerald-800' : lead.emailRascunho.status === 'enviado' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-800'}`}>
          {lead.emailRascunho.status === 'pronto' ? '✉️ rascunho pronto pra enviar' : lead.emailRascunho.status === 'enviado' ? '✉️ enviado' : '✉️ aguardando /emails'}
        </span>
      )}

      {ult?.notas && (
        <p className="mt-2 text-xs text-gray-700 bg-yellow-50 border border-yellow-100 rounded px-2 py-1 whitespace-pre-line line-clamp-4">
          {ult.notas}
        </p>
      )}

      <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-gray-400">
        <span>{nChamadas ? `${nChamadas} ligaç${nChamadas > 1 ? 'ões' : 'ão'}${ult ? ` · últ. ${ult.data.slice(0, 5)} ${ult.hora}` : ''}` : 'nunca ligado'} · {lead.score} pts</span>
        <select
          value={coluna}
          onChange={e => onMove(lead.id, e.target.value as Coluna)}
          className="text-[11px] text-gray-500 border border-gray-200 rounded px-1 py-0.5 bg-white max-w-24"
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

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [over, setOver] = useState<Coluna | null>(null);
  const [filtroLigacao, setFiltroLigacao] = useState<FiltroLigacao>('todos');
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
    } catch {}
    setFiltrosLidos(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (!filtrosLidos) return;
    try { localStorage.setItem('kanban-filtros', JSON.stringify({ busca, ligacao: filtroLigacao })); } catch {}
  }, [busca, filtroLigacao, filtrosLidos]);

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
    // atualiza sozinho para enxergar o que os sócios mexeram
    const t = setInterval(() => { if (!document.hidden) carregar(); }, 8000);
    return () => clearInterval(t);
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

  const porColuna = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const map = Object.fromEntries(COLUNAS.map(c => [c.id, [] as Lead[]])) as Record<Coluna, Lead[]>;
    for (const l of leads) {
      if (q && !l.nome.toLowerCase().includes(q)) continue;
      const temLigacao = (l.chamadas ?? []).length > 0;
      if (filtroLigacao === 'com' && !temLigacao) continue;
      if (filtroLigacao === 'sem' && temLigacao) continue;
      map[colunaDe(l)].push(l);
    }
    for (const c of COLUNAS) map[c.id].sort(compararNaColuna);
    return map;
  }, [leads, busca, filtroLigacao]);

  const atrasados = porColuna.ligar.filter(l => chipAgenda(l)?.urgencia === 0).length;
  const hoje = porColuna.ligar.filter(l => chipAgenda(l)?.urgencia === 1).length;
  const amanha = porColuna.ligar.filter(l => chipAgenda(l)?.urgencia === 2).length;

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
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-3 items-start min-w-max">
            {COLUNAS.map(col => (
              <section
                key={col.id}
                onDragOver={e => { e.preventDefault(); setOver(col.id); }}
                onDragLeave={() => setOver(o => (o === col.id ? null : o))}
                onDrop={e => {
                  e.preventDefault();
                  setOver(null);
                  const id = e.dataTransfer.getData('text/plain');
                  if (id) move(id, col.id);
                }}
                className={`w-80 shrink-0 rounded-xl bg-gray-100 border ${over === col.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'}`}
              >
                <div className={`${col.header} rounded-t-xl px-3 py-2 flex items-center justify-between`} title={col.dica}>
                  <h2 className="text-sm font-bold">{col.icone} {col.titulo}</h2>
                  <span className="text-xs font-bold bg-white/25 rounded-full px-2 py-0.5">{porColuna[col.id].length}</span>
                </div>
                <div className="p-2 space-y-2 max-h-[calc(100vh-9rem)] overflow-y-auto">
                  {porColuna[col.id].length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">{col.dica}</p>
                  )}
                  {porColuna[col.id].map(l => (
                    <Card key={l.id} lead={l} coluna={col.id} onMove={move} onAgenda={agenda} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
