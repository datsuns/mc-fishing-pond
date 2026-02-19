# Architectury マルチローダー構築 - 注意点・ハマりポイント集

MC Fishing Pond の scaffold 構築（2026-02）で遭遇した問題と解決策をまとめる。

---

## 1. `loom.platform=neoforge` の設定が必須

### 症状
```
neoForge() method not found on DependencyHandler
```
または
```
Loom is not running on NeoForge.
You can switch to it by adding 'loom.platform = neoforge' to your gradle.properties
```

### 原因
Architectury Loom 1.9〜1.13 では、`neoForge` という Gradle configuration は
**`loom.platform=neoforge` が設定されている場合にのみ登録** される。  
この設定がないと `dependencies { neoForge("...") }` 内で configuration が存在せず、エラーになる。

### 解決策
NeoForge サブプロジェクト専用の `gradle.properties` を作成する：

```properties
# neoforge/gradle.properties
loom.platform=neoforge
```

> **注意**: ルートの `gradle.properties` ではなく **`neoforge/gradle.properties`** に書く。  
> ルートに書くと全サブプロジェクト（Fabric含む）に影響してしまう。

---

## 2. Loom バージョンは最新の安定 SNAPSHOT を使う

### 症状
Loom `1.9-SNAPSHOT` などの古いバージョンを使うと警告が出て、一部の API が動作しない：
```
You are using an outdated version of Architectury Loom! This version will not receive any support.
```

### 解決策
最新の SNAPSHOT バージョンを使う（最新一覧は下記で確認）：

```
https://maven.architectury.dev/dev/architectury/architectury-loom/maven-metadata.xml
```

```groovy
// build.gradle (root)
plugins {
    id 'dev.architectury.loom' version '1.13-SNAPSHOT' apply false
}
```

---

## 3. NeoForge Maven リポジトリを明示的に追加する

### 症状
```
Could not find net.neoforged:neoforge:21.4.155.
Searched in the following locations:
  - https://maven.fabricmc.net/...
  - https://repo.maven.apache.org/...
```

### 原因
Loom はデフォルトで Fabric 系のリポジトリしか追加しない。NeoForge の Maven は別途必要。

### 解決策
ルートの `build.gradle` の `subprojects {}` 内に `repositories {}` を追加する：

```groovy
subprojects {
    repositories {
        maven { url 'https://maven.neoforged.net/releases' }
        maven { url 'https://maven.fabricmc.net/' }
        maven { url 'https://maven.architectury.dev/' }
        maven { url 'https://maven.minecraftforge.net/' }
    }
}
```

> **メモ**: `settings.gradle` の `pluginManagement.repositories` はプラグイン解決専用。  
> 依存関係（Mod本体・ライブラリ）の解決には `build.gradle` 側の `repositories {}` が別途必要。

---

## 4. `neoForge()` 依存関係は `afterEvaluate` に入れてはいけない

### 症状
`afterEvaluate {}` 内に `neoForge("...")` を移動すると：
```
Failed to setup Minecraft, java.lang.IllegalArgumentException: No 'neoForge' dependency was specified!
```

### 原因
Loom は **configuration phase（`dependencies {}` ブロック評価時）** に NeoForge 依存関係が
存在することを要求する。`afterEvaluate` は configuration phase の後なので間に合わない。

### 解決策
`loom.platform=neoforge` が設定済みであれば、通常の `dependencies {}` 内に直接記述する：

```groovy
dependencies {
    neoForge("net.neoforged:neoforge:${rootProject.neoforge_version}")
}
```

---

## 5. Gradle Wrapper は手動で準備が必要（gradle 未インストール環境）

### 状況
`gradle` コマンドがシステムにない場合、`gradle wrapper` コマンドが使えないため
`gradle-wrapper.jar` を手動で取得する必要がある。

### 解決策

```bash
mkdir -p gradle/wrapper
curl -sL "https://github.com/gradle/gradle/raw/v8.12.0/gradle/wrapper/gradle-wrapper.jar" \
    -o gradle/wrapper/gradle-wrapper.jar
chmod +x gradlew
```

`gradle/wrapper/gradle-wrapper.properties`:
```properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.12-bin.zip
```

---

## 6. バージョン対応表（MC 1.21.4、2026年2月時点）

| コンポーネント | バージョン |
|--------------|-----------|
| Minecraft | `1.21.4` |
| NeoForge | `21.4.155` |
| Fabric Loader | `0.18.4` |
| Fabric API | `0.110.5+1.21.4` |
| Architectury API | `15.0.3` |
| Architectury Loom | `1.13-SNAPSHOT`（解決版: `1.13.467`） |
| Architectury Plugin | `3.4.162` |
| Gradle | `8.12` |
| Java | `21` |

---

## 参考：ビルドコマンド

```bash
./gradlew :neoforge:build --no-daemon   # NeoForge
./gradlew :fabric:build --no-daemon     # Fabric
./gradlew dependencies --no-daemon      # 依存関係の事前ダウンロード（CI向け）
```
