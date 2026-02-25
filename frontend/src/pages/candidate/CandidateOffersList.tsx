import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MainLayout from "@/components/MainLayout";
import {
  FileCheck,
  Building2,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  MapPin,
  Briefcase,
} from "lucide-react";
import { useGetCandidateProfileQuery } from "@/store/api/candidateDashboardApi";
import {
  useGetAllOffersByCandidateIdQuery,
  useAcceptOfferMutation,
  useRejectOfferMutation,
} from "@/store/api/offerApi";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const CandidateOffersList = () => {
  const navigate = useNavigate();
  const { data: profileData } = useGetCandidateProfileQuery();
  const candidateId = profileData?.data?.candidateData?._id;

  // Fetch all offers for this candidate
  const { data: offersData, refetch: refetchOffers, isLoading } = useGetAllOffersByCandidateIdQuery(
    candidateId || "",
    {
      skip: !candidateId,
    }
  );

  const offers = offersData?.data?.offers || [];

  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const [acceptOffer, { isLoading: isAccepting }] = useAcceptOfferMutation();
  const [rejectOffer, { isLoading: isRejecting }] = useRejectOfferMutation();

  const handleAccept = async (offerId: string) => {
    try {
      await acceptOffer(offerId).unwrap();
      toast.success("Offer accepted successfully!");
      refetchOffers();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to accept offer");
    }
  };

  const handleReject = async () => {
    if (!selectedOfferId) return;
    try {
      await rejectOffer({
        id: selectedOfferId,
        rejectionReason: rejectionReason || undefined,
      }).unwrap();
      toast.success("Offer rejected");
      setShowRejectDialog(false);
      setSelectedOfferId(null);
      setRejectionReason("");
      refetchOffers();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to reject offer");
    }
  };

  const openRejectDialog = (offerId: string) => {
    setSelectedOfferId(offerId);
    setShowRejectDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACCEPTED":
        return (
          <Badge variant="default" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            Accepted
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="w-3 h-3" />
            Rejected
          </Badge>
        );
      case "SENT":
        return (
          <Badge variant="secondary" className="gap-1">
            <FileCheck className="w-3 h-3" />
            Pending Response
          </Badge>
        );
      case "DRAFT":
        return <Badge variant="outline">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading offers...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">My Job Offers</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all your job offers in one place
          </p>
        </div>

        {/* Offers List */}
        {offers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <FileCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Offers Yet</h3>
                <p className="text-muted-foreground mb-4">
                  You haven't received any job offers yet. Keep applying to jobs and check back here!
                </p>
                <Button onClick={() => navigate("/candidate/job-vacancies")}>
                  Browse Job Openings
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {offers.map((off: any) => {
              const job = typeof off.jobOpeningId === "object" ? off.jobOpeningId : null;
              return (
                <Card key={off._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <CardTitle className="text-xl">
                            {job?.title || "Job Position"}
                          </CardTitle>
                          {getStatusBadge(off.status)}
                        </div>
                        {off.department && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            <span>{off.department}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Offer Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {off.employmentType && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Briefcase className="w-4 h-4" />
                            Employment Type
                          </p>
                          <p className="font-medium">{off.employmentType}</p>
                        </div>
                      )}
                      {off.salary && off.salary.amount !== undefined && off.salary.amount !== null && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Compensation
                          </p>
                          <p className="font-medium">
                            {off.salary.currency || ""}{" "}
                            {typeof off.salary.amount === "number"
                              ? off.salary.amount.toLocaleString()
                              : off.salary.amount}{" "}
                            {off.salary.frequency || ""}
                          </p>
                        </div>
                      )}
                      {off.joiningDate && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Joining Date
                          </p>
                          <p className="font-medium">
                            {format(new Date(off.joiningDate), "PPP")}
                          </p>
                        </div>
                      )}
                      {off.expiryDate && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Expiry Date
                          </p>
                          <p className="font-medium">
                            {format(new Date(off.expiryDate), "PPP")}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Status Messages */}
                    {off.status === "ACCEPTED" && off.acceptedAt && (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-sm text-green-900">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Accepted on {format(new Date(off.acceptedAt), "PPP 'at' p")}
                        </p>
                      </div>
                    )}

                    {off.status === "REJECTED" && off.rejectedAt && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-900">
                          <XCircle className="w-4 h-4 inline mr-1" />
                          Rejected on {format(new Date(off.rejectedAt), "PPP 'at' p")}
                          {off.rejectionReason && (
                            <span className="block mt-1">Reason: {off.rejectionReason}</span>
                          )}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/candidate/offer/${off._id}`)}
                        className="gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        View Full Details
                      </Button>
                      {off.status === "SENT" && (
                        <>
                          <Button
                            onClick={() => handleAccept(off._id)}
                            disabled={isAccepting}
                            className="gap-2 flex-1"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {isAccepting ? "Accepting..." : "Accept Offer"}
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => openRejectDialog(off._id)}
                            disabled={isRejecting}
                            className="gap-2 flex-1"
                          >
                            <XCircle className="w-4 h-4" />
                            {isRejecting ? "Rejecting..." : "Reject Offer"}
                          </Button>
                        </>
                      )}
                      {job && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            const jobId = typeof job === 'object' && job._id 
                              ? job._id.toString() 
                              : job?.toString() || '';
                            if (jobId) {
                              navigate(`/candidate/job-detail/${jobId}`);
                            }
                          }}
                          className="gap-2"
                        >
                          <Briefcase className="w-4 h-4" />
                          View Job Details
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Reject Offer Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Offer</DialogTitle>
              <DialogDescription>
                Are you sure you want to reject this offer? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">
                  Reason for Rejection (Optional)
                </Label>
                <textarea
                  id="rejection-reason"
                  className="w-full min-h-[100px] p-2 border rounded-md"
                  placeholder="Please provide a reason for rejecting this offer..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setSelectedOfferId(null);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleReject} disabled={isRejecting}>
                  {isRejecting ? "Rejecting..." : "Reject Offer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default CandidateOffersList;

