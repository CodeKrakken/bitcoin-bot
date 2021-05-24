const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const app = express()
const axios = require('axios')

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
