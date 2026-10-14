'use client';
import { t } from '@/lib/i18n';
import { useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { Lead, Categoria, Status } from '@/lib/types';
import { PriorityBadge, StatusBadge, CategoriaBadge } from './components/Badges';
import Icon, { IconName } from './components/Icon';
import { EVENTO_LEADS, EVENTO_RODADA } from './components/AppShell';
import { guardarLeadsEmCache, leadsEmCache } from '@/lib/leads-cache';

const FILTERS_KEY = 'dominant-filters';
const POR_PAGINA = 50;
const PALAVRA_CONFIRMACAO = 'APAGAR';

const CATEGORIAS: Categoria[] = [
  'ERP / PCP', 'Integrador de automação', 'Fabricante de máquinas',
  'Cliente direto', 'Automação RPA', 'Polo / Associação', 'Programa / Fomento', 'Concorrente',
];
const STATUS_LIST: Status[] = [
  'A contatar', 'A pesquisar', 'Pausado', 'Monitorar',
  'Contatado', 'Em conversa', 'Reunião marcada', 'Proposta enviada',
  'Piloto', 'Parceiro ativo', 'Fechado',
];

function baixar(conteudo: string, nome: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  a.click();
  URL.revokeObjectURL(url);
}

const hojeISO = () => new Date().toISOString().slice(0, 10);

function exportCSV(leads: Lead[]) {
  const header = 'Nome;Categoria;Localização;Perfil / o que faz;Por que faz sentido;Contato / canal de entrada;Prioridade;Status;Próximo passo;Responsável;Data próx. passo;Última interação;Observações;Fonte;CNPJ;Segmento / CNAE;Porte;Score;Telefone;Site;Data de inclusão';
  const rows = leads.map(l =>
    [l.nome, l.categoria, l.localizacao, l.perfil, l.porqueFazSentido, l.contato,
     l.prioridade, l.status, l.proximoPasso, l.responsavel, l.dataProxPasso,
     l.ultimaInteracao, l.observacoes, l.fonte, l.cnpj, l.segmento, l.porte,
     l.score, l.telefone, l.site, l.dataInclusao]
    .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
    .join(';')
  );
  baixar('﻿' + [header, ...rows].join('\r\n'), `funil-dominant-${hojeISO()}.csv`, 'text/csv;charset=utf-8');
}

/** Cópia completa (todos os campos, históricos e reuniões) — é o que permite restaurar. */
function baixarBackup(leads: Lead[]) {
  baixar(JSON.stringify(leads, null, 2), `backup-leads-dominant-${hojeISO()}.json`, 'application/json');
}

const selectCls = 'h-10 text-sm border border-gray-200 rounded-xl px-3 outline-none focus:border-blue-400 bg-white text-gray-700';

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>(() => leadsEmCache() ?? []);
  const [loading, setLoading] = useState(() => !leadsEmCache());
  const [pag, setPag] = useState({ assinatura: '', n: 1 });
  const [toast, setToast] = useState('');
  const [menuMais, setMenuMais] = useState(false);
  const [apagarAberto, setApagarAberto] = useState(false);
  const [textoConfirmacao, setTextoConfirmacao] = useState('');

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterPrio, setFilterPrio] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterLigacao, setFilterLigacao] = useState<'' | 'nao' | 'sim'>('');
  const [filterLoc, setFilterLoc] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'nome' | 'prioridade' | 'dataInclusao'>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const filtersReady = useRef(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const saved = localStorage.getItem(FILTERS_KEY);
      if (saved) {
        const f = JSON.parse(saved);
        if (f.search !== undefined) setSearch(f.search);
        if (f.filterCat !== undefined) setFilterCat(f.filterCat);
        if (f.filterPrio !== undefined) setFilterPrio(f.filterPrio);
        if (f.filterStatus !== undefined) setFilterStatus(f.filterStatus);
        if (f.filterLigacao !== undefined) setFilterLigacao(f.filterLigacao);
        if (f.filterLoc !== undefined) setFilterLoc(f.filterLoc);
        if (f.sortBy !== undefined) setSortBy(f.sortBy);
        if (f.sortDir !== undefined) setSortDir(f.sortDir);
      }
    } catch {}
    filtersReady.current = true;
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    if (!filtersReady.current) return;
    try {
      localStorage.setItem(FILTERS_KEY, JSON.stringify({ search, filterCat, filterPrio, filterStatus, filterLigacao, filterLoc, sortBy, sortDir }));
    } catch {}
  }, [search, filterCat, filterPrio, filterStatus, filterLigacao, filterLoc, sortBy, sortDir]);

  async function fetchLeads() {
    const res = await fetch('/api/leads', { cache: 'no-store' });
    const data = await res.json();
    setLeads(data);
    guardarLeadsEmCache(data);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLeads();
    // a barra superior avisa quando uma rodada termina
    window.addEventListener(EVENTO_LEADS, fetchLeads);
    return () => window.removeEventListener(EVENTO_LEADS, fetchLeads);
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  function handleRefresh() {
    fetchLeads();
    showToast(t('Lista atualizada.'));
  }

  const pedirRodada = () => window.dispatchEvent(new Event(EVENTO_RODADA));

  // Apagar tudo: exige digitar a palavra e baixa um backup antes, sempre.
  async function clearLeads() {
    if (textoConfirmacao.trim().toUpperCase() !== PALAVRA_CONFIRMACAO) return;
    baixarBackup(leads);
    await fetch('/api/leads', { method: 'DELETE' });
    setLeads([]);
    guardarLeadsEmCache([]);
    setApagarAberto(false);
    setTextoConfirmacao('');
    showToast(t('Leads removidos. O backup foi baixado para o seu computador.'));
  }

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  const filtered = useMemo(() => {
    let list = leads.filter(l => {
      if (search && !l.nome.toLowerCase().includes(search.toLowerCase()) &&
          !l.localizacao.toLowerCase().includes(search.toLowerCase()) &&
          !l.perfil.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCat && l.categoria !== filterCat) return false;
      if (filterPrio && l.prioridade !== filterPrio) return false;
      if (filterStatus && l.status !== filterStatus) return false;
      if (filterLigacao === 'nao' && (l.chamadas ?? []).length > 0) return false;
      if (filterLigacao === 'sim' && (l.chamadas ?? []).length === 0) return false;
      if (filterLoc && l.localizacao !== filterLoc) return false;

      return true;
    });

    list = [...list].sort((a, b) => {
      let v = 0;
      if (sortBy === 'score') v = a.score - b.score;
      else if (sortBy === 'nome') v = a.nome.localeCompare(b.nome);
      else if (sortBy === 'prioridade') v = Number(a.prioridade) - Number(b.prioridade);
      else if (sortBy === 'dataInclusao') v = a.dataInclusao.localeCompare(b.dataInclusao);
      return sortDir === 'asc' ? v : -v;
    });

    return list;
  }, [leads, search, filterCat, filterPrio, filterStatus, filterLigacao, filterLoc, sortBy, sortDir]);

  // A tabela mostra uma página por vez: renderizar centenas de linhas de uma vez deixava a tela pesada.
  // Mudou filtro ou ordenação → volta pra página 1 (a página guardada só vale pro mesmo conjunto).
  const assinatura = [search, filterCat, filterPrio, filterStatus, filterLigacao, filterLoc, sortBy, sortDir].join('|');
  const setPagina = (n: number) => setPag({ assinatura, n });
  const totalPaginas = Math.max(1, Math.ceil(filtered.length / POR_PAGINA));
  const paginaAtual = Math.min(pag.assinatura === assinatura ? pag.n : 1, totalPaginas);
  const inicio = (paginaAtual - 1) * POR_PAGINA;
  const visiveis = filtered.slice(inicio, inicio + POR_PAGINA);

  const locations = useMemo(() =>
    [...new Set(leads.map(l => l.localizacao).filter(Boolean))].sort(),
  [leads]);

  const stats = useMemo(() => ({
    total: leads.length,
    p1: leads.filter(l => l.prioridade === '1').length,
    p2: leads.filter(l => l.prioridade === '2').length,
    aContatar: leads.filter(l => l.status === 'A contatar').length,
  }), [leads]);

  const top10 = useMemo(() =>
    [...leads]
      .filter(l => !['Fechado', 'Sem interesse', 'Parceiro ativo'].includes(l.status))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10),
  [leads]);

  const temFiltro = !!(search || filterCat || filterPrio || filterStatus || filterLigacao || filterLoc);

  const cabecalhoOrdenavel = (col: typeof sortBy, label: string) => {
    const active = sortBy === col;
    return (
      <button onClick={() => toggleSort(col)} className={`flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider ${active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>
        {t(label)}
        <span>{active ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
      </button>
    );
  };
  const th = 'text-left px-4 py-3 text-[11px] font-semibold text-gray-500 uppercase tracking-wider';

  const cartoes: { label: string; value: number; icone: IconName; cor: string }[] = [
    { label: 'Total de leads', value: stats.total, icone: 'leads', cor: 'from-slate-700 to-slate-900' },
    { label: 'Prioridade 1', value: stats.p1, icone: 'alvo', cor: 'from-rose-500 to-red-600' },
    { label: 'Prioridade 2', value: stats.p2, icone: 'raio', cor: 'from-amber-400 to-orange-500' },
    { label: 'A contatar', value: stats.aContatar, icone: 'telefone', cor: 'from-emerald-500 to-green-600' },
  ];

  return (
    <div className="min-h-full">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Cabeçalho da página */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("Leads")}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t("Funil de prospecção ·")} {stats.total} {t("empresas")}</p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={handleRefresh} className="inline-flex items-center gap-2 h-10 px-3.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm">
              <Icon name="atualizar" className="w-4 h-4" /> {t("Atualizar")}
            </button>
            <button onClick={() => exportCSV(filtered)} className="inline-flex items-center gap-2 h-10 px-3.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm">
              <Icon name="download" className="w-4 h-4" /> {t("Exportar CSV")}
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuMais(m => !m)}
                onBlur={() => setTimeout(() => setMenuMais(false), 150)}
                title={t("Mais opções")} aria-label={t("Mais opções")}
                className="grid place-items-center w-10 h-10 text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm"
              >
                <Icon name="pontos" />
              </button>
              {menuMais && (
                <div className="surgir absolute right-0 z-30 mt-2 w-64 rounded-2xl bg-white border border-gray-200 shadow-xl p-1.5">
                  <button onMouseDown={() => baixarBackup(leads)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 hover:bg-gray-50 text-left">
                    <Icon name="download" className="w-4 h-4 text-gray-400" />
                    <span>{t("Baixar backup completo")}<span className="block text-xs text-gray-400">{t("todos os dados, em JSON")}</span></span>
                  </button>
                  {leads.length > 0 && (
                    <>
                      <div className="my-1 border-t border-gray-100" />
                      <button onMouseDown={() => { setApagarAberto(true); setTextoConfirmacao(''); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 hover:bg-red-50 text-left">
                        <Icon name="lixeira" className="w-4 h-4" />
                        <span>{t("Apagar todos os leads…")}<span className="block text-xs text-red-400">{t("pede confirmação por escrito")}</span></span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {cartoes.map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 sm:p-5 flex items-center gap-4">
              <span className={`grid place-items-center w-11 h-11 rounded-xl bg-gradient-to-br ${s.cor} text-white shadow-md shrink-0`}>
                <Icon name={s.icone} />
              </span>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium truncate">{t(s.label)}</p>
                <p className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 tabular">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Top 10 */}
        {top10.length > 0 && (
          <section>
            <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">{t("Top")} {top10.length} {t("— melhores leads ativos")}</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {top10.map((l, i) => (
                <Link
                  key={l.id}
                  href={`/call/${l.id}`}
                  className="group bg-white border border-gray-200/80 rounded-2xl px-4 py-3 shadow-sm hover:border-blue-300 hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-gray-400 font-semibold">#{i + 1}</span>
                    <span className={`text-[11px] font-bold rounded-full px-2 py-0.5 ${l.score >= 8 ? 'bg-red-50 text-red-600' : l.score >= 5 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                      {l.score} {t("pts")}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 leading-snug">{l.nome}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5 mb-2">{l.localizacao}</p>
                  <StatusBadge s={l.status} />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Tabela com filtros */}
        <section className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 flex flex-wrap gap-2.5 items-center border-b border-gray-100">
            <div className="relative flex-1 min-w-52">
              <Icon name="busca" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                placeholder={t("Filtrar empresa, cidade…")}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full h-10 text-sm border border-gray-200 rounded-xl pl-9 pr-3 outline-none focus:border-blue-400"
              />
            </div>
            <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className={selectCls}>
              <option value="">{t("Todas as categorias")}</option>
              {CATEGORIAS.map(c => <option key={c} value={c}>{t(c)}</option>)}
            </select>
            <select value={filterPrio} onChange={e => setFilterPrio(e.target.value)} className={selectCls}>
              <option value="">{t("Todas as prioridades")}</option>
              <option value="1">{t("Prioridade 1")}</option>
              <option value="2">{t("Prioridade 2")}</option>
              <option value="3">{t("Prioridade 3")}</option>
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={selectCls}>
              <option value="">{t("Todos os status")}</option>
              {STATUS_LIST.map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
            <select value={filterLigacao} onChange={e => setFilterLigacao(e.target.value as '' | 'nao' | 'sim')} className={selectCls}>
              <option value="">{t("Todas as ligações")}</option>
              <option value="nao">{t("Ainda não liguei")}</option>
              <option value="sim">{t("Já liguei")}</option>
            </select>
            <select value={filterLoc} onChange={e => setFilterLoc(e.target.value)} className={`${selectCls} max-w-52`}>
              <option value="">{t("Todas as cidades")}</option>
              {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
            </select>
            {temFiltro && (
              <button onClick={() => { setSearch(''); setFilterCat(''); setFilterPrio(''); setFilterStatus(''); setFilterLigacao(''); setFilterLoc(''); }} className="h-10 px-3 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl">
                {t("Limpar filtros")}
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400 tabular">{filtered.length} {t("resultado")}{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-400">{t("Carregando...")}</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-gray-400 mb-3">{leads.length === 0 ? t("Nenhum lead ainda.") : t("Nenhum resultado para os filtros.")}</p>
              {leads.length === 0 && (
                <button onClick={pedirRodada} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">
                  {t("Pedir primeira rodada")}
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/80 border-b border-gray-200">
                  <tr>
                    <th className={`${th} w-8`}>#</th>
                    <th className="text-left px-4 py-3">{cabecalhoOrdenavel('nome', 'Empresa')}</th>
                    <th className={th}>{t("Categoria")}</th>
                    <th className="text-left px-4 py-3">{cabecalhoOrdenavel('score', 'Score')}</th>
                    <th className="text-left px-4 py-3">{cabecalhoOrdenavel('prioridade', 'Prior.')}</th>
                    <th className={th}>{t("Status")}</th>
                    <th className={th}>{t("Ligações")}</th>
                    <th className={th}>{t("Próximo passo")}</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visiveis.map((lead, idx) => (
                    <tr key={lead.id} className="hover:bg-blue-50/40 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{inicio + idx + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/call/${lead.id}`} className="flex items-center gap-3 group min-w-48">
                          <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 text-xs font-bold shrink-0">
                            {lead.nome.slice(0, 2).toUpperCase()}
                          </span>
                          <span className="min-w-0">
                            <span className="block font-semibold text-gray-900 group-hover:text-blue-600 transition-colors leading-snug">{lead.nome}</span>
                            <span className="block text-xs text-gray-400">{lead.localizacao}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3"><CategoriaBadge c={lead.categoria} /></td>
                      <td className="px-4 py-3">
                        <span className={`inline-grid place-items-center min-w-8 h-7 px-1.5 rounded-lg font-bold text-sm ${lead.score >= 8 ? 'bg-red-50 text-red-600' : lead.score >= 5 ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-400'}`}>
                          {lead.score}
                        </span>
                      </td>
                      <td className="px-4 py-3"><PriorityBadge p={lead.prioridade} /></td>
                      <td className="px-4 py-3"><StatusBadge s={lead.status} /></td>
                      <td className="px-4 py-3">
                        {(lead.chamadas ?? []).length === 0 ? (
                          <span className="text-xs text-gray-300">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600">
                            <Icon name="telefone" className="w-3.5 h-3.5 text-gray-400" /> {lead.chamadas.length}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 max-w-xs truncate text-xs">{lead.proximoPasso}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/call/${lead.id}`} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg hover:bg-blue-600 hover:text-white transition-colors">
                          <Icon name="telefone" className="w-3.5 h-3.5" /> {t("Ligar")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && filtered.length > POR_PAGINA && (
            <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-t border-gray-100 bg-gray-50/60 text-sm">
              <span className="text-xs text-gray-500 tabular">
                {inicio + 1}–{Math.min(inicio + POR_PAGINA, filtered.length)} {t("de")} {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPagina(paginaAtual - 1)} disabled={paginaAtual <= 1}
                  className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                >
                  {t("← Anterior")}
                </button>
                <span className="text-xs text-gray-500 tabular">{t("página")} {paginaAtual} {t("de")} {totalPaginas}</span>
                <button
                  onClick={() => setPagina(paginaAtual + 1)} disabled={paginaAtual >= totalPaginas}
                  className="h-9 px-3 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40"
                >
                  {t("Próxima →")}
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Confirmação para apagar tudo */}
      {apagarAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4" onClick={() => setApagarAberto(false)}>
          <div className="surgir bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <span className="grid place-items-center w-12 h-12 rounded-2xl bg-red-100 text-red-600 mb-4"><Icon name="lixeira" className="w-6 h-6" /></span>
            <h2 className="text-lg font-bold text-gray-900">{t("Apagar todos os")} {leads.length} {t("leads?")}</h2>
            <p className="text-sm text-gray-600 mt-2 leading-relaxed">
              {t("Isso remove")} <strong>{t("todas as empresas")}</strong>{t(", com históricos de ligações, mensagens, e-mails e reuniões. Não dá para desfazer pelo sistema. Um backup completo será baixado para o seu computador antes de apagar.")}
            </p>
            <label className="block text-xs font-semibold text-gray-500 mt-4 mb-1.5">
              {t("Para confirmar, digite")} <span className="text-red-600">{PALAVRA_CONFIRMACAO}</span>
            </label>
            <input
              autoFocus value={textoConfirmacao} onChange={e => setTextoConfirmacao(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && clearLeads()}
              className="w-full h-11 border border-gray-300 rounded-xl px-3 text-sm outline-none focus:border-red-400 uppercase tracking-widest"
            />
            <div className="flex gap-2 justify-end mt-5">
              <button onClick={() => setApagarAberto(false)} className="h-10 px-4 text-sm font-medium text-gray-700 rounded-xl hover:bg-gray-100">{t("Cancelar")}</button>
              <button
                onClick={clearLeads}
                disabled={textoConfirmacao.trim().toUpperCase() !== PALAVRA_CONFIRMACAO}
                className="h-10 px-4 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-40"
              >
                {t("Baixar backup e apagar tudo")}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="surgir fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-sm px-5 py-3 rounded-2xl shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
