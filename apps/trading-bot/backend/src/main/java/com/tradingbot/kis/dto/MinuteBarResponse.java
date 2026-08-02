package com.tradingbot.kis.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * KIS 국내주식 당일 분봉 조회 응답
 * (uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice, TR_ID FHKST03010200).
 * <p>
 * output2 는 시간 내림차순 (최신 → 과거) 최대 30봉. 각 봉은 1분 캔들.
 * </p>
 */
public record MinuteBarResponse(
        @JsonProperty("rt_cd") String rtCd,
        @JsonProperty("msg_cd") String msgCd,
        @JsonProperty("msg1") String msg,
        List<Row> output2
) {
    public record Row(
            @JsonProperty("stck_bsop_date") String date,   // yyyyMMdd
            @JsonProperty("stck_cntg_hour") String time,   // HHmmss
            @JsonProperty("stck_prpr") String closePrice,  // 봉의 종가 = 현재가
            @JsonProperty("stck_oprc") String openPrice,
            @JsonProperty("stck_hgpr") String highPrice,
            @JsonProperty("stck_lwpr") String lowPrice,
            @JsonProperty("cntg_vol") String volume
    ) {}
}
