'use client';
import { useState } from 'react';
import { EmailRascunho, Lead } from '@/lib/types';
import { somarDias } from '@/lib/outcomes';

export default function EmailPanel({
  lead, followUpDias, onChange,
}: {
  lead: Lead;
  followUpDias: number;
  onChange: (updates: Partial<Lead>) => void;
}) {
  const rasc = lead.emailRascunho;
  const [para, setPara] = useState(rasc?.para ?? '');
  const [assunto, setAssunto] = useState(rasc?.assunto ?? '');
  const [corpo, setCorpo] = useState(rasc?.corpo ?? '');
  const [copiado, setCopiado] = useState(false);
  if (!rasc) return null;

  async function salvar(updates: Partial<Lead>) {
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
    });
    onChange(updates);
  }

  const atual = (status: EmailRascunho['status']): EmailRascunho => ({
    ...rasc!, para, assunto, corpo, status, atualizadoEm: new Date().toISOString(),
  });

  function marcarEnviado() {
    const followUp = somarDias(new Date(), followUpDias);
    salvar({
      emailRascunho: atual('enviado'),
      coluna: 'aguardando',
      agendaData: followUp,
      agendaHora: '',
      followUpEm: followUp,
    });
  }

  const mailto = `mailto:${encodeURIComponent(para)}?subject=${encodeURIComponent(assunto)}&body=${encodeURIComponent(corpo)}`;
  const cor = rasc.status === 'enviado' ? 'border-gray-200' : rasc.status === 'pronto' ? 'border-emerald-300' : 'border-yellow-300';

  return (
    <div className={`bg-white rounded-2xl border ${cor} p-6 space-y-3`}>
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">✉️ E-mail para {lead.nome}</h2>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${rasc.status === 'pronto' ? 'bg-emerald-100 text-emerald-800' : rasc.status === 'enviado' ? 'bg-gray-100 text-gray-600' : 'bg-yellow-100 text-yellow-800'}`}>
          {rasc.status === 'pronto' ? 'rascunho pronto' : rasc.status === 'enviado' ? 'enviado' : 'aguardando redação'}
        </span>
      </div>

      {rasc.status === 'pendente' && (
        <p className="text-sm bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 text-yellow-900">
          O e-mail ainda não foi escrito. No Claude Code, rode <code className="bg-white px-1.5 py-0.5 rounded border">/emails</code> e
          ele escreve um e-mail sob medida para este lead (nicho, conversa e contexto). Depois atualize esta página.
        </p>
      )}

      <input value={para} onChange={e => setPara(e.target.value)} placeholder="Para" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
      <input value={assunto} onChange={e => setAssunto(e.target.value)} placeholder="Assunto" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
      <textarea value={corpo} onChange={e => setCorpo(e.target.value)} rows={10} placeholder="Corpo do e-mail" className="w-full border border-gray-300 rounded px-2 py-2 text-sm" />

      <div className="flex gap-2 flex-wrap items-center">
        <button onClick={() => salvar({ emailRascunho: atual(rasc.status === 'pendente' && corpo ? 'pronto' : rasc.status) })} className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">Salvar edição</button>
        <button
          onClick={() => { navigator.clipboard?.writeText(`Assunto: ${assunto}\n\n${corpo}`); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          {copiado ? '✓ copiado' : 'Copiar texto'}
        </button>
        {para && assunto && corpo && <a href={mailto} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Abrir no e-mail</a>}
        {rasc.status !== 'enviado' && corpo && (
          <button onClick={marcarEnviado} className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg hover:bg-gray-700">
            Marcar como enviado (follow-up em {followUpDias} dias)
          </button>
        )}
        {lead.followUpEm && <span className="text-xs text-gray-500">follow-up: {lead.followUpEm.split('-').reverse().join('/')}</span>}
      </div>
    </div>
  );
}
