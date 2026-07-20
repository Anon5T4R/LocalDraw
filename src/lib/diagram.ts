// Gerador de fluxograma — o contrato da suíte (padrão deckgen do LocalSlides):
// **a IA propõe um JSON simples, o código valida e monta a geometria**. Nunca
// aplicamos coordenadas/elementos crus do modelo: ele só descreve nós e ligações;
// o layout e a conversão pro Excalidraw são determinísticos e testados aqui.
//
// Este módulo é PURO (sem importar o Excalidraw) pra rodar leve no vitest. A
// conversão final pra elementos vive em `diagramBuild.ts`.

import { routeConnector, type Point, type Rect } from "./route";

export type NodeType =
  | "process"
  | "decision"
  | "terminator"
  | "data"
  | "database"
  | "document";

export interface DiagramNode {
  id: string;
  type: NodeType;
  label: string;
}

export interface DiagramEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DiagramSpec {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

const NODE_TYPES: NodeType[] = [
  "process",
  "decision",
  "terminator",
  "data",
  "database",
  "document",
];

/** Excalidraw só tem rectangle/diamond/ellipse — mapeamos as formas de fluxograma. */
export type Shape = "rectangle" | "diamond" | "ellipse";

export interface ShapeStyle {
  shape: Shape;
  width: number;
  height: number;
  bg: string;
  stroke: string;
}

/** Estilo por tipo de nó — cores do palette padrão do Excalidraw (bom no claro e no escuro). */
export function styleFor(type: NodeType): ShapeStyle {
  switch (type) {
    case "decision":
      return { shape: "diamond", width: 200, height: 120, bg: "#fff9db", stroke: "#f08c00" };
    case "terminator":
      return { shape: "ellipse", width: 180, height: 72, bg: "#ebfbee", stroke: "#2f9e44" };
    case "database":
      return { shape: "ellipse", width: 180, height: 96, bg: "#f3f0ff", stroke: "#7048e8" };
    case "data":
      return { shape: "rectangle", width: 190, height: 76, bg: "#fff0f6", stroke: "#e64980" };
    case "document":
      return { shape: "rectangle", width: 190, height: 80, bg: "#fff4e6", stroke: "#e8590c" };
    case "process":
    default:
      return { shape: "rectangle", width: 190, height: 76, bg: "#e7f5ff", stroke: "#1971c2" };
  }
}

/**
 * Valida a resposta bruta da IA num DiagramSpec seguro:
 * - nós precisam de id e label (tipo desconhecido vira "process");
 * - ids duplicados são descartados (fica o primeiro);
 * - arestas que apontam pra nó inexistente são descartadas;
 * - lança se não sobrar nenhum nó válido.
 */
export function parseDiagramSpec(raw: unknown): DiagramSpec {
  if (!raw || typeof raw !== "object") throw new Error("a IA não devolveu um objeto");
  const obj = raw as Record<string, unknown>;
  const rawNodes = Array.isArray(obj.nodes) ? obj.nodes : [];
  const rawEdges = Array.isArray(obj.edges) ? obj.edges : [];

  const nodes: DiagramNode[] = [];
  const seen = new Set<string>();
  for (const n of rawNodes) {
    if (!n || typeof n !== "object") continue;
    const r = n as Record<string, unknown>;
    const id = String(r.id ?? "").trim();
    const label = String(r.label ?? r.text ?? "").trim();
    if (!id || !label || seen.has(id)) continue;
    const t = String(r.type ?? "").trim().toLowerCase();
    const type = (NODE_TYPES as string[]).includes(t) ? (t as NodeType) : "process";
    seen.add(id);
    nodes.push({ id, type, label });
  }
  if (nodes.length === 0) throw new Error("a IA não devolveu nós válidos");

  const ids = new Set(nodes.map((n) => n.id));
  const edges: DiagramEdge[] = [];
  const edgeSeen = new Set<string>();
  for (const e of rawEdges) {
    if (!e || typeof e !== "object") continue;
    const r = e as Record<string, unknown>;
    const from = String(r.from ?? r.source ?? "").trim();
    const to = String(r.to ?? r.target ?? "").trim();
    if (!ids.has(from) || !ids.has(to) || from === to) continue;
    const key = `${from}->${to}`;
    if (edgeSeen.has(key)) continue;
    edgeSeen.add(key);
    const label = r.label != null ? String(r.label).trim() : "";
    edges.push(label ? { from, to, label } : { from, to });
  }

  return { nodes, edges };
}

export interface Pos {
  cx: number;
  cy: number;
}

const GAP_X = 60;
const GAP_Y = 70;
const COL_W = 200 + GAP_X; // largura de coluna = maior nó + folga
const ROW_H = 120 + GAP_Y;

/**
 * Layout topológico em camadas (Kahn). Fonte(s) na camada 0, cada aresta empurra
 * o destino uma camada abaixo; ciclos (nós que nunca zeram o grau de entrada)
 * caem numa camada extra ao final — nunca trava. Retorna o centro de cada nó.
 */
export function layoutDiagram(spec: DiagramSpec): Map<string, Pos> {
  const { nodes, edges } = spec;
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    indeg.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    adj.get(e.from)!.push(e.to);
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
  }

  const layer = new Map<string, number>();
  const queue: string[] = [];
  for (const n of nodes) if ((indeg.get(n.id) ?? 0) === 0) {
    layer.set(n.id, 0);
    queue.push(n.id);
  }
  while (queue.length) {
    const u = queue.shift()!;
    const lu = layer.get(u) ?? 0;
    for (const v of adj.get(u) ?? []) {
      layer.set(v, Math.max(layer.get(v) ?? 0, lu + 1));
      const d = (indeg.get(v) ?? 1) - 1;
      indeg.set(v, d);
      if (d === 0) queue.push(v);
    }
  }
  // Ciclos: o que sobrou sem camada firme vai pra uma faixa abaixo de tudo.
  let maxLayer = -1;
  for (const l of layer.values()) maxLayer = Math.max(maxLayer, l);
  for (const n of nodes) if (!layer.has(n.id)) layer.set(n.id, maxLayer + 1);

  // Agrupa por camada preservando a ordem de entrada (estável).
  const byLayer = new Map<number, string[]>();
  for (const n of nodes) {
    const l = layer.get(n.id)!;
    if (!byLayer.has(l)) byLayer.set(l, []);
    byLayer.get(l)!.push(n.id);
  }

  const pos = new Map<string, Pos>();
  for (const [l, ids] of byLayer) {
    const count = ids.length;
    ids.forEach((id, i) => {
      const cx = (i - (count - 1) / 2) * COL_W;
      const cy = l * ROW_H;
      pos.set(id, { cx, cy });
    });
  }
  return pos;
}

/** Skeleton do Excalidraw (forma solta pra não importar os tipos do pacote aqui). */
export interface Skel {
  type: Shape | "arrow";
  id?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  label?: { text: string };
  backgroundColor?: string;
  strokeColor?: string;
  start?: { id: string };
  end?: { id: string };
  /** Pontos da seta, RELATIVOS a x/y (contrato do Excalidraw). */
  points?: [number, number][];
}

/** Retângulo de cada nó no layout — base do roteamento dos conectores. */
export function nodeRects(spec: DiagramSpec, pos: Map<string, Pos>): Map<string, Rect> {
  const rects = new Map<string, Rect>();
  for (const n of spec.nodes) {
    const p = pos.get(n.id);
    if (!p) continue;
    const s = styleFor(n.type);
    rects.set(n.id, {
      x: Math.round(p.cx - s.width / 2),
      y: Math.round(p.cy - s.height / 2),
      w: s.width,
      h: s.height,
    });
  }
  return rects;
}

/**
 * DiagramSpec + posições → skeletons (containers + setas roteadas).
 *
 * Cada seta ganha uma polilinha ortogonal que sai/entra pelas BORDAS e desvia
 * das outras formas (ver `route.ts`) — antes eram retas centro-a-centro, que
 * atravessavam qualquer nó no caminho. O vínculo start/end continua, pra a seta
 * seguir a forma quando o usuário arrasta.
 */
export function specToSkeleton(spec: DiagramSpec, pos: Map<string, Pos>): Skel[] {
  const out: Skel[] = [];
  const rects = nodeRects(spec, pos);

  for (const n of spec.nodes) {
    const r = rects.get(n.id);
    if (!r) continue;
    const s = styleFor(n.type);
    out.push({
      type: s.shape,
      id: n.id,
      x: r.x,
      y: r.y,
      width: r.w,
      height: r.h,
      backgroundColor: s.bg,
      strokeColor: s.stroke,
      label: { text: n.label },
    });
  }

  for (const e of spec.edges) {
    const a = rects.get(e.from);
    const b = rects.get(e.to);
    if (!a || !b) continue;
    const obstacles: Rect[] = [];
    for (const [id, r] of rects) if (id !== e.from && id !== e.to) obstacles.push(r);
    const path = routeConnector(a, b, obstacles);
    const head = path[0];
    const skel: Skel = {
      type: "arrow",
      x: Math.round(head.x),
      y: Math.round(head.y),
      start: { id: e.from },
      end: { id: e.to },
      points: path.map((p) => [Math.round(p.x - head.x), Math.round(p.y - head.y)]),
    };
    if (e.label) skel.label = { text: e.label };
    out.push(skel);
  }
  return out;
}

/** Caminho absoluto de cada aresta — usado nos testes geométricos. */
export function edgePaths(spec: DiagramSpec, pos: Map<string, Pos>): Map<string, Point[]> {
  const rects = nodeRects(spec, pos);
  const out = new Map<string, Point[]>();
  for (const e of spec.edges) {
    const a = rects.get(e.from);
    const b = rects.get(e.to);
    if (!a || !b) continue;
    const obstacles: Rect[] = [];
    for (const [id, r] of rects) if (id !== e.from && id !== e.to) obstacles.push(r);
    out.set(`${e.from}->${e.to}`, routeConnector(a, b, obstacles));
  }
  return out;
}
