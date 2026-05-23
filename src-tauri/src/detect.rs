use std::path::Path;
use crate::error::AppError;

#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Format {

    Jpeg,
    Png,
    WebP,
    Heic,
    Avif,
    Tiff,
    Bmp,
    Svg,
    Raw,

    Pdf,
    Docx,
    Doc,
    Xlsx,
    Xls,
    Pptx,
    Ppt,
    Odt,
    Markdown,
    Epub,
    Html,
    Txt,

    Csv,
    Json,
}

impl Format {
    pub fn category(&self) -> &'static str {
        match self {
            Format::Jpeg
            | Format::Png
            | Format::WebP
            | Format::Heic
            | Format::Avif
            | Format::Tiff
            | Format::Bmp
            | Format::Svg
            | Format::Raw => "image",
            Format::Pdf
            | Format::Docx
            | Format::Doc
            | Format::Xlsx
            | Format::Xls
            | Format::Pptx
            | Format::Ppt
            | Format::Odt
            | Format::Markdown
            | Format::Epub
            | Format::Html
            | Format::Txt => "document",
            Format::Csv | Format::Json => "data",
        }
    }

    pub fn display_name(&self) -> &'static str {
        match self {
            Format::Jpeg => "JPEG",
            Format::Png => "PNG",
            Format::WebP => "WebP",
            Format::Heic => "HEIC",
            Format::Avif => "AVIF",
            Format::Tiff => "TIFF",
            Format::Bmp => "BMP",
            Format::Svg => "SVG",
            Format::Raw => "RAW",
            Format::Pdf => "PDF",
            Format::Docx => "DOCX",
            Format::Doc => "DOC",
            Format::Xlsx => "XLSX",
            Format::Xls => "XLS",
            Format::Pptx => "PPTX",
            Format::Ppt => "PPT",
            Format::Odt => "ODT",
            Format::Markdown => "Markdown",
            Format::Epub => "EPUB",
            Format::Html => "HTML",
            Format::Txt => "TXT",
            Format::Csv => "CSV",
            Format::Json => "JSON",
        }
    }

    pub fn extension(&self) -> &'static str {
        match self {
            Format::Jpeg => "jpg",
            Format::Png => "png",
            Format::WebP => "webp",
            Format::Heic => "heic",
            Format::Avif => "avif",
            Format::Tiff => "tiff",
            Format::Bmp => "bmp",
            Format::Svg => "svg",
            Format::Raw => "tiff",
            Format::Pdf => "pdf",
            Format::Docx => "docx",
            Format::Doc => "doc",
            Format::Xlsx => "xlsx",
            Format::Xls => "xls",
            Format::Pptx => "pptx",
            Format::Ppt => "ppt",
            Format::Odt => "odt",
            Format::Markdown => "md",
            Format::Epub => "epub",
            Format::Html => "html",
            Format::Txt => "txt",
            Format::Csv => "csv",
            Format::Json => "json",
        }
    }
}

pub fn detect(path: &Path) -> Result<Format, AppError> {

    if let Ok(bytes) = read_header(path) {
        if let Some(kind) = infer::get(&bytes) {
            if let Some(fmt) = mime_to_format(kind.mime_type()) {
                return Ok(fmt);
            }
        }
    }


    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        if let Some(fmt) = ext_to_format(ext) {
            return Ok(fmt);
        }
    }

    Err(AppError::DetectionFailed(
        path.display().to_string(),
    ))
}

fn read_header(path: &Path) -> std::io::Result<Vec<u8>> {
    use std::io::Read;
    let mut f = std::fs::File::open(path)?;
    let mut buf = vec![0u8; 512];
    let n = f.read(&mut buf)?;
    buf.truncate(n);
    Ok(buf)
}

fn mime_to_format(mime: &str) -> Option<Format> {
    match mime {
        "image/jpeg" => Some(Format::Jpeg),
        "image/png" => Some(Format::Png),
        "image/webp" => Some(Format::WebP),
        "image/heic" | "image/heif" => Some(Format::Heic),
        "image/avif" => Some(Format::Avif),
        "image/tiff" => Some(Format::Tiff),
        "image/bmp" => Some(Format::Bmp),
        "image/svg+xml" => Some(Format::Svg),
        "application/pdf" => Some(Format::Pdf),
        "application/epub+zip" => Some(Format::Epub),
        "application/json" => Some(Format::Json),
        "text/csv" => Some(Format::Csv),
        "text/html" => Some(Format::Html),
        "text/plain" => Some(Format::Txt),
        _ => None,
    }
}

fn ext_to_format(ext: &str) -> Option<Format> {
    match ext.to_lowercase().as_str() {
        "jpg" | "jpeg" | "jfif" => Some(Format::Jpeg),
        "png" => Some(Format::Png),
        "webp" => Some(Format::WebP),
        "heic" | "heif" => Some(Format::Heic),
        "avif" => Some(Format::Avif),
        "tif" | "tiff" => Some(Format::Tiff),
        "bmp" => Some(Format::Bmp),
        "svg" => Some(Format::Svg),
        "nef" | "cr2" | "cr3" | "dng" | "orf" | "arw" | "rw2" | "raf" => Some(Format::Raw),
        "pdf" => Some(Format::Pdf),
        "docx" => Some(Format::Docx),
        "doc" => Some(Format::Doc),
        "xlsx" => Some(Format::Xlsx),
        "xls" => Some(Format::Xls),
        "pptx" => Some(Format::Pptx),
        "ppt" => Some(Format::Ppt),
        "odt" => Some(Format::Odt),
        "md" | "markdown" => Some(Format::Markdown),
        "epub" => Some(Format::Epub),
        "html" | "htm" => Some(Format::Html),
        "txt" | "text" => Some(Format::Txt),
        "csv" => Some(Format::Csv),
        "json" => Some(Format::Json),
        _ => None,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn ext_fallback_jpeg() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("photo.jpg");
        fs::write(&p, b"not-real-jpeg").unwrap();
        assert_eq!(detect(&p).unwrap(), Format::Jpeg);
    }

    #[test]
    fn ext_fallback_csv() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("data.csv");
        fs::write(&p, b"a,b\n1,2").unwrap();
        assert_eq!(detect(&p).unwrap(), Format::Csv);
    }

    #[test]
    fn ext_fallback_markdown() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("readme.md");
        fs::write(&p, b"# hello").unwrap();
        assert_eq!(detect(&p).unwrap(), Format::Markdown);
    }

    #[test]
    fn unknown_extension_returns_err() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("file.zzz999");
        fs::write(&p, b"garbage").unwrap();
        assert!(detect(&p).is_err());
    }

    #[test]
    fn format_display_names_nonempty() {
        let formats = [
            Format::Jpeg, Format::Png, Format::WebP, Format::Heic, Format::Avif,
            Format::Tiff, Format::Bmp, Format::Svg, Format::Raw, Format::Pdf,
            Format::Docx, Format::Xlsx, Format::Csv, Format::Json, Format::Markdown,
            Format::Html, Format::Txt,
        ];
        for f in &formats {
            assert!(!f.display_name().is_empty(), "{f:?} has empty display name");
            assert!(!f.extension().is_empty(), "{f:?} has empty extension");
            assert!(!f.category().is_empty(), "{f:?} has empty category");
        }
    }

    #[test]
    fn format_categories_correct() {
        assert_eq!(Format::Jpeg.category(), "image");
        assert_eq!(Format::Pdf.category(), "document");
        assert_eq!(Format::Csv.category(), "data");
        assert_eq!(Format::Json.category(), "data");
        assert_eq!(Format::Markdown.category(), "document");
    }
}
