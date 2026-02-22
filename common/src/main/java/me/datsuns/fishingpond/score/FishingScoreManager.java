package me.datsuns.fishingpond.score;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.saveddata.SavedData;
import net.minecraft.world.level.saveddata.SavedDataType;
import net.minecraft.core.HolderLookup;
import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

public class FishingScoreManager extends SavedData {
    private static final String DATA_ID = "fishing_pond_scores";
    private final Map<UUID, Integer> scores = new HashMap<>();

    public FishingScoreManager() {
    }

    public static final Codec<FishingScoreManager> CODEC = RecordCodecBuilder.create(instance -> instance.group(
            Codec.unboundedMap(Codec.STRING, Codec.INT).fieldOf("scores").forGetter(manager -> 
                manager.scores.entrySet().stream().collect(Collectors.toMap(e -> e.getKey().toString(), Map.Entry::getValue))
            )
    ).apply(instance, map -> {
        FishingScoreManager manager = new FishingScoreManager();
        map.forEach((uuidStr, score) -> manager.scores.put(UUID.fromString(uuidStr), score));
        return manager;
    }));

    public static FishingScoreManager get(ServerLevel level) {
        return level.getServer().overworld().getDataStorage().computeIfAbsent(
                new SavedDataType<>(
                        DATA_ID,
                        FishingScoreManager::new,
                        CODEC,
                        net.minecraft.util.datafix.DataFixTypes.LEVEL
                )
        );
    }


    public int getScore(UUID playerUuid) {
        return scores.getOrDefault(playerUuid, 0);
    }

    public void addScore(UUID playerUuid, int amount) {
        scores.put(playerUuid, getScore(playerUuid) + amount);
        setDirty();
    }

    public void setScore(UUID playerUuid, int amount) {
        scores.put(playerUuid, amount);
        setDirty();
    }
    
    public Map<UUID, Integer> getAllScores() {
        return new HashMap<>(scores);
    }
}
