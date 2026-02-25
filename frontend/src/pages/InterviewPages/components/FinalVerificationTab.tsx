import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface FinalVerificationTabProps {
    verification: any;
    candidate?: any; // Add candidate prop to check status
    onApprove: (action?: string) => void;
    onReject: (action?: string) => void;
    canConvertToStaff?: boolean;
}

const FinalVerificationTab: React.FC<FinalVerificationTabProps> = ({
    verification,
    candidate,
    onApprove,
    onReject,
    canConvertToStaff = false,
}) => {
    const allDocumentsVerified = verification.verificationItems.every(
        (item: any) => item.status === 'VERIFIED'
    );
    const allContactsVerified = verification.contactVerifications.every(
        (cv: any) => cv.status === 'VERIFIED'
    );
    const addressVerified = verification.addressVerification.status === 'VERIFIED';
    const canApprove = allDocumentsVerified && allContactsVerified && addressVerified;
    
    // Check if candidate is already HIRED - if so, don't show Convert button
    const isAlreadyHired = candidate?.status === 'HIRED';

    return (
        <Card>
            <CardHeader>
                <CardTitle>Final Verification</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                        <h3 className="font-semibold mb-2">Verification Checklist</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                {allDocumentsVerified ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Clock className="w-4 h-4 text-gray-400" />
                                )}
                                <span>All documents verified</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {allContactsVerified ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Clock className="w-4 h-4 text-gray-400" />
                                )}
                                <span>All contacts verified</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {addressVerified ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                ) : (
                                    <Clock className="w-4 h-4 text-gray-400" />
                                )}
                                <span>Address verified</span>
                            </div>
                        </div>
                    </div>

                    {/* Pending / In Progress / On Hold Actions */}
                    {/* Show actions only if not CLEARED, not FAILED, and not already HIRED */}
                    {verification.overallStatus !== 'CLEARED' && verification.overallStatus !== 'FAILED' && !isAlreadyHired && (
                        <div className="flex flex-wrap gap-3">
                            {/* Convert to Staff button - available even when ON_HOLD */}
                            {canConvertToStaff && (
                                <Button
                                    onClick={() => onApprove('CONVERT_TO_STAFF')}
                                    className="bg-green-600 hover:bg-green-700"
                                    disabled={!canApprove}
                                    title={!canApprove ? "Complete all verification items first" : "Convert to Staff"}
                                >
                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                    Convert to Staff
                                </Button>
                            )}

                            {/* Hold Process button - disabled when already on hold */}
                            <Button
                                variant="secondary"
                                onClick={() => onApprove('HOLD_PROCESS')}
                                disabled={verification.overallStatus === 'ON_HOLD'}
                                title={verification.overallStatus === 'ON_HOLD' ? 'Process is already on hold' : 'Pause the verification process'}
                            >
                                <Clock className="w-4 h-4 mr-2" />
                                {verification.overallStatus === 'ON_HOLD' ? 'Process On Hold' : 'Hold Process'}
                            </Button>

                            {/* Reject Candidate button - available unless already rejected */}
                            <Button
                                variant="destructive"
                                onClick={() => onReject('REJECT_CANDIDATE')}
                            >
                                <XCircle className="w-4 h-4 mr-2" />
                                Reject Candidate
                            </Button>
                        </div>
                    )}

                    {verification.overallStatus === 'CLEARED' && (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2 text-green-800">
                                <CheckCircle2 className="w-5 h-5" />
                                <span className="font-semibold">Candidate Converted to Staff</span>
                            </div>
                            <p className="text-sm text-green-700 mt-1">
                                The candidate has been successfully verified and added to the staff list.
                            </p>
                            {verification.clearedAt && (
                                <p className="text-xs text-green-600 mt-1">
                                    Cleared on: {formatDate(verification.clearedAt)}
                                </p>
                            )}
                        </div>
                    )}

                    {verification.overallStatus === 'FAILED' && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center gap-2 text-red-800">
                                <XCircle className="w-5 h-5" />
                                <span className="font-semibold">Candidate Rejected</span>
                            </div>
                            {verification.failureReason && (
                                <p className="text-sm text-red-700 mt-1">
                                    Reason: {verification.failureReason}
                                </p>
                            )}
                            {verification.failedAt && (
                                <p className="text-xs text-red-600 mt-1">
                                    Rejected on: {formatDate(verification.failedAt)}
                                </p>
                            )}
                        </div>
                    )}

                    {verification.overallStatus === 'ON_HOLD' && (
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mt-2">
                            <div className="flex items-center gap-2 text-yellow-800">
                                <Clock className="w-5 h-5" />
                                <span className="font-semibold">Verification On Hold</span>
                            </div>
                            <p className="text-sm text-yellow-700 mt-1">
                                The verification process is currently paused. You can resume it by selecting "Convert to Staff" (if all items are verified) or "Reject Candidate".
                            </p>
                            {/* Show Convert button even when on hold if all items are verified */}
                            {canConvertToStaff && canApprove && (
                                <div className="mt-3">
                                    <Button
                                        onClick={() => onApprove('CONVERT_TO_STAFF')}
                                        className="bg-green-600 hover:bg-green-700"
                                        size="sm"
                                    >
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Convert to Staff
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default FinalVerificationTab;
