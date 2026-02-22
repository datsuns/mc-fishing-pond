package me.datsuns.fishingpond.network;

import me.datsuns.fishingpond.FishingPond;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.Identifier;

import java.util.UUID;

public record ScoreSyncPacket(UUID playerUuid, String playerName, int score) implements CustomPacketPayload {
    public static final Type<ScoreSyncPacket> TYPE = new Type<>(Identifier.fromNamespaceAndPath(FishingPond.MOD_ID, "score_sync"));

    public static final StreamCodec<RegistryFriendlyByteBuf, ScoreSyncPacket> CODEC = StreamCodec.composite(
            net.minecraft.core.UUIDUtil.STREAM_CODEC, ScoreSyncPacket::playerUuid,
            ByteBufCodecs.STRING_UTF8, ScoreSyncPacket::playerName,
            ByteBufCodecs.VAR_INT, ScoreSyncPacket::score,
            ScoreSyncPacket::new
    );

    @Override
    public Type<? extends CustomPacketPayload> type() {
        return TYPE;
    }
}
