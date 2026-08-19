# Audio Summarizer AI 🎙️🤖

Une application de bureau moderne développée avec **Tauri**, **Rust**, et un frontend Web. Ce projet permet de capturer de l'audio directement depuis le microphone ou d'importer un fichier audio, de générer une transcription textuelle ultra-rapide et locale via **CTranslate2 (Faster-Whisper)**, puis de générer un résumé automatique grâce à des modèles de langage locaux gérés par **Ollama**.

---

## 🔥 Fonctionnalités clés

* **Enregistrement Audio en direct :** Capture de la voix depuis le micro avec gestion d'état (`start_capture`, `stop_capture`).
* **Transcription Locale (STT) :** Utilisation native de `faster-whisper-large-v3-turbo-ct2` pour une reconnaissance vocale rapide sans API externe.
* **Import de fichiers :** Prise en charge du chargement de fichiers WAV externes via encodage Base64.
* **Résumé par LLM Local :** Connexion transparente à **Ollama** pour lister vos modèles locaux et générer des résumés intelligents.
* **Historique persistant :** Sauvegarde, consultation et suppression des transcriptions accompagnées de leurs résumés.

---

## 🛠️ Prérequis Système

Pour pouvoir exécuter ou compiler ce projet sur votre machine (ou celle de vos collaborateurs/professeurs), plusieurs éléments système et fichiers de modèles sont requis.

### 1. Dépendances de compilation (Linux / Pop!_OS / Ubuntu)
Le moteur d'inférence C++ sous-jacent nécessite les outils de build natifs et le compilateur CMake. Installez-les via votre terminal :
```bash
sudo apt update && sudo apt install cmake build-essential pkg-config -y
```

### 2. Le Modèle IA de Transcription (STT)
L'application charge le modèle Whisper localement depuis un dossier spécifique. Vous devez télécharger et structurer le modèle CTranslate2.

1. Créez l'arborescence suivante à la racine du dossier `src-tauri` : `src-tauri/model/faster-whisper-large-v3-turbo-ct2/`
2. Téléchargez les fichiers officiels requis depuis le dépôt Hugging Face [Systran/faster-whisper-large-v3](https://huggingface.co) (ou la version *turbo* correspondante) :
   * `model.bin` *(Attention : téléchargez le vrai fichier binaire d'environ 460+ Mo via le bouton "download", et non le pointeur texte LFS)*
   * `config.json`
   * `vocabulary.json`
   * `tokenizer.json`

### 3. Le Moteur de Résumé (Ollama)
L'application s'appuie sur une instance Ollama locale pour interagir avec les grands modèles de langage (LLM).
1. Téléchargez et installez Ollama depuis [ollama.com](https://ollama.com).
2. Lancez le service Ollama en arrière-plan.
3. Téléchargez au moins un modèle de texte de votre choix pour effectuer les résumés (ex: `llama3`, `mistral` ou `gemma`) :
   ```bash
   ollama pull llama3
   ```

---

## 🚀 Lancement en Mode Développement

1. Clonez le dépôt du projet.
2. Installez les dépendances de l'interface utilisateur (frontend) à la racine du projet :
   ```bash
   npm install
   ```
3. Assurez-vous que votre service **Ollama** tourne en arrière-plan.
4. Démarrez l'environnement de développement Tauri. Cela va compiler le backend Rust et lancer l'interface graphique :
   ```bash
   npm run tauri dev
   ```

---

## 📦 Compiler l'application pour la partager

Pour générer une application autonome (installateur ou binaire portable) distribuable à vos collègues ou professeurs :

### 1. Configuration des Ressources (Obligatoire)
Pour éviter que vos utilisateurs n'aient à configurer eux-mêmes le dossier du modèle STT, assurez-vous d'avoir déclaré le dossier du modèle dans la section `"resources"` de votre fichier `src-tauri/tauri.conf.json` :
```json
{
  "bundle": {
    "resources": [
      "model/faster-whisper-large-v3-turbo-ct2/*"
    ]
  }
}
```

### 2. Exécuter le Build
Lancez la commande de packaging à la racine du projet :
```bash
npm run tauri build
```

### 3. Récupérer les fichiers de production
Une fois le build terminé, Tauri génère les paquets dans le dossier :
`src-tauri/target/release/bundle/`

* **Format `.AppImage` (Recommandé pour le partage rapide) :** Un fichier exécutable portable unique. Vos camarades sous Linux n'ont qu'à autoriser l'exécution du fichier pour lancer l'application instantanément sans installation.
* **Format `.deb` :** Un installateur standard pour les distributions Debian/Ubuntu/Pop!_OS.

> ⚠️ **Note sur la portabilité :** Tauri compile de manière native pour la plateforme hôte. Un build effectué sous Linux générera des packages pour Linux uniquement. Pour fournir une version Windows (`.exe` / `.msi`), le projet devra être buildé depuis une machine Windows.
