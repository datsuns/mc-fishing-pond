package me.datsuns.fishingpond.client;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class ClientScoreManager {
    private static final Map<UUID, Integer> SCORES = new HashMap<>();
    private static final Map<UUID, String> NAMES = new HashMap<>();

    public static void updateScore(UUID uuid, String name, int score) {
        SCORES.put(uuid, score);
        NAMES.put(uuid, name);
    }

    public static String getName(UUID uuid) {
        return NAMES.getOrDefault(uuid, "Unknown");
    }

    public static int getScore(UUID uuid) {
        return SCORES.getOrDefault(uuid, 0);
    }

    public static Map<UUID, Integer> getAllScores() {
        return new HashMap<>(SCORES);
    }
}
