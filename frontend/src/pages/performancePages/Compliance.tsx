import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Shield, AlertTriangle, CheckCircle, FileText, Calendar } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const Compliance = () => {
  const complianceStats = {
    pfCompliance: 95,
    esiCompliance: 92,
    laborLaws: 88,
    taxCompliance: 98
  };

  const pfRecords = [
    { employee: "Rahul Sharma", pfNumber: "MH/12345/001", contribution: "11,400", status: "Updated" },
    { employee: "Priya Patel", pfNumber: "MH/12345/002", contribution: "10,200", status: "Updated" },
    { employee: "Amit Kumar", pfNumber: "MH/12345/003", contribution: "7,800", status: "Pending" },
    { employee: "Neha Singh", pfNumber: "MH/12345/004", contribution: "9,360", status: "Updated" },
  ];

  const esiRecords = [
    { employee: "Rahul Sharma", esiNumber: "1234567890123456", contribution: "1,425", status: "Updated" },
    { employee: "Priya Patel", esiNumber: "1234567890123457", contribution: "1,275", status: "Updated" },
    { employee: "Amit Kumar", esiNumber: "1234567890123458", contribution: "975", status: "Pending" },
  ];

  const upcomingDeadlines = [
    { task: "PF Return Filing", deadline: "2024-12-15", priority: "High" },
    { task: "ESI Challan Payment", deadline: "2024-12-21", priority: "High" },
    { task: "TDS Return Filing", deadline: "2024-12-31", priority: "Medium" },
    { task: "Labor Welfare Fund", deadline: "2025-01-10", priority: "Medium" },
  ];

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Compliance Management</h1>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <FileText className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
              <Button className="w-full sm:w-auto">
                <Shield className="w-4 h-4 mr-2" />
                Update Records
              </Button>
            </div>
          </div>

          {/* Compliance Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              ["PF Compliance", complianceStats.pfCompliance],
              ["ESI Compliance", complianceStats.esiCompliance],
              ["Labor Laws", complianceStats.laborLaws],
              ["Tax Compliance", complianceStats.taxCompliance]
            ].map(([label, value], index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                  <Shield className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-foreground">{value}%</div>
                  <Progress value={value as number} className="h-2 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* PF Records & Upcoming Deadlines */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle>PF Records</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pfRecords.map((record, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border rounded-lg">
                      <div>
                        <h3 className="font-semibold text-foreground">{record.employee}</h3>
                        <p className="text-sm text-muted-foreground">PF No: {record.pfNumber}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Contribution</p>
                          <p className="font-semibold text-foreground">₹{record.contribution}</p>
                        </div>
                        <Badge variant={record.status === "Updated" ? "default" : "secondary"}>
                          {record.status === "Updated" ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                          {record.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Upcoming Deadlines</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {upcomingDeadlines.map((deadline, index) => (
                  <div key={index} className="p-3 border border-border rounded-lg space-y-2">
                    <div className="flex items-start justify-between">
                      <p className="font-semibold text-sm text-foreground">{deadline.task}</p>
                      <Badge variant={deadline.priority === "High" ? "destructive" : "secondary"}>
                        {deadline.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>{deadline.deadline}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* ESI Records */}
          <Card>
            <CardHeader><CardTitle>ESI Records</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {esiRecords.map((record, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border rounded-lg">
                    <div>
                      <h3 className="font-semibold text-foreground">{record.employee}</h3>
                      <p className="text-sm text-muted-foreground">ESI No: {record.esiNumber}</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Contribution</p>
                        <p className="font-semibold text-foreground">₹{record.contribution}</p>
                      </div>
                      <Badge variant={record.status === "Updated" ? "default" : "secondary"}>
                        {record.status === "Updated" ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                        {record.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Compliance Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  ["PF Return Filing Due", "Complete PF return filing by December 15, 2024"],
                  ["Pending ESI Updates", "1 employee ESI record needs update"]
                ].map(([title, desc], index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-background rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-1" />
                    <div>
                      <p className="font-medium text-foreground">{title}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
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

export default Compliance;
