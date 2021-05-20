// This strategy involves buying and selling $15 at a time. Many orders can be open at once.
// It sets the sell order at the same time as it sets the buy order, therefore it cannot hold during a rise.

require('dotenv').config();
const ccxt = require('ccxt');
const axios = require('axios');
let lastPrice = 0;
let rising
let lastBuyTime = 0

function run() {

  const config = {
    asset: "BTC",
    base: "USDT",
    allocation: 15,
    tickInterval: 2000,
    buyInterval: 4 * 60 * 1000,
    fee: 0.002,
    margin: 2
  };
  
  const binanceClient = new ccxt.binance({
    apiKey: process.env.API_KEY,
    secret: process.env.API_SECRET
  });
  setInterval(tick, config.tickInterval, binanceClient, config)
}

async function tick(client, config) {  
  const market = `${config.asset}/${config.base}`
  const symbol = `${config.asset}${config.base}`
  const currentPrice = await marketPrice(symbol)
  const wallet = await getWallet(client, config)
  const priceHistory = await axios.get(`https://api.binance.com/api/v1/klines?symbol=${symbol}&interval=1h`)
  const trimmedHistory = trim(priceHistory.data)
  let orders = await client.fetchOpenOrders(market);
  if (orders.length === 1) { 
    lastBuyTime = 0 
  }
  let dateObject = new Date
  report(market, lastPrice, currentPrice, wallet, config, orders, dateObject, trimmedHistory)
  trade(market, wallet, currentPrice, client, config, dateObject, orders)
  lastPrice = currentPrice
}

function report(market, lastPrice, currentPrice, wallet, config, orders, dateObject, trimmedHistory) {
  console.log('\n\nNew Tick\n--------\n')
  console.log(`Market: ${market}`)
  console.log(`Average  Open: ${n(getAverage(extractData(trimmedHistory, 'open')), 5)}`)
  console.log(`Average  High: ${n(getAverage(extractData(trimmedHistory, 'high')), 5)}`)
  console.log(`Average   Low: ${n(getAverage(extractData(trimmedHistory, 'low')), 5)}`)
  console.log(`Average Close: ${n(getAverage(extractData(trimmedHistory, 'close')), 5)}`)
  console.log(`\n   Last Price: ${n(lastPrice, 5)}`)
  console.log(`Current Price: ${n(currentPrice, 5)}`)
  console.log(wallet.base > config.allocation ? `  Sec til buy: ${Math.floor((config.buyInterval - (dateObject.getTime() - lastBuyTime))/1000)}` : 'Awaiting funds.')
  console.log('\n' + comparePrices(lastPrice, currentPrice))
  console.log('\nOrders\n')
  const ordersObject = trimOrders(orders, currentPrice)
  console.log(presentOrders(ordersObject))
  console.log(`\nWallet\n\n  ${n(wallet.base, 2)} ${config.base}\n+ ${n(wallet.asset, 2)} ${config.asset}\n= ${n((((wallet.base + wallet.asset) * currentPrice) + ordersObject[ordersObject.length-1].totalCurrentDollar), 2)} ${config.base}\n= ${n((((wallet.base + wallet.asset) * currentPrice) + ordersObject[ordersObject.length-1].totalProjectedDollar), 2)} ${config.base}`)
}

async function trade(market, wallet, price, client, config, dateObject, orders) {
  let timeNow = dateObject.getTime()
  if (rising && wallet.base >= config.allocation && wallet.asset >= config.allocation / price && timeNow - lastBuyTime > config.buyInterval) {
    refreshOrders(client, orders, price, config, market)
    await newBuyOrder(market, price, client, config)
    dateObject = new Date
    lastBuyTime = dateObject.getTime()
    newSellOrder(market, price, client, config)
  }
}

async function newBuyOrder(market, price, client, config) {
  const assetVolume = config.allocation / price
  await client.createLimitBuyOrder(market, assetVolume, price)
  console.log(`\nCreated limit buy order for  ${n(assetVolume, 5)} ${config.asset} @ $${n(price)}`)
}

async function newSellOrder(market, price, client, config) {
  const assetVolume = config.allocation / price
  const profitPrice = price * (1 + config.fee*config.margin)
  await client.createLimitSellOrder(market, assetVolume, profitPrice)
  askingPrice = price
  console.log(`Created limit sell order for ${n(assetVolume, 5)} ${config.asset} @ $${n(profitPrice, 5)}`)
}

function comparePrices(lastPrice, currentPrice) {
  let direction = '+'
  if(lastPrice < currentPrice) {
    rising = true
  } else if (lastPrice > currentPrice) {
    direction = '-'
    rising = false
  }
  const percentage = Math.abs(lastPrice - currentPrice)/lastPrice*100
  return direction + ' ' + n(percentage, 5) + '%'
}

async function getWallet(client, config) {
  const balances = await client.fetchBalance();
  const wallet = {
    asset: balances.free[config.asset],
    base: balances.free[config.base]
  }
  return wallet
}

async function marketPrice(symbol) {
  const results = await Promise.all([
    axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
  ]);
  return results[0].data.price
}


async function refreshOrders(client, orders, price, config, market) {
  let consolidatedSellVolume = 0
  let consolidatedSellPrice = Math.max.apply(Math, orders.map(function(order) { return order.price; }))
  orders.forEach(async order => {
    if (order.side === 'buy') {
      await client.cancelOrder(order.id, order.symbol)
      console.log("Cancelled limit buy order")
      newBuyOrder(order.symbol, price, client, config)
    } else if (order.side === 'sell') {
      await client.cancelOrder(order.id, order.symbol)
    }
  })
  await client.createLimitSellOrder(market, consolidatedSellVolume, consolidatedSellPrice)
  console.log(`Consolidated open sell orders: selling ${n(consolidatedSellVolume, 5)} ${config.asset} @ $${n(consolidatedSellPrice, 5)}`)
  orders = await client.fetchOpenOrders(market);
}

function n(n, d) {
  return Number.parseFloat(n).toFixed(d);
}

function trimOrders(orders, currentPrice) {
  let returnObject = {
    orders: []
  }
  let totalCurrentDollar = 0
  let totalProjectedDollar = 0
  orders.forEach(order => {
    returnObject.orders.push({
      'side': order.side,
      'time': order.timestamp,
      'volume': order.amount,
      'price': order.price,
      'currentDollar': n((order.amount * currentPrice), 2),
      'projectedDollar': n((order.amount * order.price), 2)
    })
    totalCurrentDollar += (order.amount * currentPrice)
    totalProjectedDollar += (order.amount * order.price)
  })
  returnObject['totals'] = {
    'totalCurrentDollar': totalCurrentDollar,
    'totalProjectedDollar': totalProjectedDollar
  }
  return returnObject
}

function trim(data) {
  let dataObjectArray = []
  data.forEach(period => {
    dataObjectArray.push({
      'start': period[0],
      'open': parseFloat(period[1]),
      'high': parseFloat(period[2]),
      'low': parseFloat(period[3]),
      'close': parseFloat(period[4]),
      'v': period[5],
      'end': period[6],
      'qav': period[7],
      'num_trades': period[8],
      'taker_base_vol': period[9],
      'taker_quote_vol': period[10],
      'ignore': period[11]
    })
  })
  return dataObjectArray
}

function presentOrders(ordersObject) {
  let returnArray = []
  returnArray.push(`Side     Time               Volume     Price     Current $     Projected $`)
  ordersObject.orders.forEach(order => {
    returnArray.push(`${order.side}     ${order.time}     ${order.volume}     ${order.price}     ${order.currentDollar}     ${order.projectedDollar}`)
  })
  returnArray.push(ordersObject.totals.totalCurrentDollar)
  returnArray.push(ordersObject.totals.totalProjectedDollar)
  return returnArray
}

function extractData(dataObject, key) {
  let array = []
  dataObject.forEach(obj => {
    array.push(obj[key])
  })
  return array
}

function getAverage(dataArray) {
  let total = 0.0
  dataArray.forEach(datum => {
    total += datum
  })
  return total / dataArray.length
}

run();
