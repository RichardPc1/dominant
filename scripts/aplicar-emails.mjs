// Aplica e-mails escritos pelo Claude Code (/emails) em data/leads.json.
// Uso: node scripts/aplicar-emails.mjs prospeccao/emails-rascunho.json
// Entrada: [{ "id": "<id do lead>", "assunto": "...", "corpo": "..." }]
import fs from 'fs';

const entrada = process.argv[2];
if (!entrada) { console.error('Informe o JSON de rascunhos.'); process.exit(1); }

const arquivo = 'data/leads.json';
const leads = JSON.parse(fs.readFileSync(arquivo, 'utf-8'));
const rascunhos = JSON.parse(fs.readFileSync(entrada, 'utf-8'));

let ok = 0;
for (const r of rascunhos) {
  const lead = leads.find(l => l.id === r.id);
  if (!lead?.emailRascunho) { console.warn(`Ignorado (lead sem e-mail pendente): ${r.id}`); continue; }
  if (!r.assunto?.trim() || !r.corpo?.trim()) { console.warn(`Ignorado (assunto/corpo vazio): ${lead.nome}`); continue; }
  lead.emailRascunho = {
    ...lead.emailRascunho,
    assunto: r.assunto.trim(),
    corpo: r.corpo.trim(),
    status: 'pronto',
    atualizadoEm: new Date().toISOString(),
  };
  lead.updatedAt = new Date().toISOString();
  ok++;
}
fs.writeFileSync(arquivo, JSON.stringify(leads, null, 2), 'utf-8');
console.log(`${ok} e-mail(s) gravado(s).`);
