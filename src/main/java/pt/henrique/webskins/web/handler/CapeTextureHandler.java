package pt.henrique.webskins.web.handler;

import com.sun.net.httpserver.HttpExchange;
import pt.henrique.webskins.WebSkins;
import pt.henrique.webskins.web.WebServer;

import java.io.IOException;
import java.nio.file.Files;

/**
 * Serves user-uploaded cape PNGs to Minecraft clients by public URL.
 */
public class CapeTextureHandler {
    private final WebSkins plugin;

    public CapeTextureHandler(WebSkins plugin) {
        this.plugin = plugin;
    }

    public void handle(HttpExchange exchange) throws IOException {
        String[] parts = exchange.getRequestURI().getPath().split("/");
        if (!"GET".equals(exchange.getRequestMethod()) || parts.length != 5) {
            WebServer.send(exchange, 404, "text/plain", "Not found");
            return;
        }
        try {
            String id = parts[4];
            if (!id.matches("custom-[0-9a-fA-F-]{36}")) throw new IllegalArgumentException();
            java.io.File file = new java.io.File(new java.io.File(plugin.getDataFolder(), "textures/capes"), id + ".png");
            if (!file.isFile()) {
                WebServer.send(exchange, 404, "text/plain", "Not found");
                return;
            }
            byte[] bytes = Files.readAllBytes(file.toPath());
            exchange.getResponseHeaders().set("Content-Type", "image/png");
            exchange.getResponseHeaders().set("Cache-Control", "public, max-age=3600");
            exchange.sendResponseHeaders(200, bytes.length);
            try (var output = exchange.getResponseBody()) {
                output.write(bytes);
            }
        } catch (IllegalArgumentException e) {
            WebServer.send(exchange, 404, "text/plain", "Not found");
        }
    }
}
