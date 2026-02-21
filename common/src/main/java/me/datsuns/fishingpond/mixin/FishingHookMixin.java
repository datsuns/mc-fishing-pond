package me.datsuns.fishingpond.mixin;

import me.datsuns.fishingpond.FishingPond;
import me.datsuns.fishingpond.data.FishingItemDefinition;
import me.datsuns.fishingpond.data.FishingItemManager;
import me.datsuns.fishingpond.network.FishingPondNetworking;
import me.datsuns.fishingpond.registry.ModItems;
import me.datsuns.fishingpond.score.FishingScoreManager;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.FishingHook;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.core.component.DataComponents;
import net.minecraft.network.chat.Component;
import net.minecraft.world.level.storage.loot.LootParams;
import net.minecraft.world.level.storage.loot.LootTable;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Redirect;

import java.util.ArrayList;
import java.util.Collection;
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
        
        FishingPond.LOGGER.info("[FishingPond] Mixin: redirectGetRandomItems called. Vanilla loot size: {}", loot.size());
        
        FishingItemManager manager = FishingItemManager.getInstance();
        if (manager != null && !manager.getItems().isEmpty()) {
            List<FishingItemDefinition> customItems = new ArrayList<>(manager.getItems().values());
            int totalWeight = customItems.stream().mapToInt(FishingItemDefinition::weight).sum();
            
            if (totalWeight > 0) {
                Player player = this.getPlayerOwner();
                // Vanilla total weight is approx 100 for fish.
                int roll = player.getRandom().nextInt(totalWeight + 100);
                if (roll < totalWeight) {
                    int current = 0;
                    for (FishingItemDefinition def : customItems) {
                        current += def.weight();
                        if (roll < current) {
                            Item item = def.item()
                                    .flatMap(BuiltInRegistries.ITEM::getOptional)
                                    .orElse(ModItems.FISH.get());

                            loot.clear();
                            ItemStack result = new ItemStack(item);
                            
                            // Apply custom name if present
                            def.displayName().ifPresent(displayName -> {
                                result.set(DataComponents.CUSTOM_NAME, Component.literal(displayName));
                                FishingPond.LOGGER.info("[FishingPond] Mixin: applied custom name: {}", displayName);
                            });

                            // Apply custom model if present
                            def.itemModel().ifPresent(modelRes -> {
                                result.set(DataComponents.ITEM_MODEL, modelRes);
                                FishingPond.LOGGER.info("[FishingPond] Mixin: applied custom model: {}", modelRes);
                            });

                            loot.add(result);
                            FishingPond.LOGGER.info("[FishingPond] Mixin successfully injected custom item: {}", BuiltInRegistries.ITEM.getKey(item));

                                // Award score
                                if (def.score() > 0 && player instanceof ServerPlayer serverPlayer) {
                                    FishingScoreManager scoreManager = FishingScoreManager.get(serverPlayer.serverLevel());
                                    scoreManager.addScore(serverPlayer.getUUID(), def.score());
                                    String playerName = serverPlayer.getName().getString();
                                    int totalScore = scoreManager.getScore(serverPlayer.getUUID());
                                    
                                    // Sync to all players so everyone sees the updated scoreboard
                                    for (ServerPlayer p : serverPlayer.getServer().getPlayerList().getPlayers()) {
                                        FishingPondNetworking.sendScoreUpdate(p, serverPlayer.getUUID(), playerName, totalScore);
                                    }
                                    
                                    FishingPond.LOGGER.info("[FishingPond] Added {} points to player: {}. Total: {}", def.score(), playerName, totalScore);
                                }
                            }
                            break;
                        }
                    }
                } else {
                    // Vanilla catch or failed roll - award 1 point for the HUD to show up
                    if (this.getPlayerOwner() instanceof ServerPlayer serverPlayer) {
                        FishingScoreManager scoreManager = FishingScoreManager.get(serverPlayer.serverLevel());
                        scoreManager.addScore(serverPlayer.getUUID(), 1);
                        String playerName = serverPlayer.getName().getString();
                        int totalScore = scoreManager.getScore(serverPlayer.getUUID());
                        for (ServerPlayer p : serverPlayer.getServer().getPlayerList().getPlayers()) {
                            FishingPondNetworking.sendScoreUpdate(p, serverPlayer.getUUID(), playerName, totalScore);
                        }
                        FishingPond.LOGGER.info("[FishingPond] Added 1 point for vanilla catch. Total: {}", totalScore);
                    }
                }
            }
        } else {
            FishingPond.LOGGER.warn("[FishingPond] Mixin: FishingItemManager is NULL or EMPTY during redirection.");
        }

        return loot;
    }
}
