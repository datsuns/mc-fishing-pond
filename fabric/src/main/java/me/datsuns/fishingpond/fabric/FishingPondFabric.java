package me.datsuns.fishingpond.fabric;

import me.datsuns.fishingpond.FishingPond;
import net.fabricmc.api.ModInitializer;

public class FishingPondFabric implements ModInitializer {

    @Override
    public void onInitialize() {
        FishingPond.init();
    }
}
