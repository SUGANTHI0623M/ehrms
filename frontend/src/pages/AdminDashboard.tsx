import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "antd";
import MainLayout from "@/components/MainLayout";
import { useGetAdminDashboardQuery } from "@/store/api/adminDashboardApi";
import { useGetCandidatesQuery } from "@/store/api/candidateApi";
import { useGetDepartmentsQuery } from "@/store/api/jobOpeningApi";
import {
  Users,
  UserCheck,
  Briefcase,
  TrendingUp,
  Wallet as DollarSign,
  FileText,
  BookOpen,
  Package,
  Calendar,
  Clock,
  Target,
  Award,
  BarChart3,
  PieChart,
  Activity,
  Filter,
  ClipboardList,
  Wallet,
  Receipt
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, LineChart, Line, PolarAngleAxis, PolarGrid, PolarRadiusAxis, AreaChart, Area, LabelList, RadialBarChart, RadialBar } from "recharts";

const AdminDashboard = () => {
  const [department, setDepartment] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  // Fetch departments for dropdown
  const { data: departmentsData } = useGetDepartmentsQuery();

  // Candidate status options
  const candidateStatuses = [
    { value: "all", label: "All Statuses" },
    { value: "Applied", label: "Applied" },
    { value: "Screening", label: "Screening" },
    { value: "Shortlisted", label: "Shortlisted" },
    { value: "Interview", label: "Interview" },
    { value: "Offer", label: "Offer" },
    { value: "Hired", label: "Hired" },
    { value: "Rejected", label: "Rejected" },
  ];

  // Normalize query params to ensure consistent cache keys
  const queryParams = {
    department: department !== "all" ? department : undefined,
    status: status !== "all" ? status : undefined,
  };

  // Remove undefined values to ensure consistent serialization
  const normalizedParams = Object.fromEntries(
    Object.entries(queryParams).filter(([_, value]) => value !== undefined)
  ) as typeof queryParams;

  const { data, isLoading, error, refetch } = useGetAdminDashboardQuery(
    Object.keys(normalizedParams).length > 0 ? normalizedParams : undefined,
    {
      // Refetch when component mounts to ensure fresh data
      refetchOnMountOrArgChange: true,
    }
  );

  // Fetch candidates for displayStatus chart
  const { data: candidatesData } = useGetCandidatesQuery(
    { page: 1, limit: 5000 }, // Fetch all candidates for chart
    {
      refetchOnMountOrArgChange: true,
    }
  );

  const dashboardData = data?.data;

  // Debug: Log data to console (remove in production)
  if (dashboardData?.recruitment) {
    console.log('Recruitment Data:', {
      candidatesByStatus: dashboardData.recruitment.candidatesByStatus,
      upcomingInterviews: dashboardData.recruitment.upcomingInterviews,
      candidateStatusDataLength: Object.entries(dashboardData.recruitment.candidatesByStatus || {}).length
    });
  }

  // Chart data preparation
  const candidateStatusData = dashboardData?.recruitment?.candidatesByStatus
    ? Object.entries(dashboardData.recruitment.candidatesByStatus)
        .map(([name, value]) => ({
          name,
          value: Number(value) || 0,
        }))
        .filter((item) => item.value > 0) // Only show statuses with candidates
    : [];

  // Prepare displayStatus chart data from candidates array
  const displayStatusData = useMemo(() => {
    if (!candidatesData?.data?.candidates || !Array.isArray(candidatesData.data.candidates)) {
      return [];
    }

    const candidates = candidatesData.data.candidates;
    const statusCounts: Record<string, number> = {};

    candidates.forEach((candidate: any) => {
      const displayStatus = candidate.displayStatus || candidate.status || 'Unknown';
      statusCounts[displayStatus] = (statusCounts[displayStatus] || 0) + 1;
    });

    return Object.entries(statusCounts)
      .map(([name, value]) => ({
        name,
        value: Number(value) || 0,
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value); // Sort by count descending
  }, [candidatesData]);

  // Debug: Log displayStatus data
  if (candidatesData?.data?.candidates) {
    console.log('Candidates Data:', {
      totalCandidates: candidatesData.data.candidates.length,
      displayStatusData: displayStatusData,
      sampleCandidates: candidatesData.data.candidates.slice(0, 3).map((c: any) => ({
        name: `${c.firstName} ${c.lastName}`,
        displayStatus: c.displayStatus || c.status
      }))
    });
  }

  const departmentData = dashboardData?.staff?.employeesByDepartment || [];
  const roleData = dashboardData?.staff?.employeesByRole || [];
  const goalStatusData = dashboardData?.performance?.goalsByStatus
    ? Object.entries(dashboardData.performance.goalsByStatus).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const assetStatusData = dashboardData?.assets?.assetsByStatus
    ? Object.entries(dashboardData.assets.assetsByStatus)
        .map(([name, value]) => ({
          name,
          value: Number(value) || 0,
        }))
        .filter((item) => item.value > 0) // Only show statuses with assets
    : [];

  // Calculate max value for radial bar scale
  const maxAssetValue = assetStatusData.length > 0 
    ? Math.max(...assetStatusData.map(item => item.value)) 
    : 100;

  // Transform data for multiple radial bars - create a single object with all statuses as fields
  const radialBarData = assetStatusData.length > 0 
    ? [assetStatusData.reduce((acc, item) => {
        acc[item.name] = item.value;
        return acc;
      }, {} as Record<string, number>)]
    : [];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  const chartConfig = {
    candidates: {
      Applied: { label: "Applied", color: "hsl(var(--chart-1))" },
      Screening: { label: "Screening", color: "hsl(var(--chart-2))" },
      Shortlisted: { label: "Shortlisted", color: "hsl(var(--chart-3))" },
      Interview: { label: "Interview", color: "hsl(var(--chart-4))" },
      Offer: { label: "Offer", color: "hsl(var(--chart-5))" },
      Hired: { label: "Hired", color: "hsl(var(--chart-1))" },
      Rejected: { label: "Rejected", color: "hsl(var(--destructive))" },
    },
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading dashboard analytics...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="text-center py-12">
            <p className="text-destructive">Error loading dashboard data</p>
            <Button onClick={() => refetch()} className="mt-4">Retry</Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Comprehensive analytics across all HRMS modules</p>
          </div>
        </div>

        {/* ============================================
            A. RECRUITMENT / INTERVIEW MODULE
            ============================================ */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Briefcase className="w-6 h-6" />
              Recruitment & Interview Analytics
            </h2>
            <Select
              value={status}
              onChange={setStatus}
              style={{ width: 200 }}
              placeholder="Filter by Status"
            >
              {candidateStatuses.map((statusOption) => (
                <Select.Option key={statusOption.value} value={statusOption.value}>
                  {statusOption.label}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Job Openings</CardTitle>
                <Briefcase className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.recruitment?.totalJobOpenings || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.recruitment?.totalCandidates || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Hiring Conversion Rate</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData?.recruitment?.hiringConversionRate 
                    ? dashboardData.recruitment.hiringConversionRate.toFixed(1) 
                    : 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Time to Hire</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.recruitment?.avgTimeToHire || 0} days</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Candidates by Display Status</CardTitle>
              </CardHeader>
              <CardContent>
                {displayStatusData.length > 0 ? (
                  <div className="relative h-[300px]">
                    <ChartContainer config={chartConfig.candidates} className="h-full w-full">
                      <RechartsPieChart>
                        <Pie
                          data={displayStatusData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={90}
                          innerRadius={50}
                          fill="#8884d8"
                          dataKey="value"
                          paddingAngle={2}
                        >
                          {displayStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip 
                          content={<ChartTooltipContent />}
                        />
                        <Legend 
                          verticalAlign="bottom" 
                          height={36}
                          formatter={(value: string, entry: any) => `${value} (${entry.payload.value})`}
                        />
                      </RechartsPieChart>
                    </ChartContainer>
                    {/* Center label showing total */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-foreground">
                          {displayStatusData.reduce((sum, item) => sum + item.value, 0)}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">Total</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                    <p>No candidate data available</p>
                    {candidatesData?.data?.candidates && (
                      <p className="text-xs mt-2">
                        Total candidates: {candidatesData.data.candidates.length || 0}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Interviews</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {dashboardData?.recruitment?.upcomingInterviews && 
                   Array.isArray(dashboardData.recruitment.upcomingInterviews) && 
                   dashboardData.recruitment.upcomingInterviews.length > 0 ? (
                    dashboardData.recruitment.upcomingInterviews.slice(0, 5).map((interview, idx) => (
                      <div key={`interview-${idx}-${interview.name || idx}`} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex-1">
                          <p className="font-medium">{interview.name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{interview.position || 'N/A'}</p>
                        </div>
                        <Badge variant="outline" className="ml-2">{interview.status || 'N/A'}</Badge>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">No upcoming interviews</p>
                      <p className="text-xs text-muted-foreground mt-1">Candidates with "Interview" status will appear here</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ============================================
            B. STAFF MODULE
            ============================================ */}
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Users className="w-6 h-6" />
              Staff Analytics
            </h2>
            <Select
              value={department}
              onChange={setDepartment}
              style={{ width: 200 }}
              placeholder="Filter by Department"
            >
              <Select.Option value="all">All Departments</Select.Option>
              {departmentsData?.data?.departments?.map((dept) => (
                <Select.Option key={dept._id} value={dept.name}>
                  {dept.name}
                </Select.Option>
              ))}
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.staff?.totalEmployees || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active: {dashboardData?.staff?.activeEmployees || 0} | Inactive: {dashboardData?.staff?.inactiveEmployees || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Recent Onboardings</CardTitle>
                <UserCheck className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.staff?.recentOnboardings || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Attrition Count</CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.staff?.attritionCount || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">Deactivated employees</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Salary (Gross)</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{dashboardData?.staff?.salaryOverview?.averageGross?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total: ₹{(dashboardData?.staff?.salaryOverview?.totalGross || 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Employees by Department</CardTitle>
              </CardHeader>
              <CardContent>
                {departmentData.length > 0 ? (
                  <ChartContainer config={{}} className="h-[300px]">
                    <BarChart data={departmentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="department" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="count" fill="#8884d8" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="count" position="top" fill="#666" fontSize={12} />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No department data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Employees by Role</CardTitle>
              </CardHeader>
              <CardContent>
                {roleData.length > 0 ? (
                  <ChartContainer config={{}} className="h-[300px]">
                    <AreaChart data={roleData}>
                      <defs>
                        <linearGradient id="colorRole" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#82ca9d" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="role" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#82ca9d" 
                        fillOpacity={1} 
                        fill="url(#colorRole)" 
                      />
                    </AreaChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No role data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ============================================
            C. PERFORMANCE MODULE
            ============================================ */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Target className="w-6 h-6" />
            Performance Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Goals</CardTitle>
                <Target className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.performance?.totalGoals || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Avg Progress</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData?.performance?.goalProgress?.avgProgress 
                    ? dashboardData.performance.goalProgress.avgProgress.toFixed(1) 
                    : 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">KRA/KPI Completion</CardTitle>
                <Award className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData?.performance?.kraKpiCompletion 
                    ? dashboardData.performance.kraKpiCompletion.toFixed(1) 
                    : 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData?.performance?.complianceStatus?.complianceRate 
                    ? parseFloat(dashboardData.performance.complianceStatus.complianceRate).toFixed(1) 
                    : 0}%
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Goals by Status</CardTitle>
              </CardHeader>
              <CardContent>
                {goalStatusData.length > 0 ? (
                  <ChartContainer config={{}} className="h-[300px]">
                    <BarChart data={goalStatusData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="value" fill="#8884d8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No goal data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Review Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Self Reviews Submitted</span>
                    <Badge>{dashboardData?.performance?.selfReviewsSubmitted || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Manager Reviews Pending</span>
                    <Badge variant="destructive">{dashboardData?.performance?.managerReviewsPending || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">HR Reviews Pending</span>
                    <Badge variant="destructive">{dashboardData?.performance?.hrReviewsPending || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ============================================
            D. EMPLOYEE REQUESTS - PENDING ACTIONS
            ============================================ */}
        {dashboardData?.pendingRequests && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <ClipboardList className="w-6 h-6" />
              Pending Employee Requests
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/staff/leaves-pending-approval'}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">{dashboardData.pendingRequests.leaves || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Requires approval</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/staff/loans'}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Loans</CardTitle>
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{dashboardData.pendingRequests.loans || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Requires approval</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/staff/expense-claims'}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Pending Expenses</CardTitle>
                  <FileText className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">{dashboardData.pendingRequests.expenses || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Requires approval</p>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.location.href = '/staff/payslip-requests'}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Payslip Requests</CardTitle>
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{dashboardData.pendingRequests.payslipRequests || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Requires approval</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ============================================
            E. PAYROLL MODULE
            ============================================ */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <DollarSign className="w-6 h-6" />
            Payroll Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Payroll Cycles Completed</CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.payroll?.payrollCyclesCompleted || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Payroll Pending</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.payroll?.payrollPending || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Payroll Processed</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{(dashboardData?.payroll?.totalPayrollProcessed || 0).toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Reimbursements Pending</CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.payroll?.reimbursements?.pending || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Approved: {dashboardData?.payroll?.reimbursements?.approved || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Present</span>
                    <Badge variant="default">{dashboardData?.payroll?.attendanceSummary?.present || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Absent</span>
                    <Badge variant="destructive">{dashboardData?.payroll?.attendanceSummary?.absent || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Late</span>
                    <Badge variant="outline">{dashboardData?.payroll?.attendanceSummary?.late || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reimbursements Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Submitted</span>
                    <Badge>{dashboardData?.payroll?.reimbursements?.submitted || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Approved</span>
                    <Badge variant="default">{dashboardData?.payroll?.reimbursements?.approved || 0}</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <span className="font-medium">Pending</span>
                    <Badge variant="destructive">{dashboardData?.payroll?.reimbursements?.pending || 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ============================================
            E. LMS MODULE
            ============================================ */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <BookOpen className="w-6 h-6" />
            Learning Management System (LMS) Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
                <BookOpen className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.lms?.totalCourses || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Active Learners</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.lms?.activeLearners || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Course Completion Rate</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData?.lms?.courseCompletionRate 
                    ? dashboardData.lms.courseCompletionRate.toFixed(1) 
                    : 0}%
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Average Quiz Score</CardTitle>
                <Award className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {dashboardData?.lms?.quizStats?.averageScore 
                    ? dashboardData.lms.quizStats.averageScore.toFixed(1) 
                    : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {dashboardData?.lms?.quizStats?.totalAttempts || 0} attempts
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* ============================================
            F. ASSET MANAGEMENT MODULE
            ============================================ */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Package className="w-6 h-6" />
            Asset Management Analytics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Asset Types</CardTitle>
                <Package className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.assets?.totalAssetTypes || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
                <Package className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.assets?.totalAssets || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Allocated: {dashboardData?.assets?.allocatedAssets || 0} | Unallocated: {dashboardData?.assets?.unallocatedAssets || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Working Assets</CardTitle>
                <Activity className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.assets?.assetsByStatus?.Working || 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Under Maintenance</CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardData?.assets?.assetsByStatus?.['Under Maintenance'] || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Assets by Status</CardTitle>
            </CardHeader>
            <CardContent>
              {assetStatusData.length > 0 && radialBarData.length > 0 ? (
                <div>
                  <ChartContainer config={{}} className="h-[300px]">
                    <RadialBarChart
                      cx="50%"
                      cy="50%"
                      innerRadius="30%"
                      outerRadius="90%"
                      barSize={Math.max(10, Math.min(30, 300 / assetStatusData.length))}
                      data={radialBarData}
                      startAngle={90}
                      endAngle={-270}
                    >
                      <PolarGrid />
                      <PolarAngleAxis
                        type="number"
                        domain={[0, maxAssetValue]}
                        angle={90}
                        tick={false}
                      />
                      <ChartTooltip 
                        content={<ChartTooltipContent />}
                      />
                      {assetStatusData.map((entry, index) => (
                        <RadialBar
                          key={`radial-${index}`}
                          dataKey={entry.name}
                          cornerRadius={4}
                          fill={COLORS[index % COLORS.length]}
                          label={{ position: 'insideStart', fill: '#fff', fontSize: 11 }}
                        />
                      ))}
                    </RadialBarChart>
                  </ChartContainer>
                  {/* Color Legend Below Chart */}
                  <div className="mt-4 flex flex-wrap gap-4 justify-center">
                    {assetStatusData.map((entry, index) => (
                      <div key={`legend-${index}`} className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-muted-foreground">{entry.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No asset data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;

