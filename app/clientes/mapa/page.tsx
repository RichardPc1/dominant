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

const COR_SEGMENTO = '#94a3b8';
const COR_CIDADE = '#67e8f9';

export default function MapaClientesPage() {
  const [leads, setLeads] = useState<Lead[]>(() => leadsEmCache() ?? []);
  const [loading, setLoading] = useState(() => !leadsEmCache());
  const [showSeg, setShowSeg] = useState(true);
  const [showCidade, setShowCidade] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const [snap, setSnap] = useState<Snap>(new Map());

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
      nodes.push({
        id: `c:${l.id}`, kind: 'cliente', label: l.nome,
        r: 14 + Math.min(n, 8) * 1.4, cor: etapaDef(l.etapaFunil!).cor, lead: l,
      });
      const seg = (l.segmento || '').trim();
      const cid = (l.localizacao || '').trim();
      if (showSeg && seg) { segs.add(seg); links.push({ a: `c:${l.id}`, b: `s:${seg}` }); }
      if (showCidade && cid) { cidades.add(cid); links.push({ a: `c:${l.id}`, b: `l:${cid}` }); }
    }
    for (const s of segs) nodes.push({ id: `s:${s}`, kind: 'segmento', label: s, r: 7, cor: COR_SEGMENTO });
    for (const c of cidades) nodes.push({ id: `l:${c}`, kind: 'cidade', label: c, r: 7, cor: COR_CIDADE });
    return { nodes, links };
  }, [noFunil, showSeg, showCidade]);

  // --- simulação de forças (física no ref; snapshot no estado pra renderizar) ---
  const pos = useRef<Map<string, Pos>>(new Map());
  const dragId = useRef<string | null>(null);
  const moved = useRef(false);
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
          const rep = (7000 / d2) * alpha;
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

  function toSvg(e: React.PointerEvent): { x: number; y: number } {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const m = svg.getScreenCTM();
    if (!m) return { x: 0, y: 0 };
    const r = pt.matrixTransform(m.inverse());
    return { x: r.x, y: r.y };
  }

  const vizinhos = useMemo(() => {
    if (!sel) return null;
    const cid = `c:${sel}`;
    const set = new Set<string>([cid]);
    for (const l of graph.links) {
      if (l.a === cid) set.add(l.b);
      if (l.b === cid) set.add(l.a);
    }
    for (const l of graph.links) {
      if (set.has(l.a)) set.add(l.b);
      if (set.has(l.b)) set.add(l.a);
    }
    return set;
  }, [sel, graph.links]);

  const leadSel = sel ? noFunil.find(l => l.id === sel) ?? null : null;

  return (
    <div className="min-h-full flex flex-col">
      <header className="px-4 sm:px-6 lg:px-8 pt-6 pb-2 flex items-center gap-3 flex-wrap">
        <div className="mr-2">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2"><Icon name="mapa" className="w-6 h-6 text-indigo-600" /> {t("Mapa de clientes")}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t("Clientes do funil ligados pelo que têm em comum")}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
            <input type="checkbox" checked={showSeg} onChange={e => setShowSeg(e.target.checked)} /> <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COR_SEGMENTO }} /> {t("Segmento")}
          </label>
          <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
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
          <div className="flex-1 rounded-2xl border border-gray-200 bg-white overflow-hidden relative">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full touch-none select-none"
              style={{ height: '72vh' }}
              onPointerMove={e => {
                if (!dragId.current) return;
                const { x, y } = toSvg(e);
                const p = pos.current.get(dragId.current);
                if (p) { p.x = x; p.y = y; p.vx = 0; p.vy = 0; }
                moved.current = true; reheat.current(); publicar(graph.nodes);
              }}
              onPointerUp={() => {
                const id = dragId.current;
                if (id && !moved.current) {
                  const n = graph.nodes.find(x => x.id === id);
                  if (n?.kind === 'cliente' && n.lead) setSel(n.lead.id);
                  else setSel(null);
                }
                dragId.current = null;
              }}
              onPointerLeave={() => { dragId.current = null; }}
              onPointerDown={e => { if (e.target === e.currentTarget) setSel(null); }}
            >
              {/* arestas */}
              {graph.links.map((l, i) => {
                const a = snap.get(l.a), b = snap.get(l.b);
                if (!a || !b) return null;
                const aceso = !vizinhos || (vizinhos.has(l.a) && vizinhos.has(l.b));
                return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={aceso ? '#cbd5e1' : '#eef2f6'} strokeWidth={aceso ? 1.4 : 1} />;
              })}
              {/* nós */}
              {graph.nodes.map(n => {
                const p = snap.get(n.id);
                if (!p) return null;
                const aceso = !vizinhos || vizinhos.has(n.id);
                const selecionado = n.kind === 'cliente' && n.lead?.id === sel;
                return (
                  <g key={n.id} transform={`translate(${p.x},${p.y})`} style={{ cursor: 'pointer', opacity: aceso ? 1 : 0.25 }}
                     onPointerDown={e => { e.stopPropagation(); dragId.current = n.id; moved.current = false; }}>
                    <circle r={n.r} fill={n.cor} stroke={selecionado ? '#111827' : '#ffffff'} strokeWidth={selecionado ? 3 : 2} />
                    <text
                      y={n.r + (n.kind === 'cliente' ? 14 : 12)} textAnchor="middle"
                      fontSize={n.kind === 'cliente' ? 13 : 11}
                      fontWeight={n.kind === 'cliente' ? 700 : 500}
                      fill={n.kind === 'cliente' ? '#1f2937' : '#64748b'}
                    >
                      {n.label.length > 22 ? n.label.slice(0, 21) + '…' : n.label}
                    </text>
                  </g>
                );
              })}
            </svg>

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
                {t("Clique num cliente pra ver os detalhes. Arraste os nós pra organizar o mapa.")}
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
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3 lg:sticky lg:top-4">
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
      <Link href={`/call/${lead.id}`} className="block text-center text-sm font-semibold text-white bg-indigo-600 rounded-lg py-2 hover:bg-indigo-700">{t("Abrir ficha completa →")}</Link>
    </div>
  );
}
