package com.tradingbot.trading.service.impl;

import com.tradingbot.trading.model.KnownStocks;
import com.tradingbot.trading.model.QuoteView;
import com.tradingbot.trading.service.QuoteService;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

/**
 * mock 프로필용 가짜 시세 서비스. 종목코드 기반 결정적 시드로 유사한 값을 만들어 UI 검증에 사용합니다.
 */
@Service
@Profile("mock")
public class MockQuoteService implements QuoteService {

    @Override
    public QuoteView getQuote(String stockCode) {
        long base = Math.abs((long) stockCode.hashCode() % 100_000L) + 10_000L;
        long jitter = ThreadLocalRandom.current().nextLong(-500, 500);
        long price = base + jitter;
        long open = base + ThreadLocalRandom.current().nextLong(-800, 800);
        String name = KnownStocks.nameOf(stockCode);
        return new QuoteView(
                stockCode,
                name.isEmpty() ? "MOCK-" + stockCode : name,
                "KOSPI",
                price,
                open,
                Math.max(price, open) + 300,
                Math.min(price, open) - 300,
                price - open,
                Math.round(((double) (price - open) / open) * 10000d) / 100d,
                ThreadLocalRandom.current().nextLong(100_000, 5_000_000),
                "mock"
        );
    }
}
