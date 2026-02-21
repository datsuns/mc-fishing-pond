package me.datsuns.fishingpond.network;

import dev.architectury.networking.NetworkManager;
import me.datsuns.fishingpond.client.ClientScoreManager;

public class FishingPondNetworking {
    public static void register() {
        // Register the S2C packet
        NetworkManager.registerReceiver(NetworkManager.s2c(), ScoreSyncPacket.TYPE, ScoreSyncPacket.CODEC, (payload, context) -> {
            context.queue(() -> {
                ClientScoreManager.updateScore(payload.playerUuid(), payload.playerName(), payload.score());
            });
        });
    }

    public static void sendScoreUpdate(net.minecraft.server.level.ServerPlayer player, java.util.UUID targetUuid, String targetName, int score) {
        NetworkManager.sendToPlayer(player, new ScoreSyncPacket(targetUuid, targetName, score));
    }
}
