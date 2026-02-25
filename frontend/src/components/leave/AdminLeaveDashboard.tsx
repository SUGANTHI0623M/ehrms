import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useGetLeavesQuery, type Leave } from "@/store/api/leaveApi";
import { useGetLeaveTemplatesQuery } from "@/store/api/settingsApi";

interface AdminLeaveDashboardProps {
  statusFilter?: string;
  onStatusFilterChange?: (value: string | undefined) => void;
}

const AdminLeaveDashboard = ({ statusFilter, onStatusFilterChange }: AdminLeaveDashboardProps) => {
  const { data: leavesData, isLoading } = useGetLeavesQuery({
    page: 1,
    limit: 5000,
  });
  const { data: templatesData } = useGetLeaveTemplatesQuery();

  const leaves = leavesData?.data?.leaves ?? [];
  const templates = templatesData?.data?.templates ?? [];

  const overall = useMemo(() => {
    const total = leaves.length;
    const approved = leaves.filter((l: Leave) => l.status === "Approved").length;
    const rejected = leaves.filter((l: Leave) => l.status === "Rejected").length;
    const pending = leaves.filter((l: Leave) => l.status === "Pending").length;
    const approvedDays = leaves
      .filter((l: Leave) => l.status === "Approved")
      .reduce((s: number, l: Leave) => s + (l.days ?? 0), 0);
    const pendingDays = leaves
      .filter((l: Leave) => l.status === "Pending")
      .reduce((s: number, l: Leave) => s + (l.days ?? 0), 0);
    const rejectedDays = leaves
      .filter((l: Leave) => l.status === "Rejected")
      .reduce((s: number, l: Leave) => s + (l.days ?? 0), 0);
    return {
      total,
      approved,
      rejected,
      pending,
      approvedDays: approvedDays.toFixed(1),
      pendingDays: pendingDays.toFixed(1),
      rejectedDays: rejectedDays.toFixed(1),
    };
  }, [leaves]);

  const leaveTypeSummary = useMemo(() => {
    const summary: Record<
      string,
      { totalAllocated: number; totalUsed: number; totalPending: number; totalRequests: number }
    > = {};

    templates.forEach((t: { leaveTypes?: { type: string; days: number }[]; assignedStaffCount?: number }) => {
      t.leaveTypes?.forEach((lt: { type: string; days: number }) => {
        if (!summary[lt.type]) {
          summary[lt.type] = {
            totalAllocated: 0,
            totalUsed: 0,
            totalPending: 0,
            totalRequests: 0,
          };
        }
        const count = t.assignedStaffCount ?? 0;
        summary[lt.type].totalAllocated += lt.days * 12 * count;
      });
    });

    leaves.forEach((l: Leave) => {
      if (!summary[l.leaveType]) {
        summary[l.leaveType] = {
          totalAllocated: 0,
          totalUsed: 0,
          totalPending: 0,
          totalRequests: 0,
        };
      }
      summary[l.leaveType].totalRequests += 1;
      if (l.status === "Approved") summary[l.leaveType].totalUsed += l.days ?? 0;
      else if (l.status === "Pending") summary[l.leaveType].totalPending += l.days ?? 0;
    });

    return summary;
  }, [leaves, templates]);

  if (isLoading) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        Loading leave dashboard...
      </div>
    );
  }

  const cardClass = (filterValue: string | undefined) =>
    onStatusFilterChange
      ? "cursor-pointer transition-opacity hover:opacity-90 " + (statusFilter === filterValue ? "ring-2 ring-primary ring-offset-2" : "")
      : "";
  const handleCardClick = (filterValue: string | undefined) => {
    onStatusFilterChange?.(filterValue);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card
          className={cardClass(undefined)}
          onClick={() => handleCardClick(undefined)}
          role={onStatusFilterChange ? "button" : undefined}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Total Leave Requests
            </CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-foreground">{overall.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card
          className={cardClass("Approved")}
          onClick={() => handleCardClick("Approved")}
          role={onStatusFilterChange ? "button" : undefined}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Approved
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600">{overall.approved}</div>
            <p className="text-xs text-muted-foreground mt-1">{overall.approvedDays} days</p>
          </CardContent>
        </Card>
        <Card
          className={cardClass("Pending")}
          onClick={() => handleCardClick("Pending")}
          role={onStatusFilterChange ? "button" : undefined}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{overall.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">{overall.pendingDays} days</p>
          </CardContent>
        </Card>
        <Card
          className={cardClass("Rejected")}
          onClick={() => handleCardClick("Rejected")}
          role={onStatusFilterChange ? "button" : undefined}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-4">
            <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
              Rejected
            </CardTitle>
            <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-red-600">{overall.rejected}</div>
            <p className="text-xs text-muted-foreground mt-1">{overall.rejectedDays} days</p>
          </CardContent>
        </Card>
      </div>

      {Object.keys(leaveTypeSummary).length > 0 && (
        <Card>
          <CardHeader className="p-3 sm:p-4">
            <CardTitle className="text-base sm:text-lg">Leave Type Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {Object.entries(leaveTypeSummary).map(([type, s]) => (
                <Card key={type} className="border-l-4 border-l-primary">
                  <CardHeader className="pb-2 p-3">
                    <CardTitle className="text-sm font-semibold">{type}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allocated</span>
                      <span className="font-medium">
                        {s.totalAllocated > 0 ? `${s.totalAllocated.toFixed(0)} days` : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Used</span>
                      <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">
                        {s.totalUsed.toFixed(1)} days
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pending</span>
                      <Badge
                        variant="secondary"
                        className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200 text-xs"
                      >
                        {s.totalPending.toFixed(1)} days
                      </Badge>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-muted-foreground">Requests</span>
                      <span className="font-semibold">{s.totalRequests}</span>
                    </div>
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

export default AdminLeaveDashboard;
