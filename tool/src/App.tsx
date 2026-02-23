import { useState } from 'react';
import { Download, Upload, Plus, Trash2, Globe, FileBox } from 'lucide-react';
import { open, message } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile, writeFile, mkdir, exists, readDir } from '@tauri-apps/plugin-fs';
import { convertFileSrc } from '@tauri-apps/api/core';
import { PixelEditor } from './PixelEditor';
import './App.css';

// Mock data types
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

function App() {
  const [lang, setLang] = useState<'en' | 'jp'>('en');
  const [items, setItems] = useState<CustomItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    export: lang === 'en' ? 'Export Data/Resource Packs' : 'データ/リソースパックを出力',
    noSelection: lang === 'en' ? 'Select an item to edit' : '編集するアイテムを選択してください',
    importSuccess: lang === 'en' ? 'Successfully imported items!' : 'アイテムのインポートに成功しました！',
    importFail: lang === 'en' ? 'Could not find datapack data in the selected folder.' : '選択されたフォルダにデータパックのデータが見つかりませんでした。',
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
      } else {
        alert(t.importFail);
      }
    } catch (err) {
      console.error(err);
      await message("Error during import: " + err, { title: 'Import Failed', kind: 'error' });
    }
  };

  const handleExport = async () => {
    if (items.length === 0) {
      await message(t.noSelection, { title: 'Export', kind: 'info' });
      return;
    }

    try {
      const exportDir = await open({
        directory: true,
        multiple: false,
        title: lang === 'en' ? 'Select Folder to Save Packs' : '保存先のフォルダを選択'
      });

      if (!exportDir || Array.isArray(exportDir)) return;

      const dpPath = `${exportDir}/mc_fishing_pond_datapack`;
      const rpPath = `${exportDir}/mc_fishing_pond_resourcepack`;

      // Create base dirs
      await mkdir(dpPath, { recursive: true });
      await mkdir(rpPath, { recursive: true });

      // write pack.mcmeta for 1.21.4 (RP: 75, DP: 94 based on testdata)
      await writeTextFile(`${dpPath}/pack.mcmeta`, JSON.stringify({
        pack: {
          pack_format: 94,
          min_format: 94,
          max_format: 99,
          description: "Fishing Pond Custom Items"
        }
      }, null, 2));

      await writeTextFile(`${rpPath}/pack.mcmeta`, JSON.stringify({
        pack: {
          pack_format: 75,
          min_format: 75,
          max_format: 99,
          description: "Fishing Pond Custom Resources"
        }
      }, null, 2));

      // Create item dirs
      const dpItemsDir = `${dpPath}/data/mc_fishing_pond/fishing_items`;
      const rpItemsDir = `${rpPath}/assets/mc_fishing_pond/items`;
      const rpModelsDir = `${rpPath}/assets/mc_fishing_pond/models/item`;
      const rpTexturesDir = `${rpPath}/assets/mc_fishing_pond/textures/item`;

      await mkdir(dpItemsDir, { recursive: true });
      await mkdir(rpItemsDir, { recursive: true });
      await mkdir(rpModelsDir, { recursive: true });
      await mkdir(rpTexturesDir, { recursive: true });

      // Write each item
      for (const item of items) {
        const id = item.systemId || `item_${item.id}`;

        // Datapack JSON
        await writeTextFile(`${dpItemsDir}/${id}.json`, JSON.stringify({
          weight: item.weight,
          score: item.score,
          display_name: item.displayName,
          texture: `mc_fishing_pond:item/${id}`
        }, null, 4));

        // Resourcepack Item Model component
        await writeTextFile(`${rpItemsDir}/${id}.json`, JSON.stringify({
          model: {
            type: "minecraft:model",
            model: `mc_fishing_pond:item/${id}`
          }
        }, null, 4));

        // Resourcepack Texture Model reference
        await writeTextFile(`${rpModelsDir}/${id}.json`, JSON.stringify({
          parent: "minecraft:item/generated",
          textures: {
            layer0: `mc_fishing_pond:item/${id}`
          }
        }, null, 4));

        // Texture Image writing
        if (item.texture) {
          try {
            const blobResponse = await fetch(item.texture);
            const arrayBuffer = await blobResponse.arrayBuffer();
            await writeFile(`${rpTexturesDir}/${id}.png`, new Uint8Array(arrayBuffer));
          } catch (e) {
            console.error("Failed to write texture for", id, e);
          }
        }
      }

      await message(lang === 'en' ? 'Packs exported successfully!' : 'データとリソースパックを出力しました！', { title: 'Success', kind: 'info' });

    } catch (e) {
      console.error(e);
      await message("Export failed: " + e, { title: 'Export Failed', kind: 'error' });
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
        <div className="flex-1 bg-[#121212] overflow-y-auto">
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
                            // Toggle to build-in editor. If they toggle, we don't clear the texture, we just let PixelEditor load it.
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
                        {/* Invisible file input covering the whole area */}
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
      </div>

      {/* Bottom Export Bar */}
      <div className="bg-[#181818] border-t border-gray-800 p-4 shrink-0 select-none">
        <div className="max-w-3xl mx-auto pl-64">
          <button
            onClick={handleExport}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded shadow-lg shadow-blue-900/20 text-white font-medium transition-all"
          >
            <Download size={20} />
            {t.export}
          </button>
        </div>
      </div>

    </div>
  );
}

export default App;
