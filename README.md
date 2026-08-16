# VoiceNote

Application de bureau pour transformer une note vocale en transcription texte puis en résumé structuré au format Markdown, en utilisant uniquement des modèles locaux.

## Présentation

VoiceNote est un projet Tauri qui permet d'enregistrer de l'audio depuis le microphone, de transcrire automatiquement la parole avec un modèle Whisper local, puis de demander à un modèle LLM installé via Ollama de produire un résumé clair, professionnel et exploitable.

Le flux de travail est le suivant :

1. Enregistrer une prise de note vocale
2. Transcrire l'audio localement
3. Générer un résumé intelligible en Markdown
4. Sauvegarder le résultat dans l'historique de l'application

---

## Fonctionnalités

- Enregistrement audio depuis le micro
- Transcription automatique locale avec Faster-Whisper
- Résumé IA via plusieurs modèles Ollama disponibles localement
- Historique des notes enregistrées
- Consultation du résumé et de la transcription
- Suppression d'une note sauvegardée
- Interface desktop moderne avec React + Tauri

---

## Stack technique

- Frontend : React + Vite
- Desktop : Tauri 2
- Backend : Rust
- STT : Whisper via CTranslate2 / Faster-Whisper
- LLM : Ollama
- Stockage local : fichiers JSON dans le dossier de stockage du projet

---

## Architecture du projet

```text
tauri-app/
├── src/                          # Frontend React
│   ├── App.jsx
│   ├── components/
│   ├── pages/
│   └── ...
├── src-tauri/                   # Backend Tauri / Rust
│   ├── src/
│   ├── model/
│   ├── storage/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── ...
├── package.json
├── vite.config.js
├── index.html
├── README.md
└── ...
```

---

## Prérequis

Avant de lancer le projet, vérifiez que vous avez :

- Node.js 18+ ou plus récent
- npm
- Rust et le toolchain Cargo
- Ollama installé et démarré localement
- Un modèle Ollama disponible, par exemple :

```bash
ollama pull llama3
```

Pour la transcription locale, le modèle Whisper est déjà inclus dans le dossier :

```text
src-tauri/model/faster-whisper-large-v3-turbo-ct2/
```

> Assurez-vous que ce dossier contient les fichiers du modèle nécessaires au bon fonctionnement de la transcription.

---

## Installation

1. Clonez le dépôt :

```bash
git clone <url-du-projet>
cd tauri-app
```

2. Installez les dépendances frontend :

```bash
npm install
```

3. Vérifiez que Ollama est bien en cours d'exécution :

```bash
ollama serve
```

4. Vérifiez la présence de vos modèles locaux :

```bash
ollama list
```

---

## Lancement du projet

Pour démarrer l'application en mode développement :

```bash
npm run tauri dev
```

Cette commande lance à la fois :

- le frontend React
- le backend Tauri / Rust
- les commandes d'enregistrement, transcription et résumé

---

## Workflow de l'application

### 1. Enregistrement

L'utilisateur clique sur le bouton d'enregistrement, le micro capte le son et l'audio est traité en arrière-plan.

### 2. Transcription

Le fichier audio est converti puis envoyé au moteur de transcription Whisper local. La transcription est renvoyée au frontend et affichée à l'utilisateur.

### 3. Résumé IA

Le texte transcrit est envoyé à Ollama avec le modèle sélectionné. Le backend produit une réponse structurée sous forme JSON, contenant :

- le thème principal
- un résumé au format Markdown

### 4. Enregistrement dans l'historique

Le résultat est sauvegardé localement en JSON dans le dossier de stockage du projet afin d'être consulté plus tard depuis l'historique.

---

## Exemple de sortie résumé

```json
{
  "theme": "Réunion de lancement du projet",
  "markdown_summary": "# Réunion de lancement\n\n## Points clés\n- Objectif du projet\n- Planning de livraison\n- Rôles et responsabilités\n\n## Décisions\n- Validation du backlog\n- Mise en place d'un calendrier de sprint"
}
```

---

## Structure des fichiers importants

- `src/App.jsx` : navigation principale, gestion des modèles Ollama
- `src/pages/RecordPage.jsx` : interface d'enregistrement, transcription et résumé
- `src/pages/HistoryPage.jsx` : consultation et suppression de l'historique
- `src-tauri/src/lib.rs` : commandes Tauri et gestion des états backend
- `src-tauri/src/llm/ollama.rs` : appels vers les modèles Ollama
- `src-tauri/src/model_stt/modelSTT.rs` : moteur de transcription Whisper
- `src-tauri/src/model_stt/save.rs` : sauvegarde des transcriptions et résumés

---

## Bonnes pratiques

- Démarrer Ollama avant de lancer l'application
- Vérifier que le modèle Whisper est bien présent localement
- Utiliser un modèle Ollama suffisamment léger pour les tests rapides
- Vérifier les permissions microphone sur votre système

---

## Dépannage

### Ollama ne répond pas

```bash
ollama serve
```

### Aucun modèle détecté

```bash
ollama list
```

Puis téléchargez un modèle :

```bash
ollama pull llama3
```

### La transcription ne fonctionne pas

Vérifiez :

- la présence du dossier `src-tauri/model/faster-whisper-large-v3-turbo-ct2/`
- les fichiers du modèle
- les permissions d'accès au microphone
- la compatibilité audio (format WAV attendu)

---

## Conclusion

VoiceNote est un projet orienté IA locale : il montre comment combiner un moteur de transcription automatique et un modèle de langage local pour transformer une conversation orale en synthèse exploitable, directement dans une application de bureau.

Ce projet est particulièrement adapté aux projets pédagogiques, aux démonstrations d'IA locale et aux workflows de prise de notes intelligentes.
