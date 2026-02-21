package me.datsuns.fishingpond.client;

import dev.architectury.event.events.client.ClientGuiEvent;
import me.datsuns.fishingpond.FishingPond;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.network.chat.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

public class ScoreboardHUD {
    public static void register() {
        ClientGuiEvent.RENDER_HUD.register((graphics, tickCounter) -> {
            render(graphics);
        });
    }

    private static void render(GuiGraphics graphics) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.options.hideGui || mc.gameMode == null) return;

        Map<UUID, Integer> scores = ClientScoreManager.getAllScores();
        if (scores.isEmpty()) return;
        
        Font font = mc.font;
        int x = graphics.guiWidth() - 10;
        int y = 10;

        List<Map.Entry<UUID, Integer>> sortedScores = new ArrayList<>(scores.entrySet());
        sortedScores.sort((a, b) -> b.getValue().compareTo(a.getValue()));

        graphics.drawString(font, Component.literal("§6--- Fishing Stats ---"), x - font.width("--- Fishing Stats ---"), y, 0xFFFFFF, true);
        y += 12;

        for (Map.Entry<UUID, Integer> entry : sortedScores) {
            String name = ClientScoreManager.getName(entry.getKey());
            String text = name + ": " + entry.getValue();
            graphics.drawString(font, Component.literal(text), x - font.width(text), y, 0xFFFFFF, true);
            y += 10;
        }
    }
}
