// This strategy involves buying and selling $15 at a time. Many orders can be open at once.
// It sets the sell order at the same time as it sets the buy order, therefore it cannot hold during a rise.

require('dotenv').config();
const ccxt = require('ccxt');
const axios = require('axios');
let lastPrice;
let boughtPrice = 0;
let askingPrice;
let rising
let state
let lastBuyTime = 0

function run() {

  const config = {
    asset: "BTC",
    base: "BUSD",
    allocation: 15,
    tickInterval: 2000,
    fee: 0.002,
    margin: 2
  };
  
  const binanceClient = new ccxt.binance({
    apiKey: process.env.API_KEY,
    secret: process.env.API_SECRET
  });
  
  tick(binanceClient, config)
  setInterval(tick, config.tickInterval, binanceClient, config)
}

async function tick(client, config) {
  const market = `${config.asset}/${config.base}`
  const currentPrice = await marketPrice(market)
  const wallet = await getWallet(client, config)
  const orders = await client.fetchOpenOrders(market);
  state = getState(orders, wallet, currentPrice)
  report(market, lastPrice, currentPrice, wallet, config, orders)
  trade(market, wallet, currentPrice, client, config)
  lastPrice = currentPrice
}

function getState(orders, wallet, price) {
  let outcome
  if (orders.length === 1) {
    outcome = 'Selling'
  } else {
    outcome = wallet.base > wallet.asset * price ? 'Waiting to buy' : 'Waiting to sell'
  }
  return outcome
}

function report(market, lastPrice, currentPrice, wallet, config, orders) {
  console.log('')
  console.log('New Tick\n--------')
  console.log(`Market: ${market}`)
  console.log(`Action: ${state}`)
  console.log(`\nLast Price: ${lastPrice}`)
  console.log(`Current Price: ${currentPrice}`)
  console.log(`Last Buy Time: ${lastBuyTime}`)
  if (state === 'Waiting to sell') { console.log(`Profit price: ${boughtPrice * (1 + config.fee*config.margin)}`)}
  if (state === 'Selling') { console.log(`Selling at: ${askingPrice}`)}
  console.log('\n' + comparePrices(lastPrice, currentPrice))
  console.log(`\nWallet\n  ${wallet.base} ${config.base}\n+ ${wallet.asset} ${config.asset}\n= ${wallet.base + wallet.asset * currentPrice} ${config.base}`)
}

async function trade(market, wallet, price, client, config) {
  let dateObject = new Date
  let timeNow = dateObject.getTime()
  if (rising && wallet.base >= config.allocation && wallet.asset >= config.allocation / price && timeNow - lastBuyTime > 60000) {
    await newBuyOrder(market, price, client, config, wallet)
    dateObject = new Date
    lastBuyTime = dateObject.getTime()
    newSellOrder(market, price, client, config, wallet)
  }
}

async function newBuyOrder(market, price, client, config, wallet, lastBuyTime) {
  const assetVolume = config.allocation / price
  console.log(`Creating limit buy order for ${assetVolume} ${config.asset} @ $${price}`)
  // await client.createLimitBuyOrder(market, assetVolume, price)
  state = 'Buying'
  console.log(`Created limit buy order for ${assetVolume} ${config.asset} @ $${price}`)
}

async function newSellOrder(market, price, client, config, wallet) {
  const assetVolume = config.allocation / price
  const profitPrice = price * (1 + config.fee*config.margin)
  // await client.createLimitSellOrder(market, assetVolume, profitPrice)
  askingPrice = price
  state = 'Selling'
  console.log(`Created limit sell order for ${assetVolume} ${config.asset} @ $${profitPrice}`)
}

function comparePrices(lastPrice, currentPrice) {
  let direction
  if(lastPrice < currentPrice) {
    direction = '+'
    rising = true
  } else if (lastPrice > currentPrice) {
    direction = '-'
    rising = false
  }
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


async function cancelBuyOrder(client, market, orders) {
  orders.forEach(async order => {
    if (order.side === 'buy') {
      await client.cancelOrder(order.id, market)
      console.log("Cancelled limit buy order")
    }
  })
}

run();