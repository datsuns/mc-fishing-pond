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
            if (!builtin) return;
            if (!FISHING_TABLE.equals(id.location())) return;

            FishingItemManager manager = FishingItemManager.getInstance();
            if (manager == null || manager.getItems().isEmpty()) return;

            LootPool.Builder poolBuilder = LootPool.lootPool()
                    .setRolls(ConstantValue.exactly(1));

            boolean hasEntries = false;
            for (Map.Entry<ResourceLocation, FishingItemDefinition> entry : manager.getItems().entrySet()) {
                FishingItemDefinition definition = entry.getValue();
                Optional<Item> itemOpt = BuiltInRegistries.ITEM.getOptional(definition.item());

                if (itemOpt.isEmpty()) {
                    FishingPond.LOGGER.warn("[FishingPond] Unknown item: {}", definition.item());
                    continue;
                }

                LootItem.Builder<?> lootEntry = LootItem.lootTableItem(itemOpt.get())
                        .setWeight(definition.weight());

                poolBuilder.add(lootEntry);
                hasEntries = true;
            }

            if (hasEntries) {
                context.addPool(poolBuilder);
                FishingPond.LOGGER.info("[FishingPond] Injected {} custom item(s) into fishing loot table", manager.getItems().size());
            }
        });
    }
}
