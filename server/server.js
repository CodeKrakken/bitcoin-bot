require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const port = 8000;
const axios = require('axios')
const config = {
  base: 'BUSD',
  asset: 'DOGE'
}
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
    const currentTime = new Date(Date.now()).toLocaleString()
    console.log(`Tick @ ${currentTime}`)
    const dataObject = {}
    const wallet = {}
    const currentPriceRaw = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
    const priceHistoryRaw = await axios.get(`https://api.binance.com/api/v1/klines?symbol=${symbol}&interval=1m`)
    const balancesRaw = await binanceClient.fetchBalance()
    const ordersRaw = await binanceClient.fetchOpenOrders(market);
    dataObject.currentPriceObject = currentPriceRaw.data
    dataObject.priceHistoryArray = priceHistoryRaw.data
    wallet[config.asset] = balancesRaw.free[config.asset]
    wallet[config.base] = balancesRaw.free[config.base]
    dataObject.wallet = wallet
    dataObject.orders = ordersRaw
    dataObject.currentTime = currentTime
    res.send(dataObject)
  } catch (error) {
    console.log(error.message)
  }
})

app.listen(port);