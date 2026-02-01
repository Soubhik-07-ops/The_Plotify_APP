import { useGlobalContext } from '@/lib/global-provider';
import translations, { Language } from './translations';

export const useTranslation = () => {
  const { language } = useGlobalContext();
  
  const t = (key: string): string => {
    const currentTranslations = translations[language as Language] || translations.English;
    
    // Handle nested keys like 'common.save' or 'profile.title'
    const keys = key.split('.');
    let value: any = currentTranslations;
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k as keyof typeof value];
      } else {
        // Fallback to English if key not found
        const englishTranslations = translations.English;
        let fallbackValue: any = englishTranslations;
        for (const fallbackKey of keys) {
          if (fallbackValue && typeof fallbackValue === 'object' && fallbackKey in fallbackValue) {
            fallbackValue = fallbackValue[fallbackKey as keyof typeof fallbackValue];
          } else {
            return key; // Return key if not found in any language
          }
        }
        return typeof fallbackValue === 'string' ? fallbackValue : key;
      }
    }
    
    return typeof value === 'string' ? value : key;
  };
  
  return { t, language };
};

export default useTranslation;

