import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class FetchWiki {
    public static void main(String[] args) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create("https://minecraft.wiki/w/Pack_format"))
                .header("User-Agent", "Mozilla/5.0")
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        
        String[] lines = response.body().split("\n");
        for (String line : lines) {
            if (line.contains("1.21.11") || line.contains("1.21.4") || line.contains("1.21.5") || line.contains("1.21.8")) {
                System.out.println(line.replaceAll("<[^>]+>", "\t"));
            }
        }
    }
}
