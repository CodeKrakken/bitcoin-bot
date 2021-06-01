<template>
<div>
  <ul>
    <div v-for="(report, id) in reports" :key="id">
      <li>{{ report }}</li>
    </div>
  </ul>
</div>
</template>

<script>
  export default {
    props: {
      reports: {
        type: Array
      }
    }
  }
</script>

<style scoped>

</style>