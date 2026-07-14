import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { useAi } from "../state/airuntime";
import { inTauri } from "../lib/backend";
import { generateDiagram } from "../lib/ai";
import { buildDiagramElements } from "../lib/diagramBuild";

interface Props {
  open: boolean;
  onClose: () => void;
  onInsert: (elements: ExcalidrawElement[]) => void;
}

function short(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

const EXAMPLE = "Processo de aprovação de férias: colaborador solicita, gestor avalia, RH registra.";

export default function AiPanel({ open, onClose, onInsert }: Props) {
  const ai = useAi();
  const [prompt, setPrompt] = useState("");
  const [useGpu, setUseGpu] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");

  useEffect(() => {
    if (open) ai.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const chooseFolder = async () => {
    const dir = await openDialog({ directory: true, multiple: false });
    if (typeof dir === "string") await ai.loadModels(dir);
  };

  const generate = async () => {
    if (!ai.port || !prompt.trim()) return;
    setGenerating(true);
    setGenError("");
    try {
      const spec = await generateDiagram(ai.port, prompt.trim());
      onInsert(buildDiagramElements(spec));
    } catch (e) {
      setGenError(String(e));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <aside className="ai-panel">
      <div className="ai-head">
        <strong>✨ Gerar com IA</strong>
        <button className="icon" onClick={onClose} title="Fechar">
          ✕
        </button>
      </div>

      {!inTauri() ? (
        <p className="ai-hint">A IA local só funciona no app instalado (fora do navegador de dev).</p>
      ) : (
        <>
          <section className="ai-section">
            <h4>Modelo (GGUF)</h4>
            {ai.port ? (
              <div className="ai-model-on">
                <span title={ai.model}>🟢 {short(ai.model)}</span>
                <button onClick={() => ai.stop()}>Parar</button>
              </div>
            ) : (
              <>
                <button onClick={chooseFolder}>Escolher pasta de modelos…</button>
                <label className="ai-gpu">
                  <input
                    type="checkbox"
                    checked={useGpu}
                    onChange={(e) => setUseGpu(e.target.checked)}
                  />
                  Usar GPU (offload)
                </label>
                {ai.models.length > 0 && (
                  <ul className="ai-models">
                    {ai.models.map((m) => (
                      <li key={m.path}>
                        <button
                          disabled={ai.starting}
                          onClick={() => ai.start(m.path, useGpu ? 999 : 0)}
                          title={m.path}
                        >
                          {m.name} · {m.sizeGb.toFixed(1)} GB
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {ai.starting && <p className="ai-hint">Iniciando o modelo…</p>}
                {ai.error && <p className="ai-error">{ai.error}</p>}
              </>
            )}
          </section>

          <section className="ai-section">
            <h4>Descreva o fluxograma</h4>
            <textarea
              value={prompt}
              placeholder={EXAMPLE}
              rows={5}
              disabled={!ai.port || generating}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              className="ai-generate"
              disabled={!ai.port || generating || !prompt.trim()}
              onClick={generate}
            >
              {generating ? "Gerando…" : "Gerar fluxograma"}
            </button>
            {!ai.port && <p className="ai-hint">Carregue um modelo acima para habilitar.</p>}
            {genError && <p className="ai-error">{genError}</p>}
            <p className="ai-hint">
              A IA propõe os nós e ligações; o LocalDraw desenha as formas e conectores. Você edita
              tudo no canvas depois.
            </p>
          </section>
        </>
      )}
    </aside>
  );
}
