'use client';
import { useEffect, useRef, useState } from 'react';
import { Chamada, Lead } from '@/lib/types';
import { classificar, gerarIcs, OutcomesConfig, sugerirAgenda } from '@/lib/outcomes';

interface Linha { who: string; text: string }

// Tipagem mínima da Web Speech API (Chrome/Edge), que não vem no lib.dom.
interface Rec {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: RecEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start: (track?: MediaStreamTrack) => void;
  stop: () => void;
}
interface RecEvent {
  resultIndex: number;
  results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
}

function novoRec(): Rec | null {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  if (!C) return null;
  const r = new C();
  r.lang = 'pt-BR';
  r.continuous = true;
  r.interimResults = true;
  return r;
}

const EMAIL_RE = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }));
  const a = document.createElement('a');
  a.href = url; a.download = nome; a.click();
  URL.revokeObjectURL(url);
}

export default function LiveCall({
  lead, config, onSaved,
}: {
  lead: Lead;
  config: OutcomesConfig;
  onSaved: (updates: Partial<Lead>) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [gravando, setGravando] = useState(false);
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [parcial, setParcial] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState('');
  const [texto, setTexto] = useState('');
  const [outcomeId, setOutcomeId] = useState('');
  const [acertos, setAcertos] = useState<string[]>([]);
  const [data, setData] = useState('');
  const [hora, setHora] = useState('');
  const [email, setEmail] = useState('');
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);

  const ativo = useRef(false);
  const recs = useRef<Rec[]>([]);
  const streams = useRef<MediaStream[]>([]);
  const fim = useRef<HTMLDivElement>(null);

  const outcome = config.outcomes.find(o => o.id === outcomeId);

  useEffect(() => { fim.current?.scrollIntoView({ block: 'nearest' }); }, [linhas, parcial]);
  useEffect(() => () => pararTudo(), []);

  function pararTudo() {
    ativo.current = false;
    recs.current.forEach(r => { r.onend = null; try { r.stop(); } catch { /* já parado */ } });
    recs.current = [];
    streams.current.forEach(s => s.getTracks().forEach(t => t.stop()));
    streams.current = [];
  }

  function ligarRec(rec: Rec, who: string, track?: MediaStreamTrack) {
    rec.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        const t = res[0].transcript.trim();
        if (!t) continue;
        if (res.isFinal) {
          setLinhas(prev => [...prev, { who, text: t }]);
          setParcial(p => ({ ...p, [who]: '' }));
        } else {
          setParcial(p => ({ ...p, [who]: t }));
        }
      }
    };
    rec.onerror = e => {
      if (e.error === 'not-allowed') { setAviso('Permissão do microfone negada. Libere no cadeado da barra de endereço.'); pararTudo(); setGravando(false); }
    };
    // O Chrome encerra o reconhecimento sozinho após silêncios; reinicia enquanto a ligação estiver ativa.
    rec.onend = () => { if (ativo.current) { try { rec.start(track); } catch { /* ignora */ } } };
    rec.start(track);
  }

  async function iniciar(capturarSomDoPc: boolean) {
    setAviso('');
    setLinhas([]); setParcial({}); setTexto(''); setOutcomeId(''); setAcertos([]);
    const mic = novoRec();
    if (!mic) { setAviso('Este navegador não tem reconhecimento de voz. Use o Google Chrome ou o Edge.'); return; }
    ativo.current = true;
    recs.current = [mic];

    let temPc = false;
    if (capturarSomDoPc) {
      try {
        const ds = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        streams.current.push(ds);
        ds.getVideoTracks().forEach(t => t.stop());
        const audio = ds.getAudioTracks()[0];
        const pc = novoRec();
        if (!audio) {
          setAviso('Nenhum áudio compartilhado. Na janela do Chrome, escolha "Tela inteira" e marque "Compartilhar áudio do sistema".');
        } else if (!pc) {
          setAviso('Sem suporte a reconhecimento de voz.');
        } else {
          try { ligarRec(pc, 'Cliente', audio); recs.current.push(pc); temPc = true; }
          catch { setAviso('Este Chrome não consegue transcrever o áudio do PC (precisa de versão recente). Só a sua voz será transcrita; use o viva-voz para captar o cliente.'); }
        }
      } catch {
        setAviso('Compartilhamento de áudio cancelado. Só o microfone será transcrito.');
      }
    }
    try { ligarRec(mic, temPc ? 'Eu' : 'Conversa'); } catch { setAviso('Não consegui abrir o microfone.'); ativo.current = false; return; }
    setGravando(true);
  }

  function parar() {
    pararTudo();
    setGravando(false);
    setParcial({});
    const bruto = linhas.map(l => `${l.who}: ${l.text}`).join('\n');
    setTexto(bruto);
    classificarAgora(bruto);
  }

  function classificarAgora(t: string) {
    // Só a fala do cliente decide, se houver separação; senão a conversa toda.
    const cliente = t.split('\n').filter(l => l.startsWith('Cliente:')).join(' ');
    const base = cliente.length > 20 ? cliente : t;
    const { outcome: o, acertos: a } = classificar(base, config);
    setOutcomeId(o.id);
    setAcertos(a);
    const ag = sugerirAgenda(t);
    setData(ag.data ?? '');
    setHora(ag.hora ?? '');
    setEmail(t.match(EMAIL_RE)?.[0] ?? lead.emailRascunho?.para ?? '');
  }

  async function salvar() {
    if (!outcome) return;
    setSalvando(true);
    const d = new Date();
    const chamada: Chamada = {
      id: Math.random().toString(36).slice(2),
      data: d.toLocaleDateString('pt-BR'),
      hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      resultado: outcome.resultadoChamada,
      notas: nota,
      transcricao: texto,
      classificacao: outcome.id,
    };
    const updates: Partial<Lead> = {
      chamadas: [...(lead.chamadas ?? []), chamada],
      ultimaInteracao: chamada.data,
      coluna: outcome.coluna,
      agendaData: outcome.acao === 'agendar-ligacao' || outcome.acao === 'agendar-reuniao' ? data : '',
      agendaHora: outcome.acao === 'agendar-ligacao' || outcome.acao === 'agendar-reuniao' ? hora : '',
    };
    if (outcome.id === 'reuniao') updates.status = 'Reunião marcada';
    else if (outcome.resultadoChamada === 'Atendeu' && lead.status === 'A contatar') updates.status = 'Contatado';
    if (outcome.acao === 'email') {
      updates.emailRascunho = {
        status: 'pendente',
        para: email,
        assunto: '',
        corpo: '',
        contexto: [nota, texto].filter(Boolean).join('\n\n'),
        atualizadoEm: new Date().toISOString(),
      };
    }
    await fetch(`/api/leads/${lead.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates),
    });
    onSaved(updates);
    setSalvando(false);
    setAberto(false); setTexto(''); setLinhas([]); setOutcomeId(''); setNota('');
  }

  if (!aberto) {
    return (
      <button
        onClick={() => setAberto(true)}
        className="w-full bg-white rounded-2xl border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 text-blue-700 font-semibold text-sm py-4 transition-colors"
      >
        🎙️ Ligação ao vivo: transcrever e classificar
      </button>
    );
  }

  const revisando = !gravando && (texto || outcomeId);

  return (
    <div className="bg-white rounded-2xl border border-blue-200 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-blue-700 uppercase tracking-wide">🎙️ Ligação ao vivo</h2>
        <button onClick={() => { pararTudo(); setGravando(false); setAberto(false); }} className="text-xs text-gray-400 hover:text-gray-700">fechar</button>
      </div>

      {!gravando && !revisando && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">
            Ligue pelo celular/Phone Link e comece a transcrição. Para captar também a voz do cliente pelo PC, use a opção 2 e
            marque <b>Compartilhar áudio do sistema</b> quando o Chrome perguntar.
          </p>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => iniciar(false)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
              1 · Só microfone (viva-voz)
            </button>
            <button onClick={() => iniciar(true)} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700">
              2 · Microfone + áudio do PC
            </button>
          </div>
        </div>
      )}

      {aviso && <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2">{aviso}</p>}

      {gravando && (
        <>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-red-600">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" /> Transcrevendo...
            </span>
            <button onClick={parar} className="ml-auto px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700">
              ⏹ Encerrar e classificar
            </button>
          </div>
          <div className="h-56 overflow-y-auto bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-1.5 text-sm">
            {linhas.length === 0 && !Object.values(parcial).some(Boolean) && <p className="text-gray-400 italic">Aguardando fala...</p>}
            {linhas.map((l, i) => (
              <p key={i}><b className={l.who === 'Cliente' ? 'text-emerald-700' : 'text-blue-700'}>{l.who}:</b> {l.text}</p>
            ))}
            {Object.entries(parcial).filter(([, t]) => t).map(([w, t]) => (
              <p key={w} className="text-gray-400"><b>{w}:</b> {t}</p>
            ))}
            <div ref={fim} />
          </div>
        </>
      )}

      {revisando && (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Transcrição (edite se precisar)</p>
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onBlur={() => classificarAgora(texto)}
              rows={6}
              placeholder="Sem transcrição. Você pode digitar o que foi dito."
              className="w-full text-sm border border-gray-300 rounded-lg p-2.5 outline-none focus:border-blue-400"
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Classificação{acertos.length > 0 && <span className="normal-case font-normal text-gray-400"> · pegou: “{acertos.slice(0, 3).join('”, “')}”</span>}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {config.outcomes.map(o => (
                <button
                  key={o.id}
                  onClick={() => setOutcomeId(o.id)}
                  className={`text-left rounded-lg px-3 py-2 text-xs font-semibold border transition ${outcomeId === o.id ? o.cor + ' ring-2 ring-offset-1 ring-gray-500' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                >
                  {o.emoji} {o.label}
                </button>
              ))}
            </div>
          </div>

          {outcome && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
              <p className="text-sm text-gray-800">Próxima ação: <b>{outcome.proximaAcao}</b> <span className="text-xs text-gray-400">→ coluna “{outcome.coluna}”</span></p>

              {(outcome.acao === 'agendar-ligacao' || outcome.acao === 'agendar-reuniao') && (
                <div className="flex items-center gap-2 flex-wrap text-sm">
                  <span className="text-gray-600">{outcome.acao === 'agendar-reuniao' ? 'Reunião em' : 'Ligar em'}</span>
                  <input type="date" value={data} onChange={e => setData(e.target.value)} className="border border-gray-300 rounded px-2 py-1 text-sm" />
                  <input type="text" value={hora} onChange={e => setHora(e.target.value)} placeholder="09:30 ou tarde" className="border border-gray-300 rounded px-2 py-1 text-sm w-32" />
                  {outcome.acao === 'agendar-reuniao' && data && (
                    <button
                      onClick={() => baixar(`reuniao-${lead.nome.replace(/\W+/g, '-')}.ics`, gerarIcs(`Reunião Dominant · ${lead.nome}`, data, hora, nota || texto.slice(0, 500)), 'text/calendar')}
                      className="text-xs px-3 py-1.5 rounded-lg bg-orange-100 text-orange-800 hover:bg-orange-200 font-medium"
                    >
                      📅 Baixar compromisso (.ics)
                    </button>
                  )}
                </div>
              )}

              {outcome.acao === 'email' && (
                <div className="space-y-1">
                  <label className="text-xs text-gray-600">E-mail que o cliente passou (confira, a fala costuma errar):</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nome@empresa.com.br"
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  />
                  <p className="text-xs text-gray-400">Ao salvar, o lead entra na fila do <code>/emails</code> pra você receber o e-mail escrito sob medida. Follow-up em {config.followUpDias} dias.</p>
                </div>
              )}

              <input
                type="text" value={nota} onChange={e => setNota(e.target.value)} placeholder="Nota rápida (quem atendeu, cargo, detalhe importante)"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={salvar} disabled={!outcome || salvando} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-40">
              {salvando ? 'Salvando...' : 'Salvar ligação'}
            </button>
            <button onClick={() => { setTexto(''); setLinhas([]); setOutcomeId(''); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">
              Descartar e gravar de novo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
