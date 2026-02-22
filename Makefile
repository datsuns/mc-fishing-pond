.PHONY: run-fabric run-neoforge build clean

# ==========================================
# 開発用ショートカットコマンド
# ==========================================

# 開発用データを適用して Fabric クライアントを起動する
run-fabric:
	./gradlew :fabric:runClient -PuseTestData

# 開発用データを適用して NeoForge クライアントを起動する
run-neoforge:
	./gradlew :neoforge:runClient -PuseTestData

# 本番用のクリーンビルド（テスト用データは混入しません）
build:
	./gradlew clean build

# クリーンアップ
clean:
	./gradlew clean
