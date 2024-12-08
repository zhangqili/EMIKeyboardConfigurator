import { createApp } from "vue";
import App from "./App.vue";
import { setupI18n } from "./locales/i18n.ts";
import { createPinia } from 'pinia'

const pinia = createPinia();
const app = createApp(App);

const i18n = setupI18n();
app.use(i18n).use(pinia).mount("#app");
