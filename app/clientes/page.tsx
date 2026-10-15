'use client';
import { t } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { EtapaFunil, Lead } from '@/lib/types';
import {
  ETAPAS, chipProximaReuniao, compararNoFunil, contarReunioes, contarTarefas, estaNoFunil,
  etapaDef, patchParaEtapa, previewEvento, ultimoEvento,
} from '@/lib/funil';
import Icon, { IconName } from '../components/Icon';
import { guardarLeadsEmCache, leadsEmCache } from '@/lib/leads-cache';

const soDigitos = (s: string) => (s || '').replace(/\D/g, '');

function CardFunil({ lead, onAbrir, onMover }: { lead: Lead; onAbrir: () => void; onMover: (etapa: EtapaFunil) => void }) {
  const def = etapaDef(lead.etapaFunil!);
  const chip = chipProximaReuniao(lead);
  const cont = contarReunioes(lead);
  const ct = contarTarefas(lead);
  const ult = ultimoEvento(lead);
  const preview = ult ? previewEvento(ult) : '';
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
        {ct.minhas > 0 && <span className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 font-semibold">🙋 {ct.minhas}</span>}
        {ct.doCliente > 0 && <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 font-semibold">⏳ {ct.doCliente}</span>}
        {cont.total === 0 && ct.total === 0 && <span className="rounded bg-gray-100 text-gray-400 px-1.5 py-0.5">{t("sem atividade")}</span>}
      </div>

      {preview && (
        <p className="mt-2 text-xs text-gray-600 bg-gray-50 border border-gray-100 rounded px-2 py-1 line-clamp-2">
          <span className="mr-1">{ult?.icone || ''}</span>{preview}
        </p>
      )}

      {(fone || email) && (
        <div className="mt-2 space-y-1" onClick={e => e.stopPropagation()}>
          {fone && <a href={`tel:${fone}`} className="block text-xs font-medium text-blue-700 hover:underline">📞 {lead.telefone}</a>}
          {email && <a href={`mailto:${email}`} className="block text-xs font-medium text-emerald-700 hover:underline break-all">✉️ {email}</a>}
        </div>
      )}

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

function ColunaFunil({ etapa, leads, over, setOver, onDrop, onAbrir, onMover }: {
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

function LinhaLista({ lead, onAbrir }: { lead: Lead; onAbrir: () => void }) {
  const def = etapaDef(lead.etapaFunil!);
  const chip = chipProximaReuniao(lead);
  const cont = contarReunioes(lead);
  const ct = contarTarefas(lead);
  return (
    <button
      onClick={onAbrir}
      className={`w-full flex items-center gap-3 text-left bg-white border border-gray-200 border-l-4 ${def.faixa} rounded-xl px-3 py-2.5 hover:shadow-md hover:border-indigo-200 transition`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-900 truncate">{lead.nome}</p>
        <p className="text-[11px] text-gray-400 truncate">{lead.categoria}{lead.localizacao ? ` · ${lead.localizacao}` : ''}</p>
      </div>
      <span className={`hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold rounded-lg px-2 py-1 shrink-0 ${def.selo}`}>{def.icone} {t(def.titulo)}</span>
      {chip && <span className={`hidden md:inline-block rounded px-2 py-0.5 text-[10px] font-bold shrink-0 ${chip.classes}`}>🗓️ {chip.texto}</span>}
      <div className="flex items-center gap-1 text-[10px] shrink-0">
        {cont.total > 0 && <span className="rounded bg-gray-100 text-gray-600 px-1.5 py-0.5 font-semibold">🤝 {cont.total}</span>}
        {ct.minhas > 0 && <span className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 font-semibold">🙋 {ct.minhas}</span>}
        {ct.doCliente > 0 && <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 font-semibold">⏳ {ct.doCliente}</span>}
      </div>
      <span className="text-gray-300 shrink-0">›</span>
    </button>
  );
}

type Vista = 'funil' | 'lista';

export default function ClientesPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(() => leadsEmCache() ?? []);
  const [loading, setLoading] = useState(() => !leadsEmCache());
  const [over, setOver] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [buscaAdd, setBuscaAdd] = useState('');
  const [vista, setVista] = useState<Vista>('funil');
  const [busca, setBusca] = useState('');
  const [filtroEtapa, setFiltroEtapa] = useState<EtapaFunil | 'todas'>('todas');

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

  const abrir = (id: string) => router.push(`/clientes/${id}`);

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

  const noFunil = useMemo(() => leads.filter(estaNoFunil), [leads]);
  const porEtapa = useMemo(() => {
    const map = Object.fromEntries(ETAPAS.map(e => [e.id, [] as Lead[]])) as Record<EtapaFunil, Lead[]>;
    for (const l of noFunil) (map[l.etapaFunil!] ??= []).push(l);
    for (const e of ETAPAS) map[e.id].sort(compararNoFunil);
    return map;
  }, [noFunil]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return noFunil
      .filter(l => filtroEtapa === 'todas' || l.etapaFunil === filtroEtapa)
      .filter(l => !q || l.nome.toLowerCase().includes(q) || (l.localizacao ?? '').toLowerCase().includes(q) || (l.segmento ?? '').toLowerCase().includes(q))
      .sort((a, b) => {
        const oa = ETAPAS.findIndex(e => e.id === a.etapaFunil), ob = ETAPAS.findIndex(e => e.id === b.etapaFunil);
        return oa !== ob ? oa - ob : compararNoFunil(a, b);
      });
  }, [noFunil, busca, filtroEtapa]);

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

        {/* abas de visão */}
        <div className="mt-3 flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit">
          {([['funil', 'kanban', 'Funil'], ['lista', 'leads', 'Lista']] as [Vista, IconName, string][]).map(([v, icone, rotulo]) => (
            <button
              key={v}
              onClick={() => setVista(v)}
              className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-semibold transition ${vista === v ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
            >
              <Icon name={icone} className="w-4 h-4" /> {t(rotulo)}
            </button>
          ))}
          <Link href="/clientes/mapa" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-semibold text-gray-500 hover:text-gray-800 transition">
            <Icon name="mapa" className="w-4 h-4" /> {t("Mapa")}
          </Link>
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
                  onClick={() => { mover(l.id, 'poc-marcada'); setAddOpen(false); setBuscaAdd(''); abrir(l.id); }}
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
      ) : vista === 'funil' ? (
        <div className="@container flex-1 px-4 sm:px-6 lg:px-8 py-4">
          <div className="grid gap-3 grid-cols-1 @md:grid-cols-2 @2xl:grid-cols-3 @4xl:grid-cols-6 items-start">
            {ETAPAS.map(e => (
              <ColunaFunil
                key={e.id} etapa={e} leads={porEtapa[e.id]}
                over={over} setOver={setOver}
                onDrop={mover} onAbrir={l => abrir(l.id)} onMover={mover}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 max-w-4xl w-full mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input
              type="text" value={busca} onChange={e => setBusca(e.target.value)}
              placeholder={t("Filtrar por nome, cidade ou segmento…")}
              className="flex-1 min-w-[12rem] text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-400"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            <button onClick={() => setFiltroEtapa('todas')} className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${filtroEtapa === 'todas' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{t("Todas")} ({noFunil.length})</button>
            {ETAPAS.map(e => (
              <button key={e.id} onClick={() => setFiltroEtapa(e.id)} className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${filtroEtapa === e.id ? `${e.selo} border-transparent ring-2 ring-offset-1 ring-gray-300` : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>{e.icone} {t(e.titulo)} ({porEtapa[e.id].length})</button>
            ))}
          </div>
          <div className="space-y-2">
            {lista.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">{t("Nenhum cliente com esse filtro.")}</p>
            ) : lista.map(l => <LinhaLista key={l.id} lead={l} onAbrir={() => abrir(l.id)} />)}
          </div>
        </div>
      )}
    </div>
  );
}
