import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BingoGameFixed from "@/components/bingo-game-fixed";
import { useAuth } from "@/hooks/use-auth";
import { DollarSign, GamepadIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmployeeDashboard() {
  const { user, logout } = useAuth();
  
  if (!user) {
    return <div>Loading...</div>;
  }

  const handleGameUpdate = () => {
    refetchActiveGame();
    refetchPlayers();
  };

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader user={user} title="Employee Panel" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Today's Collections</p>
                  <p className="text-2xl font-semibold text-gray-900">${employeeStats?.totalCollections || "0"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <GamepadIcon className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Games Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">{employeeStats?.gamesCompleted || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Players</p>
                  <p className="text-2xl font-semibold text-gray-900">{gamePlayers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Game Management */}
          <GameManagement 
            activeGame={activeGame}
            players={gamePlayers}
            onGameUpdate={handleGameUpdate}
            onPlayerUpdate={refetchPlayers}
          />

          {/* Bingo Board */}
          <BingoBoard 
            game={activeGame}
            isConnected={isConnected}
            onCallNumber={() => sendMessage({ type: 'call_number' })}
          />
        </div>

        {/* Active Players Table */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Active Players</CardTitle>
            <CardDescription>Players registered for the current game</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player Name</TableHead>
                    <TableHead>Cartela Numbers</TableHead>
                    <TableHead>Entry Fee</TableHead>
                    <TableHead>Registration Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gamePlayers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No players registered yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    gamePlayers.map((player: any) => (
                      <TableRow key={player.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                              <span className="text-sm font-medium text-primary">
                                {player.playerName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                            {player.playerName}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {player.cartelaNumbers.map((num: number, idx: number) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {num}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>${player.entryFee}</TableCell>
                        <TableCell>
                          {new Date(player.registeredAt).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              Remove
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
