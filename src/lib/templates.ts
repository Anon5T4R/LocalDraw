// Modelos prontos de diagrama — o mesmo caminho da IA (DiagramSpec → layout →
// roteamento → Excalidraw), só que sem IA nenhuma: o spec já vem escrito aqui.
// Serve pra quem quer começar de algo em vez da tela em branco, e é 100% offline.
//
// Os rótulos vêm do i18n (`t()`), então o modelo sai no idioma da UI.

import type { DiagramSpec } from "./diagram";
import { t, type MessageKey } from "./i18n";

export type TemplateId = "flowchart" | "org" | "network";

export const TEMPLATE_IDS: TemplateId[] = ["flowchart", "org", "network"];

export const TEMPLATE_NAME_KEY: Record<TemplateId, MessageKey> = {
  flowchart: "tpl.flowchart",
  org: "tpl.org",
  network: "tpl.network",
};

/** Estrutura do modelo com os rótulos ainda como chaves de i18n (testável sem UI). */
interface TemplateDef {
  nodes: { id: string; type: DiagramSpec["nodes"][number]["type"]; key: MessageKey }[];
  edges: { from: string; to: string; key?: MessageKey }[];
}

const DEFS: Record<TemplateId, TemplateDef> = {
  // Fluxograma clássico: início → pedido → decisão (sim/não) → fim.
  flowchart: {
    nodes: [
      { id: "start", type: "terminator", key: "tpl.flow.start" },
      { id: "request", type: "process", key: "tpl.flow.request" },
      { id: "check", type: "decision", key: "tpl.flow.check" },
      { id: "do", type: "process", key: "tpl.flow.do" },
      { id: "back", type: "process", key: "tpl.flow.back" },
      { id: "record", type: "document", key: "tpl.flow.record" },
      { id: "end", type: "terminator", key: "tpl.flow.end" },
    ],
    edges: [
      { from: "start", to: "request" },
      { from: "request", to: "check" },
      { from: "check", to: "do", key: "tpl.yes" },
      { from: "check", to: "back", key: "tpl.no" },
      { from: "do", to: "record" },
      { from: "record", to: "end" },
      { from: "back", to: "end" },
    ],
  },
  // Organograma: uma diretoria e três áreas, com dois times sob tecnologia.
  org: {
    nodes: [
      { id: "board", type: "process", key: "tpl.org.board" },
      { id: "ops", type: "process", key: "tpl.org.ops" },
      { id: "tech", type: "process", key: "tpl.org.tech" },
      { id: "admin", type: "process", key: "tpl.org.admin" },
      { id: "dev", type: "process", key: "tpl.org.dev" },
      { id: "qa", type: "process", key: "tpl.org.qa" },
    ],
    edges: [
      { from: "board", to: "ops" },
      { from: "board", to: "tech" },
      { from: "board", to: "admin" },
      { from: "tech", to: "dev" },
      { from: "tech", to: "qa" },
    ],
  },
  // Rede: internet → modem → roteador → switch → estações/servidor/impressora.
  network: {
    nodes: [
      { id: "internet", type: "terminator", key: "tpl.net.internet" },
      { id: "modem", type: "data", key: "tpl.net.modem" },
      { id: "router", type: "process", key: "tpl.net.router" },
      { id: "switch", type: "process", key: "tpl.net.switch" },
      { id: "pc", type: "data", key: "tpl.net.pc" },
      { id: "server", type: "database", key: "tpl.net.server" },
      { id: "printer", type: "document", key: "tpl.net.printer" },
    ],
    edges: [
      { from: "internet", to: "modem" },
      { from: "modem", to: "router" },
      { from: "router", to: "switch" },
      { from: "switch", to: "pc" },
      { from: "switch", to: "server" },
      { from: "switch", to: "printer" },
    ],
  },
};

/** Modelo pronto como DiagramSpec, com os rótulos já traduzidos. */
export function templateSpec(id: TemplateId): DiagramSpec {
  const def = DEFS[id];
  return {
    nodes: def.nodes.map((n) => ({ id: n.id, type: n.type, label: t(n.key) })),
    edges: def.edges.map((e) =>
      e.key ? { from: e.from, to: e.to, label: t(e.key) } : { from: e.from, to: e.to },
    ),
  };
}
