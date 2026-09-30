'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Lead, TipoEmail } from '@/lib/types';

const TIER1: TipoEmail[] = ['Dono', 'Proprietário', 'Diretor', 'Gerente'];
const TIER2: TipoEmail[] = ['Responsável TI', 'Comercial', 'Compras', 'RH', 'Outro'];
const TIER3: TipoEmail[] = ['Setor'];

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
  1: { label: 'Tier 1 — Decisor / Dono', color: 'bg-green-50 border-green-200 text-green-700', badge: 'bg-green-100 text-green-800' },
  2: { label: 'Tier 2 — Contato Pessoal / Área', color: 'bg-blue-50 border-blue-200 text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  3: { label: 'Tier 3 — E-mail Genérico de Setor', color: 'bg-gray-50 border-gray-200 text-gray-600', badge: 'bg-gray-100 text-gray-700' },
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="shrink-0 text-xs px-2 py-0.5 rounded bg-white border border-gray-200 hover:bg-gray-100 text-gray-500 transition-colors"
    >
      {copied ? '✓' : 'copiar'}
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

  const byTier = (t: 1 | 2 | 3) => filtered.filter(r => r.tier === t);

  function copyAll(tier: 1 | 2 | 3) {
    const emails = byTier(tier).map(r => r.endereco).join(', ');
    navigator.clipboard?.writeText(emails);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Carregando...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← Funil</Link>
          <h1 className="text-lg font-bold text-gray-900">E-mails para Prospecção</h1>
          <span className="text-sm text-gray-400">{rows.length} e-mails</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar lead ou email..."
            className="ml-auto text-sm border border-gray-300 rounded-lg px-3 py-1.5 outline-none focus:border-blue-400 w-64"
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {([1, 2, 3] as const).map(tier => {
          const tierRows = byTier(tier);
          if (tierRows.length === 0) return null;
          const cfg = TIER_CONFIG[tier];
          return (
            <div key={tier}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${cfg.color}`}>{cfg.label}</span>
                  <span className="text-xs text-gray-400">{tierRows.length} e-mails</span>
                </div>
                <button
                  onClick={() => copyAll(tier)}
                  className="text-xs px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                >
                  Copiar todos
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {tierRows.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <Link href={`/call/${r.lead.id}`} className="text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                        {r.lead.nome}
                      </Link>
                      <p className="text-xs text-gray-400 mt-0.5">{r.lead.localizacao} · {r.lead.categoria}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded shrink-0 ${cfg.badge}`}>{r.classificacao}</span>
                    <span className="text-sm text-gray-700 select-all break-all">{r.endereco}</span>
                    <CopyButton text={r.endereco} />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
