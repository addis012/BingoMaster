import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import BingoEmployeeDashboard from "@/components/bingo-employee-dashboard";

export default function SimpleApp() {
  const [currentPage, setCurrentPage] = useState("login");

  if (currentPage === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Bingo System Login</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={() => setCurrentPage("admin")} 
              className="w-full"
            >
              Login as Admin
            </Button>
            <Button 
              onClick={() => setCurrentPage("employee")} 
              variant="outline" 
              className="w-full"
            >
              Login as Employee
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentPage === "admin") {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <Button onClick={() => setCurrentPage("login")} variant="outline">
              Logout
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Shop Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Manage shops and employees</p>
                <Button className="mt-4">Manage Shops</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Financial Reports</CardTitle>
              </CardHeader>
              <CardContent>
                <p>View revenue and commissions</p>
                <Button className="mt-4">View Reports</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Game Monitoring</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Monitor active games</p>
                <Button className="mt-4">View Games</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (currentPage === "employee") {
    return <BingoEmployeeDashboard onLogout={() => setCurrentPage("login")} />;
  }

  return null;
}