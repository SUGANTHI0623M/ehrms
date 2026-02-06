import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Plus, User, File, History, Eye } from "lucide-react";
import { useAddLogMutation } from "@/store/api/backgroundVerificationApi";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface BackgroundVerificationLogTabProps {
    candidateId: string;
    logs: any[];
    refetch: () => void;
}

const BackgroundVerificationLogTab: React.FC<BackgroundVerificationLogTabProps> = ({
    candidateId,
    logs = [],
    refetch,
}) => {
    const [remark, setRemark] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [addLog, { isLoading }] = useAddLogMutation();

    const handleAddLog = async () => {
        if (!remark.trim()) {
            toast.error("Please enter a remark or description");
            return;
        }

        try {
            const formData = new FormData();
            formData.append("content", remark);
            formData.append("type", file ? "DOCUMENT" : "REMARK");
            if (file) {
                formData.append("document", file);
            }

            await addLog({ candidateId, body: formData }).unwrap();
            toast.success("Log added successfully");
            setRemark("");
            setFile(null);
            refetch();
        } catch (error: any) {
            toast.error(error?.data?.error?.message || "Failed to add log");
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="w-5 h-5" />
                        Add Log / Remark
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Remark / Note *</Label>
                        <Textarea
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            placeholder="Enter details about the verification check..."
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Supporting Document (Optional)</Label>
                        <Input
                            type="file"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            accept=".pdf,.jpg,.jpeg,.png"
                        />
                        <p className="text-xs text-muted-foreground">
                            Supports: PDF, JPG, PNG (Max 10MB)
                        </p>
                    </div>
                    <Button onClick={handleAddLog} disabled={isLoading}>
                        {isLoading ? "Adding..." : "Add to Log"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" />
                        Verification Log History
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {logs && logs.length > 0 ? (
                            logs.slice().reverse().map((log, index) => (
                                <div key={index} className="p-4 border rounded-lg bg-muted/50">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                <span>{log.userId?.name || "Unknown User"}</span>
                                                <span className="text-muted-foreground">•</span>
                                                <span className="text-muted-foreground">
                                                    {formatDate(log.createdAt)}
                                                </span>
                                            </div>
                                            <p className="text-sm mt-2">{log.content}</p>
                                            {log.type === 'DOCUMENT' && log.documentUrl && (
                                                <div className="flex items-center gap-2 mt-2 p-2 bg-background rounded border w-fit">
                                                    <File className="w-4 h-4 text-blue-500" />
                                                    <span className="text-sm">{log.documentName || 'Document'}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0"
                                                        onClick={() => window.open(log.documentUrl, '_blank')}
                                                    >
                                                        <Eye className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-muted-foreground py-4">
                                No logs added yet.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default BackgroundVerificationLogTab;
