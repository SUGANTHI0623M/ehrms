import { useState } from "react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, FileCheck, Clock, CheckCircle2, XCircle, AlertCircle, X } from "lucide-react";
import { useGetBackgroundVerificationCandidatesQuery } from "@/store/api/backgroundVerificationApi";
import { formatCandidateStatus, getCandidateStatusColor } from "@/utils/constants";
import { formatOfferStatus } from "@/utils/constants";
import { Pagination } from "@/components/ui/Pagination";

const getVerificationStatusColor = (status: string) => {
  switch (status) {
    case 'CLEARED':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'IN_PROGRESS':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'FAILED':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'NOT_STARTED':
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatVerificationStatus = (status: string) => {
  switch (status) {
    case 'CLEARED':
      return 'Cleared';
    case 'IN_PROGRESS':
      return 'In Progress';
    case 'FAILED':
      return 'Failed';
    case 'NOT_STARTED':
    default:
      return 'Start Verification';
  }
};

const BackgroundVerification = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1); // Pagination state
  const [pageSize, setPageSize] = useState(10); // Default 10

  const { data, isLoading } = useGetBackgroundVerificationCandidatesQuery({
    page: page,
    limit: pageSize,
    search: search || undefined,
  });

  const allCandidates = data?.data?.candidates || [];

  // Use all candidates returned by the API, as the API already filters for eligible candidates (Onboarding Completed)
  const candidates = allCandidates;

  // Calculate statistics
  const stats = {
    total: candidates.length,
    cleared: candidates.filter(c => c.backgroundVerification?.status === 'CLEARED').length,
    inProgress: candidates.filter(c => c.backgroundVerification?.status === 'IN_PROGRESS' || !c.backgroundVerification).length,
    failed: candidates.filter(c => c.backgroundVerification?.status === 'FAILED').length,
  };

  return (
    <MainLayout>
      <main className="p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Background Verification</h1>
              <p className="text-muted-foreground mt-1">
                Verify candidate documents and details after offer acceptance
              </p>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Candidates</CardTitle>
                <FileCheck className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting verification</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
                <Clock className="w-4 h-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
                <p className="text-xs text-muted-foreground mt-1">Verification ongoing</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Cleared</CardTitle>
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.cleared}</div>
                <p className="text-xs text-muted-foreground mt-1">Ready for onboarding</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
                <XCircle className="w-4 h-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <p className="text-xs text-muted-foreground mt-1">Verification failed</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search by candidate name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={`pl-10 ${search ? "pr-10" : ""}`}
                />
                {search && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Candidates List */}
          <Card>
            <CardHeader>
              <CardTitle>Candidates for Background Verification</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading candidates...</div>
              ) : candidates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p>No candidates found for background verification</p>
                  <p className="text-sm mt-2">
                    Candidates will appear here after they accept their offer
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {candidates.map((candidate) => {
                    const verification = candidate.backgroundVerification;
                    const offer = candidate.offer;
                    const job = candidate.jobId as any;

                    return (
                      <div
                        key={candidate._id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/interview/background-verification/${candidate._id}`)}
                      >
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-foreground">
                              {candidate.firstName} {candidate.lastName}
                            </h3>
                            <Badge className={getCandidateStatusColor(candidate.status)}>
                              {formatCandidateStatus(candidate.status)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {job?.title || candidate.position}
                            {job?.department && ` • ${job.department}`}
                          </p>
                          {offer && (
                            <p className="text-xs text-muted-foreground">
                              Offer Accepted: {new Date(offer.acceptedAt || offer.createdAt).toLocaleDateString()}
                              {offer.joiningDate && ` • Joining: ${new Date(offer.joiningDate).toLocaleDateString()}`}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {verification ? (
                            <Badge className={getVerificationStatusColor(verification.status)}>
                              {formatVerificationStatus(verification.status)}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50">
                              Start Verification
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/interview/background-verification/${candidate._id}`);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>

            {/* Pagination Controls */}
            {data?.data && (
              <div className="mt-6 pt-4 border-t">
                <Pagination
                  page={data.data.pagination?.page || page}
                  pageSize={pageSize}
                  total={data.data.pagination?.total || (data.data.candidates?.length || 0)}
                  pages={data.data.pagination?.pages || Math.ceil((data.data.pagination?.total || data.data.candidates?.length || 0) / pageSize)}
                  onPageChange={(newPage) => {
                    setPage(newPage);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onPageSizeChange={(newSize) => {
                    setPageSize(newSize);
                    setPage(1);
                  }}
                  showPageSizeSelector={true}
                />
              </div>
            )}
          </Card>
        </div>
      </main>
    </MainLayout>
  );
};

export default BackgroundVerification;

