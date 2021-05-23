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
        tick: {}
      }
    },
    mounted() {
      $.get("/tick")
      .then(response => (this.tick = response))
    }
  })
})