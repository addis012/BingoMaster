import IntegratedBingoGame from "@/components/integrated-bingo-game";
import { useAuth } from "@/hooks/use-auth";

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  
  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <IntegratedBingoGame
      employeeName={user.name}
      employeeId={user.id}
      shopId={user.shopId || 1}
      onLogout={logout}
    />
  );
}