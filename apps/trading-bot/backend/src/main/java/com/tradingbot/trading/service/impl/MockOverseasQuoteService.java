package com.tradingbot.trading.service.impl;

import com.tradingbot.trading.model.OverseasQuoteView;
import com.tradingbot.trading.service.OverseasQuoteService;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("mock")
public class MockOverseasQuoteService implements OverseasQuoteService {

    @Override
    public OverseasQuoteView getQuote(String exchange, String symbol) {
        double base = Math.abs((double) symbol.hashCode() % 500d) + 20d;
        double jitter = ThreadLocalRandom.current().nextDouble(-5d, 5d);
        double price = round2(base + jitter);
        double open = round2(base + ThreadLocalRandom.current().nextDouble(-8d, 8d));
        double prevClose = round2(open);
        return new OverseasQuoteView(
                exchange,
                symbol,
                "USD",
                price,
                open,
                round2(Math.max(price, open) + 2d),
                round2(Math.min(price, open) - 2d),
                prevClose,
                round2(price - prevClose),
                round2(((price - prevClose) / prevClose) * 100d),
                ThreadLocalRandom.current().nextLong(500_000L, 20_000_000L),
                "mock"
        );
    }

    private double round2(double v) {
        return Math.round(v * 100d) / 100d;
    }
}
