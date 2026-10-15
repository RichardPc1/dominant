'use client';
import { t } from '@/lib/i18n';
import { Lead } from '@/lib/types';
import { ETAPAS, etapaDef, patchParaEtapa } from '@/lib/funil';
import Timeline from './Timeline';

/**
 * Painel de fechamento de um lead: fase do funil + linha do tempo (reuniões,
 * tarefas, pendências e notas). Controlado pelo `lead`; persiste via `onPatch`.
 * Mesmo componente no board de Clientes e na ficha — um dado só, dois lugares.
 */
export default function FunilCliente({
  lead, onPatch,
}: {
  lead: Lead;
  onPatch: (u: Partial<Lead>) => void | Promise<void>;
}) {
  const atual = lead.etapaFunil;

  function mudarEtapa(e: Lead['etapaFunil']) {
    if (!e || e === atual) return;
    onPatch(patchParaEtapa(e));
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

      {/* Linha do tempo */}
      <Timeline lead={lead} onPatch={onPatch} />

      {atual && (
        <p className="text-[11px] text-gray-400">
          {t("Fase atual:")} <strong className="text-gray-600">{etapaDef(atual).icone} {etapaDef(atual).titulo}</strong> {t("· isto não mexe no kanban")}
        </p>
      )}
    </div>
  );
}
