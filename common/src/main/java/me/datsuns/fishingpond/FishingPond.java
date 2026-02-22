package me.datsuns.fishingpond;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import dev.architectury.event.events.common.CommandRegistrationEvent;
import dev.architectury.registry.ReloadListenerRegistry;
import me.datsuns.fishingpond.data.FishingItemDefinition;
import me.datsuns.fishingpond.data.FishingItemManager;
import me.datsuns.fishingpond.loot.LootTableInjector;
import me.datsuns.fishingpond.network.FishingPondNetworking;
import me.datsuns.fishingpond.registry.ModItems;
import me.datsuns.fishingpond.score.FishingScoreManager;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.commands.arguments.EntityArgument;
import net.minecraft.commands.arguments.ResourceLocationArgument;
import net.minecraft.core.component.DataComponents;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.PackType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FishingPond {

    public static final String MOD_ID = "mc_fishing_pond";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    public static void init() {
        LOGGER.info("[FishingPond] Initializing...");
        ModItems.register();
        ReloadListenerRegistry.register(PackType.SERVER_DATA, new FishingItemManager(),
                ResourceLocation.fromNamespaceAndPath(MOD_ID, "fishing_items"));
        LootTableInjector.register();
        FishingPondNetworking.register();

        dev.architectury.event.events.common.PlayerEvent.PLAYER_JOIN.register(player -> {
            // Sync all scores to the joining player
            FishingScoreManager scoreManager = FishingScoreManager.get(player.serverLevel());
            scoreManager.getAllScores().forEach((uuid, score) -> {
                // Try to get the name from the server's player list
                String name = "Unknown";
                net.minecraft.server.level.ServerPlayer targetPlayer = player.getServer().getPlayerList().getPlayer(uuid);
                if (targetPlayer != null) {
                    name = targetPlayer.getName().getString();
                }
                FishingPondNetworking.sendScoreUpdate(player, uuid, name, score);
            });
        });

        CommandRegistrationEvent.EVENT.register((dispatcher, registry, selection) -> {
            registerCommands(dispatcher);
        });
    }

    private static void registerCommands(CommandDispatcher<CommandSourceStack> dispatcher) {
        dispatcher.register(Commands.literal("fishingpond")
                .then(Commands.literal("score")
                        .then(Commands.literal("reset")
                                .then(Commands.argument("player", EntityArgument.player())
                                        .executes(context -> {
                                            ServerPlayer player = EntityArgument.getPlayer(context, "player");
                                            FishingScoreManager manager = FishingScoreManager.get(player.serverLevel());
                                            manager.setScore(player.getUUID(), 0);
                                            FishingPondNetworking.sendScoreUpdate(player, player.getUUID(), player.getName().getString(), 0);
                                            context.getSource().sendSuccess(() -> net.minecraft.network.chat.Component.literal("Reset score for " + player.getName().getString()), true);
                                            return 1;
                                        })))
                        .then(Commands.literal("add")
                                .then(Commands.argument("player", EntityArgument.player())
                                        .then(Commands.argument("amount", IntegerArgumentType.integer())
                                                .executes(context -> {
                                                    ServerPlayer player = EntityArgument.getPlayer(context, "player");
                                                    int amount = IntegerArgumentType.getInteger(context, "amount");
                                                    FishingScoreManager manager = FishingScoreManager.get(player.serverLevel());
                                                    manager.addScore(player.getUUID(), amount);
                                                    int newScore = manager.getScore(player.getUUID());
                                                    FishingPondNetworking.sendScoreUpdate(player, player.getUUID(), player.getName().getString(), newScore);
                                                    context.getSource().sendSuccess(() -> net.minecraft.network.chat.Component.literal("Added " + amount + " to " + player.getName().getString() + ". New score: " + newScore), true);
                                                    return 1;
                                                })))))
                .then(Commands.literal("give")
                        .requires(source -> source.hasPermission(2))
                        .then(Commands.argument("player", EntityArgument.player())
                                .then(Commands.argument("item_id", ResourceLocationArgument.id())
                                        .suggests((context, builder) -> {
                                            FishingItemManager.getInstance().getItems().keySet().forEach(id -> builder.suggest(id.toString()));
                                            return builder.buildFuture();
                                        })
                                        .executes(context -> {
                                            ServerPlayer player = EntityArgument.getPlayer(context, "player");
                                            ResourceLocation itemId = ResourceLocationArgument.getId(context, "item_id");
                                            
                                            FishingItemDefinition def = FishingItemManager.getInstance().getItems().get(itemId);
                                            if (def == null) {
                                                context.getSource().sendFailure(Component.literal("Unknown custom fishing item: " + itemId));
                                                return 0;
                                            }

                                            // 新規アイテムまたはバニラアイテムのベースを決定
                                            ItemStack stack;
                                            if (def.weight() > 0 || def.item().isEmpty()) {
                                                stack = new ItemStack(ModItems.FISH.get());
                                            } else {
                                                var itemOpt = net.minecraft.core.registries.BuiltInRegistries.ITEM.getOptional(def.item().get());
                                                if (itemOpt.isPresent()) {
                                                    stack = new ItemStack(itemOpt.get());
                                                } else {
                                                    context.getSource().sendFailure(Component.literal("Base item not found: " + def.item().get()));
                                                    return 0;
                                                }
                                            }

                                            // 見た目の設定（新規アイテムの場合のみ、または定義があれば）
                                            def.displayName().ifPresent(name -> stack.set(DataComponents.CUSTOM_NAME, Component.literal(name)));
                                            def.texture().or(def::itemModel).ifPresent(res -> stack.set(DataComponents.ITEM_MODEL, res));

                                            if (player.getInventory().add(stack)) {
                                                context.getSource().sendSuccess(() -> Component.literal("Gave 1x [" + (def.displayName().orElse(itemId.getPath())) + "] to " + player.getName().getString()), true);
                                                return 1;
                                            } else {
                                                context.getSource().sendFailure(Component.literal("Player inventory is full"));
                                                return 0;
                                            }
                                        })))));
    }
}
