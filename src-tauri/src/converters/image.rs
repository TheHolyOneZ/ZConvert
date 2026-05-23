use std::path::PathBuf;
use image::{DynamicImage, ImageFormat};
use crate::converters::ConvertArgs;
use crate::detect::Format;
use crate::error::AppError;

pub async fn convert(args: ConvertArgs<'_>) -> Result<PathBuf, AppError> {
    let detected = crate::detect::detect(args.input)?;

    let img = match detected {
        Format::Heic => decode_heic(args.input)?,
        Format::Raw => decode_raw(args.input)?,
        Format::Svg => decode_svg(args.input)?,
        _ => image::open(args.input)?,
    };

    let img = apply_max_dimension(img, args.preset.max_dimension);

    encode_image(img, args.output, args.target_format, args.preset.quality)?;

    if args.preset.strip_metadata {
        let _ = crate::converters::metadata::strip_image_exif(args.output);
    }

    Ok(args.output.to_path_buf())
}

fn apply_max_dimension(img: DynamicImage, max_dim: Option<u32>) -> DynamicImage {
    let Some(max) = max_dim else { return img };
    let (w, h) = (img.width(), img.height());
    if w <= max && h <= max {
        return img;
    }
    img.resize(max, max, image::imageops::FilterType::Lanczos3)
}

fn encode_image(
    img: DynamicImage,
    output: &std::path::Path,
    fmt: &Format,
    quality: u8,
) -> Result<(), AppError> {
    match fmt {
        Format::Jpeg => {
            let encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(
                std::fs::File::create(output)?,
                quality,
            );
            img.write_with_encoder(encoder)?;
        }
        Format::Png => img.save_with_format(output, ImageFormat::Png)?,
        Format::WebP => img.save_with_format(output, ImageFormat::WebP)?,
        Format::Tiff => img.save_with_format(output, ImageFormat::Tiff)?,
        Format::Bmp => img.save_with_format(output, ImageFormat::Bmp)?,
        Format::Avif => encode_avif(img, output, quality)?,
        _ => {
            return Err(AppError::UnsupportedConversion {
                from: "image".into(),
                to: fmt.display_name().to_string(),
            })
        }
    }
    Ok(())
}

fn encode_avif(img: DynamicImage, output: &std::path::Path, quality: u8) -> Result<(), AppError> {
    use ravif::{Encoder, Img};
    use rgb::AsPixels;

    let rgba = img.to_rgba8();
    let (w, h) = (rgba.width() as usize, rgba.height() as usize);
    let pixels: &[rgb::RGBA8] = rgba.as_raw().as_pixels();
    let img_data = Img::new(pixels, w, h);

    let result = Encoder::new()
        .with_quality(quality as f32)
        .with_speed(4)
        .encode_rgba(img_data)
        .map_err(|e| AppError::ConversionFailed(e.to_string()))?;

    std::fs::write(output, result.avif_file)?;
    Ok(())
}

fn decode_heic(path: &std::path::Path) -> Result<DynamicImage, AppError> {
    use libheif_rs::{ColorSpace, HeifContext, LibHeif, RgbChroma};

    let lib = LibHeif::new();
    let ctx = HeifContext::read_from_file(&path.to_string_lossy())
        .map_err(|e| AppError::ConversionFailed(format!("HEIC context: {e}")))?;
    let handle = ctx
        .primary_image_handle()
        .map_err(|e| AppError::ConversionFailed(format!("HEIC handle: {e}")))?;

    let image = lib
        .decode(&handle, ColorSpace::Rgb(RgbChroma::Rgb), None)
        .map_err(|e| AppError::ConversionFailed(format!("HEIC decode: {e}")))?;

    let w = image.width();
    let h = image.height();
    let plane = image
        .planes()
        .interleaved
        .ok_or_else(|| AppError::ConversionFailed("HEIC: no interleaved plane".into()))?;

    let raw_bytes = plane.data.to_vec();
    let rgb = image::RgbImage::from_raw(w, h, raw_bytes)
        .ok_or_else(|| AppError::ConversionFailed("HEIC: buffer size mismatch".into()))?;
    Ok(DynamicImage::ImageRgb8(rgb))
}

fn decode_raw(path: &std::path::Path) -> Result<DynamicImage, AppError> {
    use rawler::decoders::RawDecodeParams;
    use rawler::get_decoder;
    use rawler::rawimage::RawImageData;
    use rawler::RawFile;

    let file = std::fs::File::open(path)?;
    let mut rawfile = RawFile::new(path, file);
    let decoder = get_decoder(&mut rawfile)
        .map_err(|e| AppError::ConversionFailed(format!("RAW decoder: {e}")))?;

    let raw = decoder
        .raw_image(&mut rawfile, RawDecodeParams::default(), false)
        .map_err(|e| AppError::ConversionFailed(format!("RAW decode: {e}")))?;

    let w = raw.width as u32;
    let h = raw.height as u32;


    let buf_u8: Vec<u8> = match &raw.data {
        RawImageData::Integer(pixels) => {
            let max_val = *pixels.iter().max().unwrap_or(&1) as f32;
            pixels.iter().map(|&p| ((p as f32 / max_val) * 255.0) as u8).collect()
        }
        RawImageData::Float(pixels) => {
            let max_val = pixels.iter().cloned().fold(f32::NEG_INFINITY, f32::max).max(1.0);
            pixels.iter().map(|&p| ((p / max_val) * 255.0) as u8).collect()
        }
    };

    let gray = image::GrayImage::from_raw(w, h, buf_u8)
        .ok_or_else(|| AppError::ConversionFailed("RAW: buffer size mismatch".into()))?;
    Ok(DynamicImage::ImageLuma8(gray))
}

fn decode_svg(path: &std::path::Path) -> Result<DynamicImage, AppError> {
    let svg_data = std::fs::read_to_string(path)?;
    let opt = usvg::Options::default();
    let tree = usvg::Tree::from_str(&svg_data, &opt)
        .map_err(|e| AppError::ConversionFailed(format!("SVG parse: {e}")))?;

    let size = tree.size();
    let w = size.width() as u32;
    let h = size.height() as u32;

    let mut pixmap = tiny_skia::Pixmap::new(w, h)
        .ok_or_else(|| AppError::ConversionFailed("SVG: failed to create pixmap".into()))?;

    resvg::render(&tree, tiny_skia::Transform::default(), &mut pixmap.as_mut());

    let rgba_img = image::RgbaImage::from_raw(w, h, pixmap.data().to_vec())
        .ok_or_else(|| AppError::ConversionFailed("SVG: pixmap buffer mismatch".into()))?;

    Ok(DynamicImage::ImageRgba8(rgba_img))
}
