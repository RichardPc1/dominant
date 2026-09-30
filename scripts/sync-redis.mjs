// Envia data/leads.json para o Redis (Upstash) usado em produção.
// Uso: node scripts/sync-redis.mjs [--tudo]
// Por padrão só cria leads que ainda não existem no Redis (não sobrescreve edições dos sócios).
// Com --tudo, sobrescreve todos.
// Requer UPSTASH_REDIS_REST_URL/TOKEN (ou KV_REST_API_URL/TOKEN) no ambiente.
import fs from 'node:fs';
import path from 'node:path';
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
if (!url || !token) { console.error('Defina UPSTASH_REDIS_REST_URL e UPSTASH_REDIS_REST_TOKEN.'); process.exit(1); }

const redis = new Redis({ url, token });
const leads = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'leads.json'), 'utf-8'));
const KEY = 'dominant:leads';
const tudo = process.argv.includes('--tudo');

const existentes = tudo ? new Set() : new Set(await redis.hkeys(KEY));
const novos = leads.filter(l => !existentes.has(l.id));
for (let i = 0; i < novos.length; i += 100) {
  await redis.hset(KEY, Object.fromEntries(novos.slice(i, i + 100).map(l => [l.id, l])));
}
console.log(`Enviados ${novos.length} de ${leads.length} leads.`);
