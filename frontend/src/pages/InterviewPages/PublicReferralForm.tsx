import { useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, User } from "lucide-react";
import {
  useGetReferralLinkByTokenQuery,
  useSubmitReferralFormMutation,
} from "@/store/api/referralApi";
import { message } from "antd";
import CandidateApplicationForm from "@/components/candidate/CandidateApplicationForm";
import CandidateSuccessScreen from "@/components/candidate/CandidateSuccessScreen";
import { CandidateFormData } from "@/store/api/candidateFormApi";

const PublicReferralForm = () => {
  const { token } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const staffId = searchParams.get("staffId") || "";
  const companyId = searchParams.get("companyId") || "";

  const [formData, setFormData] = useState<CandidateFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    countryCode: "91",
    education: [],
    experience: [],
    skills: [],
  });

  // Referral-specific metadata
  const [referralMetadata, setReferralMetadata] = useState({
    relationship: "",
    knownPeriod: "",
    notes: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [successData, setSuccessData] = useState<{
    candidateName: string;
    userAccount?: any;
  } | null>(null);

  const {
    data: linkData,
    isLoading: isLoadingLink,
    error: linkError,
  } = useGetReferralLinkByTokenQuery(
    { token: token || "", staffId, companyId },
    {
      skip: !token || !staffId || !companyId,
    }
  );

  const [submitForm, { isLoading: isSubmitting }] = useSubmitReferralFormMutation();

  const jobOpenings = linkData?.data?.jobOpenings || [];
  const referrerInfo = linkData?.data?.referrerInfo;

  const handleSubmit = async (data: CandidateFormData) => {
    if (!token || !staffId || !companyId) {
      message.error("Invalid referral link");
      return;
    }

    // Validate job opening is selected
    if (!data.jobOpeningId) {
      message.error("Please select a job opening before submitting");
      return;
    }

    try {
      const result = await submitForm({
        token,
        staffId,
        companyId,
        formData: {
          ...data,
          jobOpeningId: data.jobOpeningId,
        },
        referralMetadata,
      }).unwrap();

      if (result.success) {
        // Store result for candidateId access
        setSubmitResult(result);
        
        // Show success screen with credentials
        // Map backend response to match CandidateSuccessScreen expected format
        const userAccountData = result.data?.userAccount ? {
          id: result.data.userAccount.id || result.data.candidate?._id,
          email: result.data.userAccount.email,
          password: result.data.userAccount.password || result.data.userAccount.tempPassword,
          loginUrl: result.data.userAccount.loginUrl,
          // Only include message if password is not available (existing user case)
          ...(result.data.userAccount.password || result.data.userAccount.tempPassword ? {} : { message: result.data.userAccount.message })
        } : undefined;

        setSuccessData({
          candidateName: `${data.firstName} ${data.lastName}`,
          userAccount: userAccountData,
        });
        setSubmitted(true);
        message.success("Referral submitted successfully!");
      }
    } catch (error: any) {
      if (error?.data?.error?.duplicate) {
        const duplicateFields = error?.data?.error?.duplicateFields || [];
        let errorMessage = "You have already submitted an application with this ";
        if (duplicateFields.includes('email') && duplicateFields.includes('phone')) {
          errorMessage += "email and phone number";
        } else if (duplicateFields.includes('email')) {
          errorMessage += "email";
        } else if (duplicateFields.includes('phone')) {
          errorMessage += "phone number";
        } else {
          errorMessage += "information";
        }
        errorMessage += ". Please use a different email or phone number.";
        message.error(errorMessage);
      } else {
        message.error(
          error?.data?.error?.message || "Failed to submit referral"
        );
      }
    }
  };

  if (isLoadingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  if (linkError || !linkData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Invalid Referral Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              This referral link is invalid, expired, or has been deactivated.
            </p>
            <Button onClick={() => navigate("/")}>Go to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show enhanced success screen with credentials
  if (submitted && successData) {
    return (
      <CandidateSuccessScreen
        candidateName={successData.candidateName}
        candidateId={submitResult?.data?.candidate?._id}
        userAccount={successData.userAccount}
        onClose={() => navigate("/")}
        showGoToLogin={true}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Referral Candidate Form</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Please fill in the details below to refer a candidate
            </p>
            {/* Show who referred them */}
            {referrerInfo && (
              <Alert className="mt-4">
                <User className="h-4 w-4" />
                <AlertDescription>
                  <strong>Referred by:</strong> {referrerInfo.name} ({referrerInfo.email})
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>
          <CardContent>
            {/* Referral Metadata Section */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold mb-4 text-blue-900">
                Referral Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-800">
                    Relationship with Candidate
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white"
                    value={referralMetadata.relationship}
                    onChange={(e) =>
                      setReferralMetadata({ ...referralMetadata, relationship: e.target.value })
                    }
                  >
                    <option value="">Select relationship</option>
                    <option value="friend">Friend</option>
                    <option value="colleague">Colleague</option>
                    <option value="family">Family</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-800">
                    Known Period
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white"
                    value={referralMetadata.knownPeriod}
                    onChange={(e) =>
                      setReferralMetadata({ ...referralMetadata, knownPeriod: e.target.value })
                    }
                  >
                    <option value="">Select period</option>
                    <option value="less-1">Less than 1 year</option>
                    <option value="1-3">1-3 years</option>
                    <option value="3-5">3-5 years</option>
                    <option value="more-5">More than 5 years</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-blue-800">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white"
                    rows={2}
                    placeholder="Any additional information about the candidate..."
                    value={referralMetadata.notes}
                    onChange={(e) =>
                      setReferralMetadata({ ...referralMetadata, notes: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Candidate Application Form */}
            <CandidateApplicationForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              isLoading={isSubmitting}
              isPublic={true}
              availableJobOpenings={jobOpenings.map(job => ({
                _id: job._id,
                title: job.title,
                department: job.department || '',
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicReferralForm;

