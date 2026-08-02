package com.tradingbot.kis.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * KIS /oauth2/tokenP 응답. 발급된 access_token 은 24시간 유효합니다.
 */
public record TokenResponse(
        @JsonProperty("access_token") String accessToken,
        @JsonProperty("access_token_token_expired") String accessTokenExpired,
        @JsonProperty("token_type") String tokenType,
        @JsonProperty("expires_in") long expiresIn
) {}
