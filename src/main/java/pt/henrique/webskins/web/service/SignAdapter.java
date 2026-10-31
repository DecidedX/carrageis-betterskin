package pt.henrique.webskins.web.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import pt.henrique.webskins.WebSkins;
import pt.henrique.webskins.config.ConfigManager;
import pt.henrique.webskins.database.Database;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.logging.Logger;

public class SignAdapter {
    private final MineSkinService mineSkinService;
    private final SelfTextureSigner selfTextureSigner;
    private final ConfigManager configManager;
    private final Logger log;
    private final JsonArray availableCapes;

    public SignAdapter(WebSkins plugin) {
        InputStream capes = plugin.getResource("capes.json");
        assert capes != null;
        availableCapes = JsonParser.parseReader(new InputStreamReader(capes, StandardCharsets.UTF_8)).getAsJsonArray();
        mineSkinService = new MineSkinService(plugin);
        selfTextureSigner = new SelfTextureSigner(plugin.getDataFolder(), plugin.getConfigManager().getPublicUrl());
        log = plugin.getLogger();
        configManager = plugin.getConfigManager();
    }

    public String[] signFromUrl(String imageUrl, String variant) {
        if (configManager.isSelfSigning()) {
            try {
                return selfTextureSigner.signFromUrl(imageUrl, variant);
            } catch (Exception e) {
                log.warning("Self signing failed: " + e.getMessage());
                return null;
            }
        } else return mineSkinService.signFromUrl(imageUrl, variant);
    }

    public String[] signFromBase64(String base64ImageData, String variant) {
        if (configManager.isSelfSigning()) {
            try {
                return selfTextureSigner.signFromBase64(base64ImageData, variant);
            } catch (Exception e) {
                log.warning("Self signing failed: " + e.getMessage());
                return null;
            }
        } else return mineSkinService.signFromBase64(base64ImageData, variant);
    }

    public String[] signCape(Database.SkinRecord skin, String capeUuid) {
        if (configManager.isSelfSigning()) {
            String capeUrl = null;
            if (capeUuid.startsWith("custom-")){
                capeUrl = configManager.getPublicUrl() + "/api/capes/custom/" + capeUuid;
            }else {
                for (com.google.gson.JsonElement cape : availableCapes) {
                    JsonObject item = cape.getAsJsonObject();
                    if (capeUuid.equalsIgnoreCase(item.get("uuid").getAsString())) {
                        capeUrl = item.get("url").getAsString();
                        break;
                    }
                }
            }
            if (capeUrl == null) {
                log.warning("Self signing failed: Cape texture URL unavailable");
                return null;
            }
            try {
                return selfTextureSigner.signCape(skin.textureValue(), capeUrl);
            } catch (Exception e) {
                log.warning("Self signing failed: " + e.getMessage());
                return null;
            }
        } else {
            JsonObject texture = JsonParser.parseString(new String(Base64.getDecoder().decode(skin.textureValue()))).getAsJsonObject().getAsJsonObject("textures");
            String skinUrl = texture.getAsJsonObject("SKIN").get("url").getAsString();
            return mineSkinService.signCape(skinUrl, skin.modelType(), capeUuid);
        }
    }

    public JsonArray getAvailableCapes() {
        if (configManager.isSelfSigning()){
            return availableCapes;
        }else return mineSkinService.getAvailableCapes();
    }

    public MineSkinService getMineSkinService() {
        return mineSkinService;
    }

    public SelfTextureSigner getSelfTextureSigner() {
        return selfTextureSigner;
    }
}
