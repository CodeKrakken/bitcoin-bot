Vue.config.devtools = true

$(document).ready(function(){

  var app = new Vue({
    el: '#app',
    template: `
      <div>
        &nbsp &nbsp &nbsp Symbol : {{ tick.symbol }} <br>
        Last Price : {{ lastPrice }} <br>
        Current Price : {{ tick.currentPrice }}
        {{ tick.rawCurrentPrice }}
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
      newTick() {
        lastPrice = this.tick.currentPrice || 0
        // console.log(this.tick.currentPrice)
        $.get("/tick")
        .then(response => (this.tick = response))
      }
    }
  })
})