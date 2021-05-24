Vue.config.devtools = true

$(document).ready(function(){

  var app = new Vue({
    el: '#app',
    template: `
      <div>
        {{ tick }}

      </div>
    `,
    data() {
      return {
        tick: {},
        timer: ''
      }
    },
    created() {
      this.timer = setInterval(this.newTick, 2000)
    },
    methods: {
      newTick() {
        $.get("/tick")
        .then(response => (this.tick = response)).bind(this)
      }
    }
  })
})