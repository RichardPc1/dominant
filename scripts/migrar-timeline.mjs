// Migra as reuniões antigas (lead.reunioes) para a nova linha do tempo (lead.timeline).
//
// Seguro: por padrão só mostra o que faria (dry-run). Para aplicar de verdade,
// passe --apply — e nesse caso ele grava um backup em /backups ANTES de tocar
// em qualquer lead.
//
// Uso:
//   node scripts/migrar-timeline.mjs                      (dry-run na produção)
//   node scripts/migrar-timeline.mjs --apply              (migra a produção, com backup)
//   node scripts/migrar-timeline.mjs http://localhost:3000 --apply
//
// Observação: a leitura do app já é retrocompatível (eventosDe cai em reunioes
// quando timeline não existe), então o app funciona mesmo sem rodar isto. A
// migração só "assenta" os dados pra todo mundo ler igual (inclusive o Mapa).

import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const base = (args.find(a => a.startsWith('http')) || 'https://dominant-annalogyc.vercel.app').replace(/\/$/, '');

const ICONE_PRESET = { 'Apresentação': '👋', 'POC': '🧪', 'Proposta': '📋', 'Follow-up': '🔁', 'Outra': '📎' };

function migrarReuniao(r) {
  return {
    id: r.id,
    tipo: 'reuniao',
    titulo: r.tipo,
    rotulo: r.tipo,
    icone: ICONE_PRESET[r.tipo] ?? '🤝',
    data: r.data || undefined,
    hora: r.hora,
    statusReuniao: r.status,
    pauta: r.notas ? { assunto: r.notas } : undefined,
    estado: r.status === 'Realizada' ? 'feito' : r.status === 'Cancelada' ? 'cancelado' : 'aberto',
    criadoEm: r.registradaEm ?? new Date().toISOString(),
  };
}

async function main() {
  console.log(`\n→ Lendo leads de ${base}/api/leads ...`);
  const leads = await fetch(`${base}/api/leads`, { cache: 'no-store' }).then(r => r.json());
  if (!Array.isArray(leads)) throw new Error('Resposta inesperada da API');

  const pendentes = leads.filter(l => !l.timeline && Array.isArray(l.reunioes) && l.reunioes.length);
  console.log(`  ${leads.length} leads no total · ${pendentes.length} com reuniões a migrar.`);

  if (pendentes.length === 0) { console.log('  Nada a fazer. ✅\n'); return; }
  for (const l of pendentes) console.log(`   • ${l.nome} — ${l.reunioes.length} reunião(ões)`);

  if (!apply) {
    console.log('\n(dry-run) Nada foi alterado. Rode de novo com --apply pra migrar.\n');
    return;
  }

  // backup antes de tocar em qualquer coisa
  const backupsDir = path.join(process.cwd(), 'backups');
  fs.mkdirSync(backupsDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(backupsDir, `leads-antes-timeline-${stamp}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(leads, null, 2), 'utf-8');
  console.log(`\n💾 Backup salvo em ${backupFile}`);

  let ok = 0;
  for (const l of pendentes) {
    const timeline = l.reunioes.map(migrarReuniao);
    const res = await fetch(`${base}/api/leads/${l.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ timeline }),
    });
    if (res.ok) { ok++; console.log(`   ✓ ${l.nome}`); }
    else console.log(`   ✗ ${l.nome} — HTTP ${res.status}`);
  }
  console.log(`\n✅ Migrados ${ok}/${pendentes.length} leads.\n`);
}

main().catch(e => { console.error('\n❌ Erro:', e.message, '\n'); process.exit(1); });
