import java.net.URI;
import java.net.http.*;

public class DownloadWiki {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create("https://minecraft.wiki/w/Pack_format"))
            .header("User-Agent", "Mozilla/5.0")
            .build();
        String html = client.send(request, HttpResponse.BodyHandlers.ofString()).body();
        java.nio.file.Files.writeString(java.nio.file.Path.of("/workspace/wiki.html"), html);
    }
}
