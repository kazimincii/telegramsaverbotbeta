import React, { useState } from 'react';
import './PhoneInput.css';

const PhoneInput = ({ onSubmit, loading, error }) => {
  const [countryCode, setCountryCode] = useState('+90');
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      return;
    }
    const fullPhone = countryCode + phoneNumber.replace(/\s/g, '');
    onSubmit(fullPhone);
  };

  const formatPhoneNumber = (value) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    // Format as XXX XXX XX XX (Turkish format)
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)} ${digits.slice(3)}`;
    if (digits.length <= 8) return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhoneNumber(formatted);
  };

  return (
    <div className="phone-input-container">
      <div className="phone-input-card">
        <div className="phone-input-header">
          <div className="telegram-logo-small">
            <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="tg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#2AABEE" />
                  <stop offset="100%" stopColor="#229ED9" />
                </linearGradient>
              </defs>
              <circle cx="120" cy="120" r="110" fill="url(#tg-grad)" />
              <path
                fill="#fff"
                d="M81.229 128.772l14.237 39.406s1.78 3.687 3.686 3.687 30.255-29.492 30.255-29.492l31.525-60.89L81.737 118.6z"
              />
            </svg>
          </div>
          <h2>Sign in to Telegram</h2>
          <p>Please confirm your country code and enter your phone number.</p>
        </div>

        <form onSubmit={handleSubmit} className="phone-input-form">
          <div className="form-group">
            <label htmlFor="country-code">Country</label>
            <select
              id="country-code"
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="country-select"
              disabled={loading}
            >
              <option value="+90">Turkey (+90)</option>
              <option value="+1">United States (+1)</option>
              <option value="+44">United Kingdom (+44)</option>
              <option value="+49">Germany (+49)</option>
              <option value="+33">France (+33)</option>
              <option value="+7">Russia (+7)</option>
              <option value="+86">China (+86)</option>
              <option value="+81">Japan (+81)</option>
              <option value="+91">India (+91)</option>
              <option value="+62">Indonesia (+62)</option>
              <option value="+55">Brazil (+55)</option>
              <option value="+34">Spain (+34)</option>
              <option value="+39">Italy (+39)</option>
              <option value="+31">Netherlands (+31)</option>
              <option value="+48">Poland (+48)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="phone-number">Phone Number</label>
            <div className="phone-input-wrapper">
              <span className="country-code-display">{countryCode}</span>
              <input
                id="phone-number"
                type="tel"
                value={phoneNumber}
                onChange={handlePhoneChange}
                placeholder="555 123 45 67"
                className="phone-input"
                disabled={loading}
                autoFocus
                maxLength={13}
              />
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
            disabled={loading || !phoneNumber.trim()}
          >
            {loading ? (
              <>
                <span className="button-spinner"></span>
                Connecting...
              </>
            ) : (
              'Continue'
            )}
          </button>
        </form>

        <div className="phone-input-footer">
          <p className="help-text">
            By signing in, you agree to Telegram's{' '}
            <a href="https://telegram.org/tos" target="_blank" rel="noopener noreferrer">
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default PhoneInput;
