import React, { useState, useEffect } from 'react';
import TelegramSplash from './TelegramSplash';
import PhoneInput from './PhoneInput';
import CodeInput from './CodeInput';
import TwoFactorAuth from './TwoFactorAuth';

const LoginStage = {
  SPLASH: 'splash',
  PHONE: 'phone',
  CODE: 'code',
  TWO_FACTOR: 'two_factor',
  SUCCESS: 'success'
};

const TelegramLogin = ({ onLoginSuccess, apiBaseUrl = 'http://localhost:8000' }) => {
  const [stage, setStage] = useState(LoginStage.SPLASH);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [splashProgress, setSplashProgress] = useState(0);

  useEffect(() => {
    // Check if already logged in
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      setSplashProgress(30);
      const response = await fetch(`${apiBaseUrl}/api/telegram/status`);
      const data = await response.json();

      setSplashProgress(70);

      if (data.logged_in) {
        setSplashProgress(100);
        setTimeout(() => {
          setStage(LoginStage.SUCCESS);
          onLoginSuccess && onLoginSuccess(data);
        }, 500);
      } else {
        setSplashProgress(100);
        setTimeout(() => setStage(LoginStage.PHONE), 800);
      }
    } catch (err) {
      console.error('Error checking login status:', err);
      setSplashProgress(100);
      setTimeout(() => setStage(LoginStage.PHONE), 800);
    }
  };

  const handlePhoneSubmit = async (phone) => {
    setLoading(true);
    setError('');
    setPhoneNumber(phone);

    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phone })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to send code');
      }

      setPhoneCodeHash(data.phone_code_hash);
      setStage(LoginStage.CODE);
    } catch (err) {
      console.error('Phone submit error:', err);
      setError(err.message || 'Failed to connect to Telegram. Please check your internet connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeSubmit = async (code) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/sign-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: phoneNumber,
          code: code,
          phone_code_hash: phoneCodeHash
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Check if 2FA is required
        if (data.requires_2fa || data.detail?.includes('2FA') || data.detail?.includes('password')) {
          setStage(LoginStage.TWO_FACTOR);
          return;
        }
        throw new Error(data.detail || 'Invalid code');
      }

      // Login successful
      setStage(LoginStage.SUCCESS);
      onLoginSuccess && onLoginSuccess(data);
    } catch (err) {
      console.error('Code submit error:', err);
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (password) => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiBaseUrl}/api/telegram/sign-in-2fa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Invalid password');
      }

      // Login successful
      setStage(LoginStage.SUCCESS);
      onLoginSuccess && onLoginSuccess(data);
    } catch (err) {
      console.error('2FA submit error:', err);
      setError(err.message || 'Invalid password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToPhone = () => {
    setStage(LoginStage.PHONE);
    setError('');
    setPhoneCodeHash('');
  };

  const handleBackToCode = () => {
    setStage(LoginStage.CODE);
    setError('');
  };

  // Render based on current stage
  switch (stage) {
    case LoginStage.SPLASH:
      return <TelegramSplash message="Checking login status..." progress={splashProgress} />;

    case LoginStage.PHONE:
      return (
        <PhoneInput
          onSubmit={handlePhoneSubmit}
          loading={loading}
          error={error}
        />
      );

    case LoginStage.CODE:
      return (
        <CodeInput
          onSubmit={handleCodeSubmit}
          onBack={handleBackToPhone}
          loading={loading}
          error={error}
          phoneNumber={phoneNumber}
        />
      );

    case LoginStage.TWO_FACTOR:
      return (
        <TwoFactorAuth
          onSubmit={handleTwoFactorSubmit}
          onBack={handleBackToCode}
          loading={loading}
          error={error}
        />
      );

    case LoginStage.SUCCESS:
      return <TelegramSplash message="Login successful! Loading your chats..." progress={100} />;

    default:
      return <TelegramSplash message="Loading..." />;
  }
};

export default TelegramLogin;
