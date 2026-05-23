use std::path::{Path, PathBuf};

// ─── helpers ─────────────────────────────────────────────────────────────────

fn make_preset(
    quality: u8,
    max_dim: Option<u32>,
    strip: bool,
    fmt: zconvert_lib::detect::Format,
) -> zconvert_lib::presets::Preset {
    zconvert_lib::presets::Preset {
        id: "test-preset".into(),
        name: "Test Preset".into(),
        target_format: fmt,
        quality,
        max_dimension: max_dim,
        strip_metadata: strip,
        builtin: false,
    }
}

fn make_jpeg(dir: &Path) -> PathBuf {
    use image::{RgbImage, ImageFormat};
    let img = RgbImage::from_fn(4, 4, |x, y| {
        image::Rgb([x as u8 * 60, y as u8 * 60, 128])
    });
    let path = dir.join("test.jpg");
    image::DynamicImage::ImageRgb8(img)
        .save_with_format(&path, ImageFormat::Jpeg)
        .unwrap();
    path
}

fn make_png(dir: &Path) -> PathBuf {
    use image::{RgbImage, ImageFormat};
    let img = RgbImage::from_fn(4, 4, |x, y| {
        image::Rgb([x as u8 * 60, y as u8 * 60, 200])
    });
    let path = dir.join("test.png");
    image::DynamicImage::ImageRgb8(img)
        .save_with_format(&path, ImageFormat::Png)
        .unwrap();
    path
}

fn make_csv(dir: &Path) -> PathBuf {
    let path = dir.join("test.csv");
    std::fs::write(&path, "name,age,city\nAlice,30,NYC\nBob,25,LA\n").unwrap();
    path
}

fn make_json(dir: &Path) -> PathBuf {
    let path = dir.join("test.json");
    std::fs::write(
        &path,
        r#"[{"name":"Alice","age":"30","city":"NYC"},{"name":"Bob","age":"25","city":"LA"}]"#,
    )
    .unwrap();
    path
}

fn make_svg(dir: &Path) -> PathBuf {
    let path = dir.join("test.svg");
    std::fs::write(
        &path,
        r#"<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="red"/></svg>"#,
    )
    .unwrap();
    path
}

#[allow(dead_code)]
fn make_markdown(dir: &Path) -> PathBuf {
    let path = dir.join("test.md");
    std::fs::write(
        &path,
        "# Hello\n\nThis is **bold** and *italic*.\n\n- item one\n- item two\n",
    )
    .unwrap();
    path
}

#[allow(dead_code)]
fn make_html(dir: &Path) -> PathBuf {
    let path = dir.join("test.html");
    std::fs::write(
        &path,
        "<html><body><h1>Test</h1><p>Hello world</p></body></html>",
    )
    .unwrap();
    path
}

#[allow(dead_code)]
fn make_txt(dir: &Path) -> PathBuf {
    let path = dir.join("test.txt");
    std::fs::write(&path, "Hello world\nLine two\nLine three\n").unwrap();
    path
}

fn conv_args<'a>(
    input: &'a Path,
    output: &'a Path,
    fmt: &'a zconvert_lib::detect::Format,
    preset: &'a zconvert_lib::presets::Preset,
) -> zconvert_lib::converters::ConvertArgs<'a> {
    zconvert_lib::converters::ConvertArgs {
        input,
        output,
        target_format: fmt,
        preset,
    }
}

// ─── detect tests ─────────────────────────────────────────────────────────────

mod detect_tests {
    use zconvert_lib::detect::{detect, Format};
    use tempfile::tempdir;

    #[test]
    fn detect_by_extension_jpeg() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("x.jpg");
        std::fs::write(&p, b"x").unwrap();
        assert_eq!(detect(&p).unwrap(), Format::Jpeg);
    }

    #[test]
    fn detect_by_extension_for_every_format() {
        let dir = tempdir().unwrap();
        let cases: &[(&str, Format)] = &[
            ("jpg",  Format::Jpeg),
            ("png",  Format::Png),
            ("webp", Format::WebP),
            ("heic", Format::Heic),
            ("avif", Format::Avif),
            ("tiff", Format::Tiff),
            ("bmp",  Format::Bmp),
            ("svg",  Format::Svg),
            ("pdf",  Format::Pdf),
            ("docx", Format::Docx),
            ("xlsx", Format::Xlsx),
            ("csv",  Format::Csv),
            ("json", Format::Json),
            ("md",   Format::Markdown),
            ("html", Format::Html),
            ("txt",  Format::Txt),
            ("epub", Format::Epub),
        ];
        for (ext, expected) in cases {
            let p = dir.path().join(format!("file.{ext}"));
            std::fs::write(&p, b"dummy content").unwrap();
            let got = detect(&p).unwrap_or_else(|e| panic!(".{ext} detection failed: {e}"));
            assert_eq!(&got, expected, "extension .{ext} mismatch");
        }
    }

    #[test]
    fn detect_unknown_extension_errors() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("x.xyz123");
        std::fs::write(&p, b"garbage").unwrap();
        assert!(detect(&p).is_err(), "unknown extension should error");
    }
}

// ─── is_supported tests ───────────────────────────────────────────────────────

mod is_supported_tests {
    use zconvert_lib::converters::is_supported;
    use zconvert_lib::detect::Format::*;

    #[test]
    fn image_to_image_supported() {
        let pairs = [
            (Jpeg, Png), (Jpeg, WebP), (Jpeg, Tiff), (Jpeg, Bmp), (Jpeg, Avif),
            (Png, Jpeg), (WebP, Jpeg), (Tiff, Jpeg), (Bmp, Jpeg),
        ];
        for (from, to) in &pairs {
            assert!(is_supported(from, to), "{from:?} → {to:?} should be supported");
        }
    }

    #[test]
    fn heic_decode_targets_supported() {
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
    fn raw_decode_supported() {
        for to in &[Jpeg, Png, Tiff] {
            assert!(is_supported(&Raw, to), "Raw → {to:?}");
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
        assert!(is_supported(&Pdf, &Html));
    }

    #[test]
    fn unsupported_cross_category() {
        assert!(!is_supported(&Jpeg, &Json), "Jpeg → Json should be unsupported");
        assert!(!is_supported(&Csv, &Png),  "Csv → Png should be unsupported");
        assert!(!is_supported(&Json, &Jpeg), "Json → Jpeg should be unsupported");
    }
}

// ─── settings tests ───────────────────────────────────────────────────────────

mod settings_tests {
    use zconvert_lib::settings::{AppSettings, ConflictResolution};

    #[test]
    fn default_settings_values() {
        let s = AppSettings::default();
        assert!(s.strip_metadata_default);
        assert_eq!(s.max_parallel_jobs, 4);
        assert_eq!(s.default_quality, 85);
        assert_eq!(s.conflict_resolution, ConflictResolution::Rename);
    }

    #[test]
    fn settings_serde_roundtrip() {
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
    fn conflict_resolution_serde() {
        let r = serde_json::to_string(&ConflictResolution::Rename).unwrap();
        assert_eq!(r, "\"rename\"");
        let o = serde_json::to_string(&ConflictResolution::Overwrite).unwrap();
        assert_eq!(o, "\"overwrite\"");
        let s = serde_json::to_string(&ConflictResolution::Skip).unwrap();
        assert_eq!(s, "\"skip\"");
    }
}

// ─── preset tests ─────────────────────────────────────────────────────────────

mod preset_tests {
    use zconvert_lib::presets::Preset;

    #[test]
    fn builtins_not_empty() {
        assert!(Preset::builtins().len() >= 4);
    }

    #[test]
    fn all_builtins_have_valid_quality() {
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
    fn builtin_web_optimized_strips_metadata() {
        let p = Preset::builtins()
            .into_iter()
            .find(|p| p.id == "web-optimized")
            .expect("web-optimized preset missing");
        assert!(p.strip_metadata);
    }

    #[test]
    fn builtin_lossless_copy_no_strip() {
        let p = Preset::builtins()
            .into_iter()
            .find(|p| p.id == "lossless-copy")
            .expect("lossless-copy preset missing");
        assert!(!p.strip_metadata);
    }
}

// ─── image conversion tests ───────────────────────────────────────────────────

mod image_conversion_tests {
    use super::*;
    use zconvert_lib::detect::Format;
    use tempfile::tempdir;

    #[tokio::test]
    async fn jpeg_to_png() {
        let dir = tempdir().unwrap();
        let input = make_jpeg(dir.path());
        let output = dir.path().join("out.png");
        let preset = make_preset(85, None, false, Format::Png);
        let args = conv_args(&input, &output, &Format::Png, &preset);
        zconvert_lib::converters::image::convert(args).await.unwrap();
        assert!(output.exists());
        let img = image::open(&output).unwrap();
        assert_eq!(img.width(), 4);
    }

    #[tokio::test]
    async fn jpeg_to_webp() {
        let dir = tempdir().unwrap();
        let input = make_jpeg(dir.path());
        let output = dir.path().join("out.webp");
        let preset = make_preset(85, None, false, Format::WebP);
        let args = conv_args(&input, &output, &Format::WebP, &preset);
        zconvert_lib::converters::image::convert(args).await.unwrap();
        assert!(output.exists());
    }

    #[tokio::test]
    async fn jpeg_to_bmp() {
        let dir = tempdir().unwrap();
        let input = make_jpeg(dir.path());
        let output = dir.path().join("out.bmp");
        let preset = make_preset(85, None, false, Format::Bmp);
        let args = conv_args(&input, &output, &Format::Bmp, &preset);
        zconvert_lib::converters::image::convert(args).await.unwrap();
        assert!(output.exists());
    }

    #[tokio::test]
    async fn jpeg_to_tiff() {
        let dir = tempdir().unwrap();
        let input = make_jpeg(dir.path());
        let output = dir.path().join("out.tiff");
        let preset = make_preset(85, None, false, Format::Tiff);
        let args = conv_args(&input, &output, &Format::Tiff, &preset);
        zconvert_lib::converters::image::convert(args).await.unwrap();
        assert!(output.exists());
    }

    #[tokio::test]
    async fn png_to_jpeg() {
        let dir = tempdir().unwrap();
        let input = make_png(dir.path());
        let output = dir.path().join("out.jpg");
        let preset = make_preset(85, None, false, Format::Jpeg);
        let args = conv_args(&input, &output, &Format::Jpeg, &preset);
        zconvert_lib::converters::image::convert(args).await.unwrap();
        assert!(output.exists());
        let img = image::open(&output).unwrap();
        assert_eq!(img.width(), 4);
    }

    #[tokio::test]
    async fn jpeg_with_max_dimension_resizes() {
        let dir = tempdir().unwrap();
        let input = make_jpeg(dir.path());
        let output = dir.path().join("out_small.png");
        let preset = make_preset(85, Some(2), false, Format::Png);
        let args = conv_args(&input, &output, &Format::Png, &preset);
        zconvert_lib::converters::image::convert(args).await.unwrap();
        assert!(output.exists());
        let img = image::open(&output).unwrap();
        assert!(img.width() <= 2 && img.height() <= 2);
    }

    #[tokio::test]
    async fn jpeg_full_quality() {
        let dir = tempdir().unwrap();
        let input = make_jpeg(dir.path());
        let output = dir.path().join("out_q100.jpg");
        let preset = make_preset(100, None, false, Format::Jpeg);
        let args = conv_args(&input, &output, &Format::Jpeg, &preset);
        zconvert_lib::converters::image::convert(args).await.unwrap();
        assert!(output.exists());
    }

    #[tokio::test]
    async fn jpeg_low_quality() {
        let dir = tempdir().unwrap();
        let input = make_jpeg(dir.path());
        let output = dir.path().join("out_q10.jpg");
        let preset = make_preset(10, None, false, Format::Jpeg);
        let args = conv_args(&input, &output, &Format::Jpeg, &preset);
        zconvert_lib::converters::image::convert(args).await.unwrap();
        assert!(output.exists());
    }

    #[tokio::test]
    async fn jpeg_strip_metadata() {
        let dir = tempdir().unwrap();
        let input = make_jpeg(dir.path());
        let output = dir.path().join("out_stripped.jpg");
        let preset = make_preset(85, None, true, Format::Jpeg);
        let args = conv_args(&input, &output, &Format::Jpeg, &preset);
        zconvert_lib::converters::image::convert(args).await.unwrap();
        assert!(output.exists());
    }

    #[tokio::test]
    async fn jpeg_no_strip_metadata() {
        let dir = tempdir().unwrap();
        let input = make_jpeg(dir.path());
        let output = dir.path().join("out_keep_meta.jpg");
        let preset = make_preset(85, None, false, Format::Jpeg);
        let args = conv_args(&input, &output, &Format::Jpeg, &preset);
        zconvert_lib::converters::image::convert(args).await.unwrap();
        assert!(output.exists());
    }

    #[tokio::test]
    async fn svg_to_png() {
        let dir = tempdir().unwrap();
        let input = make_svg(dir.path());
        let output = dir.path().join("out.png");
        let preset = make_preset(90, None, false, Format::Png);
        let args = conv_args(&input, &output, &Format::Png, &preset);
        zconvert_lib::converters::image::convert(args).await.unwrap();
        assert!(output.exists());
    }

    #[tokio::test]
    async fn svg_to_jpeg() {
        let dir = tempdir().unwrap();
        let input = make_svg(dir.path());
        let output = dir.path().join("out.jpg");
        let preset = make_preset(90, None, false, Format::Jpeg);
        let args = conv_args(&input, &output, &Format::Jpeg, &preset);
        zconvert_lib::converters::image::convert(args).await.unwrap();
        assert!(output.exists());
    }
}

// ─── data conversion tests ────────────────────────────────────────────────────

mod data_conversion_tests {
    use super::*;
    use zconvert_lib::detect::Format;
    use tempfile::tempdir;

    #[tokio::test]
    async fn csv_to_json_basic() {
        let dir = tempdir().unwrap();
        let input = make_csv(dir.path());
        let output = dir.path().join("out.json");
        let preset = make_preset(85, None, false, Format::Json);
        let args = conv_args(&input, &output, &Format::Json, &preset);
        zconvert_lib::converters::data::convert(args).await.unwrap();
        assert!(output.exists());
        let content = std::fs::read_to_string(&output).unwrap();
        let arr: serde_json::Value = serde_json::from_str(&content).unwrap();
        let arr = arr.as_array().expect("should be array");
        assert_eq!(arr.len(), 2);
        assert_eq!(arr[0]["name"], serde_json::Value::String("Alice".into()));
    }

    #[tokio::test]
    async fn json_to_csv_basic() {
        let dir = tempdir().unwrap();
        let input = make_json(dir.path());
        let output = dir.path().join("out.csv");
        let preset = make_preset(85, None, false, Format::Csv);
        let args = conv_args(&input, &output, &Format::Csv, &preset);
        zconvert_lib::converters::data::convert(args).await.unwrap();
        assert!(output.exists());
        let content = std::fs::read_to_string(&output).unwrap();
        let lines: Vec<&str> = content.lines().collect();
        // header + 2 data rows
        assert!(lines.len() >= 3, "expected at least 3 lines, got {}", lines.len());
        let header = lines[0];
        assert!(header.contains("name"), "header missing 'name': {header}");
        assert!(header.contains("age"),  "header missing 'age': {header}");
        assert!(header.contains("city"), "header missing 'city': {header}");
    }

    #[tokio::test]
    async fn csv_to_json_preserves_all_columns() {
        let dir = tempdir().unwrap();
        let input = make_csv(dir.path());
        let output = dir.path().join("out.json");
        let preset = make_preset(85, None, false, Format::Json);
        let args = conv_args(&input, &output, &Format::Json, &preset);
        zconvert_lib::converters::data::convert(args).await.unwrap();
        let content = std::fs::read_to_string(&output).unwrap();
        let arr: serde_json::Value = serde_json::from_str(&content).unwrap();
        let obj = arr[0].as_object().expect("first element should be object");
        assert!(obj.contains_key("name"));
        assert!(obj.contains_key("age"));
        assert!(obj.contains_key("city"));
    }

    #[tokio::test]
    async fn json_to_csv_roundtrip() {
        let dir = tempdir().unwrap();
        let input = make_json(dir.path());
        // JSON → CSV
        let csv_out = dir.path().join("roundtrip.csv");
        let preset = make_preset(85, None, false, Format::Csv);
        let args = conv_args(&input, &csv_out, &Format::Csv, &preset);
        zconvert_lib::converters::data::convert(args).await.unwrap();
        // CSV → JSON
        let json_out = dir.path().join("roundtrip.json");
        let preset2 = make_preset(85, None, false, Format::Json);
        let args2 = conv_args(&csv_out, &json_out, &Format::Json, &preset2);
        zconvert_lib::converters::data::convert(args2).await.unwrap();
        let content = std::fs::read_to_string(&json_out).unwrap();
        let arr: serde_json::Value = serde_json::from_str(&content).unwrap();
        let arr = arr.as_array().unwrap();
        assert_eq!(arr.len(), 2);
        // Each record should have 3 keys (name, age, city)
        assert_eq!(arr[0].as_object().unwrap().len(), 3);
    }

    #[tokio::test]
    async fn csv_to_json_various_quality_settings() {
        let dir = tempdir().unwrap();
        for quality in [10u8, 50, 100] {
            let input = make_csv(dir.path()); // same file each time
            let output = dir.path().join(format!("out_q{quality}.json"));
            let preset = make_preset(quality, None, false, Format::Json);
            let args = conv_args(&input, &output, &Format::Json, &preset);
            zconvert_lib::converters::data::convert(args).await.unwrap();
            let content = std::fs::read_to_string(&output).unwrap();
            let arr: serde_json::Value = serde_json::from_str(&content).unwrap();
            assert_eq!(
                arr.as_array().unwrap().len(),
                2,
                "quality={quality} produced wrong element count"
            );
        }
    }
}

// ─── magic bytes tests ────────────────────────────────────────────────────────

mod detect_magic_bytes_tests {
    use zconvert_lib::detect::{detect, Format};
    use tempfile::tempdir;

    #[test]
    fn jpeg_magic_bytes() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("noext");
        // JFIF-style JPEG header
        let mut data = vec![0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10];
        data.extend_from_slice(b"JFIF\x00");
        data.resize(512, 0x00);
        std::fs::write(&p, &data).unwrap();
        assert_eq!(detect(&p).unwrap(), Format::Jpeg);
    }

    #[test]
    fn png_magic_bytes() {
        let dir = tempdir().unwrap();
        let p = dir.path().join("noext");
        let mut data = vec![0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        data.resize(512, 0x00);
        std::fs::write(&p, &data).unwrap();
        assert_eq!(detect(&p).unwrap(), Format::Png);
    }
}
