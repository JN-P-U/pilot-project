package com.tradingbot.kis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * 주문 요청 (프론트 → 백엔드).
 * KIS 원 파라미터로 변환은 KisApiClient 내부에서 처리합니다.
 */
public record OrderRequest(
        @NotBlank String stockCode,
        @NotNull Side side,
        @Positive int quantity,
        // 지정가 주문 시 단가. 시장가일 경우 0.
        @NotNull Long price,
        @NotNull OrderType orderType
) {
    public enum Side { BUY, SELL }

    public enum OrderType {
        MARKET("01"),
        LIMIT("00");

        private final String kisCode;

        OrderType(String kisCode) {
            this.kisCode = kisCode;
        }

        public String kisCode() {
            return kisCode;
        }
    }
}
