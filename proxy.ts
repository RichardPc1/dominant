import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE, tokenDaSenha } from '@/lib/auth';

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/login' || pathname === '/api/login') return NextResponse.next();

  const senha = process.env.APP_PASSWORD;
  // Sem senha configurada: livre em dev local, bloqueado em produção.
  if (!senha && process.env.NODE_ENV !== 'production') return NextResponse.next();

  if (senha && req.cookies.get(AUTH_COOKIE)?.value === (await tokenDaSenha(senha))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  return NextResponse.redirect(new URL('/login', req.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
