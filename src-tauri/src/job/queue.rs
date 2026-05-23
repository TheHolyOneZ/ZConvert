use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::{Mutex, oneshot};
use tauri::{AppHandle, Emitter};
use crate::converters::{self, ConvertArgs};
use crate::error::AppError;
use crate::job::{ConversionJob, FileStatus, ProgressEvent};
use crate::presets::Preset;
use crate::settings::ConflictResolution;

pub type CancelMap = Arc<Mutex<HashMap<String, oneshot::Sender<()>>>>;


pub async fn run_job(app: AppHandle, job: ConversionJob, cancel_map: CancelMap) {
    let (tx, mut rx) = oneshot::channel::<()>();
    {
        let mut map = cancel_map.lock().await;
        map.insert(job.id.clone(), tx);
    }

    let file_total = job.files.len();
    let target_total = job.output_targets.len();
    let mut cancelled = false;


    let valid_files: Vec<_> = job.files.iter().filter(|f| {
        if !Path::new(&f.path).exists() {
            emit(&app, &job.id, &f.id, "n/a", 0, file_total, 0, target_total,
                FileStatus::Failed, None, Some(format!("File not found: {}", f.path)));
            false
        } else {
            true
        }
    }).collect();

    'outer: for (file_idx, file) in valid_files.iter().enumerate() {
        for (target_idx, target) in job.output_targets.iter().enumerate() {
            if cancelled || rx.try_recv().is_ok() {
                cancelled = true;
                emit(&app, &job.id, &file.id, &target.id, file_idx, file_total,
                    target_idx, target_total, FileStatus::Skipped, None, None);
                continue;
            }

            emit(&app, &job.id, &file.id, &target.id, file_idx, file_total,
                target_idx, target_total, FileStatus::Converting, None, None);

            let input = Path::new(&file.path);

            let out_dir = target.output_dir.as_deref().map(PathBuf::from)
                .or_else(|| input.parent().map(|p| p.to_path_buf()))
                .unwrap_or_else(|| PathBuf::from("."));

            if let Err(e) = std::fs::create_dir_all(&out_dir) {
                emit(&app, &job.id, &file.id, &target.id, file_idx, file_total,
                    target_idx, target_total, FileStatus::Failed, None,
                    Some(format!("Cannot create output dir: {e}")));
                continue;
            }

            let stem = input.file_stem().and_then(|s| s.to_str()).unwrap_or("output");
            let desired = out_dir.join(format!("{}.{}", stem, target.format.extension()));


            let desired = if desired == input {
                out_dir.join(format!("{}_converted.{}", stem, target.format.extension()))
            } else {
                desired
            };

            let final_path = match resolve_conflict(&desired, &job.conflict_resolution) {
                ConflictAction::Write(p) => p,
                ConflictAction::Skip => {
                    emit(&app, &job.id, &file.id, &target.id, file_idx, file_total,
                        target_idx, target_total, FileStatus::Skipped,
                        Some(desired.to_string_lossy().into()), None);
                    continue;
                }
            };

            let tmp = match tempfile::NamedTempFile::new_in(&out_dir) {
                Ok(f) => f,
                Err(e) => {
                    emit(&app, &job.id, &file.id, &target.id, file_idx, file_total,
                        target_idx, target_total, FileStatus::Failed, None, Some(e.to_string()));
                    continue;
                }
            };
            let tmp_path = tmp.path().to_path_buf();

            let preset = Preset {
                id: target.id.clone(),
                name: String::new(),
                target_format: target.format.clone(),
                quality: target.quality,
                max_dimension: target.max_dimension,
                strip_metadata: target.strip_metadata,
                builtin: false,
            };

            let args = ConvertArgs {
                input,
                output: &tmp_path,
                target_format: &target.format,
                preset: &preset,
            };

            match converters::dispatch(&app, args).await {
                Ok(_) => match tmp.persist(&final_path) {
                    Ok(_) => emit(&app, &job.id, &file.id, &target.id, file_idx, file_total,
                        target_idx, target_total, FileStatus::Done,
                        Some(final_path.to_string_lossy().into()), None),
                    Err(e) => emit(&app, &job.id, &file.id, &target.id, file_idx, file_total,
                        target_idx, target_total, FileStatus::Failed, None, Some(e.to_string())),
                },
                Err(AppError::Cancelled) => {
                    emit(&app, &job.id, &file.id, &target.id, file_idx, file_total,
                        target_idx, target_total, FileStatus::Skipped, None, None);
                    break 'outer;
                }
                Err(e) => emit(&app, &job.id, &file.id, &target.id, file_idx, file_total,
                    target_idx, target_total, FileStatus::Failed, None, Some(e.to_string())),
            }
        }
    }

    cancel_map.lock().await.remove(&job.id);
    let _ = app.emit("job://done", &job.id);
}

enum ConflictAction {
    Write(PathBuf),
    Skip,
}

fn resolve_conflict(desired: &Path, strategy: &ConflictResolution) -> ConflictAction {
    if !desired.exists() {
        return ConflictAction::Write(desired.to_path_buf());
    }
    match strategy {
        ConflictResolution::Overwrite => ConflictAction::Write(desired.to_path_buf()),
        ConflictResolution::Skip => ConflictAction::Skip,
        ConflictResolution::Rename => {
            let stem = desired.file_stem().and_then(|s| s.to_str()).unwrap_or("output");
            let ext = desired.extension().and_then(|e| e.to_str()).unwrap_or("");
            let parent = desired.parent().unwrap_or(Path::new("."));
            for i in 1..=999u32 {
                let candidate = parent.join(format!("{}_{}.{}", stem, i, ext));
                if !candidate.exists() {
                    return ConflictAction::Write(candidate);
                }
            }
            ConflictAction::Write(desired.to_path_buf())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::settings::ConflictResolution;
    use tempfile::tempdir;

    #[test]
    fn resolve_write_when_no_conflict() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("out.jpg");

        for strategy in [
            ConflictResolution::Rename,
            ConflictResolution::Overwrite,
            ConflictResolution::Skip,
        ] {
            match resolve_conflict(&p, &strategy) {
                ConflictAction::Write(path) => assert_eq!(path, p),
                ConflictAction::Skip => panic!("should not skip nonexistent file"),
            }
        }
    }

    #[test]
    fn resolve_overwrite_returns_same_path() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("out.jpg");
        std::fs::write(&p, b"existing").unwrap();
        match resolve_conflict(&p, &ConflictResolution::Overwrite) {
            ConflictAction::Write(path) => assert_eq!(path, p),
            ConflictAction::Skip => panic!("overwrite should not skip"),
        }
    }

    #[test]
    fn resolve_skip_returns_skip() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("out.jpg");
        std::fs::write(&p, b"existing").unwrap();
        match resolve_conflict(&p, &ConflictResolution::Skip) {
            ConflictAction::Skip => {}
            ConflictAction::Write(_) => panic!("skip strategy should return Skip"),
        }
    }

    #[test]
    fn resolve_rename_increments_suffix() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("out.jpg");
        let p1 = dir.path().join("out_1.jpg");
        std::fs::write(&p, b"existing").unwrap();
        match resolve_conflict(&p, &ConflictResolution::Rename) {
            ConflictAction::Write(path) => assert_eq!(path, p1),
            ConflictAction::Skip => panic!("rename should not skip"),
        }
    }

    #[test]
    fn resolve_rename_skips_existing_suffixes() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("file.png");
        std::fs::write(&p, b"0").unwrap();
        std::fs::write(dir.path().join("file_1.png"), b"1").unwrap();
        std::fs::write(dir.path().join("file_2.png"), b"2").unwrap();
        match resolve_conflict(&p, &ConflictResolution::Rename) {
            ConflictAction::Write(path) => {
                assert_eq!(path, dir.path().join("file_3.png"))
            }
            _ => panic!("should find file_3.png"),
        }
    }
}

#[allow(clippy::too_many_arguments)]
fn emit(
    app: &AppHandle, job_id: &str, file_id: &str, target_id: &str,
    file_index: usize, file_total: usize, target_index: usize, target_total: usize,
    status: FileStatus, output_path: Option<String>, error: Option<String>,
) {
    let _ = app.emit("job://progress", ProgressEvent {
        job_id: job_id.into(), file_id: file_id.into(), target_id: target_id.into(),
        file_index, file_total, target_index, target_total, status, output_path, error,
    });
}
