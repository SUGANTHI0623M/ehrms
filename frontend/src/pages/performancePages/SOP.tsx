import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Download, Eye } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const SOP = () => {
  const sopCategories = [
    { name: "Recruitment", count: 8, updated: "2024-11-20" },
    { name: "Onboarding", count: 12, updated: "2024-11-18" },
    { name: "Training", count: 15, updated: "2024-11-15" },
    { name: "Performance", count: 10, updated: "2024-11-10" },
    { name: "Compliance", count: 20, updated: "2024-11-05" },
    { name: "Payroll", count: 18, updated: "2024-11-01" },
  ];

  const recentSOPs = [
    { id: 1, title: "New Employee Onboarding Process", category: "Onboarding", version: "2.1", status: "Active", lastUpdated: "2024-11-20" },
    { id: 2, title: "Interview Screening Guidelines", category: "Recruitment", version: "1.5", status: "Active", lastUpdated: "2024-11-18" },
    { id: 3, title: "Performance Review Procedure", category: "Performance", version: "3.0", status: "Under Review", lastUpdated: "2024-11-15" },
    { id: 4, title: "PF & ESI Compliance Checklist", category: "Compliance", version: "1.8", status: "Active", lastUpdated: "2024-11-10" },
  ];

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">SOP Management</h1>
            <Button className="w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" /> Create New SOP
            </Button>
          </div>

          {/* Counts Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total SOPs</CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">83</div>
                <p className="text-xs text-success mt-1">+5 this month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Active SOPs</CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">78</div>
                <p className="text-xs text-muted-foreground mt-1">Currently in use</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Under Review</CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">5</div>
                <p className="text-xs text-muted-foreground mt-1">Pending approval</p>
              </CardContent>
            </Card>
          </div>

          {/* SOP Categories */}
          <Card>
            <CardHeader><CardTitle>SOP Categories</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sopCategories.map((category, index) => (
                  <div key={index} className="p-4 border border-border rounded-lg hover:bg-accent/50 transition cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{category.name}</h3>
                      <Badge>{category.count}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Last updated: {category.updated}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent SOPs */}
          <Card>
            <CardHeader><CardTitle>Recent SOPs</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSOPs.map((sop) => (
                  <div
                    key={sop.id}
                    className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition"
                  >
                    <div className="space-y-1">
                      <h3 className="font-semibold text-foreground">{sop.title}</h3>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>Category: {sop.category}</span>
                        <span>Version: {sop.version}</span>
                        <span>Updated: {sop.lastUpdated}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <Badge variant={sop.status === "Active" ? "default" : "secondary"}>{sop.status}</Badge>

                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        <Eye className="w-4 h-4 mr-1" /> View
                      </Button>

                      <Button variant="outline" size="sm" className="w-full sm:w-auto">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      </main>
    </MainLayout>
  );
};

export default SOP;
