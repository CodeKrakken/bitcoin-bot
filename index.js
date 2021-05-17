require('dotenv').config();
const ccxt = require('ccxt');
const axios = require('axios');
let lastPrice;
let boughtPrice = 0;
let askingPrice;
let rising
let state

function run() {

  const config = {
    asset: "DOGE",
    base: "USDT",
    allocation: 0.9,
    tickInterval: 10000,
    fee: 0.002,
    minimumTrade: 10
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
  cancelBuyOrder(client, market, orders)
  state = getState(orders, wallet, currentPrice)
  report(market, lastPrice, currentPrice, wallet, config)
  trade(market, wallet, currentPrice, client, config)
  lastPrice = currentPrice
}

function getState(orders, wallet, price) {
  let outcome
  if (orders.length === 1) {
    outcome = 'Selling'
    console.log(orders)
  } else {
    outcome = wallet.base > wallet.asset * price ? 'Waiting to buy' : 'Waiting to sell'
  }
  return outcome
}

function report(market, lastPrice, currentPrice, wallet, config) {
  console.log('')
  console.log('New Tick\n--------')
  console.log(`Market: ${market}`)
  console.log(`Action: ${state}`)
  console.log(`\nLast Price: ${lastPrice}`)
  console.log(`Current Price: ${currentPrice}`)
  if (state === 'Waiting to sell') { console.log(`Profit price: ${boughtPrice * (1 + config.fee*2)}`)}
  if (state === 'Selling') { console.log(`Selling at: ${askingPrice}`)}
  console.log('\n' + comparePrices(lastPrice, currentPrice))
  console.log(`\nWallet\n  ${wallet.base} ${config.base}\n+ ${wallet.asset} ${config.asset}\n= ${wallet.base + wallet.asset * currentPrice} ${config.base}`)
}

function trade(market, wallet, price, client, config) {
  if (state === 'Waiting to buy' && rising) {
    newBuyOrder(market, price, client, config, wallet)
  } else if (state === 'Waiting to sell' && price > (boughtPrice * (1 + config.fee*3)) && (!rising)) {
    newSellOrder(market, price, client, config, wallet)
  }
}

async function newBuyOrder(market, price, client, config, wallet) {
  const assetVolume = wallet.base / price * config.allocation
  await client.createLimitBuyOrder(market, assetVolume, price)
  boughtPrice = price
  state = 'Buying'
  console.log(`Created limit buy order for ${assetVolume} ${config.asset} @ $${price}`)
}

async function newSellOrder(market, price, client, config, wallet) {
  const assetVolume = wallet.asset * config.allocation
  await client.createLimitSellOrder(market, assetVolume, price)
  askingPrice = price
  state = 'Selling'
  console.log(`Created limit sell order for ${assetVolume} ${config.asset} @ $${price}`)
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