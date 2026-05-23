pub mod data;
pub mod document;
pub mod image;
pub mod metadata;
pub mod raw;
pub mod svg;

use std::path::{Path, PathBuf};
use crate::detect::Format;
use crate::error::AppError;
use crate::presets::Preset;

pub struct ConvertArgs<'a> {
    pub input: &'a Path,
    pub output: &'a Path,
    pub target_format: &'a Format,
    pub preset: &'a Preset,
}

pub fn is_supported(from: &Format, to: &Format) -> bool {
    use Format::*;
    matches!(
        (from, to),

        (Jpeg | Png | WebP | Tiff | Bmp | Avif, Jpeg | Png | WebP | Tiff | Bmp | Avif)
        | (Heic, Jpeg | Png | WebP | Tiff)
        | (Raw, Jpeg | Png | Tiff)
        | (Svg, Png | Jpeg | WebP)

        | (Pdf, Docx | Html | Txt)
        | (Docx | Doc, Pdf | Html | Txt | Odt | Markdown)
        | (Xlsx | Xls, Csv | Json | Pdf | Html)
        | (Pptx | Ppt, Pdf | Html)
        | (Odt, Docx | Pdf | Html | Txt)
        | (Markdown, Html | Docx | Pdf | Txt)
        | (Html, Pdf | Markdown | Txt | Docx)
        | (Txt, Pdf | Html | Markdown | Docx)
        | (Epub, Pdf | Html | Docx | Txt)

        | (Csv, Json | Xlsx)
        | (Json, Csv)
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::detect::Format::*;

    #[test]
    fn image_to_image_all_supported() {
        let sources = [Jpeg, Png, WebP, Tiff, Bmp];
        let targets = [Jpeg, Png, WebP, Tiff, Bmp, Avif];
        for from in &sources {
            for to in &targets {
                assert!(is_supported(from, to), "{from:?} → {to:?} should be supported");
            }
        }
    }

    #[test]
    fn heic_supported_targets() {
        for to in &[Jpeg, Png, WebP, Tiff] {
            assert!(is_supported(&Heic, to), "Heic → {to:?}");
        }
    }

    #[test]
    fn svg_raster_supported() {
        for to in &[Png, Jpeg, WebP] {
            assert!(is_supported(&Svg, to), "Svg → {to:?}");
        }
    }

    #[test]
    fn data_conversions_supported() {
        assert!(is_supported(&Csv, &Json));
        assert!(is_supported(&Json, &Csv));
    }

    #[test]
    fn doc_conversions_supported() {
        assert!(is_supported(&Markdown, &Html));
        assert!(is_supported(&Markdown, &Txt));
        assert!(is_supported(&Html, &Txt));
        assert!(is_supported(&Docx, &Pdf));
        assert!(is_supported(&Pdf, &Html));
        assert!(is_supported(&Xlsx, &Csv));
        assert!(is_supported(&Xlsx, &Json));
    }

    #[test]
    fn cross_category_unsupported() {
        assert!(!is_supported(&Jpeg, &Json));
        assert!(!is_supported(&Csv, &Png));
        assert!(!is_supported(&Json, &Jpeg));
        assert!(!is_supported(&Png, &Csv));
        assert!(!is_supported(&Jpeg, &Pdf));
    }

    #[test]
    fn avif_as_source_to_common_targets() {
        for to in &[Jpeg, Png, WebP, Tiff, Bmp] {
            assert!(is_supported(&Avif, to), "Avif → {to:?}");
        }
    }
}

pub async fn dispatch(
    app: &tauri::AppHandle,
    args: ConvertArgs<'_>,
) -> Result<PathBuf, AppError> {
    let from = &args.target_format;
    let detected = crate::detect::detect(args.input)?;

    match detected.category() {
        "image" => image::convert(args).await,
        "document" => document::convert(app, args).await,
        "data" => data::convert(args).await,
        _ => Err(AppError::UnsupportedConversion {
            from: detected.display_name().to_string(),
            to: from.display_name().to_string(),
        }),
    }
}
