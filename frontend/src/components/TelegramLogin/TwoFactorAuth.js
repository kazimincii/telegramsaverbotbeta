import React, { useState } from 'react';
import './TwoFactorAuth.css';

const TwoFactorAuth = ({ onSubmit, onBack, loading, error }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) {
      return;
    }
    onSubmit(password);
  };

  return (
    <div className="two-factor-container">
      <div className="two-factor-card">
        <button className="back-button" onClick={onBack} type="button">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>

        <div className="two-factor-header">
          <div className="lock-icon">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <circle cx="30" cy="30" r="28" fill="#E8F4FD" stroke="#2AABEE" strokeWidth="2"/>
              <path d="M30 18c-3.3 0-6 2.7-6 6v3h-2c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V29c0-1.1-.9-2-2-2h-2v-3c0-3.3-2.7-6-6-6zm-3 6c0-1.7 1.3-3 3-3s3 1.3 3 3v3h-6v-3zm3 13c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="#2AABEE"/>
            </svg>
          </div>
          <h2>Two-Factor Authentication</h2>
          <p>Your account has two-factor authentication enabled. Please enter your password.</p>
        </div>

        <form onSubmit={handleSubmit} className="two-factor-form">
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your 2FA password"
                className="password-input"
                disabled={loading}
                autoFocus
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M3 3l14 14M10 7a3 3 0 013 3m-6 0a3 3 0 013-3m-3 3a3 3 0 003 3m-6-3c0 2.5 2 4.5 4.5 4.5S14 12.5 14 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <path d="M10 5C5 5 2 10 2 10s3 5 8 5 8-5 8-5-3-5-8-5z" stroke="currentColor" strokeWidth="2"/>
                    <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="9" stroke="currentColor" strokeWidth="2"/>
                <path d="M10 6v4M10 14h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={loading || !password.trim()}
          >
            {loading ? (
              <>
                <span className="button-spinner"></span>
                Verifying...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>

        <div className="two-factor-footer">
          <p className="help-text">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 7v4M8 5h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Make sure to enter your cloud password, not the code from SMS.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TwoFactorAuth;
