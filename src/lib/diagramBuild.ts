// Ponte entre o DiagramSpec (puro, testado em diagram.ts) e os elementos reais
// do Excalidraw. Fica separado pra o vitest não precisar carregar o pacote pesado.

import { convertToExcalidrawElements } from "@excalidraw/excalidraw";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { layoutDiagram, specToSkeleton, type DiagramSpec } from "./diagram";

type SkeletonArg = Parameters<typeof convertToExcalidrawElements>[0];

/** DiagramSpec → elementos do Excalidraw prontos pra entrar na cena. */
export function buildDiagramElements(spec: DiagramSpec): ExcalidrawElement[] {
  const pos = layoutDiagram(spec);
  const skeleton = specToSkeleton(spec, pos) as unknown as SkeletonArg;
  // regenerateIds:false preserva os ids do spec — as setas referenciam os nós por id.
  return convertToExcalidrawElements(skeleton, { regenerateIds: false });
}
