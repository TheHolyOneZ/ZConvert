use std::path::PathBuf;
use crate::converters::ConvertArgs;
use crate::detect::Format;
use crate::error::AppError;

pub async fn convert(args: ConvertArgs<'_>) -> Result<PathBuf, AppError> {
    let detected = crate::detect::detect(args.input)?;

    match (&detected, args.target_format) {
        (Format::Csv, Format::Json) => csv_to_json(args),
        (Format::Json, Format::Csv) => json_to_csv(args),
        _ => Err(AppError::UnsupportedConversion {
            from: detected.display_name().to_string(),
            to: args.target_format.display_name().to_string(),
        }),
    }
}

fn csv_to_json(args: ConvertArgs<'_>) -> Result<PathBuf, AppError> {
    let mut rdr = csv::Reader::from_path(args.input)
        .map_err(|e| AppError::ConversionFailed(e.to_string()))?;

    let headers: Vec<String> = rdr
        .headers()
        .map_err(|e| AppError::ConversionFailed(e.to_string()))?
        .iter()
        .map(|h| h.to_string())
        .collect();

    let mut records = Vec::new();
    for result in rdr.records() {
        let record = result.map_err(|e| AppError::ConversionFailed(e.to_string()))?;
        let obj: serde_json::Map<String, serde_json::Value> = headers
            .iter()
            .zip(record.iter())
            .map(|(k, v)| (k.clone(), serde_json::Value::String(v.to_string())))
            .collect();
        records.push(serde_json::Value::Object(obj));
    }

    let json = serde_json::to_string_pretty(&records)
        .map_err(|e| AppError::ConversionFailed(e.to_string()))?;

    std::fs::write(args.output, json)?;
    Ok(args.output.to_path_buf())
}

fn json_to_csv(args: ConvertArgs<'_>) -> Result<PathBuf, AppError> {
    let content = std::fs::read_to_string(args.input)?;
    let values: Vec<serde_json::Value> = serde_json::from_str(&content)
        .map_err(|e| AppError::ConversionFailed(format!("JSON parse: {e}")))?;

    let mut wtr = csv::Writer::from_path(args.output)
        .map_err(|e| AppError::ConversionFailed(e.to_string()))?;

    if let Some(first) = values.first() {
        if let Some(obj) = first.as_object() {
            let headers: Vec<&str> = obj.keys().map(|k| k.as_str()).collect();
            wtr.write_record(&headers)
                .map_err(|e| AppError::ConversionFailed(e.to_string()))?;

            for val in &values {
                if let Some(obj) = val.as_object() {
                    let row: Vec<String> = headers
                        .iter()
                        .map(|k| {
                            obj.get(*k)
                                .map(|v| match v {
                                    serde_json::Value::String(s) => s.clone(),
                                    other => other.to_string(),
                                })
                                .unwrap_or_default()
                        })
                        .collect();
                    wtr.write_record(&row)
                        .map_err(|e| AppError::ConversionFailed(e.to_string()))?;
                }
            }
        }
    }

    wtr.flush().map_err(|e| AppError::ConversionFailed(e.to_string()))?;
    Ok(args.output.to_path_buf())
}
