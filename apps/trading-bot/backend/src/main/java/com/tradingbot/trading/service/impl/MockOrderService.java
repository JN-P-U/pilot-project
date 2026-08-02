package com.tradingbot.trading.service.impl;

import com.tradingbot.kis.dto.OrderRequest;
import com.tradingbot.trading.model.OrderResult;
import com.tradingbot.trading.service.OrderService;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

@Service
@Profile("mock")
public class MockOrderService implements OrderService {

    private static final Logger log = LoggerFactory.getLogger(MockOrderService.class);

    @Override
    public OrderResult submit(OrderRequest request) {
        log.info("[MOCK] 주문 접수 request={}", request);
        return new OrderResult(true, UUID.randomUUID().toString().substring(0, 8), "mock accepted", "mock");
    }
}
