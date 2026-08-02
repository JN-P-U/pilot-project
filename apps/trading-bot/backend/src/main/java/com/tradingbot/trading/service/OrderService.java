package com.tradingbot.trading.service;

import com.tradingbot.kis.dto.OrderRequest;
import com.tradingbot.trading.model.OrderResult;

public interface OrderService {
    OrderResult submit(OrderRequest request);
}
