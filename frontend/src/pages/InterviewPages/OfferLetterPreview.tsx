import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, MessageSquare, CheckCircle2, XCircle, FileText } from "lucide-react";
import {
  useGetOfferByIdQuery,
  usePreviewOfferQuery,
  useSendOfferMultiChannelMutation,
  useGenerateOfferLetterPreviewQuery,
} from "@/store/api/offerApi";
import { formatDate, formatOfferStatus, getOfferStatusColor } from "@/utils/constants";
import { toast } from "sonner";

const OfferLetterPreview = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isResend = searchParams.get("resend") === "true";

  const [sendEmail, setSendEmail] = useState(true);
  const [sendWhatsApp, setSendWhatsApp] = useState(false);

  const { data: offerData, isLoading: offerLoading } = useGetOfferByIdQuery(id || "", {
    skip: !id,
  });

  const { data: previewData, isLoading: previewLoading } = usePreviewOfferQuery(id || "", {
    skip: !id,
  });

  const { data: offerLetterData, isLoading: offerLetterLoading } = useGenerateOfferLetterPreviewQuery(id || "", {
    skip: !id,
  });

  const [sendOffer, { isLoading: isSending }] = useSendOfferMultiChannelMutation();

  const offer = offerData?.data?.offer;
  const preview = previewData?.data?.preview;

  useEffect(() => {
    if (offer?.status === "SENT" && !isResend) {
      // If offer is already sent, show read-only view
      setSendEmail(false);
      setSendWhatsApp(false);
    }
  }, [offer, isResend]);

  const handleSendOffer = async () => {
    if (!id) return;

    if (!sendEmail && !sendWhatsApp) {
      toast.error("Please select at least one sending method");
      return;
    }

    try {
      await sendOffer({
        id,
        sendEmail,
        sendWhatsApp,
      }).unwrap();

      toast.success("Offer sent successfully!");
      navigate("/offer-letter");
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to send offer");
    }
  };

  const handleEdit = () => {
    navigate(`/offer-letter/${id}/edit`);
  };

  if (offerLoading || previewLoading || offerLetterLoading) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="mx-auto max-w-4xl">
            <div className="text-center py-8">Loading offer preview...</div>
          </div>
        </main>
      </MainLayout>
    );
  }

  if (!offer || !preview) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="mx-auto max-w-4xl">
            <div className="text-center py-8 text-muted-foreground">
              Offer not found
            </div>
          </div>
        </main>
      </MainLayout>
    );
  }

  const offerLetterContent = offerLetterData?.data?.offerLetterContent;
  const business = offerLetterData?.data?.business;

  const canEdit = offer.status === "DRAFT";
  const canSend = offer.status === "DRAFT" || isResend;

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/offer-letter")}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <h1 className="text-3xl font-bold text-foreground">Offer Letter Preview</h1>
            </div>
            <div className="flex gap-2">
              {canEdit && (
                <Button variant="outline" onClick={handleEdit}>
                  Edit
                </Button>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium">Status:</span>
            <Badge
              variant="outline"
              className={getOfferStatusColor(offer.status)}
            >
              {formatOfferStatus(offer.status)}
            </Badge>
            {offer.isRevision && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Revised Offer - Revision {offer.revisionNumber || 1}
              </Badge>
            )}
          </div>

          {/* Offer Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Offer Letter Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Candidate Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Candidate Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{preview.candidateName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{preview.candidateEmail}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{preview.candidatePhone}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Job Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Job Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Job Title</Label>
                    <p className="font-medium">{preview.jobTitle}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Department</Label>
                    <p className="font-medium">{preview.department}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Employment Type</Label>
                    <p className="font-medium">{preview.employmentType}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Compensation */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Total CTC</h3>
                <div>
                  {/* <Label className="text-muted-foreground">Total CTC (A+B+C+D)</Label> */}
                  <p className="font-medium text-lg">{preview.compensation}</p>
                </div>
              </div>

              <Separator />

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Important Dates</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Expected Joining Date</Label>
                    <p className="font-medium">{formatDate(preview.joiningDate)}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Offer Expiry Date</Label>
                    <p className="font-medium">{formatDate(preview.expiryDate)}</p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Offer Owner */}
              <div>
                <Label className="text-muted-foreground">Offer Owner</Label>
                <p className="font-medium">{preview.offerOwner}</p>
              </div>

              {/* Attachments */}
              {offer.attachments && offer.attachments.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Attached Documents</h3>
                    <div className="space-y-2">
                      {offer.attachments.map((attachment, index) => (
                        <div key={index} className="flex items-center justify-between p-2 border rounded">
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-2"
                          >
                            <FileText className="h-4 w-4" />
                            {attachment.name}
                          </a>
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
                <CardTitle>Offer Letter Content</CardTitle>
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

          {/* Sending Options */}
          {canSend && (
            <Card>
              <CardHeader>
                <CardTitle>Send Offer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertDescription>
                    Select how you want to send this offer to the candidate. You can send via
                    email, WhatsApp, or both.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="send-email"
                      checked={sendEmail}
                      onCheckedChange={(checked) => setSendEmail(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="send-email" className="font-semibold flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Send via Email
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {offer.emailMethod === "without-esign"
                          ? "Send offer as a link via email. Candidate can accept or reject through the email link."
                          : "Send offer as an email attachment with e-signature support."}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="send-whatsapp"
                      checked={sendWhatsApp}
                      onCheckedChange={(checked) => setSendWhatsApp(checked as boolean)}
                    />
                    <div className="flex-1">
                      <Label htmlFor="send-whatsapp" className="font-semibold flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Send via WhatsApp
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Send offer notification via WhatsApp with a link to view and respond.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate("/offer-letter")}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSendOffer}
                    disabled={isSending || (!sendEmail && !sendWhatsApp)}
                    className="flex-1"
                  >
                    {isSending ? (
                      "Sending..."
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Send Offer Letter
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Already Sent Status */}
          {offer.status === "SENT" && !isResend && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  {offer.emailSent && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium">Email Sent</span>
                    </div>
                  )}
                  {offer.whatsappSent && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm font-medium">WhatsApp Sent</span>
                    </div>
                  )}
                  {offer.sentAt && (
                    <div className="text-sm text-muted-foreground ml-auto">
                      Sent on {formatDate(offer.sentAt)}
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/offer-letter/${id}/preview?resend=true`)}
                  >
                    Resend Offer
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </MainLayout>
  );
};

export default OfferLetterPreview;

