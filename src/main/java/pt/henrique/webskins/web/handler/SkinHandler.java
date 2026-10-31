package pt.henrique.webskins.web.handler;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.sun.net.httpserver.HttpExchange;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;
import pt.henrique.webskins.WebSkins;
import pt.henrique.webskins.database.Database;
import pt.henrique.webskins.model.SkinData;
import pt.henrique.webskins.web.WebServer;
import pt.henrique.webskins.web.service.ImageValidator;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.Base64;

/**
 * Handles /api/skins/* endpoints.
 * <p>
 * GET  /api/skins/UUID       — Get active skin
 * GET  /api/skins/UUID/all   — Get skin history
 * PUT  /api/skins/UUID       — Save from editor
 * POST /api/skins/UUID/upload — Upload PNG file
 * POST /api/skins/UUID/apply/ID — Re-apply from history
 */
public class SkinHandler {

    private final WebSkins plugin;

    public SkinHandler(WebSkins plugin) {
        this.plugin = plugin;
    }

    public void handle(HttpExchange exchange) throws IOException {
        if ("OPTIONS".equals(exchange.getRequestMethod())) {
            WebServer.sendJson(exchange, 200, "{}");
            return;
        }

        String path = exchange.getRequestURI().getPath();
        String method = exchange.getRequestMethod();

        try {
            // Authenticate
            String playerUuid = authenticate(exchange);
            if (playerUuid == null) {
                WebServer.sendJson(exchange, 401, "{\"error\":\"Unauthorized\"}");
                return;
            }

            // Route
            if (path.matches("/api/skins/[^/]+/all") && "GET".equals(method)) {
                handleGetHistory(exchange, playerUuid);
            } else if (path.matches("/api/skins/[^/]+/capes") && "GET".equals(method)) {
                handleGetCapes(exchange, playerUuid);
            } else if (path.matches("/api/skins/[^/]+/capes/custom") && "POST".equals(method)) {
                handleCustomCapeUpload(exchange, playerUuid);
            } else if (path.matches("/api/skins/[^/]+/capes/custom/[^/]+") && "DELETE".equals(method)) {
                handleCustomCapeDelete(exchange, playerUuid, path.substring(path.lastIndexOf('/') + 1));
            } else if (path.matches("/api/skins/[^/]+/cape/(apply|clear)") && "POST".equals(method)) {
                handleCapeApply(exchange, playerUuid, path.endsWith("/clear"));
            } else if (path.matches("/api/skins/[^/]+/upload") && "POST".equals(method)) {
                handleUpload(exchange, playerUuid);
            } else if (path.matches("/api/skins/[^/]+/apply/\\d+") && "POST".equals(method)) {
                handleApply(exchange, playerUuid, path);
            } else if (path.matches("/api/skins/[^/]+/delete/\\d+") && "DELETE".equals(method)) {
                int id = Integer.parseInt(path.substring(path.lastIndexOf('/') + 1));
                if (!plugin.getDatabase().deleteSkin(playerUuid, id)) {
                    WebServer.sendJson(exchange, 409, "{\"error\":\"Skin is active, missing, or used by a preset.\"}");
                    return;
                }
                JsonObject result = new JsonObject();
                result.addProperty("ok", true);
                WebServer.sendJson(exchange, 200, result.toString());
            } else if (path.matches("/api/skins/[^/]+") && "GET".equals(method)) {
                handleGetActive(exchange, playerUuid);
            } else if (path.matches("/api/skins/[^/]+") && "PUT".equals(method)) {
                handleSaveFromEditor(exchange, playerUuid);
            } else {
                WebServer.sendJson(exchange, 404, "{\"error\":\"Not found\"}");
            }
        } catch (WebServer.BodyTooLargeException e) {
            // 413 already sent by readBody; the response is committed, do not write again.
        } catch (Exception e) {
            plugin.getLogger().warning("Skin handler error: " + e.getMessage());
            WebServer.sendJson(exchange, 500, "{\"error\":\"Internal server error\"}");
        }
    }

    private java.io.File customCapeFile(String capeId) {
        java.io.File dir = new java.io.File(plugin.getDataFolder(), "textures/capes");
        if (!capeId.matches("custom-[0-9a-fA-F-]{36}")) return new java.io.File(dir, "invalid-cape-id");
        return new java.io.File(dir, capeId + ".png");
    }

    private java.io.File customCapeMetadata(String capeId) {
        return new java.io.File(customCapeFile(capeId).getParentFile(), capeId + ".json");
    }

    private boolean isAdmin(String playerUuid) {
        Player player = Bukkit.getPlayer(UUID.fromString(playerUuid));
        return player != null && player.hasPermission("betterskin.admin");
    }

    private JsonObject readCustomCape(String capeId, String viewerUuid, boolean admin) {
        java.io.File image = customCapeFile(capeId);
        if (!image.isFile()) return null;
        String owner;
        String name = "Custom cape";
        boolean isPublic;
        try {
            java.io.File metadata = customCapeMetadata(capeId);
            if (!metadata.isFile()) return null;
            JsonObject data = JsonParser.parseString(java.nio.file.Files.readString(metadata.toPath())).getAsJsonObject();
            owner = data.has("owner") ? data.get("owner").getAsString() : "";
            name = data.has("name") ? data.get("name").getAsString() : name;
            isPublic = data.has("public") && data.get("public").getAsBoolean();
        } catch (Exception ignored) {
            return null;
        }
        if (!isPublic && !owner.equalsIgnoreCase(viewerUuid)) return null;
        JsonObject cape = new JsonObject();
        cape.addProperty("uuid", capeId);
        cape.addProperty("alias", name);
        cape.addProperty("url", plugin.getConfigManager().getPublicUrl() + "/api/capes/custom/" + capeId);
        cape.addProperty("supported", true);
        cape.addProperty("support", isPublic ? "public" : "private");
        cape.addProperty("custom", true);
        cape.addProperty("canDelete", admin || owner.equalsIgnoreCase(viewerUuid));
        return cape;
    }

    private void handleGetCapes(HttpExchange exchange, String playerUuid) throws IOException {
        JsonArray result = new JsonArray();
        java.io.File dir = new java.io.File(plugin.getDataFolder(), "textures/capes");
        java.io.File[] files = dir.listFiles((d, n) -> n.startsWith("custom-") && n.endsWith(".png"));
        if (files != null) for (java.io.File file : files) {
            String capeId = file.getName().substring(0, file.getName().length() - 4);
            JsonObject cape = readCustomCape(capeId, playerUuid, isAdmin(playerUuid));
            if (cape != null) result.add(cape);
        }
        for (com.google.gson.JsonElement item : plugin.getSignAdapter().getAvailableCapes()) result.add(item);
        JsonObject response = new JsonObject();
        response.add("capes", result);
        response.addProperty("canUploadPublic", isAdmin(playerUuid));
        WebServer.sendJson(exchange, 200, response.toString());
    }

    private void handleCustomCapeDelete(HttpExchange exchange, String playerUuid, String capeId) throws IOException {
        java.io.File cape = customCapeFile(capeId);
        JsonObject metadata = null;
        try {
            if (customCapeMetadata(capeId).isFile())
                metadata = JsonParser.parseString(java.nio.file.Files.readString(customCapeMetadata(capeId).toPath())).getAsJsonObject();
        } catch (Exception ignored) {
        }
        if (!cape.isFile() || metadata == null || !metadata.has("owner")) {
            WebServer.sendJson(exchange, 404, "{\"error\":\"Cape not found.\"}");
            return;
        }
        String owner = metadata.get("owner").getAsString();
        if (!owner.equalsIgnoreCase(playerUuid) && !isAdmin(playerUuid)) {
            WebServer.sendJson(exchange, 403, "{\"error\":\"You cannot delete this cape.\"}");
            return;
        }
        java.nio.file.Files.deleteIfExists(cape.toPath());
        java.nio.file.Files.deleteIfExists(customCapeMetadata(capeId).toPath());
        WebServer.sendJson(exchange, 200, "{\"ok\":true}");
    }

    private void handleCustomCapeUpload(HttpExchange exchange, String playerUuid) throws Exception {
        JsonObject request = JsonParser.parseString(WebServer.readBody(exchange)).getAsJsonObject();
        String imageUrl = request.has("capeUrl") ? request.get("capeUrl").getAsString().trim() : "";
        String capeName = request.has("capeName") ? request.get("capeName").getAsString().trim() : "";
        boolean imageProvided = request.has("imageBase64");
        if (!imageProvided && imageUrl.isBlank()) {
            WebServer.sendJson(exchange, 400, "{\"error\":\"Enter a cape image URL.\"}");
            return;
        }
        if (capeName.isBlank() || capeName.length() > 40) {
            WebServer.sendJson(exchange, 400, "{\"error\":\"Cape name must be between 1 and 40 characters.\"}");
            return;
        }
        byte[] image;
        try {
            image = imageProvided
                    ? ImageValidator.decodeBase64(request.get("imageBase64").getAsString())
                    : pt.henrique.webskins.web.service.ImportService.fetchImageFromUrl(imageUrl, plugin.getLogger());
        } catch (IllegalArgumentException e) {
            image = null;
        }
        if (image == null) {
            WebServer.sendJson(exchange, 400, "{\"error\":\"Could not download cape image. Use a public HTTP(S) URL.\"}");
            return;
        }
        byte[] pngHeader = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a};
        if (image.length < pngHeader.length) {
            WebServer.sendJson(exchange, 400, "{\"error\":\"URL must point to a PNG cape.\"}");
            return;
        }
        for (int i = 0; i < pngHeader.length; i++)
            if (image[i] != pngHeader[i]) {
                WebServer.sendJson(exchange, 400, "{\"error\":\"URL must point to a PNG cape.\"}");
                return;
            }
        java.awt.image.BufferedImage decoded = javax.imageio.ImageIO.read(new java.io.ByteArrayInputStream(image));
        if (decoded == null || decoded.getWidth() != 64 || decoded.getHeight() != 32) {
            WebServer.sendJson(exchange, 400, "{\"error\":\"Cape PNG must be exactly 64x32 pixels.\"}");
            return;
        }
        boolean admin = isAdmin(playerUuid);
        boolean isPublic = admin && request.has("public") && request.get("public").getAsBoolean();
        String capeId = "custom-" + UUID.randomUUID();
        java.io.File target = customCapeFile(capeId);
        java.io.File parent = target.getParentFile();
        if (!parent.exists() && !parent.mkdirs()) throw new IOException("Cannot create cape storage directory");
        java.nio.file.Files.write(target.toPath(), image);
        JsonObject metadata = new JsonObject();
        metadata.addProperty("owner", playerUuid);
        metadata.addProperty("name", capeName);
        metadata.addProperty("public", isPublic);
        java.nio.file.Files.writeString(customCapeMetadata(capeId).toPath(), metadata.toString());
        JsonObject cape = readCustomCape(capeId, playerUuid, admin);
        WebServer.sendJson(exchange, 200, cape.toString());
    }

    private void handleCapeApply(HttpExchange exchange, String playerUuid, boolean clear) throws Exception {
        Database.SkinRecord active = plugin.getDatabase().getActiveSkinRecord(playerUuid);
        if (active == null) {
            WebServer.sendJson(exchange, 400, "{\"error\":\"Set a skin before applying a cape.\"}");
            return;
        }
        JsonObject texture = JsonParser.parseString(new String(Base64.getDecoder().decode(active.textureValue()))).getAsJsonObject().getAsJsonObject("textures");
        if (!texture.has("SKIN")) {
            WebServer.sendJson(exchange, 400, "{\"error\":\"Current skin texture is unavailable.\"}");
            return;
        }
        String skinUrl = texture.getAsJsonObject("SKIN").get("url").getAsString();
        String capeUuid = null;
        if (!clear) {
            JsonObject request = JsonParser.parseString(WebServer.readBody(exchange)).getAsJsonObject();
            capeUuid = request.get("capeUuid").getAsString();
            boolean customCape = capeUuid.startsWith("custom-") && readCustomCape(capeUuid, playerUuid, isAdmin(playerUuid)) != null;
            if (!customCape && !capeUuid.matches("[0-9a-fA-F-]{32,36}")) {
                WebServer.sendJson(exchange, 400, "{\"error\":\"Invalid cape selection.\"}");
                return;
            }
            if (!customCape) {
                boolean knownCape = false;
                for (com.google.gson.JsonElement cape : plugin.getSignAdapter().getAvailableCapes()) {
                    JsonObject item = cape.getAsJsonObject();
                    if (item.has("uuid") && capeUuid.equalsIgnoreCase(item.get("uuid").getAsString())) {
                        knownCape = true;
                        break;
                    }
                }
                if (!knownCape) {
                    WebServer.sendJson(exchange, 400, "{\"error\":\"Unknown cape selection.\"}");
                    return;
                }
            }
        }
        String[] signed = clear ? plugin.getSignAdapter().signFromUrl(skinUrl, active.modelType().equals("SLIM") ? "slim" : "classic") :
                plugin.getSignAdapter().signCape(active, capeUuid);
        if (signed == null) {
            WebServer.sendJson(exchange, 503, "{\"error\":\"MineSkin cape signing failed.\"}");
            return;
        }
        int id = plugin.getDatabase().saveSkin(playerUuid, signed[0], signed[1], active.modelType(), clear ? "CAPE_CLEAR" : "CAPE_APPLY");
        applySkinInstantly(playerUuid, signed[0], signed[1], active.modelType());
        JsonObject response = new JsonObject();
        response.addProperty("id", id);
        response.addProperty("textureValue", signed[0]);
        response.addProperty("textureSignature", signed[1]);
        response.addProperty("modelType", active.modelType());
        WebServer.sendJson(exchange, 200, response.toString());
    }

    private void handleGetActive(HttpExchange exchange, String playerUuid) throws Exception {
        Database.SkinRecord skin = plugin.getDatabase().getActiveSkinRecord(playerUuid);
        if (skin == null) {
            WebServer.sendJson(exchange, 200, "{\"textureValue\":null,\"textureSignature\":null}");
            return;
        }

        JsonObject resp = new JsonObject();
        resp.addProperty("id", skin.id());
        resp.addProperty("textureValue", skin.textureValue());
        resp.addProperty("textureSignature", skin.textureSignature());
        resp.addProperty("modelType", skin.modelType());
        resp.addProperty("source", skin.source());
        resp.addProperty("createdAt", skin.createdAt());
        WebServer.sendJson(exchange, 200, resp.toString());
    }

    private void handleGetHistory(HttpExchange exchange, String playerUuid) throws Exception {
        List<Database.SkinRecord> skins = plugin.getDatabase().getSkinHistory(playerUuid);
        JsonArray arr = new JsonArray();
        for (Database.SkinRecord s : skins) {
            JsonObject obj = new JsonObject();
            obj.addProperty("id", s.id());
            obj.addProperty("modelType", s.modelType());
            obj.addProperty("source", s.source());
            obj.addProperty("active", s.active());
            obj.addProperty("createdAt", s.createdAt());
            arr.add(obj);
        }
        WebServer.sendJson(exchange, 200, arr.toString());
    }

    private void handleSaveFromEditor(HttpExchange exchange, String playerUuid) throws Exception {
        String body = WebServer.readBody(exchange);
        JsonObject json = JsonParser.parseString(body).getAsJsonObject();

        String imageBase64 = json.get("imageBase64").getAsString();
        String model = json.has("model") ? json.get("model").getAsString() : "steve";

        // Decode and validate
        byte[] imageBytes = ImageValidator.decodeBase64(imageBase64);
        String error = ImageValidator.validate(imageBytes);
        if (error != null) {
            WebServer.sendJson(exchange, 400, "{\"error\":\"" + error + "\"}");
            return;
        }

        // Normalize to 64x64
        String normalized = ImageValidator.normalizeToBase64(imageBytes);

        // Sign via MineSkin
        String[] signed = plugin.getSignAdapter().signFromBase64(normalized, model.equals("slim") ? "slim" : "classic");
        if (signed == null) {
            WebServer.sendJson(exchange, 503, "{\"error\":\"Skin signing service unavailable. Is your MineSkin API key configured?\"}");
            return;
        }

        // Save to database
        String modelType = model.equals("slim") ? "SLIM" : "DEFAULT";
        int skinId = plugin.getDatabase().saveSkin(playerUuid, signed[0], signed[1], modelType, "EDITOR");

        // Update cache and apply instantly if configured
        applySkinInstantly(playerUuid, signed[0], signed[1], modelType);

        JsonObject resp = new JsonObject();
        resp.addProperty("id", skinId);
        resp.addProperty("textureValue", signed[0]);
        resp.addProperty("textureSignature", signed[1]);
        resp.addProperty("modelType", modelType);
        WebServer.sendJson(exchange, 200, resp.toString());
    }

    private void handleUpload(HttpExchange exchange, String playerUuid) throws Exception {
        // Read raw body as image bytes (for simplicity, expect base64 JSON body)
        String body = WebServer.readBody(exchange);
        JsonObject json = JsonParser.parseString(body).getAsJsonObject();

        String imageBase64 = json.get("imageBase64").getAsString();
        String model = json.has("model") ? json.get("model").getAsString() : "steve";

        byte[] imageBytes = ImageValidator.decodeBase64(imageBase64);
        String error = ImageValidator.validate(imageBytes);
        if (error != null) {
            WebServer.sendJson(exchange, 400, "{\"error\":\"" + error + "\"}");
            return;
        }

        String normalized = ImageValidator.normalizeToBase64(imageBytes);
        String[] signed = plugin.getSignAdapter().signFromBase64(normalized, model.equals("slim") ? "slim" : "classic");
        if (signed == null) {
            WebServer.sendJson(exchange, 503, "{\"error\":\"Skin signing service unavailable.\"}");
            return;
        }

        String modelType = model.equals("slim") ? "SLIM" : "DEFAULT";
        int skinId = plugin.getDatabase().saveSkin(playerUuid, signed[0], signed[1], modelType, "UPLOAD");

        applySkinInstantly(playerUuid, signed[0], signed[1], modelType);

        JsonObject resp = new JsonObject();
        resp.addProperty("id", skinId);
        resp.addProperty("textureValue", signed[0]);
        resp.addProperty("textureSignature", signed[1]);
        resp.addProperty("modelType", modelType);
        WebServer.sendJson(exchange, 200, resp.toString());
    }

    private void handleApply(HttpExchange exchange, String playerUuid, String path) throws Exception {
        // Extract skin ID from path: /api/skins/UUID/apply/123
        String[] parts = path.split("/");
        int skinId = Integer.parseInt(parts[parts.length - 1]);

        boolean success = plugin.getDatabase().activateSkin(playerUuid, skinId);
        if (!success) {
            WebServer.sendJson(exchange, 404, "{\"error\":\"Skin not found\"}");
            return;
        }

        SkinData skin = plugin.getDatabase().getSkinById(skinId);
        if (skin != null) {
            applySkinInstantly(playerUuid, skin.textureValue(), skin.textureSignature(), skin.modelType());
        }

        JsonObject resp = new JsonObject();
        resp.addProperty("ok", true);
        WebServer.sendJson(exchange, 200, resp.toString());
    }

    /**
     * If INSTANT mode is enabled, apply the skin to the player right now.
     */
    private void applySkinInstantly(String playerUuid, String textureValue, String textureSignature, String modelType) {
        if (!"INSTANT".equalsIgnoreCase(plugin.getConfigManager().getApplyMode())) return;

        SkinData skinData = new SkinData(textureValue, textureSignature, modelType, "web", System.currentTimeMillis());
        plugin.getSkinCache().put(UUID.fromString(playerUuid), skinData);

        // Apply on the main Bukkit thread
        Bukkit.getScheduler().runTask(plugin, () -> {
            Player player = Bukkit.getPlayer(UUID.fromString(playerUuid));
            if (player != null && player.isOnline()) {
                plugin.getSkinApplier().applySkin(player, skinData);
                player.sendMessage(net.kyori.adventure.text.serializer.legacy.LegacyComponentSerializer
                        .legacySection().deserialize(
                                plugin.getLangManager().getPrefixed("skin-applied")
                        ));
            }
        });
    }

    /**
     * Authenticate request via Authorization header token.
     */
    private String authenticate(HttpExchange exchange) throws Exception {
        String auth = exchange.getRequestHeaders().getFirst("Authorization");
        if (auth == null || !auth.startsWith("Bearer ")) return null;

        String token = auth.substring(7);
        String[] result = plugin.getDatabase().verifyToken(token);
        if (result == null) return null;
        return result[0]; // playerUuid
    }
}

