'use client';
import { useState } from 'react';

const REGIOES = ['Sul', 'Sudeste', 'Centro-Oeste', 'Nordeste', 'Norte'];
const SEGMENTOS = ['ERP / PCP', 'Integrador de automação', 'Fabricante de máquinas', 'Cliente direto', 'Automação RPA', 'Polo / Associação', 'Programa / Fomento'];

const CIDADES_SUGERIDAS = [
  'São Paulo, Guarulhos, Mogi das Cruzes',
  'Campinas, Jundiaí, Sorocaba',
  'Curitiba, São José dos Pinhais',
  'Porto Alegre, Caxias do Sul',
  'Belo Horizonte, Contagem',
];

interface Props {
  onClose: () => void;
  onRefresh: () => void;
}

const QUANTIDADES = [5, 10, 15, 20];

export default function RunRoundModal({ onClose, onRefresh }: Props) {
  const [regiao, setRegiao] = useState('Sudeste');
  const [cidades, setCidades] = useState('São Paulo, Guarulhos, Mogi das Cruzes');
  const [selectedSegs, setSelectedSegs] = useState<string[]>(['ERP / PCP', 'Integrador de automação', 'Cliente direto']);
  const [quantidade, setQuantidade] = useState(10);
  const [copied, setCopied] = useState(false);

  function toggleSeg(seg: string) {
    setSelectedSegs(prev =>
      prev.includes(seg) ? prev.filter(s => s !== seg) : [...prev, seg]
    );
  }

  const local = cidades.trim() || regiao;
  const comando = `/rodada cidades="${local}" segmentos="${selectedSegs.join(', ')}" qtd=${quantidade}`;

  async function copiar() {
    try {
      await navigator.clipboard.writeText(comando);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 mb-4">Pedir nova rodada de prospecção</h2>

        {(
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cidades
                <span className="ml-1 text-gray-400 font-normal">(separe por vírgula)</span>
              </label>
              <input
                type="text"
                value={cidades}
                onChange={e => setCidades(e.target.value)}
                placeholder="Ex: Guarulhos, São Paulo, Mogi das Cruzes"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex flex-wrap gap-1 mt-1.5">
                {CIDADES_SUGERIDAS.map(c => (
                  <button
                    key={c}
                    onClick={() => setCidades(c)}
                    className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600 hover:bg-blue-50 hover:text-blue-700 border border-gray-200 transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>
              {!cidades.trim() && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1.5">Ou buscar por região inteira:</p>
                  <div className="flex flex-wrap gap-2">
                    {REGIOES.map(r => (
                      <button
                        key={r}
                        onClick={() => setRegiao(r)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          regiao === r
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {cidades.trim() && (
                <p className="text-xs text-green-700 mt-1.5 font-medium">
                  Busca restrita a: {cidades.trim()}
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade de leads a puxar</label>
              <div className="flex gap-2">
                {QUANTIDADES.map(q => (
                  <button
                    key={q}
                    onClick={() => setQuantidade(q)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      quantidade === q
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Segmentos</label>
              <div className="flex flex-wrap gap-2">
                {SEGMENTOS.map(s => (
                  <button
                    key={s}
                    onClick={() => toggleSeg(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                      selectedSegs.includes(s)
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1.5">
                A pesquisa agora é feita pelo Claude Code (sem custo de API). Copie o comando abaixo, cole no Claude Code aberto nesta pasta e, quando ele terminar, clique em &quot;Atualizar lista&quot;.
              </p>
              <code className="block text-xs text-gray-800 break-words">{comando}</code>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
                Fechar
              </button>
              <button
                onClick={() => { onRefresh(); onClose(); }}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Atualizar lista
              </button>
              <button
                onClick={copiar}
                disabled={selectedSegs.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                {copied ? 'Copiado!' : 'Copiar comando'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
