import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import MainLayout from "@/components/MainLayout";
import {
  useGetOfferByIdQuery,
  useAcceptOfferMutation,
  useRejectOfferMutation,
  useGenerateOfferLetterPreviewQuery,
} from "@/store/api/offerApi";
import {
  FileText,
  Calendar,
  DollarSign,
  CheckCircle,
  XCircle,
  Download,
  Eye,
  Building2,
  MapPin,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CandidateOfferView = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: offerData, isLoading: offerLoading, refetch } = useGetOfferByIdQuery(id || "", {
    skip: !id,
  });

  const { data: previewData, isLoading: previewLoading } = useGenerateOfferLetterPreviewQuery(
    id || "",
    {
      skip: !id,
    }
  );

  const [acceptOffer, { isLoading: isAccepting }] = useAcceptOfferMutation();
  const [rejectOffer, { isLoading: isRejecting }] = useRejectOfferMutation();

  const offer = offerData?.data?.offer;
  const preview = previewData?.data;
  const business = preview?.business;
  const offerLetterContent = preview?.offerLetterContent;

  const handleAccept = async () => {
    if (!id) return;

    try {
      await acceptOffer(id).unwrap();
      toast.success("Offer accepted successfully!");
      refetch();
      // Optionally navigate to a success page or back to profile
      setTimeout(() => {
        navigate("/candidate/profile");
      }, 2000);
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to accept offer");
    }
  };

  const handleReject = async () => {
    if (!id) return;

    try {
      await rejectOffer({ id, rejectionReason: rejectionReason || undefined }).unwrap();
      toast.success("Offer rejected");
      setShowRejectDialog(false);
      setRejectionReason("");
      refetch();
      setTimeout(() => {
        navigate("/candidate/profile");
      }, 2000);
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to reject offer");
    }
  };

  if (offerLoading || previewLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading offer details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!offer) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <div className="text-center">
                <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Offer Not Found</h3>
                <p className="text-muted-foreground mb-4">
                  The offer you're looking for doesn't exist or has been removed.
                </p>
                <Button onClick={() => navigate("/candidate/profile")}>Back to Profile</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const candidate =
    typeof offer.candidateId === "object" ? offer.candidateId : null;
  const jobOpening =
    typeof offer.jobOpeningId === "object" ? offer.jobOpeningId : null;

  return (
    <MainLayout>
      <main className="p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Job Offer</h1>
              <p className="text-muted-foreground mt-1">
                Review your offer letter and respond
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {offer.isRevision && (
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                  Revised Offer - Revision {offer.revisionNumber || 1}
                </Badge>
              )}
              <Badge
                variant={
                  offer.status === "ACCEPTED"
                    ? "default"
                    : offer.status === "REJECTED"
                    ? "destructive"
                    : offer.status === "SENT"
                    ? "secondary"
                    : "outline"
                }
                className="text-sm px-3 py-1"
              >
                {offer.status === "ACCEPTED" && <CheckCircle className="w-3 h-3 mr-1" />}
                {offer.status === "REJECTED" && <XCircle className="w-3 h-3 mr-1" />}
                {offer.status}
              </Badge>
            </div>
          </div>

          {/* Revision Notice */}
          {offer.isRevision && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900">
                      Revised Offer Letter
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                      This is a revised version of your offer letter (Revision {offer.revisionNumber || 1}). 
                      Please review the updated terms and conditions carefully.
                      {offer.revisionChanges && (
                        <span className="block mt-1">
                          <strong>Changes:</strong> {offer.revisionChanges}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Offer Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Offer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Job Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {jobOpening && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Position
                    </p>
                    <p className="font-medium">{jobOpening.title}</p>
                  </div>
                )}
                {offer.department && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Department
                    </p>
                    <p className="font-medium">{offer.department}</p>
                  </div>
                )}
                {offer.employmentType && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Employment Type</p>
                    <p className="font-medium">{offer.employmentType}</p>
                  </div>
                )}
                {offer.salary && offer.salary.amount !== undefined && offer.salary.amount !== null && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      Compensation
                    </p>
                    <p className="font-medium">
                      {offer.salary.currency || ''} {typeof offer.salary.amount === 'number' ? offer.salary.amount.toLocaleString() : offer.salary.amount}{" "}
                      {offer.salary.frequency || ''}
                    </p>
                  </div>
                )}
                {offer.joiningDate && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Joining Date
                    </p>
                    <p className="font-medium">
                      {format(new Date(offer.joiningDate), "PPP")}
                    </p>
                  </div>
                )}
                {offer.expiryDate && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Expiry Date
                    </p>
                    <p className="font-medium">
                      {format(new Date(offer.expiryDate), "PPP")}
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {offer.notes && (
                <>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">Additional Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{offer.notes}</p>
                  </div>
                </>
              )}

              {/* Attachments */}
              {offer.attachments && offer.attachments.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Attached Documents</h3>
                    <div className="space-y-2">
                      {offer.attachments.map((attachment, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <FileText className="h-5 w-5 text-primary" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{attachment.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {attachment.type || "Document"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(attachment.url, "_blank")}
                              className="gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = attachment.url;
                                link.download = attachment.name;
                                link.target = "_blank";
                                link.click();
                              }}
                              className="gap-2"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Offer Letter Content Preview */}
          {offerLetterContent && (
            <Card>
              <CardHeader>
                <CardTitle>Offer Letter</CardTitle>
              </CardHeader>
              <CardContent>
                {business?.logo && (
                  <div className="mb-4 flex justify-center">
                    <img
                      src={business.logo}
                      alt={business.name || "Company Logo"}
                      className="max-h-24 object-contain"
                    />
                  </div>
                )}
                <div
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: offerLetterContent }}
                />
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          {offer.status === "SENT" && (
            <Card className="border-2 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isRejecting}
                    className="gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    {isRejecting ? "Rejecting..." : "Reject Offer"}
                  </Button>
                  <Button
                    onClick={handleAccept}
                    disabled={isAccepting}
                    className="gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    {isAccepting ? "Accepting..." : "Accept Offer"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Status Messages */}
          {offer.status === "ACCEPTED" && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">
                      Offer Accepted
                    </p>
                    <p className="text-sm text-green-700">
                      You accepted this offer on{" "}
                      {offer.acceptedAt
                        ? format(new Date(offer.acceptedAt), "PPP 'at' p")
                        : "recently"}
                      . The HR team will contact you soon.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {offer.status === "REJECTED" && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <XCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-medium text-red-900">Offer Rejected</p>
                    <p className="text-sm text-red-700">
                      You rejected this offer on{" "}
                      {offer.rejectedAt
                        ? format(new Date(offer.rejectedAt), "PPP 'at' p")
                        : "recently"}
                      .
                      {offer.rejectionReason && (
                        <span className="block mt-1">
                          Reason: {offer.rejectionReason}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Back Button */}
          <div className="flex justify-start">
            <Button variant="outline" onClick={() => navigate("/candidate/profile")}>
              Back to Profile
            </Button>
          </div>
        </div>

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
                <label className="text-sm font-medium">
                  Reason for Rejection (Optional)
                </label>
                <textarea
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
      </main>
    </MainLayout>
  );
};

export default CandidateOfferView;

