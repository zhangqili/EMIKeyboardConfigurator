import { createApp } from "vue";
import App from "./App.vue";
import { i18n, setI18nLanguage } from "./locales/i18n.ts";
import { createPinia } from 'pinia'
import '@fontsource/noto-sans-mono';

const pinia = createPinia();
const app = createApp(App);

app.use(i18n).use(pinia).mount("#app");
