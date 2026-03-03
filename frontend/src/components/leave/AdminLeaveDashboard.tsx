import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Calendar } from "lucide-react";
import { useGetLeavesQuery, type Leave } from "@/store/api/leaveApi";

const CARD_HEIGHT = "h-[260px]";
const CARD_CLASS =
  `rounded-[10px] shadow-[0_1px_3px_rgba(0,0,0,0.08)] border-0 bg-card p-5 transition-shadow hover:shadow-[0_4px_14px_rgba(0,0,0,0.1)] ${CARD_HEIGHT} flex flex-col overflow-hidden`;

/* Segment colors as inline fill (avoids Tailwind purge/build issues) */
const SEGMENT_COLORS = {
  approved: "#efaa1f",
  pending: "#f59e0b",
  rejected: "#f43f5e",
} as const;

interface AdminLeaveDashboardProps {
  statusFilter?: string;
  onStatusFilterChange?: (value: string | undefined) => void;
}

const BAR_HEIGHT_PX = 14;

function SegmentWithTooltip({
  label,
  value,
  widthPct,
  backgroundColor,
}: {
  label: string;
  value: number;
  widthPct: number;
  backgroundColor: string;
}) {
  const showFill = widthPct > 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          aria-label={`${label}: ${value}`}
          style={{
            display: "block",
            flex: `0 0 ${widthPct}%`,
            height: BAR_HEIGHT_PX,
            minWidth: showFill ? 2 : 0,
            backgroundColor: showFill ? backgroundColor : "transparent",
            transition: "flex-basis 0.5s ease-out",
          }}
        />
      </TooltipTrigger>
      <TooltipContent side="top" className="font-medium tabular-nums">
        {label}: {value}
      </TooltipContent>
    </Tooltip>
  );
}

function SummaryCard({
  title,
  total,
  approved,
  pending,
  rejected,
}: {
  title: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
}) {
  const approvedPct = total > 0 ? (approved / total) * 100 : 0;
  const pendingPct = total > 0 ? (pending / total) * 100 : 0;
  const rejectedPct = total > 0 ? (rejected / total) * 100 : 0;

  const breakdown = [
    { label: "Approved", value: approved, color: SEGMENT_COLORS.approved },
    { label: "Pending", value: pending, color: SEGMENT_COLORS.pending },
    { label: "Rejected", value: rejected, color: SEGMENT_COLORS.rejected },
  ];

  const barSegments = [
    { label: "Approved", value: approved, pct: approvedPct, color: SEGMENT_COLORS.approved },
    { label: "Pending", value: pending, pct: pendingPct, color: SEGMENT_COLORS.pending },
    { label: "Rejected", value: rejected, pct: rejectedPct, color: SEGMENT_COLORS.rejected },
  ].filter((s) => s.pct > 0);
  const segmentsToShow = barSegments.length > 0 ? barSegments : [{ label: "No data", value: 0, pct: 100, color: "#e5e7eb" }];

  return (
    <Card className={CARD_CLASS}>
      <CardHeader className="p-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-0 flex flex-col flex-1 min-h-0">
        <div className="space-y-4 flex-1 min-h-0">
          <p className="text-2xl sm:text-3xl font-bold tabular-nums text-foreground tracking-tight">
            {total.toLocaleString()}
          </p>
          {/* Breakdown: one row per status with label + number */}
          <div className="space-y-2">
            {breakdown.map(({ label, value, color }) => (
              <div
                key={label}
                className="flex items-center justify-between text-sm gap-3"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="h-2 w-2 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                    aria-hidden
                  />
                  <span className="text-muted-foreground truncate">{label}</span>
                </span>
                <span className="font-semibold tabular-nums text-foreground shrink-0">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>
        {/* Progress bar at bottom */}
        <TooltipProvider delayDuration={200}>
          <div
            className="w-full rounded-full overflow-hidden flex flex-row mt-auto pt-3"
            style={{
              height: BAR_HEIGHT_PX,
              backgroundColor: "#e5e7eb",
            }}
            role="progressbar"
            aria-valuenow={total}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-label="Leave status: Approved, Pending, Rejected"
          >
            {segmentsToShow.map((s) => (
              <SegmentWithTooltip
                key={s.label}
                label={s.label}
                value={s.value}
                widthPct={s.pct}
                backgroundColor={s.color}
              />
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}

const AdminLeaveDashboard = (_props: AdminLeaveDashboardProps) => {
  const { data: leavesData, isLoading } = useGetLeavesQuery({
    page: 1,
    limit: 5000,
  });

  const leaves = leavesData?.data?.leaves ?? [];

  const overall = useMemo(() => {
    const total = leaves.length;
    const approved = leaves.filter((l: Leave) => l.status === "Approved").length;
    const rejected = leaves.filter((l: Leave) => l.status === "Rejected").length;
    const pending = leaves.filter((l: Leave) => l.status === "Pending").length;
    return { total, approved, rejected, pending };
  }, [leaves]);

  const casualSummary = useMemo(() => {
    const casual = leaves.filter((l: Leave) => l.leaveType === "Casual Leave");
    return {
      total: casual.length,
      approved: casual.filter((l: Leave) => l.status === "Approved").length,
      pending: casual.filter((l: Leave) => l.status === "Pending").length,
      rejected: casual.filter((l: Leave) => l.status === "Rejected").length,
    };
  }, [leaves]);

  const halfDaySummary = useMemo(() => {
    const halfDay = leaves.filter((l: Leave) => l.leaveType === "Half Day");
    return {
      total: halfDay.length,
      approved: halfDay.filter((l: Leave) => l.status === "Approved").length,
      pending: halfDay.filter((l: Leave) => l.status === "Pending").length,
      rejected: halfDay.filter((l: Leave) => l.status === "Rejected").length,
    };
  }, [leaves]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 mb-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className={CARD_CLASS}>
            <CardHeader className="p-0 pb-3">
              <div className="h-5 w-32 rounded bg-muted animate-pulse" />
            </CardHeader>
            <CardContent className="p-0 pb-3 space-y-4">
              <div className="h-8 w-16 rounded bg-muted animate-pulse" />
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-10 rounded bg-muted/60 animate-pulse" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 mb-6 items-start">
      <SummaryCard
        title="Total Leave Requests"
        total={overall.total}
        approved={overall.approved}
        pending={overall.pending}
        rejected={overall.rejected}
      />
      <SummaryCard
        title="Casual Leave"
        total={casualSummary.total}
        approved={casualSummary.approved}
        pending={casualSummary.pending}
        rejected={casualSummary.rejected}
      />
      <SummaryCard
        title="Half Day"
        total={halfDaySummary.total}
        approved={halfDaySummary.approved}
        pending={halfDaySummary.pending}
        rejected={halfDaySummary.rejected}
      />
    </div>
  );
};

export default AdminLeaveDashboard;
