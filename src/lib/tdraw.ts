// Formato nativo `.tdraw`. Decisão: como o Excalidraw já embute imagens inline
// (dataURL em `files`), a cena inteira é um JSON — não precisa de zip+media como
// o `.tslides` do Slides. Guardamos exatamente o JSON padrão do Excalidraw
// (type "excalidraw"), então um `.tdraw` também abre como `.excalidraw`.

import { serializeAsJSON } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import type { AppState, BinaryFiles } from "@excalidraw/excalidraw/types";

export function serializeScene(
  elements: readonly ExcalidrawElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
): string {
  return serializeAsJSON(elements, appState as AppState, files, "local");
}

export interface LoadedScene {
  elements: ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

/** Lê o JSON de um `.tdraw` (ou `.excalidraw`) num formato pronto pra cena. */
export function parseScene(json: string): LoadedScene {
  const data = JSON.parse(json);
  if (!data || typeof data !== "object" || !Array.isArray(data.elements)) {
    throw new Error("arquivo .tdraw inválido (sem elementos)");
  }
  return {
    elements: data.elements as ExcalidrawElement[],
    appState: (data.appState ?? {}) as Partial<AppState>,
    files: (data.files ?? {}) as BinaryFiles,
  };
}
