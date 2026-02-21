package me.datsuns.fishingpond.fabric;

import me.datsuns.fishingpond.client.ScoreboardHUD;
import net.fabricmc.api.ClientModInitializer;

public class FishingPondFabricClient implements ClientModInitializer {
    @Override
    public void onInitializeClient() {
        ScoreboardHUD.register();
    }
}
