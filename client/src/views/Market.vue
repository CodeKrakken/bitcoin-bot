<template>
<div>
  MARKET <br><br>
  Symbol : {{ currentPriceObject.symbol }} <br>
  Last Price : {{ n(lastPrice, 5) }} <br>
  Current Price : {{ this.n(currentPriceObject.price, 5) }} <br>
  {{ comparePrices(lastPrice, currentPriceObject.price) }} <br>
  EMA  Close, 100 : {{ this.n(this.ema(priceHistory, 100, 'close'), 5) }} <br>
  EMA  Close, 200 : {{ this.n(this.ema(priceHistory, 200, 'close'), 5) }} <br>
  ATR, 100 : {{ this.n(this.atr(priceHistory, 100), 5) }} <br>
  ATR, 200 : {{ this.n(this.atr(priceHistory, 200), 5) }}
</div>
</template>

<script>
export default {
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
        this.rising = true
      } else if (lastPrice > currentPrice) {
        direction = '-'
        this.rising = false
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
}
</script>

<style scoped>
</style>
