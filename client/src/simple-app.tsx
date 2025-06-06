import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Employee Dashboard</h1>
            <Button onClick={() => setCurrentPage("login")} variant="outline">
              Logout
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Bingo Game</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  {Array.from({ length: 25 }, (_, i) => (
                    <div 
                      key={i} 
                      className="aspect-square border rounded flex items-center justify-center text-sm font-medium"
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
                <Button className="w-full">Start New Game</Button>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Player Registration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <input 
                    placeholder="Player Name" 
                    className="w-full p-2 border rounded"
                  />
                  <input 
                    placeholder="Entry Fee" 
                    className="w-full p-2 border rounded"
                  />
                  <Button className="w-full">Register Player</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return null;
}