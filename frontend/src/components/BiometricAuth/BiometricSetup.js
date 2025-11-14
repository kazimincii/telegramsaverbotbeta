import React, { useState, useEffect } from 'react';
import './BiometricSetup.css';

const BiometricSetup = ({ user, apiBaseUrl, onComplete, onSkip }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [supported, setSupported] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    setChecking(true);

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        setSupported(false);
        setChecking(false);
        return;
      }

      // Check if platform authenticator is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setSupported(available);

      // Also check backend support
      const response = await fetch(`${apiBaseUrl}/api/biometric/supported`);
      const data = await response.json();

      setSupported(available && data.supported);
    } catch (err) {
      console.error('Error checking biometric support:', err);
      setSupported(false);
    } finally {
      setChecking(false);
    }
  };

  const handleSetupBiometric = async () => {
    setLoading(true);
    setError('');

    try {
      // Step 1: Get registration challenge from server
      const challengeResponse = await fetch(`${apiBaseUrl}/api/biometric/register/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          user_name: user.first_name || user.username
        })
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to get registration challenge');
      }

      const challengeData = await challengeResponse.json();

      // Step 2: Convert challenge and user.id to ArrayBuffer
      const challenge = base64urlDecode(challengeData.challenge);
      const userId = base64urlDecode(challengeData.user.id);

      // Step 3: Create credential using WebAuthn API
      const publicKeyOptions = {
        challenge: challenge,
        rp: challengeData.rp,
        user: {
          ...challengeData.user,
          id: userId
        },
        pubKeyCredParams: challengeData.pubKeyCredParams,
        authenticatorSelection: challengeData.authenticatorSelection,
        timeout: challengeData.timeout,
        attestation: challengeData.attestation
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      });

      if (!credential) {
        throw new Error('Failed to create credential');
      }

      // Step 4: Send credential to server
      const credentialData = {
        user_id: user.id,
        user_name: user.first_name || user.username,
        credential_id: base64urlEncode(credential.rawId),
        public_key: base64urlEncode(credential.response.getPublicKey()),
        authenticator_type: 'platform',
        challenge: challengeData.challenge
      };

      const registerResponse = await fetch(`${apiBaseUrl}/api/biometric/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialData)
      });

      if (!registerResponse.ok) {
        const errorData = await registerResponse.json();
        throw new Error(errorData.detail || 'Failed to register credential');
      }

      setSuccess(true);
      setTimeout(() => {
        onComplete && onComplete();
      }, 1500);
    } catch (err) {
      console.error('Biometric setup error:', err);
      setError(err.message || 'Failed to setup biometric authentication');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for base64url encoding/decoding
  const base64urlDecode = (str) => {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    const binary = atob(str);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  };

  const base64urlEncode = (arrayBuffer) => {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  };

  if (checking) {
    return (
      <div className="biometric-setup">
        <div className="biometric-setup-card">
          <div className="biometric-icon checking">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="3"/>
            </svg>
          </div>
          <h2>Checking biometric support...</h2>
        </div>
      </div>
    );
  }

  if (!supported) {
    return (
      <div className="biometric-setup">
        <div className="biometric-setup-card">
          <div className="biometric-icon not-supported">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="3"/>
              <path d="M25 25l30 30M55 25l-30 30" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <h2>Biometric Authentication Not Available</h2>
          <p>Your device or browser doesn't support biometric authentication.</p>
          <button className="btn-secondary" onClick={onSkip}>
            Continue without biometrics
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="biometric-setup">
        <div className="biometric-setup-card">
          <div className="biometric-icon success">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="35" stroke="currentColor" strokeWidth="3"/>
              <path d="M25 40l10 10 20-25" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2>Biometric Setup Complete!</h2>
          <p>You can now use biometric authentication to log in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="biometric-setup">
      <div className="biometric-setup-card">
        <div className="biometric-icon">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <path d="M40 10C23.4 10 10 23.4 10 40s13.4 30 30 30 30-13.4 30-30S56.6 10 40 10zm0 8c4.4 0 8 3.6 8 8s-3.6 8-8 8-8-3.6-8-8 3.6-8 8-8zm0 44c-7.7 0-14.6-3.9-18.7-9.8 1.5-5.2 5.9-9 11.2-9.6.9.5 2 .8 3.5.8s2.6-.3 3.5-.8c5.3.6 9.7 4.4 11.2 9.6C54.6 58.1 47.7 62 40 62z" fill="currentColor"/>
          </svg>
        </div>

        <h2>Setup Biometric Authentication</h2>
        <p className="biometric-description">
          Secure your account with fingerprint or face recognition.
          This allows you to log in quickly and securely without entering your password.
        </p>

        {error && (
          <div className="biometric-error">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
              <path d="M10 6v5M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            {error}
          </div>
        )}

        <div className="biometric-features">
          <div className="feature-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="currentColor"/>
            </svg>
            <span>Fast and convenient</span>
          </div>
          <div className="feature-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor"/>
            </svg>
            <span>Highly secure</span>
          </div>
          <div className="feature-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 3a4 4 0 100 8 4 4 0 000-8zm7.5 4h6M18 7v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>No passwords to remember</span>
          </div>
        </div>

        <div className="biometric-actions">
          <button
            className="btn-primary"
            onClick={handleSetupBiometric}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner"></span>
                Setting up...
              </>
            ) : (
              'Setup Biometric Authentication'
            )}
          </button>

          <button className="btn-text" onClick={onSkip} disabled={loading}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default BiometricSetup;
