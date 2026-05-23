use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};
use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ConflictResolution {
    Rename,
    Overwrite,
    Skip,
}

impl Default for ConflictResolution {
    fn default() -> Self { ConflictResolution::Rename }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub default_output_dir: Option<String>,
    pub strip_metadata_default: bool,
    pub max_parallel_jobs: u8,
    pub conflict_resolution: ConflictResolution,
    pub theme: String,
    pub default_quality: u8,
}

impl Default for AppSettings {
    fn default() -> Self {
        AppSettings {
            default_output_dir: None,
            strip_metadata_default: true,
            max_parallel_jobs: 4,
            conflict_resolution: ConflictResolution::Rename,
            theme: "system".into(),
            default_quality: 85,
        }
    }
}

fn settings_path(app: &AppHandle) -> Result<std::path::PathBuf, AppError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::Other(e.to_string()))?;
    std::fs::create_dir_all(&data_dir)?;
    Ok(data_dir.join("settings.json"))
}

pub fn load(app: &AppHandle) -> AppSettings {
    settings_path(app)
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

pub fn save(app: &AppHandle, settings: &AppSettings) -> Result<(), AppError> {
    let path = settings_path(app)?;
    let content = serde_json::to_string_pretty(settings)
        .map_err(|e| AppError::Other(e.to_string()))?;
    std::fs::write(path, content)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_has_sensible_values() {
        let s = AppSettings::default();
        assert!(s.strip_metadata_default);
        assert_eq!(s.max_parallel_jobs, 4);
        assert_eq!(s.default_quality, 85);
        assert_eq!(s.conflict_resolution, ConflictResolution::Rename);
        assert_eq!(s.theme, "system");
        assert!(s.default_output_dir.is_none());
    }

    #[test]
    fn serde_roundtrip() {
        let original = AppSettings {
            default_output_dir: Some("/tmp/out".into()),
            strip_metadata_default: false,
            max_parallel_jobs: 8,
            conflict_resolution: ConflictResolution::Skip,
            theme: "dark".into(),
            default_quality: 72,
        };
        let json = serde_json::to_string(&original).unwrap();
        let decoded: AppSettings = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.default_output_dir, original.default_output_dir);
        assert_eq!(decoded.strip_metadata_default, original.strip_metadata_default);
        assert_eq!(decoded.max_parallel_jobs, original.max_parallel_jobs);
        assert_eq!(decoded.conflict_resolution, original.conflict_resolution);
        assert_eq!(decoded.theme, original.theme);
        assert_eq!(decoded.default_quality, original.default_quality);
    }

    #[test]
    fn conflict_resolution_serializes_snake_case() {
        let r = serde_json::to_string(&ConflictResolution::Rename).unwrap();
        assert_eq!(r, "\"rename\"");
        let o = serde_json::to_string(&ConflictResolution::Overwrite).unwrap();
        assert_eq!(o, "\"overwrite\"");
        let s = serde_json::to_string(&ConflictResolution::Skip).unwrap();
        assert_eq!(s, "\"skip\"");
    }
}
