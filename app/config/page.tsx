'use client';
import { t } from '@/lib/i18n';
import { useEffect, useState } from 'react';
import { AcaoAuto, DEFAULT_CONFIG, Outcome, OutcomesConfig } from '@/lib/outcomes';
import { COLUNAS } from '@/lib/kanban';
import { Coluna, ResultadoChamada } from '@/lib/types';

const ACOES: { v: AcaoAuto; l: string }[] = [
  { v: 'nenhuma', l: 'Nenhuma' },
  { v: 'email', l: 'Escrever e-mail + follow-up' },
  { v: 'agendar-ligacao', l: 'Agendar ligação' },
  { v: 'agendar-reuniao', l: 'Agendar reunião (.ics)' },
];
const RESULTADOS: ResultadoChamada[] = ['Atendeu', 'Não atendeu', 'Caixa postal', 'Callback agendado', 'Sem interesse', 'Número errado'];

const campo = 'mt-1 h-10 border border-gray-200 rounded-xl px-3 text-sm w-full bg-white outline-none focus:border-blue-400';
const rotulo = 'block text-[11px] font-semibold text-gray-500 uppercase tracking-wider';

export default function ConfigPage() {
  const [cfg, setCfg] = useState<OutcomesConfig | null>(null);
  const [msg, setMsg] = useState('');
  const [confirmarPadrao, setConfirmarPadrao] = useState(false);

  useEffect(() => { fetch('/api/outcomes').then(r => r.json()).then(setCfg); }, []);
  if (!cfg) return <div className="min-h-full py-20 text-center text-gray-400">{t("Carregando...")}</div>;

  const set = (i: number, u: Partial<Outcome>) =>
    setCfg({ ...cfg, outcomes: cfg.outcomes.map((o, j) => (j === i ? { ...o, ...u } : o)) });

  async function salvar(c: OutcomesConfig) {
    const r = await fetch('/api/outcomes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
    setMsg(r.ok ? t('Salvo ✓') : t('Erro ao salvar'));
    setTimeout(() => setMsg(''), 2500);
  }

  return (
    <div className="min-h-full">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Cabeçalho da página */}
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{t("Classificação das ligações")}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{t("O que o sistema faz depois de cada ligação")}</p>
          </div>
          <div className="flex gap-2 items-center">
            {msg && <span className="text-sm text-emerald-600 font-semibold">{msg}</span>}
            {confirmarPadrao ? (
              <span className="flex items-center gap-2 h-10 px-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
                {t("Voltar tudo ao padrão?")}
                <button onClick={() => { setCfg(DEFAULT_CONFIG); salvar(DEFAULT_CONFIG); setConfirmarPadrao(false); }} className="px-2 py-1 rounded-lg bg-amber-600 text-white font-semibold hover:bg-amber-700">{t("Sim")}</button>
                <button onClick={() => setConfirmarPadrao(false)} className="px-1 hover:underline">{t("Não")}</button>
              </span>
            ) : (
              <button onClick={() => setConfirmarPadrao(true)} className="h-10 px-3.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 shadow-sm">{t("Restaurar padrão")}</button>
            )}
            <button onClick={() => salvar(cfg)} className="h-10 px-5 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-600/25 hover:brightness-110">{t("Salvar")}</button>
          </div>
        </div>

        {/* Como funciona */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-5 py-4 text-sm text-blue-900 leading-relaxed">
          {t("Ao terminar uma ligação, o sistema lê a transcrição, procura as frases de cada resultado (a ordem importa: em empate vence o de cima) e dispara a próxima ação. Tudo aqui é editável.")}
        </div>

        <div className="bg-white border border-gray-200/80 rounded-2xl shadow-sm px-5 py-4 flex items-center gap-3 text-sm text-gray-700 flex-wrap">
          <span className="grid place-items-center w-9 h-9 rounded-xl bg-amber-100 text-base">⏱️</span>
          {t("Follow-up de e-mail enviado, em")}
          <input type="number" min={1} value={cfg.followUpDias} onChange={e => setCfg({ ...cfg, followUpDias: Number(e.target.value) || 1 })} className="h-10 border border-gray-200 rounded-xl px-3 w-20 text-center font-semibold outline-none focus:border-blue-400" />
          {t("dias")}
        </div>

        {cfg.outcomes.map((o, i) => (
          <section key={o.id} className="bg-white border border-gray-200/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-50/70 border-b border-gray-100">
              <span className="grid place-items-center w-7 h-7 rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-500 tabular shrink-0">{i + 1}</span>
              <input value={o.emoji} onChange={e => set(i, { emoji: e.target.value })} aria-label="emoji" className="h-10 w-12 text-center text-lg border border-gray-200 rounded-xl bg-white outline-none focus:border-blue-400 shrink-0" />
              <input value={o.label} onChange={e => set(i, { label: e.target.value })} aria-label={t("Nome do resultado")} className="h-10 flex-1 min-w-0 border border-gray-200 rounded-xl px-3 text-sm font-semibold text-gray-900 bg-white outline-none focus:border-blue-400" />
            </div>
            <div className="p-5 grid gap-4 sm:grid-cols-2">
              <div className="space-y-4">
                <label className={rotulo}>{t("Próxima ação")}
                  <input value={o.proximaAcao} onChange={e => set(i, { proximaAcao: e.target.value })} className={`${campo} normal-case font-normal tracking-normal text-gray-800`} />
                </label>
                <label className={rotulo}>{t("Ação automática")}
                  <select value={o.acao} onChange={e => set(i, { acao: e.target.value as AcaoAuto })} className={`${campo} normal-case font-normal tracking-normal text-gray-800`}>
                    {ACOES.map(a => <option key={a.v} value={a.v}>{t(a.l)}</option>)}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={rotulo}>{t("Coluna do kanban")}
                    <select value={o.coluna} onChange={e => set(i, { coluna: e.target.value as Coluna })} className={`${campo} normal-case font-normal tracking-normal text-gray-800`}>
                      {COLUNAS.map(c => <option key={c.id} value={c.id}>{c.icone} {t(c.titulo)}</option>)}
                    </select>
                  </label>
                  <label className={rotulo}>{t("Vale no histórico como")}
                    <select value={o.resultadoChamada} onChange={e => set(i, { resultadoChamada: e.target.value as ResultadoChamada })} className={`${campo} normal-case font-normal tracking-normal text-gray-800`}>
                      {RESULTADOS.map(r => <option key={r} value={r}>{t(r)}</option>)}
                    </select>
                  </label>
                </div>
              </div>
              <label className={`${rotulo} flex flex-col`}>{t("Frases que indicam este resultado (uma por linha)")}
                <textarea
                  value={o.palavras.join('\n')}
                  onChange={e => set(i, { palavras: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                  className="mt-1 flex-1 min-h-40 border border-gray-200 rounded-xl p-3 text-sm w-full bg-white outline-none focus:border-blue-400 normal-case font-normal tracking-normal text-gray-800 leading-relaxed resize-y"
                />
              </label>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
