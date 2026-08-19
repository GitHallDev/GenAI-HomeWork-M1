// src/audio/utils.rs
use hound;

fn resample_linear(input: &[f32], source_rate: u32, target_rate: u32) -> Vec<f32> {
    let ratio = source_rate as f64 / target_rate as f64;
    if input.is_empty() {
        return Vec::new();
    }

    let output_len = ((input.len() as f64) / ratio).ceil() as usize;
    let mut output = Vec::with_capacity(output_len);

    for i in 0..output_len {
        let src_pos = (i as f64) * ratio;
        let idx = src_pos.floor() as usize;
        let frac = src_pos - (idx as f64);

        if idx + 1 < input.len() {
            let s0 = input[idx];
            let s1 = input[idx + 1];
            output.push(s0 + ((s1 - s0) * frac as f32));
        } else {
            output.push(input[input.len() - 1]);
        }
    }

    output
}

pub fn process_and_save_audio(
    raw_samples:&[f32],
    source_rate:u32,
    path: &str,
)->Result<(),String>{
    //1. Conversion stereo -> mono (si necessaire)
    // On part du principe que si on capture via cpal en mono, on saute cette etape.
    // Sinon, on fait la moyenne des canaux.
    let mono_samples = raw_samples.to_vec();

    // 2. Resampling vers 16000Hz
    let target_rate = 16000;
    let resampled_data = if source_rate != target_rate {
        resample_linear(&mono_samples, source_rate, target_rate)
    } else {
        mono_samples
    };

    // 3. Conversion de f32 en (-1.0,1.0) vers i16 (PCM S16LE)
    let final_samples: Vec<i16> = resampled_data
        .iter()
        .map(|&s| (s * i16::MAX as f32).clamp(i16::MIN as f32, i16::MAX as f32) as i16)
        .collect();

    //4. Ecriture du fichier WAV Hound
    let spec = hound::WavSpec {
        channels: 1,
        sample_rate: 16000,
        bits_per_sample: 16,
        sample_format: hound::SampleFormat::Int,
    };

    let mut writer = hound::WavWriter::create(path, spec).map_err(|e| e.to_string())?;
    for sample in final_samples {
        writer.write_sample(sample).map_err(|e| e.to_string())?;
    }
    writer.finalize().map_err(|e| e.to_string())?;

    Ok(())
}
