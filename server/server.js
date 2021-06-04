require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 8000;
const axios = require('axios')
const config = {
  asset: 'BNB',
  base: 'BUSD',
  allocation: 15,
  tickInterval: 2000,
  buyInterval: 4 * 60 * 1000,
  fee: 0.002,
  margin: 2
};
let lastPrice = 0;
let rising;
let reports = []
let buyCountdown = 0
let currentTime = 0
let dataObject = {}
let wallet = {}
let currentPriceRaw
let currentPrice
let priceHistory = []
let balancesRaw
let orders
let market = `${config.asset}/${config.base}`
const symbol = `${config.asset}${config.base}`
const ccxt = require('ccxt');
const binanceClient = new ccxt.binance({
  apiKey: process.env.API_KEY,
  secret: process.env.API_SECRET,
  // 'enableRateLimit': true,
});

app.use(bodyParser.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.get('/tick', async(req, res) => {
  try {
    await fetchInfo()
    updateInfo()
    // refreshOrders()
    trade()
    console.log(`Tick @ ${new Date(currentTime).toLocaleString()}`)
    res.send(dataObject)
  } catch (error) {
    console.log(error.message)
  }
})

// Trading functions

async function fetchInfo() {
  currentPriceRaw = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
  priceHistoryRaw = await axios.get(`https://api.binance.com/api/v1/klines?symbol=${symbol}&interval=1m`)
  balancesRaw = await binanceClient.fetchBalance()
  orders = await binanceClient.fetchOpenOrders(market)
}

function updateInfo() {
  if (buyCountdown > 0) { buyCountdown -= 1 }
  currentTime = Date.now()
  lastPrice = currentPrice
  currentPrice = currentPriceRaw.data.price
  rising = currentPrice > lastPrice
  priceHistoryRaw.data.forEach(period => {
    priceHistory.push({
      'startTime': period[0],
      'open': period[1],
      'high': period[2],
      'low': period[3],
      'close': period[4],
      'endTime': period[6]
    })
  })
  dataObject.currentPriceObject = currentPriceRaw.data
  dataObject.priceHistory = priceHistory
  wallet[config.asset] = balancesRaw.free[config.asset]
  wallet[config.base] = balancesRaw.free[config.base]
  dataObject.wallet = wallet
  dataObject.orders = orders
  dataObject.currentTime = currentTime
  dataObject.reports = reports.slice(reports.length-5, 5)
}

async function refreshOrders() {
  let consolidatedSellVolume = 0
  let consolidatedSellPrice = Math.max.apply(Math, orders.map(function(order) { return order.price; }))
  orders.forEach(async order => {
    if (order.side === 'buy') {
      await binanceClient.cancelOrder(order.id, order.symbol)
      reports.push("Cancelled limit buy order")
      buyCountdown = 0
    } else if (order.side === 'sell') {
      await binanceClient.cancelOrder(order.id, order.symbol)
      consolidatedSellVolume += order.amount
    }
  })
  if (orders.length > 0) {
    console.log(`Consolidating open sell orders: selling ${n(consolidatedSellVolume, 8)} ${config.asset} @ $${n(consolidatedSellPrice, 8)}`)
    await binanceClient.createLimitSellOrder(market, consolidatedSellVolume, consolidatedSellPrice)
    reports.push(`Consolidated open sell orders: selling ${n(consolidatedSellVolume, 8)} ${config.asset} @ $${n(consolidatedSellPrice, 8)}`)
  } else {
    buyCountdown = 0
  }
  orders = await binanceClient.fetchOpenOrders(market);
}

async function trade() {
  if (rising && wallet[config.base] >= config.allocation && wallet[config.asset] >= config.allocation / currentPrice && buyCountdown <= 0) {
    await newBuyOrder()
    timeObject = new Date
    lastBuyTime = timeObject.getTime()
    newSellOrder()
  } else if (buyCountdown > 0) { 
    console.log(`Ticks til buy: ${buyCountdown}`) 
  } else {
    if (rising === false) { console.log('Not rising') }
    if (wallet[config.base] < config.allocation) { console.log(`Insufficient base balance: ${wallet[config.base]}`) }
    if (wallet[config.asset] < config.allocation / currentPrice) { console.log('Insufficient asset balance') }
  }
}

async function newBuyOrder() {
  try { 
    currentPrice = parseFloat(currentPrice)
    const assetVolume = config.allocation / currentPrice
    console.log(`Creating limit buy order for ${n(assetVolume, 8)} ${config.asset} @ $${n(currentPrice, 8)}`)
    await binanceClient.createLimitBuyOrder(market, n(assetVolume, 8), n(currentPrice, 8))
    buyCountdown = 120
    reports.push(`\nCreated limit buy order for  ${n(assetVolume, 8)} ${config.asset} @ $${n(currentPrice, 8)}`)
  } catch(error) {
    console.log(error.message)
  }

}

async function newSellOrder() {
  const assetVolume = config.allocation / currentPrice
  const profitPrice = currentPrice * (1 + config.fee*config.margin)
  console.log(`Creating limit sell order for ${n(assetVolume, 8)} ${config.asset} @ $${n(profitPrice, 8)}`)
  await binanceClient.createLimitSellOrder(market, n(assetVolume, 8), n(profitPrice, 8))
  reports.push(`Created limit sell order for ${n(assetVolume, 8)} ${config.asset} @ $${n(profitPrice, 8)}`)
}

function n(n, d) {
  return Number.parseFloat(n).toFixed(d);
}


app.listen(port);