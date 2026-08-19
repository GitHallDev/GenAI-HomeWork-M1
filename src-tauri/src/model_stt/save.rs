use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

use serde_json::Value;

/// Sauvegarde la transcription et l'objet résumé (JSON) dans un seul fichier.
pub fn save_transcription_with_resume(text: &str, resume: &Value) -> Result<String, String> {
    let dir = PathBuf::from("storage/transcription");
    fs::create_dir_all(&dir).map_err(|e| format!("Erreur création dossier: {}", e))?;

    let ts = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Erreur horodatage: {}", e))?
        .as_secs();

    let filename = format!("transcription_{}.json", ts);
    let path = dir.join(&filename);

    let data = serde_json::json!({
        "transcript": text,
        "resume": resume,
        "created_at": ts,
    });

    let json = serde_json::to_string_pretty(&data).map_err(|e| format!("Erreur sérialisation JSON: {}", e))?;

    let mut file = fs::File::create(&path).map_err(|e| format!("Erreur création fichier: {}", e))?;
    file.write_all(json.as_bytes()).map_err(|e| format!("Erreur écriture fichier: {}", e))?;

    Ok(path.to_string_lossy().into_owned())
}

/// Retourne toutes les transcriptions sauvegardées comme un tableau JSON.
pub fn list_transcriptions() -> Result<serde_json::Value, String> {
    let dir = PathBuf::from("storage/transcription");
    if !dir.exists() {
        return Ok(serde_json::json!([]));
    }

    let mut items = Vec::new();

    let entries = fs::read_dir(&dir).map_err(|e| format!("Erreur lecture dossier: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("Erreur lecture entrée: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            if let Ok(contents) = fs::read_to_string(&path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&contents) {
                    items.push(json);
                }
            }
        }
    }

    Ok(serde_json::Value::Array(items))
}

/// Supprime la transcription identifiée par `created_at` (timestamp Unix).
/// Renvoie `Ok(true)` si supprimé, `Ok(false)` si non trouvé.
pub fn delete_transcription_by_created_at(created_at: u64) -> Result<bool, String> {
    let dir = PathBuf::from("storage/transcription");
    if !dir.exists() {
        return Ok(false);
    }

    // Première tentative: supprimer le fichier par nom conventionnel
    let filename = format!("transcription_{}.json", created_at);
    let candidate = dir.join(&filename);
    if candidate.exists() {
        fs::remove_file(&candidate).map_err(|e| format!("Erreur suppression fichier: {}", e))?;
        return Ok(true);
    }

    // Sinon, parcourir les fichiers et comparer le champ created_at
    let entries = fs::read_dir(&dir).map_err(|e| format!("Erreur lecture dossier: {}", e))?;
    for entry in entries {
        let entry = entry.map_err(|e| format!("Erreur lecture entrée: {}", e))?;
        let path = entry.path();
        if path.is_file() {
            if let Ok(contents) = fs::read_to_string(&path) {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(&contents) {
                    if let Some(ts_val) = json.get("created_at") {
                        if ts_val.as_u64() == Some(created_at) {
                            fs::remove_file(&path).map_err(|e| format!("Erreur suppression fichier: {}", e))?;
                            return Ok(true);
                        }
                    }
                }
            }
        }
    }

    Ok(false)
}
