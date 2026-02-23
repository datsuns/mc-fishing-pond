package me.datsuns.fishingpond.mixin;

import me.datsuns.fishingpond.FishingPond;
import me.datsuns.fishingpond.data.FishingItemDefinition;
import me.datsuns.fishingpond.data.FishingItemManager;
import me.datsuns.fishingpond.network.FishingPondNetworking;
import me.datsuns.fishingpond.registry.ModItems;
import me.datsuns.fishingpond.score.FishingScoreManager;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.FishingHook;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.core.component.DataComponents;
import net.minecraft.network.chat.Component;
import net.minecraft.world.level.storage.loot.LootParams;
import net.minecraft.world.level.storage.loot.LootTable;
import net.minecraft.resources.Identifier;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

import java.util.List;
import java.util.Optional;

@Mixin(FishingHook.class)
public abstract class FishingHookMixin {

    @Shadow public abstract Player getPlayerOwner();

    @Redirect(
            method = "retrieve",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/world/level/storage/loot/LootTable;getRandomItems(Lnet/minecraft/world/level/storage/loot/LootParams;)Lit/unimi/dsi/fastutil/objects/ObjectArrayList;")
    )
    private ObjectArrayList<ItemStack> redirectGetRandomItems(LootTable instance, LootParams params) {
        ObjectArrayList<ItemStack> loot = instance.getRandomItems(params);
        Player player = this.getPlayerOwner();
        if (player == null) return loot;
        
        FishingItemManager manager = FishingItemManager.getInstance();
        boolean hasCustomItems = manager != null && !manager.getItems().isEmpty();

        if (hasCustomItems) {
            // 1. 新規アイテム定義（weight > 0）のみを抽出
            List<FishingItemDefinition> customPool = manager.getItems().values().stream()
                    .filter(def -> def.weight() > 0)
                    .toList();
            int totalCustomWeight = customPool.stream().mapToInt(FishingItemDefinition::weight).sum();

            // 2. 独自抽選 (バニラの重みを 約100 と仮定)
            int roll = player.getRandom().nextInt(totalCustomWeight + 100);
            
            if (roll < totalCustomWeight) {
                int current = 0;
                for (FishingItemDefinition def : customPool) {
                    current += def.weight();
                    if (roll < current) {
                        loot.clear();
                        // 新規アイテムはバニラのレジストリから直接取得 (RegistrySupplierのMixinエラー回避のため)
                        Item fishItem = BuiltInRegistries.ITEM.getValue(Identifier.fromNamespaceAndPath(FishingPond.MOD_ID, "fish"));
                        ItemStack result = new ItemStack(fishItem);
                        
                        // 表示名の適用
                        def.displayName().ifPresent(name -> 
                            result.set(DataComponents.CUSTOM_NAME, Component.literal(name)));

                        // テクスチャ/モデルの適用 (texture 優先)
                        def.texture().or(def::itemModel).ifPresent(res -> {
                            // 1.21.4+ expects the ITEM_MODEL component to point to an item definition in assets/namespace/items/
                            // If the datapack defines "mc_fishing_pond:item/golden_fish", we strip "item/" to get "mc_fishing_pond:golden_fish"
                            String path = res.getPath();
                            if (path.startsWith("item/")) {
                                path = path.substring(5);
                            }
                            net.minecraft.resources.ResourceKey<net.minecraft.client.renderer.item.ItemModel.Unbaked> fakeKey = 
                                net.minecraft.resources.ResourceKey.create(
                                    net.minecraft.core.registries.Registries.ITEM_MODEL, 
                                    Identifier.fromNamespaceAndPath(res.getNamespace(), path)
                                );
                            // Or simply setting it as Identifier (since the component accepts Identifier)
                            result.set(DataComponents.ITEM_MODEL, Identifier.fromNamespaceAndPath(res.getNamespace(), path));
                        });

                        loot.add(result);
                        FishingPond.LOGGER.info("[FishingPond] Custom item caught: {}", def.displayName().orElse("unnamed"));
                        
                        applyScore(player, def.score());
                        return loot;
                    }
                }
            }
        }

        // 3. バニラ抽選の結果または未当選時の処理
        if (!loot.isEmpty()) {
            ItemStack vanillaStack = loot.get(0);
            Identifier vanillaId = BuiltInRegistries.ITEM.getKey(vanillaStack.getItem());
            
            // バニラアイテムへのスコア定義（weight <= 0 かつ item ID が一致）を検索
            Optional<FishingItemDefinition> override = Optional.empty();
            if (hasCustomItems) {
                override = manager.getItems().values().stream()
                        .filter(def -> def.weight() <= 0 && def.item().isPresent() && def.item().get().equals(vanillaId))
                        .findFirst();
            }

            if (override.isPresent()) {
                int score = override.get().score();
                applyScore(player, score);
                FishingPond.LOGGER.info("[FishingPond] Applying score override for {}: +{} points", vanillaId, score);
            } else {
                // 定義が見つからない場合（デバッグログ）
                FishingPond.LOGGER.info("[FishingPond] No score definition found/loaded for vanilla item: {}", vanillaId);
                // デフォルトとして 0 点（加算なし）にする
                applyScore(player, 0);
            }
        }

        return loot;
    }

    private void applyScore(Player player, int score) {
        if (score > 0 && player instanceof ServerPlayer serverPlayer) {
            FishingScoreManager scoreManager = FishingScoreManager.get((net.minecraft.server.level.ServerLevel) serverPlayer.level());
            scoreManager.addScore(serverPlayer.getUUID(), score);
            String playerName = serverPlayer.getName().getString();
            int totalScore = scoreManager.getScore(serverPlayer.getUUID());
            
            for (ServerPlayer p : serverPlayer.level().getServer().getPlayerList().getPlayers()) {
                FishingPondNetworking.sendScoreUpdate(p, serverPlayer.getUUID(), playerName, totalScore);
            }
            FishingPond.LOGGER.info("[FishingPond] Score update: {} gained {} points. Total: {}", playerName, score, totalScore);
        }
    }
}
