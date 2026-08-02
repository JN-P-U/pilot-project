package com.tradingbot.trading.guard;

/**
 * 안전장치 위반으로 주문이 거부됐음을 알리는 예외. HTTP 400 으로 매핑됩니다.
 */
public class TradingGuardException extends RuntimeException {
    public TradingGuardException(String message) {
        super(message);
    }
}
