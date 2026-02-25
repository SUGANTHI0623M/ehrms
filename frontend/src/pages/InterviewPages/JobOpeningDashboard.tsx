import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Briefcase,
  Users,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Plus,
  Eye,
  BarChart3,
} from "lucide-react";
import {
  useGetJobOpeningDashboardQuery,
} from "@/store/api/jobOpeningApi";
import { Skeleton } from "@/components/ui/skeleton";

const JobOpeningDashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetJobOpeningDashboardQuery();

  if (error) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="text-center py-12 text-destructive">
            Error loading dashboard data
          </div>
        </div>
      </MainLayout>
    );
  }

  const dashboardData = data?.data;
  const stats = {
    totalOpenings: dashboardData?.totalOpenings || 0,
    activeOpenings: dashboardData?.activeOpenings || 0,
    closedOpenings: dashboardData?.closedOpenings || 0,
  };

  const openingsByRole = dashboardData?.openingsByRole || [];
  const jobOpenings = dashboardData?.jobOpenings || [];

  return (
    <MainLayout>
      <main className="p-4">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-8 h-8" />
                Job Opening Dashboard
              </h1>
              <p className="text-muted-foreground mt-1">
                Overview of all job openings and candidate statistics
              </p>
            </div>
            <Button onClick={() => navigate("/job-openings/create")}>
              <Plus className="w-4 h-4 mr-2" />
              Add Job Opening
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Job Openings
                </CardTitle>
                <Briefcase className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold">{stats.totalOpenings}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Openings
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-green-600">
                    {stats.activeOpenings}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Closed Openings
                </CardTitle>
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <div className="text-2xl font-bold text-muted-foreground">
                    {stats.closedOpenings}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Openings by Role */}
          <Card>
            <CardHeader>
              <CardTitle>Openings by Job Role</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : openingsByRole.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {openingsByRole.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <span className="font-medium">{item.role}</span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No job roles found</p>
              )}
            </CardContent>
          </Card>

          {/* Detailed Job Openings Table */}
          <Card>
            <CardHeader>
              <CardTitle>Job Openings Details</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : jobOpenings.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No job openings found</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate("/job-openings/create")}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Job Opening
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-center">Positions</TableHead>
                        <TableHead className="text-center">Total Applicants</TableHead>
                        <TableHead className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                            Selected
                          </div>
                        </TableHead>
                        <TableHead className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <XCircle className="w-4 h-4 text-red-600" />
                            Rejected
                          </div>
                        </TableHead>
                        <TableHead>Round-wise Status</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {jobOpenings.map((job) => (
                        <TableRow key={job._id}>
                          <TableCell className="font-medium">{job.title}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                job.status === "ACTIVE"
                                  ? "default"
                                  : job.status === "CLOSED" || job.status === "CANCELLED"
                                  ? "secondary"
                                  : "outline"
                              }
                            >
                              {job.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{job.department || "-"}</TableCell>
                          <TableCell className="text-center">
                            {job.numberOfPositions}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">{job.totalApplicants}</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {job.selectedCandidates}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                              {job.rejectedCandidates}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {job.roundStats && job.roundStats.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {job.roundStats.map((round, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs border rounded px-2 py-1 bg-muted/50"
                                    title={`${round.roundName}: Total: ${round.total}, Scheduled: ${round.scheduled}, Completed: ${round.completed}, Selected: ${round.selected}, Rejected: ${round.rejected}`}
                                  >
                                    <div className="font-medium">{round.roundName}</div>
                                    <div className="text-muted-foreground">
                                      T:{round.total} S:{round.scheduled} C:{round.completed}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">No rounds</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/job-openings/${job._id}/view`)}
                              title="View"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </MainLayout>
  );
};

export default JobOpeningDashboard;

