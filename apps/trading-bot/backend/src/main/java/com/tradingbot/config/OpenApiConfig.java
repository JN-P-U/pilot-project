package com.tradingbot.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Springdoc OpenAPI 문서 메타 정보.
 * Swagger UI: /swagger-ui.html, JSON: /v3/api-docs
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI tradingBotOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("trading-bot API")
                        .description("KIS OpenAPI 기반 소액 자동 매매 실험용 백엔드. mock 프로필은 자격증명 없이도 UI 검증 가능.")
                        .version("v0.0.1")
                        .license(new License().name("Internal")));
    }
}
