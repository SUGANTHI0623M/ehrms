import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronRight, Clock, Users, Calendar, Briefcase, DollarSign, Building, Settings as SettingsIcon, LogOut, FilePlus } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const Settings = () => {
  const settingsGroups = [
    {
      title: "Attendance Settings",
      icon: Clock,
      items: [
        { name: "Attendance Templates", badge: "New", description: "Configure attendance based geolocation, workflows, and more" },
        { name: "Attendance Geofence Settings", description: "" },
        { name: "Shift Settings", description: "1 configured" },
        { name: "Automation Rules", description: "This lets you Entry data and others" },
      ]
    },
    {
      title: "Business Settings",
      icon: Briefcase,
      items: [
        { name: "Holiday Policy", description: "1 template" },
        { name: "Leave Policy", description: "1 template" },
        { name: "Manage Business Functions", description: "" },
        { name: "Manage Staff Data", description: "Not Data Added" },
        { name: "Weekly Holidays", description: "Can manage only weekly and timesheets" },
        { name: "Manage Users", badge: "New", description: "Configure user types and user rights under your organisation" },
        { name: "Celebrations", description: "1 edit and modify wishes and others in your settings" },
        { name: "Roles & Permissions", badge: "New", description: "Configure permissions and assign roles to your staff" },
      ]
    },
    {
      title: "Salary Settings",
      icon: DollarSign,
      items: [
        { name: "Salary Calculation Logic", description: "Configure Salary Logic" },
        { name: "Salary Components", description: "Configure Earnings, Earnings, Deductions and statutory Components" },
        { name: "Salary Template Builder", description: "Build Salary and templates" },
        { name: "Salary Details Access to Staff", description: "Enable/Disable" },
        { name: "Payslip Customization", badge: "New", description: "Customize how you want to share your payslip style" }
      ]
    },
    {
      title: "Business Info",
      icon: Building,
      items: [
        { name: "Business Name", description: "AbhiRushi Coders LLP" },
        { name: "Business Status & City", description: "Tamil Nadu / Sivasi" },
        { name: "Business Address", description: "R.A. IT Services, Sivasi, Tamil Nadu 626189, IN" },
        { name: "Business Logo", description: "Logo Added" }
      ]
    },
    {
      title: "Company Policy",
      icon: FilePlus,
      items: [
        { name: "Company Policy", description: "Manage company policies and documents" }
      ]
    },
    {
      title: "Others",
      icon: SettingsIcon,
      items: [
        { name: "Channel Partner ID (Optional)", description: "Not Added" },
        { name: "Alerts and Notifications", description: "" },
        { name: "Logout", description: "" }
      ]
    }
  ];

  return (
    <MainLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">Manage your application settings and preferences</p>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder='Search Settings (press "/" to search)'
                  className="pl-10"
                />
              </div>

              <div className="space-y-8">
                {settingsGroups.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <group.icon className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold">{group.title}</h2>
                    </div>

                    <div className="space-y-2">
                      {group.items.map((item, itemIndex) => (
                        <div
                          key={itemIndex}
                          className="flex items-center justify-between p-4 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              {item.badge && (
                                <Badge variant="secondary" className="bg-success text-white">
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                            )}
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      ))}
                    </div>

                    {groupIndex < settingsGroups.length - 1 && (
                      <Separator className="mt-8" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Settings;
