package com.tradingbot.trading.model;

import java.util.Map;

/**
 * 자주 사용하는 종목의 한글명 fallback.
 * KIS 응답에 <code>hts_kor_isnm</code> 이 비어있을 때 UI 가 코드만 표시되지 않도록 보조합니다.
 * mock 프로필에서도 UI 검증용으로 사용합니다.
 */
public final class KnownStocks {

    private static final Map<String, String> NAMES = Map.ofEntries(
            Map.entry("005930", "삼성전자"),
            Map.entry("000660", "SK하이닉스"),
            Map.entry("035420", "NAVER"),
            Map.entry("035720", "카카오"),
            Map.entry("051910", "LG화학"),
            Map.entry("005380", "현대차"),
            Map.entry("068270", "셀트리온"),
            Map.entry("207940", "삼성바이오로직스"),
            Map.entry("373220", "LG에너지솔루션"),
            Map.entry("005490", "POSCO홀딩스"),
            Map.entry("105560", "KB금융"),
            Map.entry("055550", "신한지주"),
            Map.entry("032830", "삼성생명"),
            Map.entry("009150", "삼성전기"),
            Map.entry("012330", "현대모비스"),
            Map.entry("086790", "하나금융지주"),
            Map.entry("316140", "우리금융지주"),
            Map.entry("042660", "한화오션"),
            Map.entry("010140", "삼성중공업"),
            Map.entry("006800", "미래에셋증권"),
            Map.entry("015760", "한국전력"),
            Map.entry("000270", "기아"),
            Map.entry("003670", "포스코퓨처엠"),
            Map.entry("034730", "SK"),
            Map.entry("003550", "LG")
    );

    private KnownStocks() {}

    public static String nameOf(String stockCode) {
        return NAMES.getOrDefault(stockCode, "");
    }
}
