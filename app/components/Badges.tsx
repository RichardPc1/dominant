'use client';
import { Categoria, Prioridade, Status } from '@/lib/types';

export function PriorityBadge({ p }: { p: Prioridade }) {
  const map = {
    '1': 'bg-red-100 text-red-700 border-red-200',
    '2': 'bg-amber-100 text-amber-700 border-amber-200',
    '3': 'bg-gray-100 text-gray-600 border-gray-200',
  } as const;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${map[p]}`}>
      P{p}
    </span>
  );
}

export function StatusBadge({ s }: { s: Status }) {
  const map: Record<Status, string> = {
    'A contatar': 'bg-green-100 text-green-700',
    'A pesquisar': 'bg-blue-100 text-blue-700',
    'Pausado': 'bg-gray-100 text-gray-500',
    'Monitorar': 'bg-purple-100 text-purple-700',
    'Contatado': 'bg-teal-100 text-teal-700',
    'Em conversa': 'bg-cyan-100 text-cyan-700',
    'Reunião marcada': 'bg-indigo-100 text-indigo-700',
    'Proposta enviada': 'bg-violet-100 text-violet-700',
    'Piloto': 'bg-orange-100 text-orange-700',
    'Parceiro ativo': 'bg-emerald-100 text-emerald-700',
    'Fechado': 'bg-red-100 text-red-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[s] ?? 'bg-gray-100 text-gray-600'}`}>
      {s}
    </span>
  );
}

export function CategoriaBadge({ c }: { c: Categoria }) {
  const map: Record<Categoria, string> = {
    'ERP / PCP': 'bg-blue-50 text-blue-700',
    'Integrador de automação': 'bg-orange-50 text-orange-700',
    'Fabricante de máquinas': 'bg-yellow-50 text-yellow-700',
    'Cliente direto': 'bg-green-50 text-green-700',
    'Automação RPA': 'bg-violet-50 text-violet-700',
    'Polo / Associação': 'bg-teal-50 text-teal-700',
    'Programa / Fomento': 'bg-indigo-50 text-indigo-700',
    'Concorrente': 'bg-red-50 text-red-600',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[c] ?? 'bg-gray-50 text-gray-600'}`}>
      {c}
    </span>
  );
}
