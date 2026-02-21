package me.datsuns.fishingpond.data;

import com.mojang.logging.LogUtils;
import net.minecraft.resources.FileToIdConverter;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.resources.ResourceManager;
import net.minecraft.server.packs.resources.SimpleJsonResourceReloadListener;
import net.minecraft.util.profiling.ProfilerFiller;
import org.slf4j.Logger;

import java.util.Collections;
import java.util.Map;

/**
 * Loads and manages custom fishing items from datapacks.
 */
public class FishingItemManager extends SimpleJsonResourceReloadListener<FishingItemDefinition> {

    private static final Logger LOGGER = LogUtils.getLogger();
    private static final String FOLDER_NAME = "fishing_items";

    private volatile Map<ResourceLocation, FishingItemDefinition> items = Collections.emptyMap();
    private static FishingItemManager instance;

    public FishingItemManager() {
        super(FishingItemDefinition.CODEC, FileToIdConverter.json(FOLDER_NAME));
        instance = this;
    }

    public static FishingItemManager getInstance() {
        return instance;
    }

    public Map<ResourceLocation, FishingItemDefinition> getItems() {
        if (items.isEmpty()) {
            // Log this so we can see if it's called too early
            // LOGGER.debug("FishingItemManager.getItems() called but map is empty.");
        }
        return items;
    }

    @Override
    protected Map<ResourceLocation, FishingItemDefinition> prepare(ResourceManager resourceManager, ProfilerFiller profiler) {
        LOGGER.info("[FishingPond] FishingItemManager: Preparing data...");
        Map<ResourceLocation, FishingItemDefinition> prepared = super.prepare(resourceManager, profiler);
        this.items = Map.copyOf(prepared);
        LOGGER.info("[FishingPond] FishingItemManager: Prepared {} items in worker thread", this.items.size());
        return prepared;
    }

    @Override
    protected void apply(Map<ResourceLocation, FishingItemDefinition> object, ResourceManager resourceManager, ProfilerFiller profiler) {
        this.items = Map.copyOf(object);
        LOGGER.info("Loaded {} custom fishing items", this.items.size());
    }
}
