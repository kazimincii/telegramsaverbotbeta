import React, { useState, useEffect } from 'react';
import './BiometricLogin.css';

const BiometricLogin = ({ apiBaseUrl, onSuccess, onBack }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    try {
      if (!window.PublicKeyCredential) {
        setSupported(false);
        return;
      }

      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      setSupported(available);
    } catch (err) {
      console.error('Error checking biometric support:', err);
      setSupported(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Step 1: Get authentication challenge
      const challengeResponse = await fetch(`${apiBaseUrl}/api/biometric/auth/challenge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})  // No user_id = allow any credential
      });

      if (!challengeResponse.ok) {
        throw new Error('Failed to get authentication challenge');
      }

      const challengeData = await challengeResponse.json();

      // Step 2: Convert challenge to ArrayBuffer
      const challenge = base64urlDecode(challengeData.challenge);

      // Convert allowed credentials
      const allowCredentials = challengeData.allowCredentials.map(cred => ({
        ...cred,
        id: base64urlDecode(cred.id)
      }));

      // Step 3: Get credential using WebAuthn API
      const publicKeyOptions = {
        challenge: challenge,
        timeout: challengeData.timeout,
        rpId: challengeData.rpId,
        allowCredentials: allowCredentials,
        userVerification: challengeData.userVerification
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyOptions
      });

      if (!credential) {
        throw new Error('Failed to get credential');
      }

      // Step 4: Verify with server
      const verifyData = {
        credential_id: base64urlEncode(credential.rawId),
        challenge: challengeData.challenge,
        signature: base64urlEncode(credential.response.signature),
        authenticator_data: base64urlEncode(credential.response.authenticatorData)
      };

      const verifyResponse = await fetch(`${apiBaseUrl}/api/biometric/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyData)
      });

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.detail || 'Authentication failed');
      }

      const result = await verifyResponse.json();

      // Success!
      onSuccess && onSuccess({
        user: {
          id: result.user_id,
          first_name: result.user_name
        }
      });
    } catch (err) {
      console.error('Biometric login error:', err);
      setError(err.message || 'Biometric authentication failed');
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

  if (!supported) {
    return null; // Don't show biometric option if not supported
  }

  return (
    <div className="biometric-login">
      <div className="biometric-login-card">
        <div className="biometric-header">
          <button className="back-btn" onClick={onBack}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4L6 10l6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <h2>Biometric Login</h2>
        </div>

        <div className="biometric-icon-large">
          <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
            <circle cx="60" cy="60" r="55" stroke="currentColor" strokeWidth="3"/>
            <path d="M60 25C38.9 25 25 38.9 25 60s13.9 35 35 35 35-13.9 35-35-13.9-35-35-35zm0 15c6.6 0 12 5.4 12 12s-5.4 12-12 12-12-5.4-12-12 5.4-12 12-12zm0 66c-11.6 0-21.9-5.9-28.1-14.8 2.3-7.8 8.9-13.5 16.8-14.4 1.4.8 3 1.2 5.3 1.2s3.9-.4 5.3-1.2c8 .9 14.5 6.6 16.8 14.4C81.9 100.1 71.6 106 60 106z" fill="currentColor"/>
          </svg>
        </div>

        <p className="biometric-description">
          Use your fingerprint or face recognition to log in securely.
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

        <button
          className="btn-biometric"
          onClick={handleBiometricLogin}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Authenticating...
            </>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="currentColor"/>
              </svg>
              Authenticate with Biometrics
            </>
          )}
        </button>

        <button className="btn-text" onClick={onBack} disabled={loading}>
          Use password instead
        </button>
      </div>
    </div>
  );
};

export default BiometricLogin;
