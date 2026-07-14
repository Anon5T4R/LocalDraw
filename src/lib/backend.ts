// Wrappers dos comandos Rust (Tauri v2: chaves camelCase no invoke).
// Fora do Tauri (dev no navegador puro) os comandos rejeitam, e a UI trata —
// pra o Excalidraw ainda renderizar num `vite dev` sem Tauri.

import { invoke } from "@tauri-apps/api/core";

export function inTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function cmd<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!inTauri()) return Promise.reject(new Error(`fora do Tauri: ${name}`));
  return invoke<T>(name, args);
}

// --- arquivos ---
export const getStartupFile = () => cmd<string | null>("get_startup_file");
export const readTextFile = (path: string) => cmd<string>("read_text_file", { path });
export const readFileBase64 = (path: string) => cmd<string>("read_file_base64", { path });
export const writeTextFile = (path: string, content: string) =>
  cmd<void>("write_text_file", { path, content });
export const writeFileBase64 = (path: string, base64Data: string) =>
  cmd<void>("write_file_base64", { path, base64Data });

// --- IA (llama-server) ---
export interface ModelInfo {
  name: string;
  path: string;
  sizeGb: number;
}
export interface LlmStatus {
  running: boolean;
  port: number;
  model: string;
}
export const listModels = (dir: string) => cmd<ModelInfo[]>("list_models", { dir });
export const startLlm = (modelPath: string, nGpuLayers: number, ctxSize: number) =>
  cmd<number>("start_llm", { modelPath, nGpuLayers, ctxSize });
export const stopLlm = () => cmd<void>("stop_llm");
export const llmStatus = () => cmd<LlmStatus>("llm_status");
