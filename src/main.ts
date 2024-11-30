import { createApp } from "vue";
import App from "./App.vue";
import { setupI18n } from "./locales/i18n.ts";

const i18n = setupI18n();
createApp(App).use(i18n).mount("#app");
