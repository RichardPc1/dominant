'use client';
import { useState } from 'react';

export default function LoginPage() {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    const r = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    });
    if (r.ok) window.location.href = '/';
    else { setErro('Senha incorreta'); setEnviando(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={entrar} className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 w-80 space-y-3">
        <h1 className="text-lg font-bold text-gray-900">Dominant</h1>
        <input
          type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Senha" autoFocus
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
        />
        {erro && <p className="text-xs text-red-600">{erro}</p>}
        <button disabled={enviando || !senha} className="w-full bg-blue-600 text-white rounded py-2 text-sm font-medium disabled:opacity-50">
          Entrar
        </button>
      </form>
    </div>
  );
}
