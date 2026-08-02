package com.tradingbot.kis;

import com.tradingbot.config.KisProperties;
import com.tradingbot.kis.dto.TokenResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * KIS OAuth 액세스 토큰 관리. 발급 후 만료 시각까지 캐싱합니다.
 * 토큰은 24시간 유효하지만 안전마진(60s) 을 두고 재발급합니다.
 */
@Service
public class KisAuthService {

    private static final Logger log = LoggerFactory.getLogger(KisAuthService.class);
    private static final Duration REFRESH_MARGIN = Duration.ofMinutes(1);

    private final WebClient kisWebClient;
    private final KisProperties properties;
    private final AtomicReference<CachedToken> cache = new AtomicReference<>();

    public KisAuthService(WebClient kisWebClient, KisProperties properties) {
        this.kisWebClient = kisWebClient;
        this.properties = properties;
    }

    public Mono<String> accessToken() {
        CachedToken current = cache.get();
        if (current != null && current.stillValid()) {
            return Mono.just(current.token());
        }
        return fetchToken().doOnNext(cache::set).map(CachedToken::token);
    }

    private Mono<CachedToken> fetchToken() {
        if (properties.appKey() == null || properties.appKey().isBlank()) {
            return Mono.error(new IllegalStateException(
                    "KIS_APP_KEY 가 설정되지 않았습니다. application.yml 또는 환경변수를 확인하세요."));
        }
        Map<String, String> body = Map.of(
                "grant_type", "client_credentials",
                "appkey", properties.appKey(),
                "appsecret", properties.appSecret()
        );
        log.info("KIS access token 발급 요청");
        return kisWebClient.post()
                .uri("/oauth2/tokenP")
                .bodyValue(body)
                .retrieve()
                .bodyToMono(TokenResponse.class)
                .map(res -> new CachedToken(
                        res.accessToken(),
                        Instant.now().plusSeconds(res.expiresIn()).minus(REFRESH_MARGIN)
                ));
    }

    private record CachedToken(String token, Instant expiresAt) {
        boolean stillValid() {
            return Instant.now().isBefore(expiresAt);
        }
    }
}
