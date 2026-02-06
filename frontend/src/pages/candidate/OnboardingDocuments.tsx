import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import MainLayout from "@/components/MainLayout";
import {
  useGetOnboardingByCurrentUserQuery,
  useUploadOnboardingDocumentMutation,
  DOCUMENT_STATUS,
  ONBOARDING_STATUS,
  type OnboardingDocument,
} from "@/store/api/onboardingApi";
import {
  FileText,
  Upload,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const OnboardingDocuments = () => {
  const {
    data: onboardingData,
    isLoading,
    refetch: refetchOnboarding,
  } = useGetOnboardingByCurrentUserQuery();

  const [uploadDocument, { isLoading: isUploading }] = useUploadOnboardingDocumentMutation();
  const [selectedDocument, setSelectedDocument] = useState<OnboardingDocument | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  const onboarding = onboardingData?.data?.onboarding;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case DOCUMENT_STATUS.COMPLETED:
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
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
            Under Review
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="w-3 h-3 mr-1" />
            Not Started
          </Badge>
        );
    }
  };

  const handleFileUpload = async (document: OnboardingDocument, file: File) => {
    if (!onboarding) {
      toast.error("Onboarding record not found");
      return;
    }

    try {
      await uploadDocument({
        onboardingId: onboarding._id,
        documentId: document._id,
        file,
      }).unwrap();
      toast.success("Document uploaded successfully");
      refetchOnboarding();
    } catch (error: any) {
      toast.error(
        error?.data?.error?.message || "Failed to upload document"
      );
    }
  };

  const handleViewDocument = (document: OnboardingDocument) => {
    if (!document.url) {
      toast.error("Document not available");
      return;
    }
    setSelectedDocument(document);
    setIsViewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading onboarding documents...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!onboarding) {
    return (
      <MainLayout>
        <div className="p-4">
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Onboarding Record Found</h3>
              <p className="text-muted-foreground">
                Your onboarding process has not been started yet. Please wait for HR to initiate the process.
              </p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  const requiredDocuments = onboarding.documents.filter((doc) => doc.required);
  const optionalDocuments = onboarding.documents.filter((doc) => !doc.required);
  const completedCount = onboarding.documents.filter(
    (doc) => doc.required && doc.status === DOCUMENT_STATUS.COMPLETED
  ).length;
  const progress = requiredDocuments.length > 0
    ? Math.round((completedCount / requiredDocuments.length) * 100)
    : 0;

  return (
    <MainLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Onboarding Documents</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage your onboarding documents
          </p>
        </div>

        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{completedCount}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {onboarding.documents.filter(
                    (doc) => doc.required && doc.status === DOCUMENT_STATUS.PENDING
                  ).length}
                </div>
                <div className="text-sm text-muted-foreground">Under Review</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {onboarding.documents.filter(
                    (doc) => doc.required && doc.status === DOCUMENT_STATUS.NOT_STARTED
                  ).length}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{requiredDocuments.length}</div>
                <div className="text-sm text-muted-foreground">Total Required</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Required Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-red-500" />
              Required Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {requiredDocuments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No required documents configured
                </p>
              ) : (
                requiredDocuments.map((doc) => (
                  <div
                    key={doc._id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {doc.type === 'form' ? (
                            <FileCheck className="w-4 h-4 text-blue-500" />
                          ) : (
                            <FileText className="w-4 h-4 text-green-500" />
                          )}
                          <h3 className="font-semibold">{doc.name}</h3>
                          <Badge variant="destructive" className="text-xs">Required</Badge>
                        </div>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground mb-2">{doc.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          {getStatusBadge(doc.status)}
                          {doc.uploadedAt && (
                            <span className="text-muted-foreground">
                              Uploaded: {format(new Date(doc.uploadedAt), "MMM dd, yyyy")}
                            </span>
                          )}
                          {doc.reviewedAt && doc.reviewedBy && (
                            <span className="text-muted-foreground">
                              Reviewed by {doc.reviewedBy.name} on{" "}
                              {format(new Date(doc.reviewedAt), "MMM dd, yyyy")}
                            </span>
                          )}
                        </div>
                        {doc.notes && (
                          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                            <strong>Admin Notes:</strong> {doc.notes}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.url ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Document
                          </Button>
                          {doc.status !== DOCUMENT_STATUS.COMPLETED && (
                            <label>
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(doc, file);
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
                                      <Upload className="w-4 h-4 mr-1" />
                                      Replace
                                    </>
                                  )}
                                </span>
                              </Button>
                            </label>
                          )}
                        </>
                      ) : (
                        <label>
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
                                handleFileUpload(doc, file);
                              }
                            }}
                            disabled={isUploading}
                          />
                          <Button size="sm" disabled={isUploading} asChild>
                            <span>
                              {isUploading ? (
                                "Uploading..."
                              ) : (
                                <>
                                  <Upload className="w-4 h-4 mr-1" />
                                  Upload Document
                                </>
                              )}
                            </span>
                          </Button>
                        </label>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Optional Documents */}
        {optionalDocuments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Optional Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optionalDocuments.map((doc) => (
                  <div
                    key={doc._id}
                    className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-blue-500" />
                          <h3 className="font-semibold">{doc.name}</h3>
                          <Badge variant="outline" className="text-xs">Optional</Badge>
                        </div>
                        {doc.description && (
                          <p className="text-sm text-muted-foreground mb-2">{doc.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          {getStatusBadge(doc.status)}
                          {doc.uploadedAt && (
                            <span className="text-muted-foreground">
                              Uploaded: {format(new Date(doc.uploadedAt), "MMM dd, yyyy")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {doc.url ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDocument(doc)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Document
                          </Button>
                          <label>
                            <input
                              type="file"
                              className="hidden"
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleFileUpload(doc, file);
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
                                    <Upload className="w-4 h-4 mr-1" />
                                    Replace
                                  </>
                                )}
                              </span>
                            </Button>
                          </label>
                        </>
                      ) : (
                        <label>
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
                                handleFileUpload(doc, file);
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
                                  <Upload className="w-4 h-4 mr-1" />
                                  Upload Document
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
            </CardContent>
          </Card>
        )}

        {/* View Document Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                {selectedDocument?.name}
              </DialogTitle>
              <DialogDescription>
                {selectedDocument?.description || "View uploaded document"}
              </DialogDescription>
            </DialogHeader>
            {selectedDocument?.url && (
              <div className="mt-4">
                {selectedDocument.url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <img
                    src={selectedDocument.url}
                    alt={selectedDocument.name}
                    className="w-full h-auto rounded-lg"
                  />
                ) : (
                  <iframe
                    src={selectedDocument.url}
                    className="w-full h-[600px] rounded-lg border"
                    title={selectedDocument.name}
                  />
                )}
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="outline"
                    onClick={() => window.open(selectedDocument.url, '_blank')}
                  >
                    Open in New Tab
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default OnboardingDocuments;

