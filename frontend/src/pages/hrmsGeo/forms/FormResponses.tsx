import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, ClipboardList, BarChart3, HelpCircle, Search, Calendar, RotateCw, Download, Package } from "lucide-react";
import { Link } from "react-router-dom";

const FormResponses = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Forms</h1>
            <p className="text-muted-foreground mt-1">See form responses of forms filled by staff while completing a task</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="responses" className="w-full">
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

            <TabsContent value="responses" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Form Responses</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        View form submissions collected during task execution
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search by staff name or task ID"
                          className="pl-10 w-[250px]"
                        />
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 border rounded-md">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">29 Jan 2026</span>
                      </div>
                      <Select defaultValue="all">
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select Form" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Forms</SelectItem>
                          <SelectItem value="business">BUSINESS DEVELOPME...</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm">
                        <RotateCw className="w-4 h-4" />
                      </Button>
                      <Button>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-sm font-medium">Name</th>
                          <th className="text-left p-3 text-sm font-medium">Task ID</th>
                          <th className="text-left p-3 text-sm font-medium">Address</th>
                          <th className="text-left p-3 text-sm font-medium">Client Name</th>
                          <th className="text-left p-3 text-sm font-medium">Company Name</th>
                          <th className="text-left p-3 text-sm font-medium">Client Phone Number</th>
                          <th className="text-left p-3 text-sm font-medium">Proof</th>
                          <th className="text-left p-3 text-sm font-medium">Remarks</th>
                          <th className="text-left p-3 text-sm font-medium">Task created on</th>
                          <th className="text-left p-3 text-sm font-medium">Form created at</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan={10} className="p-8 text-center">
                            <div className="flex flex-col items-center justify-center">
                              <Package className="w-16 h-16 text-muted-foreground mb-4" />
                              <p className="text-lg font-medium text-muted-foreground">No Data</p>
                              <p className="text-sm text-muted-foreground mt-2">No form responses found for the selected filters</p>
                            </div>
                          </td>
                        </tr>
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

export default FormResponses;
