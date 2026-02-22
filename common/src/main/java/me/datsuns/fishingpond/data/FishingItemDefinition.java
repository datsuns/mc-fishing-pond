package me.datsuns.fishingpond.data;

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import net.minecraft.resources.Identifier;
import net.minecraft.core.Holder;
import net.minecraft.world.level.storage.loot.predicates.LootItemCondition;

import java.util.List;
import java.util.Optional;

/**
 * Definition of a custom fishing item loaded from a datapack JSON.
 */
public record FishingItemDefinition(
        Optional<Identifier> item,
        int weight,
        int score,
        Optional<String> displayName,
        Optional<Identifier> itemModel,
        Optional<Identifier> texture,
        Optional<List<Holder<LootItemCondition>>> lootConditions
) {
    public static final Codec<FishingItemDefinition> CODEC = RecordCodecBuilder.create(instance -> instance.group(
            Codec.STRING.optionalFieldOf("item").xmap(opt -> opt.map(Identifier::parse), opt -> opt.map(Identifier::toString)).forGetter(FishingItemDefinition::item),
            Codec.INT.optionalFieldOf("weight", 0).forGetter(FishingItemDefinition::weight),
            Codec.INT.optionalFieldOf("score", 0).forGetter(FishingItemDefinition::score),
            Codec.STRING.optionalFieldOf("display_name").forGetter(FishingItemDefinition::displayName),
            Codec.STRING.optionalFieldOf("item_model").xmap(opt -> opt.map(Identifier::parse), opt -> opt.map(Identifier::toString)).forGetter(FishingItemDefinition::itemModel),
            Codec.STRING.optionalFieldOf("texture").xmap(opt -> opt.map(Identifier::parse), opt -> opt.map(Identifier::toString)).forGetter(FishingItemDefinition::texture),
            LootItemCondition.CODEC.listOf().optionalFieldOf("loot_conditions").forGetter(FishingItemDefinition::lootConditions)
    ).apply(instance, FishingItemDefinition::new));
}
