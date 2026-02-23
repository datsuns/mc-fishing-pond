# Minecraft Fishing Pond Studio - Specifications

## 1. Overview
The "Minecraft Fishing Pond Studio" is a dedicated desktop application intended to streamline the creation and modification of custom fishing items for the `mc-fishing-pond` mod. The tool targets Minecraft 1.21.4 and generates both a Datapack and a Resourcepack simultaneously.

## 2. Features
- **Project Import/Export**: Ability to import an existing Datapack/Resourcepack to parse and load current custom fish, enabling seamless return to previous work.
- **Multilingual UI**: A toggle to switch the interface text between English and Japanese (i18n).
- **Data Input**:
  - `Display Name` (string): The in-game localized name.
  - `Weight` (number): Spawning weight probability.
  - `Score` (number): Points awarded.
  - `Texture` (Image file): A drag-and-drop zone for `16x16` or `32x32` pixel art `.png` assets.
- **System ID Generation**:
  - A text field for the internal system ID (e.g., `golden_fish`).
  - To prevent user confusion, this field is placed at the bottom, disabled by default, and automatically generated securely from the `Display Name` (e.g., lowercase romanization or UUID).
  - A "Manual Edit" checkbox allows overriding the auto-generation.

## 3. Output Requirements (Minecraft 1.21.4)
When clicking "Export", the tool must output `Datapack.zip` and `Resourcepack.zip` with the following structures:

### 3.1 Datapack
- `pack.mcmeta` (pack_format: 48)
- `data/mc_fishing_pond/fishing_items/<system_id>.json`
```json
{
    "weight": <Weight>,
    "score": <Score>,
    "display_name": "<Display Name>",
    "texture": "mc_fishing_pond:<system_id>"
}
```

### 3.2 Resourcepack
- `pack.mcmeta` (pack_format: 34 or 46)
- **Item Definition** `assets/mc_fishing_pond/items/<system_id>.json`
```json
{
  "model": {
    "type": "minecraft:model",
    "model": "mc_fishing_pond:item/<system_id>"
  }
}
```
- **Model Definition** `assets/mc_fishing_pond/models/item/<system_id>.json`
```json
{
    "parent": "minecraft:item/generated",
    "textures": {
        "layer0": "mc_fishing_pond:item/<system_id>"
    }
}
```
- **Texture Image** `assets/mc_fishing_pond/textures/item/<system_id>.png` (Copied from the UI drop-zone)

## 4. UI Layout (Current Concept v5)
The interface is a clean, two-pane dark mode application:
1. **Left Pane (Item List)**: Master list of all items created during the session.
2. **Right Pane (Item Editor)**: Form containing fields for Name, Weight, Score, Texture upload, and the locked System ID box.
3. **App Header & Footer**: Language toggle in the header, prominent "Export" action in the footer.
