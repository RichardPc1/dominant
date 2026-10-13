'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { EtapaFunil, Lead } from '@/lib/types';
import {
  ETAPAS, chipProximaReuniao, compararNoFunil, contarReunioes, estaNoFunil,
  etapaDef, patchParaEtapa, patchSairDoFunil, ultimaReuniao,
} from '@/lib/funil';
import FunilCliente from '../components/FunilCliente';
import { CategoriaBadge } from '../components/Badges';
import { guardarLeadsEmCache, leadsEmCache } from '@/lib/leads-cache';

function CopyBtn({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(value); setOk(true); setTimeout(() => setOk(false), 1200); }}
      className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500"
    >
      {ok ? '✓' : 'copiar'}
    </button>
  );
}

const soDigitos = (s: string) => (s || '').replace(/\D/g, '');

function CardFunil({
  lead, onAbrir, onMover,
}: {
  lead: Lead;
  onAbrir: () => void;
  onMover: (etapa: EtapaFunil) => void;
}) {
  const def = etapaDef(lead.etapaFunil!);
  const chip = chipProximaReuniao(lead);
  const cont = contarReunioes(lead);
  const ult = ultimaReuniao(lead);
  const fone = soDigitos(lead.telefone);
  const email = lead.emails?.[0]?.endereco ?? '';

  return (
    <div
      draggable
      onDragStart={e => { e.dataTransfer.setData('text/plain', lead.id); e.dataTransfer.effectAllowed = 'move'; }}
      onClick={onAbrir}
      className={`bg-white border border-gray-200 border-l-4 ${def.faixa} rounded-xl p-3 shadow-sm hover:shadow-md cursor-pointer transition-shadow`}
    >
      {chip && (
        <div className={`mb-2 inline-block rounded px-2 py-0.5 text-[11px] font-bold tracking-wide ${chip.classes}`}>
          🗓️ {chip.texto}
        </div>
      )}
      <p className="text-sm font-semibold text-gray-900 leading-snug">{lead.nome}</p>
      <p className="text-[11px] text-gray-400 mt-0.5">{lead.categoria}{lead.localizacao ? ` · ${lead.localizacao}` : ''}</p>

      <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
        {cont.realizadas > 0 && <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 font-semibold">✅ {cont.realizadas}</span>}
        {cont.faltou > 0 && <span className="rounded bg-red-100 text-red-700 px-1.5 py-0.5 font-semibold">❌ {cont.faltou}</span>}
        {cont.agendadas > 0 && <span className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 font-semibold">📅 {cont.agendadas}</span>}
        {cont.total === 0 && <span className="rounded bg-gray-100 text-gray-400 px-1.5 py-0.5">sem reunião</span>}
      </div>

      {ult?.notas && (
        <p className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-1 line-clamp-2">{ult.notas}</p>
      )}

      {(fone || email) && (
        <div className="mt-2 space-y-1" onClick={e => e.stopPropagation()}>
          {fone && (
            <div className="flex items-center gap-1.5">
              <a href={`tel:${fone}`} className="text-xs font-medium text-blue-700 hover:underline">📞 {lead.telefone}</a>
            </div>
          )}
          {email && (
            <div className="flex items-center gap-1.5">
              <a href={`mailto:${email}`} className="text-xs font-medium text-emerald-700 hover:underline break-all">✉️ {email}</a>
            </div>
          )}
        </div>
      )}

      {/* mover de fase no toque (sem drag) */}
      <div className="mt-2" onClick={e => e.stopPropagation()}>
        <select
          value={lead.etapaFunil}
          onChange={e => onMover(e.target.value as EtapaFunil)}
          className="w-full text-[11px] text-gray-500 border border-gray-200 rounded px-1.5 py-1 bg-white"
          title="Mudar de fase"
        >
          {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.icone} {e.titulo}</option>)}
        </select>
      </div>
    </div>
  );
}

function ColunaFunil({
  etapa, leads, over, setOver, onDrop, onAbrir, onMover,
}: {
  etapa: typeof ETAPAS[number];
  leads: Lead[];
  over: string | null;
  setOver: (id: string | null) => void;
  onDrop: (id: string, etapa: EtapaFunil) => void;
  onAbrir: (lead: Lead) => void;
  onMover: (id: string, etapa: EtapaFunil) => void;
}) {
  return (
    <section
      onDragOver={e => { e.preventDefault(); setOver(etapa.id); }}
      onDragLeave={() => setOver(null)}
      onDrop={e => { e.preventDefault(); setOver(null); const id = e.dataTransfer.getData('text/plain'); if (id) onDrop(id, etapa.id); }}
      className={`flex flex-col rounded-2xl bg-gray-100/70 border transition-colors ${over === etapa.id ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'}`}
    >
      <div className={`rounded-t-2xl px-3 py-2.5 bg-gradient-to-r ${etapa.header} text-white`}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold">{etapa.icone} {etapa.titulo}</h2>
          <span className="text-xs font-bold bg-white/25 rounded-full px-2 py-0.5">{leads.length}</span>
        </div>
        <p className="text-[11px] text-white/80 leading-snug mt-0.5">{etapa.dica}</p>
      </div>
      <div className="p-2 space-y-2 min-h-[6rem] lg:max-h-[calc(100vh-16rem)] lg:overflow-y-auto">
        {leads.length === 0 && <p className="text-xs text-gray-300 text-center py-6">vazio</p>}
        {leads.map(l => (
          <CardFunil key={l.id} lead={l} onAbrir={() => onAbrir(l)} onMover={e => onMover(l.id, e)} />
        ))}
      </div>
    </section>
  );
}

function Modal({ lead, onClose, onPatch, onSair }: {
  lead: Lead; onClose: () => void; onPatch: (u: Partial<Lead>) => void; onSair: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{lead.nome}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{[lead.localizacao, lead.segmento].filter(Boolean).join(' · ')}</p>
            <div className="mt-2"><CategoriaBadge c={lead.categoria} /></div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
        </div>

        <div className="p-5 space-y-4">
          {/* contato rápido */}
          {(lead.telefone || lead.emails?.[0]?.endereco || lead.contato) && (
            <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 space-y-1.5">
              {lead.telefone && (
                <div className="flex items-center gap-2 text-sm">
                  <a href={`tel:${soDigitos(lead.telefone)}`} className="text-blue-700 font-medium hover:underline">📞 {lead.telefone}</a>
                  <CopyBtn value={lead.telefone} />
                </div>
              )}
              {lead.emails?.[0]?.endereco && (
                <div className="flex items-center gap-2 text-sm">
                  <a href={`mailto:${lead.emails[0].endereco}`} className="text-emerald-700 font-medium hover:underline break-all">✉️ {lead.emails[0].endereco}</a>
                  <CopyBtn value={lead.emails[0].endereco} />
                </div>
              )}
              {lead.contato && !lead.telefone && <p className="text-sm text-gray-600 whitespace-pre-line">{lead.contato}</p>}
            </div>
          )}

          <FunilCliente lead={lead} onPatch={onPatch} />

          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <Link href={`/call/${lead.id}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">Abrir ficha completa →</Link>
            <button onClick={onSair} className="text-xs text-gray-400 hover:text-red-500">Tirar do funil</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientesPage() {
  const [leads, setLeads] = useState<Lead[]>(() => leadsEmCache() ?? []);
  const [loading, setLoading] = useState(() => !leadsEmCache());
  const [over, setOver] = useState<string | null>(null);
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [buscaAdd, setBuscaAdd] = useState('');

  const carregar = useCallback(async () => {
    try {
      const d: Lead[] = await fetch('/api/leads', { cache: 'no-store' }).then(r => r.json());
      if (Array.isArray(d)) { setLeads(d); guardarLeadsEmCache(d); }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  async function patch(id: string, updates: Partial<Lead>) {
    setLeads(prev => {
      const novo = prev.map(l => (l.id === id ? { ...l, ...updates } : l));
      guardarLeadsEmCache(novo);
      return novo;
    });
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
    });
  }

  const mover = (id: string, etapa: EtapaFunil) => patch(id, patchParaEtapa(etapa));
  const sair = (id: string) => { patch(id, patchSairDoFunil()); setAbertoId(null); };

  const noFunil = useMemo(() => leads.filter(estaNoFunil), [leads]);
  const porEtapa = useMemo(() => {
    const map = Object.fromEntries(ETAPAS.map(e => [e.id, [] as Lead[]])) as Record<EtapaFunil, Lead[]>;
    for (const l of noFunil) (map[l.etapaFunil!] ??= []).push(l);
    for (const e of ETAPAS) map[e.id].sort(compararNoFunil);
    return map;
  }, [noFunil]);

  const disponiveis = useMemo(() => {
    const q = buscaAdd.trim().toLowerCase();
    return leads
      .filter(l => !estaNoFunil(l))
      .filter(l => !q || l.nome.toLowerCase().includes(q) || (l.localizacao ?? '').toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome))
      .slice(0, 40);
  }, [leads, buscaAdd]);

  const ativos = ETAPAS.filter(e => !e.desfecho).reduce((n, e) => n + porEtapa[e.id].length, 0);
  const ganhos = porEtapa['cliente'].length;
  const reunioesAtrasadas = noFunil.filter(l => chipProximaReuniao(l)?.urgencia === 0).length;
  const reunioesHoje = noFunil.filter(l => chipProximaReuniao(l)?.urgencia === 1).length;

  const aberto = leads.find(l => l.id === abertoId) ?? null;

  return (
    <div className="min-h-[calc(100vh-3rem)] bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-bold text-gray-900">Clientes</h1>
          <span className="text-xs text-gray-400 hidden sm:inline">funil de fechamento · pós-prospecção</span>

          <div className="flex gap-1.5 text-xs font-semibold ml-auto flex-wrap">
            {reunioesAtrasadas > 0 && <span className="bg-red-600 text-white rounded px-2 py-1">{reunioesAtrasadas} reunião atrasada</span>}
            {reunioesHoje > 0 && <span className="bg-amber-400 text-amber-950 rounded px-2 py-1">{reunioesHoje} pra hoje</span>}
            <span className="bg-indigo-100 text-indigo-800 rounded px-2 py-1">{ativos} em negociação</span>
            <span className="bg-emerald-100 text-emerald-800 rounded px-2 py-1">{ganhos} cliente{ganhos !== 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => setAddOpen(o => !o)}
            className="text-sm font-semibold bg-gray-900 text-white rounded-lg px-3 py-1.5 hover:bg-gray-700"
          >
            + Adicionar negócio
          </button>
        </div>

        {addOpen && (
          <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3">
            <input
              autoFocus type="text" value={buscaAdd} onChange={e => setBuscaAdd(e.target.value)}
              placeholder="Buscar lead pra puxar pro funil (nome ou cidade)..."
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
            />
            <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
              {disponiveis.length === 0 && <p className="text-xs text-gray-400 py-2 text-center">nenhum lead encontrado</p>}
              {disponiveis.map(l => (
                <button
                  key={l.id}
                  onClick={() => { mover(l.id, 'poc-marcada'); setAddOpen(false); setBuscaAdd(''); setAbertoId(l.id); }}
                  className="w-full flex items-center justify-between gap-2 text-left rounded-lg bg-white border border-gray-200 px-3 py-2 hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <span className="text-sm text-gray-800 truncate">{l.nome}<span className="text-gray-400"> · {l.categoria}{l.localizacao ? ` · ${l.localizacao}` : ''}</span></span>
                  <span className="text-xs text-indigo-600 font-semibold shrink-0">+ entrar</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {loading ? (
        <div className="py-20 text-center text-gray-400">Carregando...</div>
      ) : noFunil.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
          <p className="text-5xl mb-3">🏆</p>
          <h2 className="text-lg font-bold text-gray-800">Seu funil de clientes está vazio</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">Quando um lead avança pra reunião de POC, clique em <strong>+ Adicionar negócio</strong> e acompanhe cada fase e reunião aqui — sem tirar ele da coluna do kanban.</p>
          <button onClick={() => setAddOpen(true)} className="mt-4 text-sm font-semibold bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-700">+ Adicionar primeiro negócio</button>
        </div>
      ) : (
        <div className="flex-1 p-3 sm:p-4">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 items-start">
            {ETAPAS.map(e => (
              <ColunaFunil
                key={e.id} etapa={e} leads={porEtapa[e.id]}
                over={over} setOver={setOver}
                onDrop={mover} onAbrir={l => setAbertoId(l.id)} onMover={mover}
              />
            ))}
          </div>
        </div>
      )}

      {aberto && (
        <Modal
          lead={aberto}
          onClose={() => setAbertoId(null)}
          onPatch={u => patch(aberto.id, u)}
          onSair={() => sair(aberto.id)}
        />
      )}
    </div>
  );
}
