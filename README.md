# MC Fishing Pond / 釣り堀Mod & Studio Tool

![Banner placeholder or screenshot]()

*🌍 [Click here for English Documentation](#english-documentation)*

---

## 🇯Ｐ 日本語ドキュメント

**MC Fishing Pond** は、Minecraftサーバー（Fabric / NeoForge両対応）にカスタム釣りアイテムや独自の釣果スコアシステムを手軽に導入できるModパッケージと、そのデータパック・リソースパック作成を完全自動化する専用デスクトップツール「**MC Fishing Pond Studio**」のセットです。

### 🎣 Modの機能 (Features)
* **カスタム釣果の追加**: バニラの釣りシステムを拡張し、専用のアイテム（ポイントや確率など）を釣れるようにします。
* **スコアシステムの同期**: 釣った魚に応じてスコアが加算され、サーバー内にいるプレイヤー全員にリアルタイムでスコア変動が同期されます。HUDなどのUIで競争を楽しむことができます。
* **管理者専用コマンド**: サーバー運営者（OP権限レベル2以上）向けに、スコアを管理するセキュアなコマンドを提供します。
  * `/fishingpond score add <player> <amount>` - 指定プレイヤーのスコアを加算
  * `/fishingpond score reset <player>` - 指定プレイヤーのスコアを「0」にリセット
  * `/fishingpond give <player> <item_id>` - 任意の釣果アイテムを直接付与

### 💻 付属ツール: Fishing Pond Studio
JSONファイルを直接編集する煩わしさから解放される、Windows向け専用デスクトップアプリです。（[Releases](https://github.com/datsuns/fishingpond/releases) から `.exe` をダウンロード可能です）

1. **直感的なUI編集**: アイテムの表示名、釣れる確率（Weight）、獲得スコアをGUIから簡単設定。
2. **内蔵ピクセルエディター**: 外部のペイントソフトは不要です。「Draw」モードで16x16のドット絵を描けば、自動的に透過PNGとして処理されます。
3. **ワンクリック出力**: 「Export Data & Resource Packs」ボタンを押すだけで、Minecraft 1.21.4の仕様に完全準拠した `datapack` と `resourcepack` を自動生成します。
4. **既存ファイルの再編集**: ツールで作ったパックフォルダを「Import」すれば、いつでも編集を再開できます。

### 📥 インストール方法 (How to Install)
1. **Mod本体**: ModrinthまたはReleasesから `fabric` / `neoforge` の `.jar` ファイルをダウンロードし、クライアントおよびサーバーの `mods` フォルダに配置します。
2. **データパック**: ツール(Studio)で出力した `..._datapack` フォルダを、ワールドデータの `world/datapacks/` 内に配置し、`/reload` します。
3. **リソースパック**: ツール(Studio)で出力した `..._resourcepack` フォルダを、クライアントの `resourcepacks/` 内に配置し、ゲーム内設定から適用します（サーバーリソースパックとして配布することも可能です）。

---
<br>

## 🇬🇧 English Documentation

**MC Fishing Pond** is an all-in-one Mod package (supporting both Fabric and NeoForge) and a dedicated desktop tool ("**MC Fishing Pond Studio**") that allows server owners to easily introduce custom fishing items and a competitive scoring system to their Minecraft worlds.

### 🎣 Mod Features
* **Custom Fishing Loot**: Extends the vanilla fishing system to allow players to catch your own uniquely defined custom items with adjustable weights.
* **Synchronized Scoring System**: Catching specific fish awards points, which are perfectly synchronized in real-time across all players on the server, making it perfect for fishing tournaments.
* **Admin Commands**: Secure commands designed for server operators (OP Level 2+).
  * `/fishingpond score add <player> <amount>` - Add points to a player
  * `/fishingpond score reset <player>` - Reset a player's score to 0
  * `/fishingpond give <player> <item_id>` - Directly give a custom fishing item

### 💻 Included Tool: Fishing Pond Studio
No more struggling with broken JSON structures. The bundled Windows desktop application (available seamlessly from [Releases](https://github.com/datsuns/fishingpond/releases)) does all the structural heavy lifting.

1. **Intuitive UI Editing**: Easily configure item display names, catch probabilities (Weight), and awarded scores using sliders and text fields.
2. **In-App Pixel Art Editor**: Toss away external painting software! Switch to "Draw" mode to paint 16x16 pixel art directly inside the tool, which is automatically parsed as a transparent PNG.
3. **One-Click Export**: Click "Export Data & Resource Packs" to automatically assemble a perfectly structured 1.21.4-compliant `datapack` and `resourcepack`.
4. **Import & Edit**: Easily load previously generated packs back into the tool to tweak textures or balance spawn weights.

### 📥 How to Install
1. **The Core Mod**: Download the `fabric` or `neoforge` `.jar` files from Modrinth/Releases and place them into your (and your server's) `mods` folder.
2. **The Datapack**: Place the `..._datapack` folder generated by the Studio tool into your world's `world/datapacks/` folder, then type `/reload` in-game.
3. **The Resourcepack**: Place the `..._resourcepack` folder generated by the Studio tool into your client's `resourcepacks/` directory and enable it in the game settings (or host it as a Server Resource Pack).
