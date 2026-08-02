package com.tradingbot.trading.controller;

import com.tradingbot.kis.dto.OrderRequest;
import com.tradingbot.trading.guard.TradingGuard;
import com.tradingbot.trading.model.OrderResult;
import com.tradingbot.trading.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderService orderService;
    private final TradingGuard guard;

    public OrderController(OrderService orderService, TradingGuard guard) {
        this.orderService = orderService;
        this.guard = guard;
    }

    @PostMapping
    public OrderResult submit(@Valid @RequestBody OrderRequest request) {
        long referencePrice = guard.preCheck(request);
        OrderResult result = orderService.submit(request);
        if (result.accepted()) {
            guard.record(request, referencePrice);
        }
        return result;
    }
}
