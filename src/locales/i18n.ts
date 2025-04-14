import { createI18n, I18n } from 'vue-i18n';
import zh from './zh.json';
import en from './en.json';

export const SUPPORT_LOCALES: string[] = ['en', 'zh'];

const messages = {
  zh: { ...zh },
  en: { ...en },
};

export function setupI18n(): I18n {
  const i18n = createI18n({
    legacy: false, // Use the Composition API mode
    locale: "en",
    fallbackLocale: "zh",
    messages: messages // Add messages directly here
  });
  //setI18nLanguage(i18n, options.locale);
  return i18n as I18n;
}

export function setI18nLanguage(locale: string): void {
  //lang.value = locale;
  (i18n.global.locale as any).value = locale;

  //document.querySelector('html')?.setAttribute('lang', locale);
}

export const i18n = setupI18n()