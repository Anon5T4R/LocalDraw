import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Excalidraw,
  MainMenu,
  exportToBlob,
  exportToSvg,
  getSceneVersion,
  useHandleLibrary,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type {
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
} from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { open as openDialog, save as saveDialog } from "@tauri-apps/plugin-dialog";
import {
  getStartupFile,
  inTauri,
  readTextFile,
  writeFileBase64,
  writeTextFile,
} from "./lib/backend";
import { parseScene, serializeScene } from "./lib/tdraw";
import TopBar, { type Theme } from "./components/TopBar";
import AiPanel from "./components/AiPanel";
import "./App.css";

// Recuperação de sessão: o Excalidraw.com salva a cena no navegador pra não
// perder trabalho ao recarregar; replicamos isso no localStorage do app. Assim
// fechar sem salvar não perde o desenho — reabre onde parou.
const AUTOSAVE_KEY = "localdraw:autosave:v1";

function loadAutosave(): ExcalidrawInitialDataState | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.elements)) return null;
    return { elements: data.elements, appState: data.appState ?? {}, files: data.files ?? {} };
  } catch {
    return null;
  }
}

function baseName(path: string | null): string {
  if (!path) return "Sem título";
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] || path;
}

function base64FromArrayBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
}

export default function App() {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [theme, setTheme] = useState<Theme>("system");
  const [systemDark, setSystemDark] = useState(prefersDark());
  const [aiOpen, setAiOpen] = useState(false);

  const savedVersion = useRef(0);
  const dirtyRef = useRef(false);
  const autosaveTimer = useRef<number | undefined>(undefined);
  dirtyRef.current = dirty;

  // Biblioteca de formas persistente (IndexedDB) + importar `.excalidrawlib`
  // arrastando pro canvas — tudo local.
  useHandleLibrary({ excalidrawAPI: api });

  // Restaura a última cena (autosave) no 1º mount. Um arquivo aberto por
  // "abrir com" sobrescreve isso depois.
  const initialData = useMemo(() => loadAutosave(), []);

  const canFiles = inTauri();
  const resolvedTheme: "light" | "dark" =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // Acompanha o tema do sistema quando em "system".
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const on = () => setSystemDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // Título da janela: arquivo + ● quando há alterações não salvas.
  useEffect(() => {
    const title = `LocalDraw — ${baseName(filePath)}${dirty ? " ●" : ""}`;
    if (canFiles) getCurrentWindow().setTitle(title).catch(() => {});
    document.title = title;
  }, [filePath, dirty, canFiles]);

  // A cena inicial (autosave restaurado ou vazia) é a linha de base "salva" —
  // pra não abrir marcado como sujo. Ancoramos no próprio initialData (e não em
  // getSceneElements) pra evitar a corrida com o restore assíncrono do Excalidraw.
  useEffect(() => {
    if (!api) return;
    const base = (initialData?.elements ?? []) as readonly ExcalidrawElement[];
    savedVersion.current = getSceneVersion(base);
    setDirty(false);
  }, [api, initialData]);

  const markSaved = useCallback((elements: readonly ExcalidrawElement[]) => {
    savedVersion.current = getSceneVersion(elements);
    setDirty(false);
  }, []);

  const onChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: unknown, files: unknown) => {
      setDirty(getSceneVersion(elements) !== savedVersion.current);
      // Autosave debounced pro localStorage (recuperação de sessão).
      window.clearTimeout(autosaveTimer.current);
      autosaveTimer.current = window.setTimeout(() => {
        try {
          localStorage.setItem(
            AUTOSAVE_KEY,
            serializeScene(elements, appState as never, files as never),
          );
        } catch {
          /* localStorage cheio/indisponível — ignora */
        }
      }, 700);
    },
    [],
  );

  const confirmDiscard = useCallback(() => {
    if (!dirtyRef.current) return true;
    return window.confirm("Há alterações não salvas. Descartar?");
  }, []);

  const openPath = useCallback(
    async (path: string) => {
      if (!api) return;
      try {
        const json = await readTextFile(path);
        const scene = parseScene(json);
        api.updateScene({ elements: scene.elements });
        const files = Object.values(scene.files ?? {});
        if (files.length) api.addFiles(files);
        api.scrollToContent(scene.elements, { fitToContent: true });
        setFilePath(path);
        markSaved(scene.elements);
      } catch (e) {
        window.alert(`Não foi possível abrir o arquivo:\n${e}`);
      }
    },
    [api, markSaved],
  );

  const newScene = useCallback(() => {
    if (!api || !confirmDiscard()) return;
    api.resetScene();
    setFilePath(null);
    markSaved([]);
  }, [api, confirmDiscard, markSaved]);

  const openViaDialog = useCallback(async () => {
    if (!api || !confirmDiscard()) return;
    const selected = await openDialog({
      multiple: false,
      filters: [{ name: "Diagrama", extensions: ["tdraw", "excalidraw"] }],
    });
    if (typeof selected === "string") await openPath(selected);
  }, [api, confirmDiscard, openPath]);

  const doSave = useCallback(
    async (path: string) => {
      if (!api) return false;
      try {
        const elements = api.getSceneElements();
        const json = serializeScene(elements, api.getAppState(), api.getFiles());
        await writeTextFile(path, json);
        setFilePath(path);
        markSaved(elements);
        return true;
      } catch (e) {
        window.alert(`Falha ao salvar:\n${e}`);
        return false;
      }
    },
    [api, markSaved],
  );

  const saveAs = useCallback(async () => {
    const path = await saveDialog({
      defaultPath: filePath ?? "diagrama.tdraw",
      filters: [{ name: "Diagrama LocalDraw", extensions: ["tdraw"] }],
    });
    if (path) await doSave(path);
  }, [filePath, doSave]);

  const save = useCallback(async () => {
    if (filePath) await doSave(filePath);
    else await saveAs();
  }, [filePath, doSave, saveAs]);

  const exportPng = useCallback(async () => {
    if (!api) return;
    const path = await saveDialog({
      defaultPath: `${baseName(filePath).replace(/\.tdraw$/i, "")}.png`,
      filters: [{ name: "Imagem PNG", extensions: ["png"] }],
    });
    if (!path) return;
    try {
      const blob = await exportToBlob({
        elements: api.getSceneElements(),
        appState: { ...api.getAppState(), exportBackground: true },
        files: api.getFiles(),
        mimeType: "image/png",
      });
      await writeFileBase64(path, base64FromArrayBuffer(await blob.arrayBuffer()));
    } catch (e) {
      window.alert(`Falha ao exportar PNG:\n${e}`);
    }
  }, [api, filePath]);

  const exportSvg = useCallback(async () => {
    if (!api) return;
    const path = await saveDialog({
      defaultPath: `${baseName(filePath).replace(/\.tdraw$/i, "")}.svg`,
      filters: [{ name: "Imagem SVG", extensions: ["svg"] }],
    });
    if (!path) return;
    try {
      const svg = await exportToSvg({
        elements: api.getSceneElements(),
        appState: { ...api.getAppState(), exportBackground: true },
        files: api.getFiles(),
      });
      await writeTextFile(path, new XMLSerializer().serializeToString(svg));
    } catch (e) {
      window.alert(`Falha ao exportar SVG:\n${e}`);
    }
  }, [api, filePath]);

  // Insere um diagrama gerado pela IA, deslocado pra baixo do conteúdo atual.
  const insertElements = useCallback(
    (elements: ExcalidrawElement[]) => {
      if (!api || elements.length === 0) return;
      const current = api.getSceneElements();
      let toInsert: ExcalidrawElement[] = elements;
      if (current.length) {
        let maxY = -Infinity;
        for (const el of current) maxY = Math.max(maxY, el.y + (el.height ?? 0));
        let minY = Infinity;
        for (const el of elements) minY = Math.min(minY, el.y);
        const dy = maxY + 80 - minY;
        // Elementos do Excalidraw são readonly — desloca com cópias (setas têm
        // points relativos a x/y, então um translate uniforme preserva a geometria).
        if (Number.isFinite(dy) && dy > 0) toInsert = elements.map((el) => ({ ...el, y: el.y + dy }));
      }
      api.updateScene({ elements: [...current, ...toInsert] });
      api.scrollToContent(toInsert, { fitToContent: true, animate: true });
    },
    [api],
  );

  // Arquivo de abertura (duplo-clique / "abrir com") + encaminhamento do single-instance.
  useEffect(() => {
    if (!api || !canFiles) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const startup = await getStartupFile();
        if (startup) await openPath(startup);
      } catch {
        /* ignore */
      }
      unlisten = await listen<string>("open-file", (e) => {
        if (e.payload) openPath(e.payload);
      });
    })();
    return () => unlisten?.();
  }, [api, canFiles, openPath]);

  // Avisa sobre alterações não salvas ao fechar a janela.
  useEffect(() => {
    if (!canFiles) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      unlisten = await getCurrentWindow().onCloseRequested((e) => {
        if (dirtyRef.current && !window.confirm("Há alterações não salvas. Sair mesmo assim?")) {
          e.preventDefault();
        }
      });
    })();
    return () => unlisten?.();
  }, [canFiles]);

  // Atalhos de arquivo (Ctrl+N/O/S/Shift+S).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "s") {
        e.preventDefault();
        e.shiftKey ? saveAs() : save();
      } else if (k === "o") {
        e.preventDefault();
        openViaDialog();
      } else if (k === "n") {
        e.preventDefault();
        newScene();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, saveAs, openViaDialog, newScene]);

  return (
    <div className="app" data-theme={resolvedTheme}>
      <TopBar
        fileName={baseName(filePath)}
        dirty={dirty}
        canFiles={canFiles}
        theme={theme}
        aiOpen={aiOpen}
        onNew={newScene}
        onOpen={openViaDialog}
        onSave={save}
        onSaveAs={saveAs}
        onExportPng={exportPng}
        onExportSvg={exportSvg}
        onCycleTheme={() =>
          setTheme((t) => (t === "system" ? "light" : t === "light" ? "dark" : "system"))
        }
        onToggleAi={() => setAiOpen((v) => !v)}
      />
      <div className="excal-wrap">
        <Excalidraw
          excalidrawAPI={(a) => setApi(a)}
          initialData={initialData}
          onChange={onChange}
          theme={resolvedTheme}
          langCode="pt-BR"
        >
          {/* Menu próprio: só itens offline. Remove os promos/online do padrão
              (Excalidraw+, redes sociais, colaboração ao vivo, login) e liga
              os comandos de arquivo nativos do LocalDraw. */}
          <MainMenu>
            <MainMenu.Item onSelect={newScene}>Novo</MainMenu.Item>
            <MainMenu.Item onSelect={openViaDialog}>Abrir…</MainMenu.Item>
            <MainMenu.Item onSelect={save}>Salvar</MainMenu.Item>
            <MainMenu.Item onSelect={saveAs}>Salvar como…</MainMenu.Item>
            <MainMenu.Separator />
            <MainMenu.Item onSelect={exportPng}>Exportar PNG</MainMenu.Item>
            <MainMenu.Item onSelect={exportSvg}>Exportar SVG</MainMenu.Item>
            <MainMenu.Separator />
            <MainMenu.DefaultItems.SearchMenu />
            <MainMenu.DefaultItems.ChangeCanvasBackground />
            <MainMenu.DefaultItems.ClearCanvas />
          </MainMenu>
        </Excalidraw>
      </div>
      <AiPanel open={aiOpen} onClose={() => setAiOpen(false)} onInsert={insertElements} />
    </div>
  );
}
