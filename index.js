import express from "express";
import bodyParser from "body-parser";
import axios from "axios";
import dotenv from 'dotenv'; 

dotenv.config(); 

const app = express();
const port = 3000;
const API_KEY = process.env.BLOCKCHAIN_API_KEY; // Add your API key to .env file
let cachedSymbols = [];


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


app.get("/", async (req, res) => {
  try {
    const headers = {
      Accept: "application/json",
      "X-API-Token": process.env.BLOCKCHAIN_API_KEY
    };

    const response = await axios.get(
      "https://api.blockchain.com/v3/exchange/tickers",
      { headers }
    );

    // ✅ extract, filter, sort
    cachedSymbols = response.data
    .map(t => t.symbol)
    .filter(s => s.endsWith("-USD") || s.endsWith("-USDT"))
    .sort();


    res.render("index.ejs", {
      symbols: cachedSymbols,
      content: null,
      cryptoName: null,
      percentage: null,
      volume: null,
      MarketCap: null
    });

  } catch (error) {
    console.error(error.message);
    res.render("index.ejs", {
      symbols: [],
      content: null,
      cryptoName: null,
      percentage: null,
      volume: null,
      MarketCap: null
    });
  }
});



app.get("/tickers", async (req, res) => {
  try {
    const headers = {
      "Accept": "application/json",
      "X-API-Token": process.env.BLOCKCHAIN_API_KEY
    };

    const response = await axios.get(
      "https://api.blockchain.com/v3/exchange/tickers",
      { headers }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


app.get("/symbols", async (req, res) => {
  try {
    const headers = {
      'Accept': 'application/json',
      'X-API-Token': process.env.BLOCKCHAIN_API_KEY
    };

    const response = await axios.get(
      "https://api.blockchain.com/v3/exchange/symbols",
      { headers }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});


app.post("/check-price", async (req, res) => {

  // helper function
  function calculate24hChange(currentPrice, price24hAgo) {
    if (!price24hAgo || price24hAgo === 0) return "0.00";
    return (((currentPrice - price24hAgo) / price24hAgo) * 100).toFixed(2);
  }

  try {
    // 1️⃣ get symbol from input (input + datalist)
    const symbol = req.body.cryptoSymbol?.toUpperCase();

    // 2️⃣ validate symbol against cached list
    if (!symbol || !cachedSymbols.includes(symbol)) {
      return res.render("index.ejs", {
        symbols: cachedSymbols,
        content: null,
        cryptoName: null,
        percentage: null,
        volume: null,
        MarketCap: null,
        error: "Invalid or unsupported cryptocurrency symbol"
      });
    }

    // 3️⃣ call ticker API
    const headers = {
      Accept: "application/json",
      "X-API-Token": process.env.BLOCKCHAIN_API_KEY
    };

    const response = await axios.get(
      `https://api.blockchain.com/v3/exchange/tickers/${symbol}`,
      { headers }
    );

    const ticker = response.data;

    // 4️⃣ extract & calculate values
    const currentPrice = ticker.last_trade_price;
    const price24hAgo = ticker.price_24h;
    const change24h = calculate24hChange(currentPrice, price24hAgo);

    // ⚠️ demo market cap (since API doesn’t provide supply)
    const circulatingSupply = 18_000_000;
    const marketCap = currentPrice * circulatingSupply;

    // 5️⃣ render page with data
    res.render("index.ejs", {
      symbols: cachedSymbols,          // 🔴 ALWAYS PASS THIS
      content: `$${currentPrice}`,
      cryptoName: ticker.symbol,
      percentage: `${change24h}%`,
      volume: ticker.volume_24h,
      MarketCap: `$${marketCap.toLocaleString()} USD`,
      error: null
    });

  } catch (error) {
    console.error("Ticker fetch error:", error.message);

    // 6️⃣ graceful error handling
    res.render("index.ejs", {
      symbols: cachedSymbols,
      content: null,
      cryptoName: null,
      percentage: null,
      volume: null,
      MarketCap: null,
      error: "Failed to fetch price data. Please try again."
    });
  }
});



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});