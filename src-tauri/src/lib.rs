mod llm;

use std::path::Path;
use std::sync::Mutex;

use tauri::{Emitter, Manager};

/// Caminho passado no launch (abrir um `.tdraw` pelo "Abrir com"), se houver.
#[tauri::command(async)]
fn get_startup_file() -> Option<String> {
    std::env::args()
        .skip(1)
        .find(|a| !a.starts_with('-') && Path::new(a).is_file())
}

/// Lê um arquivo como base64 (abrir `.tdraw`/imagem: o parse fica no webview,
/// Rust só move bytes — mesma filosofia do resto da suíte).
#[tauri::command(async)]
fn read_file_base64(path: String) -> Result<String, String> {
    use base64::Engine;
    let bytes = std::fs::read(&path).map_err(|e| format!("Falha ao ler '{}': {}", path, e))?;
    Ok(base64::engine::general_purpose::STANDARD.encode(bytes))
}

/// Lê um arquivo como texto (`.tdraw` é JSON de cena — texto puro).
#[tauri::command(async)]
fn read_text_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| format!("Falha ao ler '{}': {}", path, e))
}

/// Grava bytes base64 em disco (export PNG).
#[tauri::command(async)]
fn write_file_base64(path: String, base64_data: String) -> Result<(), String> {
    use base64::Engine;
    if let Some(parent) = Path::new(&path).parent() {
        if !parent.as_os_str().is_empty() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Falha ao criar diretório '{}': {}", parent.display(), e))?;
        }
    }
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_data.as_bytes())
        .map_err(|e| format!("base64 inválido: {}", e))?;
    std::fs::write(&path, bytes).map_err(|e| format!("Falha ao salvar '{}': {}", path, e))
}

/// Grava texto direto (salvar `.tdraw`, export SVG).
#[tauri::command(async)]
fn write_text_file(path: String, content: String) -> Result<(), String> {
    std::fs::write(&path, content).map_err(|e| format!("Falha ao salvar '{}': {}", path, e))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // single-instance primeiro: um 2º launch (ex.: "abrir com" num .tdraw)
        // encaminha o caminho pra janela viva em vez de subir outra instância.
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(file) = argv.iter().skip(1).find(|a| Path::new(a).is_file()) {
                let _ = app.emit("open-file", file.clone());
            }
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.show();
                let _ = w.unminimize();
                let _ = w.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(Mutex::new(llm::LlmState::default()))
        .invoke_handler(tauri::generate_handler![
            get_startup_file,
            read_file_base64,
            read_text_file,
            write_file_base64,
            write_text_file,
            llm::list_models,
            llm::start_llm,
            llm::stop_llm,
            llm::llm_status
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            // Garante que o llama-server morre quando o app sai.
            if let tauri::RunEvent::Exit = event {
                if let Some(state) = app_handle.try_state::<Mutex<llm::LlmState>>() {
                    if let Ok(mut s) = state.lock() {
                        if let Some(child) = s.child.as_mut() {
                            let _ = child.kill();
                        }
                    }
                }
            }
        });
}
