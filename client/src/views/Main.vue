<template>
<div id="app">
  <div id="time">
    {{ tick.currentTime }}
  </div>
  <div id="grid">
    <Wallet :wallet="tick.wallet" :currentPrice="tick.currentPriceObject.price" />
    <div id="CandleStick" /> 
    <Orders :orders="trimOrders(tick.orders, tick.currentPriceObject.price)" :currentPrice="tick.currentPriceObject.price" />
    <Market :currentPriceObject="tick.currentPriceObject" :priceHistory="tick.priceHistory" :lastPrice="lastPrice" />
  </div>
</div>
</template>

<script>

import Wallet from '@/views/Wallet.vue'
import Orders from '@/views/Orders.vue'
import Market from '@/views/Market.vue'
import TickService from '@/services/TickService.js'
import Plotly from 'plotly.js-dist'

export default {
  name: 'home',
  data() {
    return {
      timer: '',
      tick: {},
      lastPrice: 0,
      firstRun: true,
      open: [],
      close: [],
      high: [],
      low: [],
      times: [],
      trace1: {}
    }
  },
  created() {
    this.timer = setInterval(this.getTick, 2000)
  },
  components: {
    Wallet,
    Orders,
    Market,
  },
  methods: {
    async getTick () {
      TickService.getTick()
      .then(response => this.refreshData(response))
    },
    refreshData(tick) {
      if (!this.firstRun) {
        this.lastPrice = this.tick.currentPriceObject.price
      }
      this.$set(this, "tick", tick);
      this.tick.currentPriceObject.price = parseFloat(this.tick.currentPriceObject.price)
      this.firstRun = false
      this.opens = this.extractData(this.tick.priceHistory, 'open')
      this.closes = this.extractData(this.tick.priceHistory, 'close')
      this.highs = this.extractData(this.tick.priceHistory, 'high')
      this.lows = this.extractData(this.tick.priceHistory, 'low')
      this.times = this.extractData(this.tick.priceHistory, 'endTime')
      var trace1 = {
  
        x: this.times,
        close: this.closes,
        decreasing: {line: {color: '#7F7F7F'}}, 
        high: this.highs,
        increasing: {line: {color: '#17BECF'}}, 
        line: {color: 'rgba(31,119,180,1)'}, 
        low: this.lows,
        open: this.opens, 
        type: 'candlestick', 
        xaxis: 'x', 
        yaxis: 'y'
      };
      var data = [trace1];
      var layout = {
        dragmode: 'zoom', 
        margin: {
          r: 10, 
          t: 25, 
          b: 40, 
          l: 60
        }, 
        showlegend: false, 
        xaxis: {
          autorange: true, 
          rangeslider: {range: [this.times[0], this.times[this.times.length-1]]}, 
          title: 'Date', 
          type: 'date'
        }, 
        yaxis: {
          autorange: true,
          range: [Math.min(...this.closes)*1.2, Math.max(...this.closes)*1.2],
          type: 'linear'
        }
      };
      Plotly.plot('CandleStick', data, layout)
    },
    trimOrders(orders, currentPrice) {
      let returnObject = {
        orders: []
      }
      let totalCurrentDollar = 0
      let totalProjectedDollar = 0
      orders.forEach(order => {
        returnObject.orders.push({
          'Side': order.side,
          'Time': order.timestamp,
          'Volume': order.amount,
          '@ Price': order.price,
          '= Current BUSD': this.n((order.amount * currentPrice), 2),
          '= Projected BUSD': this.n((order.amount * order.price), 2)
        })
        totalCurrentDollar += (order.amount * currentPrice)
        totalProjectedDollar += (order.amount * order.price)
      })
      returnObject['totals'] = {
        'totalCurrentDollar': totalCurrentDollar,
        'totalProjectedDollar': totalProjectedDollar
      }
      return returnObject
    },
    n(n, d) {
      return Number.parseFloat(n).toFixed(d);
    },
    extractData(dataObject, key) {
      let array = []
      dataObject.forEach(obj => {
        array.push(obj[key])
      })
      return array
    },
  }
}
</script>

<style>

#app {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center
}

#grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  column-gap: 1vw;
  font-size: 100%;
  text-align: center;
  position: absolute;
  top: 10vh;
  bottom: 10vh;
  left: 10vh;
  right: 10vh
}

#time {
  position: absolute;
  top: 0;
  left: 0
}

</style>