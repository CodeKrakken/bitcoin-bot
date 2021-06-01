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

app.listen(port);