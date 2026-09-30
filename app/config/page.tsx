'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
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

export default function ConfigPage() {
  const [cfg, setCfg] = useState<OutcomesConfig | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => { fetch('/api/outcomes').then(r => r.json()).then(setCfg); }, []);
  if (!cfg) return <div className="p-10 text-gray-400">Carregando...</div>;

  const set = (i: number, u: Partial<Outcome>) =>
    setCfg({ ...cfg, outcomes: cfg.outcomes.map((o, j) => (j === i ? { ...o, ...u } : o)) });

  async function salvar(c: OutcomesConfig) {
    const r = await fetch('/api/outcomes', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(c) });
    setMsg(r.ok ? 'Salvo ✓' : 'Erro ao salvar');
    setTimeout(() => setMsg(''), 2500);
  }

  const inp = 'border border-gray-300 rounded px-2 py-1 text-sm w-full';

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900">← Lista</Link>
        <h1 className="text-lg font-bold text-gray-900">Classificação das ligações</h1>
        {msg && <span className="text-sm text-green-600 font-medium">{msg}</span>}
        <div className="ml-auto flex gap-2">
          <button onClick={() => { setCfg(DEFAULT_CONFIG); salvar(DEFAULT_CONFIG); }} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Restaurar padrão</button>
          <button onClick={() => salvar(cfg)} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">Salvar</button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-6 space-y-4">
        <p className="text-sm text-gray-600">
          Ao terminar uma ligação, o sistema lê a transcrição, procura as frases de cada resultado (a ordem importa: em empate vence o de cima)
          e dispara a próxima ação. Tudo aqui é editável.
        </p>
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 text-sm">
          Follow-up de e-mail enviado, em
          <input type="number" min={1} value={cfg.followUpDias} onChange={e => setCfg({ ...cfg, followUpDias: Number(e.target.value) || 1 })} className="border border-gray-300 rounded px-2 py-1 w-16" />
          dias
        </div>
        {cfg.outcomes.map((o, i) => (
          <div key={o.id} className="bg-white border border-gray-200 rounded-xl p-4 grid gap-3 sm:grid-cols-2">
            <div className="flex gap-2">
              <input value={o.emoji} onChange={e => set(i, { emoji: e.target.value })} className="border border-gray-300 rounded px-2 py-1 text-sm w-14 text-center" />
              <input value={o.label} onChange={e => set(i, { label: e.target.value })} className={inp} />
            </div>
            <input value={o.proximaAcao} onChange={e => set(i, { proximaAcao: e.target.value })} className={inp} placeholder="Próxima ação" />
            <label className="text-xs text-gray-500">Ação automática
              <select value={o.acao} onChange={e => set(i, { acao: e.target.value as AcaoAuto })} className={inp}>
                {ACOES.map(a => <option key={a.v} value={a.v}>{a.l}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-500">Coluna do kanban
              <select value={o.coluna} onChange={e => set(i, { coluna: e.target.value as Coluna })} className={inp}>
                {COLUNAS.map(c => <option key={c.id} value={c.id}>{c.icone} {c.titulo}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-500">Vale no histórico como
              <select value={o.resultadoChamada} onChange={e => set(i, { resultadoChamada: e.target.value as ResultadoChamada })} className={inp}>
                {RESULTADOS.map(r => <option key={r}>{r}</option>)}
              </select>
            </label>
            <label className="text-xs text-gray-500 sm:row-span-1">Frases que indicam este resultado (uma por linha)
              <textarea
                rows={4} value={o.palavras.join('\n')}
                onChange={e => set(i, { palavras: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                className={inp}
              />
            </label>
          </div>
        ))}
      </main>
    </div>
  );
}
