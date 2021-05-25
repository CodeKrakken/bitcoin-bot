<template>
  <div>
    MARKET <br><br>
    Symbol : {{ tick.symbol }} <br>
    Last Price : {{ lastPrice }} <br>
    Current Price : {{ this.n(tick.currentPrice, 5) }} <br>
    {{ comparePrices(lastPrice, tick.currentPrice) }} <br>
    SMA  Open, 100 : {{ this.n(this.sma(this.trim(this.tick.priceHistory), 100, 'open'), 5) }} <br>
    SMA  Open, 200 : {{ this.n(this.sma(this.trim(this.tick.priceHistory), 200, 'open'), 5) }} <br>
    EMA  Open, 100 : {{ this.n(this.ema(this.trim(this.tick.priceHistory), 100, 'open'), 5) }} <br>
    EMA  Open, 200 : {{ this.n(this.ema(this.trim(this.tick.priceHistory), 200, 'open'), 5) }} <br>
    EMA  High, 200 : {{ this.n(this.ema(this.trim(this.tick.priceHistory), 200, 'high'), 5) }} <br>
    ATR, 100 : {{ this.n(this.atr(this.trim(this.tick.priceHistory), 100), 5) }} <br>
    ATR, 200 : {{ this.n(this.atr(this.trim(this.tick.priceHistory), 200), 5) }}
  </div>
</template>

<script>

  import $ from 'jquery'
  export default {
    data() {
      return {
        tick: {},
        lastPrice: 0,
        timer: '',
        trimmedHistory: []
      }
    },
    created() {
      this.timer = setInterval(this.newTick, 2000)
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
      newTick () {
        $.get("/tick")
        .then(response => (this.refreshData(response)))
      },
      refreshData(newData) {
        console.log(newData)
        this.lastPrice = this.n(this.tick.currentPrice, 5)
        this.tick = newData
        this.trimmedHistory = this.trim(newData.priceHistory)
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
        return +currentEma.toFixed(2)
      }
    }
  }
</script>

<style scoped>

</style>