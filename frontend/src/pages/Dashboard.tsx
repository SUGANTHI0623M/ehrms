import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, TrendingUp, DollarSign, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import MainLayout from "@/components/MainLayout";
import { useGetDashboardStatsQuery } from "@/store/api/dashboardApi";
import { formatDistanceToNow } from "date-fns";

const Dashboard = () => {
  const { data, isLoading, error } = useGetDashboardStatsQuery();

  const stats = data?.data?.stats ? [
    { icon: Users, label: "Total Employees", value: data.data.stats.totalEmployees.toString(), change: "+12%", variant: "primary" },
    { icon: UserCheck, label: "Hired This Month", value: data.data.stats.hiredThisMonth.toString(), change: "+8%", variant: "success" },
    { icon: TrendingUp, label: "Avg Performance", value: `${data.data.stats.avgPerformance}/10`, change: "+0.3", variant: "info" },
    { icon: DollarSign, label: "Payroll Processed", value: `₹${(data.data.stats.totalPayroll / 100000).toFixed(1)}L`, change: "On time", variant: "accent" },
  ] : [
    { icon: Users, label: "Total Employees", value: "0", change: "+0%", variant: "primary" },
    { icon: UserCheck, label: "Hired This Month", value: "0", change: "+0%", variant: "success" },
    { icon: TrendingUp, label: "Avg Performance", value: "0/10", change: "+0", variant: "info" },
    { icon: DollarSign, label: "Payroll Processed", value: "₹0", change: "On time", variant: "accent" },
  ];

  const recentActivity = data?.data?.recentActivity?.map(activity => ({
    type: activity.type,
    candidate: activity.candidate,
    position: activity.position,
    time: formatDistanceToNow(new Date(activity.time), { addSuffix: true })
  })) || [];

  return (
    <MainLayout>


      <div className="">

        <main className="p-3 sm:p-4 md:p-6">
          <div className="mx-auto space-y-4 sm:space-y-6 md:space-y-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Dashboard</h1>
            </div>

            {isLoading ? (
              <div className="text-center py-8">Loading dashboard data...</div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">Error loading dashboard data</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                {stats.map((stat, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 p-3 sm:p-6">
                      <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                        {stat.label}
                      </CardTitle>
                      <stat.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6 pt-0">
                      <div className="text-xl sm:text-2xl font-bold text-foreground">{stat.value}</div>
                      <p className="text-xs text-success mt-1">{stat.change}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{activity.candidate}</p>
                          <p className="text-xs text-muted-foreground">{activity.position}</p>
                        </div>
                        <div className="text-right">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                            {activity.type}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="w-4 h-4 mr-2" />
                    Add New Candidate
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Interview
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Process Payroll
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>

    </MainLayout>
  );
};

export default Dashboard;
