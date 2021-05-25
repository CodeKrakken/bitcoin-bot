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
    const currentPrice = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=DOGEBUSD`)
    const priceHistory = await axios.get(`https://api.binance.com/api/v1/klines?symbol=DOGEBUSD&interval=1h`)
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
    const currentPrice = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${config.asset}${config.base}`)
    const wallet = {}
      // asset : balances.free[config.asset],
      // base : balances.free[config.base]
    wallet[config.asset] = balances.free[config.asset]
    wallet[config.base] = balances.free[config.base]
    wallet['current price'] = currentPrice.data.price
    console.log(wallet)
    res.send(wallet)
  } catch (err) {
    console.log(err.message)
  }
})

app.get('/orders', async(req, res) => {
  try {
    const orders = await client.fetchOpenOrders(market);
    res.send(orders[0].data.price)
  } catch (err) {
    console.log(err.message)
  }
})

app.get('/currentPrice', async(req, res) => {
  try {
    const currentPrice = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${config.asset}${config.base}`)

  } catch (error) {
    console.log(error.message)
  }
})