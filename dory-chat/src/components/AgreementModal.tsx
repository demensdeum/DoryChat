'use client';

import { useState, useEffect } from 'react';

const AgreementModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasAgreed = localStorage.getItem('hasAgreedToTerms');
    if (!hasAgreed) {
      setIsOpen(true);
    }
  }, []);

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
        <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Terms of Service</h2>
        <p style={{ color: '#aaa', marginBottom: '1.5rem' }}>By using DoryChat, you agree to the following terms:</p>
        <ul style={{ textAlign: 'left', listStylePosition: 'inside', color: '#ccc', marginBottom: '2rem', paddingLeft: '1rem' }}>
          <li style={{ marginBottom: '0.5rem' }}>You are 18 years of age or older.</li>
          <li style={{ marginBottom: '0.5rem' }}>You are not a resident of any country that requires encryption surveillance or message storing.</li>
          <li>You will use this application for the greater good.</li>
        </ul>
        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
          <button onClick={handleAgree} style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', border: 'none', borderRadius: '8px', backgroundColor: '#2563eb', color: 'white', fontWeight: 'bold' }}>YES</button>
          <button onClick={handleDisagree} style={{ padding: '0.75rem 1.5rem', cursor: 'pointer', border: 'none', borderRadius: '8px', backgroundColor: '#333', color: '#ccc', fontWeight: 'bold' }}>NO</button>
        </div>
      </div>
    </div>
  );
};

export default AgreementModal;
