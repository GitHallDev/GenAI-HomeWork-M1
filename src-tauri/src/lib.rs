// src/lib.rs
mod audio;
mod model_stt;
mod llm;


use crate::model_stt::modelSTT::STTEngine;

use crate::audio::recorder::RecordingState;
use crate::audio::utils::process_and_save_audio;
use std::sync::Mutex;
use tauri::State;

// On enveloppe RecordingState dans un Mutex pour permettre la modification sécurisée
pub struct AppState{
    pub recorder: Mutex<RecordingState>,
    pub sttModel: Mutex<STTEngine>,
}

#[tauri::command]
async fn start_capture (state: State<'_,AppState>)->Result<String, String>{
  println!(" Dans la fonction start_capture !");
    let mut recorder = state.recorder.lock()
        .map_err(|_| "Impossible de verrouiller le moicro")?;

    // On lance l'enregistrement (utilise la fonction dans recorder.rs)
    recorder.start_recording()?;

    Ok("Enregistrement en cours...".to_string())
}

#[tauri::command]
async fn stop_capture (state : State<'_,AppState>)->Result<String, String>{
    let mut recorder = state.recorder.lock().map_err(|e| "Erreur d'accces au micro")?;

  println!(" Dans la fonction stop_capture !");

    // 1. On arrete d'abord (libere  le stream et met is_recording a false)
    recorder.stop_recording();

    // 2. On recupere la frequence memorisee
    let source_rate = recorder.sample_rate;

    // 3. on extrait les donnees
    let samples: Vec<f32    > = {
        let mut buffer = recorder.audio_buffer.lock().map_err(|e| e.to_string())?;
        std::mem::take(&mut *buffer)
    };

    if samples.is_empty() {
        return Err("Aucun son capture".into())
    }

    // 4. On traite pour l'IA
    let path = "output.wav";
    process_and_save_audio(&samples, source_rate, path)?;

    Ok(path.into())

}

#[tauri::command]
async fn get_is_recording(state: State<'_, AppState>) -> Result<bool, String> {
    let recorder = state.recorder.lock().map_err(|_| "Erreur d'accès à l'état")?;
    let is_recording = recorder.is_recording.load(std::sync::atomic::Ordering::SeqCst);
    Ok(is_recording)
}

#[tauri::command]
async fn transcribe_audio_file(state: tauri::State<'_, AppState>,path: String) -> Result<String, String> {
  println!(" Dans la fonction de transcription !");

    let path = match path {
        p if !p.is_empty() => p,
        _ => "./output.wav".to_string(),
    };
    // 1. Charger les données audio à partir du fichier WAV
    let audio_data = audio::loader::load_wav_file(&path)?;

    // 2. Passer les données au moteur Parakeet pour la transcription
    let text = state.sttModel.lock()
        .map_err(|_| "Erreur d'accès au moteur Parakeet")?
        .transcribe(&audio_data)?;
        
    Ok(text)
}

#[tauri::command]
async fn save_uploaded_wav(b64: String) -> Result<String, String> {
    // Decode base64 and write to output.wav
    match base64::decode(&b64) {
        Ok(bytes) => {
            use std::fs::File;
            use std::io::Write;
            let mut f = File::create("output.wav").map_err(|e| format!("Erreur création fichier: {}", e))?;
            f.write_all(&bytes).map_err(|e| format!("Erreur écriture fichier: {}", e))?;
            Ok("./output.wav".to_string())
        }
        Err(e) => Err(format!("Erreur décodage base64: {}", e)),
    }
}

#[tauri::command]
async fn save_transcription_file(transcript: String, resume: serde_json::Value) -> Result<String, String> {
    crate::model_stt::save::save_transcription_with_resume(&transcript, &resume)
}

#[tauri::command]
async fn get_saved_transcriptions() -> Result<serde_json::Value, String> {
    crate::model_stt::save::list_transcriptions()
}

#[tauri::command]
async fn delete_saved_transcription(created_at: u64) -> Result<bool, String> {
    crate::model_stt::save::delete_transcription_by_created_at(created_at)
}

#[tauri::command]
async fn get_local_ollama_models() -> Result<Vec<crate::llm::ollama::OllamaModel>, String> {
    crate::llm::ollama::get_local_ollama_models().await
}

#[tauri::command]
async fn summarize_text_with_ollama(model_name: String, text: String) -> Result<crate::llm::ollama::SummaryResult, String> {
        println!("Modèle sélectionné pour résumé : {}", model_name);
    println!("Texte à résumer : {}", text);
    crate::llm::ollama::summarize_text_with_ollama(&model_name, &text).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .manage(AppState { // On passe bien la structure AppState
        recorder: Mutex::new(RecordingState::new()),
        sttModel: Mutex::new(STTEngine::new("./model/faster-whisper-large-v3-turbo-ct2").expect("Erreur de chargement du modèle STT")),
    })
    .invoke_handler(tauri::generate_handler![
        // Mes futures commandes icc (start_record, etc)
        start_capture,
        stop_capture,
        get_is_recording,
        transcribe_audio_file,
        save_uploaded_wav,
        save_transcription_file,
        get_saved_transcriptions,
        delete_saved_transcription,
        get_local_ollama_models,
        summarize_text_with_ollama
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

