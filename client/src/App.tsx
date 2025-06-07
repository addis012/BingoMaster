import { Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/use-auth";
import LoginPage from "./pages/login-page";
import SimpleAdminDashboard from "./pages/simple-admin-dashboard";
import SuperAdminDashboard from "./pages/super-admin-dashboard";
import BingoEmployeeDashboard from "./components/bingo-employee-dashboard";

function App() {
  const handleLogout = () => {
    // Clear any stored user data and redirect to login
    window.location.href = "/";
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Route path="/" component={LoginPage} />
          <Route path="/login" component={LoginPage} />
          
          {/* Dashboard Routes */}
          <Route path="/dashboard/super-admin">
            <SuperAdminDashboard onLogout={handleLogout} />
          </Route>
          <Route path="/dashboard/admin">
            <SimpleAdminDashboard onLogout={handleLogout} />
          </Route>
          <Route path="/dashboard/employee">
            <BingoEmployeeDashboard onLogout={handleLogout} />
          </Route>
          
          {/* Legacy Routes for backward compatibility */}
          <Route path="/admin">
            <SimpleAdminDashboard onLogout={handleLogout} />
          </Route>
          <Route path="/employee">
            <BingoEmployeeDashboard onLogout={handleLogout} />
          </Route>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
