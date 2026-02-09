import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FileText, ClipboardList, BarChart3, HelpCircle, Download, FileCheck } from "lucide-react";
import { Link } from "react-router-dom";

const FormReports = () => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />
      
      <main className="ml-64 mt-16 p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">Forms</h1>
            <p className="text-muted-foreground mt-1">Generate compliance reports and audit trail documentation</p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="reports" className="w-full">
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

            <TabsContent value="reports" className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Reports</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Form Details Report - Shows details of forms filled by employees during task completion
                      </p>
                    </div>
                    <Button>
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileCheck className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">Form Details</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          See the details of forms filled by employees while completing tasks
                        </p>
                      </div>
                    </div>
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

export default FormReports;
