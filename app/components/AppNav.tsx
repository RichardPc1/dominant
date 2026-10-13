'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITENS: { href: string; label: string; icone: string }[] = [
  { href: '/', label: 'Leads', icone: '📋' },
  { href: '/kanban', label: 'Kanban', icone: '🗂️' },
  { href: '/clientes', label: 'Clientes', icone: '🏆' },
  { href: '/emails', label: 'E-mails', icone: '✉️' },
  { href: '/roteiros', label: 'Roteiros', icone: '🎙️' },
  { href: '/config', label: 'Classificação', icone: '🏷️' },
  { href: '/guia', label: 'Guia', icone: '📖' },
];

/** Barra de navegação única do CRM — a mesma em todas as telas. */
export default function AppNav() {
  const pathname = usePathname() ?? '/';
  if (pathname.startsWith('/login')) return null;

  // a ficha do lead (/call/...) pertence à área de Leads
  const ativo = (href: string) =>
    href === '/' ? pathname === '/' || pathname.startsWith('/call') : pathname.startsWith(href);

  return (
    <nav className="bg-slate-900 text-slate-300">
      <div className="flex items-center gap-1 px-3 sm:px-5 h-12 overflow-x-auto">
        <Link href="/" className="flex items-center gap-2 pr-3 sm:pr-5 mr-1 sm:mr-2 border-r border-slate-700 shrink-0">
          <span className="grid place-items-center w-7 h-7 rounded-lg bg-blue-500 text-white text-sm font-black">D</span>
          <span className="hidden sm:block text-sm font-bold text-white tracking-tight">Dominant <span className="font-normal text-slate-400">CRM</span></span>
        </Link>
        {ITENS.map(i => (
          <Link
            key={i.href}
            href={i.href}
            aria-current={ativo(i.href) ? 'page' : undefined}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              ativo(i.href) ? 'bg-slate-700 text-white font-semibold' : 'hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-[13px]">{i.icone}</span>
            {i.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
