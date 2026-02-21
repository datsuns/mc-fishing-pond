package me.datsuns.fishingpond.loot;

import dev.architectury.event.events.common.LootEvent;
import me.datsuns.fishingpond.FishingPond;
import me.datsuns.fishingpond.data.FishingItemDefinition;
import me.datsuns.fishingpond.data.FishingItemManager;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.Item;
import net.minecraft.world.level.storage.loot.LootPool;
import net.minecraft.world.level.storage.loot.entries.LootItem;
import net.minecraft.world.level.storage.loot.providers.number.ConstantValue;

import java.util.Map;
import java.util.Optional;

/**
 * Injects custom fishing items into the vanilla fishing loot table.
 */
public class LootTableInjector {

    private static final ResourceLocation FISHING_TABLE = ResourceLocation.withDefaultNamespace("gameplay/fishing");

    public static void register() {
        LootEvent.MODIFY_LOOT_TABLE.register((id, context, builtin) -> {
            // Explicitly log EVERYTHING from minecraft namespace to find the correct ID
            if (id.location().getNamespace().equals("minecraft")) {
                FishingPond.LOGGER.info("[FishingPond] Modifying table: {} (builtin: {})", id.location(), builtin);
            }

            if (!builtin) return;
            if (!FISHING_TABLE.equals(id.location())) return;

            FishingPond.LOGGER.info("[FishingPond] Detected fishing loot table modification request");

            FishingItemManager manager = FishingItemManager.getInstance();
            if (manager == null) {
                FishingPond.LOGGER.warn("[FishingPond] FishingItemManager is NULL during injection! This should not happen.");
                return;
            }
            if (manager.getItems().isEmpty()) {
                // If this happens on Fabric at startup, it's the race condition.
                FishingPond.LOGGER.warn("[FishingPond] FishingItemManager is EMPTY during injection! If this is startup, try running /reload later.");
                return;
            }

            LootPool.Builder poolBuilder = LootPool.lootPool()
                    .setRolls(ConstantValue.exactly(1));

            boolean hasEntries = false;
            FishingPond.LOGGER.info("[FishingPond] Injecting {} items into fishing pool", manager.getItems().size());
            for (Map.Entry<ResourceLocation, FishingItemDefinition> entry : manager.getItems().entrySet()) {
                FishingItemDefinition definition = entry.getValue();
                Optional<Item> itemOpt = BuiltInRegistries.ITEM.getOptional(definition.item());

                if (itemOpt.isEmpty()) {
                    FishingPond.LOGGER.warn("[FishingPond] Unknown item: {}", definition.item());
                    continue;
                }

                FishingPond.LOGGER.info("[FishingPond]  -> Adding item: {} (weight: {})", definition.item(), definition.weight());
                LootItem.Builder<?> lootEntry = LootItem.lootTableItem(itemOpt.get())
                        .setWeight(definition.weight());

                poolBuilder.add(lootEntry);
                hasEntries = true;
            }

            if (hasEntries) {
                context.addPool(poolBuilder);
                FishingPond.LOGGER.info("[FishingPond] Successfully injected custom pool into fishing loot table");
            } else {
                FishingPond.LOGGER.warn("[FishingPond] No valid entries found to inject!");
            }
        });
    }
}
