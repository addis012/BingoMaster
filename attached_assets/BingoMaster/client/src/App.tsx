import { Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./hooks/use-auth";
import LoginPage from "./pages/login-page";
import TestLogin from "./pages/test-login";
import SimpleAdminDashboard from "./pages/simple-admin-dashboard";
import SuperAdminDashboard from "./pages/super-admin-dashboard";
import IntegratedBingoGame from "./components/integrated-bingo-game";

function AppRouter() {
  const { user } = useAuth();
  
  const handleLogout = () => {
    // Clear any stored user data and redirect to login
    window.location.href = "/";
  };

  return (
    <Router>
      <Route path="/" component={LoginPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/test-login" component={TestLogin} />
      
      {/* Dashboard Routes */}
      <Route path="/dashboard/super-admin">
        <SuperAdminDashboard onLogout={handleLogout} />
      </Route>
      <Route path="/dashboard/admin">
        <SimpleAdminDashboard onLogout={handleLogout} />
      </Route>
      <Route path="/dashboard/employee">
        <IntegratedBingoGame 
          employeeName={user?.name || "Employee"} 
          employeeId={user?.id || 0} 
          shopId={user?.shopId || 0} 
          onLogout={handleLogout} 
        />
      </Route>
      
      {/* Legacy Routes for backward compatibility */}
      <Route path="/admin">
        <SimpleAdminDashboard onLogout={handleLogout} />
      </Route>
      <Route path="/employee">
        <IntegratedBingoGame 
          employeeName={user?.name || "Employee"} 
          employeeId={user?.id || 0} 
          shopId={user?.shopId || 0} 
          onLogout={handleLogout} 
        />
      </Route>
    </Router>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
