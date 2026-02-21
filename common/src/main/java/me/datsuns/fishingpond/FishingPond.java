package me.datsuns.fishingpond;

import dev.architectury.registry.ReloadListenerRegistry;
import me.datsuns.fishingpond.data.FishingItemManager;
import me.datsuns.fishingpond.loot.LootTableInjector;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.PackType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FishingPond {

    public static final String MOD_ID = "mc_fishing_pond";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    public static void init() {
        LOGGER.info("[FishingPond] Initializing...");
        ReloadListenerRegistry.register(PackType.SERVER_DATA, new FishingItemManager(),
                ResourceLocation.fromNamespaceAndPath(MOD_ID, "fishing_items"));
        LootTableInjector.register();
    }
}
