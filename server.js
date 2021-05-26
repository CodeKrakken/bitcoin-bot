require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const app = express()
const axios = require('axios')
const ccxt = require('ccxt');
const binanceClient = new ccxt.binance({
  apiKey: process.env.API_KEY,
  secret: process.env.API_SECRET
});
const config = {
  base: 'BUSD',
  asset: 'DOGE'
}
const market = `${config.asset}/${config.base}`
const symbol = `${config.asset}${config.base}`

app.use(morgan('tiny'));
app.use(cors());
app.use(express.static(__dirname));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const port = process.env.PORT || 4000;
app.listen(port, () => {
    console.log(`listening on ${port}`);
});

app.get('/orders', async(req, res) => {
  try {
    const orders = await client.fetchOpenOrders(market);
    console.log(orders)
    res.send(orders)
  } catch (err) {
    console.log(err.message)
  }
})

app.get('/tick', async(req, res) => {
  try {
    console.log('getting data')
    const dataObject = {}
    const wallet = {}
    const currentPriceRaw = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
    const priceHistoryRaw = await axios.get(`https://api.binance.com/api/v1/klines?symbol=${symbol}&interval=1h`)
    const balancesRaw = await binanceClient.fetchBalance()
    const ordersRaw = await binanceClient.fetchOpenOrders(market);
    dataObject.currentPriceObject = currentPriceRaw.data
    dataObject.priceHistoryArray = priceHistoryRaw.data
    wallet[config.asset] = balancesRaw.free[config.asset]
    wallet[config.base] = balancesRaw.free[config.base]
    dataObject.wallet = wallet
    dataObject.orders = ordersRaw
    res.send(dataObject)
  } catch (error) {
    console.log(error.message)
  }
})
