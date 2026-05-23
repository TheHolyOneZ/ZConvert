use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error)]
pub enum AppError {
    #[error("Unsupported conversion: {from} → {to}")]
    UnsupportedConversion { from: String, to: String },

    #[error("Format detection failed: {0}")]
    DetectionFailed(String),

    #[error("Conversion failed: {0}")]
    ConversionFailed(String),

    #[error("Sidecar not found: {0}")]
    SidecarNotFound(String),

    #[error("Sidecar failed (exit {code}): {stderr}")]
    SidecarFailed { code: i32, stderr: String },

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Image error: {0}")]
    Image(#[from] image::ImageError),

    #[error("Metadata strip error: {0}")]
    MetadataStrip(String),

    #[error("Job not found: {0}")]
    JobNotFound(String),

    #[error("Cancelled")]
    Cancelled,

    #[error("{0}")]
    Other(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        AppError::Other(e.to_string())
    }
}
