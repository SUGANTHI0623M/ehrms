import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import MainLayout from "@/components/MainLayout";
import { useGetAttendanceQuery, useGetAttendanceStatsQuery } from "@/store/api/attendanceApi";
import { Users, UserCheck, UserX, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";

const Attendance = () => {
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));

  const { data: attendanceData, isLoading: isLoadingAttendance } = useGetAttendanceQuery({
    date: selectedDate,
    page: 1,
    limit: 100
  });

  const { data: statsData, isLoading: isLoadingStats } = useGetAttendanceStatsQuery({
    date: selectedDate
  });

  const stats = statsData?.data?.stats;
  const attendanceRecords = attendanceData?.data?.attendance || [];

  const statsArray = [
    { title: "Present", value: stats?.present?.toString() || "0", icon: UserCheck, color: "text-success" },
    { title: "Absent", value: stats?.absent?.toString() || "0", icon: UserX, color: "text-destructive" },
    { title: "Half Day", value: stats?.halfDay?.toString() || "0", icon: Clock, color: "text-warning" },
    { title: "Not Marked", value: stats?.notMarked?.toString() || "0", icon: AlertCircle, color: "text-muted-foreground" },
    { title: "Punched In", value: stats?.punchedIn?.toString() || "0", icon: Users, color: "text-primary" },
    { title: "Punched Out", value: stats?.punchedOut?.toString() || "0", icon: Users, color: "text-muted-foreground" },
  ];

  const leaveStats = [
    { title: "On Leave", value: stats?.onLeave?.toString() || "0", color: "text-warning" },
  ];

  const overtimeStats = [
    { title: "Overtime Hours", value: "0", color: "text-info" }, // Would need separate calculation
  ];

  const otherStats = [
    { title: "Half Day", value: stats?.halfDay?.toString() || "0", color: "text-warning" },
  ];

  const formatTime = (dateString?: string) => {
    if (!dateString) return "-";
    return format(new Date(dateString), "hh:mm a");
  };

  const formatWorkHours = (minutes?: number) => {
    if (!minutes) return "0h 0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6">

          {/* Page Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Attendance</h1>
            <div className="flex gap-3 w-full sm:w-auto">
              <Input 
                type="date" 
                className="w-full sm:w-48" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
              <Button className="w-full sm:w-auto">Export Report</Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {isLoadingStats ? (
              <div className="col-span-full text-center py-8 text-muted-foreground">Loading stats...</div>
            ) : (
              statsArray.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <stat.icon className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                </CardContent>
              </Card>
              ))
            )}
          </div>

          {/* Leave / Overtime / Other */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[{ label: "On Leave", data: leaveStats }, { label: "Overtimes & Fines", data: overtimeStats }, { label: "Other", data: otherStats }].map(
              (sec, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle>{sec.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sec.data.map((stat, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border border-border rounded-lg"
                        >
                          <span className="text-sm font-medium">{stat.title}</span>
                          <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>

          {/* Detailed Attendance */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAttendance ? (
                <div className="text-center py-8 text-muted-foreground">Loading attendance data...</div>
              ) : attendanceRecords.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No attendance records found for this date</div>
              ) : (
                <div className="space-y-4">
                  {attendanceRecords.map((record) => {
                    const employee = record.employeeId;
                    const name = (employee as any)?.name || "N/A";
                    const employeeId = (employee as any)?.employeeId || "N/A";
                    
                    return (
                      <div
                        key={record._id}
                        className="flex flex-col gap-4 p-4 border border-border rounded-lg hover:bg-accent/50 transition"
                      >
                        {/* Name and Employee Info */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-foreground">{name}</h3>
                            <p className="text-sm text-muted-foreground">{employeeId}</p>
                            {(employee as any)?.designation && (
                              <p className="text-xs text-muted-foreground">{(employee as any).designation}</p>
                            )}
                          </div>
                          <Badge
                            variant={
                              record.status === "Present"
                                ? "default"
                                : record.status === "Absent"
                                ? "destructive"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {record.status}
                          </Badge>
                        </div>

                        {/* Punch Details Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Punch In</p>
                            <p className="font-medium">{formatTime(record.punchIn)}</p>
                            {record.punchInIpAddress && (
                              <p className="text-xs text-muted-foreground mt-1">IP: {record.punchInIpAddress}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Punch Out</p>
                            <p className="font-medium">{formatTime(record.punchOut)}</p>
                            {record.punchOutIpAddress && (
                              <p className="text-xs text-muted-foreground mt-1">IP: {record.punchOutIpAddress}</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Work Hours</p>
                            <p className="font-medium">{formatWorkHours(record.workHours)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Location</p>
                            {record.location ? (
                              <div>
                                <p className="text-xs font-medium break-words">{record.location.address || "Location captured"}</p>
                                {record.location.latitude && record.location.longitude && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {record.location.latitude.toFixed(4)}, {record.location.longitude.toFixed(4)}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">Not available</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </MainLayout>
  );
};

export default Attendance;
