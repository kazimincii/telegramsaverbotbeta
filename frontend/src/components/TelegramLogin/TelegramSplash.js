import React from 'react';
import './TelegramSplash.css';

const TelegramSplash = ({ message = 'Loading...', progress = null }) => {
  return (
    <div className="telegram-splash">
      <div className="telegram-splash-content">
        <div className="telegram-splash-logo">
          <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="telegram-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2AABEE" />
                <stop offset="100%" stopColor="#229ED9" />
              </linearGradient>
            </defs>
            <circle cx="120" cy="120" r="110" fill="url(#telegram-gradient)" />
            <path
              fill="#fff"
              d="M81.229 128.772l14.237 39.406s1.78 3.687 3.686 3.687 30.255-29.492 30.255-29.492l31.525-60.89L81.737 118.6z"
            />
            <path
              fill="#D2E5F1"
              d="M100.106 138.878l-2.733 29.046s-1.144 8.9 7.754 0 17.415-15.763 17.415-15.763"
            />
            <path
              fill="#B5CFE4"
              d="M81.486 130.178l-17.8-5.467s-2.125-.836-1.419-2.739c.145-.389.447-.731 1.028-1.119 2.652-1.769 29.695-11.278 29.695-11.278s2.503-.863 4.106-.545c.671.133 1.345.464 1.764 1.113.145.225.285.521.366.937.08.416.1.922.074 1.492-.075 1.61-6.826 34.883-6.826 34.883s-.542 3.108-2.537 3.108c-1.994 0-14.451-9.385-14.451-9.385z"
            />
          </svg>
        </div>
        <h1 className="telegram-splash-title">Telegram AI Client</h1>
        <p className="telegram-splash-message">{message}</p>
        {progress !== null && (
          <div className="telegram-splash-progress">
            <div className="telegram-splash-progress-bar" style={{ width: `${progress}%` }}></div>
          </div>
        )}
        <div className="telegram-splash-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    </div>
  );
};

export default TelegramSplash;
