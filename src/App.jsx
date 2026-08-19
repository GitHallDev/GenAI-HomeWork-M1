import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ToastContainer, toast } from './components/Toast';
import RecordPage from './pages/RecordPage';
import HistoryPage from './pages/HistoryPage';
import './App.css';

export default function App() {
  const [page, setPage] = useState('record');
  const [ollamaModels, setOllamaModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const models = await invoke('get_local_ollama_models');
      const list = models ?? [];
      setOllamaModels(list);
      if (list.length > 0) setSelectedModel(list[0].name);
      if (list.length === 0) toast.warn('Aucun modèle Ollama détecté. Démarrez Ollama.');
    } catch (err) {
      toast.error('Erreur Ollama: ' + err);
    }
  };

  return (
    <div className="app-shell">
      {/* ── Navigation ── */}
      <nav className="app-nav">
        <div className="nav-brand">
          <div className="nav-logo">◈</div>
          <span className="nav-title">VoiceNote</span>
        </div>

        <div className="nav-tabs">
          <button
            className={`nav-tab ${page === 'record' ? 'active' : ''}`}
            onClick={() => setPage('record')}
          >
            <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
              <circle cx="10" cy="10" r="4"/>
              <path d="M10 1v2M10 17v2M1 10h2M17 10h2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
            </svg>
            Enregistrer
          </button>
          <button
            className={`nav-tab ${page === 'history' ? 'active' : ''}`}
            onClick={() => setPage('history')}
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" width="16" height="16">
              <rect x="3" y="3" width="14" height="14" rx="2"/>
              <path d="M7 7h6M7 10h6M7 13h4" strokeLinecap="round"/>
            </svg>
            Historique
          </button>
        </div>

        <div className="nav-right">
          <div className={`ollama-status ${ollamaModels.length > 0 ? 'ok' : 'warn'}`}>
            <span className="ollama-dot" />
            <span className="ollama-label">
              {ollamaModels.length > 0 ? `${ollamaModels.length} modèle${ollamaModels.length > 1 ? 's' : ''}` : 'Hors ligne'}
            </span>
          </div>
        </div>
      </nav>

      {/* ── Page ── */}
      <main className="app-main">
        {page === 'record' && (
          <RecordPage
            ollamaModels={ollamaModels}
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />
        )}
        {page === 'history' && <HistoryPage />}
      </main>

      <ToastContainer />
    </div>
  );
}
