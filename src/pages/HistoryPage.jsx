import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from '../components/Toast';
import { SkeletonText } from '../components/Loader';
import './HistoryPage.css';

function fmtDate(ts) {
  const d = new Date(ts * 1000);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function HistoryPage() {
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const result = await invoke('get_saved_transcriptions');
      setSummaries(result ?? []);
    } catch (err) {
      toast.error('Impossible de charger l\'historique: ' + err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item) => {
    setDeleting(item.created_at);
    try {
      console.log('Deleting item with created_at:', item);
      const ok = await invoke('delete_saved_transcription', { createdAt: item.created_at });
      if (ok) {
        toast.success('Résumé supprimé.');
        if (selected?.created_at === item.created_at) setSelected(null);
        await fetchAll();
      } else {
        toast.error('Suppression échouée.');
      }
    } catch (err) {
      toast.error('Erreur: ' + err);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = summaries.filter(s =>
    s.resume?.theme?.toLowerCase().includes(search.toLowerCase()) ||
    s.transcript?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="history-page">
      {/* Sidebar */}
      <div className="history-sidebar">
        <div className="sidebar-header">
          <h2>Historique</h2>
          <span className="hist-count">{summaries.length}</span>
        </div>

        <div className="sidebar-search">
          <span className="search-icon">⌕</span>
          <input
            className="search-input"
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="sidebar-list">
          {loading && (
            <div className="sidebar-loading">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="skeleton-card">
                  <SkeletonText lines={2} />
                </div>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="sidebar-empty">
              {search ? 'Aucun résultat.' : 'Aucun résumé sauvegardé.'}
            </div>
          )}

          {!loading && filtered.map(item => (
            <button
              key={item.created_at}
              className={`hist-card ${selected?.created_at === item.created_at ? 'selected' : ''}`}
              onClick={() => setSelected(item)}
            >
              <div className="hist-card__theme">{item.resume?.theme?.slice(0, 60) || 'Sans titre'}</div>
              <div className="hist-card__meta">
                <span className="hist-card__date">{fmtDate(item.created_at)}</span>
                <span className="hist-card__model">{item.resume?.model}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Detail */}
      <div className="history-detail">
        {!selected && (
          <div className="detail-empty">
            <div className="detail-empty__icon">📋</div>
            <p>Sélectionnez un résumé pour le consulter</p>
          </div>
        )}

        {selected && (
          <div className="detail-content" key={selected.created_at}>
            {/* Detail header */}
            <div className="detail-header">
              <div>
                <p className="detail-date">{fmtDate(selected.created_at)}</p>
                <h2 className="detail-theme">{selected.resume?.theme}</h2>
                <span className="detail-model">via {selected.resume?.model}</span>
              </div>
              <button
                className="btn btn--danger"
                onClick={() => handleDelete(selected)}
                disabled={deleting === selected.created_at}
              >
                {deleting === selected.created_at ? '…' : '🗑 Supprimer'}
              </button>
            </div>

            {/* Summary section */}
            <section className="detail-section">
              <div className="section-label">Résumé</div>
              <div className="detail-box">
                <pre className="detail-markdown">{selected.resume?.markdown_summary}</pre>
              </div>
            </section>

            {/* Transcript section */}
            <section className="detail-section">
              <div className="section-label">
                Transcription
                <span className="word-count">
                  {selected.transcript?.trim().split(/\s+/).length} mots
                </span>
              </div>
              <div className="detail-box transcript-box">
                <p className="detail-transcript">{selected.transcript}</p>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
