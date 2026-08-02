package com.tradingbot.kis.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * KIS 현재가 시세 조회 응답 (uapi/domestic-stock/v1/quotations/inquire-price).
 * KIS 원 응답은 필드가 매우 많으므로 매매에 필요한 최소 항목만 매핑합니다.
 */
public record QuoteResponse(
        @JsonProperty("rt_cd") String rtCd,
        @JsonProperty("msg_cd") String msgCd,
        @JsonProperty("msg1") String msg,
        Output output
) {
    public record Output(
            @JsonProperty("hts_kor_isnm") String stockName,
            @JsonProperty("rprs_mrkt_kor_name") String marketName,
            @JsonProperty("stck_prpr") String currentPrice,
            @JsonProperty("stck_oprc") String openPrice,
            @JsonProperty("stck_hgpr") String highPrice,
            @JsonProperty("stck_lwpr") String lowPrice,
            @JsonProperty("prdy_vrss") String changeAmount,
            @JsonProperty("prdy_ctrt") String changeRate,
            @JsonProperty("acml_vol") String cumulativeVolume
    ) {}
}
