import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone } from "lucide-react";

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

interface ContactVerificationTabProps {
    contactVerifications: any[];
    onVerify: (type: 'contact', category: string, label: string) => void;
}

const ContactVerificationTab: React.FC<ContactVerificationTabProps> = ({
    contactVerifications,
    onVerify,
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Phone className="w-5 h-5" />
                    Contact Verification
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {contactVerifications.map((contact) => (
                    <div key={contact.type} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold">
                                    {contact.type === 'PRIMARY' ? 'Primary' : 'Secondary'} Contact Number
                                </h3>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {contact.contactNumber || 'Not provided'}
                                </p>
                                {contact.remarks && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {contact.remarks}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                {getStatusBadge(contact.status)}
                                {contact.status !== 'VERIFIED' && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                            onVerify('contact', contact.type, `${contact.type} Contact`)
                                        }
                                    >
                                        {contact.status === 'REJECTED' ? 'Re-verify' : 'Verify'}
                                    </Button>
                                )}
                            </div>
                        </div>
                        {contact.status === 'REJECTED' && contact.rejectionReason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                                <strong>Rejection Reason:</strong> {contact.rejectionReason}
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};

export default ContactVerificationTab;
