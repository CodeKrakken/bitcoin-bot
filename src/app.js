Vue.config.devtools = true

$(document).ready(function() {
  
  Vue.component('wallet', {
    props: {
      wallet: {
        type: Object
      },
      currentPrice: {
        type: Number
      }
    },
    template: `
      <div>
        WALLET <br><br>
        &nbsp {{ n(Object.values(wallet)[0], 2) }} {{ Object.keys(wallet)[0] }} <br>
        + {{ n(Object.values(wallet)[1], 2) }} {{ Object.keys(wallet)[1] }} <br>
        = {{ n((Object.values(wallet)[0] * currentPrice ) + Object.values(wallet)[1], 2) }} {{ Object.keys(wallet)[1] }} <br>
      </div>
    `,
    methods: {
      n(n, d) {
        return Number.parseFloat(n).toFixed(d);
      },
    },
  })






  Vue.component('orders', {
    template: `
      <div>
        ORDERS <br><br>
        <span v-for="order in orders.orders">
          <span v-for="(value, key) in order">
            {{ key }} : {{ value }} <br>
          </span>
        </span> 
      </div>
    `,
    props: {
      orders: {
        type: Object
      },
      currentPrice: {
        type: Number
      }
    },
    methods: {
      n(n, d) {
        return Number.parseFloat(n).toFixed(d);
      },
    }
  })

  Vue.component ('market', {
    template: `
      <div>
        MARKET <br><br>
        Symbol : {{ currentPriceObject.symbol }} <br>
        Last Price : {{ n(lastPrice, 5) }} <br>
        Current Price : {{ this.n(currentPriceObject.price, 5) }} <br>
        {{ comparePrices(lastPrice, currentPriceObject.price) }} <br>
        EMA  Close, 100 : {{ this.n(this.ema(this.trim(priceHistory), 100, 'close'), 5) }} <br>
        EMA  Close, 200 : {{ this.n(this.ema(this.trim(priceHistory), 200, 'close'), 5) }} <br>
        ATR, 100 : {{ this.n(this.atr(this.trim(priceHistory), 100), 5) }} <br>
        ATR, 200 : {{ this.n(this.atr(this.trim(priceHistory), 200), 5) }}
      </div>
    `,
    props: {
      currentPriceObject: {
        type: Object
      },
      priceHistory: {
        type: Array
      },
      lastPrice: {
        type: Number
      }
    },
    methods: {
      comparePrices(lastPrice, currentPrice) {
        let direction = '+'
        if(lastPrice < currentPrice) {
          rising = true
        } else if (lastPrice > currentPrice) {
          direction = '-'
          rising = false
        }
        const percentage = Math.abs(lastPrice - currentPrice)/lastPrice*100
        return direction + ' ' + this.n(percentage, 5) + '%'
      },
      trim(data) {
        let dataObjectArray = []
        data.forEach(period => {
          dataObjectArray.push({
            'start': period[0],
            'open': parseFloat(period[1]),
            'high': parseFloat(period[2]),
            'low': parseFloat(period[3]),
            'close': parseFloat(period[4]),
            'v': period[5],
            'end': period[6],
            'qav': period[7],
            'num_trades': period[8],
            'taker_base_vol': period[9],
            'taker_quote_vol': period[10],
            'ignore': period[11]
          })
        })
        return dataObjectArray
      },

      refreshData(newTick) {
        
        this.tick = newTick
      },
      
      n(n, d) {
        return Number.parseFloat(n).toFixed(d);
      },
      atr(data, time) {
        let highs = this.extractData(data, 'high')
        let lows = this.extractData(data, 'low')
        let closes = this.extractData(data, 'close')
        let trueRange  = []
      
        for (let i = 1; i - 1 < data.length-1; i++) {
          let tr1 = (highs[i]-lows[i])
          let tr2 = Math.abs(highs[i] - closes[i])
          let tr3 = Math.abs(closes[i-1] - lows[i])
          trueRange.push(Math.max(tr1, tr2, tr3))
        }
      
        if (time < trueRange.length) {
          trueRange = trueRange.slice((time * -1))
        }
        return this.average(trueRange)
      },
      
      extractData(dataObject, key) {
        let array = []
        dataObject.forEach(obj => {
          array.push(obj[key])
        })
        return array
      },
      average(array) {
        return (array.reduce(( a, b ) => a + b, 0 )) / array.length
      },
      sma(rawData, time, parameter) {
        let data = this.extractData(rawData, parameter)
        if (time < data.length) {
          data = data.slice((time * -1))
        }
        return this.average(data)
      },
      ema(rawData, time, parameter) {
        let data = this.extractData(rawData, parameter)
        const k = 2/(time + 1)
        let emaData = []
        emaData[0] = data[0]
        for (let i = 1; i < data.length; i++) {
          let newPoint = (data[i] * k) + (emaData[i-1] * (1-k))
          emaData.push(newPoint)
        }
        let currentEma = [...emaData].pop()
        return +currentEma
      }
    }
  })

  var app = new Vue({
    el: '#app',
    template: `
      <div id="app">
        <wallet :wallet="data.wallet" :currentPrice="data.currentPriceObject.price" />
        <orders :orders="trimOrders(data.orders, data.currentPriceObject.price)" :currentPrice="data.currentPriceObject.price" />
        <market :currentPriceObject="data.currentPriceObject" :priceHistory="data.priceHistoryArray" :lastPrice="lastPrice" />
      </div>
    `,
    data() {
      return {
        timer: '',
        data: {},
        lastPrice: 0,
        firstRun: true
      }
    },
    created() {
      this.timer = setInterval(this.newTick, 2000)
    },
    methods: {
      newTick () {
        $.get("/tick")
        .then(response => (this.refreshData(response)))
      },
      refreshData(data) {
        if (!this.firstRun) {
          this.lastPrice = this.data.currentPriceObject.price
        }
        this.data = data
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
  })
})
