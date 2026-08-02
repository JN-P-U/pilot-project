package com.tradingbot.bot;

import com.tradingbot.bot.discovery.CandidateProvider;
import com.tradingbot.bot.discovery.DiscoveredCandidate;
import com.tradingbot.bot.model.BotDecision;
import com.tradingbot.bot.model.BotStatus;
import com.tradingbot.bot.model.DailyBar;
import com.tradingbot.bot.model.Position;
import com.tradingbot.bot.model.PositionSnapshot;
import com.tradingbot.bot.model.Signal;
import com.tradingbot.bot.strategy.Strategy;
import com.tradingbot.config.TradingProperties;
import com.tradingbot.kis.dto.BalanceResponse;
import com.tradingbot.kis.dto.MinuteBarResponse;
import com.tradingbot.kis.dto.OrderRequest;
import com.tradingbot.trading.guard.TradingGuard;
import com.tradingbot.trading.guard.TradingGuardException;
import com.tradingbot.trading.model.KnownStocks;
import com.tradingbot.trading.model.OrderResult;
import com.tradingbot.trading.service.OrderService;
import com.tradingbot.trading.service.QuoteService;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * 자동 매매 봇 오케스트레이터.
 * <ol>
 *   <li>스케줄러 또는 수동 /api/bot/run 으로 트리거 (기본 크론: 평일 정규장 매 1분).</li>
 *   <li>보유 포지션에 대해 손절/익절(risk overlay) 을 <b>먼저</b> 검사 → 발동 시 매도.</li>
 *   <li>{@link CandidateProvider} 로 후보 종목을 발굴 (VOLUME_RANK 동적 또는 STATIC).</li>
 *   <li>각 후보에 (a) 당일 1분봉 조회 (b) SMA+RSI 전략 판단 (c) 매수/매도 결정.</li>
 *   <li>매수 시 사이징 모드에 따라 수량 결정 (ALL_IN 이면 KIS 잔고 조회 → 예수금 기반 산정).</li>
 *   <li>주문은 기존 OrderController 파이프라인(TradingGuard + OrderService)을 재사용.</li>
 * </ol>
 */
@Service
public class BotService {

    private static final Logger log = LoggerFactory.getLogger(BotService.class);
    private static final Duration KIS_TIMEOUT = Duration.ofSeconds(5);
    private static final DateTimeFormatter KIS_DATETIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final BotProperties botProperties;
    private final TradingProperties tradingProperties;
    private final Strategy strategy;
    private final CandidateProvider candidateProvider;
    private final PositionStore positionStore;
    private final DecisionLog decisionLog;
    private final DecisionFileSink decisionFileSink;
    private final com.tradingbot.kis.KisApiClient kisClient;
    private final QuoteService quoteService;
    private final OrderService orderService;
    private final TradingGuard guard;
    private final Clock clock;

    private final AtomicReference<Instant> lastRunAt = new AtomicReference<>();
    private final AtomicReference<List<DiscoveredCandidate>> lastDiscovered =
            new AtomicReference<>(List.of());
    /** 프론트에서 사용자가 명시적으로 시작해야 스케줄러가 매매 tick 을 처리. 초기값 false. */
    private final java.util.concurrent.atomic.AtomicBoolean autoTradingActive =
            new java.util.concurrent.atomic.AtomicBoolean(false);
    /**
     * run() 동시 실행 방지 락. 이전엔 synchronized 였는데, 만약 앞 tick 이 hang 되면
     * (KIS 무응답 등) 이후 tick 이 무한 대기하며 single-thread 스케줄러 풀이 고갈되는 이슈가 있었습니다.
     * ReentrantLock 의 tryLock 을 써서 앞 tick 이 진행 중이면 새 tick 은 즉시 스킵하고
     * 다음 cron 을 기다립니다.
     */
    private final java.util.concurrent.locks.ReentrantLock runLock =
            new java.util.concurrent.locks.ReentrantLock();

    @Autowired
    public BotService(
            BotProperties botProperties,
            TradingProperties tradingProperties,
            Strategy strategy,
            CandidateProvider candidateProvider,
            PositionStore positionStore,
            DecisionLog decisionLog,
            DecisionFileSink decisionFileSink,
            com.tradingbot.kis.KisApiClient kisClient,
            QuoteService quoteService,
            OrderService orderService,
            TradingGuard guard,
            Clock clock
    ) {
        this.botProperties = botProperties;
        this.tradingProperties = tradingProperties;
        this.strategy = strategy;
        this.candidateProvider = candidateProvider;
        this.positionStore = positionStore;
        this.decisionLog = decisionLog;
        this.decisionFileSink = decisionFileSink;
        this.kisClient = kisClient;
        this.quoteService = quoteService;
        this.orderService = orderService;
        this.guard = guard;
        this.clock = clock;
    }

    /**
     * 크론 실행. 실제 트리거 시각은 bot.cron 프로퍼티가 결정 (기본 평일 정규장 매 1분).
     * <p>
     * 사용자가 프론트/API 로 명시적으로 start 한 상태(autoTradingActive=true) 일 때만 tick 을
     * 처리합니다. bot.enabled=true 여도 이 스위치가 false 면 스케줄러는 아무 것도 하지 않습니다.
     * </p>
     */
    @Scheduled(cron = "${bot.cron}", zone = "Asia/Seoul")
    public void scheduledRun() {
        if (!autoTradingActive.get()) {
            log.debug("스케줄러 tick 스킵 (autoTradingActive=false)");
            return;
        }
        log.info("스케줄러가 봇 결정 트리거");
        run();
    }

    /** 자동매매 시작. 이미 시작된 상태면 no-op. */
    public boolean start() {
        boolean changed = autoTradingActive.compareAndSet(false, true);
        if (changed) log.info("자동매매 시작 (프론트/API 트리거)");
        return autoTradingActive.get();
    }

    /** 자동매매 중지. 이미 중지된 상태면 no-op. */
    public boolean stop() {
        boolean changed = autoTradingActive.compareAndSet(true, false);
        if (changed) log.info("자동매매 중지 (프론트/API 트리거)");
        return autoTradingActive.get();
    }

    public boolean isActive() {
        return autoTradingActive.get();
    }

    /**
     * 즉시 실행. 리스크 → 후보 발굴 → 순회 순.
     * <p>
     * synchronized 대신 tryLock 을 씁니다. 앞 tick 이 아직 진행 중이면 이번 tick 은 즉시 스킵.
     * (이전 이슈: 앞 tick 이 hang → 스케줄러 pool 고갈 → 이후 모든 tick 대기)
     * </p>
     */
    public List<BotDecision> run() {
        if (!runLock.tryLock()) {
            log.warn("이전 tick 이 아직 진행 중 → 이번 tick 스킵");
            return List.of();
        }
        long startedMs = System.currentTimeMillis();
        try {
            return runInternal();
        } finally {
            runLock.unlock();
            long elapsed = System.currentTimeMillis() - startedMs;
            if (elapsed > 5000) {
                log.warn("tick 이 오래 걸림: {}ms (5s 초과)", elapsed);
            } else {
                log.debug("tick 완료 {}ms", elapsed);
            }
        }
    }

    private List<BotDecision> runInternal() {
        lastRunAt.set(Instant.now(clock));
        List<BotDecision> newDecisions = new ArrayList<>();

        // 1) 손절/익절 리스크 오버레이 (보유 종목이 있을 때만).
        Optional<Position> position = positionStore.get();
        if (position.isPresent()) {
            Optional<BotDecision> riskDecision = evaluateRisk(position.get());
            if (riskDecision.isPresent()) {
                recordDecision(newDecisions, riskDecision.get());
                position = positionStore.get(); // 매도 성공 시 clear 됐을 수 있음
            }
        }

        // 2) 후보 발굴.
        List<DiscoveredCandidate> candidates = candidateProvider.discover();
        lastDiscovered.set(candidates);
        if (candidates.isEmpty()) {
            log.info("발굴된 후보 없음");
            return newDecisions;
        }

        // 3) 후보 순회 → 전략 시그널.
        for (DiscoveredCandidate cand : candidates) {
            BotDecision d = evaluate(cand.stockCode(), position);
            recordDecision(newDecisions, d);
            if (position.isEmpty()
                    && d.signal().action() == Signal.Action.BUY
                    && d.outcome().startsWith("ordered")) {
                position = positionStore.get();
                break; // 1종목 all-in
            }
        }
        return newDecisions;
    }

    /** 결정 하나를 새 결정 리스트 + 인메모리 로그 + 파일 싱크에 동시 반영. */
    private void recordDecision(List<BotDecision> newDecisions, BotDecision d) {
        newDecisions.add(d);
        decisionLog.add(d);
        decisionFileSink.write(d);
    }

    /**
     * 보유 포지션에 손절/익절 임계 도달 시 SELL 결정을 생성. 그 외에는 empty.
     */
    private Optional<BotDecision> evaluateRisk(Position pos) {
        Instant now = Instant.now(clock);
        try {
            long currentPrice = quoteService.getQuote(pos.stockCode()).currentPrice();
            Optional<Signal> triggered = riskOverlay(pos, currentPrice);
            if (triggered.isEmpty()) {
                return Optional.empty();
            }
            Signal signal = triggered.get();
            String outcome = actOn(pos.stockCode(), signal, Optional.of(pos), currentPrice);
            return Optional.of(new BotDecision(now, pos.stockCode(), pos.stockName(),
                    signal, currentPrice, outcome));
        } catch (Exception e) {
            log.warn("리스크 오버레이 실패 code={} err={}", pos.stockCode(), e.getMessage());
            return Optional.of(new BotDecision(now, pos.stockCode(), pos.stockName(),
                    Signal.hold("리스크 평가 실패"), 0L, "error: " + e.getMessage()));
        }
    }

    private Optional<Signal> riskOverlay(Position pos, long currentPrice) {
        double stopPct = botProperties.risk().stopLossPct();
        double takePct = botProperties.risk().takeProfitPct();
        double pnlPct = ((double) (currentPrice - pos.entryPrice()) / pos.entryPrice()) * 100.0;
        if (stopPct > 0 && pnlPct <= -stopPct) {
            return Optional.of(Signal.sell(
                    "손절 발동 (진입 %,d → 현재 %,d, %.2f%%)"
                            .formatted(pos.entryPrice(), currentPrice, pnlPct)));
        }
        if (takePct > 0 && pnlPct >= takePct) {
            return Optional.of(Signal.sell(
                    "익절 발동 (진입 %,d → 현재 %,d, +%.2f%%)"
                            .formatted(pos.entryPrice(), currentPrice, pnlPct)));
        }
        return Optional.empty();
    }

    private BotDecision evaluate(String code, Optional<Position> position) {
        Instant now = Instant.now(clock);
        String name = KnownStocks.nameOf(code);
        long currentPrice = 0L;
        try {
            currentPrice = quoteService.getQuote(code).currentPrice();
            List<DailyBar> history = loadHistory(code);
            Signal signal = strategy.decide(code, history, position);
            String outcome = actOn(code, signal, position, currentPrice);
            return new BotDecision(now, code, name, signal, currentPrice, outcome);
        } catch (Exception e) {
            log.warn("봇 평가 실패 code={} err={}", code, e.getMessage());
            return new BotDecision(now, code, name, Signal.hold("평가 실패"), currentPrice,
                    "error: " + e.getMessage());
        }
    }

    private String actOn(String code, Signal signal, Optional<Position> position, long referencePrice) {
        Signal.Action action = signal.action();
        boolean sameCode = position.map(p -> p.stockCode().equals(code)).orElse(false);

        if (action == Signal.Action.HOLD) {
            return "hold";
        }
        if (action == Signal.Action.BUY && position.isPresent()) {
            return "skip: 이미 포지션 보유 (%s)".formatted(position.get().stockCode());
        }
        if (action == Signal.Action.SELL) {
            if (position.isEmpty()) {
                return "skip: 보유 포지션 없음";
            }
            if (!sameCode) {
                return "skip: 다른 종목 보유 중 (%s)".formatted(position.get().stockCode());
            }
        }

        int qty;
        if (action == Signal.Action.SELL && position.isPresent()) {
            qty = position.get().quantity();
        } else {
            // BUY: 사이징 모드에 따라 수량 결정
            qty = computeBuyQuantity(referencePrice);
            if (qty <= 0) {
                return "skip: 매수 가능 수량 0 (예수금/가격/한도 확인)";
            }
        }
        OrderRequest req = new OrderRequest(
                code,
                action == Signal.Action.BUY ? OrderRequest.Side.BUY : OrderRequest.Side.SELL,
                qty,
                0L,
                OrderRequest.OrderType.MARKET
        );

        if (!botProperties.enabled()) {
            return "dry-run: bot.enabled=false (signal=%s qty=%d @ %,d)"
                    .formatted(action, qty, referencePrice);
        }
        if (!tradingProperties.orderEnabled()) {
            return "dry-run: trading.order-enabled=false";
        }

        try {
            long guardRefPrice = guard.preCheck(req);
            OrderResult result = orderService.submit(req);
            if (result.accepted()) {
                guard.record(req, guardRefPrice);
                if (action == Signal.Action.BUY) {
                    positionStore.set(new Position(code, KnownStocks.nameOf(code), qty,
                            referencePrice, Instant.now(clock)));
                } else {
                    positionStore.clear();
                }
                return "ordered %s qty=%d @ %,d (orderNo=%s)"
                        .formatted(action, qty, referencePrice, result.orderNo());
            }
            return "not accepted: " + result.message();
        } catch (TradingGuardException e) {
            return "guard blocked: " + e.getMessage();
        } catch (Exception e) {
            return "order error: " + e.getMessage();
        }
    }

    /**
     * KIS 당일 1분봉 조회 → 오래된 순 OhlcBar 리스트.
     * <p>
     * 시간이 이른 시점(장 시작 직후) 에는 보유 봉이 부족해 전략이 HOLD 를 낼 수 있습니다.
     * 이는 안전한 기본 동작이며 별도 처리는 하지 않습니다.
     * </p>
     */
    private List<DailyBar> loadHistory(String code) {
        MinuteBarResponse resp = kisClient.fetchMinuteBars(code).block(KIS_TIMEOUT);
        if (resp == null || resp.output2() == null || resp.output2().isEmpty()) {
            return List.of();
        }
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
                // 파싱 실패 봉은 스킵
            }
        }
        bars.sort(Comparator.comparing(DailyBar::date)); // 오래된 것부터
        return bars;
    }

    /**
     * 매수 수량 결정.
     * <ul>
     *   <li>FIXED: {@code bot.quantity-per-order}</li>
     *   <li>ALL_IN: KIS 잔고 조회 → 예수금 × ratio 를 현재가로 나눠 소수점 버림</li>
     * </ul>
     * TradingGuard 의 max-quantity-per-order 는 별도로 최종 상한을 적용합니다.
     */
    private int computeBuyQuantity(long referencePrice) {
        BotProperties.Sizing sizing = botProperties.sizing();
        if (sizing == null || sizing.mode() == BotProperties.Sizing.Mode.FIXED) {
            return botProperties.quantityPerOrder();
        }
        if (referencePrice <= 0) {
            log.warn("all-in 수량 계산 실패: 기준가 <= 0");
            return 0;
        }
        long cash = fetchAvailableCash();
        if (cash <= 0) {
            log.warn("예수금 조회 실패 또는 0. 매수 스킵.");
            return 0;
        }
        double ratio = sizing.allInRatio() > 0 && sizing.allInRatio() <= 1
                ? sizing.allInRatio() : 1.0;
        long budget = (long) Math.floor(cash * ratio);
        long qty = budget / referencePrice;
        log.info("all-in 수량 계산 cash={} ratio={} price={} → qty={}",
                cash, ratio, referencePrice, qty);
        return (int) Math.max(0, Math.min(qty, Integer.MAX_VALUE));
    }

    /** 예수금(가용 현금) 조회. 실패 시 0 반환. */
    private long fetchAvailableCash() {
        try {
            BalanceResponse resp = kisClient.fetchBalance().block(KIS_TIMEOUT);
            if (resp == null || resp.output2() == null || resp.output2().isEmpty()) {
                return 0L;
            }
            BalanceResponse.Summary s = resp.output2().get(0);
            return parseLong(s.depositTotal());
        } catch (Exception e) {
            log.warn("잔고 조회 실패: {}", e.getMessage());
            return 0L;
        }
    }

    private long parseLong(String v) {
        if (v == null || v.isBlank()) return 0L;
        return Long.parseLong(v.trim());
    }

    public BotStatus status() {
        Optional<Position> position = positionStore.get();
        PositionSnapshot snapshot = position.map(this::snapshotFor).orElse(null);
        boolean dryRun = !botProperties.enabled() || !tradingProperties.orderEnabled();
        return new BotStatus(
                autoTradingActive.get(),
                botProperties.enabled(),
                dryRun,
                botProperties.cron(),
                candidateProvider.sourceName(),
                lastDiscovered.get(),
                botProperties.risk().stopLossPct(),
                botProperties.risk().takeProfitPct(),
                position.orElse(null),
                snapshot,
                lastRunAt.get(),
                decisionLog.recent(20)
        );
    }

    /** 보유 포지션에 대해 현재가 fetch → 미실현 손익 스냅샷. 시세 조회 실패 시 null 반환. */
    private PositionSnapshot snapshotFor(Position pos) {
        try {
            long cur = quoteService.getQuote(pos.stockCode()).currentPrice();
            long pnl = (cur - pos.entryPrice()) * pos.quantity();
            double pnlPct = ((double) (cur - pos.entryPrice()) / pos.entryPrice()) * 100.0;
            return new PositionSnapshot(cur, pnl, pnlPct);
        } catch (Exception e) {
            log.warn("포지션 스냅샷 조회 실패 code={} err={}", pos.stockCode(), e.getMessage());
            return null;
        }
    }
}
