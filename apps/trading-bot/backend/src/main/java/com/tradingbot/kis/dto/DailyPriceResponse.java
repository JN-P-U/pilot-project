package com.tradingbot.kis.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * KIS 국내주식 일봉 조회 응답 (uapi/domestic-stock/v1/quotations/inquire-daily-price).
 * output 은 최근 순(내림차순) 최대 30봉이 반환됩니다.
 */
public record DailyPriceResponse(
        @JsonProperty("rt_cd") String rtCd,
        @JsonProperty("msg_cd") String msgCd,
        @JsonProperty("msg1") String msg,
        List<Row> output
) {
    public record Row(
            @JsonProperty("stck_bsop_date") String date,     // yyyyMMdd
            @JsonProperty("stck_oprc") String openPrice,
            @JsonProperty("stck_hgpr") String highPrice,
            @JsonProperty("stck_lwpr") String lowPrice,
            @JsonProperty("stck_clpr") String closePrice,
            @JsonProperty("acml_vol") String cumulativeVolume
    ) {}
}
