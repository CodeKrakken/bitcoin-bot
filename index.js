require('dotenv').config();
const ccxt = require('ccxt');
const axios = require("axios");

const tick = async (config, binanceClient) => {
  const { asset, base, spread, allocation } = config;
  const market = `${asset}/${base}`;

  // Cancel open orders left from previou tick, if any
  const orders = await binanceClient.fetchOpenOrders(market);
  orders.forEach(async order => {
    await binanceClient.cancelOrder(order.id, market);
  });

  // Fetch current market prices
  const results = await Promise.all([
    // axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
    // axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
    axios.get('https://api.binance.com/api/v3/ticker/price?symbol=DOGEBUSD')
  ]);
  const marketPrice = results[0].data.price

  // Calculate new orders parameters
  const buyPrice = marketPrice * (1 - spread);
  const sellPrice = buyPrice + spread;
  const balances = await binanceClient.fetchBalance();
  const assetBalance = balances.free[asset]; // e.g. 0.01 BTC
  const baseBalance = balances.free[base]; // e.g. 20 USDT
  const sellVolume = assetBalance * allocation;
  const buyVolume = (baseBalance * allocation) / marketPrice;

  //Send orders
  console.log(`New tick for ${market}...`)

  if (buyVolume > 1) { 
    console.log(market)
    console.log(buyVolume)
    console.log(buyPrice)
    // console.log(binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice))
    await binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice); 
    console.log(`Created limit buy order for ${buyVolume} DOGE @ $${buyPrice})`)
  }

  if (sellVolume > 1) { 
    console.log(market)
    console.log(sellVolume)
    console.log(sellPrice)
    // console.log(binanceClient.createLimitSellOrder(market, sellVolume, sellPrice))
    await binanceClient.createLimitSellOrder(market, sellVolume, sellPrice);
    console.log(`Created limit sell order for ${sellVolume} DOGE @ $${sellPrice})`)
  }

};

const run = () => {
  
  const config = { 
    asset: "DOGE",
    base: "BUSD",
    allocation: 1,     // Percentage of our available funds that we trade
    spread: 0.001,         // Percentage above and below market prices for sell and buy orders 
    tickInterval: 10000  // Duration between each tick, in milliseconds
  };
  const binanceClient = new ccxt.binance({
    apiKey: process.env.API_KEY,
    secret: process.env.API_SECRET
  });

  tick(config, binanceClient);
  setInterval(tick, config.tickInterval, config, binanceClient);
};

run();