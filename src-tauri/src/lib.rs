#![allow(dead_code)]
pub mod commands;
pub mod converters;
pub mod detect;
pub mod error;
pub mod job;
pub mod presets;
pub mod settings;
pub mod sidecar;

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use commands::AppState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "zconvert=info".into()),
        )
        .init();

    let state = AppState {
        cancel_map: Arc::new(Mutex::new(HashMap::new())),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::detect_files,
            commands::list_presets,
            commands::start_job,
            commands::cancel_job,
            commands::reveal_file,
            commands::open_url,
            commands::load_settings,
            commands::save_settings,
            commands::check_sidecars,
        ])
        .run(tauri::generate_context!())
        .expect("error while running ZConvert");
}
