package com.tradingbot.kis;

import com.tradingbot.config.KisProperties;
import com.tradingbot.kis.dto.BalanceResponse;
import com.tradingbot.kis.dto.DailyPriceResponse;
import com.tradingbot.kis.dto.MinuteBarResponse;
import com.tradingbot.kis.dto.OrderRequest;
import com.tradingbot.kis.dto.OrderResponse;
import com.tradingbot.kis.dto.OverseasQuoteResponse;
import com.tradingbot.kis.dto.QuoteResponse;
import com.tradingbot.kis.dto.VolumeRankResponse;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

/**
 * KIS OpenAPI REST 호출 래퍼.
 * <p>거래ID (tr_id) 는 실전/모의 여부에 따라 다른 값을 사용합니다.</p>
 */
@Component
public class KisApiClient {

    private static final Logger log = LoggerFactory.getLogger(KisApiClient.class);

    private final WebClient kisWebClient;
    private final KisAuthService authService;
    private final KisProperties properties;

    public KisApiClient(WebClient kisWebClient, KisAuthService authService, KisProperties properties) {
        this.kisWebClient = kisWebClient;
        this.authService = authService;
        this.properties = properties;
    }

    public Mono<QuoteResponse> fetchQuote(String stockCode) {
        String trId = "FHKST01010100"; // 실전/모의 공통
        return authService.accessToken().flatMap(token -> kisWebClient.get()
                .uri(uri -> uri.path("/uapi/domestic-stock/v1/quotations/inquire-price")
                        .queryParam("FID_COND_MRKT_DIV_CODE", "J")
                        .queryParam("FID_INPUT_ISCD", stockCode)
                        .build())
                .headers(h -> {
                    h.setBearerAuth(token);
                    h.set("appkey", properties.appKey());
                    h.set("appsecret", properties.appSecret());
                    h.set("tr_id", trId);
                })
                .retrieve()
                .bodyToMono(QuoteResponse.class));
    }

    /**
     * 국내주식 거래대금 순위 상위 종목 조회. 봇의 동적 후보 발굴에 사용합니다.
     *
     * @param minPrice 최저 현재가(원). 0 이면 미적용.
     * @param maxPrice 최고 현재가(원). 0 이면 미적용.
     */
    public Mono<VolumeRankResponse> fetchVolumeRanking(long minPrice, long maxPrice) {
        String trId = "FHPST01710000"; // 국내주식 거래량순위 (실전/모의 공통)
        String priceMin = minPrice > 0 ? String.valueOf(minPrice) : "0";
        String priceMax = maxPrice > 0 ? String.valueOf(maxPrice) : "0";
        return authService.accessToken().flatMap(token -> kisWebClient.get()
                .uri(uri -> uri.path("/uapi/domestic-stock/v1/quotations/volume-rank")
                        .queryParam("FID_COND_MRKT_DIV_CODE", "J")
                        .queryParam("FID_COND_SCR_DIV_CODE", "20171")
                        .queryParam("FID_INPUT_ISCD", "0000") // 전체
                        .queryParam("FID_DIV_CLS_CODE", "0")   // 전체
                        .queryParam("FID_BLNG_CLS_CODE", "3")  // 거래금액순
                        .queryParam("FID_TRGT_CLS_CODE", "111111111")
                        .queryParam("FID_TRGT_EXLS_CLS_CODE", "000000")
                        .queryParam("FID_INPUT_PRICE_1", priceMin)
                        .queryParam("FID_INPUT_PRICE_2", priceMax)
                        .queryParam("FID_VOL_CNT", "0")
                        .queryParam("FID_INPUT_DATE_1", "0")
                        .build())
                .headers(h -> {
                    h.setBearerAuth(token);
                    h.set("appkey", properties.appKey());
                    h.set("appsecret", properties.appSecret());
                    h.set("tr_id", trId);
                })
                .retrieve()
                .bodyToMono(VolumeRankResponse.class));
    }

    /**
     * 국내주식 최근 30일 일봉 조회. 결과는 최신일이 앞쪽입니다 (내림차순).
     */
    public Mono<DailyPriceResponse> fetchDailyPrices(String stockCode) {
        String trId = "FHKST01010400"; // 실전/모의 공통
        return authService.accessToken().flatMap(token -> kisWebClient.get()
                .uri(uri -> uri.path("/uapi/domestic-stock/v1/quotations/inquire-daily-price")
                        .queryParam("FID_COND_MRKT_DIV_CODE", "J")
                        .queryParam("FID_INPUT_ISCD", stockCode)
                        .queryParam("FID_PERIOD_DIV_CODE", "D")
                        .queryParam("FID_ORG_ADJ_PRC", "1") // 수정주가 반영
                        .build())
                .headers(h -> {
                    h.setBearerAuth(token);
                    h.set("appkey", properties.appKey());
                    h.set("appsecret", properties.appSecret());
                    h.set("tr_id", trId);
                })
                .retrieve()
                .bodyToMono(DailyPriceResponse.class));
    }

    /**
     * 국내주식 당일 1분봉 조회 (최근 30봉, 시간 내림차순).
     * <p>
     * FID_INPUT_HOUR_1 = HHmmss 로 지정한 시각까지의 1분봉을 반환합니다.
     * 이 메서드는 현재 KST 시각을 자동으로 넣어 "지금까지" 의 분봉을 요청합니다.
     * </p>
     */
    public Mono<MinuteBarResponse> fetchMinuteBars(String stockCode) {
        String trId = "FHKST03010200"; // 국내주식 당일 분봉조회 (실전/모의 공통)
        String hour = ZonedDateTime.now(ZoneId.of("Asia/Seoul"))
                .toLocalTime()
                .format(DateTimeFormatter.ofPattern("HHmmss"));
        return authService.accessToken().flatMap(token -> kisWebClient.get()
                .uri(uri -> uri.path("/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice")
                        .queryParam("FID_ETC_CLS_CODE", "")
                        .queryParam("FID_COND_MRKT_DIV_CODE", "J")
                        .queryParam("FID_INPUT_ISCD", stockCode)
                        .queryParam("FID_INPUT_HOUR_1", hour)
                        .queryParam("FID_PW_DATA_INCU_YN", "Y")
                        .build())
                .headers(h -> {
                    h.setBearerAuth(token);
                    h.set("appkey", properties.appKey());
                    h.set("appsecret", properties.appSecret());
                    h.set("tr_id", trId);
                })
                .retrieve()
                .bodyToMono(MinuteBarResponse.class));
    }

    /** 마감 후에도 재현 가능하도록 시각을 명시적으로 받는 오버로드 (테스트/디버깅 용). */
    public Mono<MinuteBarResponse> fetchMinuteBars(String stockCode, LocalTime asOf) {
        String trId = "FHKST03010200";
        String hour = asOf.format(DateTimeFormatter.ofPattern("HHmmss"));
        return authService.accessToken().flatMap(token -> kisWebClient.get()
                .uri(uri -> uri.path("/uapi/domestic-stock/v1/quotations/inquire-time-itemchartprice")
                        .queryParam("FID_ETC_CLS_CODE", "")
                        .queryParam("FID_COND_MRKT_DIV_CODE", "J")
                        .queryParam("FID_INPUT_ISCD", stockCode)
                        .queryParam("FID_INPUT_HOUR_1", hour)
                        .queryParam("FID_PW_DATA_INCU_YN", "Y")
                        .build())
                .headers(h -> {
                    h.setBearerAuth(token);
                    h.set("appkey", properties.appKey());
                    h.set("appsecret", properties.appSecret());
                    h.set("tr_id", trId);
                })
                .retrieve()
                .bodyToMono(MinuteBarResponse.class));
    }

    /**
     * 국내주식 계좌 잔고 조회. 봇 매수 수량을 계좌 잔고로부터 산정할 때 사용합니다.
     * <p>
     * 응답의 output2[0].dnca_tot_amt (예수금 총액) 을 매수 가능 현금으로 취급합니다.
     * </p>
     */
    public Mono<BalanceResponse> fetchBalance() {
        String trId = properties.live() ? "TTTC8434R" : "VTTC8434R";
        return authService.accessToken().flatMap(token -> kisWebClient.get()
                .uri(uri -> uri.path("/uapi/domestic-stock/v1/trading/inquire-balance")
                        .queryParam("CANO", properties.account().cano())
                        .queryParam("ACNT_PRDT_CD", properties.account().productCode())
                        .queryParam("AFHR_FLPR_YN", "N")
                        .queryParam("OFL_YN", "")
                        .queryParam("INQR_DVSN", "02")
                        .queryParam("UNPR_DVSN", "01")
                        .queryParam("FUND_STTL_ICLD_YN", "N")
                        .queryParam("FNCG_AMT_AUTO_RDPT_YN", "N")
                        .queryParam("PRCS_DVSN", "00")
                        .queryParam("CTX_AREA_FK100", "")
                        .queryParam("CTX_AREA_NK100", "")
                        .build())
                .headers(h -> {
                    h.setBearerAuth(token);
                    h.set("appkey", properties.appKey());
                    h.set("appsecret", properties.appSecret());
                    h.set("tr_id", trId);
                })
                .retrieve()
                .bodyToMono(BalanceResponse.class));
    }

    /**
     * 해외주식(미국 등) 현재체결가 조회.
     * @param exchange KIS 거래소 코드 (예: NAS, NYS, AMS)
     * @param symbol   대문자 티커 (예: AAPL, TSLA)
     */
    public Mono<OverseasQuoteResponse> fetchOverseasQuote(String exchange, String symbol) {
        String trId = "HHDFS00000300"; // 해외주식 현재체결가 (실전/모의 공통)
        return authService.accessToken().flatMap(token -> kisWebClient.get()
                .uri(uri -> uri.path("/uapi/overseas-price/v1/quotations/price")
                        .queryParam("AUTH", "")
                        .queryParam("EXCD", exchange)
                        .queryParam("SYMB", symbol)
                        .build())
                .headers(h -> {
                    h.setBearerAuth(token);
                    h.set("appkey", properties.appKey());
                    h.set("appsecret", properties.appSecret());
                    h.set("tr_id", trId);
                })
                .retrieve()
                .bodyToMono(OverseasQuoteResponse.class));
    }

    public Mono<OrderResponse> placeOrder(OrderRequest request) {
        String trId = orderTrId(request.side());
        Map<String, String> body = Map.of(
                "CANO", properties.account().cano(),
                "ACNT_PRDT_CD", properties.account().productCode(),
                "PDNO", request.stockCode(),
                "ORD_DVSN", request.orderType().kisCode(),
                "ORD_QTY", String.valueOf(request.quantity()),
                "ORD_UNPR", String.valueOf(request.price())
        );
        log.info("KIS 주문 요청 tr_id={} body={}", trId, body);
        return authService.accessToken().flatMap(token -> kisWebClient.post()
                .uri("/uapi/domestic-stock/v1/trading/order-cash")
                .headers(h -> {
                    h.setBearerAuth(token);
                    h.set("appkey", properties.appKey());
                    h.set("appsecret", properties.appSecret());
                    h.set("tr_id", trId);
                })
                .bodyValue(body)
                .retrieve()
                .bodyToMono(OrderResponse.class));
    }

    private String orderTrId(OrderRequest.Side side) {
        // 실전: TTTC0802U(매수) / TTTC0801U(매도)
        // 모의: VTTC0802U(매수) / VTTC0801U(매도)
        String prefix = properties.live() ? "TTTC" : "VTTC";
        String suffix = side == OrderRequest.Side.BUY ? "0802U" : "0801U";
        return prefix + suffix;
    }
}
