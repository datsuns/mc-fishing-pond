package me.datsuns.fishingpond.score;

import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.world.level.saveddata.SavedData;
import net.minecraft.core.HolderLookup;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class FishingScoreManager extends SavedData {
    private static final String DATA_ID = "fishing_pond_scores";
    private final Map<UUID, Integer> scores = new HashMap<>();

    public FishingScoreManager() {
    }

    public static FishingScoreManager get(ServerLevel level) {
        return level.getServer().overworld().getDataStorage().computeIfAbsent(
                new SavedData.Factory<>(
                        FishingScoreManager::new,
                        FishingScoreManager::load,
                        null // DataFixer
                ),
                DATA_ID
        );
    }

    public static FishingScoreManager load(CompoundTag tag, HolderLookup.Provider lookupProvider) {
        FishingScoreManager manager = new FishingScoreManager();
        CompoundTag scoresTag = tag.getCompound("scores");
        for (String key : scoresTag.getAllKeys()) {
            try {
                UUID uuid = UUID.fromString(key);
                int score = scoresTag.getInt(key);
                manager.scores.put(uuid, score);
            } catch (IllegalArgumentException ignored) {
            }
        }
        return manager;
    }

    @Override
    public CompoundTag save(CompoundTag tag, HolderLookup.Provider lookupProvider) {
        CompoundTag scoresTag = new CompoundTag();
        for (Map.Entry<UUID, Integer> entry : scores.entrySet()) {
            scoresTag.putInt(entry.getKey().toString(), entry.getValue());
        }
        tag.put("scores", scoresTag);
        return tag;
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
