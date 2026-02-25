import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link, useLocation } from "react-router-dom";
import { Database, ArrowRight } from "lucide-react";

const CustomersSettings = () => {
  const location = useLocation();

  // Determine active tab from route - use precise matching
  const getActiveTab = () => {
    const path = location.pathname.split("?")[0]; // Remove query params
    const normalizedPath = path.replace(/\/$/, ""); // Remove trailing slash
    
    // Use precise path matching instead of includes() to avoid false matches
    if (normalizedPath === "/hrms-geo/customers/dashboard" || normalizedPath.startsWith("/hrms-geo/customers/dashboard/")) {
      return "dashboard";
    }
    if (normalizedPath === "/hrms-geo/customers/list" || normalizedPath.startsWith("/hrms-geo/customers/list/")) {
      return "list";
    }
    if (normalizedPath === "/hrms-geo/customers/settings" || normalizedPath.startsWith("/hrms-geo/customers/settings/")) {
      return "settings";
    }
    // Default to settings if path doesn't match any specific tab
    return "settings";
  };

  const settingsOptions = [
    {
      title: "Customer Data Fields",
      description: "Manage custom fields for customer profiles",
      icon: <Database className="w-6 h-6 text-blue-500" />,
      link: "/hrms-geo/customers/settings/data-fields",
    },
  ];

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Customers Settings
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Configure customer module settings and custom fields
          </p>
        </div>

        <Tabs value={getActiveTab()} className="w-full">
          <div className="flex overflow-x-auto pb-1">
            <TabsList className="h-auto p-1 bg-muted/50 justify-start inline-flex min-w-full sm:min-w-0">
              <TabsTrigger
                value="dashboard"
                asChild
                className="flex-1 sm:flex-none"
              >
                <Link to="/hrms-geo/customers/dashboard">Dashboard</Link>
              </TabsTrigger>
              <TabsTrigger value="list" asChild className="flex-1 sm:flex-none">
                <Link to="/hrms-geo/customers/list">Customers List</Link>
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                asChild
                className="flex-1 sm:flex-none"
              >
                <Link to="/hrms-geo/customers/settings">
                  Customers Settings
                </Link>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="settings" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {settingsOptions.map((option, index) => (
                <Link key={index} to={option.link}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer group">
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                      <div className="p-2 bg-muted rounded-lg group-hover:bg-blue-50 transition-colors">
                        {option.icon}
                      </div>
                      <CardTitle className="text-lg">{option.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0 flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {option.description}
                      </p>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-blue-500 transition-colors" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default CustomersSettings;
