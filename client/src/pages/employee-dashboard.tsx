import BingoHorizontalDashboard from "@/components/horizontal-bingo-dashboard";
import { useAuth } from "@/hooks/use-auth";

export default function EmployeeDashboard() {
  const { logout } = useAuth();
  
  return <BingoHorizontalDashboard onLogout={logout} />;
}
