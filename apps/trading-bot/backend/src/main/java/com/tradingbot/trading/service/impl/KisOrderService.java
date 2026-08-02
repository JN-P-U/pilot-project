package com.tradingbot.trading.service.impl;

import com.tradingbot.config.TradingProperties;
import com.tradingbot.kis.KisApiClient;
import com.tradingbot.kis.dto.OrderRequest;
import com.tradingbot.kis.dto.OrderResponse;
import com.tradingbot.trading.model.OrderResult;
import com.tradingbot.trading.service.OrderService;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("!mock")
public class KisOrderService implements OrderService {

    private static final Logger log = LoggerFactory.getLogger(KisOrderService.class);
    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private final KisApiClient client;
    private final TradingProperties tradingProperties;

    public KisOrderService(KisApiClient client, TradingProperties tradingProperties) {
        this.client = client;
        this.tradingProperties = tradingProperties;
    }

    @Override
    public OrderResult submit(OrderRequest request) {
        if (!tradingProperties.orderEnabled()) {
            log.warn("주문이 dry-run 모드입니다. 실제 발주하지 않고 로그만 남깁니다. request={}", request);
            return new OrderResult(false, null, "dry-run (trading.order-enabled=false)", "kis-dryrun");
        }
        OrderResponse response = client.placeOrder(request).block(TIMEOUT);
        if (response == null) {
            throw new IllegalStateException("KIS 주문 응답이 비어있습니다");
        }
        boolean ok = "0".equals(response.rtCd());
        String orderNo = response.output() == null ? null : response.output().orderNo();
        return new OrderResult(ok, orderNo, response.msg(), "kis");
    }
}
