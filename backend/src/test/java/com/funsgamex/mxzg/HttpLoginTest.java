package com.funsgamex.mxzg;

import com.jayway.jsonpath.JsonPath;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "spring.datasource.url=jdbc:h2:mem:http;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1",
    "spring.datasource.username=sa", "spring.datasource.password="
})
@ActiveProfiles("local")
class HttpLoginTest {
    @LocalServerPort int port;
    private final HttpClient client = HttpClient.newHttpClient();

    @Test void loginAndAuthenticatedProfileOverRealHttp() throws Exception {
        var response = post("{\"account\":\"http_player\"}");
        assertEquals(200, response.statusCode());
        String token = JsonPath.read(response.body(), "$.session.accessToken");
        String roleId = JsonPath.read(response.body(), "$.role.id");
        var request = HttpRequest.newBuilder(uri("/api/v1/roles/me"))
            .header("Authorization", "Bearer " + token).GET().build();
        var profile = client.send(request, HttpResponse.BodyHandlers.ofString());
        assertEquals(200, profile.statusCode());
        assertEquals(roleId, JsonPath.read(profile.body(), "$.id"));
        assertEquals("http_player", JsonPath.read(profile.body(), "$.nickname"));
    }

    @Test void invalidInputAndMissingCredentialsHaveHttpErrors() throws Exception {
        assertEquals(400, post("{\"account\":\"a\"}").statusCode());
        assertEquals(400, post("not-json").statusCode());
        var response = client.send(HttpRequest.newBuilder(uri("/api/v1/roles/me")).GET().build(),
            HttpResponse.BodyHandlers.ofString());
        assertEquals(401, response.statusCode());
    }

    private HttpResponse<String> post(String body) throws Exception {
        return client.send(HttpRequest.newBuilder(uri("/api/v1/development/login"))
            .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build(),
            HttpResponse.BodyHandlers.ofString());
    }
    @Test void localPreviewsAreAllowedAndOtherOriginsAreRejected() throws Exception {
        for (String origin : new String[]{"http://localhost:7456", "http://127.0.0.1:7456",
                "http://localhost:18081", "http://127.0.0.1:18081",
                "http://localhost:18082", "https://untrusted.example"}) {
            var request = HttpRequest.newBuilder(uri("/api/v1/development/login"))
                .header("Origin", origin).header("Access-Control-Request-Method", "POST")
                .header("Access-Control-Request-Headers", "content-type")
                .method("OPTIONS", HttpRequest.BodyPublishers.noBody()).build();
            var response = client.send(request, HttpResponse.BodyHandlers.ofString());
            boolean allowed = origin.endsWith(":7456") || origin.endsWith(":18081");
            assertEquals(allowed ? 200 : 403, response.statusCode());
            if (response.statusCode() == 200) assertEquals(origin, response.headers().firstValue("Access-Control-Allow-Origin").orElseThrow());
        }
    }
    private URI uri(String path) { return URI.create("http://127.0.0.1:" + port + path); }
}
