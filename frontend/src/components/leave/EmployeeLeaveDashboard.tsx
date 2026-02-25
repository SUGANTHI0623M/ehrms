import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Leave } from "@/store/api/leaveApi";

interface LeaveTypeConfig {
  type: string;
  days: number;
  carryForward?: boolean;
  maxCarryForward?: number;
}

interface EmployeeLeaveDashboardProps {
  leaves: Leave[];
  leaveTemplate?: { leaveTypes: LeaveTypeConfig[] };
}

const EmployeeLeaveDashboard = ({ leaves, leaveTemplate }: EmployeeLeaveDashboardProps) => {
  const { totalAllocated, totalUsed, totalUnused, leaveTypeStats } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    let totalAllocated = 0;
    const leaveTypeStats: Record<
      string,
      { total: number; used: number; pending: number; unused: number }
    > = {};

    if (leaveTemplate?.leaveTypes?.length) {
      leaveTemplate.leaveTypes.forEach((lt) => {
        const yearlyAllocation = lt.days * 12;
        totalAllocated += yearlyAllocation;
        leaveTypeStats[lt.type] = {
          total: yearlyAllocation,
          used: 0,
          pending: 0,
          unused: yearlyAllocation,
        };
      });
    }

    leaves.forEach((leave) => {
      const leaveYear = new Date(leave.startDate).getFullYear();
      if (leaveYear !== currentYear) return;
      if (leaveTypeStats[leave.leaveType]) {
        if (leave.status === "Approved") {
          leaveTypeStats[leave.leaveType].used += leave.days;
          leaveTypeStats[leave.leaveType].unused = Math.max(
            0,
            leaveTypeStats[leave.leaveType].unused - leave.days
          );
        } else if (leave.status === "Pending") {
          leaveTypeStats[leave.leaveType].pending += leave.days;
        }
      } else {
        if (!leaveTypeStats[leave.leaveType]) {
          leaveTypeStats[leave.leaveType] = { total: 0, used: 0, pending: 0, unused: 0 };
        }
        if (leave.status === "Approved") leaveTypeStats[leave.leaveType].used += leave.days;
        else if (leave.status === "Pending") leaveTypeStats[leave.leaveType].pending += leave.days;
      }
    });

    let totalUsed = 0;
    Object.values(leaveTypeStats).forEach((s) => (totalUsed += s.used));
    const totalUnused = Math.max(0, totalAllocated - totalUsed);

    return { totalAllocated, totalUsed, totalUnused, leaveTypeStats };
  }, [leaves, leaveTemplate]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="animate-card-enter opacity-0" style={{ animationDelay: "0ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Leave Available
            </CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-foreground">
              {totalAllocated.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Days per year</p>
          </CardContent>
        </Card>
        <Card className="animate-card-enter opacity-0" style={{ animationDelay: "80ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Used Leaves
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {totalUsed.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Approved this year</p>
          </CardContent>
        </Card>
        <Card className="animate-card-enter opacity-0" style={{ animationDelay: "160ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Unused Leaves
            </CardTitle>
            <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-blue-600">
              {totalUnused.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Remaining this year</p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(leaveTypeStats).length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-base sm:text-lg">Leave Type Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {Object.entries(leaveTypeStats).map(([leaveType, stats]) => (
                <Card key={leaveType} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2 p-3">
                    <CardTitle className="text-sm font-semibold">{leaveType}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-medium">
                        {stats.total > 0 ? `${stats.total} days` : "Unlimited"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Used</span>
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
                        {stats.used.toFixed(1)} days
                      </Badge>
                    </div>
                    {stats.pending > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Pending</span>
                        <Badge
                          variant="secondary"
                          className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-xs"
                        >
                          <Clock className="w-3 h-3 mr-1 inline" />
                          {stats.pending.toFixed(1)} days
                        </Badge>
                      </div>
                    )}
                    {stats.total > 0 && (
                      <div className="flex justify-between pt-2 border-t">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="font-semibold text-blue-600">
                          {Math.max(0, stats.total - stats.used).toFixed(1)} days
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeLeaveDashboard;
