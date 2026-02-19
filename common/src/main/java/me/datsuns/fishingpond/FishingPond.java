package me.datsuns.fishingpond;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class FishingPond {

    public static final String MOD_ID = "mc_fishing_pond";
    public static final Logger LOGGER = LoggerFactory.getLogger(MOD_ID);

    public static void init() {
        LOGGER.info("[FishingPond] Hello from common!");
    }
}
