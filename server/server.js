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
let lastBuyTime = 0;
let reports = []
let buyCountdown = 0

const market = `${config.asset}/${config.base}`
const symbol = `${config.asset}${config.base}`
const ccxt = require('ccxt');
const binanceClient = new ccxt.binance({
  apiKey: process.env.API_KEY,
  secret: process.env.API_SECRET
});
app.use(bodyParser.json());
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.get('/tick', async(req, res) => {
  try {
    if (buyCountdown > 0) { buyCountdown -= 1 }
    const currentTime = Date.now()
    console.log(`Tick @ ${new Date(currentTime).toLocaleString()}`)
    const dataObject = {}
    const wallet = {}
    const currentPriceRaw = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
    const priceHistoryRaw = await axios.get(`https://api.binance.com/api/v1/klines?symbol=${symbol}&interval=1m`)
    const currentPrice = currentPriceRaw.data.price
    rising = currentPrice > lastPrice
    let priceHistory = []
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
    const balancesRaw = await binanceClient.fetchBalance()
    const ordersRaw = await binanceClient.fetchOpenOrders(market);
    dataObject.currentPriceObject = currentPriceRaw.data
    dataObject.priceHistory = priceHistory
    wallet[config.asset] = balancesRaw.free[config.asset]
    wallet[config.base] = balancesRaw.free[config.base]
    dataObject.wallet = wallet
    dataObject.orders = ordersRaw
    dataObject.currentTime = currentTime
    dataObject.reports = reports.slice(reports.length-5, 5)
    res.send(dataObject)
    trade(market, wallet, currentPrice, binanceClient, config, new Date, ordersRaw)
    lastPrice = currentPrice
  } catch (error) {
    console.log(error.message)
  }
})

// Trading functions

async function trade(market, wallet, price, client, config, timeObject, orders) {
  let timeNow = timeObject.getTime()
  if (rising && wallet[config.base] >= config.allocation && wallet[config.asset] >= config.allocation / price && buyCountdown <= 0) {
    refreshOrders(client, orders, price, config, market)
    await newBuyOrder(market, price, client, config)
    timeObject = new Date
    lastBuyTime = timeObject.getTime()
    newSellOrder(market, price, client, config)
  } else if (buyCountdown > 0) { 
    console.log(`Ticks til buy: ${buyCountdown}`) 
  } else {
    if (rising === false) { console.log('Not rising') }
    if (wallet[config.base] < config.allocation) { console.log(`Insufficient base balance: ${wallet[config.base]}`) }
    if (wallet[config.asset] < config.allocation / price) { console.log('Insufficient asset balance') }
  }
}

async function refreshOrders(client, orders, price, config, market) {
  let consolidatedSellVolume = 0
  let consolidatedSellPrice = Math.max.apply(Math, orders.map(function(order) { return order.price; }))
  orders.forEach(async order => {
    if (order.side === 'buy') {
      await client.cancelOrder(order.id, order.symbol)
      reports.push("Cancelled limit buy order")
      buyCountdown = 0
    } else if (order.side === 'sell') {
      await client.cancelOrder(order.id, order.symbol)
    }
  })
  if (orders.length > 0) {
    await client.createLimitSellOrder(market, consolidatedSellVolume, consolidatedSellPrice)
    reports.push(`Consolidated open sell orders: selling ${n(consolidatedSellVolume, 5)} ${config.asset} @ $${n(consolidatedSellPrice, 5)}`)
  } else {
    buyCountdown = 0
  }
  orders = await client.fetchOpenOrders(market);
}

async function newBuyOrder(market, price, client, config) {
  try { 
    price = parseFloat(price)
    const assetVolume = config.allocation / price
    console.log(`Creating limit buy order for ${n(assetVolume, 4)} ${config.asset} @ $${n(price, 5)}`)
    await client.createLimitBuyOrder(market, n(assetVolume, 4), n(price, 5))
    buyCountdown = 120
    reports.push(`\nCreated limit buy order for  ${n(assetVolume, 4)} ${config.asset} @ $${n(price, 5)}`)
  } catch(error) {
    console.log(error.message)
  }

}

async function newSellOrder(market, price, client, config) {
  const assetVolume = config.allocation / price
  const profitPrice = price * (1 + config.fee*config.margin)
  console.log(`Creating limit sell order for ${n(assetVolume, 4)} ${config.asset} @ $${n(profitPrice, 5)}`)
  await client.createLimitSellOrder(market, n(assetVolume, 4), n(profitPrice, 5))
  reports.push(`Created limit sell order for ${n(assetVolume, 4)} ${config.asset} @ $${n(profitPrice, 5)}`)
}

function n(n, d) {
  return Number.parseFloat(n).toFixed(d);
}


app.listen(port);