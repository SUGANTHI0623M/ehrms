import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table } from "antd";
import MainLayout from "@/components/MainLayout";
import { useGetApplicationStatusQuery } from "@/store/api/candidateDashboardApi";
import { FileText, Clock } from "lucide-react";
import { formatCandidateStatus } from "@/utils/constants";
import { formatDistanceToNow } from "date-fns";

const ApplicationStatus = () => {
  const { data, isLoading, error } = useGetApplicationStatusQuery();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading applications...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>              
        <div className="p-4">
          <div className="text-center py-12 text-destructive">
            Error loading application status
          </div>
        </div>
      </MainLayout>
    );
  }

  const applications = data?.data?.applications || [];

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      APPLIED: "blue",
      INTERVIEW_SCHEDULED: "purple",
      INTERVIEW_COMPLETED: "cyan",
      SELECTED: "green",
      REJECTED: "red",
      OFFER_SENT: "orange",
      OFFER_ACCEPTED: "green",
      HIRED: "success",
    };
    return colors[status] || "default";
  };

  const columns = [
    {
      title: "Position",
      dataIndex: "position",
      key: "position",
      render: (text: string) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{text}</span>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status: string) => (
        <Badge color={getStatusColor(status)}>{formatCandidateStatus(status)}</Badge>
      ),
    },
    {
      title: "Primary Skill",
      dataIndex: "primarySkill",
      key: "primarySkill",
    },
    {
      title: "Applied Date",
      dataIndex: "appliedDate",
      key: "appliedDate",
      render: (date: string) => (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          {new Date(date).toLocaleDateString()}
        </div>
      ),
    },
    {
      title: "Last Updated",
      dataIndex: "lastUpdated",
      key: "lastUpdated",
      render: (date: string) => (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(date), { addSuffix: true })}
        </span>
      ),
    },
  ];

  return (
    <MainLayout>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Application Status</h1>
          <p className="text-muted-foreground mt-1">
            Track the status of your job applications
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>My Applications</CardTitle>
          </CardHeader>
          <CardContent>
            {applications.length > 0 ? (
              <Table
                columns={columns}
                dataSource={applications}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No applications yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Browse job openings to apply for positions.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ApplicationStatus;

