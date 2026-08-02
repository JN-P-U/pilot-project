package com.tradingbot.trading.service;

import com.tradingbot.trading.model.OverseasQuoteView;

public interface OverseasQuoteService {
    OverseasQuoteView getQuote(String exchange, String symbol);
}
