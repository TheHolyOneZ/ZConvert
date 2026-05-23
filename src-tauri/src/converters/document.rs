use std::path::PathBuf;
use tauri::AppHandle;
use crate::converters::ConvertArgs;
use crate::detect::Format;
use crate::error::AppError;
use crate::sidecar;

pub async fn convert(app: &AppHandle, args: ConvertArgs<'_>) -> Result<PathBuf, AppError> {
    let detected = crate::detect::detect(args.input)?;


    match (&detected, args.target_format) {
        (Format::Markdown, Format::Html) => return markdown_to_html(args),
        (Format::Markdown, Format::Txt)  => return markdown_to_txt(args),
        (Format::Csv, Format::Json) | (Format::Json, Format::Csv) => {
            return crate::converters::data::convert(args).await;
        }
        (Format::Xlsx | Format::Xls, Format::Csv) => return spreadsheet_to_csv(args),
        (Format::Xlsx | Format::Xls, Format::Json) => return spreadsheet_to_json(args),
        _ => {}
    }


    let pandoc_formats = [
        Format::Markdown,
        Format::Html,
        Format::Docx,
        Format::Odt,
        Format::Epub,
        Format::Txt,
        Format::Pdf,
    ];
    let is_pandoc_target = pandoc_formats.contains(args.target_format);
    let is_pandoc_source = pandoc_formats.contains(&detected);

    if is_pandoc_source && is_pandoc_target {
        return pandoc_convert(app, args, &detected).await;
    }


    soffice_convert(app, args).await
}

async fn pandoc_convert(
    app: &AppHandle,
    args: ConvertArgs<'_>,
    detected: &Format,
) -> Result<PathBuf, AppError> {
    let from_fmt = pandoc_fmt_name(detected);
    let to_fmt = pandoc_fmt_name(args.target_format);

    sidecar::pandoc(
        app,
        &[
            "-f", from_fmt,
            "-t", to_fmt,
            "-o", &args.output.to_string_lossy(),
            &args.input.to_string_lossy(),
        ],
    )
    .await?;

    if args.preset.strip_metadata {
        strip_doc_metadata(args.output, args.target_format);
    }

    Ok(args.output.to_path_buf())
}

async fn soffice_convert(app: &AppHandle, args: ConvertArgs<'_>) -> Result<PathBuf, AppError> {
    let out_dir = args
        .output
        .parent()
        .ok_or_else(|| AppError::ConversionFailed("No parent dir".into()))?;

    let result = sidecar::soffice_convert(
        app,
        args.input,
        args.target_format.extension(),
        out_dir,
    )
    .await?;


    if result != args.output {
        std::fs::rename(&result, args.output)?;
    }

    if args.preset.strip_metadata {
        strip_doc_metadata(args.output, args.target_format);
    }

    Ok(args.output.to_path_buf())
}

fn markdown_to_html(args: ConvertArgs<'_>) -> Result<PathBuf, AppError> {
    let md = std::fs::read_to_string(args.input)?;
    let parser = pulldown_cmark::Parser::new(&md);
    let mut html = String::new();
    pulldown_cmark::html::push_html(&mut html, parser);

    let full_html = format!(
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body>{}</body></html>",
        html
    );
    std::fs::write(args.output, full_html)?;
    Ok(args.output.to_path_buf())
}

fn markdown_to_txt(args: ConvertArgs<'_>) -> Result<PathBuf, AppError> {
    use pulldown_cmark::{Event, Options, Parser, Tag, TagEnd};

    let md = std::fs::read_to_string(args.input)?;
    let parser = Parser::new_ext(&md, Options::empty());
    let mut out = String::new();

    for event in parser {
        match event {
            Event::Text(t) | Event::Code(t) => out.push_str(&t),
            Event::SoftBreak => out.push(' '),
            Event::HardBreak => out.push('\n'),
            Event::Start(Tag::Item) => out.push_str("• "),
            Event::End(TagEnd::Paragraph) => out.push_str("\n\n"),
            Event::End(TagEnd::Heading(_)) => out.push_str("\n\n"),
            Event::End(TagEnd::Item) => out.push('\n'),
            Event::End(TagEnd::CodeBlock) => out.push('\n'),
            Event::Rule => out.push_str("\n---\n\n"),
            _ => {}
        }
    }

    std::fs::write(args.output, out.trim_end())?;
    Ok(args.output.to_path_buf())
}

fn spreadsheet_to_csv(args: ConvertArgs<'_>) -> Result<PathBuf, AppError> {
    use calamine::{Reader, open_workbook_auto};

    let mut workbook = open_workbook_auto(args.input)
        .map_err(|e| AppError::ConversionFailed(e.to_string()))?;

    let sheet_names = workbook.sheet_names().to_vec();
    let first_sheet = sheet_names
        .first()
        .ok_or_else(|| AppError::ConversionFailed("No sheets found".into()))?
        .clone();

    let range = workbook
        .worksheet_range(&first_sheet)
        .map_err(|e| AppError::ConversionFailed(e.to_string()))?;

    let mut wtr = csv::Writer::from_path(args.output)
        .map_err(|e| AppError::ConversionFailed(e.to_string()))?;

    for row in range.rows() {
        let cells: Vec<String> = row
            .iter()
            .map(|c| c.to_string())
            .collect();
        wtr.write_record(&cells)
            .map_err(|e| AppError::ConversionFailed(e.to_string()))?;
    }
    wtr.flush().map_err(|e| AppError::ConversionFailed(e.to_string()))?;
    Ok(args.output.to_path_buf())
}

fn spreadsheet_to_json(args: ConvertArgs<'_>) -> Result<PathBuf, AppError> {
    use calamine::{Reader, open_workbook_auto, Data};

    let mut workbook = open_workbook_auto(args.input)
        .map_err(|e| AppError::ConversionFailed(e.to_string()))?;

    let sheet_names = workbook.sheet_names().to_vec();
    let first_sheet = sheet_names
        .first()
        .ok_or_else(|| AppError::ConversionFailed("No sheets found".into()))?
        .clone();

    let range = workbook
        .worksheet_range(&first_sheet)
        .map_err(|e| AppError::ConversionFailed(e.to_string()))?;

    let mut rows = range.rows();
    let headers: Vec<String> = rows
        .next()
        .map(|r| r.iter().map(|c| c.to_string()).collect())
        .unwrap_or_default();

    let records: Vec<serde_json::Value> = rows
        .map(|row| {
            let obj: serde_json::Map<String, serde_json::Value> = headers
                .iter()
                .zip(row.iter())
                .map(|(k, v)| {
                    let json_val = match v {
                        Data::Int(i) => serde_json::Value::Number((*i).into()),
                        Data::Float(f) => serde_json::json!(f),
                        Data::Bool(b) => serde_json::Value::Bool(*b),
                        other => serde_json::Value::String(other.to_string()),
                    };
                    (k.clone(), json_val)
                })
                .collect();
            serde_json::Value::Object(obj)
        })
        .collect();

    let json = serde_json::to_string_pretty(&records)
        .map_err(|e| AppError::ConversionFailed(e.to_string()))?;
    std::fs::write(args.output, json)?;
    Ok(args.output.to_path_buf())
}

fn strip_doc_metadata(path: &std::path::Path, fmt: &Format) {
    if *fmt == Format::Pdf {
        let _ = crate::converters::metadata::strip_pdf_metadata(path);
    }
}

fn pandoc_fmt_name(fmt: &Format) -> &'static str {
    match fmt {
        Format::Markdown => "markdown",
        Format::Html => "html",
        Format::Docx => "docx",
        Format::Odt => "odt",
        Format::Epub => "epub",
        Format::Txt => "plain",
        Format::Pdf => "pdf",
        _ => "plain",
    }
}
