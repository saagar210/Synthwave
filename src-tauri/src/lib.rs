mod ai;
mod audio;
mod commands;
mod config;
mod error;

use commands::AudioState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AudioState::default())
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::list_audio_devices,
            commands::start_audio,
            commands::stop_audio,
            commands::check_ollama,
            commands::classify_audio,
            commands::load_settings,
            commands::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
