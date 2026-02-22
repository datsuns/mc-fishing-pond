package me.datsuns.fishingpond.registry;

import dev.architectury.registry.registries.DeferredRegister;
import dev.architectury.registry.registries.RegistrySupplier;
import me.datsuns.fishingpond.FishingPond;
import net.minecraft.core.registries.Registries;
import net.minecraft.resources.ResourceKey;
import net.minecraft.resources.Identifier;
import net.minecraft.world.item.Item;

public class ModItems {
    public static final DeferredRegister<Item> ITEMS = DeferredRegister.create(FishingPond.MOD_ID, Registries.ITEM);

    public static final RegistrySupplier<Item> FISH = ITEMS.register("fish", () -> 
            new Item(new Item.Properties().setId(ResourceKey.create(Registries.ITEM, Identifier.fromNamespaceAndPath(FishingPond.MOD_ID, "fish")))));

    public static void register() {
        ITEMS.register();
    }
}
