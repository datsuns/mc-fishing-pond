# MC Fishing Pond - Mod Specification

## 概要

Java版Minecraft向けの釣り拡張Mod。  
ユーザーがカスタム釣りアイテムを自由に追加できる仕組みと、釣りに点数の概念を導入する。

| 項目 | 内容 |
|------|------|
| Mod ID | `mc_fishing_pond` |
| パッケージ名 | `me.datsuns.fishingpond` |

---

## 対象バージョン

| 項目 | 内容 |
|------|------|
| Minecraft | Java Edition 1.21.x（最新安定版） |
| Modローダー | **NeoForge**（主要対応）、**Fabric**（対応予定） |

### Modローダーの選定理由

- **NeoForge**: 旧Forgeの後継。1.21以降の主流ローダー。大型Modの多くが移行済み。
- **Fabric**: 軽量・高速アップデート。開発が比較的シンプル。Mod数も多い。
- **Forge（旧）**: 1.21以降はコミュニティが大幅縮小。**非対応とする**。
- **Quilt**: FabricのForkで互換性あり。ユーザーが少なく、**当面は非対応とする**。

> **実装方針**: [Architectury API](https://docs.architectury.dev/) を使って1つのコードベースでNeoForge・Fabric両方に対応することを推奨。

---

## 機能仕様

### 優先度 1: カスタム釣りアイテムの追加（Datapack対応）

ユーザーが **JSONファイル（Datapack）** で釣りアイテムを自由に追加できる。  
Modで定義したアイテムは、バニラの釣りルートテーブルに**追加**される（バニラのアイテムはそのまま残る）。

#### バニラルートテーブルへの統合方針

- NeoForge: `IGlobalLootModifier` を使用してバニラの `gameplay/fishing` ルートテーブルにエントリを注入
- Fabric: `LootTableEvents.MODIFY` イベントで同等の処理を実装
- Architectury経由で両ローダーを共通化

> **実装難易度: 中**  
> NeoForge・Fabric ともに公式APIが整備されており、バニラテーブルへの追加は標準的な手法で実現可能。  
> ただし、本ModはカスタムJSONを動的に読み込んでルートテーブルに反映する必要があるため、  
> 「JSONの読み込みタイミング」と「ルートテーブルの更新タイミング」の調整に注意が必要。

#### データ定義例（JSON）

```json
// data/modname/fishing_items/golden_fish.json
{
  "item": "minecraft:gold_ingot",
  "weight": 10,
  "score": 50,
  "display_name": "ゴールデンフィッシュ",
  "texture": "mc_fishing_pond:item/golden_fish",
  "loot_conditions": []
}
```

| フィールド | 説明 |
|-----------|------|
| `item` | 既存アイテムのID（例: `minecraft:cod`）。`weight` が 0 の時にバニラアイテムとの紐付けに使用。 |
| `weight` | 釣れやすさ（1以上で新規追加アイテムとして機能、0ならバニラアイテムへのスコア調整用） |
| `score` | このアイテムを釣ったときの獲得点数 |
| `display_name` | 表示名（新規追加アイテム用。バニラアイテム調整時は無視されます） |
| `texture` | アイテムの見た目（モデル/テクスチャ。新規追加アイテム用。バニラアイテム調整時は無視されます） |
| `loot_conditions` | 釣れる条件。`[]` または省略で制限なし |

> **IDの挙動について**:  
> - `weight > 0` の場合、アイテムIDはMod独自の `mc_fishing_pond:fish` に固定され、`texture` で見た目が変わります。  
> - `weight` が 0 または省略された場合、`item` で指定したバニラアイテムがそのまま釣れ、スコアだけが加算されます。

---

### 優先度 2: 釣り点数システムとUI表示

釣りアイテムを釣るたびに点数が加算され、プレイヤーのスコアが蓄積される。

#### 点数の仕様

- プレイヤーごとに**累計スコア**を管理
- スコアはサーバーデータ（または`playerdata`）に永続保存
- 釣り上げた瞬間にアクションバー（画面下部のテキスト）で獲得点数を通知
- 管理者向けのコマンドを提供
  - スコアリセット: `/fishingpond score reset <player>` / `/fishingpond score reset all`
  - アイテム取得: `/fishingpond give <player> <item_id>`
    - 例: `/fishingpond give @p golden_fish` （JSONのファイル名で指定可能）

#### サーバー↔クライアント間のデータ同期

- スコアデータはサーバー側で一元管理
- プレイヤーの参加時・スコア更新時にサーバーからクライアントへカスタムパケットで同期
- クライアントはパケット受信後にHUDを更新する

#### HUD表示

- 画面の任意の位置（初期: 右上）に **全プレイヤーの累計スコア一覧** を常時表示
  - 例: `Player1: 120pt / Player2: 80pt / ...`（降順ソート）
- 自分のスコアは強調表示（色分けなど）
- HUD表示は**デフォルトON**
- **サーバー（OP）のみ**、コマンドで特定プレイヤーの表示をON/OFF可能
  - 例: `/fishingpond hud <player> on|off`

---

## 将来的な拡張（バックログ）

- ユーザ用のアイテム生成ユーティリティの作成（カスタムアイテムをより簡単に定義できるツール・テンプレートの提供）
- ランキング機能（サーバー内スコアランキング）
- 釣り竿の強化・カスタマイズ
- 釣りミニゲーム（タイミング合わせUI）
- バイオーム・時間帯別の特別アイテム
- 実績・魚図鑑

---

## 技術スタック（案）

| 項目 | 採用技術 |
|------|---------|
| 言語 | Java 21 |
| ビルドツール | Gradle |
| マルチローダー対応 | Architectury API |
| データ定義 | Datapack（JSON）＋ Codec |
| HUD描画 | `RenderGuiEvent`（NeoForge）/ `HudRenderCallback`（Fabric） |
