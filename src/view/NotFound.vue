<template>
  <div class="not-found-page">
    <div class="not-found-container">
      <!-- CSS-drawn Creeper Face -->
      <div class="creeper-face">
        <div class="eye"></div>
        <div class="eye"></div>
        <div class="mouth">
          <div class="mouth-part-1"></div>
          <div class="mouth-part-2"></div>
          <div class="mouth-part-3"></div>
        </div>
      </div>

      <h1 class="status-code">404</h1>
      <p class="message">你掉进了虚空</p>
      <button @click="goHome" class="btn-home">回到主世界</button>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router';
const router = useRouter();

/**
 * Navigates the user back to the homepage.
 */
const goHome = () => {
  return router.push('/');
};
</script>

<style scoped>
.not-found-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  background-color: #212121; /* Dark cave-like background */
  font-family: 'Minecraft', sans-serif;
  color: #E0E0E0;
  text-align: center;
  padding: 2rem;
  overflow: hidden;
}

.not-found-container {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Creeper Face Styles */
.creeper-face {
  width: 120px;
  height: 120px;
  background-color: #4CAF50; /* Creeper green */
  border: 4px solid #388E3C;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 12px;
  padding: 12px;
  margin-bottom: 2rem;
  image-rendering: pixelated;
}
.eye {
  background-color: #212121;
  width: 24px;
  height: 24px;
  margin: 0 auto;
}
.mouth {
  grid-column: 1 / 3;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.mouth-part-1 {
  width: 24px;
  height: 36px;
  background-color: #212121;
}
.mouth-part-2 {
  width: 24px;
  height: 24px;
  background-color: #212121;
  align-self: flex-end;
}
.mouth-part-3 {
  width: 24px;
  height: 36px;
  background-color: #212121;
}

.status-code {
  font-size: 6rem;
  font-weight: bold;
  color: #FFF;
  text-shadow: 4px 4px 0 #585858;
}

.message {
  font-size: 1.5rem;
  margin-top: -1rem;
  margin-bottom: 0.5rem;
}

.sub-message {
  font-size: 1rem;
  color: #9E9E9E;
  margin-bottom: 2rem;
}

.btn-home {
  padding: 1rem 2rem;
  font-size: 1.5rem;
  color: white;
  background-color: #55ACEE; /* Blue button */
  border: 4px solid #4285F4;
  text-shadow: 2px 2px #3367D6;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
  font-family: 'Minecraft', sans-serif;
}

.btn-home:hover {
  background-color: #63b3f1;
}

.btn-home:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}
</style>
