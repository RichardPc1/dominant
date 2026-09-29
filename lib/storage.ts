import fs from 'fs';
import path from 'path';
import { Lead } from './types';

const DATA_FILE = path.join(process.cwd(), 'data', 'leads.json');

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}

export function getLeads(): Lead[] {
  ensureDataDir();
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as Lead[];
  return raw.map(l => ({ ...l, telefone: l.telefone ?? '', site: l.site ?? '' }));
}

export function saveLeads(leads: Lead[]): void {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), 'utf-8');
}

export function addLeads(newLeads: Lead[]): Lead[] {
  const existing = getLeads();
  const existingNames = new Set(existing.map(l => l.nome.toLowerCase().trim()));
  const toAdd = newLeads.filter(l => !existingNames.has(l.nome.toLowerCase().trim()));
  saveLeads([...existing, ...toAdd]);
  return toAdd;
}

export function updateLead(id: string, updates: Partial<Lead>): Lead | null {
  const leads = getLeads();
  const idx = leads.findIndex(l => l.id === id);
  if (idx === -1) return null;
  leads[idx] = { ...leads[idx], ...updates, updatedAt: new Date().toISOString() };
  saveLeads(leads);
  return leads[idx];
}

export function deleteLead(id: string): boolean {
  const leads = getLeads();
  const filtered = leads.filter(l => l.id !== id);
  if (filtered.length === leads.length) return false;
  saveLeads(filtered);
  return true;
}

export function clearAllLeads(): void {
  saveLeads([]);
}
