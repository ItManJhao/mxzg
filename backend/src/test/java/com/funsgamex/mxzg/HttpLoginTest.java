/** 业务 HTTP 退役验证：独立内存库与随机端口，确认旧入口均不可用。 */
package com.funsgamex.mxzg;
import java.net.*;import java.net.http.*;import java.util.*;
import org.junit.jupiter.api.Test;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.boot.test.web.server.LocalServerPort;import org.springframework.test.context.ActiveProfiles;
import static org.junit.jupiter.api.Assertions.*;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={"spring.datasource.url=jdbc:h2:mem:retired_http;MODE=MySQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1","spring.datasource.username=sa","spring.datasource.password="})
@ActiveProfiles("local")
class HttpLoginTest {
 @LocalServerPort int port;
 /** 所有原业务读写路由均返回 404，不存在 HTTP 回退。 */
 @Test void allGameHttpRoutesAreRetired() throws Exception {
  try(var client=HttpClient.newHttpClient()) {
   for(String path:List.of("servers","roles/me","inventory","heroes","heroes/00000000-0000-4000-8000-000000000000","heroes/00000000-0000-4000-8000-000000000000/level-up","lineups/main","campaign","campaign/initialize","campaign/battles","campaign/battles/00000000-0000-4000-8000-000000000000/claim","idle","idle/claim","development/login")) {
    for(String method:List.of("GET","POST","PUT")) {
     var request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/api/v1/"+path)).header("Content-Type","application/json").method(method,HttpRequest.BodyPublishers.ofString("{} ")).build();
     assertEquals(404,client.send(request,HttpResponse.BodyHandlers.discarding()).statusCode(),method+" "+path);
    }
   }
  }
 }
}
