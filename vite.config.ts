import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, createReadStream, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST;

const FONTS_SRC = resolve("node_modules/@excalidraw/excalidraw/dist/prod/fonts");

/**
 * OFFLINE: o Excalidraw 0.18 faz lazy-load das fontes por CDN (esm.sh) em runtime,
 * a menos que window.EXCALIDRAW_ASSET_PATH aponte pra um caminho local (setado no
 * index.html como "/excalidraw-assets/"). Este plugin serve as fontes do próprio
 * pacote em /excalidraw-assets/fonts — no dev via middleware, no build copiando
 * pra dist. Nenhum request sai da máquina, fiel à filosofia da suíte.
 */
function excalidrawFonts(): Plugin {
  const PREFIX = "/excalidraw-assets/fonts/";
  return {
    name: "localdraw-excalidraw-fonts",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ? decodeURIComponent(req.url.split("?")[0]) : "";
        if (!url.startsWith(PREFIX)) return next();
        const file = join(FONTS_SRC, url.slice(PREFIX.length));
        if (existsSync(file) && statSync(file).isFile()) {
          res.setHeader("Content-Type", "font/woff2");
          createReadStream(file).pipe(res);
        } else {
          next();
        }
      });
    },
    writeBundle(options) {
      const outDir = options.dir ?? resolve("dist");
      cpSync(FONTS_SRC, join(outDir, "excalidraw-assets", "fonts"), { recursive: true });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), excalidrawFonts()],

  // Lição da suíte: forçar uma única instância do React pra nenhuma dependência
  // puxar uma 2ª cópia e quebrar os hooks ("Invalid hook call"). O Excalidraw é
  // um componente React pesado — sensível a isso.
  resolve: {
    dedupe: ["react", "react-dom"],
  },

  build: {
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes("node_modules")) {
            if (id.includes("@excalidraw")) return "excalidraw";
          }
        },
      },
    },
  },

  // Opções do Vite ajustadas pro Tauri (só aplicadas em `tauri dev`/`tauri build`).
  clearScreen: false,
  server: {
    // Porta única do LocalDraw na suíte (LocalPlayer=1450, este=1452). O Tauri
    // não tem fallback de porta — devUrl e esta porta têm que bater.
    port: 1452,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1453,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
}));
