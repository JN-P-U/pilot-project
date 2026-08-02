package com.tradingbot.trading.guard;

import com.tradingbot.config.TradingProperties;
import com.tradingbot.kis.dto.OrderRequest;
import com.tradingbot.trading.service.QuoteService;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 소액 실전 매매용 사전 검증기.
 * <p>주문이 실제 발주 되기 전에 정규장/화이트리스트/수량/일일 금액 상한을 검사합니다.
 * KIS 로 실제 발주가 성공한 경우에만 {@link #record}로 누적금액을 반영합니다.</p>
 */
@Component
public class TradingGuard {

    private static final Logger log = LoggerFactory.getLogger(TradingGuard.class);

    private final TradingProperties properties;
    private final QuoteService quoteService;
    private final Clock clock;
    private final AtomicReference<DailyState> daily = new AtomicReference<>(DailyState.empty());

    public TradingGuard(TradingProperties properties, QuoteService quoteService, Clock clock) {
        this.properties = properties;
        this.quoteService = quoteService;
        this.clock = clock;
    }

    /**
     * 주문 전 사전 검증. 통과하면 참조가(원)를 반환하고, 실패 시 {@link TradingGuardException}.
     */
    public long preCheck(OrderRequest request) {
        TradingProperties.Guard g = properties.guard();
        if (g == null) {
            throw new TradingGuardException("trading.guard 설정이 없습니다");
        }

        assertMarketHours(g);
        assertWhitelisted(g, request.stockCode());
        assertQuantity(g, request.quantity());
        long referencePrice = resolveReferencePrice(request);
        long notional = Math.multiplyExact((long) request.quantity(), referencePrice);
        assertDailyNotional(g, notional);
        return referencePrice;
    }

    /**
     * KIS 로 발주가 실제로 접수된 경우에만 호출. 오늘 누적 금액을 갱신합니다.
     */
    public void record(OrderRequest request, long referencePrice) {
        long notional = (long) request.quantity() * referencePrice;
        LocalDate today = LocalDate.now(clock);
        daily.updateAndGet(state -> {
            DailyState base = state.isSameDay(today) ? state : new DailyState(today, 0L);
            return new DailyState(today, base.cumulativeNotional() + notional);
        });
        log.info("주문 누적 반영 date={} 추가={} 합계={}", today, notional, currentDailyNotional());
    }

    public long currentDailyNotional() {
        DailyState state = daily.get();
        return state.isSameDay(LocalDate.now(clock)) ? state.cumulativeNotional() : 0L;
    }

    private void assertMarketHours(TradingProperties.Guard g) {
        if (!g.marketHoursOnly()) {
            return;
        }
        ZonedDateTime now = ZonedDateTime.now(clock);
        DayOfWeek dow = now.getDayOfWeek();
        if (dow == DayOfWeek.SATURDAY || dow == DayOfWeek.SUNDAY) {
            throw new TradingGuardException("주말에는 주문할 수 없습니다");
        }
        LocalTime t = now.toLocalTime();
        if (t.isBefore(g.openTime()) || t.isAfter(g.closeTime())) {
            throw new TradingGuardException(
                    "정규장 시간이 아닙니다: %s (허용 %s ~ %s)".formatted(t, g.openTime(), g.closeTime()));
        }
    }

    private void assertWhitelisted(TradingProperties.Guard g, String stockCode) {
        if (!g.isWhitelisted(stockCode)) {
            throw new TradingGuardException(
                    "화이트리스트 밖 종목입니다: %s (허용 %s)".formatted(stockCode, g.allowedStockCodes()));
        }
    }

    private void assertQuantity(TradingProperties.Guard g, int quantity) {
        if (quantity > g.maxQuantityPerOrder()) {
            throw new TradingGuardException(
                    "주문 수량 상한 초과: %d > %d".formatted(quantity, g.maxQuantityPerOrder()));
        }
    }

    private long resolveReferencePrice(OrderRequest request) {
        if (request.orderType() == OrderRequest.OrderType.LIMIT) {
            if (request.price() <= 0) {
                throw new TradingGuardException("지정가 주문은 단가가 0보다 커야 합니다");
            }
            return request.price();
        }
        // MARKET: 현재가로 노셔널을 추정
        long current = quoteService.getQuote(request.stockCode()).currentPrice();
        if (current <= 0) {
            throw new TradingGuardException("시장가 참조가 조회 실패: " + request.stockCode());
        }
        return current;
    }

    private void assertDailyNotional(TradingProperties.Guard g, long addNotional) {
        long cumulative = currentDailyNotional();
        long projected = cumulative + addNotional;
        if (projected > g.maxDailyNotional()) {
            throw new TradingGuardException(
                    "일일 주문금액 상한 초과: 오늘누적=%d + 이번주문=%d > 상한=%d"
                            .formatted(cumulative, addNotional, g.maxDailyNotional()));
        }
    }

    private record DailyState(LocalDate date, long cumulativeNotional) {
        static DailyState empty() {
            return new DailyState(LocalDate.MIN, 0L);
        }

        boolean isSameDay(LocalDate today) {
            return date.equals(today);
        }
    }
}
