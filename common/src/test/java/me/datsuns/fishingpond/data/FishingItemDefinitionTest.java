package me.datsuns.fishingpond.data;

import com.google.gson.JsonParser;
import com.mojang.serialization.JsonOps;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.util.datafix.DataFixers;
import net.minecraft.world.flag.FeatureFlags;
import net.minecraft.world.level.storage.loot.BuiltInLootTables;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FishingItemDefinitionTest {

    @BeforeAll
    static void bootstrap() {
        // Minecraft needs its registries initialized before we can use ResourceLocation/CODEC
        net.minecraft.SharedConstants.tryDetectVersion();
        net.minecraft.server.Bootstrap.bootStrap();
    }

    @Test
    void testParseBasicDefinition() {
        String json = """
            {
                "item": "minecraft:gold_ingot",
                "weight": 10,
                "score": 50
            }
            """;
        var result = FishingItemDefinition.CODEC.parse(JsonOps.INSTANCE, JsonParser.parseString(json));
        assertTrue(result.isSuccess(), () -> "Codec should succeed but got: " + result.error().map(e -> e.message()).orElse("unknown"));

        FishingItemDefinition def = result.getOrThrow();
        assertEquals(ResourceLocation.parse("minecraft:gold_ingot"), def.item());
        assertEquals(10, def.weight());
        assertEquals(50, def.score());
        assertTrue(def.displayName().isEmpty());
        assertTrue(def.lootConditions().isEmpty());
    }

    @Test
    void testDefaultWeightAndScore() {
        String json = """
            {
                "item": "minecraft:emerald"
            }
            """;
        var result = FishingItemDefinition.CODEC.parse(JsonOps.INSTANCE, JsonParser.parseString(json));
        assertTrue(result.isSuccess());

        FishingItemDefinition def = result.getOrThrow();
        assertEquals(1, def.weight(), "Default weight should be 1");
        assertEquals(0, def.score(), "Default score should be 0");
    }

    @Test
    void testOptionalDisplayName() {
        String json = """
            {
                "item": "minecraft:diamond",
                "display_name": "キラキラダイヤ"
            }
            """;
        var result = FishingItemDefinition.CODEC.parse(JsonOps.INSTANCE, JsonParser.parseString(json));
        assertTrue(result.isSuccess());

        FishingItemDefinition def = result.getOrThrow();
        assertTrue(def.displayName().isPresent());
        assertEquals("キラキラダイヤ", def.displayName().get());
    }
}
