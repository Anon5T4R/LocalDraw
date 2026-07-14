export type Theme = "light" | "dark" | "system";

interface Props {
  fileName: string;
  dirty: boolean;
  canFiles: boolean;
  theme: Theme;
  aiOpen: boolean;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onCycleTheme: () => void;
  onToggleAi: () => void;
}

const THEME_ICON: Record<Theme, string> = { light: "☀️", dark: "🌙", system: "🖥️" };
const THEME_LABEL: Record<Theme, string> = { light: "Tema: claro", dark: "Tema: escuro", system: "Tema: sistema" };

export default function TopBar(p: Props) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">◇</span>
        <span className="title">LocalDraw</span>
      </div>

      <div className="group">
        <button onClick={p.onNew} title="Novo (Ctrl+N)">Novo</button>
        <button onClick={p.onOpen} disabled={!p.canFiles} title="Abrir (Ctrl+O)">Abrir</button>
        <button onClick={p.onSave} disabled={!p.canFiles} title="Salvar (Ctrl+S)">Salvar</button>
        <button onClick={p.onSaveAs} disabled={!p.canFiles} title="Salvar como (Ctrl+Shift+S)">
          Salvar como
        </button>
      </div>

      <div className="group">
        <button onClick={p.onExportPng} disabled={!p.canFiles} title="Exportar imagem PNG">
          PNG
        </button>
        <button onClick={p.onExportSvg} disabled={!p.canFiles} title="Exportar vetor SVG">
          SVG
        </button>
      </div>

      <div className="filename" title={p.fileName}>
        {p.fileName}
        {p.dirty ? " ●" : ""}
      </div>

      <div className="group right">
        <button
          className={p.aiOpen ? "active" : ""}
          onClick={p.onToggleAi}
          title="Gerar fluxograma com IA"
        >
          ✨ IA
        </button>
        <button onClick={p.onCycleTheme} title={THEME_LABEL[p.theme]}>
          {THEME_ICON[p.theme]}
        </button>
      </div>
    </header>
  );
}
