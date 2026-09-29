// Importa um CSV de leads (formato do agente de prospecção) para data/leads.json.
// Uso: node scripts/add-leads.mjs <arquivo.csv>
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const DATA_FILE = path.join(process.cwd(), 'data', 'leads.json');

function parseCsvLine(line) {
  const fields = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ';' && !inQuotes) {
      fields.push(cur.trim());
      cur = '';
    } else cur += ch;
  }
  fields.push(cur.trim());
  return fields;
}

function todayBR() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

const norm = s => (s || '').toLowerCase().trim();
const host = s => norm(s).replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
const digits = s => (s || '').replace(/\D/g, '');

const file = process.argv[2];
if (!file) { console.error('Uso: node scripts/add-leads.mjs <arquivo.csv>'); process.exit(1); }

let text = fs.readFileSync(file, 'utf-8').replace(/^﻿/, '');
text = text.replace(/^```csv\s*/i, '').replace(/```\s*$/, '');
const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l && !l.startsWith('Nome;'));

const existing = fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) : [];
const names = new Set(existing.map(l => norm(l.nome)));
const sites = new Set(existing.map(l => host(l.site)).filter(Boolean));
const cnpjs = new Set(existing.map(l => digits(l.cnpj)).filter(Boolean));

const added = [];
const skipped = [];
for (const line of lines) {
  const f = parseCsvLine(line);
  if (f.length < 3 || !f[0]) continue;
  const prio = (f[6] || '').replace(/Prioridade\s*/i, '').trim();
  const score = Math.min(10, Math.max(0, parseFloat(f[17]) || 0));
  const now = new Date().toISOString();
  const lead = {
    id: randomUUID(),
    nome: f[0],
    categoria: f[1] || 'Cliente direto',
    localizacao: f[2] || '',
    perfil: f[3] || '',
    porqueFazSentido: f[4] || '',
    contato: f[5] || '',
    prioridade: prio === '1' ? '1' : prio === '2' ? '2' : '3',
    status: f[7] || 'A pesquisar',
    proximoPasso: f[8] || '',
    responsavel: f[9] || '',
    dataProxPasso: f[10] || '',
    ultimaInteracao: f[11] || '',
    observacoes: f[12] || '',
    fonte: f[13] || '',
    cnpj: f[14] || '',
    segmento: f[15] || '',
    porte: f[16] || '',
    score,
    telefone: f[18] || '',
    site: f[19] || '',
    dataInclusao: f[20] || todayBR(),
    notasLigacao: '',
    chamadas: [],
    createdAt: now,
    updatedAt: now,
  };
  const dup = names.has(norm(lead.nome)) || (host(lead.site) && sites.has(host(lead.site))) || (digits(lead.cnpj) && cnpjs.has(digits(lead.cnpj)));
  if (dup) { skipped.push(lead.nome); continue; }
  names.add(norm(lead.nome));
  if (host(lead.site)) sites.add(host(lead.site));
  if (digits(lead.cnpj)) cnpjs.add(digits(lead.cnpj));
  added.push(lead);
}

fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
fs.writeFileSync(DATA_FILE, JSON.stringify([...existing, ...added], null, 2), 'utf-8');
console.log(`Adicionados: ${added.length}`);
if (skipped.length) console.log(`Ignorados (duplicados): ${skipped.join('; ')}`);
