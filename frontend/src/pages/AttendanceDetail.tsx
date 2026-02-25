import { Link } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download } from "lucide-react";

const AttendanceDetail = () => {
  const attendanceData = [
    {
      date: "26 Nov / Wed",
      time: "11:27 pm",
      duration: "11 26 Hr (S)",
      status: "P",
      fine: "₹ 1 0.23 AM~12",
      halfDay: "HD | Half Day",
      overtime: "OFF | Overtime",
      leave: null,
      needsApproval: true
    },
    {
      date: "25 Nov / Tue",
      time: "10:31 pm",
      duration: "12 20 PM - 2:20 PM",
      status: "F",
      fine: "₹ 1 Fine",
      halfDay: "OFF | Overtime",
      overtime: "S | Leave",
      leave: null,
      needsApproval: false
    },
    {
      date: "24 Nov / Mon",
      time: "10:31 pm",
      duration: "12 20 PM - 3:30 PM",
      status: "P",
      fine: "₹ 1 0.23 AM~12",
      halfDay: "HD | Half Day",
      overtime: "OFF | Overtime",
      leave: null,
      needsApproval: false
    },
    {
      date: "23 Nov / Sun",
      time: "Partially Off",
      duration: null,
      status: null,
      fine: "₹ 1 Present",
      halfDay: "HD | Half Day",
      overtime: "OFF | Overtime",
      leave: "L | Leave",
      needsApproval: false
    },
    {
      date: "22 Nov / Sat",
      time: "9:15 pm",
      duration: "10 30 PM - 6:25 PM",
      status: "P",
      fine: "₹ 1 Present",
      halfDay: "OFF | Overtime",
      overtime: "S | Leave",
      leave: null,
      needsApproval: true
    },
    {
      date: "21 Nov / Fri",
      time: "10:15 pm",
      duration: "1:30 AM - 9:25 PM",
      status: "P",
      fine: "₹ 1 0.23 AM~12",
      halfDay: "HD | Half Day",
      overtime: "L | Leave",
      leave: null,
      needsApproval: false
    },
    {
      date: "20 Nov / Thu",
      time: "9:40 pm",
      duration: "12 25 AM - 6:27 PM",
      status: "P",
      fine: "₹ 1 Present",
      halfDay: "HD | Half Day",
      overtime: "WO | Week | Off",
      leave: null,
      needsApproval: false
    },
    {
      date: "19 Nov / Wed",
      time: "9:25 pm",
      duration: "11 26 PM - 2:25 PM",
      status: "P",
      fine: "₹ 1 0.30 AM~12",
      halfDay: "HD | Half Day",
      overtime: "OFF | Overtime",
      leave: null,
      needsApproval: true
    },
    {
      date: "18 Nov / Tue",
      time: "10:15 pm",
      duration: "12 20 PM - 2:20 PM",
      status: "F",
      fine: "₹ 1 Fine",
      halfDay: "OFF | Overtime",
      overtime: "S | Leave",
      leave: null,
      needsApproval: false
    },
    {
      date: "17 Nov / Mon",
      time: "Absent",
      duration: null,
      status: "A",
      fine: "A | Absent",
      halfDay: null,
      overtime: null,
      leave: null,
      needsApproval: false
    },
    {
      date: "16 Nov / Sun",
      time: "Weekly Off",
      duration: null,
      status: "WO",
      fine: "₹ 1 Present",
      halfDay: "HD | Half Day",
      overtime: "OFF | Overtime",
      leave: null,
      needsApproval: false
    },
    {
      date: "15 Nov / Sat",
      time: "9:15 pm",
      duration: "10 30 AM - 5:25 PM",
      status: "P",
      fine: "₹ 1 Present",
      halfDay: "HD | Half Day",
      overtime: "WO | Week | Off",
      leave: null,
      needsApproval: false
    }
  ];

  return (
    <MainLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/payroll/attendance">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-foreground">AARTHI B #AARTHI#/MDU-106</h1>
                <p className="text-muted-foreground mt-1">November 2025</p>
              </div>
            </div>
            <div className="flex gap-4">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              <Button>Confirm Approval</Button>
            </div>
          </div>

          <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
            <CardContent className="p-6">
              <div className="grid grid-cols-6 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Days</p>
                  <p className="text-2xl font-bold">26</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Present</p>
                  <p className="text-2xl font-bold text-success">7(+10)</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Absent</p>
                  <p className="text-2xl font-bold text-destructive">3</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Half Day</p>
                  <p className="text-2xl font-bold text-warning">0</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Weekly Off</p>
                  <p className="text-2xl font-bold">6</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Punched In/Out</p>
                  <p className="text-2xl font-bold">7/4</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {attendanceData.map((entry, index) => (
                  <div key={index} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="grid grid-cols-7 gap-4 items-center">
                      <div>
                        <p className="font-semibold">{entry.date}</p>
                        <p className="text-sm text-muted-foreground">{entry.time}</p>
                        {entry.duration && (
                          <p className="text-xs text-muted-foreground mt-1">{entry.duration}</p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {entry.status === "P" && (
                          <Badge className="bg-success">P | Present</Badge>
                        )}
                        {entry.status === "F" && (
                          <Badge className="bg-warning">F | Fine</Badge>
                        )}
                        {entry.status === "A" && (
                          <Badge variant="destructive">A | Absent</Badge>
                        )}
                        {entry.status === "WO" && (
                          <Badge variant="secondary">WO | Week Off</Badge>
                        )}
                      </div>

                      <div>
                        {entry.fine && (
                          <Badge variant="outline" className="text-xs">
                            {entry.fine}
                          </Badge>
                        )}
                      </div>

                      <div>
                        {entry.halfDay && (
                          <Badge variant="outline" className="text-xs">
                            {entry.halfDay}
                          </Badge>
                        )}
                      </div>

                      <div>
                        {entry.overtime && (
                          <Badge variant="outline" className="text-xs">
                            {entry.overtime}
                          </Badge>
                        )}
                      </div>

                      <div>
                        {entry.leave && (
                          <Badge variant="outline" className="text-xs">
                            {entry.leave}
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end">
                        <Button variant="link" size="sm">Add Note</Button>
                        <Button variant="link" size="sm">Logs</Button>
                        {entry.needsApproval && (
                          <Badge className="bg-purple-500">Need help?</Badge>
                        )}
                      </div>
                    </div>
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

export default AttendanceDetail;
