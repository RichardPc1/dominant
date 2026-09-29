import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getLeads, addLeads } from '@/lib/storage';
import { Lead } from '@/lib/types';
import { buildSystemPrompt } from '@/lib/prompt';
import { parseLeadsCSV } from '@/lib/csv-parser';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENAI_API_KEY não configurada. Crie o arquivo .env.local.' }, { status: 500 });
  }

  const { regiao, cidades, segmentos, quantidade = 10 } = await req.json();

  const openai = new OpenAI({ apiKey });

  const existingLeads = getLeads();
  const existingNames = existingLeads.map(l => l.nome);

  const systemPrompt = buildSystemPrompt(existingNames);

  const cidadesLista = cidades?.trim();
  const localFocus = cidadesLista
    ? `Foco geográfico desta rodada: APENAS as cidades ${cidadesLista}. Não expanda para a região, estado ou grande área metropolitana — busque empresas que estão fisicamente localizadas em ${cidadesLista}. Use os nomes das cidades nas buscas.`
    : `Foco geográfico desta rodada: ${regiao || 'Sudeste'} (sem restrição de cidade).`;

  const incluiRPA = (segmentos || '').includes('Automação RPA');

  const rpaInstrucoes = incluiRPA ? `
BUSCA PARA AUTOMAÇÃO RPA — REGRAS CRÍTICAS:
- NUNCA busque "RPA", "automação", "robô de software" ou termos técnicos de automação — isso traz fornecedores, não compradores.
- Busque DIRETAMENTE pelos setores que compram RPA. Use estes termos exatos:
  • "escritório de contabilidade ${cidadesLista || regiao || ''}"
  • "escritório contábil ${cidadesLista || regiao || ''}"
  • "distribuidora atacadista ${cidadesLista || regiao || ''}"
  • "transportadora logística ${cidadesLista || regiao || ''}"
  • "e-commerce loja online ${cidadesLista || regiao || ''}"
  • "clínica médica laboratório ${cidadesLista || regiao || ''}"
  • vaga de emprego "auxiliar administrativo" OR "digitador" OR "assistente backoffice" ${cidadesLista || regiao || ''}
- O lead RPA é a EMPRESA DO SETOR que tem processo manual — escritório contábil com 20+ funcionários, distribuidora com pedidos por WhatsApp, transportadora emitindo CTe manualmente, etc.
` : '';

  const userMessage = `Inicie uma nova rodada de prospecção.
${localFocus}
Segmentos prioritários: ${segmentos || 'ERP / PCP, Integrador de automação, Cliente direto'}
${rpaInstrucoes}
ESTRATÉGIA DE BUSCA OBRIGATÓRIA: Faça no mínimo 4 a 5 buscas diferentes antes de montar o CSV. Varie os termos: nome do segmento + cidade, CNAE do setor, vagas de emprego relacionadas, listas de fornecedores. A meta é ${quantidade} leads novos — não entregue mais nem menos que isso.

Siga todas as instruções do sistema e entregue os três blocos obrigatórios. Comece o Bloco 1 com o cabeçalho CSV dentro de um bloco de código \`\`\`csv.`;

  const response = await openai.responses.create({
    model: 'gpt-5',
    reasoning: { effort: 'low' },
    tools: [{ type: 'web_search' as const }],
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ] as Parameters<typeof openai.responses.create>[0]['input'],
  });

  const text = response.output_text ?? '';

  const csvMatch = text.match(/```csv\r?\n([\s\S]*?)```/i);
  let newLeads: Lead[] = [];
  let addedCount = 0;

  if (csvMatch) {
    const parsed = parseLeadsCSV(csvMatch[1]);
    const added = addLeads(parsed);
    newLeads = added;
    addedCount = added.length;
  }

  return NextResponse.json({
    fullText: text,
    newLeadsCount: addedCount,
    leads: newLeads,
  });
}
