import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const CurrencyContext = createContext(null);

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Default supported currencies (fallback)
const DEFAULT_CURRENCIES = [
  { code: "GBP", symbol: "£", name: "British Pound", rate: 1 },
  { code: "EUR", symbol: "€", name: "Euro", rate: 1.17 },
  { code: "USD", symbol: "$", name: "US Dollar", rate: 1.27 },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar", rate: 1.71 }
];

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState(() => {
    const saved = localStorage.getItem("aircabio_currency");
    return saved || "GBP";
  });
  
  const [supportedCurrencies, setSupportedCurrencies] = useState(DEFAULT_CURRENCIES);
  
  const [rates, setRates] = useState({
    GBP: 1,
    EUR: 1.17,
    USD: 1.27,
    CAD: 1.71
  });
  
  const [ratesLoaded, setRatesLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch currency settings from admin API on mount
  useEffect(() => {
    const fetchCurrencySettings = async () => {
      try {
        // First try to get admin-configured rates
        const response = await axios.get(`${API}/settings/currencies`);
        if (response.data.currencies && response.data.currencies.length > 0) {
          const currencies = response.data.currencies;
          setSupportedCurrencies(currencies);
          
          // Build rates object from admin settings
          const adminRates = {};
          currencies.forEach(c => {
            adminRates[c.code] = c.rate;
          });
          setRates(adminRates);
          setLastUpdated(new Date());
          setRatesLoaded(true);
          
          // Cache rates
          localStorage.setItem("aircabio_fx_rates", JSON.stringify(adminRates));
          localStorage.setItem("aircabio_fx_time", Date.now().toString());
          return;
        }
      } catch (error) {
        console.log("Using fallback currency rates");
      }
      
      // Fallback: Check cached rates or use defaults
      try {
        const cachedRates = localStorage.getItem("aircabio_fx_rates");
        const cachedTime = localStorage.getItem("aircabio_fx_time");
        
        if (cachedRates && cachedTime) {
          const cacheAge = Date.now() - parseInt(cachedTime);
          if (cacheAge < 3600000) { // 1 hour
            setRates(JSON.parse(cachedRates));
            setLastUpdated(new Date(parseInt(cachedTime)));
            setRatesLoaded(true);
            return;
          }
        }
      } catch (e) {
        // Use defaults
      }
      
      setRatesLoaded(true);
    };
    
    fetchCurrencySettings();
  }, []);

  // Auto-detect currency based on locale
  useEffect(() => {
    if (!localStorage.getItem("aircabio_currency")) {
      try {
        const locale = navigator.language || navigator.userLanguage;
        if (locale.includes("US") || locale.includes("en-US")) {
          setCurrency("USD");
        } else if (locale.includes("CA") || locale.includes("en-CA")) {
          setCurrency("CAD");
        } else if (locale.includes("de") || locale.includes("fr") || locale.includes("es") || locale.includes("it") || locale.includes("nl") || locale.includes("pt")) {
          setCurrency("EUR");
        }
      } catch (e) {
        // Keep default
      }
    }
  }, []);

  // Save currency preference when changed
  const changeCurrency = (newCurrency) => {
    setCurrency(newCurrency);
    localStorage.setItem("aircabio_currency", newCurrency);
  };

  // Convert amount from GBP to selected currency
  const convertFromGBP = (amountGBP) => {
    if (!amountGBP || isNaN(amountGBP)) return 0;
    const rate = rates[currency] || 1;
    return Math.round(amountGBP * rate * 100) / 100;
  };

  // Convert amount from selected currency back to GBP
  const convertToGBP = (amount) => {
    if (!amount || isNaN(amount)) return 0;
    const rate = rates[currency] || 1;
    return Math.round((amount / rate) * 100) / 100;
  };

  // Format price with currency symbol and code
  const formatPrice = (amountGBP, options = {}) => {
    const { showCode = true, showOriginal = false } = options;
    const converted = convertFromGBP(amountGBP);
    const currencyInfo = supportedCurrencies.find(c => c.code === currency) || supportedCurrencies[0];
    
    let formatted = `${currencyInfo?.symbol || "£"}${converted.toFixed(2)}`;
    if (showCode) {
      formatted += ` ${currency}`;
    }
    
    if (showOriginal && currency !== "GBP") {
      formatted += ` (£${amountGBP.toFixed(2)} GBP)`;
    }
    
    return formatted;
  };

  // Get current currency info
  const getCurrentCurrency = () => {
    return supportedCurrencies.find(c => c.code === currency) || supportedCurrencies[0];
  };

  // Get rate for current currency
  const getCurrentRate = () => rates[currency] || 1;

  return (
    <CurrencyContext.Provider value={{
      currency,
      changeCurrency,
      rates,
      ratesLoaded,
      lastUpdated,
      convertFromGBP,
      convertToGBP,
      formatPrice,
      getCurrentCurrency,
      getCurrentRate,
      SUPPORTED_CURRENCIES: supportedCurrencies
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
