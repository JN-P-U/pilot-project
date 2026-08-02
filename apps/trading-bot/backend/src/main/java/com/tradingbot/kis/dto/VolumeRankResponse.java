package com.tradingbot.kis.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * KIS 국내주식 거래량/거래대금 순위 응답 (uapi/domestic-stock/v1/quotations/volume-rank).
 * output 은 순위 순으로 최대 30건 반환됩니다.
 */
public record VolumeRankResponse(
        @JsonProperty("rt_cd") String rtCd,
        @JsonProperty("msg_cd") String msgCd,
        @JsonProperty("msg1") String msg,
        List<Row> output
) {
    public record Row(
            @JsonProperty("data_rank") String rank,
            @JsonProperty("mksc_shrn_iscd") String stockCode,   // 6자리
            @JsonProperty("hts_kor_isnm") String stockName,
            @JsonProperty("stck_prpr") String currentPrice,
            @JsonProperty("prdy_ctrt") String changeRate,
            @JsonProperty("acml_vol") String cumulativeVolume,
            @JsonProperty("acml_tr_pbmn") String cumulativeTradeAmount
    ) {}
}
