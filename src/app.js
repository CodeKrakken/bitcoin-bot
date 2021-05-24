Vue.config.devtools = true

$(document).ready(function(){

  var app = new Vue({
    el: '#app',
    template: `
      <div>
        Symbol : {{ tick.symbol }} <br>
        Last Price : {{ lastPrice }} <br>
        Current Price : {{ this.n(tick.currentPrice, 5) }} <br>
        {{ comparePrices(lastPrice, tick.currentPrice) }} <br>
        SMA  Open, 200 : {{ this.n(this.sma(this.trim(this.tick.priceHistory), 200, 'open'), 5) }} <br>
        ATR, 100 : {{ this.n(this.atr(this.trim(this.tick.priceHistory), 100), 5) }} <br>
        ATR, 200 : {{ this.n(this.atr(this.trim(this.tick.priceHistory), 200), 5) }}
      </div>
    `,
    data() {
      return {
        tick: {},
        timer: '',
        lastPrice: 0,
        trimmedHistory: []
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
      refreshData(newTick) {
        this.lastPrice = this.n(this.tick.currentPrice, 5)
        this.tick = newTick
        this.trimmedHistory = this.trim(newTick.priceHistory)
      },
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
      }
    }
  })
})