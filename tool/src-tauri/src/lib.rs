use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use base64::prelude::*;

#[derive(Serialize)]
pub struct WorldInfo {
    pub name: String,
    pub profile_name: String,
    pub game_dir: String,
    pub path: String,
    pub last_modified: u64,
}

#[derive(Deserialize)]
pub struct PackPayload {
    pub system_id: String,
    pub datapack_json: String,
    pub resourcepack_item_json: String,
    pub resourcepack_model_json: String,
    pub texture_base64: Option<String>,
}

#[tauri::command]
fn get_minecraft_path() -> Option<String> {
    let home_dir = dirs::home_dir()?;

    let mc_path = if cfg!(target_os = "windows") {
        dirs::data_dir()?.join(".minecraft")
    } else if cfg!(target_os = "macos") {
        home_dir.join("Library/Application Support/minecraft")
    } else {
        home_dir.join(".minecraft")
    };

    if mc_path.exists() {
        Some(mc_path.to_string_lossy().to_string())
    } else {
        None
    }
}

#[tauri::command]
fn list_minecraft_worlds(path: String) -> Result<Vec<WorldInfo>, String> {
    let mc_dir = PathBuf::from(&path);

    // --- Parse launcher_profiles.json to find all gameDirs per profile ---
    // Collect (gameDir, profileName) pairs, deduplicating by gameDir.
    let mut game_dirs: Vec<(PathBuf, String)> = Vec::new();

    let profiles_json_path = mc_dir.join("launcher_profiles.json");
    if profiles_json_path.exists() {
        if let Ok(content) = fs::read_to_string(&profiles_json_path) {
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(profiles) = json.get("profiles").and_then(|p| p.as_object()) {
                    for (key, profile) in profiles {
                        // 1. "name"があるか確認（空文字列でないことも確認）
                        let profile_name_opt = profile
                            .get("name")
                            .and_then(|n| n.as_str())
                            .filter(|n| !n.is_empty());

                        // 2. "gameDir"を取得（無い場合はデフォルトパス）
                        let game_dir = if let Some(gd) =
                            profile.get("gameDir").and_then(|g| g.as_str())
                        {
                            PathBuf::from(gd)
                        } else {
                            mc_dir.clone()
                        };

                        // ルールに従って名称を決定
                        let profile_name = if let Some(name) = profile_name_opt {
                            name.to_string()
                        } else if game_dir == mc_dir {
                            "デフォルトの構成".to_string()
                        } else {
                            let path_str = game_dir.to_string_lossy().to_string();
                            if path_str.is_empty() {
                                key.clone()
                            } else {
                                path_str
                            }
                        };

                        // Avoid duplicate game dirs (using path as primary key)
                        if !game_dirs.iter().any(|(d, _)| d == &game_dir) {
                            game_dirs.push((game_dir, profile_name));
                        }
                    }
                }
            }
        }
    }

    // Always include the default .minecraft dir if nothing was added
    if game_dirs.is_empty() {
        game_dirs.push((mc_dir.clone(), "デフォルトの構成".to_string()));
    } else if !game_dirs.iter().any(|(d, _)| d == &mc_dir) {
        game_dirs.push((mc_dir.clone(), "デフォルトの構成".to_string()));
    }


    // --- Scan saves/ in each game dir and collect worlds ---
    let mut worlds: Vec<WorldInfo> = Vec::new();

    for (game_dir, profile_name) in &game_dirs {
        let saves_dir = game_dir.join("saves");
        if !saves_dir.exists() {
            continue;
        }

        if let Ok(entries) = fs::read_dir(&saves_dir) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                if entry_path.is_dir() && entry_path.join("level.dat").exists() {
                    let world_folder_name = entry_path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_else(|| "Unknown World".to_string());

                    let last_modified = entry
                        .metadata()
                        .and_then(|m| m.modified())
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0);

                    let display_name = world_folder_name;

                    worlds.push(WorldInfo {
                        name: display_name,
                        profile_name: profile_name.clone(),
                        game_dir: game_dir.to_string_lossy().to_string(),
                        path: entry_path.to_string_lossy().to_string(),
                        last_modified,
                    });
                }
            }
        }
    }

    // Sort by most recently modified
    worlds.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
    Ok(worlds)
}

#[tauri::command]
fn save_packs_to_minecraft(
    world_path: String,
    minecraft_path: String,
    items: Vec<PackPayload>,
) -> Result<(), String> {
    let world_dir = PathBuf::from(&world_path);
    let mc_dir = PathBuf::from(&minecraft_path);

    if !world_dir.exists() {
        return Err("World directory does not exist".to_string());
    }

    // Infer the game dir from the world path:
    // world_dir = <game_dir>/saves/<world_name>
    // parent of saves = game_dir
    let game_dir = world_dir
        .parent() // .../saves
        .and_then(|p| p.parent()) // .../game_dir
        .map(|p| p.to_path_buf())
        .unwrap_or(mc_dir);

    let dp_path = world_dir.join("datapacks/mc_fishing_pond_datapack");
    let rp_path = game_dir.join("resourcepacks/mc_fishing_pond_resourcepack");

    // Create base directories
    fs::create_dir_all(&dp_path).map_err(|e| format!("Failed to create datapack dir: {}", e))?;
    fs::create_dir_all(&rp_path)
        .map_err(|e| format!("Failed to create resourcepack dir: {}", e))?;

    // pack.mcmeta — datapack
    let dp_mcmeta = serde_json::json!({
        "pack": {
            "pack_format": 48,
            "description": "Fishing Pond Custom Items"
        }
    });
    fs::write(
        dp_path.join("pack.mcmeta"),
        serde_json::to_string_pretty(&dp_mcmeta).unwrap(),
    )
    .map_err(|e| e.to_string())?;

    // pack.mcmeta — resourcepack
    let rp_mcmeta = serde_json::json!({
        "pack": {
            "pack_format": 34,
            "description": "Fishing Pond Custom Resources"
        }
    });
    fs::write(
        rp_path.join("pack.mcmeta"),
        serde_json::to_string_pretty(&rp_mcmeta).unwrap(),
    )
    .map_err(|e| e.to_string())?;

    // Item sub-directories
    let dp_items_dir = dp_path.join("data/mc_fishing_pond/fishing_items");
    let rp_items_dir = rp_path.join("assets/mc_fishing_pond/items");
    let rp_models_dir = rp_path.join("assets/mc_fishing_pond/models/item");
    let rp_textures_dir = rp_path.join("assets/mc_fishing_pond/textures/item");

    fs::create_dir_all(&dp_items_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&rp_items_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&rp_models_dir).map_err(|e| e.to_string())?;
    fs::create_dir_all(&rp_textures_dir).map_err(|e| e.to_string())?;

    for item in items {
        let id_json = format!("{}.json", item.system_id);
        let id_png = format!("{}.png", item.system_id);

        fs::write(dp_items_dir.join(&id_json), &item.datapack_json)
            .map_err(|e| e.to_string())?;
        fs::write(rp_items_dir.join(&id_json), &item.resourcepack_item_json)
            .map_err(|e| e.to_string())?;
        fs::write(rp_models_dir.join(&id_json), &item.resourcepack_model_json)
            .map_err(|e| e.to_string())?;

        if let Some(b64) = item.texture_base64 {
            // Strip data-URI prefix if present (e.g., "data:image/png;base64,")
            let base64_data = if let Some(idx) = b64.find(',') {
                &b64[idx + 1..]
            } else {
                &b64
            };
            if let Ok(decoded) = BASE64_STANDARD.decode(base64_data) {
                fs::write(rp_textures_dir.join(&id_png), decoded).map_err(|e| e.to_string())?;
            }
        }
    }

    Ok(())
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_minecraft_path,
            list_minecraft_worlds,
            save_packs_to_minecraft,
            open_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
