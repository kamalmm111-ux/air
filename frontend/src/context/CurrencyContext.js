import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const CurrencyContext = createContext(null);

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" }
];

// Free FX API endpoint
const FX_API_URL = "https://api.exchangerate-api.com/v4/latest/GBP";

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
};

export const CurrencyProvider = ({ children }) => {
  const [currency, setCurrency] = useState(() => {
    // Try to get saved currency from localStorage
    const saved = localStorage.getItem("aircabio_currency");
    return saved || "GBP";
  });
  
  const [rates, setRates] = useState({
    GBP: 1,
    EUR: 1.17,
    USD: 1.27,
    CAD: 1.71
  });
  
  const [ratesLoaded, setRatesLoaded] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Fetch exchange rates on mount
  useEffect(() => {
    const fetchRates = async () => {
      try {
        // Check if we have cached rates less than 1 hour old
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
        
        const response = await axios.get(FX_API_URL);
        const newRates = {
          GBP: 1,
          EUR: response.data.rates.EUR || 1.17,
          USD: response.data.rates.USD || 1.27,
          CAD: response.data.rates.CAD || 1.71
        };
        
        setRates(newRates);
        setLastUpdated(new Date());
        setRatesLoaded(true);
        
        // Cache rates
        localStorage.setItem("aircabio_fx_rates", JSON.stringify(newRates));
        localStorage.setItem("aircabio_fx_time", Date.now().toString());
      } catch (error) {
        console.error("Failed to fetch exchange rates:", error);
        // Use fallback rates
        setRatesLoaded(true);
      }
    };
    
    fetchRates();
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
        // Default to GBP for UK and others
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
    const currencyInfo = SUPPORTED_CURRENCIES.find(c => c.code === currency) || SUPPORTED_CURRENCIES[0];
    
    let formatted = `${currencyInfo.symbol}${converted.toFixed(2)}`;
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
    return SUPPORTED_CURRENCIES.find(c => c.code === currency) || SUPPORTED_CURRENCIES[0];
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
      SUPPORTED_CURRENCIES
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
