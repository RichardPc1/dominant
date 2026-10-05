import fs from 'fs';
import path from 'path';
import { Lead } from './types';
import { Redis } from '@upstash/redis';
import { DEFAULT_CONFIG, OutcomesConfig } from './outcomes';
import { repararDeslocado } from './reparar';

const DATA_FILE = path.join(process.cwd(), 'data', 'leads.json');

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}

// Em produção (Vercel) os dados ficam no Redis (Upstash), um lead por campo do hash,
// assim dois sócios editando leads diferentes não se sobrescrevem.
// Sem as variáveis de ambiente do Redis (dev local), usa data/leads.json.
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
const redis = REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

const LEADS_KEY = 'dominant:leads';
const OUTCOMES_KEY = 'dominant:outcomes';

const normalize = (l: Lead): Lead => repararDeslocado({ ...l, telefone: l.telefone ?? '', site: l.site ?? '' });

function readFile(): Lead[] {
  ensureDataDir();
  return (JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8')) as Lead[]).map(normalize);
}

function writeFile(leads: Lead[]): void {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), 'utf-8');
}

export async function getLeads(): Promise<Lead[]> {
  if (!redis) return readFile();
  const h = await redis.hgetall<Record<string, Lead>>(LEADS_KEY);
  return Object.values(h ?? {}).map(normalize);
}

export async function saveLeads(leads: Lead[]): Promise<void> {
  if (!redis) return writeFile(leads);
  await redis.del(LEADS_KEY);
  if (leads.length) await redis.hset(LEADS_KEY, Object.fromEntries(leads.map(l => [l.id, l])));
}

export async function addLeads(newLeads: Lead[]): Promise<Lead[]> {
  const existing = await getLeads();
  const existingNames = new Set(existing.map(l => l.nome.toLowerCase().trim()));
  const toAdd = newLeads.filter(l => !existingNames.has(l.nome.toLowerCase().trim()));
  if (!redis) writeFile([...existing, ...toAdd]);
  else if (toAdd.length) await redis.hset(LEADS_KEY, Object.fromEntries(toAdd.map(l => [l.id, l])));
  return toAdd;
}

export async function updateLead(id: string, updates: Partial<Lead>): Promise<Lead | null> {
  if (!redis) {
    const leads = readFile();
    const idx = leads.findIndex(l => l.id === id);
    if (idx === -1) return null;
    leads[idx] = { ...leads[idx], ...updates, updatedAt: new Date().toISOString() };
    writeFile(leads);
    return leads[idx];
  }
  const atual = await redis.hget<Lead>(LEADS_KEY, id);
  if (!atual) return null;
  const novo = { ...normalize(atual), ...updates, updatedAt: new Date().toISOString() };
  await redis.hset(LEADS_KEY, { [id]: novo });
  return novo;
}

export async function deleteLead(id: string): Promise<boolean> {
  if (!redis) {
    const leads = readFile();
    const filtered = leads.filter(l => l.id !== id);
    if (filtered.length === leads.length) return false;
    writeFile(filtered);
    return true;
  }
  return (await redis.hdel(LEADS_KEY, id)) > 0;
}

export async function clearAllLeads(): Promise<void> {
  await saveLeads([]);
}

const OUTCOMES_FILE = path.join(process.cwd(), 'data', 'outcomes.json');

export async function getOutcomesConfig(): Promise<OutcomesConfig> {
  if (redis) return (await redis.get<OutcomesConfig>(OUTCOMES_KEY)) ?? DEFAULT_CONFIG;
  try {
    return JSON.parse(fs.readFileSync(OUTCOMES_FILE, 'utf-8')) as OutcomesConfig;
  } catch {
    return DEFAULT_CONFIG;
  }
}

export async function saveOutcomesConfig(cfg: OutcomesConfig): Promise<void> {
  if (redis) {
    await redis.set(OUTCOMES_KEY, cfg);
    return;
  }
  ensureDataDir();
  fs.writeFileSync(OUTCOMES_FILE, JSON.stringify(cfg, null, 2), 'utf-8');
}
