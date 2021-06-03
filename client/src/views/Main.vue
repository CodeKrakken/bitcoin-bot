<template>
<div id="app">
  <div id="time">
    {{ new Date(tick.currentTime).toLocaleString() }}
  </div>
  <div id="grid">
    <Wallet class="grid-box" :wallet="tick.wallet" :currentPrice="tick.currentPriceObject.price" />
    <Reports class="grid-box" :reports="tick.reports" />
    <div class="grid-box" id="CandleStick" /> 
    <Market class="grid-box" :currentPriceObject="tick.currentPriceObject" :priceHistory="tick.priceHistory" :lastPrice="lastPrice" />
    <div class="grid-box">Placeholder</div>
    <Orders class="grid-box" :orders="trimOrders(tick.orders, tick.currentPriceObject.price)" :currentPrice="tick.currentPriceObject.price" />
  </div>
</div>
</template>

<script>

import Wallet from '@/views/Wallet.vue'
import Orders from '@/views/Orders.vue'
import Market from '@/views/Market.vue'
import TickService from '@/services/TickService.js'
import Plotly from 'plotly.js-dist'
import Reports from '@/views/Reports.vue'

export default {
  name: 'home',
  data() {
    return {
      timer: '',
      tick: {},
      lastPrice: 0,
      opens: [],
      closes: [],
      highs: [],
      lows: [],
      times: [],
      trace1: {},
      data: [],
      layout: {},
      chartIsPlotted: false
    }
  },
  created() {
    this.timer = setInterval(this.getTick, 2000)
  },
  components: {
    Wallet,
    Orders,
    Market,
    Reports
  },
  methods: {
    async getTick () {
      TickService.getTick()
      .then(response => this.refreshData(response))
    },
    plotChart() {
      this.opens = this.extractData(this.tick.priceHistory, 'open')
      this.closes = this.extractData(this.tick.priceHistory, 'close')
      this.highs = this.extractData(this.tick.priceHistory, 'high')
      this.lows = this.extractData(this.tick.priceHistory, 'low')
      this.times = this.extractData(this.tick.priceHistory, 'endTime')
      var trace1 = {
        x: this.times,
        close: this.closes,
        decreasing: {line: {color: '#ff0000'}}, 
        high: this.highs,
        increasing: {line: {color: ' #00ff00'}}, 
        line: {color: 'rgba(31,119,180,1)'}, 
        low: this.lows,
        open: this.opens, 
        type: 'candlestick', 
        xaxis: 'x', 
        yaxis: 'y'
      };
      this.data = [trace1];
      this.layout = {
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
          type: 'date'
        }, 
        yaxis: {
          autorange: true,
          range: [Math.min(...this.closes)*1.2, Math.max(...this.closes)*1.2],
          type: 'linear'
        }
      };
      Plotly.plot('CandleStick', this.data, this.layout)
    },
    refreshData(tick) {
      if (this.tick.currentPriceObject !== undefined) {
        this.lastPrice = this.tick.currentPriceObject.price
        this.tick.currentPriceObject.price = parseFloat(this.tick.currentPriceObject.price)
      }
      if (!this.chartIsPlotted) {
        this.plotChart()
        this.chartIsPlotted = true
      }
      this.$set(this, "tick", tick);
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
          'Time': new Date(order.timestamp).toLocaleTimeString(),
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

<style scoped>

#app {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-content: space-between;
  justify-content: space-between
}

#grid {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr;
  grid-template-rows: 1fr 1fr;
  font-size: 100%;
  text-align: center;
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
}

#time {
  position: absolute;
  top: 0;
  left: 0
}

.grid-box {
  display: flex;
  justify-content: center;
  justify-items: center;
  align-content: center;
  align-items: center
}

</style>