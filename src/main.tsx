import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { useLocale } from "./lib/i18n";

// Remonta a árvore ao trocar de idioma → todo t() reavalia (e o langCode do
// Excalidraw acompanha).
function Root() {
  const locale = useLocale();
  return <App key={locale} />;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
