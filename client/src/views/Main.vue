<template>
<div id="app">
  <div id="time">
    {{ data.currentTime }}
  </div>
  <div id="grid">
    <Wallet :wallet="data.wallet" :currentPrice="data.currentPriceObject.price" />
    <Chart />
    <Market :currentPriceObject="data.currentPriceObject" :priceHistory="data.priceHistoryArray" :lastPrice="lastPrice" />
    <Orders :orders="trimOrders(data.orders, data.currentPriceObject.price)" :currentPrice="data.currentPriceObject.price" />
  </div>
</div>
</template>

<script>

import Wallet from '@/views/Wallet.vue'
import Orders from '@/views/Orders.vue'
import Market from '@/views/Market.vue'
import Chart from '@/views/Chart.vue'
import TickService from '@/services/TickService.js'

export default {
  name: 'home',
  data() {
    return {
      timer: '',
      data: {},
      lastPrice: 0,
      firstRun: true      
    }
  },
  created() {
    this.timer = setInterval(this.getTick, 2000)
  },
  components: {
    Wallet,
    Chart,
    Orders,
    Market
  },
  methods: {
    async getTick () {
      TickService.getTick()
      .then(response => this.refreshData(response))
    },
    refreshData(data) {
      if (!this.firstRun) {
        this.lastPrice = this.data.currentPriceObject.price
      }
      this.$set(this, "data", data);
      this.data.currentPriceObject.price = parseFloat(this.data.currentPriceObject.price)
      this.firstRun = false
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
    }
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