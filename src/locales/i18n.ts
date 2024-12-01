import { createI18n, I18n } from 'vue-i18n';
import zh from './zh.json';
import en from './en.json';

export const SUPPORT_LOCALES: string[] = ['en', 'zh'];

const messages = {
  zh: { ...zh },
  en: { ...en },
};

interface I18nOptions {
  locale: string;
}

export function setupI18n(options: I18nOptions = { locale: 'en' }): I18n {
  const i18n = createI18n({
    legacy: false, // Use the Composition API mode
    locale: options.locale,
    messages, // Add messages directly here
  });
  //setI18nLanguage(i18n, options.locale);
  return i18n as I18n;
}

export function setI18nLanguage(i18n: I18n, locale: string): void {
  if ((i18n.mode as string) === 'legacy') {
    i18n.global.locale = locale;
  } else {
    //i18n.global.locale.value = locale;
  }

  // Setting language for headers, example for axios
  // axios.defaults.headers.common['Accept-Language'] = locale

  document.querySelector('html')?.setAttribute('lang', locale);
}
