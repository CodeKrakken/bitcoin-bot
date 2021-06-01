<template>
<div>
  <div id="grid">

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

<style>

#grid {

}

</style>