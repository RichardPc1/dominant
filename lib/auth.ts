export const AUTH_COOKIE = 'dominant_auth';

/** Token do cookie: SHA-256 da senha compartilhada (APP_PASSWORD) com um sufixo fixo. */
export async function tokenDaSenha(senha: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${senha}:dominant`));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
