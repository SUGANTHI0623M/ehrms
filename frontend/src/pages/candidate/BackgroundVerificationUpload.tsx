import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  CreditCard,
  MapPin,
  User,
  GraduationCap,
  Phone,
  AlertCircle,
} from "lucide-react";
import {
  useGetBackgroundVerificationDetailsQuery,
  useUpdateContactInfoMutation,
  DocumentCategory,
} from "@/store/api/backgroundVerificationApi";
import { useGetCandidateProfileQuery } from "@/store/api/candidateDashboardApi";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";

const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, { label: string; icon: any; description: string }> = {
  PAN_CARD: {
    label: "PAN Card",
    icon: CreditCard,
    description: "Upload a clear copy of your PAN card",
  },
  AADHAAR_CARD: {
    label: "Aadhaar Card",
    icon: CreditCard,
    description: "Upload a clear copy of your Aadhaar card (front and back)",
  },
  ADDRESS_PROOF: {
    label: "Address Proof",
    icon: MapPin,
    description: "Upload a valid address proof document (Utility bill, Bank statement, etc.)",
  },
  IDENTITY_PROOF: {
    label: "Identity Proof",
    icon: User,
    description: "Upload a valid identity proof document (Driving license, Passport, etc.)",
  },
  EDUCATIONAL_CERTIFICATES: {
    label: "Educational Certificates",
    icon: GraduationCap,
    description: "Upload all relevant educational certificates and degrees",
  },
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'VERIFIED':
      return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    case 'REJECTED':
      return <XCircle className="w-5 h-5 text-red-600" />;
    case 'PENDING':
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'VERIFIED':
      return <Badge className="bg-green-100 text-green-800 border-green-200">Verified</Badge>;
    case 'REJECTED':
      return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
    case 'PENDING':
    default:
      return <Badge variant="outline">Pending</Badge>;
  }
};

const BackgroundVerificationUpload = () => {
  const currentUser = useAppSelector((state) => state.auth.user);
  const [primaryContact, setPrimaryContact] = useState("");
  const [secondaryContact, setSecondaryContact] = useState("");
  const [currentResidentialAddress, setCurrentResidentialAddress] = useState("");
  

  const candidateId = currentUser?.role === 'Candidate' ? 'me' : (currentUser?.id || 'me');

  const { data, isLoading, refetch } = useGetBackgroundVerificationDetailsQuery(candidateId);
  const { data: profileData } = useGetCandidateProfileQuery();
  const [updateContactInfo, { isLoading: isUpdatingContact }] = useUpdateContactInfoMutation();

  const candidate = data?.data?.candidate;
  const verification = data?.data?.backgroundVerification;
  const candidateProfileData = profileData?.data?.candidateData;
  
  // Initialize address from verification data or candidate profile
  useEffect(() => {
    if (verification?.addressVerification?.currentResidentialAddress) {
      setCurrentResidentialAddress(verification.addressVerification.currentResidentialAddress);
    } else if (candidateProfileData?.location) {
      // If verification doesn't have address, use candidate profile location
      setCurrentResidentialAddress(candidateProfileData.location);
    }
  }, [verification, candidateProfileData]);

  // For candidates, we'll use a special endpoint that finds by userId
  // The backend will handle finding the candidate by userId for candidate role
  // Always use 'me' for candidate role to let backend find by userId

  const handleUpdateContactInfo = async () => {
    if (!candidateId) return;

    try {
      await updateContactInfo({
        candidateId,
        primaryContact: primaryContact || undefined,
        secondaryContact: secondaryContact || undefined,
        currentResidentialAddress: currentResidentialAddress || undefined,
      }).unwrap();
      toast.success("Contact information updated successfully");
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to update contact information");
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-8">Loading verification details...</div>
          </div>
        </main>
      </MainLayout>
    );
  }

  if (!candidate || !verification) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>Background verification not available</p>
              <p className="text-sm mt-2">
                Please accept your offer first to proceed with background verification
              </p>
            </div>
          </div>
        </main>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Background Verification</h1>
              <p className="text-muted-foreground mt-1">
                Upload required documents and update your contact information
              </p>
            </div>
            <Badge
              className={
                verification.overallStatus === 'CLEARED'
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : verification.overallStatus === 'FAILED'
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : verification.overallStatus === 'IN_PROGRESS'
                  ? 'bg-blue-100 text-blue-800 border-blue-200'
                  : 'bg-gray-100 text-gray-800 border-gray-200'
              }
            >
              {verification.overallStatus === 'CLEARED'
                ? 'Cleared'
                : verification.overallStatus === 'FAILED'
                ? 'Failed'
                : verification.overallStatus === 'IN_PROGRESS'
                ? 'In Progress'
                : 'Not Started'}
            </Badge>
          </div>

          {/* Instructions */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Instructions</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Document verification is handled separately and approved by admin</li>
                    <li>View your verification status for each document below</li>
                    <li>Ensure all contact information is accurate and up-to-date</li>
                    <li>You cannot proceed with onboarding until verification is cleared</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Required Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {verification.verificationItems.map((item) => {
                const categoryInfo = DOCUMENT_CATEGORY_LABELS[item.category as DocumentCategory];
                if (!categoryInfo) return null;
                const Icon = categoryInfo.icon;

                return (
                  <div key={item.category} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <h3 className="font-semibold">{categoryInfo.label}</h3>
                          <p className="text-sm text-muted-foreground">
                            {categoryInfo.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(item.status)}
                        {getStatusIcon(item.status)}
                      </div>
                    </div>

                    {item.status === 'REJECTED' && item.rejectionReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                        <strong>Rejection Reason:</strong> {item.rejectionReason}
                        <p className="mt-1 text-xs">
                          Document verification is handled through the document verification process.
                        </p>
                      </div>
                    )}

                    {item.documents.length > 0 && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Uploaded Documents</Label>
                        {item.documents.map((doc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-2 bg-muted rounded"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{doc.name}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(doc.url, '_blank')}
                            >
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Contact Information Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="w-5 h-5" />
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Primary Contact Number *</Label>
                <Input
                  value={primaryContact}
                  onChange={(e) => setPrimaryContact(e.target.value)}
                  placeholder={
                    verification.contactVerifications.find(cv => cv.type === 'PRIMARY')
                      ?.contactNumber || candidate.phone || "Enter primary contact number"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Current: {verification.contactVerifications.find(cv => cv.type === 'PRIMARY')?.contactNumber || candidate.phone}
                </p>
                {verification.contactVerifications.find(cv => cv.type === 'PRIMARY')?.status === 'REJECTED' && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <strong>Rejection Reason:</strong>{' '}
                    {verification.contactVerifications.find(cv => cv.type === 'PRIMARY')?.rejectionReason}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Secondary Contact Number</Label>
                <Input
                  value={secondaryContact}
                  onChange={(e) => setSecondaryContact(e.target.value)}
                  placeholder={
                    verification.contactVerifications.find(cv => cv.type === 'SECONDARY')
                      ?.contactNumber || "Enter secondary contact number (optional)"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Current: {verification.contactVerifications.find(cv => cv.type === 'SECONDARY')?.contactNumber || 'Not provided'}
                </p>
                {verification.contactVerifications.find(cv => cv.type === 'SECONDARY')?.status === 'REJECTED' && (
                  <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                    <strong>Rejection Reason:</strong>{' '}
                    {verification.contactVerifications.find(cv => cv.type === 'SECONDARY')?.rejectionReason}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Current Residential Address *</Label>
                <Textarea
                  value={currentResidentialAddress}
                  onChange={(e) => setCurrentResidentialAddress(e.target.value)}
                  placeholder="Enter your complete current residential address including street, city, state, and PIN code"
                  rows={4}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-muted-foreground">
                  Please provide your complete address with all details (Street, City, State, PIN Code)
                </p>
                {candidateProfileData?.location && !verification?.addressVerification?.currentResidentialAddress && (
                  <p className="text-xs text-blue-600 mt-1">
                    Address from profile: {candidateProfileData.location}
                  </p>
                )}
                {verification.addressVerification.status === 'REJECTED' &&
                  verification.addressVerification.rejectionReason && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <div>
                          <strong>Rejection Reason:</strong>{' '}
                          {verification.addressVerification.rejectionReason}
                          <p className="mt-1 text-xs">
                            Please update your address with the required corrections.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                {verification.addressVerification.status === 'VERIFIED' && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Your address has been verified.</span>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={handleUpdateContactInfo}
                disabled={isUpdatingContact}
              >
                {isUpdatingContact ? 'Updating...' : 'Update Contact Information'}
              </Button>
            </CardContent>
          </Card>

          {/* Status Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Verification Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Documents</span>
                  <Badge variant="outline">
                    {verification.verificationItems.filter(item => item.status === 'VERIFIED').length} / {verification.verificationItems.length} Verified
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Contacts</span>
                  <Badge variant="outline">
                    {verification.contactVerifications.filter(cv => cv.status === 'VERIFIED').length} / {verification.contactVerifications.length} Verified
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Address</span>
                  {getStatusBadge(verification.addressVerification.status)}
                </div>
              </div>

              {verification.overallStatus === 'CLEARED' && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">Background Verification Cleared</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    You can now proceed with onboarding. HR will contact you with next steps.
                  </p>
                </div>
              )}

              {verification.overallStatus === 'FAILED' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <XCircle className="w-5 h-5" />
                    <span className="font-semibold">Background Verification Failed</span>
                  </div>
                  {verification.failureReason && (
                    <p className="text-sm text-red-700 mt-1">
                      {verification.failureReason}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </MainLayout>
  );
};

export default BackgroundVerificationUpload;

