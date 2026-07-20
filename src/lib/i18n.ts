import { useSyncExternalStore } from "react";

/**
 * i18n leve da UI (mesmo padrão do LocalCode/LocalTranslate). `pt` é a fonte da
 * verdade das chaves; `en`/`es` como `Record<MessageKey, string>` fazem o
 * compilador recusar chave faltando ou sobrando. Locale num store externo (não
 * React) pra `t()` rodar fora de componente. O App remonta na troca
 * (key={locale} no main.tsx).
 *
 * Inclui o prompt de sistema da IA (`ai.prompt.diagram`) — assim os rótulos dos
 * nós gerados (Início/Fim, sim/não) saem no idioma da UI. O próprio Excalidraw
 * também troca de idioma via langCode (ver `excalLang`).
 */

export type Locale = "pt" | "en" | "es";

export const LOCALE_LABELS: Record<Locale, string> = {
  pt: "Português",
  en: "English",
  es: "Español",
};

/** langCode do Excalidraw por locale (a UI nativa dele troca junto). */
export const EXCAL_LANG: Record<Locale, string> = {
  pt: "pt-BR",
  en: "en",
  es: "es-ES",
};

const LOCALE_KEY = "localdraw.locale";

const pt = {
  // TopBar
  "topbar.new": "Novo",
  "topbar.newTitle": "Novo (Ctrl+N)",
  "topbar.open": "Abrir",
  "topbar.openTitle": "Abrir (Ctrl+O)",
  "topbar.save": "Salvar",
  "topbar.saveTitle": "Salvar (Ctrl+S)",
  "topbar.saveAs": "Salvar como",
  "topbar.saveAsTitle": "Salvar como (Ctrl+Shift+S)",
  "topbar.pngTitle": "Exportar imagem PNG",
  "topbar.svgTitle": "Exportar vetor SVG",
  "topbar.ai": "✨ IA",
  "topbar.aiTitle": "Gerar fluxograma com IA",
  "theme.title": "Tema",
  "theme.light": "Claro",
  "theme.dark": "Escuro",
  "theme.system": "Sistema",
  "theme.nature": "Natureza",
  "theme.darkblue": "Azul escuro",
  "theme.calmgreen": "Verde calmo",
  "theme.pastelpink": "Rosa pastel",
  "theme.punkprincess": "PunkPrincess",

  // Menu do Excalidraw
  "menu.new": "Novo",
  "menu.open": "Abrir…",
  "menu.save": "Salvar",
  "menu.saveAs": "Salvar como…",
  "menu.exportPng": "Exportar PNG",
  "menu.exportSvg": "Exportar SVG",

  // Arquivo / diálogos
  "file.untitled": "Sem título",
  "confirm.discard": "Há alterações não salvas. Descartar?",
  "confirm.exit": "Há alterações não salvas. Sair mesmo assim?",
  "alert.openFail": "Não foi possível abrir o arquivo:\n{e}",
  "alert.saveFail": "Falha ao salvar:\n{e}",
  "alert.pngFail": "Falha ao exportar PNG:\n{e}",
  "alert.svgFail": "Falha ao exportar SVG:\n{e}",
  "dialog.diagram": "Diagrama",
  "dialog.diagramSave": "Diagrama LocalDraw",
  "dialog.png": "Imagem PNG",
  "dialog.svg": "Imagem SVG",

  // Painel de IA
  "ai.head": "✨ Gerar com IA",
  "ai.closeTitle": "Fechar",
  "ai.devOnly": "A IA local só funciona no app instalado (fora do navegador de dev).",
  "ai.modelH": "Modelo (GGUF)",
  "ai.stop": "Parar",
  "ai.chooseFolder": "Escolher pasta de modelos…",
  "ai.gpu": "Usar GPU (offload)",
  "ai.starting": "Iniciando o modelo…",
  "ai.describeH": "Descreva o fluxograma",
  "ai.example":
    "Processo de aprovação de férias: colaborador solicita, gestor avalia, RH registra.",
  "ai.generating": "Gerando…",
  "ai.generate": "Gerar fluxograma",
  "ai.loadHint": "Carregue um modelo acima para habilitar.",
  "ai.explain":
    "A IA propõe os nós e ligações; o LocalDraw desenha as formas e conectores. Você edita tudo no canvas depois.",
  "ai.err.status": "A IA respondeu {status}",
  "ai.err.noJson": "a IA não devolveu JSON",

  // Prompt de sistema da IA (rótulos saem no idioma da UI)
  "ai.prompt.diagram": [
    "Você projeta fluxogramas. A partir do pedido do usuário, responda",
    "SOMENTE com um objeto JSON, sem texto ao redor, no formato:",
    '{"nodes":[{"id":"n1","type":"terminator","label":"Início"}],"edges":[{"from":"n1","to":"n2","label":"sim"}]}',
    "- id: string curta e única por nó.",
    "- type: um de process | decision | terminator | data | database | document.",
    "  process = ação/etapa; decision = pergunta com saídas (use label nas arestas, ex.: sim/não);",
    "  terminator = início/fim; data = entrada/saída; database = armazenamento; document = documento/relatório.",
    "- label do nó: curto (1 a 6 palavras), no idioma do pedido.",
    "- edges: ligações no sentido do fluxo; label é opcional (útil nas saídas de uma decisão).",
    "- Comece por um terminator 'Início' e termine em 'Fim'. Prefira 5 a 12 nós.",
  ].join("\n"),

  // Modelos prontos
  "tpl.title": "Modelos",
  "tpl.menu": "Modelos",
  "tpl.flowchart": "Fluxograma",
  "tpl.org": "Organograma",
  "tpl.network": "Rede",
  "tpl.yes": "sim",
  "tpl.no": "não",
  "tpl.flow.start": "Início",
  "tpl.flow.request": "Receber pedido",
  "tpl.flow.check": "Aprovado?",
  "tpl.flow.do": "Executar",
  "tpl.flow.back": "Devolver ao solicitante",
  "tpl.flow.record": "Registrar",
  "tpl.flow.end": "Fim",
  "tpl.org.board": "Diretoria",
  "tpl.org.ops": "Operações",
  "tpl.org.tech": "Tecnologia",
  "tpl.org.admin": "Administrativo",
  "tpl.org.dev": "Desenvolvimento",
  "tpl.org.qa": "Qualidade",
  "tpl.net.internet": "Internet",
  "tpl.net.modem": "Modem",
  "tpl.net.router": "Roteador",
  "tpl.net.switch": "Switch",
  "tpl.net.pc": "Estações",
  "tpl.net.server": "Servidor",
  "tpl.net.printer": "Impressora",

  // Idioma
  "lang.title": "Idioma",
} as const;

export type MessageKey = keyof typeof pt;

const en: Record<MessageKey, string> = {
  "topbar.new": "New",
  "topbar.newTitle": "New (Ctrl+N)",
  "topbar.open": "Open",
  "topbar.openTitle": "Open (Ctrl+O)",
  "topbar.save": "Save",
  "topbar.saveTitle": "Save (Ctrl+S)",
  "topbar.saveAs": "Save as",
  "topbar.saveAsTitle": "Save as (Ctrl+Shift+S)",
  "topbar.pngTitle": "Export PNG image",
  "topbar.svgTitle": "Export SVG vector",
  "topbar.ai": "✨ AI",
  "topbar.aiTitle": "Generate a flowchart with AI",
  "theme.title": "Theme",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "theme.system": "System",
  "theme.nature": "Nature",
  "theme.darkblue": "Dark blue",
  "theme.calmgreen": "Calm green",
  "theme.pastelpink": "Pastel pink",
  "theme.punkprincess": "PunkPrincess",

  "menu.new": "New",
  "menu.open": "Open…",
  "menu.save": "Save",
  "menu.saveAs": "Save as…",
  "menu.exportPng": "Export PNG",
  "menu.exportSvg": "Export SVG",

  "file.untitled": "Untitled",
  "confirm.discard": "There are unsaved changes. Discard?",
  "confirm.exit": "There are unsaved changes. Quit anyway?",
  "alert.openFail": "Couldn't open the file:\n{e}",
  "alert.saveFail": "Failed to save:\n{e}",
  "alert.pngFail": "Failed to export PNG:\n{e}",
  "alert.svgFail": "Failed to export SVG:\n{e}",
  "dialog.diagram": "Diagram",
  "dialog.diagramSave": "LocalDraw diagram",
  "dialog.png": "PNG image",
  "dialog.svg": "SVG image",

  "ai.head": "✨ Generate with AI",
  "ai.closeTitle": "Close",
  "ai.devOnly": "Local AI only works in the installed app (not the dev browser).",
  "ai.modelH": "Model (GGUF)",
  "ai.stop": "Stop",
  "ai.chooseFolder": "Choose models folder…",
  "ai.gpu": "Use GPU (offload)",
  "ai.starting": "Starting the model…",
  "ai.describeH": "Describe the flowchart",
  "ai.example":
    "Vacation approval process: employee requests, manager reviews, HR records it.",
  "ai.generating": "Generating…",
  "ai.generate": "Generate flowchart",
  "ai.loadHint": "Load a model above to enable it.",
  "ai.explain":
    "The AI proposes the nodes and links; LocalDraw draws the shapes and connectors. You edit everything on the canvas afterwards.",
  "ai.err.status": "The AI replied {status}",
  "ai.err.noJson": "the AI didn't return JSON",

  "ai.prompt.diagram": [
    "You design flowcharts. From the user's request, reply",
    "ONLY with a JSON object, no surrounding text, in the format:",
    '{"nodes":[{"id":"n1","type":"terminator","label":"Start"}],"edges":[{"from":"n1","to":"n2","label":"yes"}]}',
    "- id: short, unique string per node.",
    "- type: one of process | decision | terminator | data | database | document.",
    "  process = action/step; decision = a question with outputs (use edge labels, e.g. yes/no);",
    "  terminator = start/end; data = input/output; database = storage; document = document/report.",
    "- node label: short (1 to 6 words), in the language of the request.",
    "- edges: links in the direction of the flow; label is optional (useful on a decision's outputs).",
    "- Start with a terminator 'Start' and end at 'End'. Prefer 5 to 12 nodes.",
  ].join("\n"),

  "tpl.title": "Templates",
  "tpl.menu": "Templates",
  "tpl.flowchart": "Flowchart",
  "tpl.org": "Org chart",
  "tpl.network": "Network",
  "tpl.yes": "yes",
  "tpl.no": "no",
  "tpl.flow.start": "Start",
  "tpl.flow.request": "Receive request",
  "tpl.flow.check": "Approved?",
  "tpl.flow.do": "Carry it out",
  "tpl.flow.back": "Send back to requester",
  "tpl.flow.record": "Record it",
  "tpl.flow.end": "End",
  "tpl.org.board": "Board",
  "tpl.org.ops": "Operations",
  "tpl.org.tech": "Technology",
  "tpl.org.admin": "Administration",
  "tpl.org.dev": "Development",
  "tpl.org.qa": "Quality",
  "tpl.net.internet": "Internet",
  "tpl.net.modem": "Modem",
  "tpl.net.router": "Router",
  "tpl.net.switch": "Switch",
  "tpl.net.pc": "Workstations",
  "tpl.net.server": "Server",
  "tpl.net.printer": "Printer",

  "lang.title": "Language",
};

const es: Record<MessageKey, string> = {
  "topbar.new": "Nuevo",
  "topbar.newTitle": "Nuevo (Ctrl+N)",
  "topbar.open": "Abrir",
  "topbar.openTitle": "Abrir (Ctrl+O)",
  "topbar.save": "Guardar",
  "topbar.saveTitle": "Guardar (Ctrl+S)",
  "topbar.saveAs": "Guardar como",
  "topbar.saveAsTitle": "Guardar como (Ctrl+Shift+S)",
  "topbar.pngTitle": "Exportar imagen PNG",
  "topbar.svgTitle": "Exportar vector SVG",
  "topbar.ai": "✨ IA",
  "topbar.aiTitle": "Generar un diagrama de flujo con IA",
  "theme.title": "Tema",
  "theme.light": "Claro",
  "theme.dark": "Oscuro",
  "theme.system": "Sistema",
  "theme.nature": "Naturaleza",
  "theme.darkblue": "Azul oscuro",
  "theme.calmgreen": "Verde tranquilo",
  "theme.pastelpink": "Rosa pastel",
  "theme.punkprincess": "PunkPrincess",

  "menu.new": "Nuevo",
  "menu.open": "Abrir…",
  "menu.save": "Guardar",
  "menu.saveAs": "Guardar como…",
  "menu.exportPng": "Exportar PNG",
  "menu.exportSvg": "Exportar SVG",

  "file.untitled": "Sin título",
  "confirm.discard": "Hay cambios sin guardar. ¿Descartar?",
  "confirm.exit": "Hay cambios sin guardar. ¿Salir de todos modos?",
  "alert.openFail": "No se pudo abrir el archivo:\n{e}",
  "alert.saveFail": "Error al guardar:\n{e}",
  "alert.pngFail": "Error al exportar PNG:\n{e}",
  "alert.svgFail": "Error al exportar SVG:\n{e}",
  "dialog.diagram": "Diagrama",
  "dialog.diagramSave": "Diagrama LocalDraw",
  "dialog.png": "Imagen PNG",
  "dialog.svg": "Imagen SVG",

  "ai.head": "✨ Generar con IA",
  "ai.closeTitle": "Cerrar",
  "ai.devOnly": "La IA local solo funciona en la app instalada (no en el navegador de dev).",
  "ai.modelH": "Modelo (GGUF)",
  "ai.stop": "Parar",
  "ai.chooseFolder": "Elegir carpeta de modelos…",
  "ai.gpu": "Usar GPU (offload)",
  "ai.starting": "Iniciando el modelo…",
  "ai.describeH": "Describe el diagrama de flujo",
  "ai.example":
    "Proceso de aprobación de vacaciones: el empleado solicita, el gerente evalúa, RR. HH. lo registra.",
  "ai.generating": "Generando…",
  "ai.generate": "Generar diagrama",
  "ai.loadHint": "Carga un modelo arriba para habilitarlo.",
  "ai.explain":
    "La IA propone los nodos y enlaces; LocalDraw dibuja las formas y conectores. Tú editas todo en el lienzo después.",
  "ai.err.status": "La IA respondió {status}",
  "ai.err.noJson": "la IA no devolvió JSON",

  "ai.prompt.diagram": [
    "Diseñas diagramas de flujo. A partir de la petición del usuario, responde",
    "SOLO con un objeto JSON, sin texto alrededor, en el formato:",
    '{"nodes":[{"id":"n1","type":"terminator","label":"Inicio"}],"edges":[{"from":"n1","to":"n2","label":"sí"}]}',
    "- id: cadena corta y única por nodo.",
    "- type: uno de process | decision | terminator | data | database | document.",
    "  process = acción/paso; decision = una pregunta con salidas (usa label en las aristas, ej.: sí/no);",
    "  terminator = inicio/fin; data = entrada/salida; database = almacenamiento; document = documento/informe.",
    "- label del nodo: corto (1 a 6 palabras), en el idioma de la petición.",
    "- edges: enlaces en el sentido del flujo; label es opcional (útil en las salidas de una decisión).",
    "- Empieza con un terminator 'Inicio' y termina en 'Fin'. Prefiere 5 a 12 nodos.",
  ].join("\n"),

  "tpl.title": "Plantillas",
  "tpl.menu": "Plantillas",
  "tpl.flowchart": "Diagrama de flujo",
  "tpl.org": "Organigrama",
  "tpl.network": "Red",
  "tpl.yes": "sí",
  "tpl.no": "no",
  "tpl.flow.start": "Inicio",
  "tpl.flow.request": "Recibir solicitud",
  "tpl.flow.check": "¿Aprobado?",
  "tpl.flow.do": "Ejecutar",
  "tpl.flow.back": "Devolver al solicitante",
  "tpl.flow.record": "Registrar",
  "tpl.flow.end": "Fin",
  "tpl.org.board": "Dirección",
  "tpl.org.ops": "Operaciones",
  "tpl.org.tech": "Tecnología",
  "tpl.org.admin": "Administración",
  "tpl.org.dev": "Desarrollo",
  "tpl.org.qa": "Calidad",
  "tpl.net.internet": "Internet",
  "tpl.net.modem": "Módem",
  "tpl.net.router": "Router",
  "tpl.net.switch": "Switch",
  "tpl.net.pc": "Estaciones",
  "tpl.net.server": "Servidor",
  "tpl.net.printer": "Impresora",

  "lang.title": "Idioma",
};

const DICTS: Record<Locale, Record<MessageKey, string>> = { pt, en, es };

/** Palpite de locale pelo idioma do sistema (só no 1º uso). */
export function detectLocale(): Locale {
  const l = (typeof navigator !== "undefined" ? navigator.language : "pt").toLowerCase();
  if (l.startsWith("en")) return "en";
  if (l.startsWith("es")) return "es";
  return "pt";
}

function loadLocale(): Locale {
  const v = typeof localStorage !== "undefined" ? localStorage.getItem(LOCALE_KEY) : null;
  return v === "pt" || v === "en" || v === "es" ? v : detectLocale();
}

let current: Locale = loadLocale();
const listeners = new Set<() => void>();

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale) {
  if (locale === current) return;
  current = locale;
  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    /* localStorage indisponível */
  }
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Inscreve o componente nas trocas de locale. */
export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale);
}

/** Traduz uma chave, interpolando placeholders `{param}`. */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  let msg: string = DICTS[current][key] ?? pt[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      msg = msg.split(`{${k}}`).join(String(v));
    }
  }
  return msg;
}
