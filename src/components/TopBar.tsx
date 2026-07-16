import { LOCALE_LABELS, setLocale, t, useLocale, type Locale } from "../lib/i18n";

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
const THEME_LABEL_KEY: Record<Theme, "theme.light" | "theme.dark" | "theme.system"> = {
  light: "theme.light",
  dark: "theme.dark",
  system: "theme.system",
};

export default function TopBar(p: Props) {
  const locale = useLocale();
  return (
    <header className="topbar">
      <div className="brand">
        <span className="logo">◇</span>
        <span className="title">LocalDraw</span>
      </div>

      <div className="group">
        <button onClick={p.onNew} title={t("topbar.newTitle")}>{t("topbar.new")}</button>
        <button onClick={p.onOpen} disabled={!p.canFiles} title={t("topbar.openTitle")}>{t("topbar.open")}</button>
        <button onClick={p.onSave} disabled={!p.canFiles} title={t("topbar.saveTitle")}>{t("topbar.save")}</button>
        <button onClick={p.onSaveAs} disabled={!p.canFiles} title={t("topbar.saveAsTitle")}>
          {t("topbar.saveAs")}
        </button>
      </div>

      <div className="group">
        <button onClick={p.onExportPng} disabled={!p.canFiles} title={t("topbar.pngTitle")}>
          PNG
        </button>
        <button onClick={p.onExportSvg} disabled={!p.canFiles} title={t("topbar.svgTitle")}>
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
          title={t("topbar.aiTitle")}
        >
          {t("topbar.ai")}
        </button>
        <select
          className="lang-select"
          value={locale}
          onChange={(e) => setLocale(e.target.value as Locale)}
          title={t("lang.title")}
          aria-label={t("lang.title")}
        >
          {(Object.keys(LOCALE_LABELS) as Locale[]).map((l) => (
            <option key={l} value={l}>
              {LOCALE_LABELS[l]}
            </option>
          ))}
        </select>
        <button onClick={p.onCycleTheme} title={t(THEME_LABEL_KEY[p.theme])}>
          {THEME_ICON[p.theme]}
        </button>
      </div>
    </header>
  );
}
