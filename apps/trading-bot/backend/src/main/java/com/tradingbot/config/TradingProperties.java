package com.tradingbot.config;

import java.time.LocalTime;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 매매 실행 제어 플래그와 안전장치 설정.
 */
@ConfigurationProperties(prefix = "trading")
public record TradingProperties(
        boolean orderEnabled,
        Guard guard
) {
    /**
     * 실전 소액 매매용 안전장치.
     * <ul>
     *   <li>marketHoursOnly: 정규장 시간대에만 주문 허용</li>
     *   <li>allowedStockCodes: 화이트리스트. 비어있으면 전체 허용.</li>
     *   <li>maxQuantityPerOrder: 단건 주문 최대 수량</li>
     *   <li>maxDailyNotional: 하루 총 주문금액(원) 상한 — 수량 × 참조가</li>
     * </ul>
     */
    public record Guard(
            boolean marketHoursOnly,
            LocalTime openTime,
            LocalTime closeTime,
            List<String> allowedStockCodes,
            int maxQuantityPerOrder,
            long maxDailyNotional
    ) {
        public boolean isWhitelisted(String stockCode) {
            return allowedStockCodes == null
                    || allowedStockCodes.isEmpty()
                    || allowedStockCodes.contains(stockCode);
        }
    }
}
