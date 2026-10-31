package pt.henrique.webskins.web.handler;

import com.sun.net.httpserver.HttpExchange;
import pt.henrique.webskins.WebSkins;
import pt.henrique.webskins.web.WebServer;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;

/** Serves locally stored skin textures referenced by self-signed properties. */
public final class SkinTextureHandler {
    private final WebSkins plugin;

    public SkinTextureHandler(WebSkins plugin) {
        this.plugin = plugin;
    }

    public void handle(HttpExchange exchange) throws IOException {
        String[] parts = exchange.getRequestURI().getPath().split("/");
        if (!"GET".equals(exchange.getRequestMethod()) || parts.length != 5) {
            WebServer.send(exchange, 404, "text/plain", "Not found");
            return;
        }

        String fileName = parts[4];
        if (!fileName.matches("[0-9a-fA-F-]{36}\\.png")) {
            WebServer.send(exchange, 404, "text/plain", "Not found");
            return;
        }

        File texture = new File(
                new File(plugin.getDataFolder(), "textures/skins"),
                fileName
        );
        if (!texture.isFile()) {
            WebServer.send(exchange, 404, "text/plain", "Not found");
            return;
        }

        byte[] bytes = Files.readAllBytes(texture.toPath());
        exchange.getResponseHeaders().set("Content-Type", "image/png");
        exchange.getResponseHeaders().set("Cache-Control", "public, max-age=31536000, immutable");
        exchange.sendResponseHeaders(200, bytes.length);
        try (var output = exchange.getResponseBody()) {
            output.write(bytes);
        }
    }
}
