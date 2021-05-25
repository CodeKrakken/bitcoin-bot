<template>
  <div id="app">
    <Wallet />
    <Orders />
    <Market />
  </div>
</template>

<script>

import Wallet from './components/Wallet.vue'
import Orders from './components/Orders.vue'
import Market from './components/Market.vue'


export default {
  name: 'App',
  components: {
    Wallet,
    Orders,
    Market
  }
}
</script>

<style>
#app {
  font-family: Helvetica, Arial, sans-serif;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>