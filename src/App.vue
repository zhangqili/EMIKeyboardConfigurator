<script setup lang="ts">
import { ref, computed, onMounted, onBeforeMount } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useOsTheme, darkTheme, NConfigProvider } from 'naive-ui'
import Application from './components/Application.vue';
import Main from './components/Main.vue';
import * as controller from "emi-keyboard-controller"
import { setI18nLanguage } from "./locales/i18n";
import { useMainStore } from "./store/main";
import { storeToRefs } from "pinia";
const store = useMainStore();
const { 
  theme_name
} = storeToRefs(store);

const greetMsg = ref("");
const name = ref("");


async function greet() {
  // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
  greetMsg.value = await invoke("greet", { name: name.value });
}

theme_name.value = useOsTheme().value === 'dark' ? 'dark' : 'light';
const theme = computed(() => (theme_name.value === 'dark' ? darkTheme : null));

window.addEventListener("contextmenu", (e) => e.preventDefault(), false);

</script>

<template>
  <n-config-provider :theme="theme">
    <Application>
      <Main>
      </Main>
    </Application>
  </n-config-provider>
  <!--   <main class="container">
    <h1>Welcome to Tauri + Vue</h1>

    <div class="row">
      <a href="https://vitejs.dev" target="_blank">
        <img src="/vite.svg" class="logo vite" alt="Vite logo" />
      </a>
      <a href="https://tauri.app" target="_blank">
        <img src="/tauri.svg" class="logo tauri" alt="Tauri logo" />
      </a>
      <a href="https://vuejs.org/" target="_blank">
        <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
      </a>
    </div>
    <p>Click on the Tauri, Vite, and Vue logos to learn more.</p>

    <form class="row" @submit.prevent="greet">
      <input id="greet-input" v-model="name" placeholder="Enter a name..." />
      <button type="submit">Greet</button>
    </form>
    <p>{{ greetMsg }}</p>
  </main> -->
</template>

<style scoped>
</style>
<style>
:root {
  font-family: Inter, Avenir, Helvetica, Arial, sans-serif;
  font-size: 16px;
  line-height: 24px;
  font-weight: 400;

  color: #0f0f0f;
  background-color: #f6f6f6;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}


.no-select {
  user-select: none; /* 禁止文本选择 */
  -webkit-user-select: none; /* 兼容 Safari */
  -ms-user-select: none; /* 兼容旧版 IE */
}
</style>