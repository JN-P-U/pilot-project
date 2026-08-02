package com.tradingbot.bot;

import com.tradingbot.bot.model.BotDecision;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;
import org.springframework.stereotype.Component;

/**
 * 최근 N 개의 봇 결정 로그를 유지하는 인메모리 링 버퍼.
 */
@Component
public class DecisionLog {

    private static final int CAPACITY = 100;

    private final Deque<BotDecision> deque = new ConcurrentLinkedDeque<>();

    public void add(BotDecision d) {
        deque.addFirst(d);
        while (deque.size() > CAPACITY) {
            deque.pollLast();
        }
    }

    public List<BotDecision> recent(int limit) {
        List<BotDecision> snapshot = new ArrayList<>(deque);
        return Collections.unmodifiableList(snapshot.subList(0, Math.min(limit, snapshot.size())));
    }
}
