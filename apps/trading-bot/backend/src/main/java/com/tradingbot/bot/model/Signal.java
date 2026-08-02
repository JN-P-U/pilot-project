package com.tradingbot.bot.model;

/**
 * 전략이 산출하는 시그널.
 * reason 은 UI/로그용 요약 (예: "SMA5(35700) > SMA20(34120) cross-up").
 */
public record Signal(Action action, String reason) {
    public enum Action { BUY, SELL, HOLD }

    public static Signal buy(String reason) { return new Signal(Action.BUY, reason); }
    public static Signal sell(String reason) { return new Signal(Action.SELL, reason); }
    public static Signal hold(String reason) { return new Signal(Action.HOLD, reason); }
}
