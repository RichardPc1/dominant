'use client';
import { t } from '@/lib/i18n';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { EtapaFunil, Lead } from '@/lib/types';
import {
  ETAPAS, LADO_COR, LADO_LABEL, chipProximaReuniao, contarReunioes,
  estaNoFunil, etapaDef, patchParaEtapa, patchSairDoFunil, tarefasAbertas,
} from '@/lib/funil';
import Timeline from '../../components/Timeline';
import { CategoriaBadge } from '../../components/Badges';
import Icon from '../../components/Icon';
import { atualizarLeadEmCache, guardarLeadsEmCache, leadsEmCache } from '@/lib/leads-cache';

const soDigitos = (s: string) => (s || '').replace(/\D/g, '');
const brData = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : t('a confirmar'));

function CopyBtn({ value }: { value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(value); setOk(true); setTimeout(() => setOk(false), 1200); }}
      className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500"
    >
      {ok ? '✓' : t("copiar")}
    </button>
  );
}

export default function ClientePage() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<Lead | null>(() => leadsEmCache()?.find(l => l.id === id) ?? null);
  const [carregando, setCarregando] = useState(!lead);

  const carregar = useCallback(async () => {
    try {
      const data: Lead[] = await fetch('/api/leads', { cache: 'no-store' }).then(r => r.json());
      if (Array.isArray(data)) { guardarLeadsEmCache(data); setLead(data.find(l => l.id === id) ?? null); }
    } catch {}
    setCarregando(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  async function patch(updates: Partial<Lead>) {
    setLead(prev => (prev ? { ...prev, ...updates } : prev));
    atualizarLeadEmCache(id, updates);
    await fetch(`/api/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
    });
  }

  function sair() {
    if (!lead) return;
    const n = (lead.timeline ?? lead.reunioes ?? []).length;
    const msg = n > 0
      ? t('Tirar {0} do funil? Os {1} itens da linha do tempo serão apagados. O lead continua no kanban.', { 0: lead.nome, 1: n })
      : t('Tirar {0} do funil? O lead continua no kanban.', { 0: lead.nome });
    if (!window.confirm(msg)) return;
    patch(patchSairDoFunil());
  }

  if (carregando && !lead) return <div className="py-20 text-center text-gray-400">{t("Carregando...")}</div>;
  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center text-center px-6 py-24">
        <p className="text-5xl mb-3">🤷</p>
        <h2 className="text-lg font-bold text-gray-800">{t("Cliente não encontrado")}</h2>
        <Link href="/clientes" className="mt-4 text-sm font-semibold text-indigo-600 hover:underline">← {t("Voltar pro funil")}</Link>
      </div>
    );
  }

  const noFunil = estaNoFunil(lead);
  const def = noFunil ? etapaDef(lead.etapaFunil!) : null;
  const cr = contarReunioes(lead);
  const chip = chipProximaReuniao(lead);
  const abertas = tarefasAbertas(lead);
  const fone = soDigitos(lead.telefone);
  const email = lead.emails?.[0]?.endereco ?? '';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* trilha de volta */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
        <Link href="/clientes" className="inline-flex items-center gap-1 hover:text-gray-800"><Icon name="clientes" className="w-4 h-4" /> {t("Clientes")}</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate">{lead.nome}</span>
      </div>

      {/* cabeçalho */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {def && <div className="h-1.5" style={{ background: def.cor }} />}
        <div className="p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{lead.nome}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{[lead.localizacao, lead.segmento].filter(Boolean).join(' · ')}</p>
            <div className="mt-2 flex items-center gap-2 flex-wrap"><CategoriaBadge c={lead.categoria} />{chip && <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${chip.classes}`}>🗓️ {chip.texto}</span>}</div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link href={`/call/${lead.id}`} className="inline-flex items-center gap-1.5 h-9 text-sm font-semibold text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 hover:bg-gray-100"><Icon name="telefone" className="w-4 h-4" /> {t("Ficha de ligação")}</Link>
            {noFunil && <button onClick={sair} className="h-9 text-xs text-gray-400 hover:text-red-500 px-2">{t("Tirar do funil")}</button>}
          </div>
        </div>

        {/* contato */}
        {(fone || email || lead.contato) && (
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm border-t border-gray-100 pt-3">
            {fone && <span className="flex items-center gap-2"><a href={`tel:${fone}`} className="text-blue-700 font-medium hover:underline">📞 {lead.telefone}</a><CopyBtn value={lead.telefone} /></span>}
            {email && <span className="flex items-center gap-2"><a href={`mailto:${email}`} className="text-emerald-700 font-medium hover:underline break-all">✉️ {email}</a><CopyBtn value={email} /></span>}
            {lead.contato && !fone && <span className="text-gray-600">{lead.contato}</span>}
          </div>
        )}
        </div>
      </div>

      {!noFunil ? (
        <div className="mt-6 rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500 mb-3">{t("Este lead ainda não está no funil de fechamento.")}</p>
          <button onClick={() => patch({ etapaFunil: 'poc-marcada' as const })} className="text-sm font-semibold bg-gray-900 text-white rounded-lg px-4 py-2 hover:bg-gray-700">{t("🎯 Colocar no funil (POC marcada)")}</button>
          <p className="text-[11px] text-gray-400 mt-2">{t("Isso só marca a fase de fechamento — o lead continua onde está no kanban.")}</p>
        </div>
      ) : (
        <>
          {/* fase do fechamento — faixa larga */}
          <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">{t("Fase do fechamento")}</p>
            <div className="flex flex-wrap gap-2">
              {ETAPAS.map(e => {
                const ativo = e.id === lead.etapaFunil;
                return (
                  <button key={e.id} onClick={() => { if (e.id !== lead.etapaFunil) patch(patchParaEtapa(e.id as EtapaFunil)); }} title={t(e.dica)}
                    className={`px-3 py-1.5 text-sm font-semibold rounded-xl border transition-colors ${ativo ? `${e.selo} border-transparent ring-2 ring-offset-1 ring-gray-300` : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}>
                    {e.icone} {t(e.titulo)}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-3">{t("Fase atual:")} <strong className="text-gray-600">{def!.icone} {t(def!.titulo)}</strong> {t("· isto não mexe no kanban")}</p>
          </div>

          {/* duas colunas: resumo + linha do tempo */}
          <div className="mt-6 grid gap-6 lg:grid-cols-[18rem_1fr] items-start">
            <aside className="space-y-4 lg:sticky lg:top-4">
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{t("Resumo")}</p>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-lg bg-gray-100 text-gray-600 px-2 py-1 font-semibold">🤝 {cr.total} {t(cr.total === 1 ? 'reunião' : 'reuniões')}</span>
                  {cr.realizadas > 0 && <span className="rounded-lg bg-emerald-100 text-emerald-800 px-2 py-1 font-semibold">✅ {cr.realizadas}</span>}
                  {cr.agendadas > 0 && <span className="rounded-lg bg-blue-100 text-blue-800 px-2 py-1 font-semibold">📅 {cr.agendadas}</span>}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{t("Pendências em aberto")}</p>
                {abertas.length === 0 ? (
                  <p className="text-xs text-gray-400">{t("Nada em aberto. 🎉")}</p>
                ) : (
                  <ul className="space-y-2">
                    {abertas.map(ev => (
                      <li key={ev.id} className="text-sm text-gray-700">
                        <div className="flex items-start gap-2">
                          <span className="text-gray-300 mt-0.5">•</span>
                          <div className="min-w-0">
                            <p className="leading-snug">{ev.titulo}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              {ev.lado && <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${LADO_COR[ev.lado]}`}>{t(LADO_LABEL[ev.lado])}</span>}
                              {ev.prazo && <span className="text-[10px] text-gray-400">{t("prazo")} {brData(ev.prazo)}</span>}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </aside>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-3">{t("Linha do tempo")}</p>
              <Timeline lead={lead} onPatch={patch} />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
