import { create } from 'zustand';
import i18n from '../i18n';

interface LanguageState {
  language: string;
  direction: 'ltr' | 'rtl';
  setLanguage: (lang: string) => void;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: localStorage.getItem('i18nextLng') || 'en',
  direction: (localStorage.getItem('i18nextLng') || 'en') === 'ar' ? 'rtl' : 'ltr',

  setLanguage: (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    set({ language: lang, direction: dir });
  },
}));

export const initializeLanguage = () => {
  const lang = localStorage.getItem('i18nextLng') || 'en';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = lang;
};
