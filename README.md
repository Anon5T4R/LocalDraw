# LocalDraw

Diagramas, fluxogramas e quadro-branco **100% offline**, da suíte **Local/Taylor**.
Canvas infinito do [Excalidraw](https://github.com/excalidraw/excalidraw) embutido —
com conectores que seguem as formas — mais IA local (opcional) que gera um
fluxograma a partir de uma descrição em português.

## O que faz

- **Canvas completo** (Excalidraw): retângulos, losangos, elipses, setas/conectores
  ancorados às formas, texto, imagens, desenho à mão, agrupar, camadas, snapping,
  desfazer/refazer — tudo dentro do app, sem nuvem.
- **Fontes offline de verdade:** o Excalidraw normalmente busca fontes por CDN em
  runtime; aqui elas são servidas localmente (`/excalidraw-assets/fonts`), então
  **nenhum request sai da máquina**.
- **Formato nativo `.tdraw`** — é o JSON padrão do Excalidraw, então um `.tdraw`
  também abre como `.excalidraw`. Abre por duplo-clique / "abrir com".
- **Exportar** PNG e SVG.
- **Menu 100% offline:** o menu do app tem só o que funciona sem internet (arquivo, exportar, buscar, limpar canvas) — sem os itens online/promo do Excalidraw web (colaboração, login, redes).
- **Recuperação de sessão:** a cena é salva localmente enquanto você desenha; fechar sem salvar não perde nada — reabre onde parou.
- **Biblioteca de formas** persistente entre sessões e importável (`.excalidrawlib`) offline.
- **IA local (opcional, porta 8106):** descreva um processo → o modelo devolve os
  nós e ligações, e o LocalDraw desenha as formas e conectores. A IA **propõe**, o
  código valida e monta a geometria (nunca aplica coordenadas cruas do modelo).
- Tema claro/escuro/sistema; atalhos de arquivo (Ctrl+N/O/S/Shift+S).

## Stack

Tauri 2 + React 19 + Vite + TypeScript no front, Rust no back. IA via
`llama.cpp` (`llama-server`) como sidecar OpenAI-compat em `127.0.0.1`, modelos
`.gguf` apontados pelo usuário (nada vai no instalador). Porta de dev **1452**.

## Rodar em desenvolvimento

```bash
npm install
npm run tauri dev
```

Só o front (Excalidraw no navegador, sem IA): `npm run dev` em http://localhost:1452.
Testes: `npm test`. Build do front: `npm run build`.

## Releases

Instaladores Windows (NSIS) e Linux (AppImage) são publicados pelo GitHub Actions
a cada tag `v*`. A IA precisa de um modelo `.gguf` (aponte a pasta nas
configurações de IA).

## Licença

MIT. O Excalidraw é MIT (© Excalidraw contributors). O `llama-server` é baixado no
build e roda como processo separado.
