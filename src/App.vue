<script setup>
import FloatingChat from './components/FloatingChat.vue';
</script>

<template>
  <router-view :key="$route.fullPath" />
  <FloatingChat />
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f0f2f5;
}

#app {
  height: 100vh;
  width: 100vw;
}
</style>
