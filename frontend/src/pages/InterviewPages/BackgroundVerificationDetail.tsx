import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import {
  useGetBackgroundVerificationDetailsQuery,
  useVerifyItemMutation,
  useApproveOrRejectVerificationMutation,
  useNotifyCandidateAddressMutation,
} from "@/store/api/backgroundVerificationApi";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

const DOCUMENT_CATEGORY_LABELS: Record<string, { label: string }> = {
  PAN_CARD: { label: "PAN Card" },
  AADHAAR_CARD: { label: "Aadhaar Card" },
  ADDRESS_PROOF: { label: "Address Proof" },
  IDENTITY_PROOF: { label: "Identity Proof" },
  EDUCATIONAL_CERTIFICATES: { label: "Educational Certificates" },
};

import DocumentVerificationTab from "./components/DocumentVerificationTab";
import ContactVerificationTab from "./components/ContactVerificationTab";
import AddressVerificationTab from "./components/AddressVerificationTab";
import FinalVerificationTab from "./components/FinalVerificationTab";
import BackgroundVerificationLogTab from "./components/BackgroundVerificationLogTab";
import ConvertToStaffModal from "@/components/hiring/ConvertToStaffModal";
import { useAppSelector } from "@/store/hooks";

const BackgroundVerificationDetail = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("documents");
  const [showConvertToStaffModal, setShowConvertToStaffModal] = useState(false);
  const currentUser = useAppSelector((state) => state.auth.user);

  // Check permission for "Convert to Staff" button visibility/action
  const canConvertToStaff = currentUser?.role === 'Super Admin' ||
    currentUser?.role === 'Admin' ||
    currentUser?.permissions?.includes('convert_candidate_to_staff');


  // Verification Dialog State
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{
    type: 'document' | 'contact' | 'address';
    category: string;
    label: string;
  } | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED');
  const [remarks, setRemarks] = useState("");

  // Approval Dialog State
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [approveAction, setApproveAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [approveRemarks, setApproveRemarks] = useState("");

  const { data, isLoading, refetch } = useGetBackgroundVerificationDetailsQuery(candidateId!);
  const [verifyItem, { isLoading: isVerifying }] = useVerifyItemMutation();
  const [approveOrRejectVerification, { isLoading: isApproving }] = useApproveOrRejectVerificationMutation();
  const [notifyCandidateAddress, { isLoading: isNotifyingAddress }] = useNotifyCandidateAddressMutation();

  const candidate = data?.data?.candidate;
  const offer = data?.data?.offer;
  const verification = data?.data?.backgroundVerification;

  const handleVerifyItem = async () => {
    if (!selectedItem || !candidateId) return;

    if (verificationStatus === 'REJECTED' && !remarks.trim()) {
      toast.error("Remarks are required when rejecting");
      return;
    }

    try {
      await verifyItem({
        candidateId,
        itemType: selectedItem.type,
        itemCategory: selectedItem.category as any,
        status: verificationStatus,
        remarks: remarks.trim() || undefined,
      }).unwrap();
      toast.success(`Item ${verificationStatus === 'VERIFIED' ? 'verified' : 'rejected'} successfully`);
      setVerifyDialogOpen(false);
      setSelectedItem(null);
      setRemarks("");
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to verify item");
    }
  };

  const handleApproveOrReject = async () => {
    if (!candidateId) return;

    // For REJECT action, remarks are required
    if (approveAction === 'REJECT' && !approveRemarks.trim()) {
      toast.error("Remarks are required when rejecting");
      return;
    }

    try {
      const action = approveAction === 'REJECT' ? 'REJECT_CANDIDATE' : approveAction;
      await approveOrRejectVerification({
        candidateId,
        action: action,
        remarks: approveRemarks.trim() || undefined,
      }).unwrap();
      
      if (action === 'REJECT_CANDIDATE') {
        toast.success("Candidate rejected successfully");
      } else if (action === 'HOLD_PROCESS') {
        toast.success("Process put on hold successfully");
      } else {
        toast.success("Action completed successfully");
      }
      
      setApproveDialogOpen(false);
      setApproveRemarks("");
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to process action");
    }
  };

  const openVerifyDialog = (type: 'document' | 'contact' | 'address', category: string, label: string) => {
    setSelectedItem({ type, category, label });
    setVerificationStatus('VERIFIED');
    setRemarks("");
    setVerifyDialogOpen(true);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <main className="p-4">
          <div className="max-w-7xl mx-auto">
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
          <div className="max-w-7xl mx-auto">
            <div className="text-center py-8 text-muted-foreground">
              Candidate or verification not found
            </div>
          </div>
        </main>
      </MainLayout>
    );
  }

  const job = candidate.jobId as any;

  return (
    <MainLayout>
      <main className="p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/interview/background-verification")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {candidate.firstName} {candidate.lastName}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Background Verification Details
                </p>
              </div>
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

          {/* Candidate Info */}
          <Card>
            <CardHeader>
              <CardTitle>Candidate Information</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Position</Label>
                <p className="font-medium">{job?.title || candidate.position}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Department</Label>
                <p className="font-medium">{job?.department || 'N/A'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{candidate.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Phone</Label>
                <p className="font-medium">{candidate.phone}</p>
              </div>
              {offer && (
                <>
                  <div>
                    <Label className="text-muted-foreground">Offer Accepted</Label>
                    <p className="font-medium">
                      {formatDate(offer.acceptedAt || offer.createdAt)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Expected Joining</Label>
                    <p className="font-medium">{formatDate(offer.joiningDate)}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="documents">Document Verification</TabsTrigger>
              <TabsTrigger value="contact">Contact Verification</TabsTrigger>
              <TabsTrigger value="address">Address Verification</TabsTrigger>
              <TabsTrigger value="log">Verification Log</TabsTrigger>
              <TabsTrigger value="final">Final Verification</TabsTrigger>
            </TabsList>

            <TabsContent value="documents">
              <DocumentVerificationTab
                verificationItems={verification.verificationItems}
                onVerify={openVerifyDialog}
                candidateId={candidateId!}
              />
            </TabsContent>

            <TabsContent value="contact">
              <ContactVerificationTab
                contactVerifications={verification.contactVerifications}
                onVerify={openVerifyDialog}
              />
            </TabsContent>

            <TabsContent value="address">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Address Verification</h3>
                  {verification.addressVerification.status !== 'VERIFIED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openVerifyDialog('address', 'address', 'Current Residential Address')}
                    >
                      Verify Address
                    </Button>
                  )}
                </div>
                <AddressVerificationTab
                  addressVerification={verification.addressVerification}
                  onVerify={openVerifyDialog}
                  onNotify={async () => {
                    try {
                      await notifyCandidateAddress({
                        candidateId: candidateId!,
                        message: 'Please update your current residential address for background verification.',
                      }).unwrap();
                      toast.success('Candidate notified successfully to update address');
                    } catch (error: any) {
                      toast.error(error?.data?.error?.message || 'Failed to notify candidate');
                    }
                  }}
                  candidateId={candidateId!}
                  isNotifying={isNotifyingAddress}
                />
              </div>
            </TabsContent>

            <TabsContent value="log">
              <BackgroundVerificationLogTab
                candidateId={candidateId!}
                logs={(verification as any).logs}
                refetch={refetch}
              />
            </TabsContent>

            <TabsContent value="final">
              <FinalVerificationTab
                verification={verification}
                candidate={candidate}
                canConvertToStaff={canConvertToStaff}
                onApprove={async (action) => {
                  // Handle HOLD_PROCESS action
                  if (action === 'HOLD_PROCESS') {
                    try {
                      await approveOrRejectVerification({
                        candidateId: candidateId!,
                        action: 'HOLD_PROCESS',
                        remarks: undefined,
                      }).unwrap();
                      toast.success("Process put on hold successfully");
                      refetch();
                    } catch (error: any) {
                      toast.error(error?.data?.error?.message || "Failed to hold process");
                    }
                    return;
                  }
                  
                  // Handle CONVERT_TO_STAFF action
                  if (action === 'CONVERT_TO_STAFF') {
                    if (!canConvertToStaff) {
                      toast.error("You don't have permission to convert candidates to staff");
                      return;
                    }
                    
                    try {
                      await approveOrRejectVerification({
                        candidateId: candidateId!,
                        action: 'CONVERT_TO_STAFF',
                        remarks: undefined,
                      }).unwrap();
                      toast.success("Candidate converted to staff successfully");
                      refetch();
                    } catch (error: any) {
                      const errorMessage = error?.data?.error?.message || "Failed to convert candidate to staff";
                      toast.error(errorMessage);
                      // If it's a duplicate email/phone error, show specific message
                      if (error?.data?.error?.field) {
                        toast.error(`Please update the candidate's ${error.data.error.field} before converting to staff.`);
                      }
                    }
                    return;
                  }
                  
                  // For other actions (legacy), open the modal
                  if (canConvertToStaff) {
                    setShowConvertToStaffModal(true);
                  } else {
                    toast.error("You don't have permission to convert candidates to staff");
                  }
                }}
                onReject={() => {
                  setApproveAction('REJECT');
                  setApproveRemarks("");
                  setApproveDialogOpen(true);
                }}
              />
            </TabsContent>
          </Tabs>

          {/* Verify Item Dialog */}
          <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Verify {selectedItem?.label}</DialogTitle>
                <DialogDescription>
                  Mark this item as verified or rejected
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={verificationStatus}
                    onValueChange={(value: 'VERIFIED' | 'REJECTED') =>
                      setVerificationStatus(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="VERIFIED">Verified</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>
                    Remarks {verificationStatus === 'REJECTED' && '*'}
                  </Label>
                  <Textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Add remarks or rejection reason..."
                    rows={4}
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={handleVerifyItem}
                    disabled={isVerifying || (verificationStatus === 'REJECTED' && !remarks.trim())}
                    className="flex-1"
                  >
                    {isVerifying ? 'Processing...' : 'Submit'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setVerifyDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Approve/Reject Dialog */}
          <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {approveAction === 'APPROVE'
                    ? 'Approve Background Verification'
                    : 'Reject Background Verification'}
                </DialogTitle>
                <DialogDescription>
                  {approveAction === 'APPROVE'
                    ? 'This will mark the background verification as cleared and allow the candidate to proceed with onboarding.'
                    : 'This will mark the background verification as failed. Remarks are required.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {approveAction === 'REJECT' && (
                  <div className="space-y-2">
                    <Label>Rejection Reason *</Label>
                    <Textarea
                      value={approveRemarks}
                      onChange={(e) => setApproveRemarks(e.target.value)}
                      placeholder="Enter reason for rejection..."
                      rows={4}
                    />
                  </div>
                )}
                <div className="flex gap-3">
                  <Button
                    onClick={handleApproveOrReject}
                    disabled={
                      isApproving ||
                      (approveAction === 'REJECT' && !approveRemarks.trim())
                    }
                    className={
                      approveAction === 'APPROVE'
                        ? 'bg-green-600 hover:bg-green-700 flex-1'
                        : 'bg-red-600 hover:bg-red-700 flex-1'
                    }
                  >
                    {isApproving
                      ? 'Processing...'
                      : approveAction === 'APPROVE'
                        ? 'Approve'
                        : 'Reject'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setApproveDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <ConvertToStaffModal
            isOpen={showConvertToStaffModal}
            onClose={() => setShowConvertToStaffModal(false)}
            candidate={candidate}
            refetch={refetch}
          />

        </div>
      </main>
    </MainLayout>
  );
};

export default BackgroundVerificationDetail;
