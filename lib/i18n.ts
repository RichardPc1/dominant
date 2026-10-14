import { EN as EN_BASE } from './i18n-en';
import { EN_GUIA } from './i18n-en-guia';
import { EN_ROTEIROS } from './i18n-en-roteiros';

// a interface tem prioridade: se o mesmo texto existir nos roteiros/guia, vale a tradução da interface
const EN: Record<string, string> = { ...EN_ROTEIROS, ...EN_GUIA, ...EN_BASE };

export type Idioma = 'pt' | 'en';

export const IDIOMA_KEY = 'dominant-idioma';

// Idioma em uso nesta aba. Quem troca é a estrutura (AppShell), que remonta as telas em seguida.
let atual: Idioma = 'pt';

export function idiomaAtual(): Idioma {
  return atual;
}

export function definirIdioma(i: Idioma): void {
  atual = i;
}

/**
 * Traduz um texto da interface. A chave é o próprio texto em português;
 * sem tradução cadastrada, devolve o português. Dados dos leads nunca passam por aqui.
 * Variáveis: t('{0} resultados', { 0: n }).
 */
export function t(pt: string, vars?: Record<string | number, string | number | undefined | null>): string {
  let s = atual === 'en' ? EN[pt] ?? pt : pt;
  if (vars) for (const k of Object.keys(vars)) s = s.split(`{${k}}`).join(String(vars[k] ?? ''));
  return s;
}
