import BingoNewEmployeeDashboard from "@/components/new-employee-dashboard";
import { useAuth } from "@/hooks/use-auth";

export default function EmployeeDashboard() {
  const { logout } = useAuth();
  
  return <BingoNewEmployeeDashboard onLogout={logout} />;
}
