import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import { AuthProvider } from "./context/AuthContext";
import { BookingProvider } from "./context/BookingContext";
import { CurrencyProvider } from "./context/CurrencyContext";

// Pages
import HomePage from "./pages/HomePage";
import SearchResultsPage from "./pages/SearchResultsPage";
import CheckoutPage from "./pages/CheckoutPage";
import BookingSuccessPage from "./pages/BookingSuccessPage";
import BookingCancelPage from "./pages/BookingCancelPage";
import CustomerDashboard from "./pages/CustomerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import FleetPage from "./pages/FleetPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import FAQPage from "./pages/FAQPage";
import TermsPage from "./pages/TermsPage";
import PrivacyPage from "./pages/PrivacyPage";
import CancellationPage from "./pages/CancellationPage";

// Fleet Pages
import FleetLoginPage from "./pages/FleetLoginPage";
import FleetDashboard from "./pages/FleetDashboard";
import DriverTrackingPage from "./pages/DriverTrackingPage";
import CustomerTrackingPage from "./pages/CustomerTrackingPage";
import CustomerReviewPage from "./pages/CustomerReviewPage";

// Layout
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import FleetLayout from "./components/FleetLayout";

function App() {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <BookingProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/search" element={<SearchResultsPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/booking/success" element={<BookingSuccessPage />} />
                <Route path="/booking/cancel" element={<BookingCancelPage />} />
                <Route path="/fleet" element={<FleetPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/cancellation" element={<CancellationPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/dashboard" element={<CustomerDashboard />} />
              </Route>
              
              {/* Fleet Login (public) */}
              <Route path="/fleet/login" element={<FleetLoginPage />} />
              
              {/* Driver Tracking Page (public - accessed via token) */}
              <Route path="/driver-tracking/:token" element={<DriverTrackingPage />} />
              
              {/* Customer Tracking Page (public - accessed via booking reference) */}
              <Route path="/track/:bookingRef" element={<CustomerTrackingPage />} />
              
              {/* Fleet Dashboard Routes */}
              <Route path="/fleet/dashboard" element={<FleetLayout />}>
                <Route index element={<FleetDashboard />} />
              </Route>
              
              {/* Admin Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
              </Route>
            </Routes>
            <Toaster position="top-right" richColors />
          </BrowserRouter>
        </BookingProvider>
      </CurrencyProvider>
    </AuthProvider>
  );
}

export default App;
