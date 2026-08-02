package com.tradingbot.trading.controller;

import com.tradingbot.trading.model.OverseasQuoteView;
import com.tradingbot.trading.model.QuoteView;
import com.tradingbot.trading.service.OverseasQuoteService;
import com.tradingbot.trading.service.QuoteService;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/quotes")
@Validated
public class QuoteController {

    private final QuoteService quoteService;
    private final OverseasQuoteService overseasQuoteService;

    public QuoteController(QuoteService quoteService, OverseasQuoteService overseasQuoteService) {
        this.quoteService = quoteService;
        this.overseasQuoteService = overseasQuoteService;
    }

    @GetMapping("/{stockCode}")
    public QuoteView getQuote(
            @PathVariable
            @NotBlank
            @Pattern(regexp = "^[0-9]{6}$", message = "종목코드는 6자리 숫자입니다")
            String stockCode
    ) {
        return quoteService.getQuote(stockCode);
    }

    /**
     * 미국 등 해외주식 현재가. 기본 거래소는 나스닥(NAS).
     * 예: GET /api/quotes/us/AAPL, /api/quotes/us/BRK.B?exchange=NYS
     */
    @GetMapping("/us/{symbol}")
    public OverseasQuoteView getUsQuote(
            @PathVariable
            @NotBlank
            @Pattern(regexp = "^[A-Z0-9.]{1,10}$", message = "심볼은 대문자/숫자/점 1~10자입니다")
            String symbol,
            @RequestParam(defaultValue = "NAS")
            @Pattern(regexp = "^(NAS|NYS|AMS)$", message = "지원 거래소: NAS, NYS, AMS")
            String exchange
    ) {
        return overseasQuoteService.getQuote(exchange, symbol);
    }
}
