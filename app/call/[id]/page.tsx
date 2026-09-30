'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lead, Status, Chamada, ResultadoChamada, Categoria, TipoEmail, EmailContato } from '@/lib/types';
import { colunaPorChamada } from '@/lib/kanban';
import { DEFAULT_CONFIG, OutcomesConfig } from '@/lib/outcomes';
import LiveCall from '@/app/components/LiveCall';
import EmailPanel from '@/app/components/EmailPanel';
import { ROTEIROS } from '@/lib/roteiros-data';
import { PriorityBadge, StatusBadge, CategoriaBadge } from '@/app/components/Badges';

const RESULTADOS: { label: string; value: ResultadoChamada; color: string }[] = [
  { label: 'Atendeu', value: 'Atendeu', color: 'bg-green-600 hover:bg-green-700 text-white' },
  { label: 'Não atendeu', value: 'Não atendeu', color: 'bg-amber-500 hover:bg-amber-600 text-white' },
  { label: 'Caixa postal', value: 'Caixa postal', color: 'bg-orange-400 hover:bg-orange-500 text-white' },
  { label: 'Callback agendado', value: 'Callback agendado', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  { label: 'Sem interesse', value: 'Sem interesse', color: 'bg-red-100 hover:bg-red-200 text-red-700' },
  { label: 'Número errado', value: 'Número errado', color: 'bg-gray-200 hover:bg-gray-300 text-gray-700' },
];

const STATUS_ACTIONS: { label: string; status: Status; color: string }[] = [
  { label: 'Contatado', status: 'Contatado', color: 'bg-teal-600 hover:bg-teal-700 text-white' },
  { label: 'Em conversa', status: 'Em conversa', color: 'bg-cyan-600 hover:bg-cyan-700 text-white' },
  { label: 'Reunião marcada', status: 'Reunião marcada', color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
  { label: 'Proposta enviada', status: 'Proposta enviada', color: 'bg-purple-600 hover:bg-purple-700 text-white' },
  { label: 'Fechado', status: 'Fechado', color: 'bg-red-100 hover:bg-red-200 text-red-700' },
  { label: 'Pausar', status: 'Pausado', color: 'bg-gray-100 hover:bg-gray-200 text-gray-700' },
];

const RESULTADO_COLORS: Record<ResultadoChamada, string> = {
  'Atendeu': 'bg-green-100 text-green-800',
  'Não atendeu': 'bg-amber-100 text-amber-800',
  'Caixa postal': 'bg-orange-100 text-orange-800',
  'Callback agendado': 'bg-blue-100 text-blue-800',
  'Sem interesse': 'bg-red-100 text-red-800',
  'Número errado': 'bg-gray-100 text-gray-700',
};

const TIPOS_EMAIL: TipoEmail[] = [
  'Dono', 'Proprietário', 'Diretor', 'Gerente', 'Responsável TI',
  'Comercial', 'Compras', 'RH', 'Setor', 'Outro',
];

const CATEGORIAS: Categoria[] = [
  'ERP / PCP', 'Integrador de automação', 'Fabricante de máquinas',
  'Cliente direto', 'Automação RPA', 'Polo / Associação', 'Programa / Fomento', 'Concorrente',
];

function nowBR() {
  const d = new Date();
  return {
    data: d.toLocaleDateString('pt-BR'),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

// Formata telefone BR na máscara (XX) XXXX-XXXX ou (XX) XXXXX-XXXX.
// Retorna '' se o conteúdo não parecer um telefone válido (ex: uma data).
function formatPhone(raw: string): string {
  let n = (raw || '').replace(/\D/g, '');
  if ((n.length === 12 || n.length === 13) && n.startsWith('55')) n = n.slice(2);
  if (n.length === 11) return `(${n.slice(0, 2)}) ${n.slice(2, 7)}-${n.slice(7)}`;
  if (n.length === 10) return `(${n.slice(0, 2)}) ${n.slice(2, 6)}-${n.slice(6)}`;
  return '';
}

// Garante que a URL tenha protocolo, pra copiar e colar direto no navegador.
function normalizeSite(raw: string): string {
  const s = (raw || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

function CopyLine({ icon, value }: { icon: string; value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-base">{icon}</span>
      <span className="font-medium text-gray-800 break-all select-all">{value}</span>
      <button
        onClick={copy}
        className="shrink-0 text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
      >
        {copied ? '✓ copiado' : 'copiar'}
      </button>
    </div>
  );
}

export default function CallPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [config, setConfig] = useState<OutcomesConfig>(DEFAULT_CONFIG);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Call log state
  const [registering, setRegistering] = useState(false);
  const [callNota, setCallNota] = useState('');
  const [callResultado, setCallResultado] = useState<ResultadoChamada | null>(null);

  // Email contacts state
  const [emailsList, setEmailsList] = useState<EmailContato[]>([]);
  const [newEmailAddr, setNewEmailAddr] = useState('');
  const [newEmailTipo, setNewEmailTipo] = useState<TipoEmail>('Setor');
  const [emailSaving, setEmailSaving] = useState(false);

  // Quick edit state
  const [editOpen, setEditOpen] = useState(false);
  const [editFields, setEditFields] = useState<Partial<Lead>>({});
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    fetch('/api/outcomes').then(r => r.json()).then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/leads').then(r => r.json()).then((data: Lead[]) => {
      setLeads(data);
      const found = data.find(l => l.id === id) ?? null;
      setLead(found);
      if (found) {
        setNotes(found.notasLigacao ?? '');
        setEmailsList(found.emails ?? []);
        setEditFields({
          nome: found.nome,
          categoria: found.categoria,
          localizacao: found.localizacao,
          contato: found.contato,
          telefone: found.telefone,
          site: found.site,
          perfil: found.perfil,
          porqueFazSentido: found.porqueFazSentido,
          proximoPasso: found.proximoPasso,
        });
      }
    });
  }, [id]);

  const idx = leads.findIndex(l => l.id === id);
  const prevLead = idx > 0 ? leads[idx - 1] : null;
  const nextLead = idx < leads.length - 1 ? leads[idx + 1] : null;

  async function patch(updates: Partial<Lead>) {
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }

  async function saveNotes() {
    if (!lead) return;
    setSaving(true);
    await patch({ notasLigacao: notes });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function updateStatus(status: Status) {
    if (!lead) return;
    const now = nowBR().data;
    await patch({ status, ultimaInteracao: now, notasLigacao: notes });
    setLead(prev => prev ? { ...prev, status, ultimaInteracao: now } : prev);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function registrarChamada() {
    if (!lead || !callResultado) return;
    const { data, hora } = nowBR();
    const chamada: Chamada = {
      id: Math.random().toString(36).slice(2),
      data,
      hora,
      resultado: callResultado,
      notas: callNota,
    };
    const novasChamadas = [...(lead.chamadas ?? []), chamada];
    // Cada ligação nova reposiciona o lead no kanban e limpa o agendamento antigo.
    const autoStatus: Partial<Lead> = {
      coluna: colunaPorChamada(callResultado, callNota),
      agendaData: '',
      agendaHora: '',
    };
    if (callResultado === 'Atendeu' && lead.status === 'A contatar') {
      autoStatus.status = 'Contatado';
    }
    await patch({ chamadas: novasChamadas, ultimaInteracao: data, ...autoStatus });
    setLead(prev => prev ? { ...prev, chamadas: novasChamadas, ultimaInteracao: data, ...autoStatus } : prev);
    setCallNota('');
    setCallResultado(null);
    setRegistering(false);
  }

  async function saveEdit() {
    if (!lead) return;
    setEditSaving(true);
    await patch(editFields);
    setLead(prev => prev ? { ...prev, ...editFields } : prev);
    setEditSaving(false);
    setEditOpen(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function addEmail() {
    const addr = newEmailAddr.trim();
    if (!addr || !lead) return;
    const updated = [...emailsList, { endereco: addr, classificacao: newEmailTipo }];
    setEmailSaving(true);
    await patch({ emails: updated });
    setEmailsList(updated);
    setNewEmailAddr('');
    setNewEmailTipo('Setor');
    setEmailSaving(false);
  }

  async function removeEmail(idx: number) {
    if (!lead) return;
    const updated = emailsList.filter((_, i) => i !== idx);
    setEmailSaving(true);
    await patch({ emails: updated });
    setEmailsList(updated);
    setEmailSaving(false);
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400">
        Carregando...
      </div>
    );
  }

  const chamadas = lead.chamadas ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← Voltar</Link>
        <span className="text-xs text-gray-400">{idx + 1} / {leads.length}</span>
        {saved && <span className="text-xs text-green-600 font-medium">Salvo ✓</span>}
        <div className="ml-auto flex gap-2">
          {prevLead && (
            <Link href={`/call/${prevLead.id}`} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              ← Anterior
            </Link>
          )}
          {nextLead && (
            <Link href={`/call/${nextLead.id}`} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
              Próximo →
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* Company header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{lead.nome}</h1>
              <p className="text-sm text-gray-500 mt-1">{lead.localizacao} · {lead.segmento || lead.porte}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <PriorityBadge p={lead.prioridade} />
              <StatusBadge s={lead.status} />
              {chamadas.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  📞 {chamadas.length} tentativa{chamadas.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <CategoriaBadge c={lead.categoria} />
          {lead.cnpj && <p className="text-xs text-gray-400 mt-2">CNPJ: {lead.cnpj}</p>}
        </div>

        <LiveCall lead={lead} config={config} onSaved={u => setLead(prev => prev ? { ...prev, ...u } : prev)} />
        <EmailPanel key={lead.emailRascunho?.atualizadoEm ?? 'sem'} lead={lead} followUpDias={config.followUpDias} onChange={u => setLead(prev => prev ? { ...prev, ...u } : prev)} />

        {/* CALL LOG */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Histórico de ligações
              {chamadas.length > 0 && (
                <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-normal">
                  {chamadas.length}
                </span>
              )}
            </h2>
            {!registering && (
              <button
                onClick={() => setRegistering(true)}
                className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                + Registrar ligação
              </button>
            )}
          </div>

          {chamadas.length === 0 && !registering && (
            <p className="text-sm text-gray-400 italic">Nenhuma ligação registrada ainda.</p>
          )}

          {chamadas.length > 0 && (
            <div className="space-y-2 mb-4">
              {[...chamadas].reverse().map(c => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded ${RESULTADO_COLORS[c.resultado]}`}>
                        {c.resultado}
                      </span>
                      <span className="text-xs text-gray-400">{c.data} às {c.hora}</span>
                    </div>
                    {c.classificacao && (() => { const o = config.outcomes.find(x => x.id === c.classificacao); return o ? <span className="text-xs text-gray-500">{o.emoji} {o.label} → {o.proximaAcao}</span> : null; })()}
                    {c.notas && <p className="text-sm text-gray-700 mt-1">{c.notas}</p>}
                    {c.transcricao && (
                      <details className="mt-1">
                        <summary className="text-xs text-blue-600 cursor-pointer">ver transcrição</summary>
                        <p className="text-xs text-gray-600 mt-1 whitespace-pre-line">{c.transcricao}</p>
                      </details>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {registering && (
            <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">O que aconteceu?</p>
              <div className="flex flex-wrap gap-2">
                {RESULTADOS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => setCallResultado(r.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                      callResultado === r.value
                        ? r.color + ' ring-2 ring-offset-1 ring-gray-400'
                        : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <textarea
                value={callNota}
                onChange={e => setCallNota(e.target.value)}
                placeholder="Nota rápida (opcional): o que foi dito, quem atendeu, próximo passo..."
                rows={2}
                className="w-full text-sm border border-gray-300 rounded-lg p-2.5 resize-none outline-none focus:border-blue-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={registrarChamada}
                  disabled={!callResultado}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  Salvar
                </button>
                <button
                  onClick={() => { setRegistering(false); setCallNota(''); setCallResultado(null); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* What they do */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">O que fazem</h2>
          <p className="text-gray-800 text-sm leading-relaxed">{lead.perfil || '—'}</p>
        </div>

        {/* Why it makes sense */}
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-6">
          <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">Por que faz sentido</h2>
          <p className="text-gray-800 text-sm leading-relaxed">{lead.porqueFazSentido || '—'}</p>
          {lead.fonte && (
            <a href={lead.fonte} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-2 block truncate">
              {lead.fonte}
            </a>
          )}
        </div>

        {/* Roteiro link */}
        {(() => {
          const r = ROTEIROS.find(x => x.categoria === lead.categoria);
          if (!r) return null;
          return (
            <Link
              href={`/roteiros?cat=${r.id}`}
              className="flex items-center justify-between bg-indigo-50 border border-indigo-200 rounded-2xl p-5 hover:bg-indigo-100 transition-colors group"
            >
              <div>
                <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-0.5">Roteiro de abordagem</p>
                <p className="text-sm font-semibold text-indigo-800">{r.categoria}</p>
                <p className="text-xs text-indigo-500 mt-0.5">{r.tagline}</p>
              </div>
              <span className="text-indigo-400 text-lg group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          );
        })()}

        {/* Contact */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contato / canal de entrada</h2>
          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-line">{lead.contato || 'Não encontrado'}</p>
          <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-gray-100">
            {formatPhone(lead.telefone) ? (
              <CopyLine icon="📞" value={formatPhone(lead.telefone)} />
            ) : (
              <span className="flex items-center gap-2 text-sm text-amber-600">
                <span className="text-base">📞</span>
                <span className="italic">Telefone — capturar manualmente</span>
              </span>
            )}
            {lead.site ? (
              <CopyLine icon="🌐" value={normalizeSite(lead.site)} />
            ) : (
              <span className="flex items-center gap-2 text-sm text-amber-600">
                <span className="text-base">🌐</span>
                <span className="italic">Site — capturar manualmente</span>
              </span>
            )}
          </div>
        </div>

        {/* Emails */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            E-mails
            {emailsList.length > 0 && (
              <span className="ml-2 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-normal">{emailsList.length}</span>
            )}
          </h2>

          {emailsList.length > 0 && (
            <div className="space-y-2 mb-3">
              {emailsList.map((e, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 shrink-0">{e.classificacao}</span>
                  <span className="text-sm text-gray-800 flex-1 break-all select-all">{e.endereco}</span>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(e.endereco); }}
                    className="shrink-0 text-xs px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500"
                  >
                    copiar
                  </button>
                  <button
                    onClick={() => removeEmail(i)}
                    className="shrink-0 text-xs px-2 py-0.5 rounded bg-red-50 hover:bg-red-100 text-red-500"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <input
                type="email"
                value={newEmailAddr}
                onChange={e => setNewEmailAddr(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addEmail()}
                placeholder="novo@email.com.br"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-400"
              />
            </div>
            <select
              value={newEmailTipo}
              onChange={e => setNewEmailTipo(e.target.value as TipoEmail)}
              className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:border-blue-400 bg-white"
            >
              {TIPOS_EMAIL.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button
              onClick={addEmail}
              disabled={!newEmailAddr.trim() || emailSaving}
              className="px-3 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40 transition-colors"
            >
              {emailSaving ? '...' : '+ Add'}
            </button>
          </div>
        </div>

        {/* Next step */}
        <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
          <h2 className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-2">Próximo passo sugerido</h2>
          <p className="text-gray-800 text-sm leading-relaxed">{lead.proximoPasso || '—'}</p>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Observações gerais</h2>
            <button
              onClick={saveNotes}
              disabled={saving}
              className="px-3 py-1 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Contexto da empresa, informações extras, objeções frequentes..."
            rows={4}
            className="w-full text-sm border border-gray-300 rounded-lg p-3 resize-none outline-none focus:border-blue-400 transition-colors"
          />
        </div>

        {/* Status actions */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Atualizar status</h2>
          <div className="flex flex-wrap gap-2">
            {STATUS_ACTIONS.map(a => (
              <button
                key={a.status}
                onClick={() => updateStatus(a.status)}
                disabled={lead.status === a.status}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-40 ${a.color}`}
              >
                {a.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Status atual: <strong className="text-gray-600">{lead.status}</strong>
            {lead.ultimaInteracao && ` · Última interação: ${lead.ultimaInteracao}`}
          </p>
        </div>

        {/* QUICK EDIT / CORRECTION */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <button
            onClick={() => setEditOpen(!editOpen)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Corrigir dados do lead</span>
              <span className="text-xs text-gray-400">— o agente errou algo? Edite aqui</span>
            </div>
            <span className="text-gray-400 text-sm">{editOpen ? '▲' : '▼'}</span>
          </button>

          {editOpen && (
            <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome da empresa</label>
                  <input
                    type="text"
                    value={editFields.nome ?? ''}
                    onChange={e => setEditFields(p => ({ ...p, nome: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Localização</label>
                  <input
                    type="text"
                    value={editFields.localizacao ?? ''}
                    onChange={e => setEditFields(p => ({ ...p, localizacao: e.target.value }))}
                    placeholder="Cidade – UF"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Categoria</label>
                <select
                  value={editFields.categoria ?? lead.categoria}
                  onChange={e => setEditFields(p => ({ ...p, categoria: e.target.value as Categoria }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Contato / canal de entrada</label>
                <input
                  type="text"
                  value={editFields.contato ?? ''}
                  onChange={e => setEditFields(p => ({ ...p, contato: e.target.value }))}
                  placeholder="site, LinkedIn, telefone, e-mail..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                  <input
                    type="text"
                    value={editFields.telefone ?? lead.telefone ?? ''}
                    onChange={e => setEditFields(p => ({ ...p, telefone: e.target.value }))}
                    placeholder="(41) 3333-4444"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Site</label>
                  <input
                    type="text"
                    value={editFields.site ?? lead.site ?? ''}
                    onChange={e => setEditFields(p => ({ ...p, site: e.target.value }))}
                    placeholder="https://www.empresa.com.br"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">O que fazem (perfil)</label>
                <textarea
                  value={editFields.perfil ?? ''}
                  onChange={e => setEditFields(p => ({ ...p, perfil: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Por que faz sentido</label>
                <textarea
                  value={editFields.porqueFazSentido ?? ''}
                  onChange={e => setEditFields(p => ({ ...p, porqueFazSentido: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Próximo passo</label>
                <input
                  type="text"
                  value={editFields.proximoPasso ?? ''}
                  onChange={e => setEditFields(p => ({ ...p, proximoPasso: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={saveEdit}
                  disabled={editSaving}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
                >
                  {editSaving ? 'Salvando...' : 'Salvar correções'}
                </button>
                <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
