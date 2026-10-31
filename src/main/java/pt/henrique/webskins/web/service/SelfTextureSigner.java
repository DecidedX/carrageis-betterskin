package pt.henrique.webskins.web.service;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.io.File;
import java.nio.file.Files;
import java.nio.charset.StandardCharsets;
import java.net.MalformedURLException;
import java.net.URL;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.util.Base64;
import java.util.UUID;

/**
 * Creates a locally signed texture property. The client mod must bypass Mojang's signature check.
 */
public final class SelfTextureSigner {
    private final KeyPair keyPair;
    private final File dataFolder;
    private final String publicUrl;

    public SelfTextureSigner(File dataFolder, String publicUrl) {
        this.dataFolder = dataFolder;
        this.publicUrl = publicUrl.replaceAll("/+$", "");
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            keyPair = generator.generateKeyPair();
        } catch (Exception e) {
            throw new IllegalStateException("Could not initialize local texture signer", e);
        }
    }

    public String[] signCape(String oldValue, String capeUrl) throws Exception {
        JsonObject root = JsonParser.parseString(new String(Base64.getDecoder().decode(oldValue), StandardCharsets.UTF_8)).getAsJsonObject();
        JsonObject textures = root.has("textures") ? root.getAsJsonObject("textures").deepCopy() : new JsonObject();
        if (capeUrl == null) textures.remove("CAPE");
        else {
            JsonObject cape = new JsonObject();
            cape.addProperty("url", capeUrl);
            textures.add("CAPE", cape);
        }
        root.add("textures", textures);
        return signTextureJson(root);
    }

    /** Save a Base64 skin image locally and sign its publicly accessible texture URL. */
    public String[] signFromBase64(String base64ImageData, String variant) throws Exception {
        byte[] image = ImageValidator.decodeBase64(base64ImageData);
        String validationError = ImageValidator.validate(image);
        if (validationError != null) {
            throw new IllegalArgumentException(validationError);
        }

        byte[] normalizedImage = Base64.getDecoder().decode(ImageValidator.normalizeToBase64(image));
        String imageId = UUID.randomUUID().toString();
        File textureDirectory = new File(dataFolder, "textures/skins");
        Files.createDirectories(textureDirectory.toPath());
        Files.write(new File(textureDirectory, imageId + ".png").toPath(), normalizedImage);

        String imageUrl = publicUrl + "/api/textures/skins/" + imageId + ".png";
        return signFromUrl(imageUrl, variant);
    }

    /** Download, validate, and locally sign a skin texture URL. */
    public String[] signFromUrl(String imageUrl, String variant) throws Exception {
        URL url;
        try {
            url = new URL(imageUrl);
        } catch (MalformedURLException e) {
            throw new IllegalArgumentException("Invalid skin image URL.", e);
        }
        if (!("http".equalsIgnoreCase(url.getProtocol()) || "https".equalsIgnoreCase(url.getProtocol()))) {
            throw new IllegalArgumentException("Skin image URL must use HTTP or HTTPS.");
        }

        byte[] image = ImportService.fetchImageFromUrl(
                imageUrl,
                java.util.logging.Logger.getLogger(SelfTextureSigner.class.getName())
        );
        if (image == null) {
            throw new IllegalArgumentException("Could not fetch skin image from URL.");
        }
        String validationError = ImageValidator.validate(image);
        if (validationError != null) {
            throw new IllegalArgumentException(validationError);
        }

        JsonObject skin = new JsonObject();
        skin.addProperty("url", imageUrl);
        if ("slim".equalsIgnoreCase(variant)) {
            JsonObject metadata = new JsonObject();
            metadata.addProperty("model", "slim");
            skin.add("metadata", metadata);
        }

        JsonObject textures = new JsonObject();
        textures.add("SKIN", skin);
        JsonObject root = new JsonObject();
        root.addProperty("timestamp", System.currentTimeMillis());
        root.add("textures", textures);
        return signTextureJson(root);
    }

    private String[] signTextureJson(JsonObject root) throws Exception {
        String value = Base64.getEncoder().encodeToString(root.toString().getBytes(StandardCharsets.UTF_8));
        Signature signer = Signature.getInstance("SHA1withRSA");
        signer.initSign(keyPair.getPrivate());
        signer.update(value.getBytes(StandardCharsets.UTF_8));
        return new String[]{value, Base64.getEncoder().encodeToString(signer.sign())};
    }

}
