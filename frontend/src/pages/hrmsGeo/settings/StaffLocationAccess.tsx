import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Users } from "lucide-react";

const StaffLocationAccess = () => {
  const staffMembers = [
    { name: "ABILASH S", id: "ASKEVA/MDU-79", phone: "+91 9585837520", enabled: false },
    { name: "ABIRAMI KATHIRESAN", id: "ASKEVA/MDU-93", phone: "+91 6381114196", enabled: false },
    { name: "AMIRTHA VALLI", id: "ASKEVA/MDU-100", phone: "+91 9025734853", enabled: false },
    { name: "Harsha Varthannan", id: "ASKEVA/MDU-96", phone: "+91 9751506163", enabled: true },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff Location Access</h1>
            <p className="text-muted-foreground mt-1">Configure which staff members have location tracking activated</p>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Staff Location Access Management</CardTitle>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Staff you have added in your Web subscription will appear here
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input placeholder="Search by name or staff ID" className="pl-10" />
                </div>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
              </div>

              <div className="mb-4">
                <h3 className="font-semibold mb-2">Monthly Regular (34)</h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 text-sm font-medium">Name</th>
                      <th className="text-left p-3 text-sm font-medium">ID</th>
                      <th className="text-left p-3 text-sm font-medium">Phone Number</th>
                      <th className="text-left p-3 text-sm font-medium">Enable/Disable</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffMembers.map((staff, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span>{staff.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-sm">{staff.id}</td>
                        <td className="p-3 text-sm">{staff.phone}</td>
                        <td className="p-3">
                          <Switch checked={staff.enabled} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StaffLocationAccess;
