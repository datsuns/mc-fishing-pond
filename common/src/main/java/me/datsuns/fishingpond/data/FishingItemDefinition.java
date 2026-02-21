package me.datsuns.fishingpond.data;

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.core.Holder;
import net.minecraft.world.level.storage.loot.predicates.LootItemCondition;

import java.util.List;
import java.util.Optional;

/**
 * Definition of a custom fishing item loaded from a datapack JSON.
 */
public record FishingItemDefinition(
        ResourceLocation item,
        int weight,
        int score,
        Optional<String> displayName,
        Optional<List<Holder<LootItemCondition>>> lootConditions
) {
    public static final Codec<FishingItemDefinition> CODEC = RecordCodecBuilder.create(instance -> instance.group(
            ResourceLocation.CODEC.fieldOf("item").forGetter(FishingItemDefinition::item),
            Codec.INT.optionalFieldOf("weight", 1).forGetter(FishingItemDefinition::weight),
            Codec.INT.optionalFieldOf("score", 0).forGetter(FishingItemDefinition::score),
            Codec.STRING.optionalFieldOf("display_name").forGetter(FishingItemDefinition::displayName),
            LootItemCondition.CODEC.listOf().optionalFieldOf("loot_conditions").forGetter(FishingItemDefinition::lootConditions)
    ).apply(instance, FishingItemDefinition::new));
}
