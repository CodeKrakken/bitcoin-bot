<template>
<div>
  WALLET <br><br>
  &nbsp; {{ n(Object.values(wallet)[0], 2) }} {{ Object.keys(wallet)[0] }} <br>
  + {{ n(Object.values(wallet)[1], 2) }} {{ Object.keys(wallet)[1] }} <br>
  = {{ n((Object.values(wallet)[0] * currentPrice) + Object.values(wallet)[1], 2) }} {{ Object.keys(wallet)[1] }} <br>
</div>
</template>

<script>
export default {
  props: {
    wallet: {
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
  }, 
}
</script>

<style scoped>
</style>