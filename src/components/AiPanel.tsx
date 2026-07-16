import { useEffect, useState } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { useAi } from "../state/airuntime";
import { inTauri } from "../lib/backend";
import { generateDiagram } from "../lib/ai";
import { buildDiagramElements } from "../lib/diagramBuild";
import { t } from "../lib/i18n";

interface Props {
  open: boolean;
  onClose: () => void;
  onInsert: (elements: ExcalidrawElement[]) => void;
}

function short(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

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
        <strong>{t("ai.head")}</strong>
        <button className="icon" onClick={onClose} title={t("ai.closeTitle")}>
          ✕
        </button>
      </div>

      {!inTauri() ? (
        <p className="ai-hint">{t("ai.devOnly")}</p>
      ) : (
        <>
          <section className="ai-section">
            <h4>{t("ai.modelH")}</h4>
            {ai.port ? (
              <div className="ai-model-on">
                <span title={ai.model}>🟢 {short(ai.model)}</span>
                <button onClick={() => ai.stop()}>{t("ai.stop")}</button>
              </div>
            ) : (
              <>
                <button onClick={chooseFolder}>{t("ai.chooseFolder")}</button>
                <label className="ai-gpu">
                  <input
                    type="checkbox"
                    checked={useGpu}
                    onChange={(e) => setUseGpu(e.target.checked)}
                  />
                  {t("ai.gpu")}
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
                {ai.starting && <p className="ai-hint">{t("ai.starting")}</p>}
                {ai.error && <p className="ai-error">{ai.error}</p>}
              </>
            )}
          </section>

          <section className="ai-section">
            <h4>{t("ai.describeH")}</h4>
            <textarea
              value={prompt}
              placeholder={t("ai.example")}
              rows={5}
              disabled={!ai.port || generating}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              className="ai-generate"
              disabled={!ai.port || generating || !prompt.trim()}
              onClick={generate}
            >
              {generating ? t("ai.generating") : t("ai.generate")}
            </button>
            {!ai.port && <p className="ai-hint">{t("ai.loadHint")}</p>}
            {genError && <p className="ai-error">{genError}</p>}
            <p className="ai-hint">{t("ai.explain")}</p>
          </section>
        </>
      )}
    </aside>
  );
}
