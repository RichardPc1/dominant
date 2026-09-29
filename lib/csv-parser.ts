import { Lead, Categoria, Prioridade, Status } from './types';
import { randomUUID } from 'crypto';

const HEADER = 'Nome;Categoria;Localização;Perfil / o que faz;Por que faz sentido;Contato / canal de entrada;Prioridade;Status;Próximo passo;Responsável;Data próx. passo;Última interação;Observações;Fonte;CNPJ;Segmento / CNAE;Porte;Score;Telefone;Site;Data de inclusão';

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ';' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function todayBR(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
}

export function parseLeadsCSV(csvText: string): Lead[] {
  const lines = csvText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  const dataLines = lines.filter(l => !l.startsWith('Nome;'));
  const leads: Lead[] = [];

  for (const line of dataLines) {
    const f = parseCsvLine(line);
    if (f.length < 3 || !f[0]) continue;

    const prioRaw = f[6]?.replace(/Prioridade\s*/i, '').trim();
    const prioridade: Prioridade =
      prioRaw === '1' ? '1' : prioRaw === '2' ? '2' : '3';

    const scoreRaw = parseFloat(f[17] || '0');
    const score = isNaN(scoreRaw) ? 0 : Math.min(10, Math.max(0, scoreRaw));

    // f[18] = Telefone, f[19] = Site, f[20] = Data de inclusão

    const now = new Date().toISOString();

    leads.push({
      id: randomUUID(),
      nome: f[0] || '',
      categoria: (f[1] as Categoria) || 'Cliente direto',
      localizacao: f[2] || '',
      perfil: f[3] || '',
      porqueFazSentido: f[4] || '',
      contato: f[5] || '',
      prioridade,
      status: (f[7] as Status) || 'A pesquisar',
      proximoPasso: f[8] || '',
      responsavel: f[9] || '',
      dataProxPasso: f[10] || '',
      ultimaInteracao: f[11] || '',
      observacoes: f[12] || '',
      fonte: f[13] || '',
      telefone: f[18] || '',
      site: f[19] || '',
      cnpj: f[14] || '',
      segmento: f[15] || '',
      porte: f[16] || '',
      score,
      dataInclusao: f[20] || todayBR(),
      notasLigacao: '',
      chamadas: [],
      createdAt: now,
      updatedAt: now,
    });
  }

  return leads;
}
