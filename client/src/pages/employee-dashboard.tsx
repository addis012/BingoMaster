import BingoEmployeeDashboard from "@/components/bingo-employee-dashboard";
import { useAuth } from "@/hooks/use-auth";

export default function EmployeeDashboard() {
  const { logout } = useAuth();
  
  return <BingoEmployeeDashboard onLogout={logout} />;
}
