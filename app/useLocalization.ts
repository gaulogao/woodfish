import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { LanguageCode, translations } from './translations';

const DEFAULT_LANGUAGE: LanguageCode = 'zh-CN';
const STORAGE_KEY = '@user_settings';

export const useLocalization = () => {
  const [language, setLanguage] = useState<LanguageCode>(DEFAULT_LANGUAGE);
  const [t, setT] = useState<(key: string) => any>(() => (key) => key);

  const loadLanguage = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings = JSON.parse(stored);
        if (settings.language) {
          setLanguage(settings.language);
        }
      }
    } catch (e) {
      console.error('Failed to load language from AsyncStorage', e);
    }
  }, []);

  useEffect(() => {
    const getTranslation = (key: string): any => {
      const keys = key.split('.');
      const current = translations[language] || translations[DEFAULT_LANGUAGE];
      let value: any = current;
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return undefined;
        }
      }
      return value;
    };
    setT(() => getTranslation);
  }, [language]);

  useFocusEffect(
    useCallback(() => {
      loadLanguage();
    }, [loadLanguage])
  );

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('settingsChanged', (data) => {
      if (data?.language) {
        setLanguage(data.language);
      }
    });
    return () => subscription.remove();
  }, []);

  return { t, language };
};
