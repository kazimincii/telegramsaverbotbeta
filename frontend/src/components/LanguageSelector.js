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
      <div style={styles.container}>
        <span style={styles.loading}>Loading...</span>
      </div>
    );
  }

  const currentLangInfo = availableLanguages.find(
    (lang) => lang.code === currentLanguage
  );

  return (
    <div style={styles.container}>
      <button
        style={styles.button}
        onClick={() => setIsOpen(!isOpen)}
        title="Change Language"
      >
        🌐 {currentLangInfo?.native_name || currentLanguage.toUpperCase()}
      </button>

      {isOpen && (
        <div style={styles.dropdown}>
          <div style={styles.dropdownHeader}>
            <strong>Select Language</strong>
            <button
              style={styles.closeButton}
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div style={styles.languageList}>
            {availableLanguages.map((lang) => (
              <button
                key={lang.code}
                style={{
                  ...styles.languageItem,
                  ...(lang.code === currentLanguage
                    ? styles.languageItemActive
                    : {}),
                }}
                onClick={() => {
                  changeLanguage(lang.code);
                  setIsOpen(false);
                }}
              >
                <span style={styles.languageNative}>{lang.native_name}</span>
                <span style={styles.languageName}>({lang.name})</span>
                {lang.code === currentLanguage && (
                  <span style={styles.checkmark}>✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    position: "fixed",
    top: "20px",
    right: "20px",
    zIndex: 1000,
  },
  loading: {
    padding: "10px 15px",
    background: "#f0f0f0",
    borderRadius: "8px",
    fontSize: "14px",
    color: "#666",
  },
  button: {
    padding: "10px 15px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    transition: "all 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  dropdown: {
    position: "absolute",
    top: "50px",
    right: "0",
    background: "white",
    borderRadius: "12px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    minWidth: "280px",
    overflow: "hidden",
    animation: "slideDown 0.2s ease",
  },
  dropdownHeader: {
    padding: "15px 20px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeButton: {
    background: "transparent",
    border: "none",
    color: "white",
    fontSize: "20px",
    cursor: "pointer",
    padding: "0",
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "4px",
    transition: "background 0.2s",
  },
  languageList: {
    maxHeight: "400px",
    overflowY: "auto",
  },
  languageItem: {
    width: "100%",
    padding: "12px 20px",
    border: "none",
    borderBottom: "1px solid #f0f0f0",
    background: "white",
    textAlign: "left",
    cursor: "pointer",
    transition: "background 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    position: "relative",
  },
  languageItemActive: {
    background: "#f0f7ff",
    borderLeft: "3px solid #667eea",
  },
  languageNative: {
    fontWeight: "600",
    fontSize: "15px",
    color: "#333",
  },
  languageName: {
    fontSize: "13px",
    color: "#666",
  },
  checkmark: {
    marginLeft: "auto",
    color: "#667eea",
    fontSize: "18px",
    fontWeight: "bold",
  },
};

// Global CSS for animation (add to your index.css)
const styleSheet = document.createElement("style");
styleSheet.textContent = `
@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Custom scrollbar for language list */
.language-list::-webkit-scrollbar {
  width: 6px;
}

.language-list::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.language-list::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 3px;
}

.language-list::-webkit-scrollbar-thumb:hover {
  background: #555;
}
`;
document.head.appendChild(styleSheet);
