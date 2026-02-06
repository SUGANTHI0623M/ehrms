import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Download,
  Search,
  Filter,
} from "lucide-react";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { useGetOnboardingListQuery, useVerifyDocumentMutation } from "@/store/api/onboardingApi";
import { message } from "antd";

const DOCUMENT_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  PENDING: 'PENDING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED'
} as const;

const StaffDocumentsCenter = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"COMPLETED" | "REJECTED">("COMPLETED");
  const [verifyNotes, setVerifyNotes] = useState("");

  const { data: onboardingData, isLoading, refetch } = useGetOnboardingListQuery({
    page: 1,
    limit: 1000, // Get all for now, can add pagination later
  });

  const [verifyDocument, { isLoading: isVerifying }] = useVerifyDocumentMutation();

  const onboardings = onboardingData?.data?.onboardings || [];

  // Flatten all documents with staff info
  const allDocuments = onboardings
    .filter((onboarding: any) => onboarding.staffId) // Only staff (not candidates)
    .flatMap((onboarding: any) => {
      const staff = onboarding.staffId;
      if (!staff || !onboarding.documents) return [];
      
      return onboarding.documents.map((doc: any) => ({
        ...doc,
        onboardingId: onboarding._id,
        employeeId: staff.employeeId,
        staffName: staff.name,
        staffEmail: staff.email,
        staffDepartment: staff.department,
        staffDesignation: staff.designation,
      }));
    });

  // Filter documents
  const filteredDocuments = allDocuments.filter((doc: any) => {
    const matchesSearch =
      !searchQuery ||
      doc.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.staffName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && doc.status === DOCUMENT_STATUS.PENDING) ||
      (statusFilter === "completed" && doc.status === DOCUMENT_STATUS.COMPLETED) ||
      (statusFilter === "rejected" && doc.status === DOCUMENT_STATUS.REJECTED) ||
      (statusFilter === "not_started" && doc.status === DOCUMENT_STATUS.NOT_STARTED);

    return matchesSearch && matchesStatus;
  });

  const handleVerify = async () => {
    if (!selectedDocument) return;

    try {
      await verifyDocument({
        onboardingId: selectedDocument.onboardingId,
        documentId: selectedDocument._id,
        status: verifyStatus,
        notes: verifyNotes || undefined,
      }).unwrap();

      message.success(
        `Document ${verifyStatus === "COMPLETED" ? "approved" : "rejected"} successfully`
      );
      setIsVerifyDialogOpen(false);
      setSelectedDocument(null);
      setVerifyNotes("");
      refetch();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to verify document");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case DOCUMENT_STATUS.COMPLETED:
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Verified
          </Badge>
        );
      case DOCUMENT_STATUS.REJECTED:
        return (
          <Badge className="bg-red-500">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case DOCUMENT_STATUS.PENDING:
        return (
          <Badge className="bg-yellow-500">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <FileText className="w-3 h-3 mr-1" />
            Not Uploaded
          </Badge>
        );
    }
  };

  const pendingCount = filteredDocuments.filter(
    (d) => d.status === DOCUMENT_STATUS.PENDING
  ).length;
  const completedCount = filteredDocuments.filter(
    (d) => d.status === DOCUMENT_STATUS.COMPLETED
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Documents Center</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Review and verify staff documents by Employee ID
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            Pending: {pendingCount}
          </Badge>
          <Badge variant="outline" className="text-sm bg-green-50">
            Verified: {completedCount}
          </Badge>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by Employee ID, Name, or Document Name..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending Review</SelectItem>
                <SelectItem value="completed">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="not_started">Not Uploaded</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Documents Table */}
      <Card>
        <CardHeader>
          <CardTitle>Staff Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                No documents found
              </p>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "Try adjusting your filters"
                  : "No documents have been uploaded yet"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Document Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc: any) => (
                    <TableRow key={`${doc.onboardingId}_${doc._id}`}>
                      <TableCell className="font-medium">
                        {doc.employeeId}
                      </TableCell>
                      <TableCell>{doc.staffName}</TableCell>
                      <TableCell>{doc.staffDepartment}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {doc.name}
                          {doc.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{doc.type}</TableCell>
                      <TableCell>{getStatusBadge(doc.status)}</TableCell>
                      <TableCell>
                        {doc.uploadedAt
                          ? format(new Date(doc.uploadedAt), "MMM dd, yyyy")
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {doc.url && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(doc.url, "_blank")}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const link = document.createElement("a");
                                  link.href = doc.url;
                                  link.download = doc.name;
                                  link.click();
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {doc.status === DOCUMENT_STATUS.PENDING && (
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedDocument(doc);
                                setVerifyStatus("COMPLETED");
                                setVerifyNotes("");
                                setIsVerifyDialogOpen(true);
                              }}
                            >
                              Review
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verify Dialog */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Document</DialogTitle>
            <DialogDescription>
              Review and verify the document for {selectedDocument?.staffName} (
              {selectedDocument?.employeeId})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Document Name</Label>
              <p className="text-sm font-medium">{selectedDocument?.name}</p>
            </div>
            {selectedDocument?.url && (
              <div>
                <Label>Document Preview</Label>
                <div className="mt-2">
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedDocument.url, "_blank")}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Document
                  </Button>
                </div>
              </div>
            )}
            <div>
              <Label>Verification Status *</Label>
              <Select
                value={verifyStatus}
                onValueChange={(value: "COMPLETED" | "REJECTED") =>
                  setVerifyStatus(value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPLETED">Approve (Verified)</SelectItem>
                  <SelectItem value="REJECTED">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes or comments about this document..."
                value={verifyNotes}
                onChange={(e) => setVerifyNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsVerifyDialogOpen(false);
                  setSelectedDocument(null);
                  setVerifyNotes("");
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleVerify} disabled={isVerifying}>
                {isVerifying
                  ? "Processing..."
                  : verifyStatus === "COMPLETED"
                  ? "Approve Document"
                  : "Reject Document"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StaffDocumentsCenter;
