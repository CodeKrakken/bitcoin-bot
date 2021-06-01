require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 8000;
const axios = require('axios')
const config = {
  base: 'BUSD',
  asset: 'DOGE',
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
    const currentTime = Date.now()
    console.log(`Tick @ ${new Date(currentTime).toLocaleString()}`)
    reports.unshift(`Tick @ ${new Date(currentTime).toLocaleString()}`)
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
    dataObject.reports = reports.slice(0, 5)
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
  if (rising && wallet[config.base] >= config.allocation && wallet[config.asset] >= config.allocation / price && timeNow - lastBuyTime > config.buyInterval) {
    refreshOrders(client, orders, price, config, market)
    await newBuyOrder(market, price, client, config)
    timeObject = new Date
    lastBuyTime = timeObject.getTime()
    newSellOrder(market, price, client, config)
  } else {
    console.log(`${rising} ${wallet[config.base]} ${config.allocation} ${wallet[config.asset]} ${price} ${timeNow} ${lastBuyTime} ${config.buyInterval}`)
  }
}

async function refreshOrders(client, orders, price, config, market) {
  let consolidatedSellVolume = 0
  let consolidatedSellPrice = Math.max.apply(Math, orders.map(function(order) { return order.price; }))
  orders.forEach(async order => {
    if (order.side === 'buy') {
      await client.cancelOrder(order.id, order.symbol)
      reports.unshift("Cancelled limit buy order")
      newBuyOrder(order.symbol, price, client, config)
    } else if (order.side === 'sell') {
      await client.cancelOrder(order.id, order.symbol)
    }
  })
  await client.createLimitSellOrder(market, consolidatedSellVolume, consolidatedSellPrice)
  reports.unshift(`Consolidated open sell orders: selling ${n(consolidatedSellVolume, 5)} ${config.asset} @ $${n(consolidatedSellPrice, 5)}`)
  orders = await client.fetchOpenOrders(market);
}

async function newBuyOrder(market, price, client, config) {
  const assetVolume = config.allocation / price
  await client.createLimitBuyOrder(market, assetVolume, price)
  reports.unshift(`\nCreated limit buy order for  ${n(assetVolume, 5)} ${config.asset} @ $${n(price)}`)
}

async function newSellOrder(market, price, client, config) {
  const assetVolume = config.allocation / price
  const profitPrice = price * (1 + config.fee*config.margin)
  await client.createLimitSellOrder(market, assetVolume, profitPrice)
  askingPrice = price
  reports.unshift(`Created limit sell order for ${n(assetVolume, 5)} ${config.asset} @ $${n(profitPrice, 5)}`)
}

app.listen(port);