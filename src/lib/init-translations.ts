import i18next from 'i18next';
import HttpBackend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

const loadPath = `./translations/{{lng}}/{{ns}}.json`;

i18next
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    showSupportNotice: false,
    supportedLngs: [
      'ar',
      'bn',
      'cs',
      'da',
      'de',
      'el',
      'en',
      'es',
      'fa',
      'fi',
      'fil',
      'fr',
      'he',
      'hi',
      'hu',
      'id',
      'it',
      'ja',
      'ko',
      'mr',
      'nl',
      'no',
      'pl',
      'pt',
      'ro',
      'ru',
      'sq',
      'sv',
      'te',
      'th',
      'tr',
      'uk',
      'ur',
      'vi',
      'zh',
    ],

    ns: ['default'],
    defaultNS: 'default',

    backend: { loadPath },
  });
