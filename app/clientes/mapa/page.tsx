'use client';
import { t } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Lead } from '@/lib/types';
import {
  chipProximaReuniao, contarReunioes, contarTarefas, estaNoFunil, etapaDef, eventosDe, ETAPAS,
} from '@/lib/funil';
import { guardarLeadsEmCache, leadsEmCache } from '@/lib/leads-cache';
import Icon from '../../components/Icon';

const W = 1000, H = 700;

type Kind = 'cliente' | 'segmento' | 'cidade';
interface NodeT { id: string; kind: Kind; label: string; r: number; cor: string; lead?: Lead }
interface LinkT { a: string; b: string }
interface Pos { x: number; y: number; vx: number; vy: number }
type Snap = Map<string, { x: number; y: number }>;
interface View { k: number; tx: number; ty: number }

const COR_SEGMENTO = '#94a3b8';
const COR_CIDADE = '#22b8cf';

export default function MapaClientesPage() {
  const [leads, setLeads] = useState<Lead[]>(() => leadsEmCache() ?? []);
  const [loading, setLoading] = useState(() => !leadsEmCache());
  const [showSeg, setShowSeg] = useState(true);
  const [showCidade, setShowCidade] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [snap, setSnap] = useState<Snap>(new Map());
  const [view, setView] = useState<View>({ k: 1, tx: 0, ty: 0 });

  const carregar = useCallback(async () => {
    try {
      const d: Lead[] = await fetch('/api/leads', { cache: 'no-store' }).then(r => r.json());
      if (Array.isArray(d)) { setLeads(d); guardarLeadsEmCache(d); }
    } catch {}
    setLoading(false);
  }, []);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    carregar();
  }, [carregar]);

  const noFunil = useMemo(() => leads.filter(estaNoFunil), [leads]);

  const graph = useMemo(() => {
    const nodes: NodeT[] = [];
    const links: LinkT[] = [];
    const segs = new Set<string>();
    const cidades = new Set<string>();
    for (const l of noFunil) {
      const n = eventosDe(l).length;
      nodes.push({ id: `c:${l.id}`, kind: 'cliente', label: l.nome, r: 15 + Math.min(n, 8) * 1.5, cor: etapaDef(l.etapaFunil!).cor, lead: l });
      const seg = (l.segmento || '').trim(), cid = (l.localizacao || '').trim();
      if (showSeg && seg) { segs.add(seg); links.push({ a: `c:${l.id}`, b: `s:${seg}` }); }
      if (showCidade && cid) { cidades.add(cid); links.push({ a: `c:${l.id}`, b: `l:${cid}` }); }
    }
    for (const s of segs) nodes.push({ id: `s:${s}`, kind: 'segmento', label: s, r: 7, cor: COR_SEGMENTO });
    for (const c of cidades) nodes.push({ id: `l:${c}`, kind: 'cidade', label: c, r: 7, cor: COR_CIDADE });
    return { nodes, links };
  }, [noFunil, showSeg, showCidade]);

  // vizinhança (1 salto) de um nó — pra acender/apagar no hover e na seleção
  const vizinhosDe = useCallback((nodeId: string | null): Set<string> | null => {
    if (!nodeId) return null;
    const set = new Set<string>([nodeId]);
    for (const l of graph.links) {
      if (l.a === nodeId) set.add(l.b);
      if (l.b === nodeId) set.add(l.a);
    }
    return set;
  }, [graph.links]);

  const foco = hover ?? (sel ? `c:${sel}` : null);
  const aceso = useMemo(() => vizinhosDe(foco), [vizinhosDe, foco]);

  // --- simulação de forças (física no ref; snapshot no estado pra renderizar) ---
  const pos = useRef<Map<string, Pos>>(new Map());
  const dragId = useRef<string | null>(null);
  const moved = useRef(false);
  const pan = useRef<{ x: number; y: number } | null>(null);
  const reheat = useRef<() => void>(() => {});
  const running = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const publicar = useCallback((nodes: NodeT[]) => {
    const P = pos.current;
    setSnap(new Map(nodes.map(n => { const p = P.get(n.id)!; return [n.id, { x: p.x, y: p.y }]; })));
  }, []);

  useEffect(() => {
    const { nodes, links } = graph;
    const P = pos.current;
    nodes.forEach((n, i) => {
      if (!P.has(n.id)) {
        const ang = i * 2.399, rad = 70 + (i % 9) * 26;
        P.set(n.id, { x: W / 2 + Math.cos(ang) * rad, y: H / 2 + Math.sin(ang) * rad, vx: 0, vy: 0 });
      }
    });
    for (const id of [...P.keys()]) if (!nodes.some(n => n.id === id)) P.delete(id);

    let alpha = 1, raf = 0, stopped = false;
    function step() {
      for (let i = 0; i < nodes.length; i++) {
        const a = P.get(nodes[i].id)!;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = P.get(nodes[j].id)!;
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = Math.max(dx * dx + dy * dy, 0.01), d = Math.sqrt(d2);
          const rep = (7200 / d2) * alpha;
          const fx = (dx / d) * rep, fy = (dy / d) * rep;
          a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
        }
      }
      for (const l of links) {
        const a = P.get(l.a), b = P.get(l.b);
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.max(Math.hypot(dx, dy), 0.01);
        const f = (d - 135) * 0.02 * alpha;
        const fx = (dx / d) * f, fy = (dy / d) * f;
        a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
      }
      for (const n of nodes) {
        const p = P.get(n.id)!;
        if (n.id === dragId.current) continue;
        p.vx += (W / 2 - p.x) * 0.004 * alpha;
        p.vy += (H / 2 - p.y) * 0.004 * alpha;
        p.vx *= 0.86; p.vy *= 0.86;
        p.x += p.vx; p.y += p.vy;
        p.x = Math.max(28, Math.min(W - 28, p.x));
        p.y = Math.max(28, Math.min(H - 28, p.y));
      }
      alpha *= 0.99;
      publicar(nodes);
      if (alpha > 0.015 && !stopped) raf = requestAnimationFrame(step);
      else running.current = false;
    }
    running.current = true;
    raf = requestAnimationFrame(step);
    reheat.current = () => {
      alpha = Math.max(alpha, 0.5);
      if (!running.current && !stopped) { running.current = true; raf = requestAnimationFrame(step); }
    };
    return () => { stopped = true; cancelAnimationFrame(raf); running.current = false; };
  }, [graph, publicar]);

  // coordenadas do ponteiro no espaço do viewBox
  function toVB(e: React.PointerEvent | React.WheelEvent): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  }
  // viewBox → espaço do grafo (desfaz o transform do grupo)
  const vbParaGrupo = (p: { x: number; y: number }, v: View) => ({ x: (p.x - v.tx) / v.k, y: (p.y - v.ty) / v.k });

  function zoomEm(fator: number, cx: number, cy: number) {
    setView(v => {
      const k = Math.max(0.4, Math.min(3, v.k * fator));
      const g = vbParaGrupo({ x: cx, y: cy }, v);
      return { k, tx: cx - g.x * k, ty: cy - g.y * k };
    });
  }

  const leadSel = sel ? noFunil.find(l => l.id === sel) ?? null : null;

  return (
    <div className="min-h-full flex flex-col">
      <header className="px-4 sm:px-6 lg:px-8 pt-6 pb-2 flex items-center gap-3 flex-wrap">
        <div className="mr-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2"><Icon name="mapa" className="w-6 h-6 text-indigo-600" /> {t("Mapa de clientes")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("Clientes do funil ligados pelo que têm em comum")}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 cursor-pointer">
            <input type="checkbox" checked={showSeg} onChange={e => setShowSeg(e.target.checked)} /> <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COR_SEGMENTO }} /> {t("Segmento")}
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 cursor-pointer">
            <input type="checkbox" checked={showCidade} onChange={e => setShowCidade(e.target.checked)} /> <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COR_CIDADE }} /> {t("Cidade")}
          </label>
          <Link href="/clientes" className="inline-flex items-center gap-2 h-9 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg px-3 hover:bg-gray-50">
            <Icon name="clientes" className="w-4 h-4" /> {t("Funil")}
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="py-20 text-center text-gray-400">{t("Carregando...")}</div>
      ) : noFunil.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
          <p className="text-5xl mb-3">🕸️</p>
          <h2 className="text-lg font-bold text-gray-800">{t("Nenhum cliente no funil ainda")}</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">{t("Quando houver negócios no funil, eles aparecem aqui ligados por segmento e cidade.")}</p>
          <Link href="/clientes" className="mt-5 h-10 inline-flex items-center text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl px-5 shadow-md shadow-blue-600/25 hover:brightness-110">{t("Ir pro funil")}</Link>
        </div>
      ) : (
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 flex flex-col lg:flex-row gap-4">
          <div className="flex-1 rounded-2xl border border-gray-200 bg-[var(--color-gray-50)] overflow-hidden relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full touch-none select-none"
              style={{ height: '74vh' }}
              onWheel={e => { const p = toVB(e); zoomEm(e.deltaY < 0 ? 1.12 : 0.89, p.x, p.y); }}
              onPointerDown={e => {
                if (e.target === e.currentTarget) {
                  pan.current = toVB(e); moved.current = false;
                  svgRef.current?.setPointerCapture(e.pointerId);
                }
              }}
              onPointerMove={e => {
                if (dragId.current) {
                  const g = vbParaGrupo(toVB(e), view);
                  const p = pos.current.get(dragId.current);
                  if (p) { p.x = g.x; p.y = g.y; p.vx = 0; p.vy = 0; }
                  moved.current = true; reheat.current(); publicar(graph.nodes);
                } else if (pan.current) {
                  const n = toVB(e);
                  const dx = n.x - pan.current.x, dy = n.y - pan.current.y;
                  pan.current = n; moved.current = true;
                  setView(v => ({ ...v, tx: v.tx + dx, ty: v.ty + dy }));
                }
              }}
              onPointerUp={e => {
                if (dragId.current && !moved.current) {
                  const nd = graph.nodes.find(x => x.id === dragId.current);
                  setSel(nd?.kind === 'cliente' && nd.lead ? nd.lead.id : null);
                } else if (pan.current && !moved.current) {
                  setSel(null);
                }
                dragId.current = null; pan.current = null;
                svgRef.current?.releasePointerCapture?.(e.pointerId);
              }}
            >
              <defs>
                <filter id="sombra" x="-40%" y="-40%" width="180%" height="180%">
                  <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0f172a" floodOpacity="0.22" />
                </filter>
              </defs>

              <g transform={`translate(${view.tx},${view.ty}) scale(${view.k})`}>
                {/* arestas */}
                {graph.links.map((l, i) => {
                  const a = snap.get(l.a), b = snap.get(l.b);
                  if (!a || !b) return null;
                  const on = !aceso || (aceso.has(l.a) && aceso.has(l.b));
                  return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={on ? 'stroke-gray-300' : 'stroke-gray-200'} strokeWidth={on ? 1.6 : 1} style={{ transition: 'stroke 0.2s, opacity 0.2s', opacity: on ? 1 : 0.4 }} />;
                })}
                {/* nós */}
                {graph.nodes.map(n => {
                  const p = snap.get(n.id);
                  if (!p) return null;
                  const on = !aceso || aceso.has(n.id);
                  const cliente = n.kind === 'cliente';
                  const selecionado = cliente && n.lead?.id === sel;
                  return (
                    <g
                      key={n.id} transform={`translate(${p.x},${p.y})`}
                      style={{ cursor: 'pointer', opacity: on ? 1 : 0.2, transition: 'opacity 0.2s' }}
                      onPointerDown={e => { e.stopPropagation(); dragId.current = n.id; moved.current = false; svgRef.current?.setPointerCapture(e.pointerId); }}
                      onPointerEnter={() => setHover(n.id)}
                      onPointerLeave={() => setHover(h => (h === n.id ? null : h))}
                    >
                      {selecionado && <circle r={n.r + 6} fill="none" className="stroke-indigo-400" strokeWidth={2} style={{ opacity: 0.6 }} />}
                      <circle r={n.r} fill={n.cor} className="stroke-white" strokeWidth={cliente ? 2.5 : 1.5} filter={cliente ? 'url(#sombra)' : undefined} />
                      <text
                        y={n.r + (cliente ? 15 : 13)} textAnchor="middle"
                        fontSize={cliente ? 13 : 11} fontWeight={cliente ? 700 : 500}
                        className={cliente ? 'fill-gray-800' : 'fill-gray-500'}
                        stroke="var(--color-gray-50)" strokeWidth={3} paintOrder="stroke" strokeLinejoin="round"
                      >
                        {n.label.length > 24 ? n.label.slice(0, 23) + '…' : n.label}
                      </text>
                    </g>
                  );
                })}
              </g>
            </svg>

            {/* controles de zoom */}
            <div className="absolute top-3 right-3 flex flex-col gap-1">
              <button onClick={() => zoomEm(1.2, W / 2, H / 2)} className="grid place-items-center w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50 text-lg leading-none">+</button>
              <button onClick={() => zoomEm(0.83, W / 2, H / 2)} className="grid place-items-center w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50 text-lg leading-none">−</button>
              <button onClick={() => setView({ k: 1, tx: 0, ty: 0 })} title={t("Centralizar")} className="grid place-items-center w-8 h-8 rounded-lg bg-white border border-gray-200 text-gray-600 shadow-sm hover:bg-gray-50"><Icon name="alvo" className="w-4 h-4" /></button>
            </div>

            {/* legenda das fases */}
            <div className="absolute bottom-3 left-3 flex flex-wrap gap-x-3 gap-y-1 bg-white/90 backdrop-blur border border-gray-100 rounded-lg px-2.5 py-1.5 text-[11px] text-gray-600 max-w-[85%]">
              {ETAPAS.map(e => (
                <span key={e.id} className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: e.cor }} /> {t(e.titulo)}</span>
              ))}
            </div>
          </div>

          {/* painel do cliente selecionado */}
          <aside className="lg:w-72 shrink-0">
            {leadSel ? <PainelCliente lead={leadSel} /> : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-5 text-center text-sm text-gray-400">
                {t("Clique num cliente pra ver os detalhes. Arraste os nós, a roda dá zoom e o fundo arrasta o mapa.")}
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

function PainelCliente({ lead }: { lead: Lead }) {
  const def = etapaDef(lead.etapaFunil!);
  const cr = contarReunioes(lead);
  const ct = contarTarefas(lead);
  const chip = chipProximaReuniao(lead);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden lg:sticky lg:top-4">
      <div className="h-1.5" style={{ background: def.cor }} />
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 leading-tight">{lead.nome}</h3>
          <p className="text-xs text-gray-400 mt-0.5">{[lead.segmento, lead.localizacao].filter(Boolean).join(' · ')}</p>
        </div>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-lg px-2 py-1 ${def.selo}`}>{def.icone} {t(def.titulo)}</span>
        {chip && <div className={`inline-block rounded px-2 py-0.5 text-[11px] font-bold ${chip.classes}`}>🗓️ {chip.texto}</div>}
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded bg-gray-100 text-gray-600 px-1.5 py-0.5 font-semibold">🤝 {cr.total}</span>
          {cr.realizadas > 0 && <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.5 font-semibold">✅ {cr.realizadas}</span>}
          {ct.minhas > 0 && <span className="rounded bg-blue-100 text-blue-800 px-1.5 py-0.5 font-semibold">🙋 {ct.minhas}</span>}
          {ct.doCliente > 0 && <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.5 font-semibold">⏳ {ct.doCliente}</span>}
        </div>
        <Link href={`/clientes/${lead.id}`} className="block text-center text-sm font-semibold text-white bg-indigo-600 rounded-lg py-2 hover:bg-indigo-700">{t("Abrir cliente →")}</Link>
      </div>
    </div>
  );
}
