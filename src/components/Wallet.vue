<template>
  <div>
    WALLET <br><br>
    {{ n(Object.values(wallet)[0], 2) }} {{ Object.keys(wallet)[0] }} <br>
    {{ n(Object.values(wallet)[1], 2) }} {{ Object.keys(wallet)[1] }} <br>
  </div>
</template>

<script>
  export default {
    data() {
      return {
        wallet: {},
        timer: ''
      }
    },
    methods: {
      getWallet() {
        $.get("/wallet")
        .then(response => (this.refreshData(response)))
      },
      refreshData(wallet) {
        this.wallet = wallet
      },
      n(n, d) {
        return Number.parseFloat(n).toFixed(d);
      },
    },
    created() {
      this.timer = setInterval(this.getWallet(), 2000)
    },
  }
</script>

<style scoped>

</style>