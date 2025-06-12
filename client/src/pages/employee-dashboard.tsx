import FixedBingoDashboard from "@/components/fixed-bingo-dashboard";
import { useAuth } from "@/hooks/use-auth";

export default function EmployeeDashboard() {
  const { logout } = useAuth();
  
  return <FixedBingoDashboard onLogout={logout} />;
}
