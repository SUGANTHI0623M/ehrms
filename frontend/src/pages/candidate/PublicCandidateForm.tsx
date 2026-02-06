import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import CandidateApplicationForm from "@/components/candidate/CandidateApplicationForm";
import CandidateSuccessScreen from "@/components/candidate/CandidateSuccessScreen";
import {
  useGetFormLinkByTokenQuery,
  useSubmitPublicFormMutation,
} from "@/store/api/candidateFormApi";
import { CandidateFormData } from "@/store/api/candidateFormApi";
import { AlertCircle } from "lucide-react";
import { message } from "antd";

const PublicCandidateForm = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
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
  const [submitted, setSubmitted] = useState(false);
  const [successData, setSuccessData] = useState<{
    candidateName: string;
    userAccount?: any;
  } | null>(null);

  const {
    data: linkData,
    isLoading: isLoadingLink,
    error: linkError,
  } = useGetFormLinkByTokenQuery(token || "", {
    skip: !token,
  });

  const [submitForm, { isLoading: isSubmitting }] = useSubmitPublicFormMutation();

  // Form link is valid if it exists and is active (job opening selection happens in form)
  const isFormLinkValid = linkData?.success === true;
  const formLinkError = linkData?.success === false || linkError;

  const handleSubmit = async (data: CandidateFormData) => {
    if (!token) {
      message.error("Invalid form link");
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
        formData: {
          ...data,
          position: linkData?.data?.link?.position,
          // jobOpeningId is required from form data
          jobOpeningId: data.jobOpeningId,
        },
      }).unwrap();

      // Show success screen with credentials
      setSuccessData({
        candidateName: `${data.firstName} ${data.lastName}`,
        userAccount: result.data?.userAccount,
      });
      setSubmitted(true);
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
          error?.data?.error?.message || "Failed to submit application"
        );
      }
    }
  };

  if (isLoadingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading form...</p>
        </div>
      </div>
    );
  }

  // Show error if form link is invalid or missing
  if (formLinkError || !linkData || !isFormLinkValid) {
    const errorMessage = linkData?.error?.message || 
                        linkError?.data?.error?.message || 
                        "This form link is invalid, expired, or has reached its maximum submissions.";

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Invalid Form Link
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              {errorMessage}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Please contact the administrator or request a new application link.
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
            <CardTitle>Job Application Form</CardTitle>
            {linkData.data.link.position && (
              <p className="text-muted-foreground mt-2">
                Position: <span className="font-semibold">{linkData.data.link.position}</span>
              </p>
            )}
          </CardHeader>
          <CardContent>
            <CandidateApplicationForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={handleSubmit}
              isLoading={isSubmitting}
              isPublic={true}
              position={linkData.data.link.position}
              availableJobOpenings={linkData.data.link.availableJobOpenings || []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PublicCandidateForm;

