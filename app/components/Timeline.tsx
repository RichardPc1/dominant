'use client';
import { t } from '@/lib/i18n';
import { useMemo, useState } from 'react';
import { Evento, Lado, Lead, StatusReuniao } from '@/lib/types';
import {
  LADO_COR, LADO_LABEL, STATUS_REUNIAO, STATUS_REUNIAO_COR,
  contarReunioes, contarTarefas, eventosDe, novaNota, novaReuniao, novaTarefa,
  tiposReuniaoSugeridos, timelineOrdenada,
} from '@/lib/funil';
import IconPicker from './IconPicker';

function hojeISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const brData = (iso?: string) => (iso ? iso.split('-').reverse().join('/') : t('data a confirmar'));

type Modo = 'reuniao' | 'tarefa' | 'nota' | null;
const LADOS: Lado[] = ['eu', 'cliente', 'ambos'];

/**
 * Linha do tempo do cliente: reuniões (com tipo/ícone livres + template),
 * tarefas, pendências e notas, num fluxo que se atualiza conforme você conclui.
 * Lê/escreve só `timeline` do lead — nunca toca no kanban.
 * Na primeira escrita, migra sozinho o que estava em `reunioes` (via eventosDe).
 */
export default function Timeline({ lead, onPatch }: { lead: Lead; onPatch: (u: Partial<Lead>) => void }) {
  const eventos = eventosDe(lead);
  const linha = timelineOrdenada(lead);
  const cr = contarReunioes(lead);
  const ct = contarTarefas(lead);
  const sugestoes = useMemo(() => tiposReuniaoSugeridos(lead), [lead]);

  const [modo, setModo] = useState<Modo>(null);
  const [editId, setEditId] = useState<string | null>(null);

  // --- reunião ---
  const [rRotulo, setRRotulo] = useState('Apresentação');
  const [rIcone, setRIcone] = useState('👋');
  const [rOutro, setROutro] = useState(false);
  const [rData, setRData] = useState(hojeISO());
  const [rHora, setRHora] = useState('');
  const [rStatus, setRStatus] = useState<StatusReuniao>('Agendada');
  const [pContexto, setPContexto] = useState('');
  const [pAssunto, setPAssunto] = useState('');
  const [pPendencias, setPPendencias] = useState('');
  const [pAcoes, setPAcoes] = useState('');
  const [acoesViramTarefa, setAcoesViramTarefa] = useState(true);

  // --- tarefa ---
  const [tTitulo, setTTitulo] = useState('');
  const [tLado, setTLado] = useState<Lado>('eu');
  const [tPrazo, setTPrazo] = useState('');
  const [tNota, setTNota] = useState('');

  // --- nota ---
  const [nTitulo, setNTitulo] = useState('');
  const [nData, setNData] = useState(hojeISO());

  function limpar() {
    setModo(null); setEditId(null); setROutro(false);
    setRRotulo('Apresentação'); setRIcone('👋'); setRData(hojeISO()); setRHora(''); setRStatus('Agendada');
    setPContexto(''); setPAssunto(''); setPPendencias(''); setPAcoes(''); setAcoesViramTarefa(true);
    setTTitulo(''); setTLado('eu'); setTPrazo(''); setTNota('');
    setNTitulo(''); setNData(hojeISO());
  }

  function persistir(prox: Evento[]) { onPatch({ timeline: prox }); limpar(); }

  function abrir(tipo: Exclude<Modo, null>) {
    limpar(); setModo(tipo);
  }

  function escolherTipoReuniao(rotulo: string) {
    if (rotulo === '__outro__') { setROutro(true); setRRotulo(''); return; }
    setROutro(false); setRRotulo(rotulo);
    const s = sugestoes.find(x => x.rotulo === rotulo);
    if (s) setRIcone(s.icone);
  }

  function editar(ev: Evento) {
    limpar();
    setEditId(ev.id);
    if (ev.tipo === 'reuniao') {
      setModo('reuniao');
      const rot = ev.rotulo || ev.titulo || 'Reunião';
      const conhecido = sugestoes.some(s => s.rotulo === rot);
      setROutro(!conhecido); setRRotulo(rot); setRIcone(ev.icone || '🤝');
      setRData(ev.data || ''); setRHora(ev.hora || ''); setRStatus(ev.statusReuniao || 'Agendada');
      setPContexto(ev.pauta?.contexto || ''); setPAssunto(ev.pauta?.assunto || '');
      setPPendencias(ev.pauta?.pendencias || ''); setPAcoes(ev.pauta?.acoes || ''); setAcoesViramTarefa(false);
    } else if (ev.tipo === 'tarefa') {
      setModo('tarefa');
      setTTitulo(ev.titulo || ''); setTLado(ev.lado || 'eu'); setTPrazo(ev.prazo || ''); setTNota(ev.nota || '');
    } else {
      setModo('nota');
      setNTitulo(ev.titulo || ev.nota || ''); setNData(ev.data || hojeISO());
    }
  }

  function salvarReuniao() {
    const rotulo = (rRotulo || 'Reunião').trim();
    const pauta = {
      contexto: pContexto.trim() || undefined,
      assunto: pAssunto.trim() || undefined,
      pendencias: pPendencias.trim() || undefined,
      acoes: pAcoes.trim() || undefined,
    };
    const temPauta = Object.values(pauta).some(Boolean);
    const base = novaReuniao({ rotulo, icone: rIcone, data: rData, hora: rHora, statusReuniao: rStatus, pauta: temPauta ? pauta : undefined });

    let prox: Evento[];
    if (editId) {
      prox = eventos.map(e => (e.id === editId ? { ...base, id: e.id, criadoEm: e.criadoEm } : e));
    } else {
      prox = [...eventos, base];
    }
    // ações viram tarefas (uma por linha)
    if (!editId && acoesViramTarefa && pauta.acoes) {
      const tarefas = pauta.acoes.split('\n').map(s => s.trim()).filter(Boolean)
        .map(titulo => novaTarefa({ titulo, lado: 'eu' }));
      prox = [...prox, ...tarefas];
    }
    persistir(prox);
  }

  function salvarTarefa() {
    const titulo = tTitulo.trim();
    if (!titulo) return;
    const base = novaTarefa({ titulo, lado: tLado, prazo: tPrazo, nota: tNota });
    const prox = editId
      ? eventos.map(e => (e.id === editId ? { ...e, titulo, lado: tLado, prazo: tPrazo || undefined, data: tPrazo || undefined, nota: tNota.trim() || undefined } : e))
      : [...eventos, base];
    persistir(prox);
  }

  function salvarNota() {
    const titulo = nTitulo.trim();
    if (!titulo) return;
    const prox = editId
      ? eventos.map(e => (e.id === editId ? { ...e, titulo, data: nData || undefined } : e))
      : [...eventos, novaNota({ titulo, data: nData })];
    persistir(prox);
  }

  function mudarStatusReuniao(id: string, novo: StatusReuniao) {
    onPatch({ timeline: eventos.map(e => (e.id === id ? { ...e, statusReuniao: novo, estado: novo === 'Realizada' ? 'feito' : novo === 'Cancelada' ? 'cancelado' : 'aberto' } : e)) });
  }

  function alternarTarefa(id: string) {
    onPatch({ timeline: eventos.map(e => {
      if (e.id !== id) return e;
      const feito = e.estado === 'feito';
      return { ...e, estado: feito ? 'aberto' : 'feito', feitoEm: feito ? undefined : new Date().toISOString() };
    }) });
  }

  function remover(id: string) {
    if (!window.confirm(t('Remover este item da linha do tempo?'))) return;
    onPatch({ timeline: eventos.filter(e => e.id !== id) });
    if (editId === id) limpar();
  }

  function acaoVirarTarefa(texto: string) {
    const titulo = texto.trim();
    if (!titulo) return;
    onPatch({ timeline: [...eventos, novaTarefa({ titulo, lado: 'eu' })] });
  }

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 text-gray-600 px-2 py-1 font-medium">🤝 {cr.total} {t(cr.total === 1 ? 'reunião' : 'reuniões')}</span>
        {cr.realizadas > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 text-emerald-800 px-2 py-1 font-medium">✅ {cr.realizadas} {t("feita")}{cr.realizadas > 1 ? 's' : ''}</span>}
        {cr.agendadas > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 text-blue-800 px-2 py-1 font-medium">📅 {cr.agendadas} {t("agendada")}{cr.agendadas > 1 ? 's' : ''}</span>}
        {ct.minhas > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-blue-100 text-blue-800 px-2 py-1 font-medium">🙋 {ct.minhas} {t("comigo")}</span>}
        {ct.doCliente > 0 && <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 text-amber-800 px-2 py-1 font-medium">⏳ {ct.doCliente} {t("com o cliente")}</span>}
      </div>

      {/* Botões de adicionar */}
      {!modo && (
        <div className="flex flex-wrap gap-2">
          <button onClick={() => abrir('reuniao')} className="flex-1 min-w-[7rem] text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg py-2 border border-indigo-200">🤝 {t("Reunião")}</button>
          <button onClick={() => abrir('tarefa')} className="flex-1 min-w-[7rem] text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg py-2 border border-emerald-200">✅ {t("Tarefa / pendência")}</button>
          <button onClick={() => abrir('nota')} className="flex-1 min-w-[7rem] text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg py-2 border border-gray-200">📝 {t("Nota")}</button>
        </div>
      )}

      {/* Composer: reunião */}
      {modo === 'reuniao' && (
        <div className="rounded-xl border border-indigo-200 bg-white p-3 space-y-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{editId ? t("Editando reunião") : t("Nova reunião")}</p>
          <div className="flex items-end gap-2 flex-wrap">
            <div className="flex-1 min-w-[10rem]">
              <label className="block text-[11px] font-medium text-gray-500 mb-1">{t("Tipo")}</label>
              {rOutro ? (
                <input autoFocus type="text" value={rRotulo} onChange={e => setRRotulo(e.target.value)} placeholder={t("nome do tipo de reunião")} className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400" />
              ) : (
                <select value={rRotulo} onChange={e => escolherTipoReuniao(e.target.value)} className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-indigo-400">
                  {sugestoes.map(s => <option key={s.rotulo} value={s.rotulo}>{s.rotulo}</option>)}
                  <option value="__outro__">✏️ {t("Outro nome…")}</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-500 mb-1">{t("Ícone")}</label>
              <IconPicker value={rIcone} onChange={setRIcone} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="date" value={rData} onChange={e => setRData(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400" />
            <input type="text" value={rHora} onChange={e => setRHora(e.target.value)} placeholder="14:30" className="w-24 text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400" />
            <select value={rStatus} onChange={e => setRStatus(e.target.value as StatusReuniao)} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white outline-none focus:border-indigo-400">
              {STATUS_REUNIAO.map(s => <option key={s} value={s}>{t(s)}</option>)}
            </select>
          </div>
          <p className="text-[10px] text-gray-400 -mt-1">{t("deixe a data vazia se ainda não foi confirmada")}</p>

          {/* Template da reunião */}
          <div className="space-y-2 pt-1">
            <CampoTemplate rotulo={t("Contexto")} valor={pContexto} onChange={setPContexto} placeholder={t("De onde vem essa reunião, o que já rolou antes…")} />
            <CampoTemplate rotulo={t("Assunto principal")} valor={pAssunto} onChange={setPAssunto} placeholder={t("O foco do encontro")} />
            <CampoTemplate rotulo={t("Pendências")} valor={pPendencias} onChange={setPPendencias} placeholder={t("O que estava em aberto antes / ficou de resolver")} />
            <CampoTemplate rotulo={t("Ações que saíram")} valor={pAcoes} onChange={setPAcoes} placeholder={t("Uma ação por linha — ex.: enviar proposta revisada")} />
          </div>
          {!editId && pAcoes.trim() && (
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={acoesViramTarefa} onChange={e => setAcoesViramTarefa(e.target.checked)} className="rounded" />
              {t("Criar uma tarefa pra cada linha de ações")}
            </label>
          )}
          <div className="flex gap-2">
            <button onClick={salvarReuniao} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">{editId ? t("Salvar alterações") : t("Salvar reunião")}</button>
            <button onClick={limpar} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">{t("Cancelar")}</button>
          </div>
        </div>
      )}

      {/* Composer: tarefa */}
      {modo === 'tarefa' && (
        <div className="rounded-xl border border-emerald-200 bg-white p-3 space-y-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{editId ? t("Editando tarefa") : t("Nova tarefa / pendência")}</p>
          <input autoFocus type="text" value={tTitulo} onChange={e => setTTitulo(e.target.value)} placeholder={t("O que precisa ser feito?")} className="w-full text-sm border border-gray-300 rounded-lg px-2.5 py-2 outline-none focus:border-emerald-400" />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium text-gray-500">{t("De quem é a bola?")}</span>
            {LADOS.map(l => (
              <button key={l} onClick={() => setTLado(l)} className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${tLado === l ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}>{t(LADO_LABEL[l])}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-[11px] font-medium text-gray-500">{t("Prazo")}</label>
            <input type="date" value={tPrazo} onChange={e => setTPrazo(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-emerald-400" />
          </div>
          <textarea value={tNota} onChange={e => setTNota(e.target.value)} rows={2} placeholder={t("Detalhe (opcional)")} className="w-full text-sm border border-gray-300 rounded-lg p-2.5 resize-none outline-none focus:border-emerald-400" />
          <div className="flex gap-2">
            <button onClick={salvarTarefa} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">{editId ? t("Salvar alterações") : t("Salvar tarefa")}</button>
            <button onClick={limpar} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">{t("Cancelar")}</button>
          </div>
        </div>
      )}

      {/* Composer: nota */}
      {modo === 'nota' && (
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-3">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{editId ? t("Editando nota") : t("Nova nota")}</p>
          <textarea autoFocus value={nTitulo} onChange={e => setNTitulo(e.target.value)} rows={3} placeholder={t("O que aconteceu? (atualização, recado, observação)")} className="w-full text-sm border border-gray-300 rounded-lg p-2.5 resize-none outline-none focus:border-gray-400" />
          <input type="date" value={nData} onChange={e => setNData(e.target.value)} className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 outline-none focus:border-gray-400" />
          <div className="flex gap-2">
            <button onClick={salvarNota} className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700">{editId ? t("Salvar alterações") : t("Salvar nota")}</button>
            <button onClick={limpar} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">{t("Cancelar")}</button>
          </div>
        </div>
      )}

      {/* Linha do tempo */}
      {linha.length > 0 && (
        <ol className="relative space-y-3 pl-6">
          <span className="absolute left-[9px] top-1 bottom-1 w-px bg-gray-200" aria-hidden />
          {linha.map(ev => (
            <li key={ev.id} className="relative">
              <span className="absolute -left-6 top-1 grid place-items-center w-[18px] h-[18px] rounded-full bg-white border border-gray-300 text-[10px] leading-none">{ev.icone || ICONE_FALLBACK[ev.tipo]}</span>
              <ItemEvento
                ev={ev}
                onStatus={mudarStatusReuniao}
                onToggle={alternarTarefa}
                onEditar={() => editar(ev)}
                onRemover={() => remover(ev.id)}
                onAcaoTarefa={acaoVirarTarefa}
              />
            </li>
          ))}
        </ol>
      )}

      {linha.length === 0 && !modo && (
        <p className="text-xs text-gray-400 text-center py-4">{t("Nada por aqui ainda. Registre uma reunião, uma tarefa ou uma nota.")}</p>
      )}
    </div>
  );
}

const ICONE_FALLBACK: Record<string, string> = { reuniao: '🤝', tarefa: '✅', nota: '📝', marco: '🏁' };

function CampoTemplate({ rotulo, valor, onChange, placeholder }: { rotulo: string; valor: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-gray-500 mb-1">{rotulo}</label>
      <textarea value={valor} onChange={e => onChange(e.target.value)} rows={2} placeholder={placeholder} className="w-full text-sm border border-gray-200 rounded-lg p-2 resize-none outline-none focus:border-indigo-400 bg-gray-50/60" />
    </div>
  );
}

function Pauta({ rotulo, texto, podeVirarTarefa, onAcaoTarefa }: { rotulo: string; texto: string; podeVirarTarefa?: boolean; onAcaoTarefa?: (t: string) => void }) {
  const linhas = texto.split('\n').map(s => s.trim()).filter(Boolean);
  return (
    <div className="mt-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{rotulo}</p>
      {podeVirarTarefa ? (
        <ul className="mt-0.5 space-y-0.5">
          {linhas.map((l, i) => (
            <li key={i} className="group flex items-start gap-1.5 text-sm text-gray-700">
              <span className="text-gray-300 mt-0.5">•</span>
              <span className="flex-1">{l}</span>
              {onAcaoTarefa && <button onClick={() => onAcaoTarefa(l)} title={t("Virar tarefa")} className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold text-emerald-600 hover:underline shrink-0">+ {t("tarefa")}</button>}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-line">{texto}</p>
      )}
    </div>
  );
}

function ItemEvento({ ev, onStatus, onToggle, onEditar, onRemover, onAcaoTarefa }: {
  ev: Evento;
  onStatus: (id: string, s: StatusReuniao) => void;
  onToggle: (id: string) => void;
  onEditar: () => void;
  onRemover: () => void;
  onAcaoTarefa: (t: string) => void;
}) {
  const feito = ev.estado === 'feito';

  return (
    <div className={`rounded-xl border p-3 ${feito ? 'border-gray-100 bg-gray-50/60' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center gap-2 flex-wrap">
        {ev.tipo === 'tarefa' && (
          <button onClick={() => onToggle(ev.id)} title={feito ? t("Reabrir") : t("Concluir")} className={`shrink-0 grid place-items-center w-4 h-4 rounded border ${feito ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-emerald-400'}`}>{feito ? '✓' : ''}</button>
        )}
        <span className={`text-sm font-semibold ${feito ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
          {ev.rotulo || ev.titulo}
        </span>
        {ev.tipo === 'tarefa' && ev.lado && (
          <span className={`text-[10px] font-semibold rounded px-1.5 py-0.5 ${LADO_COR[ev.lado]}`}>{t(LADO_LABEL[ev.lado])}</span>
        )}
        <span className="text-xs text-gray-400">{brData(ev.data)}{ev.hora ? ` · ${ev.hora}` : ''}</span>
        {ev.tipo === 'reuniao' && ev.statusReuniao && (
          <select value={ev.statusReuniao} onChange={e => onStatus(ev.id, e.target.value as StatusReuniao)} className={`ml-auto text-[11px] font-semibold rounded px-1.5 py-0.5 border-0 outline-none cursor-pointer ${STATUS_REUNIAO_COR[ev.statusReuniao]}`}>
            {STATUS_REUNIAO.map(s => <option key={s} value={s}>{t(s)}</option>)}
          </select>
        )}
        <button onClick={onEditar} className={`text-[11px] font-medium text-indigo-600 hover:underline ${ev.tipo === 'reuniao' ? '' : 'ml-auto'}`}>{t("editar")}</button>
        <button onClick={onRemover} className="text-[11px] text-gray-300 hover:text-red-500" title={t("Remover")}>✕</button>
      </div>

      {ev.tipo === 'reuniao' && ev.pauta && (
        <div className="mt-1 space-y-1">
          {ev.pauta.contexto && <Pauta rotulo={t("Contexto")} texto={ev.pauta.contexto} />}
          {ev.pauta.assunto && <Pauta rotulo={t("Assunto principal")} texto={ev.pauta.assunto} />}
          {ev.pauta.pendencias && <Pauta rotulo={t("Pendências")} texto={ev.pauta.pendencias} />}
          {ev.pauta.acoes && <Pauta rotulo={t("Ações que saíram")} texto={ev.pauta.acoes} podeVirarTarefa onAcaoTarefa={onAcaoTarefa} />}
        </div>
      )}
      {ev.tipo !== 'reuniao' && ev.nota && <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{ev.nota}</p>}
      {ev.tipo === 'tarefa' && ev.prazo && <p className="text-[11px] text-gray-400 mt-1">{t("Prazo:")} {brData(ev.prazo)}</p>}
    </div>
  );
}
