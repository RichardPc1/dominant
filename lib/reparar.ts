import { Lead } from './types';

/**
 * Alguns leads importados vieram com as colunas deslocadas
 * (telefone = site, site = data de inclusão, cnpj = segmento, porte = score…).
 * Detecta o padrão e devolve o lead com cada valor de volta no seu campo.
 * Telefone e observações se perderam na importação — o telefone ainda pode
 * ser recuperado das notas (ver telefoneDe em lib/kanban.ts).
 */
export function repararDeslocado(l: Lead): Lead {
  const deslocado = /^https?:\/\//i.test(l.telefone ?? '') || /^\d{2}\/\d{2}\/\d{4}$/.test(l.site ?? '');
  if (!deslocado) return l;
  return {
    ...l,
    observacoes: '',
    fonte: l.observacoes,
    cnpj: l.fonte,
    telefone: '',
    site: l.telefone,
    dataInclusao: l.site || l.dataInclusao,
    segmento: l.cnpj,
    porte: l.segmento,
    score: Number(l.porte) || 0,
  };
}
