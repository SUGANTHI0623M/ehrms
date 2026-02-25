import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Bell, CheckCircle2, XCircle, Clock } from "lucide-react";

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

interface AddressVerificationTabProps {
    addressVerification: any;
    onVerify: (type: 'address', category: string, label: string) => void;
    onNotify?: () => void;
    candidateId?: string;
    isNotifying?: boolean;
}

const AddressVerificationTab: React.FC<AddressVerificationTabProps> = ({
    addressVerification,
    onVerify,
    onNotify,
    candidateId,
    isNotifying = false,
}) => {
    const isVerified = addressVerification.status === 'VERIFIED';
    const isRejected = addressVerification.status === 'REJECTED';
    const isPending = addressVerification.status === 'PENDING' || !addressVerification.status;

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Address Verification
                    </CardTitle>
                    {!isVerified && onNotify && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onNotify}
                            disabled={isNotifying}
                            className="gap-2"
                        >
                            <Bell className="w-4 h-4" />
                            {isNotifying ? 'Notifying...' : 'Notify Candidate'}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold">Current Residential Address</h3>
                                {getStatusBadge(addressVerification.status)}
                            </div>
                            {addressVerification.currentResidentialAddress ? (
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-sm whitespace-pre-wrap">
                                        {addressVerification.currentResidentialAddress}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">
                                    Address not provided by candidate
                                </p>
                            )}
                            {addressVerification.remarks && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                                    <strong>Remarks:</strong> {addressVerification.remarks}
                                </div>
                            )}
                            {addressVerification.verifiedAt && (
                                <p className="text-xs text-muted-foreground mt-2">
                                    Verified on: {new Date(addressVerification.verifiedAt).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>

                    {isRejected && addressVerification.rejectionReason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-red-800">
                                        <strong>Rejection Reason:</strong>
                                    </p>
                                    <p className="text-sm text-red-700 mt-1">
                                        {addressVerification.rejectionReason}
                                    </p>
                                    {addressVerification.rejectedAt && (
                                        <p className="text-xs text-red-600 mt-1">
                                            Rejected on: {new Date(addressVerification.rejectedAt).toLocaleDateString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {isVerified && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                <p className="text-sm font-medium text-green-800">
                                    Address has been verified
                                </p>
                            </div>
                        </div>
                    )}

                    {!isVerified && (
                        <div className="flex items-center gap-2 pt-2 border-t">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                    onVerify('address', 'address', 'Current Residential Address')
                                }
                                className="flex-1"
                            >
                                {isRejected ? 'Re-verify' : 'Verify Address'}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default AddressVerificationTab;
