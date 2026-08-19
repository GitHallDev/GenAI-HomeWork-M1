use serde::{Deserialize, Serialize};

// Structure pour correspondre au format de réponse d'Ollama
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OllamaModel {
    pub name: String,
    pub model: String,
    pub size: u64,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct OllamaResponse {
    pub models: Vec<OllamaModel>,
}

// La fonction pour récupérer les modèles locaux d'Ollama via son API REST

pub async fn get_local_ollama_models() -> Result<Vec<OllamaModel>, String> {
    let client = reqwest::Client::new();
    
    // Appel de l'API locale d'Ollama (port par défaut : 11434)
    let response = client
        .get("http://localhost:11434/api/tags")
        .send()
        .await
        .map_err(|e| format!("Impossible de contacter Ollama : {}", e))?;

    if response.status().is_success() {
        let data: OllamaResponse = response
            .json()
            .await
            .map_err(|e| format!("Erreur de lecture des données : {}", e))?;
        
        Ok(data.models)
    } else {
        Err(format!("Ollama a renvoyé une erreur : {}", response.status()))
    }
}


// Structure de la requête envoyée à Ollama
#[derive(Serialize)]
pub struct OllamaGenerateRequest {
    pub model: String,
    pub prompt: String,
    pub system: String, // Permet de définir le comportement d'Ollama
    pub format: String, // Ajout pour forcer le format json
    pub stream: bool,   // On désactive le stream pour recevoir tout le texte d'un coup
}

// La structure JSON finale que l'on souhaite renvoyer au Frontend
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct SummaryResult {
    pub theme: String,
    pub markdown_summary: String,
}

// Structure de la réponse reçue d'Ollama
#[derive(Deserialize)]
pub struct OllamaGenerateResponse {
    pub response: String,
}

pub async fn summarize_text_with_ollama(model: &String, text_to_summarize: &String) -> Result<SummaryResult, String> {
    let client = reqwest::Client::new();

    println!("Modèle sélectionné pour résumé : {}", model);
    println!("Texte à résumer : {}", text_to_summarize);

    // Définition précise des consignes pour le modèle
    let system_instructions = String::from(
        "Tu es un assistant expert. Analyse le texte et réponds UNIQUEMENT avec un objet JSON contenant exactement deux clés : \
         1) \"theme\": Le thème principal en une phrase courte. \
         2) \"markdown_summary\": Un résumé professionnel et pédagogique rédigé en utilisant la syntaxe Markdown \
         (utilise des listes à puces, du gras pour les concepts clés, et des titres de section si nécessaire pour le rendre très lisible)."
    );

    let request_body = OllamaGenerateRequest {
        model: model.clone(),
        prompt: text_to_summarize.clone(),
        system: system_instructions,
        format: "json".to_string(), 
        stream: false,
    };

    let response = client
        .post("http://localhost:11434/api/generate")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Erreur de connexion avec Ollama : {}", e))?;

    if response.status().is_success() {
        let result: OllamaGenerateResponse = response
            .json()
            .await
            .map_err(|e| format!("Erreur lors de la lecture de la réponse : {}", e))?;
        
        println!("Format renvoye: {}",result.response);
        // On doit le parser une seconde fois pour obtenir notre structure SummaryResult.
        let final_json: SummaryResult = serde_json::from_str(&result.response)
            .map_err(|e| format!("Le modèle n'a pas renvoyé le format JSON attendu : {}", e))?;
  
        Ok(final_json)
    } else {
        Err(format!("Ollama a renvoyé une erreur : {}", response.status()))
    }
}