// src/audio/recorder.rs
use cpal::traits::{StreamTrait, DeviceTrait, HostTrait};
use std::sync::{Arc, Mutex};
use std::sync::atomic::{AtomicBool, Ordering};

pub struct RecordingState {
    // Le flux audio (Stream) doit etre conserve pour que l'enregistrement continue.
    // On le met dans un Option car au debut, il n'y a pas de flux.
    pub stream:Option<cpal::Stream>,

    // UN booleen atomique est parfait pour verifier l'etat depuis n'importe quel thread
    // sans avoir besoin de verouiller un Mutex (tres rapide)
    pub is_recording: Arc<AtomicBool>,

    // Le buffer partage: Arc pour le partage, Mutex pour la modification securisee.
    // On stocke des f32, car c'est le format standard de capture de cpal.
    pub audio_buffer: Arc<Mutex<Vec<f32>>>,

    // Frequence d'origine des micros
    pub sample_rate: u32,
}

impl RecordingState {
    pub fn new()-> Self {
        Self{
            stream:None,
            is_recording: Arc::new(AtomicBool::new(false)),
            audio_buffer: Arc::new(Mutex::new(Vec::new())),
            sample_rate: 16000,
        }
    }


    // Fcontion pour lancer le flux d'enregistrement audio
    pub fn start_recording(&mut self)-> Result<(),String> {
        // 0. On recupere le micro et la config via notre fonction precedente
        let (device, config) = get_default_microphone()?;

        // 1. On  memorise la frequence reelle (exp; 44100)
        self.sample_rate = config.sample_rate();

        // On  s'assure que le buffer est vide avant de commencer
        let mut buffer = self.audio_buffer.lock().map_err(|_| "Erreur Mutex")?;
        buffer.clear();
        drop(buffer); // On libere le verrou pour que le callback puisse l'utiliser

        // 2. On prepare les clones pour la callback (necessaire pour le multithreading)
        let buffer_clone = Arc::clone(&self.audio_buffer);
        let is_recording_clone = Arc::clone(&self.is_recording);

        is_recording_clone.store(true, Ordering::SeqCst);

        // 3. Construction du flux (Stream)
        let stream = device.build_input_stream(
            &config.into(),
            move |data: &[f32],_: &cpal::InputCallbackInfo| {
                // Cette partie s'execute dans un thread audio haute propriete
                if is_recording_clone.load(Ordering::SeqCst){
                    if let Ok(mut b) = buffer_clone.lock(){
                        b.extend_from_slice(data);
                    }
                }
            },
            |err| eprintln!("Erreur de flux : {}",err),
            None
        ).map_err(|e| e.to_string())?;

        // 4. On lance le flux  et on le stocke pour qu'il ne soit pas detruit
        stream.play().map_err(|e| e.to_string())?;
        self.stream = Some(stream);

        Ok(())
    }

    pub fn stop_recording(&mut self){
        self.is_recording.store(false, Ordering::SeqCst);
        self.stream = None; // Cela "drop" le stream et coupe le micro proprementf
    }
}


// Fonction pour recuperer le micro par defaut de l'OS
pub fn get_default_microphone()->Result<(cpal::Device, cpal::SupportedStreamConfig),String>{
    // 1. On recupere l'hote (Windows, Mac: Core Audio, Linux: ALSA/Pulse)
    let host = cpal::default_host();

    // 2. On cherche le peripherique par defaut
    let device = host.default_input_device()
        .ok_or("Aucun peripherique d'entree detecte.")?;

    // 3. On recupere la configuration par defaut du micro
    let config = device.supported_input_configs()
        .map_err(|e| format!("Erreur lors de la lecture de la config : {}",e))?
        .find(|c| c.min_sample_rate() <= 16000 && c.max_sample_rate() >= 16000)
        // 2. Si pas trouvé, on fige la config sur le 16kHz (le resampler gérera la suite)
        .map(|c| c.with_sample_rate(16000))
        // 3. Sinon, on prend la config par défaut du système (Fallback)
        .unwrap_or_else(|| device.default_input_config().expect("Erreur config par défaut"));

    Ok((device, config))
}