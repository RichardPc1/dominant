import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE, tokenDaSenha } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const { senha } = await req.json();
  const esperada = process.env.APP_PASSWORD;
  if (!esperada || senha !== esperada) {
    return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, await tokenDaSenha(esperada), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
