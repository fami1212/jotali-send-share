import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { ThemeProvider } from "./components/ThemeProvider";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import GlobalChat from "./components/GlobalChat";
import SplashScreen from "./components/SplashScreen";
import Onboarding from "./components/Onboarding";
import AnimatedRoutes from "./components/AnimatedRoutes";

const queryClient = new QueryClient();

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    return !hasSeenSplash;
  });

  const [showOnboarding, setShowOnboarding] = useState(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    return !hasSeenOnboarding;
  });

  const handleSplashComplete = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true');
    setShowOnboarding(false);
  };

  return (
    <>
      <AnimatePresence>
        {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      </AnimatePresence>
      <AnimatePresence>
        {!showSplash && showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
      </AnimatePresence>
      <Toaster />
      <Sonner />
      <GlobalChat />
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <ChatProvider>
          <TooltipProvider>
            <AppContent />
          </TooltipProvider>
        </ChatProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
