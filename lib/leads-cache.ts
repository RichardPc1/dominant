import { Lead } from './types';

/**
 * Cache em memória da última lista de leads vista nesta aba do navegador.
 * Ao trocar de tela (Leads → Kanban → Clientes → ficha) a tela nova abre na
 * hora com esta cópia e busca a versão atual do servidor em seguida.
 * Não substitui o servidor: some ao recarregar a página (F5).
 */
let cache: Lead[] | null = null;

export function leadsEmCache(): Lead[] | null {
  return cache;
}

export function guardarLeadsEmCache(leads: Lead[]): void {
  cache = leads;
}

/** Aplica uma alteração local a um lead do cache (pra próxima tela já abrir atualizada). */
export function atualizarLeadEmCache(id: string, updates: Partial<Lead>): void {
  if (cache) cache = cache.map(l => (l.id === id ? { ...l, ...updates } : l));
}
