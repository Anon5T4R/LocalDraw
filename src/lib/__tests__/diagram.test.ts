import { describe, expect, it } from "vitest";
import {
  layoutDiagram,
  parseDiagramSpec,
  specToSkeleton,
  styleFor,
  type DiagramSpec,
} from "../diagram";

describe("parseDiagramSpec", () => {
  it("aceita um spec válido e normaliza o tipo desconhecido para process", () => {
    const spec = parseDiagramSpec({
      nodes: [
        { id: "a", type: "terminator", label: "Início" },
        { id: "b", type: "banana", label: "Faz algo" },
      ],
      edges: [{ from: "a", to: "b", label: "vai" }],
    });
    expect(spec.nodes).toHaveLength(2);
    expect(spec.nodes[1].type).toBe("process");
    expect(spec.edges).toEqual([{ from: "a", to: "b", label: "vai" }]);
  });

  it("descarta nós sem id/label e ids duplicados", () => {
    const spec = parseDiagramSpec({
      nodes: [
        { id: "a", label: "Um" },
        { id: "a", label: "Duplicado" },
        { id: "", label: "Sem id" },
        { id: "c" },
      ],
      edges: [],
    });
    expect(spec.nodes.map((n) => n.id)).toEqual(["a"]);
  });

  it("descarta arestas para nós inexistentes, laços e duplicadas", () => {
    const spec = parseDiagramSpec({
      nodes: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
      edges: [
        { from: "a", to: "b" },
        { from: "a", to: "b" }, // duplicada
        { from: "a", to: "z" }, // destino inexistente
        { from: "a", to: "a" }, // laço
      ],
    });
    expect(spec.edges).toEqual([{ from: "a", to: "b" }]);
  });

  it("aceita sinônimos source/target/text", () => {
    const spec = parseDiagramSpec({
      nodes: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      edges: [{ source: "a", target: "b" }],
    });
    expect(spec.nodes[0].label).toBe("A");
    expect(spec.edges[0]).toEqual({ from: "a", to: "b" });
  });

  it("lança quando não há nós válidos", () => {
    expect(() => parseDiagramSpec({ nodes: [], edges: [] })).toThrow();
    expect(() => parseDiagramSpec(null)).toThrow();
  });
});

describe("layoutDiagram", () => {
  const chain: DiagramSpec = {
    nodes: [
      { id: "a", type: "terminator", label: "Início" },
      { id: "b", type: "process", label: "Meio" },
      { id: "c", type: "terminator", label: "Fim" },
    ],
    edges: [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
    ],
  };

  it("coloca cada nó de uma cadeia numa camada abaixo da anterior", () => {
    const pos = layoutDiagram(chain);
    const a = pos.get("a")!;
    const b = pos.get("b")!;
    const c = pos.get("c")!;
    expect(b.cy).toBeGreaterThan(a.cy);
    expect(c.cy).toBeGreaterThan(b.cy);
  });

  it("posiciona todos os nós mesmo com ciclo (não trava)", () => {
    const cyclic: DiagramSpec = {
      nodes: [
        { id: "x", type: "process", label: "X" },
        { id: "y", type: "process", label: "Y" },
      ],
      edges: [
        { from: "x", to: "y" },
        { from: "y", to: "x" },
      ],
    };
    const pos = layoutDiagram(cyclic);
    expect(pos.size).toBe(2);
    expect(pos.get("x")).toBeDefined();
    expect(pos.get("y")).toBeDefined();
  });

  it("distribui irmãos da mesma camada em x diferentes", () => {
    const fork: DiagramSpec = {
      nodes: [
        { id: "r", type: "terminator", label: "R" },
        { id: "l", type: "process", label: "L" },
        { id: "m", type: "process", label: "M" },
      ],
      edges: [
        { from: "r", to: "l" },
        { from: "r", to: "m" },
      ],
    };
    const pos = layoutDiagram(fork);
    expect(pos.get("l")!.cx).not.toBe(pos.get("m")!.cx);
    expect(pos.get("l")!.cy).toBe(pos.get("m")!.cy);
  });
});

describe("specToSkeleton", () => {
  it("gera um container por nó e uma seta vinculada por aresta", () => {
    const spec = parseDiagramSpec({
      nodes: [
        { id: "a", type: "terminator", label: "Início" },
        { id: "b", type: "decision", label: "OK?" },
      ],
      edges: [{ from: "a", to: "b", label: "talvez" }],
    });
    const skel = specToSkeleton(spec, layoutDiagram(spec));
    const arrows = skel.filter((s) => s.type === "arrow");
    const containers = skel.filter((s) => s.type !== "arrow");
    expect(containers).toHaveLength(2);
    expect(arrows).toHaveLength(1);
    expect(arrows[0].start).toEqual({ id: "a" });
    expect(arrows[0].end).toEqual({ id: "b" });
    expect(arrows[0].label).toEqual({ text: "talvez" });
    // a seta agora carrega a polilinha roteada, relativa a x/y e começando em 0,0
    expect(arrows[0].points!.length).toBeGreaterThanOrEqual(2);
    expect(arrows[0].points![0]).toEqual([0, 0]);
    // a decisão vira losango
    const decision = containers.find((c) => c.id === "b")!;
    expect(decision.type).toBe("diamond");
  });
});

describe("styleFor", () => {
  it("mapeia tipos de fluxograma para formas do Excalidraw", () => {
    expect(styleFor("process").shape).toBe("rectangle");
    expect(styleFor("decision").shape).toBe("diamond");
    expect(styleFor("terminator").shape).toBe("ellipse");
    expect(styleFor("database").shape).toBe("ellipse");
  });
});
