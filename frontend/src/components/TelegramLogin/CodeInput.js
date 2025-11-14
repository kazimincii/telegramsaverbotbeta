import React, { useState, useRef, useEffect } from 'react';
import './CodeInput.css';

const CodeInput = ({ onSubmit, onBack, loading, error, phoneNumber }) => {
  const [code, setCode] = useState(['', '', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all fields are filled
    if (index === 4 && value) {
      const fullCode = [...newCode.slice(0, 4), value].join('');
      setTimeout(() => onSubmit(fullCode), 100);
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    // Handle arrow keys
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowRight' && index < 4) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5);
    const newCode = [...code];

    for (let i = 0; i < pastedData.length; i++) {
      newCode[i] = pastedData[i];
    }

    setCode(newCode);

    // Focus appropriate input
    const nextEmptyIndex = newCode.findIndex(c => !c);
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[4]?.focus();
      // Auto-submit if complete
      if (pastedData.length === 5) {
        setTimeout(() => onSubmit(pastedData), 100);
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length === 5) {
      onSubmit(fullCode);
    }
  };

  const maskPhone = (phone) => {
    if (!phone) return '';
    const last4 = phone.slice(-4);
    return `${phone.slice(0, -4).replace(/\d/g, '*')}${last4}`;
  };

  return (
    <div className="code-input-container">
      <div className="code-input-card">
        <button className="back-button" onClick={onBack} type="button">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 4L6 10L12 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back
        </button>

        <div className="code-input-header">
          <div className="phone-icon">
            <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
              <circle cx="30" cy="30" r="28" fill="#E8F4FD" stroke="#2AABEE" strokeWidth="2"/>
              <path d="M25 20h10c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H25c-1.1 0-2-.9-2-2V22c0-1.1.9-2 2-2zm5 17c.8 0 1.5-.7 1.5-1.5S30.8 34 30 34s-1.5.7-1.5 1.5.7 1.5 1.5 1.5zm-3-16h6v10h-6V21z" fill="#2AABEE"/>
            </svg>
          </div>
          <h2>{phoneNumber ? maskPhone(phoneNumber) : 'Enter Code'}</h2>
          <p>We have sent you a code via SMS. Please enter it below.</p>
        </div>

        <form onSubmit={handleSubmit} className="code-input-form">
          <div className="code-inputs" onPaste={handlePaste}>
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength="1"
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="code-digit-input"
                disabled={loading}
              />
            ))}
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
            disabled={loading || code.join('').length !== 5}
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

        <div className="code-input-footer">
          <p className="help-text">
            Didn't receive the code?{' '}
            <button type="button" className="resend-button" onClick={() => onBack()}>
              Resend code
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CodeInput;
