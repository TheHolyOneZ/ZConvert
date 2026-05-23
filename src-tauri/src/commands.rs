use std::path::Path;
use std::sync::Arc;
use tauri::State;
use uuid::Uuid;
use crate::detect;
use crate::error::AppError;
use crate::job::{ConversionJob, FileEntry, JobStatus};
use crate::job::queue::CancelMap;
use crate::presets::Preset;
use crate::settings::{self, AppSettings};

pub struct AppState {
    pub cancel_map: CancelMap,
}

#[tauri::command]
pub async fn detect_files(paths: Vec<String>) -> Result<Vec<FileEntry>, AppError> {
    let entries = paths.into_iter().map(|p| {
        let path = Path::new(&p);
        let name = path.file_name().and_then(|n| n.to_str()).unwrap_or("").to_string();
        let size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
        let detected_format = detect::detect(path).ok();
        FileEntry { id: Uuid::new_v4().to_string(), path: p, name, size, detected_format }
    }).collect();
    Ok(entries)
}

#[tauri::command]
pub fn list_presets() -> Vec<Preset> {
    Preset::builtins()
}

#[tauri::command]
pub async fn start_job(
    app: tauri::AppHandle,
    state: State<'_, AppState>,
    mut job: ConversionJob,
) -> Result<String, AppError> {
    if job.output_targets.is_empty() {
        return Err(AppError::Other("No output targets specified".into()));
    }
    if job.files.is_empty() {
        return Err(AppError::Other("No files to convert".into()));
    }
    if job.id.is_empty() {
        job.id = Uuid::new_v4().to_string();
    }
    job.status = JobStatus::Running;
    let job_id = job.id.clone();
    let cancel_map = Arc::clone(&state.cancel_map);
    tokio::spawn(crate::job::queue::run_job(app, job, cancel_map));
    Ok(job_id)
}

#[tauri::command]
pub async fn cancel_job(state: State<'_, AppState>, job_id: String) -> Result<(), AppError> {
    let mut map = state.cancel_map.lock().await;
    if let Some(tx) = map.remove(&job_id) {
        let _ = tx.send(());
        Ok(())
    } else {
        Err(AppError::JobNotFound(job_id))
    }
}

#[tauri::command]
pub async fn reveal_file(app: tauri::AppHandle, path: String) -> Result<(), AppError> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| AppError::Other(e.to_string()))
}

#[tauri::command]
pub async fn open_url(app: tauri::AppHandle, url: String) -> Result<(), AppError> {
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| AppError::Other(e.to_string()))
}

#[tauri::command]
pub async fn load_settings(app: tauri::AppHandle) -> AppSettings {
    settings::load(&app)
}

#[tauri::command]
pub async fn save_settings(app: tauri::AppHandle, cfg: AppSettings) -> Result<(), AppError> {
    settings::save(&app, &cfg)
}

#[derive(serde::Serialize)]
pub struct SidecarStatus {
    pub pandoc: bool,
    pub soffice: bool,
}


#[tauri::command]
pub fn check_sidecars() -> SidecarStatus {
    SidecarStatus {
        pandoc: sidecar_present("pandoc"),
        soffice: sidecar_present("soffice"),
    }
}

fn sidecar_present(name: &str) -> bool {


    let triple = format!(
        "{}-{}",
        std::env::consts::ARCH,
        match std::env::consts::OS {
            "windows" => "pc-windows-msvc",
            "macos" => "apple-darwin",
            _ => "unknown-linux-gnu",
        }
    );


    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.to_path_buf()));

    let dev_binaries = option_env!("CARGO_MANIFEST_DIR")
        .map(|d| std::path::PathBuf::from(d).join("binaries"));

    let mut search_dirs: Vec<std::path::PathBuf> = Vec::new();
    if let Some(dir) = exe_dir {
        search_dirs.push(dir.clone());

        search_dirs.push(dir.join("binaries"));
    }
    if let Some(dir) = dev_binaries {
        search_dirs.push(dir);
    }


    let candidates: Vec<String> = if cfg!(windows) {
        vec![
            format!("{name}-{triple}.exe"),
            format!("{name}.exe"),
        ]
    } else {
        vec![
            format!("{name}-{triple}"),
            format!("{name}"),
        ]
    };

    for dir in &search_dirs {
        for candidate in &candidates {
            let p = dir.join(candidate);
            if p.exists() && p.metadata().map(|m| m.len() > 512).unwrap_or(false) {
                return true;
            }
        }
    }
    false
}
