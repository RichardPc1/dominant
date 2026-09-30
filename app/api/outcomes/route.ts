import { NextRequest, NextResponse } from 'next/server';
import { getOutcomesConfig, saveOutcomesConfig } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await getOutcomesConfig());
}

export async function PUT(req: NextRequest) {
  const cfg = await req.json();
  if (!Array.isArray(cfg?.outcomes) || typeof cfg?.followUpDias !== 'number') {
    return NextResponse.json({ error: 'Config inválida' }, { status: 400 });
  }
  await saveOutcomesConfig(cfg);
  return NextResponse.json(cfg);
}
