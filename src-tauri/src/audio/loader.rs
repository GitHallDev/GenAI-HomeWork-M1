// src/audio/loader.rs
use std::path::Path;

pub struct AudioData {
    pub samples: Vec<f32>,
    pub sample_rate: u32,
    pub channels: u16,
}

pub fn load_wav_file<P: AsRef<Path>>(path: P) -> Result<AudioData, String> {
    let mut reader = hound::WavReader::open(path)
        .map_err(|e| format!("Impossible d'ouvrir le fichier WAV : {}", e))?;
    
    let spec = reader.spec();
    
    // Extraction et conversion des échantillons en f32 (Requis par la plupart des modèles IA)
    let samples: Vec<f32> = match spec.sample_format {
        hound::SampleFormat::Int => {
            reader.samples::<i16>()
                .map(|s| s.unwrap() as f32 / i16::MAX as f32)
                .collect()
        },
        hound::SampleFormat::Float => {
            reader.samples::<f32>()
                .map(|s| s.unwrap())
                .collect()
        }
    };

    Ok(AudioData {
        samples,
        sample_rate: spec.sample_rate,
        channels: spec.channels,
    })
}