'use client';
import { t } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { PALETA_ICONES } from '@/lib/funil';

/**
 * Botão que mostra o ícone atual e, ao clicar, abre uma gradezinha de emojis
 * pra você escolher o que melhor combina com a reunião. Fica ao lado do
 * dropdown de nomes (que mostra só o texto).
 */
export default function IconPicker({ value, onChange }: { value: string; onChange: (icone: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setAberto(o => !o)}
        title={t("Escolher um ícone")}
        className="grid place-items-center w-9 h-9 rounded-lg border border-gray-300 bg-white text-lg hover:bg-gray-50"
      >
        {value || '🙂'}
      </button>
      {aberto && (
        <div className="absolute z-20 mt-1 left-0 w-56 rounded-xl border border-gray-200 bg-white shadow-xl p-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 px-1 pb-1">{t("Escolha um ícone")}</p>
          <div className="grid grid-cols-8 gap-0.5">
            {PALETA_ICONES.map(ic => (
              <button
                key={ic}
                type="button"
                onClick={() => { onChange(ic); setAberto(false); }}
                className={`grid place-items-center w-6 h-6 rounded text-lg hover:bg-indigo-50 ${value === ic ? 'bg-indigo-100 ring-1 ring-indigo-400' : ''}`}
              >
                {ic}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
