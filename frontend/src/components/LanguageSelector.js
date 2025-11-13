import React, { useState, useEffect, createContext, useContext } from "react";

// Language Context
const LanguageContext = createContext();

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
};

// Language Provider Component
export function LanguageProvider({ children }) {
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [translations, setTranslations] = useState({});
  const [availableLanguages, setAvailableLanguages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load available languages on mount
  useEffect(() => {
    fetchAvailableLanguages();

    // Load saved language from localStorage
    const savedLang = localStorage.getItem("app_language");
    if (savedLang) {
      setCurrentLanguage(savedLang);
    }
  }, []);

  // Load translations when language changes
  useEffect(() => {
    if (currentLanguage) {
      fetchTranslations(currentLanguage);
    }
  }, [currentLanguage]);

  const fetchAvailableLanguages = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/i18n/languages");
      const data = await response.json();
      if (data.ok) {
        setAvailableLanguages(data.languages);
      }
    } catch (error) {
      console.error("Failed to fetch languages:", error);
    }
  };

  const fetchTranslations = async (langCode) => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:8000/api/i18n/translations/${langCode}`);
      const data = await response.json();
      if (data.ok) {
        setTranslations(data.translations);
      }
    } catch (error) {
      console.error("Failed to fetch translations:", error);
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (langCode) => {
    setCurrentLanguage(langCode);
    localStorage.setItem("app_language", langCode);
  };

  // Translation function with nested key support
  const t = (key, params = {}) => {
    const keys = key.split(".");
    let value = translations;

    // Navigate through nested object
    for (const k of keys) {
      if (value && typeof value === "object") {
        value = value[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    if (typeof value !== "string") {
      return key;
    }

    // Apply parameter substitution
    let result = value;
    Object.keys(params).forEach((param) => {
      result = result.replace(`{${param}}`, params[param]);
    });

    return result;
  };

  const value = {
    currentLanguage,
    availableLanguages,
    translations,
    loading,
    changeLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

// Language Selector UI Component
export default function LanguageSelector() {
  const { currentLanguage, availableLanguages, changeLanguage, loading, t } =
    useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  if (loading) {
    return (
      <button className="btn btn-icon" disabled>
        <span className="animate-spin">⏳</span>
      </button>
    );
  }

  const currentLangInfo = availableLanguages.find(
    (lang) => lang.code === currentLanguage
  );

  return (
    <div className="dropdown" style={{ position: 'relative' }}>
      <button
        className="btn btn-icon"
        onClick={() => setIsOpen(!isOpen)}
        title="Change Language"
      >
        🌐
      </button>

      {isOpen && (
        <div className="dropdown-menu" style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 'var(--spacing-xs)',
          minWidth: '250px',
          zIndex: 1000
        }}>
          <div className="dropdown-header">
            <strong>Select Language</strong>
            <button
              className="btn btn-icon btn-sm"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                className={`dropdown-item ${lang.code === currentLanguage ? 'active' : ''}`}
                onClick={() => {
                  changeLanguage(lang.code);
                  setIsOpen(false);
                }}
              >
                <span style={{ fontWeight: 600 }}>{lang.native_name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                  ({lang.name})
                </span>
                {lang.code === currentLanguage && (
                  <span style={{ marginLeft: 'auto', color: 'var(--tg-primary)' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

