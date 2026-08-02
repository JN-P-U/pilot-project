package com.tradingbot.kis.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * KIS 국내주식 계좌잔고 조회 응답
 * (uapi/domestic-stock/v1/trading/inquire-balance, TR_ID TTTC8434R / VTTC8434R).
 * <p>
 * 필요한 필드만 매핑합니다. output2[0].dnca_tot_amt 를 예수금(매수 가능 현금)으로 사용.
 * </p>
 */
public record BalanceResponse(
        @JsonProperty("rt_cd") String rtCd,
        @JsonProperty("msg_cd") String msgCd,
        @JsonProperty("msg1") String msg,
        List<Summary> output2
) {
    /** 계좌 요약. output2 는 대개 1건. */
    public record Summary(
            /** 예수금 총액 (원). 매수 가능 현금으로 취급. */
            @JsonProperty("dnca_tot_amt") String depositTotal,
            /** 익일 정산 금액 (참고용). */
            @JsonProperty("nxdy_excc_amt") String nextDaySettlement,
            /** D+2 예수금 (참고용). */
            @JsonProperty("prvs_rcdl_excc_amt") String d2Deposit,
            /** 총 평가 금액 (참고용). */
            @JsonProperty("tot_evlu_amt") String totalEval
    ) {}
}
