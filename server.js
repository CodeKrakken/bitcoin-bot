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

app.get('/tick', async(req, res) => {
  try {
    const currentPrice = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
    const priceHistory = await axios.get(`https://api.binance.com/api/v1/klines?symbol=${symbol}&interval=1h`)
    res.send({
      symbol: currentPrice.data.symbol,
      currentPrice: currentPrice.data.price,
      priceHistory: priceHistory.data
    })

  } catch (err) {
    console.error(err.message)
  }
})

app.get('/wallet', async(req, res) => {
  try {
    const balances = await binanceClient.fetchBalance()
    const wallet = {}
      // asset : balances.free[config.asset],
      // base : balances.free[config.base]
    wallet[config.asset] = balances.free[config.asset]
    wallet[config.base] = balances.free[config.base]
    res.send(wallet)
  } catch (err) {
    console.log(err.message)
  }
})

app.get('/orders', async(req, res) => {
  try {
    const orders = await client.fetchOpenOrders(market);
    console.log(orders)
    res.send(orders)
  } catch (err) {
    console.log(err.message)
  }
})

app.get('/currentPrice', async(req, res) => {
  try {
    const currentPrice = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${config.asset}${config.base}`)
    res.send(currentPrice)
  } catch (error) {
    console.log(error.message)
  }
})

app.get('/data', async(req, res) => {
  try {
    const results = await Promise.all([
      axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`)
    ]);
    const dataObject = {}
    dataObject.currentPrice = results[0].data.price
    res.send(dataObject)
  } catch (error) {
    console.log(error.message)
  }
})