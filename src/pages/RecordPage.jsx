import { useState, useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from '../components/Toast';
import { WaveLoader, ThinkingLoader, SkeletonText } from '../components/Loader';
import './RecordPage.css';

// ── Steps ─────────────────────────────────────────────────────────────────────
// 0: record  1: transcribe  2: summarize  3: save
const STEPS = ['Enregistrement', 'Transcription', 'Résumé', 'Sauvegarde'];

export default function RecordPage({ ollamaModels, selectedModel, onModelChange }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Step 0
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Step 1
  const [transcription, setTranscription] = useState('');
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  // Step 2
  const [summary, setSummary] = useState(null); // { theme, markdown_summary }
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Timer ref
  const timerRef = useRef(null);

  // ── Sync recording state ───────────────────────────────────────────────────
  useEffect(() => {
    syncRecordingState();
  }, []);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const syncRecordingState = async () => {
    try {
      const rec = await invoke('get_is_recording');
      setIsRecording(rec);
    } catch (e) {
      console.error(e);
    }
  };

  // Bypass recording: passe directement à l'étape transcription
  const bypassRecording = () => {
    setStep(1);
    toast.info("Enregistrement contourné.");
  };

  // Importer un fichier WAV via un input HTML (frontend) : on encode en base64
  // et on envoie au backend via `save_uploaded_wav` pour écrire ./output.wav
  const fileInputRef = useRef(null);

  const triggerFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.click();
  };

  const onFileSelected = (e) => withBusy(async () => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setLoadingTranscript(true);
    setTranscription('');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const arrayBuffer = reader.result;
        // convert to base64
        const bytes = new Uint8Array(arrayBuffer);
        let binary = '';
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
        }
        const base64 = btoa(binary);

        // save on backend
        const savedPath = await invoke('save_uploaded_wav', { b64: base64 });
        const result = await invoke('transcribe_audio_file', { path: savedPath });
        if (!result || result.trim() === '') {
          toast.warn('Aucune transcription obtenue depuis le fichier.');
        } else {
          setTranscription(result);
          setStep(1);
          toast.success('Transcription depuis fichier terminée !');
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      toast.error('Erreur import/transcription: ' + String(err));
    } finally {
      setLoadingTranscript(false);
      // clear input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = null;
    }
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const fmtTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const withBusy = async (fn) => {
    setBusy(true);
    try { await fn(); }
    finally { setBusy(false); }
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetAll = () => {
    setStep(0);
    setIsRecording(false);
    setRecordingTime(0);
    setTranscription('');
    setSummary(null);
    setLoadingTranscript(false);
    setLoadingSummary(false);
    toast.info('Application réinitialisée.');
  };

  // ── Step 0: Recording ──────────────────────────────────────────────────────
  const toggleCapture = () => withBusy(async () => {
    try {
      if (!isRecording) {
        await invoke('start_capture');
        setRecordingTime(0);
        toast.info('Enregistrement démarré.');
      } else {
        await invoke('stop_capture');
        toast.success('Enregistrement arrêté. Vous pouvez transcrire.');
        setStep(1);
      }
      await syncRecordingState();
    } catch (err) {
      toast.error('Erreur: ' + err);
    }
  });

  // ── Step 1: Transcription ──────────────────────────────────────────────────
  const launchTranscription = () => withBusy(async () => {
    setLoadingTranscript(true);
    setTranscription('');
    try {
      const result = await invoke('transcribe_audio_file', { path: './output.wav' });
      if (!result || result.trim() === '') {
        toast.warn('Aucune transcription obtenue. Réessayez.');
      } else {
        setTranscription(result);
        toast.success('Transcription terminée !');
      }
    } catch (err) {
      toast.error('Erreur de transcription: ' + err);
    } finally {
      setLoadingTranscript(false);
    }
  });

  const retryTranscription = () => {
    setTranscription('');
    launchTranscription();
  };

  const goToSummary = () => {
    if (!transcription.trim()) {
      toast.warn('Aucune transcription à résumer.');
      return;
    }
    setStep(2);
    setSummary(null);
  };

  // ── Step 2: Summary ────────────────────────────────────────────────────────
  const launchSummary = () => withBusy(async () => {
    if (!selectedModel) { toast.warn('Sélectionnez un modèle Ollama.'); return; }
    setLoadingSummary(true);
    setSummary(null);
    try {
      const result = await invoke('summarize_text_with_ollama', {
        modelName: selectedModel,
        text: transcription,
      });
      if (!result) {
        toast.warn('Aucun résumé obtenu.');
      } else {
        setSummary(result); // { theme, markdown_summary }
        toast.success('Résumé généré !');
      }
    } catch (err) {
      toast.error('Erreur Ollama: ' + err);
    } finally {
      setLoadingSummary(false);
    }
  });

  const retrySummary = () => {
    setSummary(null);
    launchSummary();
  };

  const goToSave = () => {
    if (!summary) { toast.warn('Générez d\'abord un résumé.'); return; }
    setStep(3);
  };

  // ── Step 3: Save ───────────────────────────────────────────────────────────
  const saveTranscription = () => withBusy(async () => {
    try {
      await invoke('save_transcription_file', {
        transcript: transcription,
        resume: { ...summary, model: selectedModel },
      });
      toast.success('Résumé sauvegardé avec succès !');
      resetAll();
    } catch (err) {
      toast.error('Erreur de sauvegarde: ' + err);
    }
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="record-page">
      {/* Header */}
      <div className="rp-header">
        <div className="rp-steps">
          {STEPS.map((label, i) => (
            <div key={i} className={`rp-step ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`}>
              <div className="rp-step__dot">{i < step ? '✓' : i + 1}</div>
              <span className="rp-step__label">{label}</span>
              {i < STEPS.length - 1 && <div className="rp-step__line" />}
            </div>
          ))}
        </div>

        <div className="rp-actions-top">
          {ollamaModels.length > 0 && (
            <select
              value={selectedModel}
              onChange={e => onModelChange(e.target.value)}
              disabled={busy}
            >
              <option value="">Sélectionnez un modèle</option>
              {ollamaModels.map(m => (
                <option key={m.name} value={m.name}>{m.name}</option>
              ))}
            </select>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".wav,audio/wav"
            style={{ display: 'none' }}
            onChange={onFileSelected}
          />
          <button className="btn btn--ghost btn--sm" onClick={triggerFileInput} disabled={busy}>
            Importer .wav
          </button>
          <button className="btn btn--ghost btn--sm" onClick={bypassRecording} disabled={busy}>
            Passer l'enregistrement
          </button>
          <button className="btn btn--ghost btn--sm" onClick={resetAll} disabled={busy}>
            ↺ Réinitialiser
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="rp-content">

        {/* ── STEP 0: Record ── */}
        {step === 0 && (
          <div className="rp-panel record-panel">
            <div className={`record-orb ${isRecording ? 'recording' : ''}`}>
              <div className="orb-pulse" />
              <div className="orb-pulse orb-pulse--2" />
              <div className="orb-core">
                {isRecording ? (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="currentColor" width="32" height="32">
                    <circle cx="12" cy="12" r="6"/>
                  </svg>
                )}
              </div>
            </div>

            {isRecording && (
              <div className="record-indicator">
                <span className="rec-dot" />
                <span className="rec-time">{fmtTime(recordingTime)}</span>
                <WaveLoader />
              </div>
            )}

            <p className="rp-hint">
              {isRecording
                ? 'Enregistrement en cours — cliquez pour arrêter'
                : 'Cliquez pour démarrer l\'enregistrement'}
            </p>

            <button
              className={`btn ${isRecording ? 'btn--danger' : 'btn--primary'} btn--lg`}
              onClick={toggleCapture}
              disabled={busy}
            >
              {busy ? '…' : isRecording ? '⏹ Arrêter' : '⏺ Démarrer'}
            </button>
          </div>
        )}

        {/* ── STEP 1: Transcription ── */}
        {step === 1 && (
          <div className="rp-panel transcript-panel">
            <div className="panel-title">
              <h2>Transcription</h2>
              {transcription && (
                <span className="badge badge--success">{transcription.split(' ').length} mots</span>
              )}
            </div>

            {!transcription && !loadingTranscript && (
              <div className="empty-state">
                <p>Lancez la transcription pour convertir votre enregistrement en texte.</p>
                <button className="btn btn--primary" onClick={launchTranscription} disabled={busy}>
                  ▶ Transcrire
                </button>
              </div>
            )}

            {loadingTranscript && <WaveLoader label="Transcription en cours…" />}

            {transcription && !loadingTranscript && (
              <>
                <div className="text-result">
                  <p className="transcript-text">{transcription}</p>
                </div>
                <div className="panel-footer">
                  <button className="btn btn--ghost" onClick={retryTranscription} disabled={busy}>
                    ↺ Retranscrire
                  </button>
                  <button className="btn btn--ghost" onClick={() => setStep(0)} disabled={busy}>
                    ← Réenregistrer
                  </button>
                  <button className="btn btn--primary" onClick={goToSummary} disabled={busy}>
                    Résumer →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP 2: Summary ── */}
        {step === 2 && (
          <div className="rp-panel summary-panel">
            <div className="panel-title">
              <h2>Résumé IA</h2>
              {summary && (
                <span className="badge badge--amber">{summary.theme?.slice(0, 40)}…</span>
              )}
            </div>

            {!summary && !loadingSummary && (
              <div className="empty-state">
                <p>Génère un résumé structuré avec le modèle <strong>{selectedModel}</strong>.</p>
                <button className="btn btn--primary" onClick={launchSummary} disabled={busy}>
                  ✦ Générer le résumé
                </button>
              </div>
            )}

            {loadingSummary && <ThinkingLoader label="Génération du résumé" />}

            {summary && !loadingSummary && (
              <>
                <div className="summary-theme">
                  <span className="theme-label">Thème</span>
                  <p className="theme-text">{summary.theme}</p>
                </div>
                <div className="text-result markdown-result">
                  <pre className="markdown-text">{summary.markdown_summary}</pre>
                </div>
                <div className="panel-footer">
                  <button className="btn btn--ghost" onClick={retrySummary} disabled={busy}>
                    ↺ Régénérer
                  </button>
                  <button className="btn btn--ghost" onClick={() => { setStep(1); setSummary(null); }} disabled={busy}>
                    ← Modifier texte
                  </button>
                  <button className="btn btn--primary" onClick={goToSave} disabled={busy}>
                    Sauvegarder →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── STEP 3: Save ── */}
        {step === 3 && (
          <div className="rp-panel save-panel">
            <div className="save-icon">💾</div>
            <h2>Confirmer la sauvegarde</h2>

            <div className="save-preview">
              <div className="save-row">
                <span className="save-label">Thème</span>
                <span className="save-value">{summary?.theme}</span>
              </div>
              <div className="save-row">
                <span className="save-label">Modèle</span>
                <span className="save-value mono">{selectedModel}</span>
              </div>
              <div className="save-row">
                <span className="save-label">Mots</span>
                <span className="save-value">{transcription.split(' ').length}</span>
              </div>
            </div>

            <div className="panel-footer">
              <button className="btn btn--ghost" onClick={() => setStep(2)} disabled={busy}>
                ← Retour
              </button>
              <button className="btn btn--success btn--lg" onClick={saveTranscription} disabled={busy}>
                {busy ? '…' : '✓ Sauvegarder'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Global busy overlay */}
      {busy && <div className="busy-overlay" />}
    </div>
  );
}
