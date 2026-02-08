use crate::error::AppError;

const DEFAULT_URL: &str = "http://localhost:11434";
const DEFAULT_MODEL: &str = "mistral:7b-instruct";

pub struct OllamaClient {
    url: String,
    model: String,
}

impl OllamaClient {
    pub fn new() -> Self {
        Self {
            url: DEFAULT_URL.to_string(),
            model: DEFAULT_MODEL.to_string(),
        }
    }

    pub async fn health_check(&self) -> Result<bool, AppError> {
        let url = format!("{}/api/tags", self.url);
        let resp = reqwest::Client::new()
            .get(&url)
            .timeout(std::time::Duration::from_secs(5))
            .send()
            .await;

        match resp {
            Ok(r) => Ok(r.status().is_success()),
            Err(_) => Ok(false),
        }
    }

    pub async fn generate(&self, prompt: &str) -> Result<String, AppError> {
        let url = format!("{}/api/generate", self.url);
        let body = serde_json::json!({
            "model": self.model,
            "prompt": prompt,
            "stream": false,
            "options": {
                "temperature": 0.3,
                "num_predict": 150
            }
        });

        let resp = reqwest::Client::new()
            .post(&url)
            .json(&body)
            .timeout(std::time::Duration::from_secs(10))
            .send()
            .await
            .map_err(|e| AppError::Audio(format!("Ollama request failed: {e}")))?;

        let json: serde_json::Value = resp
            .json()
            .await
            .map_err(|e| AppError::Audio(format!("Ollama response parse failed: {e}")))?;

        json.get("response")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .ok_or_else(|| AppError::Audio("No response field in Ollama output".into()))
    }

    pub fn model(&self) -> &str {
        &self.model
    }
}

impl Default for OllamaClient {
    fn default() -> Self {
        Self::new()
    }
}
