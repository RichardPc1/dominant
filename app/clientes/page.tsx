'use client';
import { t } from '@/lib/i18n';
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
      {ok ? '✓' : t("copiar")}
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
        {cont.total === 0 && <span className="rounded bg-gray-100 text-gray-400 px-1.5 py-0.5">{t("sem reunião")}</span>}
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
          title={t("Mudar de fase")}
        >
          {ETAPAS.map(e => <option key={e.id} value={e.id}>{e.icone} {t(e.titulo)}</option>)}
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
      className={`flex flex-col rounded-2xl bg-slate-200/50 border transition-colors ${over === etapa.id ? 'border-indigo-500 ring-4 ring-indigo-100 bg-indigo-50/60' : 'border-transparent'}`}
    >
      <div className="px-3 pt-3 pb-1 flex items-center gap-2.5">
        <span className={`grid place-items-center w-8 h-8 rounded-xl text-sm shadow-sm shrink-0 bg-gradient-to-br ${etapa.header}`}>{etapa.icone}</span>
        <h2 className="text-sm font-bold text-gray-800 leading-tight min-w-0 flex-1 break-words">{t(etapa.titulo)}</h2>
        <span className="text-xs font-bold text-gray-600 bg-white rounded-full px-2 py-0.5 shadow-sm tabular">{leads.length}</span>
      </div>
      <p className="px-3 pt-1 text-[11px] text-gray-500 leading-snug">{t(etapa.dica)}</p>
      <div className="p-2 space-y-2 min-h-[6rem] max-h-[70dvh] @4xl:max-h-[calc(100dvh-17rem)] overflow-y-auto">
        {leads.length === 0 && <p className="text-xs text-gray-300 text-center py-6">{t("vazio")}</p>}
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
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div className="surgir bg-white rounded-2xl shadow-2xl w-full max-w-lg my-8" onClick={e => e.stopPropagation()}>
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
            <Link href={`/call/${lead.id}`} className="text-sm font-semibold text-indigo-600 hover:text-indigo-800">{t("Abrir ficha completa →")}</Link>
            <button onClick={onSair} className="text-xs text-gray-400 hover:text-red-500">{t("Tirar do funil")}</button>
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
    <div className="min-h-full flex flex-col">
      <header className="px-4 sm:px-6 lg:px-8 pt-6 pb-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="mr-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("Clientes")}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t("Funil de fechamento · da POC ao contrato")}</p>
          </div>

          <div className="flex gap-1.5 text-xs font-semibold ml-auto flex-wrap">
            {reunioesAtrasadas > 0 && <span className="bg-red-600 text-white rounded px-2 py-1">{reunioesAtrasadas} {t("reunião atrasada")}</span>}
            {reunioesHoje > 0 && <span className="bg-amber-400 text-amber-950 rounded px-2 py-1">{reunioesHoje} {t("pra hoje")}</span>}
            <span className="bg-indigo-100 text-indigo-800 rounded px-2 py-1">{ativos} {t("em negociação")}</span>
            <span className="bg-emerald-100 text-emerald-800 rounded px-2 py-1">{ganhos} {t("cliente")}{ganhos !== 1 ? 's' : ''}</span>
          </div>
          <button
            onClick={() => setAddOpen(o => !o)}
            className="h-10 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-4 shadow-md shadow-blue-600/25 hover:brightness-110"
          >
            {t("+ Adicionar negócio")}
          </button>
        </div>

        {addOpen && (
          <div className="surgir mt-3 rounded-2xl border border-gray-200 bg-white shadow-sm p-3">
            <input
              autoFocus type="text" value={buscaAdd} onChange={e => setBuscaAdd(e.target.value)}
              placeholder={t("Buscar lead pra puxar pro funil (nome ou cidade)...")}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
            />
            <div className="mt-2 max-h-56 overflow-y-auto space-y-1">
              {disponiveis.length === 0 && <p className="text-xs text-gray-400 py-2 text-center">{t("nenhum lead encontrado")}</p>}
              {disponiveis.map(l => (
                <button
                  key={l.id}
                  onClick={() => { mover(l.id, 'poc-marcada'); setAddOpen(false); setBuscaAdd(''); setAbertoId(l.id); }}
                  className="w-full flex items-center justify-between gap-2 text-left rounded-lg bg-white border border-gray-200 px-3 py-2 hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <span className="text-sm text-gray-800 truncate">{l.nome}<span className="text-gray-400"> · {l.categoria}{l.localizacao ? ` · ${l.localizacao}` : ''}</span></span>
                  <span className="text-xs text-indigo-600 font-semibold shrink-0">{t("+ entrar")}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      {loading ? (
        <div className="py-20 text-center text-gray-400">{t("Carregando...")}</div>
      ) : noFunil.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
          <p className="text-5xl mb-3">🏆</p>
          <h2 className="text-lg font-bold text-gray-800">{t("Seu funil de clientes está vazio")}</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">{t("Quando um lead avança pra reunião de POC, clique em")} <strong>{t("+ Adicionar negócio")}</strong> {t("e acompanhe cada fase e reunião aqui — sem tirar ele da coluna do kanban.")}</p>
          <button onClick={() => setAddOpen(true)} className="mt-5 h-10 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-5 shadow-md shadow-blue-600/25 hover:brightness-110">{t("+ Adicionar primeiro negócio")}</button>
        </div>
      ) : (
        <div className="@container flex-1 px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid gap-3 grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-6 items-start">
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
