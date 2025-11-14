import React, { useState, useEffect } from 'react';
import TelegramSplash from './TelegramSplash';
import PhoneInput from './PhoneInput';
import CodeInput from './CodeInput';
import TwoFactorAuth from './TwoFactorAuth';
import BiometricSetup from '../BiometricAuth/BiometricSetup';
import BiometricLogin from '../BiometricAuth/BiometricLogin';

const LoginStage = {
  SPLASH: 'splash',
  PHONE: 'phone',
  BIOMETRIC_LOGIN: 'biometric_login',
  CODE: 'code',
  TWO_FACTOR: 'two_factor',
  BIOMETRIC_SETUP: 'biometric_setup',
  SUCCESS: 'success'
};

const TelegramLogin = ({ onLoginSuccess, apiBaseUrl = 'http://localhost:8000' }) => {
  const [stage, setStage] = useState(LoginStage.SPLASH);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [splashProgress, setSplashProgress] = useState(0);
  const [loggedInUser, setLoggedInUser] = useState(null);

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

      // Login successful - store user and offer biometric setup
      setLoggedInUser(data.user);
      setStage(LoginStage.BIOMETRIC_SETUP);
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

      // Login successful - store user and offer biometric setup
      setLoggedInUser(data.user);
      setStage(LoginStage.BIOMETRIC_SETUP);
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

  const handleBiometricSetupComplete = () => {
    // Biometric setup done - complete login
    setStage(LoginStage.SUCCESS);
    onLoginSuccess && onLoginSuccess({ user: loggedInUser });
  };

  const handleBiometricSetupSkip = () => {
    // Skip biometric - complete login anyway
    setStage(LoginStage.SUCCESS);
    onLoginSuccess && onLoginSuccess({ user: loggedInUser });
  };

  const handleBiometricLoginSuccess = (data) => {
    // Biometric login successful
    setLoggedInUser(data.user);
    setStage(LoginStage.SUCCESS);
    onLoginSuccess && onLoginSuccess(data);
  };

  const handleBackFromBiometric = () => {
    setStage(LoginStage.PHONE);
  };

  const handleUseBiometric = () => {
    setStage(LoginStage.BIOMETRIC_LOGIN);
  };

  // Render based on current stage
  switch (stage) {
    case LoginStage.SPLASH:
      return <TelegramSplash message="Checking login status..." progress={splashProgress} />;

    case LoginStage.PHONE:
      return (
        <PhoneInput
          onSubmit={handlePhoneSubmit}
          onUseBiometric={handleUseBiometric}
          loading={loading}
          error={error}
        />
      );

    case LoginStage.BIOMETRIC_LOGIN:
      return (
        <BiometricLogin
          apiBaseUrl={apiBaseUrl}
          onSuccess={handleBiometricLoginSuccess}
          onBack={handleBackFromBiometric}
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

    case LoginStage.BIOMETRIC_SETUP:
      return (
        <BiometricSetup
          user={loggedInUser}
          apiBaseUrl={apiBaseUrl}
          onComplete={handleBiometricSetupComplete}
          onSkip={handleBiometricSetupSkip}
        />
      );

    case LoginStage.SUCCESS:
      return <TelegramSplash message="Login successful! Loading your chats..." progress={100} />;

    default:
      return <TelegramSplash message="Loading..." />;
  }
};

export default TelegramLogin;
