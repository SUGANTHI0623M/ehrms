import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Search, Filter, Users } from "lucide-react";

const StaffLocationAccess = () => {
  const staffMembers = [
    {
      name: "ABILASH S",
      id: "ASKEVA/MDU-79",
      phone: "+91 9585837520",
      enabled: false,
    },
    {
      name: "ABIRAMI KATHIRESAN",
      id: "ASKEVA/MDU-93",
      phone: "+91 6381114196",
      enabled: false,
    },
    {
      name: "AMIRTHA VALLI",
      id: "ASKEVA/MDU-100",
      phone: "+91 9025734853",
      enabled: false,
    },
    {
      name: "Harsha Varthannan",
      id: "ASKEVA/MDU-96",
      phone: "+91 9751506163",
      enabled: true,
    },
  ];

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Staff Location Access
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Configure which staff members have location tracking activated
          </p>
        </div>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-0 sm:pb-0">
            <CardTitle className="text-lg sm:text-xl">
              Staff Location Access Management
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Staff you have added in your Web subscription will appear here
            </p>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by name or staff ID"
                  className="pl-10 h-10"
                />
              </div>
              <Button
                variant="outline"
                className="h-10 flex items-center justify-center"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold text-sm sm:text-base">
                Monthly Regular (34)
              </h3>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left p-3 font-medium min-w-[200px]">
                      Name
                    </th>
                    <th className="text-left p-3 font-medium min-w-[120px]">
                      ID
                    </th>
                    <th className="text-left p-3 font-medium min-w-[150px]">
                      Phone Number
                    </th>
                    <th className="text-center p-3 font-medium min-w-[120px]">
                      Enable/Disable
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {staffMembers.map((staff, index) => (
                    <tr
                      key={index}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{staff.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground text-xs sm:text-sm">
                        {staff.id}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs sm:text-sm">
                        {staff.phone}
                      </td>
                      <td className="p-3 text-center">
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
    </MainLayout>
  );
};

export default StaffLocationAccess;
