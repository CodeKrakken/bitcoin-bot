require('dotenv').config();
const ccxt = require('ccxt');
const axios = require('axios');

const config = {
  asset: "BTC",
  base: "BUSD",
  allocation: 1,
  spread: 0.0001,
  tickInterval: 10000
};

const binanceClient = new ccxt.binance({
  apiKey: process.env.API_KEY,
  secret: process.env.API_SECRET
});

async function run(client, config, lastPrice) {
  const market = `${config.asset}/${config.base}`
  const currentPrice = await marketPrice(market)
  const wallet = await getWallet(client, config)
  console.log('')
  console.log('New Tick\n--------')
  console.log(`Market: ${market}`)
  console.log(`Last Price: ${lastPrice}`)
  console.log(`Current Price: ${currentPrice}`)
  console.log(comparePrices(lastPrice, currentPrice))
  console.log(`Wallet\nBUSD ${wallet.base}\nBTC ${wallet.asset}`)
  run(client, config, currentPrice)
}

function comparePrices(lastPrice, currentPrice) {
  const direction = lastPrice < currentPrice ? '+' : '-'
  const percentage = Math.abs(lastPrice - currentPrice)/lastPrice*100
  return direction + ' ' + percentage + '%'
}

async function getWallet(client, config) {
  const balances = await client.fetchBalance();
  const wallet = {
    asset: balances.free[config.asset],
    base: balances.free[config.base]
  }
  return wallet
}

async function marketPrice(market) {
  market = market.replace('/', '')
  const results = await Promise.all([
    axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${market}`)
  ]);
  return results[0].data.price
}



async function newBuyOrder(market, volume, price) {
  console.log(`Creating limit buy order for ${volume} BTC @ $${price}`)
  await binanceClient.createLimitBuyOrder(market, volume, price)
  console.log(`Created limit buy order for ${volume} BTC @ $${price}`)
}

async function newSellOrder(market, volume, price) {
  console.log(`Creating limit sell order for ${volume} BTC @ $${price}`)
  await binanceClient.createLimitSellOrder(market, volume, price)
  console.log(`Created limit sell order for ${volume} BTC @ $${price}`)
}

async function cancelBuyOrder(market) {
  const orders = await binanceClient.fetchOpenOrders(market);
  orders.forEach(async order => {
    if (order.side === 'buy') {
      console.log("Cancelling limit buy order")
      await binanceClient.cancelOrder(order.id, market)
      console.log("Cancelled limit buy order")
    }
  })
}

run(binanceClient, config);