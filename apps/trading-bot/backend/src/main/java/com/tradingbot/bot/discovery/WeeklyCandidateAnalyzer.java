package com.tradingbot.bot.discovery;

import com.tradingbot.bot.BotProperties;
import com.tradingbot.bot.model.DailyBar;
import com.tradingbot.config.TradingProperties;
import com.tradingbot.kis.KisApiClient;
import com.tradingbot.kis.dto.DailyPriceResponse;
import com.tradingbot.kis.dto.MinuteBarResponse;
import com.tradingbot.kis.dto.VolumeRankResponse;
import com.tradingbot.trading.model.KnownStocks;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * "지난 주" 성과를 바탕으로 BOT_CANDIDATES 를 큐레이트하는 헬퍼.
 * <p>
 * 매 tick 마다 도는 후보 발굴({@link VolumeRankCandidateProvider}) 과는 별개로,
 * 사용자가 수동으로 (또는 주간 크론으로) 호출해서 <b>다음 주에 순회할 종목 리스트</b> 를
 * 얻어 <code>BOT_CANDIDATES</code> 에 반영하기 위한 용도입니다.
 * </p>
 * 알고리즘 (모든 파라미터는 튜닝 가능):
 * <ol>
 *   <li>현재 KIS 거래대금 순위 top-K (가격 필터 적용) 를 universe 로 사용.</li>
 *   <li>각 종목의 최근 30 거래일 일봉을 조회.</li>
 *   <li>스코어 = weeklyReturn * 1.0 + volumeTrend * 5.0 + smaHealth * 3.0 + rsiHealth * 2.0
 *       <ul>
 *         <li>weeklyReturn: 최근 5거래일 종가 수익률 (%)</li>
 *         <li>volumeTrend: 최근 5거래일 평균 거래량 / 그 전 5거래일 평균 - 1 (배율)</li>
 *         <li>smaHealth: SMA5 > SMA20 이면 +1, 아니면 -1</li>
 *         <li>rsiHealth: RSI(14) ∈ [40,70] 이면 +1, 그 밖 -1 (과열/과냉 감점)</li>
 *       </ul>
 *   </li>
 *   <li>스코어 내림차순 상위 N 개를 반환.</li>
 * </ol>
 * 결과는 JSON 으로 반환되며, {@code stockCode} 필드를 콤마 결합하면 그대로
 * <code>BOT_CANDIDATES</code> 에 붙일 수 있습니다.
 */
@Service
public class WeeklyCandidateAnalyzer {

    private static final Logger log = LoggerFactory.getLogger(WeeklyCandidateAnalyzer.class);
    private static final Duration KIS_TIMEOUT = Duration.ofSeconds(5);
    private static final Pattern INDIVIDUAL_STOCK_CODE = Pattern.compile("^[0-9]{6}$");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final DateTimeFormatter KIS_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final DateTimeFormatter KIS_DATETIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final KisApiClient kisClient;
    private final BotProperties botProperties;
    private final TradingProperties tradingProperties;

    public WeeklyCandidateAnalyzer(
            KisApiClient kisClient,
            BotProperties botProperties,
            TradingProperties tradingProperties
    ) {
        this.kisClient = kisClient;
        this.botProperties = botProperties;
        this.tradingProperties = tradingProperties;
    }

    public Result analyze(int topN, int universeSize) {
        Map<String, String> universe;
        try {
            universe = discoverUniverse(universeSize);
        } catch (RuntimeException e) {
            return new Result(List.of(), "weekly", e.getMessage());
        }
        if (universe.isEmpty()) {
            return new Result(List.of(), "weekly", "universe 비어있음 (필터 후)");
        }

        List<Scored> scored = new ArrayList<>();
        for (Map.Entry<String, String> entry : universe.entrySet()) {
            String code = entry.getKey();
            String name = entry.getValue();
            try {
                List<DailyBar> bars = fetchDailyBars(code);
                if (bars.size() < 21) {
                    log.debug("스킵(주간) code={}: 봉 부족({}봉)", code, bars.size());
                    continue;
                }
                Scored s = scoreWeekly(code, name, bars);
                if (s != null) scored.add(s);
            } catch (Exception e) {
                log.debug("스킵(주간) code={}: {}", code, e.getMessage());
            }
        }
        scored.sort(Comparator.comparingDouble(Scored::totalScore).reversed());
        List<Scored> top = scored.stream().limit(Math.max(1, topN)).toList();
        return new Result(top, "weekly",
                "OK, universe=%d scored=%d".formatted(universe.size(), scored.size()));
    }

    /**
     * 당일 1분봉을 이용한 인트라데이 스코어링.
     * 지표 의미:
     * <ul>
     *   <li>returnPct: 당일 시가 → 현재가 수익률 (당일 전체 흐름)</li>
     *   <li>volumeTrendPct: 최근 5봉 평균 거래량 / 이전 5봉 평균 - 1</li>
     *   <li>SMA5/SMA20: 5분/20분 이동평균 (분봉 기반)</li>
     *   <li>RSI14: 14분 RSI</li>
     * </ul>
     * 21봉(약 21분) 미만이면 데이터 부족으로 스킵 → 장 시작 직후엔 결과가 비을 수 있음.
     */
    public Result analyzeToday(int topN, int universeSize) {
        Map<String, String> universe;
        try {
            universe = discoverUniverse(universeSize);
        } catch (RuntimeException e) {
            return new Result(List.of(), "intraday", e.getMessage());
        }
        if (universe.isEmpty()) {
            return new Result(List.of(), "intraday", "universe 비어있음 (필터 후)");
        }

        List<Scored> scored = new ArrayList<>();
        for (Map.Entry<String, String> entry : universe.entrySet()) {
            String code = entry.getKey();
            String name = entry.getValue();
            try {
                List<DailyBar> bars = fetchMinuteBars(code);
                if (bars.size() < 21) {
                    log.debug("스킵(당일) code={}: 분봉 부족({}봉)", code, bars.size());
                    continue;
                }
                Scored s = scoreIntraday(code, name, bars);
                if (s != null) scored.add(s);
            } catch (Exception e) {
                log.debug("스킵(당일) code={}: {}", code, e.getMessage());
            }
        }
        scored.sort(Comparator.comparingDouble(Scored::totalScore).reversed());
        List<Scored> top = scored.stream().limit(Math.max(1, topN)).toList();
        String msg = scored.isEmpty()
                ? "장 시작 직후이거나 분봉 데이터 부족 — 21분 이상 진행 후 재시도"
                : "OK, universe=%d scored=%d".formatted(universe.size(), scored.size());
        return new Result(top, "intraday", msg);
    }

    /**
     * 거래대금 상위 universe 를 뽑아 <b>code → name</b> 맵으로 반환.
     * name 은 KIS 응답의 {@code hts_kor_isnm} 값을 그대로 사용 (KnownStocks 에 없어도 이름이 채워짐).
     * 순서 보존을 위해 LinkedHashMap 사용.
     */
    private Map<String, String> discoverUniverse(int universeSize) {
        BotProperties.Discovery cfg = botProperties.discovery();
        VolumeRankResponse resp;
        try {
            resp = kisClient.fetchVolumeRanking(cfg.minPrice(), cfg.maxPrice()).block(KIS_TIMEOUT);
        } catch (Exception e) {
            log.warn("universe 조회 실패: {}", e.getMessage());
            throw new RuntimeException("universe 조회 실패: " + e.getMessage(), e);
        }
        if (resp == null || resp.output() == null) {
            throw new RuntimeException("universe 응답 null");
        }
        Map<String, String> universe = new LinkedHashMap<>();
        List<String> whitelist = tradingProperties.guard() == null
                ? List.of()
                : tradingProperties.guard().allowedStockCodes();
        for (VolumeRankResponse.Row row : resp.output()) {
            String code = row.stockCode();
            String name = row.stockName() == null ? "" : row.stockName().trim();
            if (code == null || !INDIVIDUAL_STOCK_CODE.matcher(code).matches()) continue;
            if (isEtfOrDerivative(name)) continue;
            if (whitelist != null && !whitelist.isEmpty() && !whitelist.contains(code)) continue;
            universe.put(code, name);
            if (universe.size() >= universeSize) break;
        }
        return universe;
    }

    private List<DailyBar> fetchMinuteBars(String code) {
        MinuteBarResponse resp = kisClient.fetchMinuteBars(code).block(KIS_TIMEOUT);
        if (resp == null || resp.output2() == null) return List.of();
        List<DailyBar> bars = new ArrayList<>();
        for (MinuteBarResponse.Row r : resp.output2()) {
            try {
                LocalDateTime ldt = LocalDateTime.parse(
                        (r.date() == null ? "" : r.date()) + (r.time() == null ? "" : r.time()),
                        KIS_DATETIME);
                Instant t = ldt.atZone(KST).toInstant();
                bars.add(new DailyBar(
                        t,
                        parseLong(r.openPrice()),
                        parseLong(r.highPrice()),
                        parseLong(r.lowPrice()),
                        parseLong(r.closePrice()),
                        parseLong(r.volume())
                ));
            } catch (Exception ignored) {
                // skip malformed row
            }
        }
        bars.sort(Comparator.comparing(DailyBar::date));
        return bars;
    }

    private List<DailyBar> fetchDailyBars(String code) {
        DailyPriceResponse resp = kisClient.fetchDailyPrices(code).block(KIS_TIMEOUT);
        if (resp == null || resp.output() == null) return List.of();
        List<DailyBar> bars = new ArrayList<>();
        for (DailyPriceResponse.Row r : resp.output()) {
            try {
                LocalDate d = LocalDate.parse(r.date(), KIS_DATE);
                Instant t = d.atStartOfDay(KST).toInstant();
                bars.add(new DailyBar(
                        t,
                        parseLong(r.openPrice()),
                        parseLong(r.highPrice()),
                        parseLong(r.lowPrice()),
                        parseLong(r.closePrice()),
                        parseLong(r.cumulativeVolume())
                ));
            } catch (Exception ignored) {
                // skip malformed row
            }
        }
        bars.sort(Comparator.comparing(DailyBar::date));
        return bars;
    }

    private Scored scoreWeekly(String code, String name, List<DailyBar> bars) {
        int n = bars.size();
        long closeToday = bars.get(n - 1).close();
        long close5d = bars.get(n - 6).close();
        long close10d = bars.get(n - 11).close();
        if (close5d <= 0 || close10d <= 0) return null;
        double weeklyReturn = ((double) (closeToday - close5d) / close5d) * 100.0;

        long volLast5 = 0, volPrev5 = 0;
        for (int i = n - 5; i < n; i++) volLast5 += bars.get(i).volume();
        for (int i = n - 10; i < n - 5; i++) volPrev5 += bars.get(i).volume();
        double volumeTrend = volPrev5 == 0 ? 0.0 : ((double) volLast5 / volPrev5) - 1.0;

        return computeScored(code, name, bars, closeToday, weeklyReturn, volumeTrend);
    }

    /**
     * 인트라데이 스코어링. bars 는 당일 1분봉 (시간순).
     * returnPct 는 <b>당일 시가 → 최신 종가</b> 로 계산해 하루 전체 흐름을 반영합니다.
     */
    private Scored scoreIntraday(String code, String name, List<DailyBar> bars) {
        int n = bars.size();
        long lastClose = bars.get(n - 1).close();
        long dayOpen = bars.get(0).open();
        if (dayOpen <= 0) return null;
        double intradayReturn = ((double) (lastClose - dayOpen) / dayOpen) * 100.0;

        long volLast5 = 0, volPrev5 = 0;
        for (int i = n - 5; i < n; i++) volLast5 += bars.get(i).volume();
        for (int i = n - 10; i < n - 5; i++) volPrev5 += bars.get(i).volume();
        double volumeTrend = volPrev5 == 0 ? 0.0 : ((double) volLast5 / volPrev5) - 1.0;

        return computeScored(code, name, bars, lastClose, intradayReturn, volumeTrend);
    }

    private Scored computeScored(
            String code, String kisName, List<DailyBar> bars,
            long referencePrice, double returnPct, double volumeTrend
    ) {
        double sma5 = sma(bars, 5);
        double sma20 = sma(bars, 20);
        double smaHealth = sma5 > sma20 ? 1.0 : -1.0;

        double rsi = rsi(bars, 14);
        double rsiHealth;
        if (Double.isNaN(rsi)) rsiHealth = 0;
        else if (rsi >= 40 && rsi <= 70) rsiHealth = 1.0;
        else rsiHealth = -1.0;

        double total = returnPct * 1.0
                + volumeTrend * 5.0
                + smaHealth * 3.0
                + rsiHealth * 2.0;

        // 우선순위: KIS 응답 이름 → 내부 KnownStocks fallback
        String stockName = (kisName != null && !kisName.isBlank())
                ? kisName
                : KnownStocks.nameOf(code);
        return new Scored(
                code,
                stockName,
                referencePrice,
                returnPct,
                volumeTrend * 100.0,
                sma5,
                sma20,
                rsi,
                total
        );
    }

    private static double sma(List<DailyBar> bars, int window) {
        int end = bars.size();
        int start = end - window;
        long sum = 0;
        for (int i = start; i < end; i++) sum += bars.get(i).close();
        return (double) sum / window;
    }

    private static double rsi(List<DailyBar> bars, int period) {
        int end = bars.size();
        if (end < period + 1) return Double.NaN;
        double avgGain = 0, avgLoss = 0;
        int start = end - period - 1;
        for (int i = start + 1; i <= start + period; i++) {
            long delta = bars.get(i).close() - bars.get(i - 1).close();
            if (delta > 0) avgGain += delta; else avgLoss += -delta;
        }
        avgGain /= period;
        avgLoss /= period;
        for (int i = start + period + 1; i < end; i++) {
            long delta = bars.get(i).close() - bars.get(i - 1).close();
            double gain = delta > 0 ? delta : 0;
            double loss = delta < 0 ? -delta : 0;
            avgGain = (avgGain * (period - 1) + gain) / period;
            avgLoss = (avgLoss * (period - 1) + loss) / period;
        }
        if (avgLoss == 0) return 100.0;
        return 100.0 - (100.0 / (1.0 + avgGain / avgLoss));
    }

    private boolean isEtfOrDerivative(String name) {
        if (name == null || name.isBlank()) return false;
        String upper = name.toUpperCase();
        List<String> brands = List.of("KODEX", "TIGER", "ACE", "SOL", "HANARO",
                "KOSEF", "ARIRANG", "RISE", "PLUS", "TIMEFOLIO", "WOORI", "MASTER", "SMART");
        for (String b : brands) {
            if (upper.startsWith(b + " ") || upper.startsWith(b + "-")) return true;
        }
        List<String> keywords = List.of("레버리지", "인버스", "선물", "ETF", "ETN");
        for (String k : keywords) {
            if (name.contains(k)) return true;
        }
        return false;
    }

    private long parseLong(String v) {
        if (v == null || v.isBlank()) return 0L;
        try { return Long.parseLong(v.trim()); }
        catch (NumberFormatException e) { return 0L; }
    }

    /** 응답 DTO. period 는 "weekly" 또는 "intraday". */
    public record Result(List<Scored> top, String period, String message) {}

    /**
     * 종목별 스코어 상세.
     * weeklyReturnPct 필드명은 하위호환을 위해 유지되나 실제 의미는 period 에 따라 달라집니다:
     * <ul>
     *   <li>weekly: 최근 5거래일 수익률</li>
     *   <li>intraday: 당일 시가→최신가 수익률</li>
     * </ul>
     */
    public record Scored(
            String stockCode,
            String stockName,
            long closePrice,
            double weeklyReturnPct,
            double volumeTrendPct,
            double sma5,
            double sma20,
            double rsi14,
            double totalScore
    ) {}
}
