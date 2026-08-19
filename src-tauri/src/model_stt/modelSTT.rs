use super::save ;
use ct2rs::{Whisper, WhisperOptions};
use ct2rs::sys::{Config, Device, ComputeType};
use std::sync::Mutex;
use std::path::Path;
use crate::audio::loader::AudioData;

pub struct STTEngine {
    // Mutex protégeant l'instance Whisper pour accès thread-safe
    model: Mutex<Whisper>,
}

impl STTEngine {
    /// Initialise un moteur Whisper (ct2rs) à partir du dossier `model_path`.
    pub fn new(model_path: &str) -> Result<Self, String> {
        // Configuration CPU par défaut
        let config = Config {
            device: Device::CPU,
            compute_type: ComputeType::DEFAULT,
            ..Default::default()
        };

        let path = Path::new(model_path);
        let whisper = Whisper::new(&path, config)
            .map_err(|e| format!("Erreur lors du chargement du modèle Whisper : {}", e))?;

        Ok(Self {
            model: Mutex::new(whisper),
        })
    }

    /// Transcrit `audio_data` en texte avec ct2rs et sauvegarde un fichier JSON unique.
    pub fn transcribe(&self, audio_data: &AudioData) -> Result<String, String> {
        // Vérification simple du format attendu
        if audio_data.sample_rate != 16000 || audio_data.channels != 1 {
            return Err("Format audio invalide : le modèle Whisper attend du 16kHz Mono.".to_string());
        }

        let mut model = self.model.lock()
            .map_err(|_| "Erreur d'accès au Mutex Whisper (lock empoisonné)".to_string())?;

        let options = WhisperOptions::default();
        let language: Option<&str> = None;
        let is_translation = false;

        // Exécute la génération/transcription
        let segments = model.generate(&audio_data.samples, language, is_translation, &options)
            .map_err(|e| format!("Erreur lors de la génération de la transcription : {}", e))?;

        // Concatène les segments en un seul texte
        let mut full_text = String::new();
        for seg in segments {
            full_text.push_str(&format!("{}\n", seg));
        }

        // Sauvegarde la transcription en JSON dans storage/transcription
        // save::save_transcription(&full_text)
        //     .map_err(|e| format!("Erreur sauvegarde transcription : {}", e))?;

        Ok(full_text)
    }
}
