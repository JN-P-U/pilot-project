package com.tradingbot.trading.service;

import com.tradingbot.trading.model.QuoteView;

public interface QuoteService {
    QuoteView getQuote(String stockCode);
}
