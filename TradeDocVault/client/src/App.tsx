import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { FileText, Settings, User } from "lucide-react";
import { Dashboard } from "./pages/dashboard";
import { CustomerProfile } from "./pages/customer-profile";
import NotFound from "@/pages/not-found";

function AppHeader() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-semibold text-gray-900">Trade Document Processing</h1>
              <p className="text-sm text-gray-500">AI-Powered Compliance Platform</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="text-gray-400 hover:text-gray-500">
              <Settings className="w-5 h-5" />
            </button>
            <button className="text-gray-400 hover:text-gray-500">
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Router() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [currentView, setCurrentView] = useState<'dashboard' | 'customer-profile'>('dashboard');

  const handleSelectCustomer = (customerId: number) => {
    setSelectedCustomerId(customerId);
    setCurrentView('customer-profile');
  };

  const handleBackToDashboard = () => {
    setSelectedCustomerId(null);
    setCurrentView('dashboard');
  };

  return (
    <>
      <AppHeader />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'dashboard' ? (
          <Dashboard onSelectCustomer={handleSelectCustomer} />
        ) : selectedCustomerId ? (
          <CustomerProfile 
            customerId={selectedCustomerId} 
            onBack={handleBackToDashboard} 
          />
        ) : (
          <Dashboard onSelectCustomer={handleSelectCustomer} />
        )}
      </main>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
