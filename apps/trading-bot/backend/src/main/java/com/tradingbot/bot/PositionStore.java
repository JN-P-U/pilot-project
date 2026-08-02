package com.tradingbot.bot;

import com.tradingbot.bot.model.Position;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.springframework.stereotype.Component;

/**
 * 인메모리 단일 포지션 저장소. 서버 재시작 시 초기화됩니다.
 * <p>실제 계좌 잔고와의 동기화는 지금 버전에서 하지 않습니다.
 * 재시작 후 계좌에 실 보유가 있으면 봇이 잔고 없다고 오인할 수 있으니 주의.</p>
 */
@Component
public class PositionStore {

    private final AtomicReference<Position> current = new AtomicReference<>();

    public Optional<Position> get() {
        return Optional.ofNullable(current.get());
    }

    public void set(Position p) {
        current.set(p);
    }

    public void clear() {
        current.set(null);
    }
}
