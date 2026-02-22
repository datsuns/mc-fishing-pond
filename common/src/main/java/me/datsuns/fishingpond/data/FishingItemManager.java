package me.datsuns.fishingpond.data;

import com.mojang.logging.LogUtils;
import net.minecraft.resources.FileToIdConverter;
import net.minecraft.resources.Identifier;
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

    private volatile Map<Identifier, FishingItemDefinition> items = Collections.emptyMap();
    private static FishingItemManager instance;

    public FishingItemManager() {
        super(FishingItemDefinition.CODEC, FileToIdConverter.json(FOLDER_NAME));
        instance = this;
    }

    public static FishingItemManager getInstance() {
        return instance;
    }

    public Map<Identifier, FishingItemDefinition> getItems() {
        if (items.isEmpty()) {
            // Log this so we can see if it's called too early
            // LOGGER.debug("FishingItemManager.getItems() called but map is empty.");
        }
        return items;
    }

    @Override
    protected Map<Identifier, FishingItemDefinition> prepare(ResourceManager resourceManager, ProfilerFiller profiler) {
        LOGGER.info("[FishingPond] FishingItemManager: Preparing data...");
        Map<Identifier, FishingItemDefinition> prepared = super.prepare(resourceManager, profiler);
        this.items = Map.copyOf(prepared);
        LOGGER.info("[FishingPond] FishingItemManager: Prepared {} items in worker thread", this.items.size());
        return prepared;
    }

    @Override
    protected void apply(Map<Identifier, FishingItemDefinition> object, ResourceManager resourceManager, ProfilerFiller profiler) {
        this.items = Map.copyOf(object);
        LOGGER.info("[FishingPond] Loaded {} custom fishing definitions", this.items.size());
        this.items.forEach((id, def) -> {
            if (def.weight() > 0) {
                String textureInfo = def.texture()
                    .or(def::itemModel)
                    .map(Identifier::toString)
                    .orElse("NONE");
                LOGGER.info("[FishingPond]  - [NEW ITEM] {}: weight={}, score={}, texture={}, name={}", 
                    id, def.weight(), def.score(), textureInfo, def.displayName().orElse("unnamed"));
            } else if (def.item().isPresent()) {
                LOGGER.info("[FishingPond]  - [VANILLA OVERRIDE] {}: target={}, score={}", 
                    id, def.item().get(), def.score());
            } else {
                LOGGER.warn("[FishingPond]  - [UNKNOWN] {}: weight is 0 and no item specified", id);
            }
        });
    }
}
