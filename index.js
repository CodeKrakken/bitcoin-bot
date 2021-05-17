require('dotenv').config();
const ccxt = require('ccxt');
const axios = require('axios');
let lastPrice;
let boughtPrice = 0;
let soldPrice = 0;
let rising
let buying

function run() {

  const config = {
    asset: "DOGE",
    base: "USDT",
    allocation: 1,
    spread: 0.0001,
    tickInterval: 10000,
    volume: 100,
    fee: 0.001
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
  buying = wallet.asset < wallet.base/currentPrice
  report(market, lastPrice, currentPrice, wallet, config)
  cancelBuyOrder(client, market)
  trade(market, wallet, currentPrice, client, config)
  lastPrice = currentPrice
}

function report(market, lastPrice, currentPrice, wallet, config) {
  console.log('')
  console.log('New Tick\n--------')
  console.log(`Market: ${market}`)
  console.log(`\nLast Price: ${lastPrice}`)
  console.log(`Current Price: ${currentPrice}`)
  if (!buying) { console.log(`Profit price: ${boughtPrice * (1 + config.fee*2)}`)}

  console.log('\n' + comparePrices(lastPrice, currentPrice))
  console.log(`\nWallet\n  ${wallet.base} ${config.base}\n+ ${wallet.asset} ${config.asset}\n= ${wallet.base + wallet.asset * currentPrice} ${config.base}`)
}

function trade(market, wallet, price, client, config) {
  const volume = config.volume
  if (buying && rising && wallet.base > volume) {
    newBuyOrder(market, price, client, volume, config)
  } else if ((!buying) && price >= boughtPrice * (1 + config.fee*2) && (!rising) && wallet.asset > volume) { //= boughtPrice*(1 + config.swing)) {
    newSellOrder(market, price, client, config.asset, volume)
  } else {
    console.log(`\nHolding\nBuying: ${buying}\nRising: ${rising}`)
  }
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

async function newBuyOrder(market, price, client, baseVolume, config) {
  const assetVolume = baseVolume / price
  await client.createLimitBuyOrder(market, assetVolume, price)
  boughtPrice = price
  buying = false
  console.log(`Created limit buy order for ${assetVolume} ${config.asset} @ $${price}`)
  profitPrice = boughtPrice * (1 + config.fee*2)
}

async function newSellOrder(market, price, client, asset, baseVolume) {
  const assetVolume = baseVolume / price
  await client.createLimitSellOrder(market, assetVolume, price)
  soldPrice = price
  buying = true
  console.log(`Created limit sell order for ${assetVolume} ${asset} @ $${price}`)
}

async function cancelBuyOrder(client, market) {
  const orders = await client.fetchOpenOrders(market);
  orders.forEach(async order => {
    if (order.side === 'buy') {
      await client.cancelOrder(order.id, market)
      buying = true
      console.log("Cancelled limit buy order")
    }
  })
}

run();