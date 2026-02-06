import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGetUsersQuery } from "@/store/api/userApi";
import { message } from "antd";

const roleOptions = [
  "Admin",
  "Super Admin",
  "HR",
  "Senior HR",
  "Junior HR",
  "Manager",
  "Junior Manager",
  "Senior Manager"
];

const StaffScheduleTasks = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);

  // Fetch all active users and filter by selected roles
  const { data: allUsersData, isLoading } = useGetUsersQuery({
    isActive: true,
    page: 1,
    limit: 1000,
  });

  useEffect(() => {
    if (allUsersData?.data?.users && selectedRoles.length > 0) {
      // Filter users by selected roles
      const filtered = allUsersData.data.users.filter((user: any) =>
        selectedRoles.includes(user.role)
      );
      setAvailableUsers(filtered);
    } else {
      setAvailableUsers([]);
    }
  }, [allUsersData, selectedRoles]);

  const handleRoleChange = (roles: string[]) => {
    setSelectedRoles(roles);
    setSelectedUsers([]); // Clear user selection when roles change
  };

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSave = async () => {
    if (selectedUsers.length === 0) {
      message.warning("Please select at least one user");
      return;
    }

    try {
      // TODO: Save to backend API
      // await saveStaffScheduleTasks({ userIds: selectedUsers }).unwrap();
      toast({
        title: "Success",
        description: `Access granted to ${selectedUsers.length} user(s)`,
      });
      message.success("Staff schedule access updated successfully");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.error?.message || "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/hrms-geo/tasks/settings')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Staff who can schedule tasks</h1>
              <p className="text-muted-foreground mt-1">Select staff who will be able to schedule tasks</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Select Roles</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Select roles to filter users. Users from selected roles will be available for selection.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Roles (Multiple Selection)</Label>
                <Select
                  value={selectedRoles[0] || ""}
                  onValueChange={(value) => {
                    if (!selectedRoles.includes(value)) {
                      handleRoleChange([...selectedRoles, value]);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions
                      .filter(role => !selectedRoles.includes(role))
                      .map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                
                {selectedRoles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedRoles.map((role) => (
                      <div
                        key={role}
                        className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2"
                      >
                        {role}
                        <button
                          onClick={() => handleRoleChange(selectedRoles.filter(r => r !== role))}
                          className="hover:text-blue-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedRoles.length > 0 && (
                <div className="space-y-2">
                  <Label>Users (Multiple Selection)</Label>
                  {isLoading ? (
                    <div className="text-sm text-muted-foreground">Loading users...</div>
                  ) : availableUsers.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No users found for selected roles</div>
                  ) : (
                    <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                      {availableUsers.map((user) => (
                        <div
                          key={user._id}
                          className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                          onClick={() => handleUserToggle(user._id)}
                        >
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user._id)}
                            onChange={() => handleUserToggle(user._id)}
                            className="w-4 h-4"
                          />
                          <div className="flex-1">
                            <div className="font-medium">{user.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {user.email} • {user.role}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {selectedUsers.length > 0 && (
                <div className="p-4 bg-muted rounded-md">
                  <div className="text-sm font-medium mb-2">
                    Selected Users ({selectedUsers.length}):
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((userId) => {
                      const user = availableUsers.find(u => u._id === userId);
                      return user ? (
                        <div
                          key={userId}
                          className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                        >
                          {user.name}
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => navigate('/hrms-geo/tasks/settings')}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={selectedUsers.length === 0}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StaffScheduleTasks;
