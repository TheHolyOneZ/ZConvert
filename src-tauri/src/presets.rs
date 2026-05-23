use serde::{Deserialize, Serialize};
use crate::detect::Format;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Preset {
    pub id: String,
    pub name: String,
    pub target_format: Format,
    pub quality: u8,
    pub max_dimension: Option<u32>,
    pub strip_metadata: bool,
    pub builtin: bool,
}

impl Preset {
    pub fn builtins() -> Vec<Preset> {
        vec![
            Preset {
                id: "web-optimized".into(),
                name: "Web Optimized".into(),
                target_format: Format::Jpeg,
                quality: 82,
                max_dimension: Some(2560),
                strip_metadata: true,
                builtin: true,
            },
            Preset {
                id: "archival".into(),
                name: "Archival".into(),
                target_format: Format::Tiff,
                quality: 100,
                max_dimension: None,
                strip_metadata: true,
                builtin: true,
            },
            Preset {
                id: "lossless-copy".into(),
                name: "Lossless Copy".into(),
                target_format: Format::Png,
                quality: 100,
                max_dimension: None,
                strip_metadata: false,
                builtin: true,
            },
            Preset {
                id: "pdf-archive".into(),
                name: "PDF Archive".into(),
                target_format: Format::Pdf,
                quality: 100,
                max_dimension: None,
                strip_metadata: true,
                builtin: true,
            },
            Preset {
                id: "web-png".into(),
                name: "Web PNG".into(),
                target_format: Format::Png,
                quality: 100,
                max_dimension: Some(1920),
                strip_metadata: true,
                builtin: true,
            },
        ]
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn builtins_not_empty() {
        assert!(Preset::builtins().len() >= 4);
    }

    #[test]
    fn all_builtins_valid_quality() {
        for p in Preset::builtins() {
            assert!(
                (1..=100).contains(&p.quality),
                "preset '{}' quality={} out of range",
                p.name,
                p.quality
            );
        }
    }

    #[test]
    fn web_optimized_strips_metadata() {
        let p = Preset::builtins()
            .into_iter()
            .find(|p| p.id == "web-optimized")
            .unwrap();
        assert!(p.strip_metadata);
        assert!(p.max_dimension.is_some());
    }

    #[test]
    fn lossless_copy_no_strip() {
        let p = Preset::builtins()
            .into_iter()
            .find(|p| p.id == "lossless-copy")
            .unwrap();
        assert!(!p.strip_metadata);
    }

    #[test]
    fn all_builtins_are_marked_builtin() {
        for p in Preset::builtins() {
            assert!(p.builtin, "preset '{}' should have builtin=true", p.name);
        }
    }

    #[test]
    fn preset_serde_roundtrip() {
        let p = Preset::builtins().remove(0);
        let json = serde_json::to_string(&p).unwrap();
        let decoded: Preset = serde_json::from_str(&json).unwrap();
        assert_eq!(decoded.id, p.id);
        assert_eq!(decoded.quality, p.quality);
    }
}
