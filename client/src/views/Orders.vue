<template>
<div>
  ORDERS <br><br>
  <span v-for="order in orders.orders" :key="order.id">
    <span v-for="(value, key) in order" :key=value.id>
      {{ key }} : {{ value }} <br>
    </span>
  </span> 
</div>
</template>

<script>
export default {
  props: {
    orders: {
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
  }
}
</script>

<style>
</style>