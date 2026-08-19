import { useEffect, useState } from 'react';
import './Loader.css';

// ── Waveform loader (recording / transcription) ───────────────────────────────
export function WaveLoader({ label }) {
  return (
    <div className="wave-loader">
      <div className="wave-bars">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="wave-bar" style={{ animationDelay: `${i * 0.07}s` }} />
        ))}
      </div>
      {label && <p className="loader-label">{label}</p>}
    </div>
  );
}

// ── Thinking loader for Ollama (animated dots + rotating tips) ────────────────
const TIPS = [
  "Le modèle analyse la structure du texte…",
  "Extraction des thèmes principaux…",
  "Synthèse en cours, encore un instant…",
  "Formulation du résumé markdown…",
  "Derniers ajustements sémantiques…",
  "Presque terminé — le modèle peaufine…",
];

export function ThinkingLoader({ label }) {
  const [tip, setTip] = useState(0);
  const [dots, setDots] = useState('');

  useEffect(() => {
    const tipInterval = setInterval(() => setTip(t => (t + 1) % TIPS.length), 2800);
    const dotInterval = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => { clearInterval(tipInterval); clearInterval(dotInterval); };
  }, []);

  return (
    <div className="thinking-loader">
      <div className="thinking-orb">
        <div className="orb-ring orb-ring--1" />
        <div className="orb-ring orb-ring--2" />
        <div className="orb-ring orb-ring--3" />
        <span className="orb-icon">✦</span>
      </div>
      <p className="loader-label">{label || 'Traitement'}{dots}</p>
      <p className="loader-tip">{TIPS[tip]}</p>
    </div>
  );
}

// ── Skeleton block for transcript display ─────────────────────────────────────
export function SkeletonText({ lines = 6 }) {
  return (
    <div className="skeleton-block">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{ width: `${70 + Math.sin(i * 1.3) * 28}%`, animationDelay: `${i * 0.12}s` }}
        />
      ))}
    </div>
  );
}
