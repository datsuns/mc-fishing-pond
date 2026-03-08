import { useState, useEffect, useRef } from 'react';
import { Download, Upload, Plus, Trash2, Globe, FileBox, FolderSearch, CheckCircle2, AlertCircle, ChevronDown, Map as MapIcon, Terminal } from 'lucide-react';
import { open, message } from '@tauri-apps/plugin-dialog';
import { readTextFile, exists, readDir } from '@tauri-apps/plugin-fs';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { PixelEditor } from './PixelEditor';
import './App.css';

// The version of the current studio payload
const STUDIO_VERSION = 1;

interface CustomItem {
  id: string; // Internal UUID or generated ID for the app list
  systemId: string; // The generated or manual system ID
  displayName: string;
  weight: number;
  score: number;
  texture?: string; // object URL for preview
  isManualId: boolean;
  _isDrawMode?: boolean; // Whether the item is currently using the pixel editor
}

interface WorldInfo {
  name: string;
  profile_name: string;
  game_dir: string;
  path: string;
  last_modified: number;
}

function App() {
  const [lang, setLang] = useState<'en' | 'jp'>('en');
  const [items, setItems] = useState<CustomItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Minecraft integration state
  const [mcPath, setMcPath] = useState<string | null>(null);
  const [worlds, setWorlds] = useState<WorldInfo[]>([]);
  const [selectedWorldPath, setSelectedWorldPath] = useState<string>('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployResult, setDeployResult] = useState<'success' | 'error' | null>(null);
  const [isWorldSelectorOpen, setIsWorldSelectorOpen] = useState(false);
  const worldSelectorRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find(i => i.id === selectedId);

  const t = {
    title: lang === 'en' ? 'Minecraft Fishing Pond Studio' : 'Minecraft Fishing Pond Studio',
    import: lang === 'en' ? 'Import Pack' : 'パックをインポート',
    myItems: lang === 'en' ? 'My Custom Items' : 'カスタムアイテム一覧',
    addNew: lang === 'en' ? 'Add New Item' : '新規アイテム追加',
    editing: lang === 'en' ? 'Editing:' : '編集中:',
    displayName: lang === 'en' ? 'Display Name:' : '表示名:',
    weight: lang === 'en' ? 'Weight (Spawn Chance):' : '重み (出現確率):',
    score: lang === 'en' ? 'Score:' : 'スコア:',
    texture: lang === 'en' ? 'Texture (16x16px):' : 'テクスチャ (16x16px):',
    textureHint: lang === 'en' ? 'Drag & drop your 16x16 pixel art texture here or click to browse' : '16x16のドット絵をここにドラッグ＆ドロップ、またはクリック',
    systemId: lang === 'en' ? 'System ID:' : 'システムID:',
    manualInput: lang === 'en' ? 'Manual Input' : '手動入力',
    noSelection: lang === 'en' ? 'Select an item to edit' : '編集するアイテムを選択してください',
    importFail: lang === 'en' ? 'Could not find datapack data in the selected folder.' : '選択されたフォルダにデータパックのデータが見つかりませんでした。',
    deployTitle: lang === 'en' ? 'Deploy to Minecraft' : 'Minecraftへ反映',
    selectWorld: lang === 'en' ? 'Select Target World:' : '反映先のワールドを選択:',
    noWorlds: lang === 'en' ? 'No worlds found.' : 'ワールドが見つかりません。',
    mcNotFoundTitle: lang === 'en' ? 'Minecraft Folder Not Found' : 'Minecraftフォルダが見つかりません',
    mcNotFoundDesc: lang === 'en' ? 'We could not automatically detect your Minecraft installation. Please select the .minecraft folder manually.' : 'Minecraftのインストール先を自動検出できませんでした。.minecraftフォルダを手動で選択してください。',
    locateMc: lang === 'en' ? 'Locate .minecraft Folder' : '.minecraft フォルダを探す',
    deployBtn: lang === 'en' ? 'Deploy Packs' : 'パックを反映する',
    deployingBtn: lang === 'en' ? 'Deploying...' : '反映中...',
    deploySuccess: lang === 'en' ? 'Successfully deployed!' : '反映に成功しました！',
    deployError: lang === 'en' ? 'Deployment failed.' : '反映に失敗しました。',
    emptyListError: lang === 'en' ? 'Please add at least one item before deploying.' : '反映する前に少なくとも1つのアイテムを追加してください。',
    refresh: lang === 'en' ? 'Refresh' : '更新',
    openFolder: lang === 'en' ? 'Open Folder' : 'フォルダを開く',
    defaultProfile: lang === 'en' ? 'Default Profile' : 'デフォルトの構成',
    loadMetadata: lang === 'en' ? 'Load Previous State' : '前回の状態をロード',
    loadSuccess: lang === 'en' ? 'Successfully loaded previous state!' : '前回の状態を読み込みました！',
    loadError: lang === 'en' ? 'Failed to load previous state.' : '状態の読み込みに失敗しました。'
  };

  // Load Minecraft path and worlds on mount
  useEffect(() => {
    async function initMc() {
      try {
        const defaultPath = await invoke<string | null>('get_minecraft_path');
        if (defaultPath) {
          setMcPath(defaultPath);
          await loadWorlds(defaultPath);
        }
      } catch (e) {
        console.error("Failed to init Minecraft integration:", e);
      }
    }
    initMc();

    // Click outside handler for world selector
    const handleClickOutside = (event: MouseEvent) => {
      if (worldSelectorRef.current && !worldSelectorRef.current.contains(event.target as Node)) {
        setIsWorldSelectorOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mcPath]);

  const loadWorlds = async (path: string) => {
    try {
      const worldList: WorldInfo[] = await invoke('list_minecraft_worlds', { path });
      setWorlds(worldList);
      if (worldList.length > 0) {
        // Select the most recently modified world by default
        setSelectedWorldPath(worldList[0].path);
      }
    } catch (e) {
      console.error("Failed to list worlds:", e);
    }
  };

  const handleLocateMc = async () => {
    try {
      const folder = await open({
        directory: true,
        multiple: false,
        title: lang === 'en' ? 'Select .minecraft Folder' : '.minecraft フォルダを選択'
      });
      if (folder && typeof folder === 'string') {
        setMcPath(folder);
        await loadWorlds(folder);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRefreshWorlds = async () => {
    if (mcPath) {
      await loadWorlds(mcPath);
    }
  };

  const handleOpenPath = async (path: string) => {
    try {
      await invoke('open_folder', { path });
    } catch (e) {
      console.error("Failed to open folder:", e);
    }
  };

  const handleOpenFolder = async () => {
    if (selectedWorldPath) {
      await handleOpenPath(selectedWorldPath);
    }
  };

  const handleLoadMetadata = async () => {
    if (!selectedWorldPath || !mcPath) return;

    try {
      const metadataStr = await invoke<string | null>('load_studio_metadata', {
        worldPath: selectedWorldPath,
        minecraftPath: mcPath
      });

      if (!metadataStr) {
        setDeployResult('error'); // Or some other indication that nothing was found
        return;
      }

      const loadedItems: CustomItem[] = JSON.parse(metadataStr);

      // Find the selected world info to get its game_dir
      const selectedWorld = worlds.find(w => w.path === selectedWorldPath);
      if (!selectedWorld) {
        throw new Error("Selected world info not found");
      }

      const restoredItems = await Promise.all(loadedItems.map(async (item) => {
        // Path to the texture in the resourcepack
        const texPath = `${selectedWorld.game_dir}/resourcepacks/mc_fishing_pond_resourcepack/assets/mc_fishing_pond/textures/item/${item.systemId}.png`;
        let textureUrl = item.texture;

        try {
          if (await exists(texPath)) {
            textureUrl = convertFileSrc(texPath);
          }
        } catch (e) {
          console.warn(`Failed to check/load texture for ${item.systemId}:`, e);
        }

        return {
          ...item,
          texture: textureUrl,
          id: Date.now().toString() + Math.random()
        };
      }));

      setItems(restoredItems);
      if (restoredItems.length > 0) {
        setSelectedId(restoredItems[0].id);
      }
      setDeployResult('success');
      setTimeout(() => setDeployResult(null), 3000);
      await message(t.loadSuccess, { title: 'Success', kind: 'info' });
    } catch (e) {
      console.error("Failed to load metadata:", e);
      await message(t.loadError, { title: 'Error', kind: 'error' });
    }
  };

  const updateItem = (updates: Partial<CustomItem>) => {
    if (!selectedId) return;
    setItems(items.map(item => {
      if (item.id !== selectedId) return item;
      const updated = { ...item, ...updates };
      // Auto-generate system ID if not manual
      if (!updated.isManualId && updates.displayName !== undefined) {
        updated.systemId = updated.displayName.toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/^_+|_+$/g, '');
        if (!updated.systemId) updated.systemId = 'item_' + Date.now().toString().slice(-4);
      }
      return updated;
    }));
  };

  const handleAddItem = () => {
    const defaultName = lang === 'en' ? 'New Item' : '新しいアイテム';
    const newItem: CustomItem = {
      id: Date.now().toString(),
      systemId: defaultName.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      displayName: defaultName,
      weight: 10,
      score: 10,
      isManualId: false
    };
    setItems([...items, newItem]);
    setSelectedId(newItem.id);
    setDeployResult(null); // Clear previous status
  };

  const handleImport = async () => {
    try {
      // 1. Select directory
      const path = await open({
        directory: true,
        multiple: false,
        title: lang === 'en' ? 'Select Datapack/Resourcepack Folder' : 'データパック・リソースパックのフォルダを選択'
      });

      if (!path || Array.isArray(path)) return; // Cancelled or error

      // 2. Discover fishing items JSON files
      let datapackItemsPath = `${path}/data/mc_fishing_pond/fishing_items`;
      let resourcepackTexturesPath = `${path}/assets/mc_fishing_pond/textures/item`;

      const hasData = await exists(datapackItemsPath);
      if (!hasData) {
        // Try falling back to generic structure if they selected the parent workspace
        datapackItemsPath = `${path}/testdata/datapack/data/mc_fishing_pond/fishing_items`;
        resourcepackTexturesPath = `${path}/testdata/resourcepack/assets/mc_fishing_pond/textures/item`;
        const hasTestData = await exists(datapackItemsPath);
        if (!hasTestData) {
          alert(t.importFail);
          return;
        }
      }

      // Read all custom item JSON files
      const dirEntries = await readDir(datapackItemsPath);
      const loadedItems: CustomItem[] = [];

      for (const entry of dirEntries) {
        if (entry.name && entry.name.endsWith('.json')) {
          const systemId = entry.name.replace('.json', '');
          const jsonStr = await readTextFile(`${datapackItemsPath}/${entry.name}`);
          try {
            const data = JSON.parse(jsonStr);
            // Look for corresponding texture
            const texPath = `${resourcepackTexturesPath}/${systemId}.png`;
            let textureUrl = undefined;
            if (await exists(texPath)) {
              textureUrl = convertFileSrc(texPath);
            }

            // Version handling (future proofing)
            const importedVersion = data._studio_version || 0;
            // if importedVersion > STUDIO_VERSION, we might show a warning here in the future
            if (importedVersion > STUDIO_VERSION) {
              console.warn(`Imported item ${systemId} has a newer version (${importedVersion}) than the studio (${STUDIO_VERSION}). Formatting may be lost.`);
            }

            loadedItems.push({
              id: Date.now().toString() + Math.random(),
              systemId,
              displayName: data.display_name || systemId,
              score: typeof data.score === 'number' ? data.score : 10,
              weight: typeof data.weight === 'number' ? data.weight : 10,
              texture: textureUrl,
              isManualId: true // Imported items get manual IDs by default so they don't break if renamed
            });
          } catch (e) {
            console.error("Failed to parse", entry.name, e);
          }
        }
      }

      if (loadedItems.length > 0) {
        setItems(loadedItems);
        setSelectedId(loadedItems[0].id);
        setDeployResult(null);
      } else {
        alert(t.importFail);
      }
    } catch (err) {
      console.error(err);
      await message("Error during import: " + err, { title: 'Import Failed', kind: 'error' });
    }
  };

  const blobToBase64 = async (url: string): Promise<string> => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const handleDeploy = async () => {
    if (items.length === 0) {
      await message(t.emptyListError, { title: 'Export', kind: 'info' });
      return;
    }
    if (!mcPath || !selectedWorldPath) return;

    setIsDeploying(true);
    setDeployResult(null);

    try {
      const payloadItems = await Promise.all(items.map(async (item) => {
        const id = item.systemId || `item_${item.id}`;

        // Version 1 Schema
        const dpJson = {
          _studio_version: STUDIO_VERSION,
          weight: item.weight,
          score: item.score,
          display_name: item.displayName,
          texture: `mc_fishing_pond:item/${id}`
        };

        const rpItemJson = {
          model: {
            type: "minecraft:model",
            model: `mc_fishing_pond:item/${id}`
          }
        };

        const rpModelJson = {
          parent: "minecraft:item/generated",
          textures: {
            layer0: `mc_fishing_pond:item/${id}`
          }
        };

        let textureBase64 = null;
        if (item.texture) {
          try {
            // Determine if texture is ObjectURL (from local file/canvas) or asset:// (from import)
            if (item.texture.startsWith('asset://')) {
              // For imported textures, read bytes directly 
              // Alternatively, fetching 'asset://' works in some Tauri setups depending on protocol config
              textureBase64 = await blobToBase64(item.texture);
            } else {
              textureBase64 = await blobToBase64(item.texture);
            }
          } catch (e) {
            console.error("Failed to encode texture", e);
          }
        }

        return {
          system_id: id,
          datapack_json: JSON.stringify(dpJson, null, 4),
          resourcepack_item_json: JSON.stringify(rpItemJson, null, 4),
          resourcepack_model_json: JSON.stringify(rpModelJson, null, 4),
          texture_base64: textureBase64
        };
      }));

      // --- Metadata for Studio State Recovery ---
      // We strip the texture object URL as it expires
      const metadata = JSON.stringify(items.map(item => ({
        ...item,
        texture: undefined
      })));

      await invoke('save_packs_to_minecraft', {
        worldPath: selectedWorldPath,
        minecraftPath: mcPath,
        items: payloadItems,
        studioMetadata: metadata
      });

      setDeployResult('success');
      setTimeout(() => setDeployResult(null), 3000);

    } catch (e: any) {
      console.error(e);
      setDeployResult('error');
      await message("Deploy failed: " + e.toString(), { title: 'Export Failed', kind: 'error' });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#121212] text-gray-200 overflow-hidden font-sans">

      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#1e1e1e] border-b border-gray-800 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <FileBox className="text-blue-500" size={20} />
          <h1 className="text-lg font-semibold tracking-wide">{t.title}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Upload size={16} />
            {t.import}
          </button>
          <div className="h-4 w-px bg-gray-700"></div>
          <button
            onClick={() => setLang(lang === 'en' ? 'jp' : 'en')}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Globe size={16} />
            Language: {lang === 'en' ? 'EN' : 'JP'}
          </button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left Pane - Item List */}
        <div className="w-64 bg-[#181818] border-r border-gray-800 flex flex-col select-none">
          <div className="p-4 flex-1 overflow-y-auto">
            <h2 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-4">{t.myItems}</h2>
            <div className="space-y-2">
              {items.map(item => (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer group transition-colors ${selectedId === item.id ? 'bg-blue-500/10 border border-blue-500/50' : 'hover:bg-white/5 border border-transparent'}`}
                >
                  <div className="w-8 h-8 bg-gray-800 rounded flex items-center justify-center shrink-0 overflow-hidden relative">
                    {item.texture ? (
                      <img src={item.texture} className="w-full h-full object-cover render-pixelated" alt="" />
                    ) : (
                      <div className="w-6 h-6 border-2 border-dashed border-gray-600 rounded-sm"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`truncate font-medium text-sm ${selectedId === item.id ? 'text-blue-400' : 'text-gray-200'}`}>
                      {item.displayName || 'Unnamed Item'}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setItems(items.filter(i => i.id !== item.id)); if (selectedId === item.id) setSelectedId(null); }}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-gray-800 shrink-0">
            <button
              onClick={handleAddItem}
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-white/5 hover:bg-white/10 rounded text-sm font-medium transition-colors border border-white/10"
            >
              <Plus size={16} />
              {t.addNew}
            </button>
          </div>
        </div>

        {/* Right Pane - Item Editor */}
        <div className="flex-1 bg-[#121212] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto w-full">
            {selectedItem ? (
              <div className="max-w-3xl mx-auto p-8 space-y-8">
                <div>
                  <h2 className="text-xl font-medium text-blue-400 mb-6">{t.editing} <span className="text-white">{selectedItem.displayName || 'Unnamed Item'}</span></h2>

                  <div className="space-y-6">
                    {/* Display Name */}
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-gray-400">{t.displayName}</label>
                      <input
                        type="text"
                        value={selectedItem.displayName}
                        onChange={(e) => updateItem({ displayName: e.target.value })}
                        className="w-full bg-[#1e1e1e] border border-gray-700 rounded px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                        placeholder="e.g. Golden Fish"
                      />
                    </div>

                    {/* Weight and Score */}
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-400">{t.weight}</label>
                        <input
                          type="number"
                          value={selectedItem.weight}
                          onChange={(e) => updateItem({ weight: Number(e.target.value) })}
                          min="1"
                          className="w-full bg-[#1e1e1e] border border-gray-700 rounded px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-400">{t.score}</label>
                        <input
                          type="number"
                          value={selectedItem.score}
                          onChange={(e) => updateItem({ score: Number(e.target.value) })}
                          min="0"
                          className="w-full bg-[#1e1e1e] border border-gray-700 rounded px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all font-mono"
                        />
                      </div>
                    </div>

                    {/* Texture Area */}
                    <div className="space-y-1.5 focus-within:ring-1 focus-within:ring-blue-500 rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-sm font-medium text-gray-400">{t.texture}</label>
                        <div className="flex bg-[#1e1e1e] p-1 rounded-lg border border-gray-700">
                          <button
                            onClick={() => {
                              updateItem({ ...selectedItem, _isDrawMode: true } as any);
                            }}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${selectedItem['_isDrawMode' as keyof typeof selectedItem] ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}
                          >
                            Draw
                          </button>
                          <button
                            onClick={() => updateItem({ ...selectedItem, _isDrawMode: false } as any)}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${!selectedItem['_isDrawMode' as keyof typeof selectedItem] ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-gray-300'}`}
                          >
                            Upload
                          </button>
                        </div>
                      </div>

                      {selectedItem['_isDrawMode' as keyof typeof selectedItem] ? (
                        <PixelEditor
                          initialTextureUrl={selectedItem.texture}
                          onChange={(url) => updateItem({ texture: url })}
                        />
                      ) : (
                        <div className="w-full border-2 border-dashed border-gray-700 hover:border-blue-500/50 rounded-lg p-8 bg-[#181818] transition-colors cursor-pointer flex flex-col items-center justify-center group relative overflow-hidden">
                          {selectedItem.texture ? (
                            <div className="relative w-32 h-32 flex items-center justify-center">
                              <img src={selectedItem.texture} className="max-w-full max-h-full render-pixelated scale-[4]" alt="Texture preview" />
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                                <Upload className="text-white w-8 h-8" />
                              </div>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="w-10 h-10 text-gray-500 mx-auto mb-3 group-hover:text-blue-400 transition-colors" />
                              <p className="text-sm text-gray-400 group-hover:text-gray-300">{t.textureHint}</p>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/png"
                            title=""
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={async (e) => {
                              if (e.target.files && e.target.files[0]) {
                                const url = URL.createObjectURL(e.target.files[0]);
                                updateItem({ texture: url });
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>

                    {/* System ID */}
                    <div className="space-y-1.5 pt-4 border-t border-gray-800">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-gray-400">{t.systemId}</label>
                        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer hover:text-gray-300 select-none">
                          <input
                            type="checkbox"
                            checked={selectedItem.isManualId}
                            onChange={(e) => updateItem({ isManualId: e.target.checked })}
                            className="rounded border-gray-600 bg-transparent text-blue-500 focus:ring-blue-500 focus:ring-offset-[#121212]"
                          />
                          {t.manualInput}
                        </label>
                      </div>
                      <div className="flex items-center opacity-70 focus-within:opacity-100 transition-opacity">
                        <span className="bg-[#181818] border border-gray-700 border-r-0 rounded-l px-3 py-2.5 text-gray-500 font-mono text-sm leading-tight select-none">
                          mc_fishing_pond:
                        </span>
                        <input
                          type="text"
                          value={selectedItem.systemId}
                          onChange={(e) => updateItem({ systemId: e.target.value })}
                          disabled={!selectedItem.isManualId}
                          className="flex-1 bg-[#1e1e1e] border border-gray-700 rounded-r px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="golden_fish"
                        />
                      </div>
                      {selectedItem.isManualId && <p className="text-xs text-yellow-500/80 mt-2">Warning: Ensure IDs uniquely use lowercase letters and underscores.</p>}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-500 select-none">
                <div className="text-center">
                  <FileBox size={48} className="mx-auto mb-4 opacity-20" />
                  <p>{t.noSelection}</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Deployment Control Panel */}
          <div className="bg-[#181818] border-t border-gray-800 shrink-0 select-none flex flex-col items-center">
            {mcPath === null ? (
              <div className="w-full p-4 flex flex-col items-center justify-center text-center space-y-3">
                <div className="flex items-center gap-2 text-yellow-500">
                  <AlertCircle size={20} />
                  <h3 className="font-semibold">{t.mcNotFoundTitle}</h3>
                </div>
                <p className="text-sm text-gray-400 max-w-md">{t.mcNotFoundDesc}</p>
                <button
                  onClick={handleLocateMc}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600/20 text-yellow-500 hover:bg-yellow-600/30 rounded border border-yellow-600/50 transition-colors"
                >
                  <FolderSearch size={16} />
                  {t.locateMc}
                </button>
              </div>
            ) : (
              <div className="w-full max-w-4xl mx-auto p-4 flex items-center justify-between gap-6">
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex items-center gap-2 mb-1 text-blue-400">
                    <Globe size={18} />
                    <h3 className="font-semibold text-sm uppercase tracking-wide">{t.deployTitle}</h3>
                  </div>
                  <label className="text-xs font-medium text-gray-400">{t.selectWorld}</label>
                  <div className="flex items-center gap-2 relative">
                    {worlds.length > 0 ? (
                      <div className="flex-1 relative" ref={worldSelectorRef}>
                        <div
                          onClick={() => !isDeploying && setIsWorldSelectorOpen(!isWorldSelectorOpen)}
                          className={`flex items-center justify-between w-full bg-[#1e1e1e] border border-gray-700 rounded px-3 py-2 text-white cursor-pointer hover:border-blue-500/50 transition-all font-medium text-sm ${isDeploying ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <MapIcon size={14} className="text-blue-400" />
                            <span className="truncate">
                              {worlds.find(w => w.path === selectedWorldPath)?.name || 'Select World'}
                            </span>
                          </div>
                          <ChevronDown size={16} className={`text-gray-500 transition-transform ${isWorldSelectorOpen ? 'rotate-180' : ''}`} />
                        </div>

                        {isWorldSelectorOpen && (
                          <div className="absolute bottom-full mb-1 left-0 w-full max-h-80 bg-[#1e1e1e] border border-gray-700 rounded shadow-2xl overflow-y-auto z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            {Array.from(new Set(worlds.map(w => w.profile_name))).map(profile => {
                              const profileWorld = worlds.find(w => w.profile_name === profile);
                              return (
                                <div key={profile}>
                                  <div className="px-3 py-1.5 bg-[#2a2d3e] text-[10px] font-bold text-blue-300 uppercase tracking-widest flex items-center justify-between sticky top-0 z-10 border-y border-white/5">
                                    <div className="flex items-center gap-2">
                                      <Terminal size={10} />
                                      {profile === '__DEFAULT_PROFILE__' ? t.defaultProfile : profile}
                                    </div>
                                    {profileWorld && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleOpenPath(profileWorld.game_dir);
                                        }}
                                        title={t.openFolder}
                                        className="p-1 hover:bg-white/10 rounded text-blue-400 hover:text-blue-200 transition-colors"
                                      >
                                        <FolderSearch size={12} />
                                      </button>
                                    )}
                                  </div>
                                  {worlds.filter(w => w.profile_name === profile).map(w => (
                                    <div
                                      key={w.path}
                                      onClick={() => {
                                        setSelectedWorldPath(w.path);
                                        setIsWorldSelectorOpen(false);
                                      }}
                                      className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between group ${selectedWorldPath === w.path ? 'bg-red-900/30 text-red-400 border-l-2 border-red-500' : 'hover:bg-white/5 text-gray-300'}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <MapIcon size={12} className={selectedWorldPath === w.path ? 'text-red-400' : 'text-gray-500 group-hover:text-gray-400'} />
                                        {w.name}
                                      </div>
                                      {selectedWorldPath === w.path && <CheckCircle2 size={12} className="text-red-500" />}
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex-1 px-3 py-2 text-sm text-red-400 bg-red-900/20 border border-red-900/50 rounded">{t.noWorlds}</div>
                    )}

                    <button
                      onClick={handleRefreshWorlds}
                      disabled={isDeploying || !mcPath}
                      title={t.refresh}
                      className="p-2 bg-[#1e1e1e] border border-gray-700 rounded text-gray-400 hover:text-white hover:border-gray-600 transition-all disabled:opacity-50"
                    >
                      <FolderSearch size={16} />
                    </button>

                    <button
                      onClick={handleOpenFolder}
                      disabled={isDeploying || !selectedWorldPath}
                      title={t.openFolder}
                      className="p-2 bg-[#1e1e1e] border border-gray-700 rounded text-gray-400 hover:text-white hover:border-gray-600 transition-all disabled:opacity-50"
                    >
                      <Plus size={16} className="rotate-45" />
                    </button>

                    <button
                      onClick={handleLoadMetadata}
                      disabled={isDeploying || !selectedWorldPath}
                      title={t.loadMetadata}
                      className="p-2 bg-blue-600/20 border border-blue-500/50 rounded text-blue-400 hover:bg-blue-600/30 hover:text-white hover:border-blue-400 transition-all disabled:opacity-50"
                    >
                      <Download size={16} />
                    </button>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-4">
                  {deployResult === 'success' && (
                    <div className="flex items-center gap-2 text-green-400 text-sm font-medium animate-fade-in">
                      <CheckCircle2 size={16} />
                      {t.deploySuccess}
                    </div>
                  )}
                  {deployResult === 'error' && (
                    <div className="flex items-center gap-2 text-red-400 text-sm font-medium animate-fade-in">
                      <AlertCircle size={16} />
                      {t.deployError}
                    </div>
                  )}

                  <button
                    onClick={handleDeploy}
                    disabled={isDeploying || worlds.length === 0}
                    className="w-48 flex items-center justify-center gap-2 py-3 px-6 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed rounded shadow-lg shadow-blue-900/20 text-white font-semibold transition-all"
                  >
                    <Download size={18} className={isDeploying ? 'animate-bounce' : ''} />
                    {isDeploying ? t.deployingBtn : t.deployBtn}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
