import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Copy, Mail, MessageCircle, Eye, EyeOff } from "lucide-react";
import { message } from "antd";
import { useSendCandidateCredentialsMutation } from "@/store/api/candidateFormApi";

interface CandidateSuccessScreenProps {
  candidateName: string;
  candidateId?: string; // Add candidateId to send credentials email
  candidateEmail?: string; // Candidate's email address
  userAccount?: {
    id: string;
    email: string;
    password?: string;
    loginUrl?: string;
    message?: string;
  };
  onClose?: () => void;
  showGoToLogin?: boolean; // Show "Go to Login" button only for form link submissions
}

const CandidateSuccessScreen: React.FC<CandidateSuccessScreenProps> = ({
  candidateName,
  candidateId,
  candidateEmail,
  userAccount,
  onClose,
  showGoToLogin = false, // Default to false (for manual creation)
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [sendCredentials, { isLoading: isSendingCredentials }] = useSendCandidateCredentialsMutation();

  const handleCopyCredentials = () => {
    if (!userAccount) return;

    const emailToUse = candidateEmail || userAccount.email;
    const credentials = `Login URL: ${userAccount.loginUrl || "https://your-domain.com"}
Candidate Email: ${emailToUse}
Login Username: ${userAccount.email}
Password: ${userAccount.password || "Use your existing password"}`;

    navigator.clipboard.writeText(credentials);
    message.success("Credentials copied to clipboard");
  };

  const handleShareViaEmail = () => {
    if (!userAccount) return;

    const emailToUse = candidateEmail || userAccount.email;
    const subject = encodeURIComponent("Your Candidate Account Credentials");
    const body = encodeURIComponent(
      `Dear ${candidateName},\n\n` +
      `Thank you for applying! Your application has been submitted successfully.\n\n` +
      `Your login credentials:\n` +
      `Login URL: ${userAccount.loginUrl || "https://your-domain.com/login"}\n` +
      `Candidate Email: ${emailToUse}\n` +
      `Login Username: ${userAccount.email}\n` +
      `Password: ${userAccount.password || "Use your existing password"}\n\n` +
      `You can now log in to track your application status.\n\n` +
      `Best regards,\nHR Team`
    );

    window.location.href = `mailto:${emailToUse}?subject=${subject}&body=${body}`;
  };

  const handleShareViaWhatsApp = async () => {
    if (!userAccount || !candidateId) {
      message.warning('Candidate ID is required to send WhatsApp message');
      return;
    }

    try {
      const result = await sendCredentials(candidateId).unwrap();
      if (result.whatsappSent) {
        message.success(result.message || 'WhatsApp message sent successfully');
      } else if (result.emailSent) {
        message.warning('WhatsApp message could not be sent, but email was sent successfully');
      } else {
        message.error('Failed to send WhatsApp message. Please try again.');
      }
    } catch (error: any) {
      message.error(error?.data?.error?.message || 'Failed to send WhatsApp message');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle2 className="w-16 h-16 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-600">
            Application Submitted Successfully!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Thank You Message */}
          <div className="text-center">
            <p className="text-lg font-semibold mb-2">
              Thank you, {candidateName}!
            </p>
            <p className="text-muted-foreground">
              Your application has been submitted successfully. We will review it and get back to you soon.
            </p>
          </div>

          {/* Login Credentials Section */}
          {userAccount && (
            <div className="border rounded-lg p-4 bg-gray-50 space-y-4">
              <h3 className="font-semibold text-lg mb-3">🔐 Your Login Credentials</h3>
              
              {/* Show message if present, but don't hide credentials */}
              {userAccount.message && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded mb-4">
                  <p className="text-sm text-blue-800">{userAccount.message}</p>
                </div>
              )}
              
              {/* Show warning if candidate email and user account email differ */}
              {candidateEmail && userAccount.email && candidateEmail.toLowerCase() !== userAccount.email.toLowerCase() && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded mb-4">
                  <p className="text-sm text-yellow-800 font-semibold mb-1">⚠️ Email Mismatch Detected</p>
                  <p className="text-xs text-yellow-700">
                    Candidate email ({candidateEmail}) differs from user account email ({userAccount.email}). 
                    Credentials will be sent to the candidate email address.
                  </p>
                </div>
              )}
              
              {/* Show credentials if email exists (credentials are available) */}
              {userAccount.email ? (
                <>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Login URL
                      </label>
                      <p className="text-sm font-mono bg-white p-2 rounded border">
                        {userAccount.loginUrl || "https://your-domain.com/candidate/login"}
                      </p>
                    </div>
                    
                    {/* Display Candidate Email */}
                    {candidateEmail && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          📧 Candidate Email (Email will be sent to this address)
                        </label>
                        <p className="text-sm font-mono bg-white p-2 rounded border">
                          {candidateEmail}
                        </p>
                      </div>
                    )}
                    
                    {/* Display User Account Email */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        👤 Login Username / User Account Email
                      </label>
                      <p className="text-sm font-mono bg-white p-2 rounded border">
                        {userAccount.email}
                      </p>
                      {candidateEmail && candidateEmail.toLowerCase() === userAccount.email.toLowerCase() && (
                        <p className="text-xs text-green-600 mt-1">✓ Matches candidate email</p>
                      )}
                    </div>
                    {userAccount.password && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Password
                        </label>
                        <div className="relative">
                          <p className="text-sm font-mono bg-white p-2 pr-10 rounded border">
                            {showPassword ? userAccount.password : "••••••••••••"}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-1 top-1 h-7 w-7 p-0"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          ⚠️ Please save this password securely. You won't be able to see it again.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleCopyCredentials}
                      className="flex-1 min-w-[120px]"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Credentials
                    </Button>
                    {candidateId && (
                      <Button
                        variant="default"
                        onClick={async () => {
                          try {
                            const result = await sendCredentials(candidateId).unwrap();
                            message.success(result.message || 'Credentials email sent successfully');
                          } catch (error: any) {
                            message.error(error?.data?.error?.message || 'Failed to send credentials email');
                          }
                        }}
                        disabled={isSendingCredentials}
                        className="flex-1 min-w-[120px]"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {isSendingCredentials ? 'Sending...' : 'Send via Mail'}
                      </Button>
                    )}
                    {/* <Button
                      variant="outline"
                      onClick={handleShareViaEmail}
                      className="flex-1 min-w-[120px]"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Share via Email
                    </Button> */}
                    {candidateId && (
                      <Button
                        variant="outline"
                        onClick={handleShareViaWhatsApp}
                        disabled={isSendingCredentials}
                        className="flex-1 min-w-[120px]"
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        {isSendingCredentials ? 'Sending...' : 'Share via WhatsApp'}
                      </Button>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}

          {/* Next Steps */}
          <div className="border-t pt-4">
            <h4 className="font-semibold mb-2">What's Next?</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>You can log in using the credentials above to track your application status</li>
              <li>Our HR team will review your application and contact you soon</li>
              <li>Make sure to check your email for any updates</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {showGoToLogin && userAccount?.loginUrl && (
              <Button
                onClick={() => {
                  window.location.href = userAccount.loginUrl || "/login";
                }}
                className="w-full sm:flex-1"
                size="lg"
              >
                Go to Login
              </Button>
            )}
            {onClose && (
              <Button
                variant="outline"
                onClick={onClose}
                className={showGoToLogin && userAccount?.loginUrl ? "w-full sm:flex-1" : "w-full"}
                size="lg"
              >
                Close
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CandidateSuccessScreen;

