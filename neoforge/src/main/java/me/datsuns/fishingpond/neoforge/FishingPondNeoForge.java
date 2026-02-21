package me.datsuns.fishingpond.neoforge;

import me.datsuns.fishingpond.FishingPond;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;

@Mod(FishingPond.MOD_ID)
public class FishingPondNeoForge {

    public FishingPondNeoForge(IEventBus modEventBus) {
        FishingPond.init();
        if (net.neoforged.fml.loading.FMLEnvironment.dist == net.neoforged.api.distmarker.Dist.CLIENT) {
            me.datsuns.fishingpond.client.ScoreboardHUD.register();
        }
    }
}
