use std::path::Path;
use crate::error::AppError;

pub fn strip_image_exif(path: &Path) -> Result<(), AppError> {
    use little_exif::metadata::Metadata;

    let cleared = Metadata::new();
    cleared
        .write_to_file(path)
        .map_err(|e| AppError::MetadataStrip(e.to_string()))?;

    Ok(())
}

pub fn strip_pdf_metadata(path: &Path) -> Result<(), AppError> {
    use lopdf::{Document, Object};

    let mut doc = Document::load(path)
        .map_err(|e| AppError::MetadataStrip(e.to_string()))?;


    let info_id = doc
        .trailer
        .get(b"Info")
        .ok()
        .and_then(|obj| obj.as_reference().ok());

    if let Some(id) = info_id {
        if let Some(entry) = doc.objects.get_mut(&id) {
            *entry = Object::Dictionary(lopdf::Dictionary::new());
        }
    }


    let xmp_ids: Vec<_> = doc
        .objects
        .iter()
        .filter_map(|(id, obj)| {
            let stream = obj.as_stream().ok()?;
            let type_name = stream.dict.get(b"Type").ok()?.as_name_str().ok()?;
            if type_name == "Metadata" { Some(*id) } else { None }
        })
        .collect();

    for id in xmp_ids {
        doc.objects.remove(&id);
    }

    doc.save(path)
        .map_err(|e| AppError::MetadataStrip(e.to_string()))?;

    Ok(())
}
