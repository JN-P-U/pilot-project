package com.tradingbot.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * KIS(한국투자증권) OpenAPI 접속 정보.
 * <p>실전/모의 서버 스위칭과 자격증명, 계좌 정보를 담습니다.</p>
 */
@ConfigurationProperties(prefix = "kis")
public record KisProperties(
        boolean live,
        BaseUrl baseUrl,
        String appKey,
        String appSecret,
        Account account
) {
    public String resolvedBaseUrl() {
        return live ? baseUrl.live() : baseUrl.paper();
    }

    public record BaseUrl(String live, String paper) {}

    public record Account(String cano, String productCode) {}
}
