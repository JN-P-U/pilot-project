package com.tradingbot.trading.service.impl;

import com.tradingbot.kis.KisApiClient;
import com.tradingbot.kis.dto.QuoteResponse;
import com.tradingbot.trading.model.KnownStocks;
import com.tradingbot.trading.model.QuoteView;
import com.tradingbot.trading.service.QuoteService;
import java.time.Duration;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("!mock")
public class KisQuoteService implements QuoteService {

    private static final Duration TIMEOUT = Duration.ofSeconds(5);

    private final KisApiClient client;

    public KisQuoteService(KisApiClient client) {
        this.client = client;
    }

    @Override
    public QuoteView getQuote(String stockCode) {
        QuoteResponse response = client.fetchQuote(stockCode).block(TIMEOUT);
        if (response == null || response.output() == null) {
            throw new IllegalStateException("KIS 응답이 비어있습니다: " + stockCode);
        }
        QuoteResponse.Output o = response.output();
        return new QuoteView(
                stockCode,
                resolveName(o.stockName(), stockCode),
                nullToEmpty(o.marketName()),
                parseLong(o.currentPrice()),
                parseLong(o.openPrice()),
                parseLong(o.highPrice()),
                parseLong(o.lowPrice()),
                parseLong(o.changeAmount()),
                parseDouble(o.changeRate()),
                parseLong(o.cumulativeVolume()),
                "kis"
        );
    }

    private String resolveName(String fromKis, String stockCode) {
        if (fromKis != null && !fromKis.isBlank()) {
            return fromKis.trim();
        }
        return KnownStocks.nameOf(stockCode);
    }

    private String nullToEmpty(String v) {
        return v == null ? "" : v.trim();
    }

    private long parseLong(String v) {
        return v == null || v.isBlank() ? 0L : Long.parseLong(v.trim());
    }

    private double parseDouble(String v) {
        return v == null || v.isBlank() ? 0d : Double.parseDouble(v.trim());
    }
}
