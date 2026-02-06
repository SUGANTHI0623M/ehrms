import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { 
  useGetHolidayTemplatesQuery, 
  useGetLeaveTemplatesQuery,
  useGetBusinessFunctionsQuery,
  useGetStaffCustomFieldsQuery,
  useGetBusinessUsersQuery,
  useGetRolesQuery,
  useGetBusinessQuery
} from "@/store/api/settingsApi";

export default function BusinessSettings() {
  const navigate = useNavigate();
  
  const { data: holidayData } = useGetHolidayTemplatesQuery();
  const { data: leaveData } = useGetLeaveTemplatesQuery();
  const { data: functionsData } = useGetBusinessFunctionsQuery();
  const { data: staffFieldsData } = useGetStaffCustomFieldsQuery();
  const { data: usersData } = useGetBusinessUsersQuery({ roleType: "business-admins" });
  const { data: rolesData } = useGetRolesQuery();
  const { data: businessData } = useGetBusinessQuery();

  const holidayCount = holidayData?.data?.templates?.length || 0;
  const leaveCount = leaveData?.data?.templates?.length || 0;
  const functionsCount = functionsData?.data?.functions?.length || 0;
  const staffFieldsCount = staffFieldsData?.data?.fields?.length || 0;
  const usersCount = usersData?.data?.users?.length || 0;
  const rolesCount = rolesData?.data?.roles?.length || 0;
  
  // Check if weekly holidays are configured (either pattern or weeklyHolidays array)
  const weeklyHolidays = businessData?.data?.business?.settings?.business?.weeklyHolidays || [];
  const weeklyOffPattern = businessData?.data?.business?.settings?.business?.weeklyOffPattern || 'standard';
  const isWeeklyHolidaysConfigured = weeklyOffPattern === 'oddEvenSaturday' || weeklyHolidays.length > 0;
  
  const getWeeklyHolidaysDescription = () => {
    if (weeklyOffPattern === 'oddEvenSaturday') {
      return 'Odd/Even Saturday Pattern';
    } else if (weeklyHolidays.length > 0) {
      return `${weeklyHolidays.length} day${weeklyHolidays.length !== 1 ? 's' : ''} configured`;
    } else {
      return 'Not configured';
    }
  };

  const items = [
    { 
      name: "Holiday Policy", 
      description: holidayCount > 0 ? `${holidayCount} template${holidayCount !== 1 ? "s" : ""}` : "No templates" 
    },
    { 
      name: "Leave Policy", 
      description: leaveCount > 0 ? `${leaveCount} template${leaveCount !== 1 ? "s" : ""}` : "No templates" 
    },
    { 
      name: "Manage Business Functions",
      description: functionsCount > 0 ? `${functionsCount} function${functionsCount !== 1 ? "s" : ""}` : "No functions"
    },
    { 
      name: "Manage Staff Data", 
      description: staffFieldsCount > 0 ? `${staffFieldsCount} custom field${staffFieldsCount !== 1 ? "s" : ""}` : "No custom fields" 
    },
    { 
      name: "Weekly Holidays", 
      description: getWeeklyHolidaysDescription()
    },
    { 
      name: "Manage Users", 
      badge: "New", 
      description: usersCount > 0 ? `${usersCount} user${usersCount !== 1 ? "s" : ""}` : "No users" 
    },
    { 
      name: "Celebrations", 
      description: "Edit and modify wishes" 
    },
    { 
      name: "Roles & Permissions", 
      badge: "New", 
      description: rolesCount > 0 ? `${rolesCount} role${rolesCount !== 1 ? "s" : ""}` : "No roles" 
    },
  ];


  return (
    <MainLayout>
      <main className="p-4">
        <h2 className="text-2xl font-bold mb-4">Business Settings</h2>
        <Card className="">
          <CardContent className="p-6">


            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (item.name === "Holiday Policy") navigate("/business/holiday-templates");
                    else if (item.name === "Leave Policy") navigate("/business/leave-templates");
                    else if (item.name === "Manage Users") navigate("/business/manage-users");
                    else if (item.name === "Celebrations") navigate("/business/celebrations");
                    else if (item.name === "Manage Staff Data") navigate("/business/staff-details");
                    else if (item.name === "Weekly Holidays") navigate("/business/weekly-holidays");
                    else if (item.name === "Manage Business Functions") navigate("/business/business-functions");
                    else if (item.name === "Roles & Permissions") navigate("/business/roles-permissions");
                  }}
                  className="p-4 rounded-lg border hover:bg-muted cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.description && <p className="text-sm text-muted-foreground mt-1">{item.description}</p>}
                  </div>
                  <ChevronRight className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
}
