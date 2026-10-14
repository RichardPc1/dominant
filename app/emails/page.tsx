'use client';
import { t } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lead, TipoEmail } from '@/lib/types';
import Icon from '../components/Icon';

const TIER1: TipoEmail[] = ['Dono', 'Proprietário', 'Diretor', 'Gerente'];
const TIER2: TipoEmail[] = ['Responsável TI', 'Comercial', 'Compras', 'RH', 'Outro'];

interface EmailRow {
  lead: Lead;
  endereco: string;
  classificacao: TipoEmail;
  tier: 1 | 2 | 3;
}

function tierOf(c: TipoEmail): 1 | 2 | 3 {
  if (TIER1.includes(c)) return 1;
  if (TIER2.includes(c)) return 2;
  return 3;
}

const TIER_CONFIG = {
  1: { label: 'Tier 1 — Decisor / Dono', curto: 'Decisores', tile: 'from-emerald-500 to-green-600', badge: 'bg-emerald-100 text-emerald-800', faixa: 'border-l-emerald-500' },
  2: { label: 'Tier 2 — Contato Pessoal / Área', curto: 'Contatos por área', tile: 'from-blue-500 to-indigo-600', badge: 'bg-blue-100 text-blue-800', faixa: 'border-l-blue-500' },
  3: { label: 'Tier 3 — E-mail Genérico de Setor', curto: 'E-mails gerais', tile: 'from-slate-400 to-slate-600', badge: 'bg-gray-100 text-gray-700', faixa: 'border-l-gray-400' },
};

function CopyButton({ text, rotulo }: { text: string; rotulo?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className={`shrink-0 text-xs font-medium rounded-lg border transition-colors ${rotulo ? 'h-9 px-3' : 'px-2 py-1'} ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'}`}
    >
      {copied ? t("✓ copiado") : (rotulo ?? t("copiar"))}
    </button>
  );
}

export default function EmailsPage() {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/leads')
      .then(r => r.json())
      .then((leads: Lead[]) => {
        const result: EmailRow[] = [];
        for (const lead of leads) {
          for (const e of lead.emails ?? []) {
            result.push({ lead, endereco: e.endereco, classificacao: e.classificacao, tier: tierOf(e.classificacao) });
          }
        }
        result.sort((a, b) => a.tier - b.tier || a.lead.nome.localeCompare(b.lead.nome));
        setRows(result);
        setLoading(false);
      });
  }, []);

  const filtered = search
    ? rows.filter(r =>
        r.lead.nome.toLowerCase().includes(search.toLowerCase()) ||
        r.endereco.toLowerCase().includes(search.toLowerCase()) ||
        r.classificacao.toLowerCase().includes(search.toLowerCase())
      )
    : rows;

  const byTier = (tier: 1 | 2 | 3) => filtered.filter(r => r.tier === tier);

  if (loading) return <div className="min-h-full py-20 flex items-center justify-center text-gray-400">{t("Carregando...")}</div>;

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Cabeçalho da página */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("E-mails para Prospecção")}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{rows.length} {t("e-mails")} · {t("organizados por nível de contato")}</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Icon name="busca" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t("Buscar lead ou email...")}
              className="w-full h-10 text-sm bg-white border border-gray-200 rounded-xl pl-9 pr-3 outline-none focus:border-blue-400 shadow-sm"
            />
          </div>
        </div>

        {/* Resumo por tier */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {([1, 2, 3] as const).map(tier => {
            const cfg = TIER_CONFIG[tier];
            return (
              <a key={tier} href={`#tier-${tier}`} className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4 flex items-center gap-4 hover:border-blue-300 hover:shadow-md transition-all">
                <span className={`grid place-items-center w-11 h-11 rounded-xl bg-gradient-to-br ${cfg.tile} text-white shadow-md shrink-0`}>
                  <Icon name="emails" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500 font-medium truncate">Tier {tier} · {t(cfg.curto)}</p>
                  <p className="text-2xl font-bold tracking-tight text-gray-900 tabular">{byTier(tier).length}</p>
                </div>
              </a>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm py-16 text-center text-gray-400">{t("Nenhum e-mail encontrado.")}</div>
        )}

        {([1, 2, 3] as const).map(tier => {
          const tierRows = byTier(tier);
          if (tierRows.length === 0) return null;
          const cfg = TIER_CONFIG[tier];
          return (
            <section key={tier} id={`tier-${tier}`} className="scroll-mt-6 bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-gray-100 flex-wrap">
                <span className={`grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br ${cfg.tile} text-white shadow-sm shrink-0`}>
                  <Icon name="emails" className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-bold text-gray-900">{t(cfg.label)}</h2>
                  <p className="text-xs text-gray-400">{tierRows.length} {t("e-mails")}</p>
                </div>
                <CopyButton text={tierRows.map(r => r.endereco).join(', ')} rotulo={t("Copiar todos")} />
              </div>

              <div className="divide-y divide-gray-100">
                {tierRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 sm:px-5 py-3 hover:bg-blue-50/40 transition-colors flex-wrap sm:flex-nowrap">
                    <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 text-xs font-bold shrink-0">
                      {r.lead.nome.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-40">
                      <Link href={`/call/${r.lead.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                        {r.lead.nome}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">{r.lead.localizacao} · {t(r.lead.categoria)}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${cfg.badge}`}>{t(r.classificacao)}</span>
                    <a href={`mailto:${r.endereco}`} className="text-sm text-gray-700 hover:text-blue-600 select-all break-all">{r.endereco}</a>
                    <CopyButton text={r.endereco} />
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
