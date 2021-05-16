require('dotenv').config();
const ccxt = require('ccxt');
const axios = require("axios");

const tick = async (config, binanceClient) => {
  const { asset, base, spread, allocation } = config;
  const market = `${asset}/${base}`;

  // Cancel open orders left from previous tick, if any
  const orders = await binanceClient.fetchOpenOrders(market);
  orders.forEach(async order => {
    if (order.side === 'buy') {
      console.log("Cancelling limit buy order")
      await binanceClient.cancelOrder(order.id, market);
      console.log('Cancelled limit buy order')
    }
  });

  // Fetch current market prices
  const results = await Promise.all([
    axios.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCBUSD')
  ]);
  const marketPrice = results[0].data.price

  // Calculate new orders parameters
  const balances = await binanceClient.fetchBalance();
  const assetBalance = balances.free[asset]; // e.g. 0.01 BTC
  const baseBalance = balances.free[base] / marketPrice; // e.g. 20 USDT
  const volume = (90 * allocation) / marketPrice;
  const buyPrice = marketPrice - (marketPrice * spread);
  const sellPrice = buyPrice + (2 * spread);

  //Send orders
  console.log(`New tick for ${market}...`)
  console.log(`Market price: ${marketPrice}`)

  if (baseBalance > assetBalance) {
    console.log(`Creating limit buy order for ${volume} BTC @ $${buyPrice}`)
    await binanceClient.createLimitBuyOrder(market, volume, buyPrice); 
    console.log(`Created limit buy order for ${volume} BTC @ $${buyPrice}`)
  } else {
    console.log(baseBalance)
    console.log(assetBalance * marketPrice)
  }

  if (assetBalance > baseBalance && orders.length === 0) {
    console.log(`Creating limit sell order for ${volume} BTC @ $${sellPrice}`)
    await binanceClient.createLimitSellOrder(market, volume, sellPrice);
    console.log(`Created limit sell order for ${volume} BTC @ $${sellPrice}`)    
  } else {
    console.log(`Asset balance: ${assetBalance}`)
    console.log(`Volume: ${volume}`)
  }

};

const run = () => {
  
  const config = { 
    asset: "BTC",
    base: "BUSD",
    allocation: 1,     // Percentage of our available funds that we trade
    spread: 0.0001,         // Percentage above and below market prices for sell and buy orders 
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