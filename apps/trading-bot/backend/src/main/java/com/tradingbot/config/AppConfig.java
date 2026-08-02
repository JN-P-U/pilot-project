package com.tradingbot.config;

import com.tradingbot.bot.BotProperties;
import com.tradingbot.bot.discovery.CandidateProvider;
import com.tradingbot.bot.discovery.StaticCandidateProvider;
import com.tradingbot.bot.discovery.TechnicalAnalysisCandidateProvider;
import com.tradingbot.bot.discovery.VolumeRankCandidateProvider;
import com.tradingbot.bot.discovery.WeeklyCandidateAnalyzer;
import com.tradingbot.bot.strategy.SmaRsiStrategy;
import com.tradingbot.bot.strategy.Strategy;
import com.tradingbot.kis.KisApiClient;
import io.netty.channel.ChannelOption;
import io.netty.handler.timeout.ReadTimeoutHandler;
import io.netty.handler.timeout.WriteTimeoutHandler;
import java.time.Clock;
import java.time.Duration;
import java.time.ZoneId;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

@Configuration
@EnableConfigurationProperties({KisProperties.class, TradingProperties.class, BotProperties.class})
public class AppConfig {

    @Bean
    public Strategy strategy(BotProperties bot) {
        return new SmaRsiStrategy(
                bot.sma().shortWindow(),
                bot.sma().longWindow(),
                bot.rsi().period(),
                bot.rsi().buyMax(),
                bot.rsi().sellMin()
        );
    }

    @Bean
    public CandidateProvider candidateProvider(
            BotProperties bot,
            KisApiClient kisClient,
            TradingProperties trading,
            WeeklyCandidateAnalyzer weeklyAnalyzer,
            @Value("${bot.discovery.technical-cache-seconds:600}") long technicalCacheSeconds
    ) {
        return switch (bot.discovery().source()) {
            case STATIC -> new StaticCandidateProvider(bot);
            case VOLUME_RANK -> new VolumeRankCandidateProvider(kisClient, bot, trading);
            case TECHNICAL_ANALYSIS -> new TechnicalAnalysisCandidateProvider(
                    weeklyAnalyzer, bot, Duration.ofSeconds(technicalCacheSeconds));
        };
    }

    /**
     * KIS API 호출용 WebClient.
     * <p>
     * KIS 서버가 무응답이면 스케줄러 스레드가 무한 대기했던 이슈가 있어 명시적 timeout 을 강제합니다:
     * <ul>
     *   <li>connect timeout: TCP 연결 5초</li>
     *   <li>response timeout: HTTP 응답 시작까지 10초</li>
     *   <li>read/write timeout: 응답 스트림 idle 15초</li>
     * </ul>
     * 이 값을 넘으면 {@code .block(...)} 이 예외로 실패하며 스케줄러 스레드가 정상 반환합니다.
     */
    @Bean
    public WebClient kisWebClient(KisProperties kisProperties) {
        HttpClient httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5000)
                .responseTimeout(Duration.ofSeconds(10))
                .doOnConnected(conn -> conn
                        .addHandlerLast(new ReadTimeoutHandler(15, TimeUnit.SECONDS))
                        .addHandlerLast(new WriteTimeoutHandler(15, TimeUnit.SECONDS)));
        return WebClient.builder()
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .baseUrl(kisProperties.resolvedBaseUrl())
                .defaultHeader("Content-Type", "application/json; charset=utf-8")
                .build();
    }

    /**
     * KRX 는 KST 기준으로 개장하므로 서울 타임존 Clock 을 주입합니다.
     * 테스트에서는 고정 Clock 으로 재정의 가능.
     */
    @Bean
    public Clock clock() {
        return Clock.system(ZoneId.of("Asia/Seoul"));
    }
}
