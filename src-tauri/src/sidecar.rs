use std::path::{Path, PathBuf};
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;
use crate::error::AppError;

pub async fn pandoc(app: &AppHandle, args: &[&str]) -> Result<String, AppError> {
    let output = app
        .shell()
        .sidecar("pandoc")
        .map_err(|e| AppError::SidecarNotFound(e.to_string()))?
        .args(args)
        .output()
        .await
        .map_err(|e| AppError::ConversionFailed(e.to_string()))?;

    if !output.status.success() {
        return Err(AppError::SidecarFailed {
            code: output.status.code().unwrap_or(-1),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        });
    }
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}


fn path_to_file_uri(path: &Path) -> String {

    let slash = path.to_string_lossy().replace('\\', "/");


    if slash.starts_with('/') {
        format!("file://{}", slash)
    } else {
        format!("file:///{}", slash)
    }
}

pub async fn soffice_convert(
    app: &AppHandle,
    input: &Path,
    target_ext: &str,
    out_dir: &Path,
) -> Result<PathBuf, AppError> {
    let profile_dir = tempfile::tempdir()
        .map_err(AppError::Io)?;
    let profile_url = path_to_file_uri(profile_dir.path());

    let output = app
        .shell()
        .sidecar("soffice")
        .map_err(|e| AppError::SidecarNotFound(e.to_string()))?
        .args([
            "--headless",
            &format!("-env:UserInstallation={}", profile_url),
            "--convert-to",
            target_ext,
            "--outdir",
            &out_dir.to_string_lossy(),
            &input.to_string_lossy(),
        ])
        .output()
        .await
        .map_err(|e| AppError::ConversionFailed(e.to_string()))?;

    if !output.status.success() {
        return Err(AppError::SidecarFailed {
            code: output.status.code().unwrap_or(-1),
            stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        });
    }

    let stem = input
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("output");
    let out_path = out_dir.join(format!("{}.{}", stem, target_ext));
    Ok(out_path)
}
