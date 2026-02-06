import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Upload, CheckCircle2, Clock, Eye, X, Plus, List, Table as TableIcon, ArrowUpDown, ArrowUp, ArrowDown, XCircle } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import {
  useGetOnboardingListQuery,
  useGetOnboardingStatsQuery,
  useGetOnboardingByIdQuery,
  useGetOnboardingByStaffIdQuery,
  useUpdateDocumentStatusMutation,
  useUploadOnboardingDocumentMutation,
  useInitializeOnboardingMutation,
  useCreateDummyCandidateMutation,
  useApproveOnboardingMutation,
  useRemoveDocumentMutation,
  useAddDocumentMutation,
  useNotifyCandidateMutation,
  useVerifyDocumentMutation,
  Onboarding,
  OnboardingDocument,
  DOCUMENT_STATUS,
  ONBOARDING_STATUS,
} from "@/store/api/onboardingApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { toast } from "sonner";
import { format } from "date-fns";
import { Pagination } from "@/components/ui/Pagination";

type ViewMode = "list" | "table";
type SortField = "name" | "joiningDate" | "status" | null;
type SortDirection = "asc" | "desc" | null;

const OnboardingPage = () => {
  // Load view mode from localStorage, default to "list"
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem("onboardingViewMode");
    return (saved === "list" || saved === "table") ? saved : "list";
  });

  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  const [selectedOnboardingId, setSelectedOnboardingId] = useState<string | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  // Fetch detailed onboarding data when dialog opens
  const { data: detailedOnboardingData, refetch: refetchDetailedOnboarding, isLoading: isLoadingDetails } = useGetOnboardingByIdQuery(
    selectedOnboardingId || '',
    { 
      skip: !selectedOnboardingId,
      // Force refetch when ID changes
      refetchOnMountOrArgChange: true
    }
  );
  
  const selectedOnboarding = detailedOnboardingData?.data?.onboarding || null;
  
  // Debug logging
  useEffect(() => {
    if (selectedOnboardingId) {
      const fetchedId = selectedOnboarding?._id ? 
        (typeof selectedOnboarding._id === 'string' ? selectedOnboarding._id : String(selectedOnboarding._id)) : 
        null;
      const selectedIdStr = typeof selectedOnboardingId === 'string' ? selectedOnboardingId : String(selectedOnboardingId);
      
      console.log('[Onboarding] Selected ID:', selectedIdStr);
      console.log('[Onboarding] Fetched onboarding ID:', fetchedId);
      console.log('[Onboarding] IDs Match:', fetchedId === selectedIdStr);
      
      if (fetchedId && fetchedId !== selectedIdStr) {
        console.error('[Onboarding] MISMATCH! Selected:', selectedIdStr, 'but fetched:', fetchedId);
      }
    }
  }, [selectedOnboardingId, selectedOnboarding]);
  const [isCreateCandidateDialogOpen, setIsCreateCandidateDialogOpen] = useState(false);
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [page, setPage] = useState(1); // Pagination state
  const [pageSize, setPageSize] = useState(10); // Default 10
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);



  // Persist view mode to localStorage
  useEffect(() => {
    localStorage.setItem("onboardingViewMode", viewMode);
  }, [viewMode]);

  const { data: statsData, isLoading: statsLoading } = useGetOnboardingStatsQuery();
  const { data: onboardingData, isLoading: onboardingLoading, refetch: refetchOnboardingList } = useGetOnboardingListQuery({
    page: page,
    limit: pageSize,
    status: selectedStatus !== "all" ? (selectedStatus as any) : undefined,
  });
  const { data: staffData } = useGetStaffQuery({ page: 1, limit: 100 });

  const [updateDocumentStatus] = useUpdateDocumentStatusMutation();
  const [uploadOnboardingDocument] = useUploadOnboardingDocumentMutation();
  const [initializeOnboarding] = useInitializeOnboardingMutation();
  const [createDummyCandidate, { isLoading: isCreatingDummy }] = useCreateDummyCandidateMutation();
  const [approveOnboarding, { isLoading: isApproving }] = useApproveOnboardingMutation();
  const [removeDocument, { isLoading: isRemoving }] = useRemoveDocumentMutation();
  const [addDocument, { isLoading: isAddingDocument }] = useAddDocumentMutation();
  const [notifyCandidate, { isLoading: isNotifying }] = useNotifyCandidateMutation();
  const [verifyDocument, { isLoading: isVerifying }] = useVerifyDocumentMutation();
  
  const [isAddDocumentDialogOpen, setIsAddDocumentDialogOpen] = useState(false);
  const [newDocumentName, setNewDocumentName] = useState("");
  const [newDocumentType, setNewDocumentType] = useState("document");
  const [newDocumentRequired, setNewDocumentRequired] = useState(true);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [selectedDocumentForVerification, setSelectedDocumentForVerification] = useState<{ docId: string; docName: string } | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [verificationAction, setVerificationAction] = useState<"COMPLETED" | "REJECTED">("COMPLETED");

  const stats = statsData?.data || {
    activeOnboarding: 0,
    completed: 0,
    pendingDocuments: 0,
  };

  const onboardings = onboardingData?.data?.onboardings || [];

  const handleViewDetails = (onboardingId: string) => {
    // Ensure we use the string ID directly
    const id = typeof onboardingId === 'string' ? onboardingId : String(onboardingId);
    console.log('[Onboarding] Viewing details for ID:', id);
    
    // Set the ID and open dialog - the query will automatically refetch
    setSelectedOnboardingId(id);
    setIsDetailsDialogOpen(true);
  };

  const getFileUrl = (path: string) => {
    if (!path) return "";
    if (path.startsWith("http")) return path;

    // Get backend URL from env or default
    // VITE_API_URL is "http://localhost:5005/api"
    // We need "http://localhost:5005"
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5005/api";
    // Construct origin safely
    let origin;
    try {
      origin = new URL(apiUrl).origin;
    } catch (e) {
      origin = "http://localhost:5005";
    }

    // Ensure path starts with /
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;

    return `${origin}${normalizedPath}`;
  };

  const handleDocumentUpload = async (
    onboardingId: string,
    documentId: string,
    file: File
  ) => {
    if (!onboardingId || !documentId) {
      toast.error("Missing onboarding or document ID");
      return;
    }

    try {
      setUploadingDocId(documentId);
      const response = await uploadOnboardingDocument({
        onboardingId,
        documentId,
        file,
      }).unwrap();

      toast.success("Document uploaded successfully");

      // Refetch detailed onboarding to update the dialog view
      if (selectedOnboardingId) {
        refetchDetailedOnboarding();
      }
    } catch (error: any) {
      console.error("Document upload error:", error);
      toast.error(error?.data?.error?.message || "Failed to upload document");
    } finally {
      setUploadingDocId(null);
    }
  };



  const handleAddDocument = async () => {
    if (!selectedOnboarding || !newDocumentName.trim()) {
      toast.error("Please provide a document name");
      return;
    }

    try {
      const result = await addDocument({
        onboardingId: selectedOnboarding._id,
        name: newDocumentName.trim(),
        type: newDocumentType,
        required: newDocumentRequired,
      }).unwrap();

      toast.success("Document added successfully");
      setNewDocumentName("");
      setNewDocumentType("document");
      setNewDocumentRequired(true);
      setIsAddDocumentDialogOpen(false);
      
      // Refetch detailed onboarding to update the dialog view
      if (selectedOnboardingId) {
        refetchDetailedOnboarding();
      }
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to add document");
    }
  };

  const handleNotifyCandidate = async () => {
    if (!selectedOnboarding) return;

    try {
      await notifyCandidate({ onboardingId: selectedOnboarding._id }).unwrap();
      toast.success("Candidate notified successfully");
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to notify candidate");
    }
  };

  const handleVerifyDocument = async () => {
    if (!selectedOnboarding || !selectedDocumentForVerification) return;

    try {
      const result = await verifyDocument({
        onboardingId: selectedOnboarding._id,
        documentId: selectedDocumentForVerification.docId,
        status: verificationAction,
        notes: verificationNotes || undefined,
      }).unwrap();

      toast.success(
        verificationAction === "COMPLETED"
          ? "Document approved successfully"
          : "Document rejected"
      );
      setIsVerifyDialogOpen(false);
      setSelectedDocumentForVerification(null);
      setVerificationNotes("");
      setVerificationAction("COMPLETED");

      // Refetch detailed onboarding to update the dialog view
      if (selectedOnboardingId) {
        refetchDetailedOnboarding();
      }
      
      // Refetch onboarding list to update the main view
      refetchOnboardingList();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to verify document");
    }
  };

  const openVerifyDialog = (docId: string, docName: string, currentStatus: string, action?: "COMPLETED" | "REJECTED") => {
    setSelectedDocumentForVerification({ docId, docName });
    setVerificationAction(action || (currentStatus === DOCUMENT_STATUS.REJECTED ? "REJECTED" : "COMPLETED"));
    setVerificationNotes("");
    setIsVerifyDialogOpen(true);
  };

  const handleRemoveDocument = async (onboardingId: string, documentId: string) => {
    if (!confirm("Are you sure you want to remove this document? It will be reset to Not Started.")) {
      return;
    }

    try {
      const response = await removeDocument({ onboardingId, documentId }).unwrap();
      toast.success("Document removed successfully");
      // Refetch detailed onboarding to update the dialog view
      if (selectedOnboardingId) {
        refetchDetailedOnboarding();
      }
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to remove document");
    }
  };

  const handleApproveOnboarding = async () => {
    if (!selectedOnboarding) return;

    // Check if all required documents are uploaded
    const missingDocs = selectedOnboarding.documents.filter(
      doc => doc.required && doc.status === DOCUMENT_STATUS.NOT_STARTED
    );

    if (missingDocs.length > 0) {
      toast.error(`Cannot approve. Missing: ${missingDocs.map(d => d.name).join(", ")}`);
      return;
    }

    try {
      const response = await approveOnboarding({ onboardingId: selectedOnboarding._id }).unwrap();
      toast.success("All documents approved and onboarding completed!");
      // Refetch detailed onboarding to update the dialog view
      if (selectedOnboardingId) {
        refetchDetailedOnboarding();
      }
      // Optionally close dialog or show success state
      setIsDetailsDialogOpen(false);
    } catch (error: any) {
      if (error?.data?.error?.missingDocs) {
        toast.error(`Missing documents: ${error.data.error.missingDocs.join(", ")}`);
      } else {
        toast.error(error?.data?.error?.message || "Failed to approve documents");
      }
    }
  };

  const handleCreateDummyCandidate = async () => {
    try {
      const result = await createDummyCandidate().unwrap();
      toast.success(
        `Dummy candidate created successfully! Default password: ${result.data.defaultPassword}`,
        { duration: 10000 }
      );
      setIsCreateCandidateDialogOpen(false);
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to create dummy candidate");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case ONBOARDING_STATUS.COMPLETED:
        return "default";
      case ONBOARDING_STATUS.IN_PROGRESS:
        return "secondary";
      default:
        return "outline";
    }
  };

  const getDocumentStatusBadgeVariant = (status: string) => {
    switch (status) {
      case DOCUMENT_STATUS.COMPLETED:
        return "default";
      case DOCUMENT_STATUS.PENDING:
        return "secondary";
      case DOCUMENT_STATUS.REJECTED:
        return "destructive";
      default:
        return "outline";
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  // Calculate progress and status for an onboarding record
  const calculateOnboardingMetrics = (onboarding: Onboarding) => {
    const completedDocs = onboarding.documents.filter(
      (doc) => doc.status === DOCUMENT_STATUS.COMPLETED
    ).length;
    const totalDocs = onboarding.documents.length;
    const progress = totalDocs > 0 ? Math.round((completedDocs / totalDocs) * 100) : 0;

    // Determine status based on progress
    let status: typeof ONBOARDING_STATUS[keyof typeof ONBOARDING_STATUS] = ONBOARDING_STATUS.NOT_STARTED;
    if (progress === 100) {
      status = ONBOARDING_STATUS.COMPLETED;
    } else if (progress > 0) {
      status = ONBOARDING_STATUS.IN_PROGRESS;
    }

    return { completedDocs, totalDocs, progress, status };
  };

  // Sort onboardings based on sort field and direction
  // Filter out onboardings for HIRED candidates
  const filteredOnboardings = onboardings.filter((onboarding: any) => {
    const candidate = onboarding.candidateId;
    if (candidate && typeof candidate === 'object' && candidate.status) {
      return candidate.status !== 'HIRED';
    }
    return true; // Keep if candidate status is unknown
  });

  const sortedOnboardings = [...filteredOnboardings].sort((a, b) => {
    if (!sortField || !sortDirection) return 0;

    let comparison = 0;
    switch (sortField) {
      case "name": {
        const nameA = a.staffId?.name || (a.candidateId ? `${a.candidateId.firstName} ${a.candidateId.lastName}` : "");
        const nameB = b.staffId?.name || (b.candidateId ? `${b.candidateId.firstName} ${b.candidateId.lastName}` : "");
        comparison = nameA.localeCompare(nameB);
        break;
      }
      case "joiningDate": {
        const dateA = a.staffId?.joiningDate ? new Date(a.staffId.joiningDate).getTime() : 0;
        const dateB = b.staffId?.joiningDate ? new Date(b.staffId.joiningDate).getTime() : 0;
        comparison = dateA - dateB;
        break;
      }
      case "status": {
        const statusA = calculateOnboardingMetrics(a).status;
        const statusB = calculateOnboardingMetrics(b).status;
        comparison = statusA.localeCompare(statusB);
        break;
      }
      default:
        return 0;
    }
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortField(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      // New field, start with ascending
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1" />;
    if (sortDirection === "asc") return <ArrowUp className="w-4 h-4 ml-1" />;
    if (sortDirection === "desc") return <ArrowDown className="w-4 h-4 ml-1" />;
    return <ArrowUpDown className="w-4 h-4 ml-1" />;
  };

  return (
    <MainLayout>
      <main className="p-3 sm:p-5">
        <div className="mx-auto space-y-6">
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Document Collection
            </h1>
            <div className="flex gap-2">
              <Dialog
                open={isCreateCandidateDialogOpen}
                onOpenChange={setIsCreateCandidateDialogOpen}
              >
                <DialogTrigger asChild>
                  {/* <Button variant="outline" className="w-full sm:w-auto">
                    <Plus className="w-4 h-4 mr-2" /> Create Dummy Candidate
                  </Button> */}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Dummy Candidate</DialogTitle>
                    <DialogDescription>
                      Create a test candidate for onboarding testing
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <p className="text-sm text-muted-foreground">
                      This feature will create a dummy candidate that can be used for testing
                      the onboarding flow. The candidate will need to go through the interview
                      process, offer acceptance, and background verification before appearing
                      in the onboarding module.
                    </p>
                    {/* <Button
                      onClick={handleCreateDummyCandidate}
                      className="w-full"
                      disabled={isCreatingDummy}
                    >
                      {isCreatingDummy ? "Creating..." : "Create Dummy Candidate"}
                    </Button> */}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* FILTER & VIEW TOGGLE */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="status-filter">Filter by Status:</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status-filter" className="w-[180px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active (Pending)</SelectItem>
                  <SelectItem value={ONBOARDING_STATUS.NOT_STARTED}>Not Started</SelectItem>
                  <SelectItem value={ONBOARDING_STATUS.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={ONBOARDING_STATUS.COMPLETED}>Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="flex items-center gap-2"
              >
                <List className="w-4 h-4" />
                List View
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="flex items-center gap-2"
              >
                <TableIcon className="w-4 h-4" />
                Table View
              </Button>
            </div>
          </div>

          {/* 3 STATS BOXES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Active Onboarding
                </CardTitle>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {statsLoading ? "..." : stats.activeOnboarding}
                </div>
                <p className="text-xs text-muted-foreground mt-1">In progress</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Completed
                </CardTitle>
                <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {statsLoading ? "..." : stats.completed}
                </div>
                <p className="text-xs text-green-600 mt-1">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending Documents
                </CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {statsLoading ? "..." : stats.pendingDocuments}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Across all employees</p>
              </CardContent>
            </Card>
          </div>

          {/* PROGRESS CARD */}
          <Card>
            <CardHeader>
              <CardTitle>Onboarding Progress</CardTitle>
            </CardHeader>
            <CardContent>
              {onboardingLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : filteredOnboardings.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No onboarding records found. Convert candidates to employees to start onboarding.
                </div>
              ) : viewMode === "list" ? (
                // LIST VIEW (existing card-based layout)
                <div className="space-y-4">
                  {sortedOnboardings.map((onboarding) => {
                    const staff = onboarding.staffId;
                    const candidate = onboarding.candidateId;
                    const name = staff?.name || (candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown");
                    const designation = staff?.designation || candidate?.position || "-";
                    const department = staff?.department || "-";
                    const id = staff?.employeeId || "Pending";
                    const joiningDate = staff?.joiningDate ? format(new Date(staff.joiningDate), "yyyy-MM-dd") : "-";

                    const { completedDocs, totalDocs, progress, status } = calculateOnboardingMetrics(onboarding);

                    return (
                      <div
                        key={onboarding._id}
                        className="p-4 rounded-lg border space-y-3 hover:bg-accent/40 transition"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <h3 className="font-semibold">{name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {designation} - {department}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Employee ID: {id} | Joining: {joiningDate}
                            </p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(status)}>
                            {formatStatus(status)}
                          </Badge>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Documents: {completedDocs}/{totalDocs}
                            </span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <Progress value={progress} className="h-2" />
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={(e) => {
                            e.stopPropagation();
                            const id = typeof onboarding._id === 'string' ? onboarding._id : String(onboarding._id);
                            console.log('[Onboarding] Button clicked for ID:', id, 'Onboarding:', onboarding);
                            handleViewDetails(id);
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // TABLE VIEW (new compact layout)
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("name")}
                        >
                          <div className="flex items-center">
                            Employee Name
                            {getSortIcon("name")}
                          </div>
                        </TableHead>
                        <TableHead>Job Title</TableHead>
                        <TableHead>Employee ID</TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("joiningDate")}
                        >
                          <div className="flex items-center">
                            Joining Date
                            {getSortIcon("joiningDate")}
                          </div>
                        </TableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead>Progress</TableHead>
                        <TableHead
                          className="cursor-pointer hover:bg-muted/50"
                          onClick={() => handleSort("status")}
                        >
                          <div className="flex items-center">
                            Status
                            {getSortIcon("status")}
                          </div>
                        </TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedOnboardings.map((onboarding) => {
                        const staff = onboarding.staffId;
                        const candidate = onboarding.candidateId;
                        const name = staff?.name || (candidate ? `${candidate.firstName} ${candidate.lastName}` : "Unknown");
                        const designation = staff?.designation || candidate?.position || "-";
                        const department = staff?.department || "-";
                        const id = staff?.employeeId || "Pending";
                        const joiningDate = staff?.joiningDate ? format(new Date(staff.joiningDate), "yyyy-MM-dd") : "-";

                        const { completedDocs, totalDocs, progress, status } = calculateOnboardingMetrics(onboarding);

                        return (
                          <TableRow
                            key={onboarding._id}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <TableCell className="font-medium">{name}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{designation}</div>
                                <div className="text-xs text-muted-foreground">{department}</div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{id}</TableCell>
                            <TableCell>
                              {joiningDate}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm">
                                {completedDocs} / {totalDocs}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 min-w-[120px]">
                                <Progress value={progress} className="h-2 flex-1" />
                                <span className="text-sm font-medium w-10 text-right">{progress}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(status)}>
                                {formatStatus(status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const id = typeof onboarding._id === 'string' ? onboarding._id : String(onboarding._id);
                                  console.log('[Onboarding] Table button clicked for ID:', id, 'Onboarding:', onboarding);
                                  handleViewDetails(id);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>

            {/* Pagination Controls */}
            {onboardingData?.data && (
              <div className="mt-6 pt-4 border-t">
                <Pagination
                  page={onboardingData.data.pagination?.page || page}
                  pageSize={pageSize}
                  total={onboardingData.data.pagination?.total || (onboardingData.data.onboardings?.length || 0)}
                  pages={onboardingData.data.pagination?.pages || Math.ceil((onboardingData.data.pagination?.total || onboardingData.data.onboardings?.length || 0) / pageSize)}
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

          {/* DETAILS DIALOG */}
          <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  Onboarding Details - {selectedOnboarding?.staffId?.name || (selectedOnboarding?.candidateId ? `${selectedOnboarding.candidateId.firstName} ${selectedOnboarding.candidateId.lastName}` : "Unknown")}
                </DialogTitle>
                <DialogDescription>
                  Manage documents and track onboarding progress
                </DialogDescription>
              </DialogHeader>

              {selectedOnboarding && (
                <div className="space-y-6 py-4">
                  {/* Status Banner */}
                  {selectedOnboarding.status === ONBOARDING_STATUS.COMPLETED && (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center gap-3 text-green-700">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                      <div>
                        <h4 className="font-semibold">Documents Completed</h4>
                        <p className="text-sm">
                          All documents have been collected. This candidate is now ready for background verification.
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Employee Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <Label className="text-xs text-muted-foreground">Employee ID</Label>
                      <p className="font-medium">{selectedOnboarding.staffId?.employeeId || "Pending"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Department</Label>
                      <p className="font-medium">{selectedOnboarding.staffId?.department || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Designation</Label>
                      <p className="font-medium">{selectedOnboarding.staffId?.designation || selectedOnboarding.candidateId?.position || "-"}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Joining Date</Label>
                      <p className="font-medium">
                        {selectedOnboarding.staffId?.joiningDate ? format(new Date(selectedOnboarding.staffId.joiningDate), "yyyy-MM-dd") : "-"}
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Overall Progress</Label>
                      <span className="font-bold">{selectedOnboarding.progress}%</span>
                    </div>
                    <Progress value={selectedOnboarding.progress} className="h-3" />
                  </div>

                  {/* Documents List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Required Documents</Label>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAddDocumentDialogOpen(true)}
                          className="gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add Document
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNotifyCandidate}
                          disabled={isNotifying}
                          className="gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          {isNotifying ? "Notifying..." : "Notify Candidate"}
                        </Button>
                      </div>
                    </div>
                    {/* Document Summary */}
                    <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Total Documents</p>
                          <p className="text-lg font-semibold">{selectedOnboarding.documents.length}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Uploaded</p>
                          <p className="text-lg font-semibold text-green-600">
                            {selectedOnboarding.documents.filter(d => d.url).length}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Pending Review</p>
                          <p className="text-lg font-semibold text-yellow-600">
                            {selectedOnboarding.documents.filter(d => d.status === DOCUMENT_STATUS.PENDING).length}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Verified</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {selectedOnboarding.documents.filter(d => d.status === DOCUMENT_STATUS.COMPLETED).length}
                          </p>
                        </div>
                      </div>
                    </div>

                    {selectedOnboarding.documents.map((doc) => (
                      <div
                        key={doc._id}
                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border"
                      >
                        <div className="flex items-start gap-3 flex-1">
                          {doc.status === DOCUMENT_STATUS.COMPLETED ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                          ) : doc.status === DOCUMENT_STATUS.REJECTED ? (
                            <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                          ) : doc.status === DOCUMENT_STATUS.PENDING ? (
                            <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                          ) : (
                            <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{doc.name}</p>
                              {doc.required && (
                                <Badge variant="outline" className="text-xs">Required</Badge>
                              )}
                            </div>
                            {doc.url ? (
                              <div className="mt-2 space-y-1">
                                <div className="flex items-center gap-2">
                                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                                  <span className="text-xs text-green-600 font-medium">Document Uploaded</span>
                                </div>
                                {doc.uploadedAt && (
                                  <span className="text-xs text-muted-foreground block">
                                    Uploaded: {format(new Date(doc.uploadedAt), "MMM dd, yyyy HH:mm")}
                                  </span>
                                )}
                                {doc.status === DOCUMENT_STATUS.PENDING && (
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    <Clock className="w-3 h-3 mr-1" />
                                    Awaiting Verification
                                  </Badge>
                                )}
                                {doc.reviewedBy && (
                                  <div className="mt-1">
                                    <span className="text-xs text-muted-foreground block">
                                      Reviewed by: <span className="font-medium">{doc.reviewedBy.name}</span>
                                      {doc.reviewedAt && ` on ${format(new Date(doc.reviewedAt), "MMM dd, yyyy")}`}
                                    </span>
                                  </div>
                                )}
                                {doc.notes && (
                                  <div className="mt-1 p-2 bg-muted rounded text-xs text-muted-foreground italic">
                                    <strong>Review Note:</strong> {doc.notes}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="mt-1">
                                {doc.required ? (
                                  <span className="text-xs text-red-500 font-medium">Required - Not Uploaded</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Optional - Not Uploaded</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Actions */}
                        <div className="flex gap-1">
                          {/* Upload/Update Button - Show if NO document is present */}
                          {!doc.url && (
                            <label className="cursor-pointer">
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // Validate file size (10MB)
                                    if (file.size > 10 * 1024 * 1024) {
                                      toast.error("File size must be less than 10MB");
                                      return;
                                    }
                                    // Validate file type
                                    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
                                    if (!allowedTypes.includes(file.type)) {
                                      toast.error("Only PDF, JPEG, JPG, and PNG files are allowed");
                                      return;
                                    }
                                    handleDocumentUpload(
                                      selectedOnboarding._id,
                                      doc._id,
                                      file
                                    );
                                  }
                                }}
                                disabled={uploadingDocId === doc._id}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={uploadingDocId === doc._id}
                                asChild
                                className="gap-2"
                              >
                                <span>
                                  <Upload className="w-3 h-3" />
                                  {uploadingDocId === doc._id ? "Uploading..." : "Upload"}
                                </span>
                              </Button>
                            </label>
                          )}

                          {/* View Document Button */}
                          {doc.url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPreviewDoc({ url: getFileUrl(doc.url), name: doc.name })}
                              title="View Document"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                          )}

                          {/* Verify/Approve Button - Show if document is PENDING */}
                          {doc.url && doc.status === DOCUMENT_STATUS.PENDING && (
                            <>
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700 text-white gap-1"
                                onClick={() => openVerifyDialog(doc._id, doc.name, doc.status, "COMPLETED")}
                                disabled={isVerifying}
                                title="Approve Document"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => openVerifyDialog(doc._id, doc.name, doc.status, "REJECTED")}
                                disabled={isVerifying}
                                title="Reject Document"
                              >
                                <X className="w-3 h-3" />
                                Reject
                              </Button>
                            </>
                          )}

                          {/* Re-verify Button - Show if document is REJECTED */}
                          {doc.url && doc.status === DOCUMENT_STATUS.REJECTED && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => openVerifyDialog(doc._id, doc.name, doc.status)}
                              disabled={isVerifying}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Re-verify
                            </Button>
                          )}

                          {/* Remove Button - Show ONLY if document IS present and not COMPLETED */}
                          {doc.url && doc.status !== DOCUMENT_STATUS.COMPLETED && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 gap-2"
                              onClick={() => handleRemoveDocument(selectedOnboarding._id, doc._id)}
                              disabled={isRemoving}
                              title="Remove Document"
                            >
                              <X className="w-3 h-3" />
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Centralized Approval Footer */}
                  {selectedOnboarding.status !== ONBOARDING_STATUS.COMPLETED && (
                    <div className="mt-8 pt-4 border-t flex items-center justify-end gap-3 sticky bottom-0 bg-background py-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsDetailsDialogOpen(false)}
                      >
                        Save as Draft
                      </Button>
                      <Button
                        onClick={handleApproveOnboarding}
                        disabled={isApproving || selectedOnboarding.documents.some(d => d.required && (d.status === DOCUMENT_STATUS.NOT_STARTED))}
                        className={selectedOnboarding.documents.some(d => d.required && (d.status === DOCUMENT_STATUS.NOT_STARTED)) ? "opacity-50 cursor-not-allowed" : ""}
                      >
                        {isApproving ? "Approving..." : "Approve Documents"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* PREVIEW DIALOG */}
          <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
            <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0">
              <div className="p-4 border-b flex justify-between items-center bg-muted/40 backdrop-blur">
                <h2 className="text-lg font-semibold">{previewDoc?.name}</h2>
              </div>
              <div className="flex-1 w-full h-full bg-slate-50 relative overflow-hidden">
                {previewDoc?.url && (
                  <iframe
                    src={previewDoc.url}
                    className="w-full h-full border-none"
                    title={previewDoc.name}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* VERIFY DOCUMENT DIALOG */}
          <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {verificationAction === "COMPLETED" ? "Approve" : "Reject"} Document
                </DialogTitle>
                <DialogDescription>
                  {selectedDocumentForVerification?.docName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Verification Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add any notes or comments about this document..."
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    rows={4}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsVerifyDialogOpen(false);
                      setSelectedDocumentForVerification(null);
                      setVerificationNotes("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleVerifyDocument}
                    disabled={isVerifying}
                    variant={verificationAction === "COMPLETED" ? "default" : "destructive"}
                    className={verificationAction === "COMPLETED" ? "bg-green-600 hover:bg-green-700" : ""}
                  >
                    {isVerifying
                      ? "Processing..."
                      : verificationAction === "COMPLETED"
                      ? "Approve Document"
                      : "Reject Document"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* ADD DOCUMENT DIALOG */}
          <Dialog open={isAddDocumentDialogOpen} onOpenChange={setIsAddDocumentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Document</DialogTitle>
                <DialogDescription>
                  Add a new document requirement for this candidate
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="document-name">Document Name *</Label>
                  <Input
                    id="document-name"
                    placeholder="e.g., Passport Copy, Driving License"
                    value={newDocumentName}
                    onChange={(e) => setNewDocumentName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="document-type">Document Type *</Label>
                  <Select value={newDocumentType} onValueChange={setNewDocumentType}>
                    <SelectTrigger id="document-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="form">Form</SelectItem>
                      <SelectItem value="certificate">Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="document-required"
                    checked={newDocumentRequired}
                    onChange={(e) => setNewDocumentRequired(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="document-required" className="cursor-pointer">
                    Required Document
                  </Label>
                </div>
                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDocumentDialogOpen(false);
                      setNewDocumentName("");
                      setNewDocumentType("document");
                      setNewDocumentRequired(true);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddDocument} disabled={isAddingDocument || !newDocumentName.trim()}>
                    {isAddingDocument ? "Adding..." : "Add Document"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </MainLayout>
  );
};

export default OnboardingPage;
