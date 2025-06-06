import BingoGameFixed from "@/components/bingo-game-fixed";
import { useAuth } from "@/hooks/use-auth";

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  
  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <BingoGameFixed
      employeeName={user.name}
      employeeId={user.id}
      shopId={user.shopId || 1}
      onLogout={logout}
    />
  );
}