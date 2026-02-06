import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Building2, 
  Users, 
  UserCheck, 
  TrendingUp, 
  DollarSign, 
  AlertCircle,
  Calendar,
  CreditCard,
  BarChart3,
  Activity
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetDashboardStatsQuery } from "@/store/api/superAdminApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const SuperAdminDashboard = () => {
  const { data, isLoading, error } = useGetDashboardStatsQuery();

  if (isLoading) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="mx-auto space-y-8">
            <Skeleton className="h-10 w-64" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          </div>
        </main>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="mx-auto">
            <Card className="border-destructive">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="w-5 h-5" />
                  <p>Error loading dashboard data. Please try again.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </MainLayout>
    );
  }

  const stats = data?.data;

  const companyStats = [
    {
      icon: Building2,
      label: "Total Companies",
      value: stats?.companies?.total || 0,
      change: `+${stats?.companies?.newToday || 0} today`,
      variant: "default" as const,
    },
    {
      icon: Activity,
      label: "Active Companies",
      value: stats?.companies?.active || 0,
      change: `${stats?.companies?.inactive || 0} inactive`,
      variant: "default" as const,
    },
    {
      icon: AlertCircle,
      label: "Suspended",
      value: stats?.companies?.suspended || 0,
      change: `${stats?.companies?.newThisMonth || 0} new this month`,
      variant: "destructive" as const,
    },
    {
      icon: TrendingUp,
      label: "Monthly Growth",
      value: `${stats?.companies?.monthlyGrowth || 0}%`,
      change: `${stats?.companies?.newThisMonth || 0} new companies`,
      variant: "default" as const,
    },
  ];

  const userStats = [
    {
      icon: Users,
      label: "Total Users",
      value: stats?.users?.total || 0,
      change: `${stats?.users?.active || 0} active`,
      variant: "default" as const,
    },
    {
      icon: UserCheck,
      label: "Managers",
      value: stats?.users?.managers || 0,
      change: "Across all companies",
      variant: "default" as const,
    },
  ];

  const subscriptionStats = [
    {
      icon: CreditCard,
      label: "Expired Subscriptions",
      value: stats?.subscriptions?.expired || 0,
      change: "Requires attention",
      variant: "destructive" as const,
    },
    {
      icon: Calendar,
      label: "Upcoming Renewals",
      value: stats?.subscriptions?.upcomingRenewals || 0,
      change: "Next 30 days",
      variant: "default" as const,
    },
  ];

  const revenueStats = [
    {
      icon: DollarSign,
      label: "Monthly Revenue",
      value: `$${(stats?.revenue?.totalMonthly || 0).toLocaleString()}`,
      change: `$${((stats?.revenue?.estimatedAnnual || 0) / 12).toLocaleString()} avg/month`,
      variant: "default" as const,
    },
    {
      icon: BarChart3,
      label: "Annual Revenue",
      value: `$${(stats?.revenue?.estimatedAnnual || 0).toLocaleString()}`,
      change: "Estimated",
      variant: "default" as const,
    },
  ];

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mx-auto space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Platform Dashboard
            </h1>
            <p className="text-muted-foreground">
              Overview of all companies and platform metrics
            </p>
          </div>

          {/* Company Metrics */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Companies</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {companyStats.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </CardTitle>
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.change}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* User Metrics */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Users</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userStats.map((stat, index) => (
                <Card key={index}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </CardTitle>
                    <stat.icon className="w-4 h-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {stat.value}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.change}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Subscription & Revenue */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subscription Status */}
            <Card>
              <CardHeader>
                <CardTitle>Subscription Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {subscriptionStats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <stat.icon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium">{stat.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </div>
                  </div>
                ))}
                
                {/* Subscription by Status */}
                {stats?.subscriptions?.byStatus && stats.subscriptions.byStatus.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold mb-3">By Status</h3>
                    <div className="space-y-2">
                      {stats.subscriptions.byStatus.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <Badge variant="outline">{item._id || 'N/A'}</Badge>
                          <span className="text-sm font-medium">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Subscription by Plan */}
                {stats?.subscriptions?.byPlan && stats.subscriptions.byPlan.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold mb-3">By Plan</h3>
                    <div className="space-y-2">
                      {stats.subscriptions.byPlan.map((item: any, index: number) => (
                        <div key={index} className="flex items-center justify-between">
                          <Badge variant="secondary">{item._id || 'free'}</Badge>
                          <div className="text-right">
                            <span className="text-sm font-medium">{item.active} active</span>
                            <span className="text-xs text-muted-foreground ml-2">
                              ({item.count} total)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Revenue Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Analytics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {revenueStats.map((stat, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <stat.icon className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium">{stat.label}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </div>
                  </div>
                ))}

                {/* Revenue by Plan */}
                {stats?.revenue?.byPlan && stats.revenue.byPlan.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-semibold mb-3">Revenue by Plan</h3>
                    <div className="space-y-2">
                      {stats.revenue.byPlan
                        .filter((plan: any) => plan.monthlyRevenue > 0)
                        .map((plan: any, index: number) => (
                          <div key={index} className="flex items-center justify-between">
                            <Badge variant="outline">{plan.plan}</Badge>
                            <div className="text-right">
                              <span className="text-sm font-medium">
                                ${plan.monthlyRevenue.toLocaleString()}/mo
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">
                                ({plan.activeCompanies} companies)
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default SuperAdminDashboard;

