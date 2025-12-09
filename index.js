import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from 'dotenv'; 

dotenv.config(); 

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/",(req, res) => {
    res.render('index.ejs');
});

app.post('/check-price', async (req, res) => {
    function calculate24hChange(currentPrice, price24hAgo) {
        if (!price24hAgo || price24hAgo === 0) return 0;
        const change = ((currentPrice - price24hAgo) / price24hAgo) * 100;
        return change.toFixed(2);
    }

    let cryptoInput = req.body.cryptoSymbol.toUpperCase().trim();
    
    // Extract base currency (e.g., BTC from BTC-USD)
    let baseCurrency = cryptoInput;
    if (cryptoInput.includes('-')) {
        baseCurrency = cryptoInput.split('-')[0];
    }

    try {
        // Using CoinGecko API (free, no API key needed, reliable data)
        const coinGeckoIds = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'USDT': 'tether',
            'BNB': 'binancecoin',
            'SOL': 'solana',
            'XRP': 'ripple',
            'ADA': 'cardano',
            'DOGE': 'dogecoin',
            'TRX': 'tron',
            'DOT': 'polkadot',
            'MATIC': 'matic-network',
            'LTC': 'litecoin',
            'SHIB': 'shiba-inu',
            'AVAX': 'avalanche-2',
            'UNI': 'uniswap',
            'LINK': 'chainlink'
        };

        const coinId = coinGeckoIds[baseCurrency];
        
        if (!coinId) {
            return res.render("index.ejs", {
                error: `Cryptocurrency "${baseCurrency}" not supported. Try: BTC, ETH, SOL, XRP, ADA, DOGE, etc.`
            });
        }

        // Fetch data from CoinGecko
        const response = await axios.get(
            `https://api.coingecko.com/api/v3/coins/${coinId}`,
            {
                params: {
                    localization: false,
                    tickers: false,
                    community_data: false,
                    developer_data: false
                }
            }
        );

        const data = response.data;
        const marketData = data.market_data;

        if (marketData) {
            const currentPrice = marketData.current_price.usd;
            const price24hAgo = currentPrice / (1 + (marketData.price_change_percentage_24h / 100));
            const volume24h = marketData.total_volume.usd;
            const change24h = marketData.price_change_percentage_24h.toFixed(2);
            const marketCap = marketData.market_cap.usd;

            console.log(`${baseCurrency} Price: $${currentPrice}`);

            res.render("index.ejs", {
                content: `$${currentPrice.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
                Two4: `$${price24hAgo.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`,
                volume: volume24h.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0}),
                cryptoName: `${data.symbol.toUpperCase()}-USD`,
                percentage: `${change24h}%`,
                MarketCap: `$${marketCap.toLocaleString('en-US', {minimumFractionDigits: 0, maximumFractionDigits: 0})} USD`,
                data: marketData
            });
        } else {
            res.render("index.ejs", {
                error: `No market data available for ${baseCurrency}`
            });
        }
    } catch (error) {
        console.error('Error fetching cryptocurrency price:', error.message);
        
        let errorMessage = 'An error occurred while fetching the price. ';
        
        if (error.response) {
            if (error.response.status === 404) {
                errorMessage = `Cryptocurrency "${baseCurrency}" not found. Try: BTC, ETH, SOL, XRP, ADA, DOGE, etc.`;
            } else if (error.response.status === 429) {
                errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
            }
        }
        
        res.render("index.ejs", {
            error: errorMessage
        });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});