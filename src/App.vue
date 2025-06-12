<script setup lang="ts">
import { ref, computed, onMounted, onBeforeMount } from "vue";
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