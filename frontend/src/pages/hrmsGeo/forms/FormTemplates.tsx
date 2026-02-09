import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, ClipboardList, BarChart3, HelpCircle, Plus, Edit, ToggleLeft, ToggleRight } from "lucide-react";
import { Link } from "react-router-dom";

const FormTemplates = () => {
  const templates = [
    {
      name: "Business Development Form",
      createdOn: "15 Jan 2026",
      createdBy: "Organization",
      deactivatedAt: "-",
      status: "active",
      assignedTo: 5
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Forms</h1>
            <p className="text-muted-foreground mt-1">Create and manage form templates</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="templates" className="w-full">
            <TabsList>
              <TabsTrigger value="responses" asChild>
                <Link to="/hrms-geo/forms/responses">
                  <ClipboardList className="w-4 h-4 mr-2" />
                  Responses
                </Link>
              </TabsTrigger>
              <TabsTrigger value="templates" asChild>
                <Link to="/hrms-geo/forms/templates">
                  <FileText className="w-4 h-4 mr-2" />
                  Templates
                </Link>
              </TabsTrigger>
              <TabsTrigger value="reports" asChild>
                <Link to="/hrms-geo/forms/reports">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Reports
                </Link>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Form Templates</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create and manage form templates for data collection
                      </p>
                    </div>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-sm font-medium">Template Name</th>
                          <th className="text-left p-3 text-sm font-medium">Created on</th>
                          <th className="text-left p-3 text-sm font-medium">Created by</th>
                          <th className="text-left p-3 text-sm font-medium">Deactivated at</th>
                          <th className="text-left p-3 text-sm font-medium">Status</th>
                          <th className="text-left p-3 text-sm font-medium">Assigned To</th>
                          <th className="text-left p-3 text-sm font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {templates.map((template, index) => (
                          <tr key={index} className="border-b hover:bg-muted/50">
                            <td className="p-3 text-sm font-medium">{template.name}</td>
                            <td className="p-3 text-sm">{template.createdOn}</td>
                            <td className="p-3 text-sm">{template.createdBy}</td>
                            <td className="p-3 text-sm">{template.deactivatedAt}</td>
                            <td className="p-3">
                              {template.status === "active" ? (
                                <div className="flex items-center gap-2">
                                  <ToggleRight className="w-5 h-5 text-green-600" />
                                  <span className="text-sm text-green-600">Active</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <ToggleLeft className="w-5 h-5 text-gray-400" />
                                  <span className="text-sm text-gray-400">Inactive</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-sm">{template.assignedTo} staff</td>
                            <td className="p-3">
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default FormTemplates;
