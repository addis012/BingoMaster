import { Route, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import LoginPage from "./pages/login-page";
import SimpleAdminDashboard from "./pages/simple-admin-dashboard";
import EmployeeDashboard from "./pages/employee-dashboard-new";

function App() {
  const handleLogout = () => {
    // Clear any stored user data and redirect to login
    window.location.href = "/";
  };

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Route path="/" component={LoginPage} />
        <Route path="/login" component={LoginPage} />
        <Route path="/admin">
          <SimpleAdminDashboard onLogout={handleLogout} />
        </Route>
        <Route path="/employee">
          <EmployeeDashboard />
        </Route>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
