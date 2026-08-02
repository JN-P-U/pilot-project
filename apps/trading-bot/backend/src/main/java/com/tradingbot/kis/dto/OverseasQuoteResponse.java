package com.tradingbot.kis.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * KIS 해외주식 현재체결가 응답 (uapi/overseas-price/v1/quotations/price).
 * 국내 주식과 스키마가 완전히 별도이며, 가격이 소수점 단위입니다.
 */
public record OverseasQuoteResponse(
        @JsonProperty("rt_cd") String rtCd,
        @JsonProperty("msg_cd") String msgCd,
        @JsonProperty("msg1") String msg,
        Output output
) {
    public record Output(
            @JsonProperty("rsym") String referenceSymbol,
            @JsonProperty("zdiv") String decimalDigits,
            @JsonProperty("base") String previousClose,
            @JsonProperty("last") String currentPrice,
            @JsonProperty("open") String openPrice,
            @JsonProperty("high") String highPrice,
            @JsonProperty("low") String lowPrice,
            @JsonProperty("diff") String changeAmount,
            @JsonProperty("rate") String changeRate,
            @JsonProperty("tvol") String tradeVolume,
            @JsonProperty("tamt") String tradeAmount,
            @JsonProperty("ordy") String orderable
    ) {}
}
