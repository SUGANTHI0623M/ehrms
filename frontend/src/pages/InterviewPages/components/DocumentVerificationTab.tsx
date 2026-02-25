import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    FileText,
    Eye,
    Download,
    CreditCard,
    MapPin,
    User,
    GraduationCap,
    Clock,
    CheckCircle2,
    XCircle,
    Upload,
} from "lucide-react";
import { useUploadDocumentMutation } from "@/store/api/backgroundVerificationApi";
import { toast } from "sonner";

const DOCUMENT_CATEGORY_LABELS: Record<string, { label: string; icon: any }> = {
    PAN_CARD: { label: "PAN Card", icon: CreditCard },
    AADHAAR_CARD: { label: "Aadhaar Card", icon: CreditCard },
    ADDRESS_PROOF: { label: "Address Proof", icon: MapPin },
    IDENTITY_PROOF: { label: "Identity Proof", icon: User },
    EDUCATIONAL_CERTIFICATES: { label: "Educational Certificates", icon: GraduationCap },
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

interface DocumentVerificationTabProps {
    verificationItems: any[];
    onVerify: (type: 'document', category: string, label: string) => void;
    candidateId: string;
}

const DocumentVerificationTab: React.FC<DocumentVerificationTabProps> = ({
    verificationItems,
    onVerify,
    candidateId,
}) => {
    const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);
    const [uploadDocument, { isLoading: isUploading }] = useUploadDocumentMutation();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, category: string) => {
        const file = e.target.files?.[0];
        if (!file || !candidateId) return;

        try {
            await uploadDocument({
                candidateId,
                category: category as any,
                file,
            }).unwrap();
            toast.success("Document re-uploaded successfully");
        } catch (error: any) {
            toast.error(error?.data?.error?.message || "Failed to upload document");
        }
    };

    const getFileUrl = (path: string) => {
        if (!path) return "";
        if (path.startsWith("http")) return path;

        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5005/api";
        let origin;
        try {
            origin = new URL(apiUrl).origin;
        } catch (e) {
            origin = "http://localhost:5005";
        }

        const normalizedPath = path.startsWith("/") ? path : `/${path}`;
        return `${origin}${normalizedPath}`;
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Document Verification
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {verificationItems
                        .filter((item) => item.documents && item.documents.length > 0) // Only show items with documents from onboarding
                        .map((item) => {
                            const categoryInfo = DOCUMENT_CATEGORY_LABELS[item.category] || {
                                label: item.category,
                                icon: FileText,
                            };
                            const Icon = categoryInfo.icon;

                            return (
                                <div key={item.category} className="p-4 border rounded-lg space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Icon className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <h3 className="font-semibold">{categoryInfo.label}</h3>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Document verified during onboarding
                                                </p>
                                                {item.remarks && (
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {item.remarks}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {getStatusBadge(item.status)}
                                            {item.status !== 'VERIFIED' && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() =>
                                                        onVerify('document', item.category, categoryInfo.label)
                                                    }
                                                >
                                                    Verify
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {item.documents.length > 0 ? (
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Documents from Onboarding ({item.documents.length})
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                {/* Show all documents, not just the latest */}
                                                {item.documents.map((doc: any, idx: number) => (
                                                    <div
                                                        key={idx}
                                                        className="flex items-center justify-between p-3 bg-muted rounded-lg border"
                                                    >
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <span className="text-sm font-medium truncate block" title={doc.name}>
                                                                    {doc.name}
                                                                </span>
                                                                {doc.uploadedAt && (
                                                                    <span className="text-xs text-muted-foreground">
                                                                        Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-shrink-0">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => setPreviewDoc({ url: getFileUrl(doc.url), name: doc.name })}
                                                                title="View Document"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => window.open(getFileUrl(doc.url), '_blank')}
                                                                title="Download Document"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-muted-foreground">
                                            No documents uploaded yet
                                        </p>
                                    )}

                                    {item.status === 'REJECTED' && (
                                        <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                                    <strong>Rejection Reason:</strong> {item.rejectionReason || "No reason provided"}
                                                </p>
                                                {item.rejectedAt && (
                                                    <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                                                        Rejected on: {new Date(item.rejectedAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                            <label className="cursor-pointer ml-4">
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                    onChange={(e) => handleFileUpload(e, item.category)}
                                                    disabled={isUploading}
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 gap-2 bg-white hover:bg-red-50 text-red-700 border-red-200"
                                                    asChild
                                                    disabled={isUploading}
                                                >
                                                    <span className="pointer-events-none">
                                                        <Upload className="w-3 h-3" />
                                                        Re-upload
                                                    </span>
                                                </Button>
                                            </label>
                                        </div>
                                    )}

                                    {item.status === 'VERIFIED' && item.verifiedAt && (
                                        <div className="p-3 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                                            <div className="flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                                                    Verified on: {new Date(item.verifiedAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                            {item.remarks && (
                                                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                                                    {item.remarks}
                                                </p>
                                            )}
                                        </div>
                                    )}
                            </div>
                        );
                    })}

                    {verificationItems.filter((item) => item.documents && item.documents.length > 0).length === 0 && (
                        <div className="text-center py-8">
                            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                            <p className="text-sm text-muted-foreground">
                                No documents have been verified during onboarding yet.
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Documents will appear here once they are verified in the Document Collection tab.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

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
        </>
    );
};

export default DocumentVerificationTab;
