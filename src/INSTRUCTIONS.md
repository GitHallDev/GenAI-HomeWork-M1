# VoiceNote – Instructions d'installation

## 1. Structure des fichiers

Copiez les fichiers dans votre projet Tauri comme suit :

```
src/
├── index.css              
├── App.jsx                
├── App.css                
├── main.jsx               
│
├── components/
│   ├── Toast.jsx
│   ├── Toast.css
│   ├── Loader.jsx
│   └── Loader.css
│
└── pages/
    ├── RecordPage.jsx
    ├── RecordPage.css
    ├── HistoryPage.jsx
    └── HistoryPage.css
```

---

## 2. Aucune dépendance npm à installer

Le projet utilise uniquement :
- **React** (déjà présent)
- **@tauri-apps/api** (déjà présent)
- Les **Google Fonts** sont chargées via CDN dans `index.css`

Pas besoin de `npm install` supplémentaire.

---

## 3. Vérifier que main.jsx est correct

Votre `main.jsx` doit ressembler à ceci (ne pas modifier) :

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

---

## 4. Commandes Tauri attendues

L'interface appelle ces commandes Tauri (côté Rust, inchangées) :

| Commande | Description |
|---|---|
| `get_is_recording` | → bool |
| `start_capture` | Démarre l'enregistrement |
| `stop_capture` | Arrête l'enregistrement |
| `transcribe_audio_file` | `{ path: string }` → string |
| `get_local_ollama_models` | → `[{ name: string }]` |
| `summarize_text_with_ollama` | `{ modelName, text }` → `{ theme, markdown_summary }` |
| `save_transcription_file` | `{ transcript, resume: { theme, markdown_summary, model } }` |
| `get_saved_transcriptions` | → tableau de résumés |
| `delete_transcription_by_created_at` | `{ created_at }` → bool |

---

## 5. Format du résumé attendu depuis Ollama

La commande `summarize_text_with_ollama` doit retourner un objet JSON :

```json
{
  "theme": "Le thème principal du texte…",
  "markdown_summary": "# Titre\n\nContenu en **markdown**…"
}
```

---

## 6. Lancer le projet

```bash
npm run tauri dev
```

---

## Fonctionnalités de l'interface

### Page Enregistrement (workflow en 4 étapes)
- **Étape 1 – Enregistrement** : bouton avec orbe animée + timer + ondes
- **Étape 2 – Transcription** : résultat affichable, retranscription possible
- **Étape 3 – Résumé IA** : affichage thème + markdown, régénération possible
- **Étape 4 – Sauvegarde** : confirmation avant enregistrement

→ Navigation libre entre les étapes précédentes  
→ Overlay bloquant pendant les opérations Tauri  
→ Toast pour chaque succès / erreur  
→ Bouton "Réinitialiser" pour tout remettre à zéro

### Page Historique
- Liste avec recherche en temps réel
- Aperçu thème + date + modèle
- Détail complet : résumé markdown + transcription
- Suppression avec confirmation via toast
