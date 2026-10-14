'use client';
import { t } from '@/lib/i18n';
import { Suspense, useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ROTEIROS, ScriptItem, ScriptSection } from '@/lib/roteiros-data';
import Icon from '../components/Icon';

const CAT_COLORS: Record<string, string> = {
  'Passar pelo Gatekeeper': 'bg-rose-50 text-rose-700 border-rose-200',
  'ERP / PCP': 'bg-blue-50 text-blue-700 border-blue-200',
  'Cliente direto': 'bg-green-50 text-green-700 border-green-200',
  'Automação RPA': 'bg-violet-50 text-violet-700 border-violet-200',
  'Integrador de automação': 'bg-orange-50 text-orange-700 border-orange-200',
  'Fabricante de máquinas': 'bg-yellow-50 text-yellow-800 border-yellow-200',
  'Polo / Associação': 'bg-teal-50 text-teal-700 border-teal-200',
  'Programa / Fomento': 'bg-indigo-50 text-indigo-700 border-indigo-200',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button
      onClick={copy}
      className={`ml-auto shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-100'}`}
    >
      {copied ? t("✓ Copiado") : t("Copiar")}
    </button>
  );
}

function ScriptItemRenderer({ item }: { item: ScriptItem }) {
  if (item.type === 'text' && item.text) {
    return <p className="text-sm text-gray-700 leading-relaxed">{t(item.text)}</p>;
  }

  if (item.type === 'script' && item.text) {
    return (
      <div className="flex gap-3 items-start bg-indigo-50/60 border border-indigo-100 border-l-4 border-l-indigo-500 rounded-xl p-3.5">
        <p className="text-sm text-gray-900 leading-relaxed font-medium flex-1 whitespace-pre-line">{t(item.text)}</p>
        <CopyButton text={t(item.text)} />
      </div>
    );
  }

  if (item.type === 'tip' && item.text) {
    return <p className="text-[13px] text-gray-600 font-medium leading-relaxed pt-1">{t(item.text)}</p>;
  }

  if (item.type === 'warning' && item.text) {
    return (
      <div className="flex gap-3 items-start bg-red-50 border border-red-200 rounded-xl p-3.5">
        <span className="text-base leading-none mt-0.5">⚠️</span>
        <p className="text-sm text-red-700 leading-relaxed font-medium">{t(item.text)}</p>
      </div>
    );
  }

  if (item.type === 'list' && item.items) {
    return (
      <ul className="space-y-2">
        {item.items.map((li, i) => (
          <li key={i} className="flex gap-3 items-start bg-sky-50/70 border border-sky-100 border-l-4 border-l-sky-400 rounded-xl p-3">
            <p className="text-sm text-gray-800 flex-1 leading-relaxed">{t(li)}</p>
            <CopyButton text={t(li)} />
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

function SectionCard({ section, numero }: { section: ScriptSection; numero: number }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="grid place-items-center w-10 h-10 rounded-xl bg-gray-100 text-lg shrink-0">{section.icon}</span>
        <span className="flex-1 min-w-0">
          <span className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{t("Etapa")} {numero}</span>
          <span className="block font-semibold text-gray-900">{t(section.title)}</span>
        </span>
        <span className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
          {section.items.map((item, i) => (
            <ScriptItemRenderer key={i} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function RoteirosConteudo() {
  const searchParams = useSearchParams();
  const [selected, setSelected] = useState(() => {
    const cat = searchParams.get('cat');
    return (cat && ROTEIROS.find(r => r.id === cat)) ? cat : ROTEIROS[0].id;
  });
  useEffect(() => {
    const cat = searchParams.get('cat');
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (cat && ROTEIROS.find(r => r.id === cat)) setSelected(cat);
  }, [searchParams]);
  const roteiro = ROTEIROS.find(r => r.id === selected)!;

  return (
    <div className="min-h-full">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Cabeçalho da página */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("Roteiros de Abordagem")}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t("Método: Linha Reta (Jordan Belfort) + SPIN Selling (Thiago Concer)")}</p>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">
          {/* Lista de roteiros */}
          <aside className="w-full lg:w-64 shrink-0 lg:sticky lg:top-6 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-2">
              <p className="hidden lg:block text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-2 pb-1">{t("Categorias")}</p>
              <nav className="flex lg:flex-col gap-1 overflow-x-auto">
                {ROTEIROS.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setSelected(r.id)}
                    aria-current={selected === r.id ? 'true' : undefined}
                    className={`shrink-0 lg:w-full text-left px-3 py-2.5 rounded-xl text-sm whitespace-nowrap lg:whitespace-normal transition-colors ${
                      selected === r.id
                        ? 'tema-fixo bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-600/25'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {t(r.categoria)}
                  </button>
                ))}
              </nav>
            </div>

            <div className="hidden lg:block bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("Legenda")}</p>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2"><span className="w-1.5 h-4 bg-indigo-500 rounded-full inline-block" /><span>{t("Script (copiar)")}</span></div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-4 bg-sky-400 rounded-full inline-block" /><span>{t("Pergunta SPIN")}</span></div>
                <div className="flex items-center gap-2"><span className="w-1.5 h-4 bg-red-400 rounded-full inline-block" /><span>{t("Atenção")}</span></div>
              </div>
            </div>
          </aside>

          {/* Roteiro escolhido */}
          <main className="flex-1 min-w-0 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
              <div className="tema-fixo h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600" />
              <div className="p-5 sm:p-6">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${CAT_COLORS[roteiro.categoria] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {t(roteiro.categoria)}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 mt-3 leading-snug">{t(roteiro.tagline)}</h2>
                <div className="grid gap-3 sm:grid-cols-3 mt-5">
                  {[
                    { icone: 'telefone' as const, rotulo: t("Canal:"), valor: t(roteiro.canal) },
                    { icone: 'atualizar' as const, rotulo: t("Duração:"), valor: t(roteiro.duracao) },
                    { icone: 'leads' as const, rotulo: t("Com quem falar:"), valor: t(roteiro.alvo) },
                  ].map(m => (
                    <div key={m.rotulo} className="flex gap-3 items-start rounded-xl bg-gray-50 border border-gray-100 p-3">
                      <Icon name={m.icone} className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{m.rotulo.replace(':', '')}</p>
                        <p className="text-sm text-gray-800 leading-snug">{m.valor}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {roteiro.sections.map((section, i) => (
              <SectionCard key={`${roteiro.id}-${section.id}`} section={section} numero={i + 1} />
            ))}

            {/* Lembrete dos métodos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{t("Jordan Belfort — Linha Reta")}</p>
                <ul className="text-sm text-gray-600 space-y-1.5">
                  <li>{t("⚡ 4 segundos: afiado, entusiasmado, especialista")}</li>
                  <li>{t("🎯 3 certezas: produto, você, empresa")}</li>
                  <li>{t("🔄 Loop: objeção → construir certeza → fechar")}</li>
                  <li>{t("🩹 Reintroduza a dor antes do fechamento final")}</li>
                  <li>{t("🎙️ 90% está na tonalidade, não nas palavras")}</li>
                </ul>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-5">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">{t("Thiago Concer — SPIN + Resiliência")}</p>
                <ul className="text-sm text-gray-600 space-y-1.5">
                  <li>{t("❓ Situação → Problema → Implicação → Necessidade")}</li>
                  <li>{t("📋 Script é o mínimo obrigatório — não engessa, protege")}</li>
                  <li>{t("💰 Objeção de preço: sempre pergunte \"Por quê?\"")}</li>
                  <li>{t("🧠 O \"não\" é sobre a oportunidade, não sobre você")}</li>
                  <li>{t("🚫 Não sofra compra — você conduz a conversa")}</li>
                </ul>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function RoteirosPage() {
  return (
    <Suspense fallback={null}>
      <RoteirosConteudo />
    </Suspense>
  );
}
