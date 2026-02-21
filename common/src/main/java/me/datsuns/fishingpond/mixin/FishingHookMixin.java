package me.datsuns.fishingpond.mixin;

import me.datsuns.fishingpond.FishingPond;
import me.datsuns.fishingpond.data.FishingItemDefinition;
import me.datsuns.fishingpond.data.FishingItemManager;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.entity.projectile.FishingHook;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.storage.loot.LootParams;
import net.minecraft.world.level.storage.loot.LootTable;
import org.spongepowered.asm.mixin.Mixin;
import org.spongepowered.asm.mixin.Shadow;
import org.spongepowered.asm.mixin.injection.At;
import org.spongepowered.asm.mixin.injection.Inject;
import org.spongepowered.asm.mixin.injection.callback.CallbackInfoReturnable;
import org.spongepowered.asm.mixin.injection.callback.LocalCapture;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Mixin(FishingHook.class)
public abstract class FishingHookMixin {

    @Shadow public abstract Player getPlayerOwner();

    @Inject(
            method = "retrieve",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/world/level/storage/loot/LootTable;getRandomItems(Lnet/minecraft/world/level/storage/loot/LootParams;)Lit/unimi/dsi/fastutil/objects/ObjectArrayList;"),
            locals = LocalCapture.CAPTURE_FAILHARD
    )
    private void onGetRandomItems(ItemStack stack, CallbackInfoReturnable<Integer> cir, 
                                  Player player, int i, LootParams lootParams, LootTable lootTable) {
        // This is called just before getRandomItems. 
        // We can't easily modify the return value of getRandomItems here without Redirect or ModifyVariable.
        // But we can use the locals to get the LootParams.
    }

    @Inject(
            method = "retrieve",
            at = @At(value = "INVOKE", target = "Lnet/minecraft/world/advancements/critereon/FishingRodHookedTrigger;trigger(Lnet/minecraft/server/level/ServerPlayer;Lnet/minecraft/world/item/ItemStack;Lnet/minecraft/world/entity/projectile/FishingHook;Ljava/util/Collection;)V"),
            locals = LocalCapture.CAPTURE_FAILHARD
    )
    private void onTriggerFishingRodHooked(ItemStack stack, CallbackInfoReturnable<Integer> cir,
                                           Player player, int i, LootParams lootParams, LootTable lootTable, List<ItemStack> loot) {
        
        FishingItemManager manager = FishingItemManager.getInstance();
        if (manager == null || manager.getItems().isEmpty()) return;

        FishingPond.LOGGER.info("[FishingPond] Manual loot injection via Mixin for player: {}", player.getName().getString());
        
        // Use a simple weighted selection or just add all for testing?
        // Let's use the same logic as the loot pool: roll for each item based on its weight.
        // But wait, the vanilla fishing loot table is a "pick one" from pools.
        // To emulate "adding to the pool", we should combine the vanilla loot with our loot list and pick.
        
        // Actually, a simpler way is to roll our own pool here and add to the 'loot' list.
        List<FishingItemDefinition> customItems = new ArrayList<>(manager.getItems().values());
        int totalWeight = customItems.stream().mapToInt(FishingItemDefinition::weight).sum();
        
        // Note: Vanilla fishing has a total weight of ~100. If our item has weight 1000, it should be very likely.
        // However, the vanilla loot is ALWAYS generated. 
        // If we want to REPLACE or COMPETE with vanilla loot, we need a more complex Mixin.
        // But the requirement says "ADD" to the vanilla loot table.
        // In Datapack, adding a pool means we get one more roll.
        
        // Let's roll for one custom item if we are lucky.
        // Or better: just roll from our collection.
        if (totalWeight > 0) {
            int roll = player.getRandom().nextInt(totalWeight + 100); // 100 is approx vanilla total weight
            if (roll < totalWeight) {
                int current = 0;
                for (FishingItemDefinition def : customItems) {
                    current += def.weight();
                    if (roll < current) {
                        Optional<Item> itemOpt = BuiltInRegistries.ITEM.getOptional(def.item());
                        if (itemOpt.isPresent()) {
                            loot.add(new ItemStack(itemOpt.get()));
                            FishingPond.LOGGER.info("[FishingPond] Injected custom item: {}", def.item());
                        }
                        break;
                    }
                }
            }
        }
    }
}
