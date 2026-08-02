package com.tradingbot.kis.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record OrderResponse(
        @JsonProperty("rt_cd") String rtCd,
        @JsonProperty("msg_cd") String msgCd,
        @JsonProperty("msg1") String msg,
        Output output
) {
    public record Output(
            @JsonProperty("KRX_FWDG_ORD_ORGNO") String orderOrganizationNo,
            @JsonProperty("ODNO") String orderNo,
            @JsonProperty("ORD_TMD") String orderTime
    ) {}
}
