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
        Average True Range : {{ this.n(atr(trimmedHistory)), 5 }}
      </div>
    `,
    data() {
      return {
        tick: {},
        timer: '',
        lastPrice: 0
      }
    },
    created() {
      this.timer = setInterval(this.newTick, 2000)
    },
    methods: {
      newTick () {
        $.get("/tick")
        .then(response => (this.updateDisplay(response)))
      },
      updateDisplay(newTick) {
        this.lastPrice = this.n(this.tick.currentPrice, 5)
        this.tick = newTick
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
      }
    }
  })
})