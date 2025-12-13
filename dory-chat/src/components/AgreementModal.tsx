'use client';

import { useState, useEffect } from 'react';

const AgreementModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ru'>('en');

  useEffect(() => {
    const hasAgreed = localStorage.getItem('hasAgreedToTerms');
    if (!hasAgreed) {
      setIsOpen(true);
    }
    
    const savedLanguage = localStorage.getItem('dorychat-language') as 'en' | 'ru';
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ru')) {
      setLanguage(savedLanguage);
    } else {
      // Detect language from user agent for first-time users
      const browserLanguage = typeof navigator !== 'undefined' ? (navigator.language || navigator.languages?.[0] || 'en') : 'en';
      const detectedLanguage = browserLanguage.toLowerCase().startsWith('ru') ? 'ru' : 'en';
      setLanguage(detectedLanguage);
      localStorage.setItem('dorychat-language', detectedLanguage);
    }
  }, []);

  const translations = {
    en: {
      title: 'Terms of Service',
      description: 'By using DoryChat, you agree to the following terms:',
      term1: 'You are 18 years of age or older.',
      term2: 'You are not a resident of any country that requires encryption surveillance or message storing.',
      term3: 'You will use this application for the greater good.',
      yes: 'YES',
      no: 'NO'
    },
    ru: {
      title: 'Условия использования',
      description: 'Используя DoryChat, вы соглашаетесь со следующими условиями:',
      term1: 'Вам 18 лет или больше.',
      term2: 'Вы не являетесь резидентом страны, требующей наблюдения за шифрованием или хранения сообщений.',
      term3: 'Вы будете использовать это приложение на благо всех.',
      yes: 'ДА',
      no: 'НЕТ'
    }
  };

  const t = (key: keyof typeof translations.en) => translations[language][key];

  const handleAgree = () => {
    localStorage.setItem('hasAgreedToTerms', 'true');
    setIsOpen(false);
  };

  const handleDisagree = () => {
    window.location.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, fontFamily: 'sans-serif' }}>
      <div style={{ backgroundColor: '#111', color: '#eee', padding: '2rem', borderRadius: '8px', maxWidth: '500px', textAlign: 'center', border: '1px solid #333' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>{t('title')}</h2>
        <p style={{ color: '#aaa', marginBottom: '1.5rem' }}>{t('description')}</p>
        <ul style={{ textAlign: 'left', listStylePosition: 'inside', color: '#ccc', marginBottom: '2rem', paddingLeft: '1rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>{t('term1')}</li>
          <li style={{ marginBottom: '0.5rem' }}>{t('term2')}</li>
          <li>{t('term3')}</li>
        </ul>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button onClick={handleAgree} style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', border: 'none', borderRadius: '8px', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold' }}>{t('yes')}</button>
          <button onClick={handleDisagree} style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', border: 'none', borderRadius: '8px', backgroundColor: '#333', color: '#ccc', fontWeight: 'bold' }}>{t('no')}</button>
        </div>
      </div>
    </div>
  );
};

export default AgreementModal;
