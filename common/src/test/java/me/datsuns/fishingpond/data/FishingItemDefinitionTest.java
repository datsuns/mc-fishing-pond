package me.datsuns.fishingpond.data;

import com.google.gson.JsonParser;
import com.mojang.serialization.JsonOps;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.Identifier;
import net.minecraft.util.datafix.DataFixers;
import net.minecraft.world.flag.FeatureFlags;
import net.minecraft.world.level.storage.loot.BuiltInLootTables;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class FishingItemDefinitionTest {

    @BeforeAll
    static void bootstrap() {
        // Minecraft needs its registries initialized before we can use Identifier/CODEC
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
        assertEquals(Identifier.parse("minecraft:gold_ingot"), def.item().orElseThrow());
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
        assertEquals(Identifier.parse("minecraft:emerald"), def.item().orElseThrow(), "Item identifier should match");
        assertEquals(0, def.weight(), "Default weight should be 0");
        assertEquals(0, def.score(), "Default score should be 0");
    }

    @Test
    void testTextureField() {
        String json = """
            {
                "texture": "mc_fishing_pond:item/golden_fish",
                "weight": 5
            }
            """;
        var result = FishingItemDefinition.CODEC.parse(JsonOps.INSTANCE, JsonParser.parseString(json));
        assertTrue(result.isSuccess());

        FishingItemDefinition def = result.getOrThrow();
        assertTrue(def.texture().isPresent());
        assertEquals(Identifier.parse("mc_fishing_pond:item/golden_fish"), def.texture().get());
        assertEquals(5, def.weight());
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
