'use client';
import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Lead, Categoria, Prioridade, Status } from '@/lib/types';
import { PriorityBadge, StatusBadge, CategoriaBadge } from './components/Badges';
import RunRoundModal from './components/RunRoundModal';

const CATEGORIAS: Categoria[] = [
  'ERP / PCP', 'Integrador de automação', 'Fabricante de máquinas',
  'Cliente direto', 'Automação RPA', 'Polo / Associação', 'Programa / Fomento', 'Concorrente',
];
const STATUS_LIST: Status[] = [
  'A contatar', 'A pesquisar', 'Pausado', 'Monitorar',
  'Contatado', 'Em conversa', 'Reunião marcada', 'Proposta enviada',
  'Piloto', 'Parceiro ativo', 'Fechado',
];

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
  const csv = '﻿' + [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `funil-dominant-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterPrio, setFilterPrio] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterNaoLigado, setFilterNaoLigado] = useState(false);
  const [sortBy, setSortBy] = useState<'score' | 'nome' | 'prioridade' | 'dataInclusao'>('score');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  async function fetchLeads() {
    const res = await fetch('/api/leads', { cache: 'no-store' });
    const data = await res.json();
    setLeads(data);
    setLoading(false);
  }

  useEffect(() => { fetchLeads(); }, []);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  }

  function handleRefresh() {
    fetchLeads();
    showToast('Lista atualizada.');
  }

  async function clearLeads() {
    await fetch('/api/leads', { method: 'DELETE' });
    setLeads([]);
    setConfirmClear(false);
    showToast('Todos os leads foram removidos.');
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
      if (filterNaoLigado && (l.chamadas ?? []).length > 0) return false;
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
  }, [leads, search, filterCat, filterPrio, filterStatus, sortBy, sortDir]);

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

  function SortBtn({ col, label }: { col: typeof sortBy; label: string }) {
    const active = sortBy === col;
    return (
      <button onClick={() => toggleSort(col)} className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${active ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'}`}>
        {label}
        <span>{active ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}</span>
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dominant</h1>
            <p className="text-sm text-gray-500">Funil de Prospecção – Coletor</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href="/kanban" className="px-4 py-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors">
              Kanban
            </Link>
            <Link href="/config" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Classificação
            </Link>
            <Link href="/roteiros" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Roteiros
            </Link>
            <Link href="/guia" className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              Guia
            </Link>
            <button
              onClick={() => exportCSV(filtered)}
              className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Exportar CSV
            </button>
            {leads.length > 0 && !confirmClear && (
              <button
                onClick={() => setConfirmClear(true)}
                className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Limpar leads
              </button>
            )}
            {confirmClear && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5">
                <span className="text-xs text-red-700 font-medium">Apagar tudo?</span>
                <button onClick={clearLeads} className="text-xs text-white bg-red-600 hover:bg-red-700 px-2 py-1 rounded">Sim</button>
                <button onClick={() => setConfirmClear(false)} className="text-xs text-red-600 hover:text-red-800">Não</button>
              </div>
            )}
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              + Pedir rodada
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-6 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total de leads', value: stats.total, color: 'text-gray-900' },
            { label: 'Prioridade 1', value: stats.p1, color: 'text-red-600' },
            { label: 'Prioridade 2', value: stats.p2, color: 'text-amber-600' },
            { label: 'A contatar', value: stats.aContatar, color: 'text-green-600' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 px-5 py-4">
              <p className="text-xs text-gray-500 font-medium">{s.label}</p>
              <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Top 10 */}
        {top10.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">Top {top10.length} — melhores leads ativos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {top10.map((l, i) => (
                <Link
                  key={l.id}
                  href={`/call/${l.id}`}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3 hover:border-blue-400 hover:shadow-sm transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400 font-medium">#{i + 1}</span>
                    <span className={`text-xs font-bold ${l.score >= 8 ? 'text-red-600' : l.score >= 5 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {l.score} pts
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 leading-snug">{l.nome}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">{l.localizacao}</p>
                  <StatusBadge s={l.status} />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 mb-4 flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Buscar empresa, cidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-48 text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400"
          />
          <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 bg-white">
            <option value="">Todas as categorias</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterPrio} onChange={e => setFilterPrio(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 bg-white">
            <option value="">Todas as prioridades</option>
            <option value="1">Prioridade 1</option>
            <option value="2">Prioridade 2</option>
            <option value="3">Prioridade 3</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 bg-white">
            <option value="">Todos os status</option>
            {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button
            onClick={() => setFilterNaoLigado(v => !v)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${filterNaoLigado ? 'bg-orange-100 text-orange-700 border-orange-200' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            📵 Ainda não liguei
          </button>
          {(search || filterCat || filterPrio || filterStatus || filterNaoLigado) && (
            <button onClick={() => { setSearch(''); setFilterCat(''); setFilterPrio(''); setFilterStatus(''); setFilterNaoLigado(false); }} className="text-sm text-gray-500 hover:text-gray-900">
              Limpar filtros
            </button>
          )}
          <span className="ml-auto text-xs text-gray-400">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          {loading ? (
            <div className="py-20 text-center text-gray-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-gray-400 mb-3">{leads.length === 0 ? 'Nenhum lead ainda.' : 'Nenhum resultado para os filtros.'}</p>
              {leads.length === 0 && (
                <button onClick={() => setShowModal(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                  Pedir primeira rodada
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide w-8">#</th>
                    <th className="text-left px-4 py-3"><SortBtn col="nome" label="Empresa" /></th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Localização</th>
                    <th className="text-left px-4 py-3"><SortBtn col="score" label="Score" /></th>
                    <th className="text-left px-4 py-3"><SortBtn col="prioridade" label="Prior." /></th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ligações</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Próximo passo</th>
                    <th className="px-4 py-3 w-24"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((lead, idx) => (
                    <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <Link href={`/call/${lead.id}`} className="font-medium text-gray-900 hover:text-blue-600 transition-colors">
                          {lead.nome}
                        </Link>
                      </td>
                      <td className="px-4 py-3"><CategoriaBadge c={lead.categoria} /></td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{lead.localizacao}</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold text-sm ${lead.score >= 8 ? 'text-red-600' : lead.score >= 5 ? 'text-amber-600' : 'text-gray-400'}`}>
                          {lead.score}
                        </span>
                      </td>
                      <td className="px-4 py-3"><PriorityBadge p={lead.prioridade} /></td>
                      <td className="px-4 py-3"><StatusBadge s={lead.status} /></td>
                      <td className="px-4 py-3">
                        {(lead.chamadas ?? []).length === 0 ? (
                          <span className="text-xs text-gray-400">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-700">
                            📞 {lead.chamadas.length}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate text-xs">{lead.proximoPasso}</td>
                      <td className="px-4 py-3">
                        <Link href={`/call/${lead.id}`} className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors">
                          Ligar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {showModal && <RunRoundModal onClose={() => setShowModal(false)} onRefresh={handleRefresh} />}

      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-bottom-2">
          {toast}
        </div>
      )}
    </div>
  );
}
