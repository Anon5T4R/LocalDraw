import {
  LOCALE_LABELS,
  setLocale,
  t,
  useLocale,
  type Locale,
  type MessageKey,
} from "../lib/i18n";
import { TEMPLATE_IDS, TEMPLATE_NAME_KEY, type TemplateId } from "../lib/templates";

export type Theme =
  | "light"
  | "dark"
  | "system"
  | "nature"
  | "darkblue"
  | "calmgreen"
  | "pastelpink"
  | "punkprincess";

export const THEMES: Theme[] = [
  "system",
  "light",
  "dark",
  "nature",
  "darkblue",
  "calmgreen",
  "pastelpink",
  "punkprincess",
];

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
  onSetTheme: (theme: Theme) => void;
  onToggleAi: () => void;
  onTemplate: (id: TemplateId) => void;
}

const TEMPLATE_ICON: Record<TemplateId, string> = {
  flowchart: "▭",
  org: "⌗",
  network: "⁂",
};

const THEME_ICON: Record<Theme, string> = {
  light: "☀️",
  dark: "🌙",
  system: "🖥️",
  nature: "🌿",
  darkblue: "🌊",
  calmgreen: "🍃",
  pastelpink: "🌸",
  punkprincess: "💜",
};
const THEME_LABEL_KEY: Record<Theme, MessageKey> = {
  light: "theme.light",
  dark: "theme.dark",
  system: "theme.system",
  nature: "theme.nature",
  darkblue: "theme.darkblue",
  calmgreen: "theme.calmgreen",
  pastelpink: "theme.pastelpink",
  punkprincess: "theme.punkprincess",
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

      <div className="group">
        {/* Modelos prontos: `value=""` fixo — o select age como menu (dispara e
            volta pro rótulo), não guarda estado. */}
        <select
          className="tpl-select"
          value=""
          onChange={(e) => {
            if (e.target.value) p.onTemplate(e.target.value as TemplateId);
          }}
          title={t("tpl.title")}
          aria-label={t("tpl.title")}
        >
          <option value="">{t("tpl.menu")}</option>
          {TEMPLATE_IDS.map((id) => (
            <option key={id} value={id}>
              {TEMPLATE_ICON[id]} {t(TEMPLATE_NAME_KEY[id])}
            </option>
          ))}
        </select>
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
        <select
          className="theme-select"
          value={p.theme}
          onChange={(e) => p.onSetTheme(e.target.value as Theme)}
          title={t("theme.title")}
          aria-label={t("theme.title")}
        >
          {THEMES.map((th) => (
            <option key={th} value={th}>
              {THEME_ICON[th]} {t(THEME_LABEL_KEY[th])}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
