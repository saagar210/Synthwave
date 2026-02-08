use serde::{Deserialize, Serialize};

use super::ollama::OllamaClient;
use crate::error::AppError;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Classification {
    pub genre: String,
    pub mood: String,
    pub energy: String,
}

pub struct AudioClassifier {
    client: OllamaClient,
}

impl AudioClassifier {
    pub fn new() -> Self {
        Self {
            client: OllamaClient::new(),
        }
    }

    pub async fn classify(
        &self,
        avg_rms: f32,
        avg_centroid: f32,
        avg_flux: f32,
        avg_zcr: f32,
        bpm: f32,
        beat_regularity: f32,
    ) -> Result<Classification, AppError> {
        let prompt = format!(
            r#"Analyze these audio features and respond with ONLY a JSON object:
- RMS (volume): {avg_rms:.3}
- Spectral Centroid (brightness): {avg_centroid:.3}
- Spectral Flux (change): {avg_flux:.3}
- Zero Crossing Rate: {avg_zcr:.3}
- BPM: {bpm:.0}
- Beat Regularity: {beat_regularity:.2}

Respond with exactly: {{"genre": "<genre>", "mood": "<mood>", "energy": "<low|medium|high>"}}"#
        );

        let response = self.client.generate(&prompt).await?;
        self.parse_response(&response)
    }

    fn parse_response(&self, response: &str) -> Result<Classification, AppError> {
        // Try to extract JSON from the response
        let json_start = response.find('{');
        let json_end = response.rfind('}');

        match (json_start, json_end) {
            (Some(start), Some(end)) if end > start => {
                let json_str = &response[start..=end];
                serde_json::from_str(json_str)
                    .map_err(|e| AppError::Audio(format!("Failed to parse classification: {e}")))
            }
            _ => Err(AppError::Audio(
                "No JSON object found in Ollama response".into(),
            )),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_valid_response() {
        let classifier = AudioClassifier::new();
        let response = r#"Based on the features, here is my analysis:
{"genre": "Electronic", "mood": "Energetic", "energy": "high"}"#;

        let result = classifier.parse_response(response).unwrap();
        assert_eq!(result.genre, "Electronic");
        assert_eq!(result.mood, "Energetic");
        assert_eq!(result.energy, "high");
    }

    #[test]
    fn test_parse_invalid_response() {
        let classifier = AudioClassifier::new();
        let response = "I don't know what to say";
        assert!(classifier.parse_response(response).is_err());
    }
}
