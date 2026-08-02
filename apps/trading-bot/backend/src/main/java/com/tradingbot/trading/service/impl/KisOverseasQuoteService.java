package com.tradingbot.trading.service.impl;

import com.tradingbot.kis.KisApiClient;
import com.tradingbot.kis.dto.OverseasQuoteResponse;
import com.tradingbot.trading.model.OverseasQuoteView;
import com.tradingbot.trading.service.OverseasQuoteService;
import java.time.Duration;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("!mock")
public class KisOverseasQuoteService implements OverseasQuoteService {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private final KisApiClient client;

    public KisOverseasQuoteService(KisApiClient client) {
        this.client = client;
    }

    @Override
    public OverseasQuoteView getQuote(String exchange, String symbol) {
        OverseasQuoteResponse response = client.fetchOverseasQuote(exchange, symbol).block(TIMEOUT);
        if (response == null || response.output() == null) {
            throw new IllegalStateException("KIS 해외주식 응답이 비어있습니다: " + symbol);
        }
        OverseasQuoteResponse.Output o = response.output();
        double changeRate = parseDouble(o.changeRate());
        // KIS 해외주식 응답의 diff 는 절대값이므로 rate 부호로 방향을 결정합니다.
        double signedChange = changeRate < 0 ? -Math.abs(parseDouble(o.changeAmount())) : parseDouble(o.changeAmount());
        return new OverseasQuoteView(
                exchange,
                symbol,
                currencyOf(exchange),
                parseDouble(o.currentPrice()),
                parseDouble(o.openPrice()),
                parseDouble(o.highPrice()),
                parseDouble(o.lowPrice()),
                parseDouble(o.previousClose()),
                signedChange,
                changeRate,
                parseLong(o.tradeVolume()),
                "kis"
        );
    }

    private String currencyOf(String exchange) {
        return switch (exchange) {
            case "NAS", "NYS", "AMS" -> "USD";
            case "HKS" -> "HKD";
            case "TSE" -> "JPY";
            case "SHS", "SZS" -> "CNY";
            case "HSX", "HNX" -> "VND";
            default -> "";
        };
    }

    private long parseLong(String v) {
        if (v == null || v.isBlank()) return 0L;
        try {
            return (long) Double.parseDouble(v.trim());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }

    private double parseDouble(String v) {
        if (v == null || v.isBlank()) return 0d;
        try {
            return Double.parseDouble(v.trim());
        } catch (NumberFormatException e) {
            return 0d;
        }
    }
}
