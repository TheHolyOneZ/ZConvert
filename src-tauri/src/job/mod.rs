pub mod queue;

use serde::{Deserialize, Serialize};
use crate::detect::Format;
use crate::settings::ConflictResolution;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum JobStatus {
    Pending,
    Running,
    Done,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub id: String,
    pub path: String,
    pub name: String,
    pub size: u64,
    pub detected_format: Option<Format>,
}


#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputTarget {
    pub id: String,
    pub format: Format,
    pub quality: u8,
    pub max_dimension: Option<u32>,
    pub strip_metadata: bool,

    pub output_dir: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConversionJob {
    pub id: String,
    pub files: Vec<FileEntry>,
    pub output_targets: Vec<OutputTarget>,
    pub conflict_resolution: ConflictResolution,
    pub status: JobStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgressEvent {
    pub job_id: String,
    pub file_id: String,
    pub target_id: String,
    pub file_index: usize,
    pub file_total: usize,
    pub target_index: usize,
    pub target_total: usize,
    pub status: FileStatus,
    pub output_path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum FileStatus {
    Pending,
    Converting,
    Done,
    Failed,
    Skipped,
}
