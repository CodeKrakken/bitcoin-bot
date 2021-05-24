Vue.config.devtools = true

$(document).ready(function(){

  var app = new Vue({
    el: '#app',
    template: `
      <div>
        Symbol : {{ tick.symbol }} <br>
        Last Price : {{ lastPrice }} <br>
        Current Price : {{ tick.currentPrice }}
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
        this.lastPrice = this.tick.currentPrice
        this.tick = newTick
      }
    }
  })
})