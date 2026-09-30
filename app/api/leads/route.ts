import { NextRequest, NextResponse } from 'next/server';
import { getLeads, addLeads, saveLeads } from '@/lib/storage';
import { Lead } from '@/lib/types';
import { randomUUID } from 'crypto';

export async function GET() {
  const leads = await getLeads();
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const leadsRaw: Partial<Lead>[] = Array.isArray(body) ? body : [body];

  const now = new Date().toISOString();
  const leads: Lead[] = leadsRaw.map(l => ({
    id: l.id || randomUUID(),
    nome: l.nome || '',
    categoria: l.categoria || 'Cliente direto',
    localizacao: l.localizacao || '',
    perfil: l.perfil || '',
    porqueFazSentido: l.porqueFazSentido || '',
    contato: l.contato || '',
    prioridade: l.prioridade || '3',
    status: l.status || 'A pesquisar',
    proximoPasso: l.proximoPasso || '',
    responsavel: l.responsavel || '',
    dataProxPasso: l.dataProxPasso || '',
    ultimaInteracao: l.ultimaInteracao || '',
    observacoes: l.observacoes || '',
    fonte: l.fonte || '',
    telefone: l.telefone || '',
    site: l.site || '',
    cnpj: l.cnpj || '',
    segmento: l.segmento || '',
    porte: l.porte || '',
    score: l.score || 0,
    dataInclusao: l.dataInclusao || '',
    notasLigacao: l.notasLigacao || '',
    chamadas: l.chamadas || [],
    createdAt: l.createdAt || now,
    updatedAt: l.updatedAt || now,
  }));

  const added = await addLeads(leads);
  return NextResponse.json({ added: added.length, leads: added });
}

export async function DELETE() {
  await saveLeads([]);
  return NextResponse.json({ ok: true });
}
