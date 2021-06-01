<template>
<div>
  <div id="grid">
    <span>1</span>
    <span>2</span>
    <span>3</span>
    <span>4</span>
    <span>5</span>
    <span>6</span>
    <span>7</span>
    <span>8</span>
    <span>9</span>
    <span>10</span>
    <span>11</span>
    <span>12</span>
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

#grid {
  display: grid;
  grid-template-rows: 1fr 1fr;
  grid-template-columns: 6(1fr);
  grid-gap: 2px;
  width: 50%;
  height: 50%
}

</style>