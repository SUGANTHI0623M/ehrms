import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import MainLayout from "@/components/MainLayout";
import { useGetCandidateDashboardQuery } from "@/store/api/candidateDashboardApi";
import {
  useGetOnboardingByCurrentUserQuery,
  useUploadOnboardingDocumentMutation,
  DOCUMENT_STATUS,
  ONBOARDING_STATUS,
} from "@/store/api/onboardingApi";
import {
  Briefcase,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  TrendingUp,
  Upload,
  Eye,
  FileCheck,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { formatCandidateStatus, getCandidateStatusColor } from "@/utils/constants";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CandidateDashboard = () => {
  const navigate = useNavigate();
  const { data, isLoading, error } = useGetCandidateDashboardQuery();
  const {
    data: onboardingData,
    isLoading: onboardingLoading,
    refetch: refetchOnboarding
  } = useGetOnboardingByCurrentUserQuery();
  const [uploadDocument, { isLoading: isUploading }] = useUploadOnboardingDocumentMutation();
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const dashboardData = data?.data;
  const onboarding = onboardingData?.data?.onboarding;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
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
            Error loading dashboard data
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Candidate Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome, {dashboardData?.profile?.name || "Candidate"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Job Openings</CardTitle>
              <Briefcase className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.activeJobOpenings || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.applicationStats?.total || 0}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(dashboardData?.applicationStats?.screening || 0) +
                  (dashboardData?.applicationStats?.shortlisted || 0) +
                  (dashboardData?.applicationStats?.interview || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Hired</CardTitle>
              <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardData?.applicationStats?.hired || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Application Status Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Application Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{dashboardData?.applicationStats?.applied || 0}</div>
                <div className="text-sm text-muted-foreground">Applied</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{dashboardData?.applicationStats?.screening || 0}</div>
                <div className="text-sm text-muted-foreground">Screening</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{dashboardData?.applicationStats?.shortlisted || 0}</div>
                <div className="text-sm text-muted-foreground">Shortlisted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{dashboardData?.applicationStats?.interview || 0}</div>
                <div className="text-sm text-muted-foreground">Interview</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{dashboardData?.applicationStats?.offer || 0}</div>
                <div className="text-sm text-muted-foreground">Offer</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{dashboardData?.applicationStats?.hired || 0}</div>
                <div className="text-sm text-muted-foreground">Hired</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{dashboardData?.applicationStats?.rejected || 0}</div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Applications */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Applications</CardTitle>
            <Button
              variant="outline"
              onClick={() => navigate("/candidate/applications")}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData?.recentApplications?.length ? (
                dashboardData.recentApplications.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{app.position}</p>
                      <p className="text-sm text-muted-foreground">
                        Applied {formatDistanceToNow(new Date(app.appliedDate), { addSuffix: true })}
                      </p>
                    </div>
                    <Badge className={getCandidateStatusColor(app.status)}>
                      {formatCandidateStatus(app.status)}
                      {app.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No applications yet. Browse job openings to apply.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Progress */}
        {onboardingLoading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading onboarding details...</div>
            </CardContent>
          </Card>
        ) : onboarding ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Onboarding Progress
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDetailsDialogOpen(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">
                      {onboarding.staffId.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {onboarding.staffId.designation} - {onboarding.staffId.department}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Employee ID: {onboarding.staffId.employeeId} | Joining:{" "}
                      {format(new Date(onboarding.staffId.joiningDate), "yyyy-MM-dd")}
                    </p>
                  </div>
                  <Badge
                    variant={
                      onboarding.status === ONBOARDING_STATUS.COMPLETED
                        ? "default"
                        : onboarding.status === ONBOARDING_STATUS.IN_PROGRESS
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {onboarding.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Documents:{" "}
                      {onboarding.documents.filter(
                        (doc) => doc.status === DOCUMENT_STATUS.COMPLETED
                      ).length}{" "}
                      / {onboarding.documents.length}
                    </span>
                    <span className="font-medium">{onboarding.progress}%</span>
                  </div>
                  <Progress value={onboarding.progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-lg font-bold">
                      {onboarding.documents.filter(
                        (doc) => doc.status === DOCUMENT_STATUS.COMPLETED
                      ).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-lg font-bold">
                      {onboarding.documents.filter(
                        (doc) => doc.status === DOCUMENT_STATUS.PENDING
                      ).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-lg font-bold">
                      {onboarding.documents.filter(
                        (doc) => doc.status === DOCUMENT_STATUS.NOT_STARTED
                      ).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Not Started</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-lg font-bold">
                      {onboarding.documents.filter(
                        (doc) => doc.status === DOCUMENT_STATUS.REJECTED
                      ).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Rejected</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Onboarding Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Onboarding Details</DialogTitle>
              <DialogDescription>
                View and upload required documents for onboarding
              </DialogDescription>
            </DialogHeader>

            {onboarding && (
              <div className="space-y-6 py-4">
                {/* Employee Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Employee ID</p>
                    <p className="font-medium">{onboarding.staffId.employeeId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="font-medium">{onboarding.staffId.department}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Designation</p>
                    <p className="font-medium">{onboarding.staffId.designation}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Joining Date</p>
                    <p className="font-medium">
                      {format(new Date(onboarding.staffId.joiningDate), "yyyy-MM-dd")}
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Overall Progress</p>
                    <span className="font-bold">{onboarding.progress}%</span>
                  </div>
                  <Progress value={onboarding.progress} className="h-3" />
                </div>

                {/* Documents List */}
                <div className="space-y-3">
                  <p className="font-semibold">Required Documents</p>
                  {onboarding.documents.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {doc.status === DOCUMENT_STATUS.COMPLETED ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{doc.name}</p>
                          {doc.required && (
                            <span className="text-xs text-red-500">Required</span>
                          )}
                          {doc.url && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline block mt-1"
                            >
                              View Document
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            doc.status === DOCUMENT_STATUS.COMPLETED
                              ? "default"
                              : doc.status === DOCUMENT_STATUS.PENDING
                                ? "secondary"
                                : doc.status === DOCUMENT_STATUS.REJECTED
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {doc.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                        {doc.status !== DOCUMENT_STATUS.COMPLETED && (
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    await uploadDocument({
                                      onboardingId: onboarding._id,
                                      documentId: doc._id,
                                      file,
                                    }).unwrap();
                                    toast.success("Document uploaded successfully");
                                    refetchOnboarding();
                                  } catch (error: any) {
                                    toast.error(
                                      error?.data?.error?.message || "Failed to upload document"
                                    );
                                  }
                                }
                              }}
                              disabled={isUploading}
                            />
                            <Button size="sm" variant="outline" disabled={isUploading} asChild>
                              <span>
                                {isUploading ? (
                                  "Uploading..."
                                ) : (
                                  <>
                                    <Upload className="w-3 h-3 mr-1" />
                                    Upload
                                  </>
                                )}
                              </span>
                            </Button>
                          </label>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default CandidateDashboard;

