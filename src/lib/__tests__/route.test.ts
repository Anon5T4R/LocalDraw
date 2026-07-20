import { describe, expect, it } from "vitest";
import {
  anchor,
  inflate,
  pathIntersects,
  rectBottom,
  rectRight,
  routeConnector,
  segmentIntersectsRect,
  simplify,
  type Point,
  type Rect,
} from "../route";
import { edgePaths, layoutDiagram, parseDiagramSpec } from "../diagram";

/** Todo trecho é horizontal ou vertical? */
function isOrthogonal(path: Point[]): boolean {
  for (let i = 0; i + 1 < path.length; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (Math.abs(a.x - b.x) > 1e-6 && Math.abs(a.y - b.y) > 1e-6) return false;
  }
  return true;
}

/** O ponto está sobre a borda do retângulo (não dentro, não fora)? */
function onBorder(p: Point, r: Rect, tol = 0.51): boolean {
  const inX = p.x >= r.x - tol && p.x <= rectRight(r) + tol;
  const inY = p.y >= r.y - tol && p.y <= rectBottom(r) + tol;
  if (!inX || !inY) return false;
  return (
    Math.abs(p.x - r.x) <= tol ||
    Math.abs(p.x - rectRight(r)) <= tol ||
    Math.abs(p.y - r.y) <= tol ||
    Math.abs(p.y - rectBottom(r)) <= tol
  );
}

describe("segmentIntersectsRect", () => {
  const r: Rect = { x: 100, y: 100, w: 100, h: 100 };

  it("detecta um segmento que atravessa o retângulo", () => {
    expect(segmentIntersectsRect({ x: 150, y: 0 }, { x: 150, y: 300 }, r)).toBe(true);
    expect(segmentIntersectsRect({ x: 0, y: 150 }, { x: 300, y: 150 }, r)).toBe(true);
  });

  it("ignora segmento que passa longe", () => {
    expect(segmentIntersectsRect({ x: 300, y: 0 }, { x: 300, y: 300 }, r)).toBe(false);
    expect(segmentIntersectsRect({ x: 0, y: 50 }, { x: 300, y: 50 }, r)).toBe(false);
  });

  it("encostar na borda NÃO conta como cruzar", () => {
    // Rente à borda de cima e rente à lateral esquerda.
    expect(segmentIntersectsRect({ x: 0, y: 100 }, { x: 300, y: 100 }, r)).toBe(false);
    expect(segmentIntersectsRect({ x: 100, y: 0 }, { x: 100, y: 300 }, r)).toBe(false);
    // Partindo da borda pra fora (é o que o roteador faz).
    expect(segmentIntersectsRect({ x: 150, y: 200 }, { x: 150, y: 260 }, r)).toBe(false);
  });

  it("detecta segmento inteiramente dentro", () => {
    expect(segmentIntersectsRect({ x: 120, y: 150 }, { x: 180, y: 150 }, r)).toBe(true);
  });
});

describe("simplify", () => {
  it("remove pontos repetidos e colineares", () => {
    const p = simplify([
      { x: 0, y: 0 },
      { x: 0, y: 0 },
      { x: 0, y: 50 },
      { x: 0, y: 100 },
      { x: 60, y: 100 },
    ]);
    expect(p).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 100 },
      { x: 60, y: 100 },
    ]);
  });
});

describe("routeConnector", () => {
  it("liga dois nós alinhados com uma reta borda-a-borda (sem cotovelo)", () => {
    const a: Rect = { x: 0, y: 0, w: 100, h: 60 };
    const b: Rect = { x: 0, y: 200, w: 100, h: 60 };
    const path = routeConnector(a, b, []);
    expect(path).toHaveLength(2);
    expect(onBorder(path[0], a)).toBe(true);
    expect(onBorder(path[path.length - 1], b)).toBe(true);
    expect(path[0]).toEqual(anchor(a, "bottom"));
    expect(path[1]).toEqual(anchor(b, "top"));
  });

  it("O CASO DO ITEM: com um obstáculo entre A e B, o caminho NÃO cruza a forma", () => {
    // A em cima, B embaixo, e C exatamente no meio da reta A→B.
    const a: Rect = { x: 0, y: 0, w: 190, h: 76 };
    const c: Rect = { x: 0, y: 190, w: 190, h: 76 };
    const b: Rect = { x: 0, y: 380, w: 190, h: 76 };

    const path = routeConnector(a, b, [c]);

    // 1) não atravessa o obstáculo — nem encostado nele (folga de 16px inflada).
    expect(pathIntersects(path, [inflate(c, 16)])).toBe(false);
    // 2) nem as próprias formas ligadas (fora das bordas).
    expect(pathIntersects(path, [inflate(a, -1), inflate(b, -1)])).toBe(false);
    // 3) é ortogonal e ancorado nas bordas.
    expect(isOrthogonal(path)).toBe(true);
    expect(onBorder(path[0], a)).toBe(true);
    expect(onBorder(path[path.length - 1], b)).toBe(true);
    // 4) desviou de verdade: tem cotovelo (a reta direta cruzaria o C).
    expect(path.length).toBeGreaterThan(2);
  });

  it("desvia de vários obstáculos empilhados entre A e B", () => {
    const a: Rect = { x: 0, y: 0, w: 190, h: 76 };
    const obstacles: Rect[] = [
      { x: 0, y: 190, w: 190, h: 76 },
      { x: 0, y: 380, w: 190, h: 76 },
      { x: 0, y: 570, w: 190, h: 76 },
    ];
    const b: Rect = { x: 0, y: 760, w: 190, h: 76 };

    const path = routeConnector(a, b, obstacles);
    expect(pathIntersects(path, obstacles.map((o) => inflate(o, 16)))).toBe(false);
    expect(isOrthogonal(path)).toBe(true);
  });

  it("desvia de um obstáculo largo (força a saída pela lateral)", () => {
    const a: Rect = { x: 200, y: 0, w: 190, h: 76 };
    const wide: Rect = { x: -400, y: 190, w: 1000, h: 76 };
    const b: Rect = { x: 200, y: 380, w: 190, h: 76 };

    const path = routeConnector(a, b, [wide]);
    expect(pathIntersects(path, [inflate(wide, 16)])).toBe(false);
    expect(isOrthogonal(path)).toBe(true);
    expect(onBorder(path[0], a)).toBe(true);
    expect(onBorder(path[path.length - 1], b)).toBe(true);
  });

  it("nós lado a lado: sai por uma lateral e entra pela outra", () => {
    const a: Rect = { x: 0, y: 0, w: 100, h: 60 };
    const b: Rect = { x: 300, y: 0, w: 100, h: 60 };
    const path = routeConnector(a, b, []);
    expect(isOrthogonal(path)).toBe(true);
    expect(path[0]).toEqual(anchor(a, "right"));
    expect(path[path.length - 1]).toEqual(anchor(b, "left"));
  });

  it("nunca devolve caminho vazio, mesmo com as formas sobrepostas", () => {
    const a: Rect = { x: 0, y: 0, w: 100, h: 100 };
    const b: Rect = { x: 20, y: 20, w: 100, h: 100 };
    const path = routeConnector(a, b, []);
    expect(path.length).toBeGreaterThanOrEqual(2);
    expect(Number.isFinite(path[0].x)).toBe(true);
    expect(Number.isFinite(path[path.length - 1].y)).toBe(true);
  });
});

describe("roteamento no diagrama inteiro", () => {
  it("num fluxo com atalho (a→c pulando b), a seta a→c não cruza o b", () => {
    const spec = parseDiagramSpec({
      nodes: [
        { id: "a", type: "terminator", label: "Início" },
        { id: "b", type: "process", label: "Meio" },
        { id: "c", type: "terminator", label: "Fim" },
      ],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "a", to: "c" }, // atalho: a reta antiga passava por cima do b
      ],
    });
    const pos = layoutDiagram(spec);
    const paths = edgePaths(spec, pos);

    const bStyle = { w: 190, h: 76 };
    const pb = pos.get("b")!;
    const bRect: Rect = {
      x: Math.round(pb.cx - bStyle.w / 2),
      y: Math.round(pb.cy - bStyle.h / 2),
      w: bStyle.w,
      h: bStyle.h,
    };

    // CONTROLE: o comportamento ANTIGO (reta centro-a-centro) cruza o b. Sem
    // isto o teste acima passaria por acaso mesmo se o roteador não fizesse nada.
    const aPos = pos.get("a")!;
    const cPos = pos.get("c")!;
    expect(
      segmentIntersectsRect({ x: aPos.cx, y: aPos.cy }, { x: cPos.cx, y: cPos.cy }, bRect),
    ).toBe(true);

    const shortcut = paths.get("a->c")!;
    expect(shortcut).toBeDefined();
    expect(isOrthogonal(shortcut)).toBe(true);
    expect(pathIntersects(shortcut, [bRect])).toBe(false);
  });

  it("nenhuma seta de um fluxo com decisão cruza um nó não-ligado", () => {
    const spec = parseDiagramSpec({
      nodes: [
        { id: "s", type: "terminator", label: "Início" },
        { id: "d", type: "decision", label: "OK?" },
        { id: "y", type: "process", label: "Sim" },
        { id: "n", type: "process", label: "Não" },
        { id: "e", type: "terminator", label: "Fim" },
      ],
      edges: [
        { from: "s", to: "d" },
        { from: "d", to: "y", label: "sim" },
        { from: "d", to: "n", label: "não" },
        { from: "y", to: "e" },
        { from: "n", to: "e" },
      ],
    });
    const pos = layoutDiagram(spec);
    const paths = edgePaths(spec, pos);
    expect(paths.size).toBe(5);

    // Reconstrói os retângulos como o layout faz (via styleFor).
    const rectOf = (id: string, w: number, h: number): Rect => {
      const p = pos.get(id)!;
      return { x: Math.round(p.cx - w / 2), y: Math.round(p.cy - h / 2), w, h };
    };
    const rects: Record<string, Rect> = {
      s: rectOf("s", 180, 72),
      d: rectOf("d", 200, 120),
      y: rectOf("y", 190, 76),
      n: rectOf("n", 190, 76),
      e: rectOf("e", 180, 72),
    };

    for (const [key, path] of paths) {
      const [from, to] = key.split("->");
      expect(isOrthogonal(path)).toBe(true);
      const others = Object.entries(rects)
        .filter(([id]) => id !== from && id !== to)
        .map(([, r]) => r);
      expect({ key, hits: pathIntersects(path, others) }).toEqual({ key, hits: false });
    }
  });
});
