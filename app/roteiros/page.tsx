'use client';
import { t } from '@/lib/i18n';
import { Suspense, useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ROTEIROS, ScriptItem, ScriptSection } from '@/lib/roteiros-data';

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
      className="ml-auto shrink-0 text-xs px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
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
      <div className="flex gap-2 items-start bg-gray-50 border-l-4 border-gray-400 rounded-r-lg p-3">
        <p className="text-sm text-gray-800 leading-relaxed font-medium flex-1 italic">{t(item.text)}</p>
        <CopyButton text={t(item.text)} />
      </div>
    );
  }

  if (item.type === 'tip' && item.text) {
    return (
      <div className="text-xs text-gray-500 font-medium pt-1">{t(item.text)}</div>
    );
  }

  if (item.type === 'warning' && item.text) {
    return (
      <div className="flex gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
        <p className="text-sm text-red-700 leading-relaxed">{t(item.text)}</p>
      </div>
    );
  }

  if (item.type === 'list' && item.items) {
    return (
      <ul className="space-y-2">
        {item.items.map((li, i) => (
          <li key={i} className="flex gap-2 items-start bg-gray-50 border-l-4 border-blue-300 rounded-r-lg p-3">
            <p className="text-sm text-gray-800 italic flex-1">{t(li)}</p>
            <CopyButton text={t(li)} />
          </li>
        ))}
      </ul>
    );
  }

  return null;
}

function SectionCard({ section }: { section: ScriptSection }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-lg">{section.icon}</span>
        <span className="font-semibold text-gray-900 flex-1">{t(section.title)}</span>
        <span className="text-gray-400 text-sm">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-gray-100 pt-4">
          {section.items.map((item, i) => (
            <ScriptItemRenderer key={i} item={item} />
          ))}
        </div>
      )}
    </div>
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
    if (cat && ROTEIROS.find(r => r.id === cat)) setSelected(cat);
  }, [searchParams]);
  const roteiro = ROTEIROS.find(r => r.id === selected)!;

  return (
    <div className="min-h-full">
      {/* Header */}
      <header className="bg-white/85 backdrop-blur border-b border-gray-200 px-4 sm:px-6 lg:px-8 py-4 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("Roteiros de Abordagem")}</h1>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span>{t("Método: Linha Reta (Jordan Belfort) + SPIN Selling (Thiago Concer)")}</span>
          </div>
        </div>
      </header>

      <div className="max-w-screen-xl mx-auto px-6 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="w-56 shrink-0">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2 px-1">{t("Categorias")}</p>
          <nav className="space-y-1">
            {ROTEIROS.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  selected === r.id
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {t(r.categoria)}
              </button>
            ))}
          </nav>

          <div className="mt-6 p-3 bg-amber-50 border border-amber-100 rounded-xl">
            <p className="text-xs font-semibold text-amber-700 mb-1">{t("Legenda")}</p>
            <div className="space-y-1 text-xs text-amber-700">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-gray-400 rounded-sm inline-block"/><span>{t("Script (copiar)")}</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-300 rounded-sm inline-block"/><span>{t("Pergunta SPIN")}</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 bg-red-200 rounded-sm inline-block"/><span>{t("Atenção")}</span></div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0">
          {/* Roteiro header */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold border ${CAT_COLORS[roteiro.categoria] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                    {t(roteiro.categoria)}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-gray-900">{t(roteiro.tagline)}</h2>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <div><span className="font-medium text-gray-700">{t("Canal:")}</span> {t(roteiro.canal)}</div>
              <div><span className="font-medium text-gray-700">{t("Duração:")}</span> {t(roteiro.duracao)}</div>
              <div><span className="font-medium text-gray-700">{t("Com quem falar:")}</span> {t(roteiro.alvo)}</div>
            </div>
          </div>

          {/* Sections */}
          <div className="space-y-3">
            {roteiro.sections.map(section => (
              <SectionCard key={section.id} section={section} />
            ))}
          </div>

          {/* Framework reminder */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t("Jordan Belfort — Linha Reta")}</p>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>{t("⚡ 4 segundos: afiado, entusiasmado, especialista")}</li>
                <li>{t("🎯 3 certezas: produto, você, empresa")}</li>
                <li>{t("🔄 Loop: objeção → construir certeza → fechar")}</li>
                <li>{t("🩹 Reintroduza a dor antes do fechamento final")}</li>
                <li>{t("🎙️ 90% está na tonalidade, não nas palavras")}</li>
              </ul>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm p-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{t("Thiago Concer — SPIN + Resiliência")}</p>
              <ul className="text-xs text-gray-600 space-y-1">
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
  );
}

export default function RoteirosPage() {
  return (
    <Suspense fallback={null}>
      <RoteirosConteudo />
    </Suspense>
  );
}
