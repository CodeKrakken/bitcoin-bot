<template>
<div id="orders">
  <div class="grid">
    <div v-for="key in Object.keys(orders.orders[0])" :key="key.id">
      <div class="grid-box">{{ key }}</div>
    </div>
  </div><br />
  <div>
    <div class="grid" v-for="order in orders.orders" :key="order.id">
      <div v-for="value in Object.values(order)" :key="value.id">
        <div class="grid-box">{{ value }}</div>
      </div>
    </div>
  </div>
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

<style scoped>

#orders {
  display: flex;
  flex-direction: column
}

.grid-box {border: 1px solid black;}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 2fr 2fr;
  grid-column-gap: 2px;
  grid-row-gap: 2px;
  width: 100%
}

</style>