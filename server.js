require('dotenv').config();
const ccxt = require('ccxt');
const axios = require('axios');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const app = express()
let lastPrice = 0;
let rising
let lastBuyTime = 0

app.use(morgan('tiny'));
app.use(cors());
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});

function run() {

  const config = {
    asset: "DOGE",
    base: "BUSD",
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
  app.get('/tick', async(req, res) => {
    try {
      res.send('Hooray')
    } catch (err) {
      console.error(err.message)
    }
  })
  trade(market, wallet, currentPrice, client, config, dateObject, orders)
  lastPrice = currentPrice
}

function report(market, lastPrice, currentPrice, wallet, config, orders, dateObject, trimmedHistory) {
  console.log('\n\nNew Tick\n--------\n')
  console.log(`Market: ${market}`)
  console.log(`SMA  Open, 200: ${n(sma(trimmedHistory, 200, 'open'), 5)}`)
  console.log(`SMA  Open, 100: ${n(sma(trimmedHistory, 100, 'open'), 5)}`)
  console.log(`EMA  Open, 200: ${n(ema(trimmedHistory, 200, 'open'), 5)}`)
  console.log(`EMA  Open, 100: ${n(ema(trimmedHistory, 100, 'open'), 5)}`)
  console.log(`SMA  High, 200: ${n(sma(trimmedHistory, 200, 'high'), 5)}`)
  console.log(`SMA  High, 100: ${n(sma(trimmedHistory, 100, 'high'), 5)}`)
  console.log(`EMA  High, 200: ${n(ema(trimmedHistory, 200, 'high'), 5)}`)
  console.log(`EMA  High, 100: ${n(ema(trimmedHistory, 100, 'high'), 5)}`)
  console.log(`SMA   Low, 200: ${n(sma(trimmedHistory, 200, 'low'), 5)}`)
  console.log(`SMA  Open, 100: ${n(sma(trimmedHistory, 100, 'low'), 5)}`)
  console.log(`EMA   Low, 200: ${n(ema(trimmedHistory, 200, 'low'), 5)}`)
  console.log(`EMA  Open, 100: ${n(ema(trimmedHistory, 100, 'low'), 5)}`)
  console.log(`SMA Close, 200: ${n(sma(trimmedHistory, 200, 'close'), 5)}`)
  console.log(`SMA  Open, 100: ${n(sma(trimmedHistory, 100, 'close'), 5)}`)
  console.log(`EMA Close, 200: ${n(ema(trimmedHistory, 200, 'close'), 5)}`)
  console.log(`EMA  Open, 100: ${n(ema(trimmedHistory, 100, 'close'), 5)}`)
  console.log(`Average True Range: ${n(atr(trimmedHistory), 5)}`)
  console.log(`\n   Last Price: ${n(lastPrice, 5)}`)
  console.log(`Current Price: ${n(currentPrice, 5)}`)
  console.log(wallet.base > config.allocation ? `  Sec til buy: ${Math.floor((config.buyInterval - (dateObject.getTime() - lastBuyTime))/1000)}` : 'Awaiting funds.')
  console.log('\n' + comparePrices(lastPrice, currentPrice))
  console.log('\nOrders\n')
  const ordersObject = trimOrders(orders, currentPrice)
  console.log(presentOrders(ordersObject))
  console.log(`\nWallet\n\n  ${n(wallet.base, 2)} ${config.base}\n+ ${n(wallet.asset, 2)} ${config.asset}\n= ${n((((wallet.base + wallet.asset) * currentPrice) + ordersObject.totals.totalCurrentDollar), 2)} ${config.base}\n= ${n((((wallet.base + wallet.asset) * currentPrice) + ordersObject.totals.totalProjectedDollar), 2)} ${config.base}`)
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
  let returnString = `Side     Time              Volume       Price        Current $   Projected $\n`
  ordersObject.orders.forEach(order => {
    returnString = returnString.concat(`${order.side}     ${order.time}     ${order.volume}        ${order.price}      ${order.currentDollar}      ${order.projectedDollar}\n\n`)
  })                                 
  returnString = returnString.concat('                                                     ' + n(ordersObject.totals.totalCurrentDollar, 2) + '      ')
  returnString = returnString.concat(n(ordersObject.totals.totalProjectedDollar, 2))
  
  return returnString
}

function extractData(dataObject, key) {
  let array = []
  dataObject.forEach(obj => {
    array.push(obj[key])
  })
  return array
}

function sma(rawData, time, parameter) {
  let data = extractData(rawData, parameter)
  if (time < data.length) {
    data = data.slice((time * -1))
  }
  return average(data)
}

function ema(rawData, time, parameter) {
  let data = extractData(rawData, parameter)
  const k = 2/(time + 1)
  let emaData = []
  emaData[0] = data[0]
  for (let i = 1; i < data.length; i++) {
    let newPoint = (data[i] * k) + (emaData[i-1] * (1-k))
    emaData.push(newPoint)
  }
  let currentEma = [...emaData].pop()
  return +currentEma.toFixed(2)
}

function atr(data, time) {
  let highs = extractData(data, 'high')
  let lows = extractData(data, 'low')
  let closes = extractData(data, 'close')
  let trueRange  = []

  for (let i = 1; i - 1 < data.length-1; i++) {
    let tr1 = (highs[i]-lows[i])
    let tr2 = Math.abs(highs[i] - closes[i])
    let tr3 = Math.abs(closes[i-1] - lows[i])
    trueRange.push(Math.max(tr1, tr2, tr3))
  }

  if (time < trueRange.length) {
    trueRange = trueRange.slice((time * -1))
  }
  return average(trueRange)
}

function average(array) {
  return (array.reduce(( a, b ) => a + b, 0 )) / array.length
}

run();
