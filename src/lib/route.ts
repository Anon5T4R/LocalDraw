// Roteamento ortogonal de conectores — módulo PURO (sem Excalidraw), testado
// geometricamente em `__tests__/route.test.ts`.
//
// O problema: o gerador de fluxograma ligava os nós com setas retas ponto-a-ponto.
// Numa cadeia longa ou num "pula uma camada" (a→c com b no meio), a reta atravessa
// a forma do b. Aqui o caminho sai pela BORDA do nó de origem, entra pela BORDA do
// destino, e cada trecho é horizontal ou vertical desviando das outras formas.
//
// Estratégia (busca por candidatos, não A* em grade — são poucos nós e o resultado
// fica previsível/estável): para cada par (lado de saída, lado de entrada) e para
// cada "corredor" candidato, monta um caminho ortogonal, descarta os que cruzam
// alguma forma e escolhe o melhor por (nº de cotovelos, comprimento, preferência
// de lado). Se nenhum candidato passa limpo, cai na reta direta borda-a-borda —
// nunca falha, no pior caso volta ao comportamento antigo.

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Point {
  x: number;
  y: number;
}

export type Side = "top" | "bottom" | "left" | "right";

/** Folga entre o conector e as formas que ele desvia. */
export const CLEARANCE = 16;
/** Trecho reto que sai perpendicular à borda antes do 1º cotovelo. */
export const STUB = 24;

const EPS = 1e-6;

export function rectRight(r: Rect): number {
  return r.x + r.w;
}
export function rectBottom(r: Rect): number {
  return r.y + r.h;
}
export function rectCenter(r: Rect): Point {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

/** Cresce (ou encolhe, com m negativo) um retângulo em todos os lados. */
export function inflate(r: Rect, m: number): Rect {
  return { x: r.x - m, y: r.y - m, w: r.w + 2 * m, h: r.h + 2 * m };
}

/** Ponto no meio do lado pedido. */
export function anchor(r: Rect, side: Side): Point {
  const c = rectCenter(r);
  switch (side) {
    case "top":
      return { x: c.x, y: r.y };
    case "bottom":
      return { x: c.x, y: rectBottom(r) };
    case "left":
      return { x: r.x, y: c.y };
    case "right":
      return { x: rectRight(r), y: c.y };
  }
}

/** Vetor unitário apontando pra FORA do retângulo naquele lado. */
function outward(side: Side): Point {
  switch (side) {
    case "top":
      return { x: 0, y: -1 };
    case "bottom":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
  }
}

/**
 * Segmento (a→b) cruza o interior do retângulo?
 *
 * Só trata segmentos horizontais/verticais — é o que o roteador produz — e usa
 * comparação ESTRITA: encostar na borda não conta como cruzar (senão nenhum
 * conector poderia partir da própria forma).
 */
export function segmentIntersectsRect(a: Point, b: Point, r: Rect): boolean {
  const left = r.x;
  const right = rectRight(r);
  const top = r.y;
  const bottom = rectBottom(r);

  const minX = Math.min(a.x, b.x);
  const maxX = Math.max(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxY = Math.max(a.y, b.y);

  // Caixa do segmento e caixa do retângulo têm que se sobrepor de verdade.
  if (maxX <= left + EPS || minX >= right - EPS) return false;
  if (maxY <= top + EPS || minY >= bottom - EPS) return false;
  return true;
}

/** Qualquer trecho da polilinha cruza qualquer um dos retângulos? */
export function pathIntersects(path: Point[], rects: Rect[]): boolean {
  for (let i = 0; i + 1 < path.length; i++) {
    for (const r of rects) {
      if (segmentIntersectsRect(path[i], path[i + 1], r)) return true;
    }
  }
  return false;
}

/** Remove pontos colineares/repetidos (deixa a polilinha mínima). */
export function simplify(path: Point[]): Point[] {
  const out: Point[] = [];
  for (const p of path) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < EPS && Math.abs(last.y - p.y) < EPS) continue;
    out.push({ x: p.x, y: p.y });
  }
  for (let i = 1; i + 1 < out.length; ) {
    const a = out[i - 1];
    const b = out[i];
    const c = out[i + 1];
    const collinear =
      (Math.abs(a.x - b.x) < EPS && Math.abs(b.x - c.x) < EPS) ||
      (Math.abs(a.y - b.y) < EPS && Math.abs(b.y - c.y) < EPS);
    if (collinear) out.splice(i, 1);
    else i++;
  }
  return out;
}

function bends(path: Point[]): number {
  return Math.max(0, simplify(path).length - 2);
}

function length(path: Point[]): number {
  let total = 0;
  for (let i = 0; i + 1 < path.length; i++) {
    total += Math.abs(path[i].x - path[i + 1].x) + Math.abs(path[i].y - path[i + 1].y);
  }
  return total;
}

const SIDES: Side[] = ["bottom", "top", "left", "right"];

/**
 * Liga dois "cotocos" (ponta do trecho perpendicular à borda) com trechos
 * ortogonais. `lane` é a coordenada do corredor usado no caso Z.
 */
function connectStubs(
  s0: Point,
  d0: Point,
  s1: Point,
  d1: Point,
  lane: number,
): Point[] | null {
  const v0 = d0.x === 0; // saída vertical
  const v1 = d1.x === 0; // entrada vertical
  if (v0 && v1) {
    // V-H-V: desce/sobe até o corredor horizontal, anda, e entra.
    return [s0, { x: s0.x, y: lane }, { x: s1.x, y: lane }, s1];
  }
  if (!v0 && !v1) {
    // H-V-H: anda até o corredor vertical, sobe/desce, e entra.
    return [s0, { x: lane, y: s0.y }, { x: lane, y: s1.y }, s1];
  }
  if (v0 && !v1) {
    // L: vertical primeiro (a saída é vertical), depois horizontal.
    return [s0, { x: s0.x, y: s1.y }, s1];
  }
  // horizontal primeiro, depois vertical.
  return [s0, { x: s1.x, y: s0.y }, s1];
}

/**
 * Penaliza lados que apontam pro lado contrário do alvo — mantém o fluxograma
 * legível (de cima pra baixo) quando há mais de um caminho limpo.
 */
function sidePenalty(from: Rect, to: Rect, exit: Side, entry: Side): number {
  const a = rectCenter(from);
  const b = rectCenter(to);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let p = 0;
  const away = (side: Side, sign: number) => {
    const o = outward(side);
    return o.x * dx * sign < -EPS || o.y * dy * sign < -EPS;
  };
  if (away(exit, 1)) p += 2;
  if (away(entry, -1)) p += 2;
  // Fluxo natural do layout é vertical: prefere sair por baixo e entrar por cima.
  if (dy > EPS) {
    if (exit !== "bottom") p += 1;
    if (entry !== "top") p += 1;
  }
  return p;
}

export interface RouteOptions {
  clearance?: number;
  stub?: number;
}

/**
 * Caminho ortogonal de `from` até `to` desviando de `obstacles`.
 *
 * - o 1º ponto fica na borda de `from`, o último na borda de `to`;
 * - todo trecho é horizontal ou vertical;
 * - nenhum trecho cruza o interior de `from`, `to` ou de qualquer obstáculo.
 *
 * `obstacles` deve conter as OUTRAS formas (from/to são adicionados aqui).
 */
export function routeConnector(
  from: Rect,
  to: Rect,
  obstacles: Rect[] = [],
  opts: RouteOptions = {},
): Point[] {
  const clearance = opts.clearance ?? CLEARANCE;
  const stub = opts.stub ?? STUB;

  // Os nós ligados entram como bloqueio SEM folga (o conector encosta na borda
  // deles de propósito); os demais entram inflados pela folga.
  const blockers: Rect[] = [
    inflate(from, -EPS),
    inflate(to, -EPS),
    ...obstacles.map((o) => inflate(o, clearance)),
  ];

  // Corredores candidatos: o meio do vão + as bordas de cada obstáculo com folga.
  const laneX = new Set<number>();
  const laneY = new Set<number>();
  laneX.add((rectCenter(from).x + rectCenter(to).x) / 2);
  laneY.add((rectCenter(from).y + rectCenter(to).y) / 2);
  for (const o of [...obstacles, from, to]) {
    const m = clearance + stub / 2;
    laneX.add(o.x - m);
    laneX.add(rectRight(o) + m);
    laneY.add(o.y - m);
    laneY.add(rectBottom(o) + m);
  }

  let best: { path: Point[]; score: number } | null = null;

  for (const exit of SIDES) {
    for (const entry of SIDES) {
      const p0 = anchor(from, exit);
      const d0 = outward(exit);
      const s0 = { x: p0.x + d0.x * stub, y: p0.y + d0.y * stub };
      const p1 = anchor(to, entry);
      const d1 = outward(entry);
      const s1 = { x: p1.x + d1.x * stub, y: p1.y + d1.y * stub };

      const vertical = d0.x === 0 && d1.x === 0;
      const horizontal = d0.x !== 0 && d1.x !== 0;
      const lanes = vertical ? laneY : horizontal ? laneX : new Set([0]);

      for (const lane of lanes) {
        const mid = connectStubs(s0, d0, s1, d1, lane);
        if (!mid) continue;
        const path = simplify([p0, ...mid, p1]);
        if (pathIntersects(path, blockers)) continue;
        const score =
          bends(path) * 1000 + length(path) + sidePenalty(from, to, exit, entry) * 400;
        if (!best || score < best.score) best = { path, score };
      }
    }
  }

  if (best) return best.path;

  // Nenhum caminho limpo (formas encavaladas, por exemplo): reta borda-a-borda.
  return fallbackStraight(from, to);
}

/** Reta do centro de um ao centro do outro, recortada nas bordas. */
export function fallbackStraight(from: Rect, to: Rect): Point[] {
  const a = rectCenter(from);
  const b = rectCenter(to);
  return [clipToRect(a, b, from), clipToRect(b, a, to)];
}

/** Anda de `c` (centro de r) rumo a `other` até tocar a borda de `r`. */
function clipToRect(c: Point, other: Point, r: Rect): Point {
  const dx = other.x - c.x;
  const dy = other.y - c.y;
  if (Math.abs(dx) < EPS && Math.abs(dy) < EPS) return { x: c.x, y: c.y };
  const tx = Math.abs(dx) < EPS ? Infinity : r.w / 2 / Math.abs(dx);
  const ty = Math.abs(dy) < EPS ? Infinity : r.h / 2 / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: c.x + dx * t, y: c.y + dy * t };
}
