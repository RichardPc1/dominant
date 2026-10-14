'use client';
import { IDIOMA_KEY, Idioma, definirIdioma, t } from '@/lib/i18n';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Lead } from '@/lib/types';
import { guardarLeadsEmCache, leadsEmCache } from '@/lib/leads-cache';
import Icon, { IconName } from './Icon';
import RunRoundModal from './RunRoundModal';

interface Item { href: string; label: string; icone: IconName; dica: string }

const GRUPOS: { titulo: string; itens: Item[] }[] = [
  {
    titulo: 'Vendas',
    itens: [
      { href: '/', label: 'Leads', icone: 'leads', dica: 'Lista de todas as empresas' },
      { href: '/kanban', label: 'Kanban', icone: 'kanban', dica: 'Trabalho do dia: ligar, mensagem, retorno' },
      { href: '/clientes', label: 'Clientes', icone: 'clientes', dica: 'Funil de fechamento e reuniões' },
      { href: '/emails', label: 'E-mails', icone: 'emails', dica: 'E-mails de prospecção por tier' },
    ],
  },
  {
    titulo: 'Apoio',
    itens: [
      { href: '/roteiros', label: 'Roteiros', icone: 'roteiros', dica: 'Roteiros de abordagem' },
      { href: '/config', label: 'Classificação', icone: 'classificacao', dica: 'Resultados das ligações' },
      { href: '/guia', label: 'Guia', icone: 'guia', dica: 'Como usar o sistema' },
    ],
  },
];

const MENU_KEY = 'dominant-menu';
const TEMA_KEY = 'dominant-tema';
type Tema = 'claro' | 'escuro';
type Modo = 'expandido' | 'recolhido' | 'oculto';

/** Eventos globais: qualquer tela pode pedir a rodada ou avisar que a lista de leads mudou. */
export const EVENTO_RODADA = 'dominant:rodada';
export const EVENTO_LEADS = 'dominant:leads';

function BuscaGlobal() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [aberto, setAberto] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  async function carregar() {
    const c = leadsEmCache();
    if (c) { setLeads(c); return; }
    try {
      const d: Lead[] = await fetch('/api/leads', { cache: 'no-store' }).then(r => r.json());
      if (Array.isArray(d)) { setLeads(d); guardarLeadsEmCache(d); }
    } catch {}
  }

  // Ctrl+K / ⌘K foca a busca de qualquer tela
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const achados = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (t.length < 2) return [];
    return leads
      .filter(l => l.nome.toLowerCase().includes(t) || (l.localizacao ?? '').toLowerCase().includes(t) || (l.telefone ?? '').includes(t))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [q, leads]);

  function ir(l: Lead) {
    setAberto(false); setQ(''); inputRef.current?.blur();
    router.push(`/call/${l.id}`);
  }

  return (
    <div className="relative flex-1 max-w-xl">
      <Icon name="busca" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        ref={inputRef}
        value={q}
        onChange={e => { setQ(e.target.value); setSel(0); setAberto(true); }}
        onFocus={() => { carregar(); setAberto(true); }}
        onBlur={() => setTimeout(() => setAberto(false), 150)}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, achados.length - 1)); }
          else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
          else if (e.key === 'Enter' && achados[sel]) ir(achados[sel]);
          else if (e.key === 'Escape') { setAberto(false); inputRef.current?.blur(); }
        }}
        placeholder={t("Buscar empresa, cidade ou telefone…")}
        className="w-full h-10 pl-9 pr-16 rounded-xl bg-slate-100 border border-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition"
      />
      <kbd className="hidden md:block absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-slate-400 border border-slate-300 rounded px-1.5 py-0.5 bg-white">{t("Ctrl K")}</kbd>

      {aberto && q.trim().length >= 2 && (
        <div className="absolute z-50 mt-2 w-full rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden">
          {achados.length === 0 ? (
            <p className="px-4 py-3 text-sm text-slate-400">{t("Nenhuma empresa encontrada.")}</p>
          ) : achados.map((l, i) => (
            <button
              key={l.id}
              onMouseDown={e => { e.preventDefault(); ir(l); }}
              onMouseEnter={() => setSel(i)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${i === sel ? 'bg-blue-50' : ''}`}
            >
              <span className="grid place-items-center w-8 h-8 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold shrink-0">{l.nome.slice(0, 2).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-slate-900 truncate">{l.nome}</span>
                <span className="block text-xs text-slate-400 truncate">{[l.categoria, l.localizacao].filter(Boolean).join(' · ')}</span>
              </span>
              <span className="text-xs text-slate-400 shrink-0">{t(l.status)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Menu({ recolhido, pathname, onNavegar }: { recolhido: boolean; pathname: string; onNavegar?: () => void }) {
  // a ficha do lead (/call/...) pertence à área de Leads
  const ativo = (href: string) =>
    href === '/' ? pathname === '/' || pathname.startsWith('/call') : pathname.startsWith(href);

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {GRUPOS.map(g => (
        <div key={g.titulo}>
          {recolhido
            ? <div className="mx-2 mb-2 border-t border-white/10" />
            : <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{t(g.titulo)}</p>}
          <ul className="space-y-1">
            {g.itens.map(i => {
              const on = ativo(i.href);
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    onClick={onNavegar}
                    title={recolhido ? `${t(i.label)} — ${t(i.dica)}` : t(i.dica)}
                    aria-current={on ? 'page' : undefined}
                    className={`group relative flex items-center gap-3 rounded-xl text-sm transition-colors ${recolhido ? 'justify-center h-11' : 'px-3 h-10'} ${
                      on
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg shadow-blue-950/40'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Icon name={i.icone} className="w-[18px] h-[18px]" />
                    {!recolhido && <span className="truncate">{t(i.label)}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Marca({ recolhido }: { recolhido: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-3 h-16 shrink-0 border-b border-white/10 ${recolhido ? 'justify-center' : 'px-5'}`}>
      <span className="grid place-items-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black shadow-lg shadow-blue-900/50">D</span>
      {!recolhido && (
        <span className="leading-tight">
          <span className="block text-[15px] font-bold text-white tracking-tight">{t("Dominant")}</span>
          <span className="block text-[11px] text-slate-400">{t("CRM de prospecção")}</span>
        </span>
      )}
    </Link>
  );
}

/** Estrutura do CRM: menu lateral (expande, recolhe ou some) + barra superior com busca e ações. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '/';
  const [modo, setModo] = useState<Modo>('expandido');
  const [gaveta, setGaveta] = useState(false);
  const [rodada, setRodada] = useState(false);
  const [lido, setLido] = useState(false);
  const [tema, setTema] = useState<Tema>('claro');
  const [idioma, setIdioma] = useState<Idioma>('pt');

  // preferência do menu sobrevive ao F5
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const m = localStorage.getItem(MENU_KEY);
      if (m === 'expandido' || m === 'recolhido' || m === 'oculto') setModo(m);
      else if (window.innerWidth < 1536) setModo('recolhido');
      // o tema já foi aplicado no <html> pelo script do layout (sem piscar); aqui só espelhamos
      if (document.documentElement.classList.contains('dark')) setTema('escuro');
      if (localStorage.getItem(IDIOMA_KEY) === 'en') { definirIdioma('en'); setIdioma('en'); document.documentElement.lang = 'en'; }
    } catch {}
    setLido(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  useEffect(() => {
    if (!lido) return;
    try { localStorage.setItem(MENU_KEY, modo); } catch {}
  }, [modo, lido]);

  useEffect(() => {
    const abrir = () => setRodada(true);
    window.addEventListener(EVENTO_RODADA, abrir);
    return () => window.removeEventListener(EVENTO_RODADA, abrir);
  }, []);

  function trocarTema() {
    const novo: Tema = tema === 'escuro' ? 'claro' : 'escuro';
    document.documentElement.classList.toggle('dark', novo === 'escuro');
    try { localStorage.setItem(TEMA_KEY, novo); } catch {}
    setTema(novo);
  }

  // Trocar o idioma remonta as telas (a <main> usa o idioma como key), então tudo é redesenhado traduzido.
  function trocarIdioma() {
    const novo: Idioma = idioma === 'pt' ? 'en' : 'pt';
    definirIdioma(novo);
    document.documentElement.lang = novo === 'en' ? 'en' : 'pt-BR';
    try { localStorage.setItem(IDIOMA_KEY, novo); } catch {}
    setIdioma(novo);
  }

  if (pathname.startsWith('/login')) return <>{children}</>;

  const recolhido = modo === 'recolhido';
  const oculto = modo === 'oculto';

  // Botão "waffle": no computador mostra/esconde o menu; no celular abre a gaveta.
  function waffle() {
    if (window.matchMedia('(min-width: 1024px)').matches) setModo(m => (m === 'oculto' ? 'expandido' : 'oculto'));
    else setGaveta(true);
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--fundo)]">
      {/* Menu lateral — computador */}
      {!oculto && (
        <aside className={`tema-fixo hidden lg:flex flex-col shrink-0 bg-slate-950 transition-[width] duration-200 ${recolhido ? 'w-[4.5rem]' : 'w-60'}`}>
          <Marca recolhido={recolhido} />
          <Menu recolhido={recolhido} pathname={pathname} />
          <div className="p-3 border-t border-white/10">
            <button
              onClick={() => setModo(recolhido ? 'expandido' : 'recolhido')}
              title={recolhido ? t("Expandir menu") : t("Recolher menu")}
              className={`w-full flex items-center gap-3 h-10 rounded-xl text-sm text-slate-400 hover:bg-white/10 hover:text-white transition-colors ${recolhido ? 'justify-center' : 'px-3'}`}
            >
              <Icon name={recolhido ? 'expandir' : 'recolher'} className="w-[18px] h-[18px]" />
              {!recolhido && <span>{t("Recolher menu")}</span>}
            </button>
          </div>
        </aside>
      )}

      {/* Menu lateral — celular (gaveta) */}
      {gaveta && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="tema-fixo absolute inset-0 bg-slate-950/60 backdrop-blur-sm" onClick={() => setGaveta(false)} />
          <aside className="tema-fixo relative flex flex-col w-64 max-w-[80vw] bg-slate-950 shadow-2xl">
            <Marca recolhido={false} />
            <Menu recolhido={false} pathname={pathname} onNavegar={() => setGaveta(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra superior */}
        <header className="h-16 shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-5 bg-white/90 backdrop-blur border-b border-slate-200">
          <button
            onClick={waffle}
            title={t("Mostrar ou esconder o menu")}
            aria-label={t("Mostrar ou esconder o menu")}
            className="grid place-items-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          >
            <Icon name="waffle" />
          </button>

          <BuscaGlobal />

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={trocarIdioma}
              title={t("Mudar idioma (português / inglês)")}
              aria-label={t("Mudar idioma (português / inglês)")}
              className="flex items-center h-10 px-1 rounded-xl bg-slate-100 text-[11px] font-bold tracking-wide"
            >
              <span className={`px-2 py-1.5 rounded-lg transition-colors ${idioma === 'pt' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>PT</span>
              <span className={`px-2 py-1.5 rounded-lg transition-colors ${idioma === 'en' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}>EN</span>
            </button>
            <button
              onClick={trocarTema}
              title={tema === 'escuro' ? t("Mudar para tema claro") : t("Mudar para tema escuro")}
              aria-label={tema === 'escuro' ? t("Mudar para tema claro") : t("Mudar para tema escuro")}
              className="grid place-items-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Icon name={tema === 'escuro' ? 'sol' : 'lua'} />
            </button>
            <button
              onClick={() => setRodada(true)}
              className="tema-fixo inline-flex items-center gap-2 h-10 px-3 sm:px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold shadow-md shadow-blue-600/25 hover:brightness-110 transition"
            >
              <Icon name="raio" className="w-4 h-4" />
              <span className="hidden sm:inline">{t("Pedir rodada")}</span>
            </button>
            <Link href="/kanban" title={t("Kanban — trabalho do dia")} className="hidden md:grid place-items-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <Icon name="kanban" />
            </Link>
            <Link href="/clientes" title={t("Clientes — funil de fechamento")} className="hidden md:grid place-items-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <Icon name="clientes" />
            </Link>
            <Link href="/guia" title={t("Guia do sistema")} className="hidden md:grid place-items-center w-10 h-10 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors">
              <Icon name="guia" />
            </Link>
          </div>
        </header>

        <main key={idioma} className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {rodada && (
        <RunRoundModal
          onClose={() => setRodada(false)}
          onRefresh={() => window.dispatchEvent(new Event(EVENTO_LEADS))}
        />
      )}
    </div>
  );
}
