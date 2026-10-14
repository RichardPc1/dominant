'use client';
import { t } from '@/lib/i18n';
import { useState } from 'react';
import { Lead, Reuniao, StatusReuniao, TipoReuniao } from '@/lib/types';
import {
  ETAPAS, STATUS_REUNIAO, STATUS_REUNIAO_COR, TIPOS_REUNIAO, TIPO_REUNIAO_ICONE,
  contarReunioes, etapaDef, patchParaEtapa,
} from '@/lib/funil';

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Painel de fechamento de um lead: fase do funil + histórico de reuniões.
 * Controlado pelo `lead` recebido; persiste via `onPatch`. Mesmo componente
 * aparece no board de Clientes e na ficha do lead — um dado só, dois lugares.
 */
export default function FunilCliente({
  lead, onPatch,
}: {
  lead: Lead;
  onPatch: (u: Partial<Lead>) => void | Promise<void>;
}) {
  const reunioes = lead.reunioes ?? [];
  const cont = contarReunioes(lead);
  const atual = lead.etapaFunil;

  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoReuniao>('POC');
  const [data, setData] = useState(hojeISO());
  const [hora, setHora] = useState('');
  const [status, setStatus] = useState<StatusReuniao>('Agendada');
  const [nota, setNota] = useState('');

  function mudarEtapa(e: Lead['etapaFunil']) {
    if (!e || e === atual) return;
    onPatch(patchParaEtapa(e));
  }

  function registrar() {
    const r: Reuniao = {
      id: Math.random().toString(36).slice(2),
      tipo, data, hora: hora.trim() || undefined, status, notas: nota.trim(),
      registradaEm: new Date().toISOString(),
    };
    onPatch({ reunioes: [...reunioes, r] });
    setAberto(false); setNota(''); setHora(''); setStatus('Agendada'); setTipo('POC'); setData(hojeISO());
  }

  function mudarStatusReuniao(id: string, novo: StatusReuniao) {
    onPatch({ reunioes: reunioes.map(r => (r.id === id ? { ...r, status: novo } : r)) });
  }

  function remover(id: string) {
    onPatch({ reunioes: reunioes.filter(r => r.id !== id) });
  }

  return (
    <div className="space-y-4">
      {/* Fase do funil */}
      <div>
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{t("Fase do fechamento")}</p>
        <div className="flex flex-wrap gap-1.5">
          {ETAPAS.map(e => {
            const ativo = e.id === atual;
            return (
              <button
                key={e.id}
                onClick={() => mudarEtapa(e.id)}
                title={t(e.dica)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-colors ${
                  ativo
                    ? `${e.selo} border-transparent ring-2 ring-offset-1 ring-gray-300`
                    : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {e.icone} {t(e.titulo)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Resumo das reuniões */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 text-gray-600 px-2 py-1 font-medium">
          🗓️ {t(cont.total === 1 ? '{0} reunião' : '{0} reuniões', { 0: cont.total })}
        </span>
        {cont.realizadas > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 text-emerald-800 px-2 py-1 font-medium">✅ {t(cont.realizadas > 1 ? '{0} feitas' : '{0} feita', { 0: cont.realizadas })}</span>}
        {cont.faltou > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 text-red-700 px-2 py-1 font-medium">❌ {cont.faltou} {t("faltou")}</span>}
        {cont.agendadas > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 text-blue-800 px-2 py-1 font-medium">📅 {cont.agendadas} {t("agendada")}{cont.agendadas > 1 ? 's' : ''}</span>}
      </div>

      {/* Lista de reuniões */}
      {reunioes.length > 0 && (
        <div className="space-y-2">
          {[...reunioes].reverse().map(r => (
            <div key={r.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-gray-700">{TIPO_REUNIAO_ICONE[r.tipo]} {t(r.tipo)}</span>
                <span className="text-xs text-gray-400">{r.data.split('-').reverse().join('/')}{r.hora ? ` · ${r.hora}` : ''}</span>
                <select
                  value={r.status}
                  onChange={e => mudarStatusReuniao(r.id, e.target.value as StatusReuniao)}
                  className={`ml-auto text-[11px] font-semibold rounded px-1.5 py-0.5 border-0 outline-none cursor-pointer ${STATUS_REUNIAO_COR[r.status]}`}
                >
                  {STATUS_REUNIAO.map(s => <option key={s} value={s}>{t(s)}</option>)}
                </select>
                <button onClick={() => remover(r.id)} className="text-[11px] text-gray-300 hover:text-red-500" title={t("Remover")}>✕</button>
              </div>
              {r.notas && <p className="text-sm text-gray-700 mt-1.5 whitespace-pre-line">{r.notas}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Registrar reunião */}
      {!aberto ? (
        <button
          onClick={() => setAberto(true)}
          className="w-full text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg py-2 border border-dashed border-indigo-200"
        >
          {t("+ Registrar reunião")}
        </button>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_REUNIAO.map(tp => (
              <button
                key={tp}
                onClick={() => setTipo(tp)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${tipo === tp ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
              >
                {TIPO_REUNIAO_ICONE[tp]} {t(tp)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="date" value={data} onChange={e => setData(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400" />
            <input type="text" value={hora} onChange={e => setHora(e.target.value)} placeholder="14:30" className="w-24 text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-blue-400" />
            <select value={status} onChange={e => setStatus(e.target.value as StatusReuniao)} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-blue-400">
              {STATUS_REUNIAO.map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
          </div>
          <textarea
            value={nota} onChange={e => setNota(e.target.value)} rows={2}
            placeholder={t("O que foi tratado, próximos passos, objeções...")}
            className="w-full text-sm border border-gray-300 rounded-lg p-2.5 resize-none outline-none focus:border-blue-400"
          />
          <div className="flex gap-2">
            <button onClick={registrar} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700">{t("Salvar reunião")}</button>
            <button onClick={() => setAberto(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">{t("Cancelar")}</button>
          </div>
        </div>
      )}

      {atual && (
        <p className="text-[11px] text-gray-400">
          {t("Fase atual:")} <strong className="text-gray-600">{etapaDef(atual).icone} {etapaDef(atual).titulo}</strong> {t("· isto não mexe no kanban")}
        </p>
      )}
    </div>
  );
}
