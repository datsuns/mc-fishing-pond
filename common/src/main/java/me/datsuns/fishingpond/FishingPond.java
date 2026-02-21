package me.datsuns.fishingpond;

import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import dev.architectury.event.events.common.CommandRegistrationEvent;
import dev.architectury.registry.ReloadListenerRegistry;
import me.datsuns.fishingpond.data.FishingItemManager;
import me.datsuns.fishingpond.loot.LootTableInjector;
import me.datsuns.fishingpond.network.FishingPondNetworking;
import me.datsuns.fishingpond.score.FishingScoreManager;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.commands.arguments.EntityArgument;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.packs.PackType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FishingPond {

    public static final String MOD_ID = "mc_fishing_pond";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    public static void init() {
        LOGGER.info("[FishingPond] Initializing...");
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
                                                }))))));
    }
}
