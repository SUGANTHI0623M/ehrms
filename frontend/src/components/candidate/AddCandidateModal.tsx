import { useState } from "react";
import { Modal, Tabs, Button, Input, message } from "antd";
import { UserAddOutlined, LinkOutlined, CopyOutlined, ShareAltOutlined } from "@ant-design/icons";
import CandidateApplicationForm from "./CandidateApplicationForm";
import CandidateSuccessScreen from "./CandidateSuccessScreen";
import {
  useCreateCandidateManualMutation,
  useGenerateFormLinkMutation,
} from "@/store/api/candidateFormApi";
import { CandidateFormData } from "@/store/api/candidateFormApi";

const { TabPane } = Tabs;

interface AddCandidateModalProps {
  open: boolean;
  onClose: () => void;
  jobOpeningId?: string;
  position?: string;
}

const AddCandidateModal: React.FC<AddCandidateModalProps> = ({
  open,
  onClose,
  jobOpeningId,
  position: defaultPosition,
}) => {
  const [activeTab, setActiveTab] = useState<"manual" | "link">("manual");
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

  const [createCandidate, { isLoading: isCreating }] = useCreateCandidateManualMutation();
  const [generateLink, { isLoading: isGeneratingLink }] = useGenerateFormLinkMutation();

  const [generatedLink, setGeneratedLink] = useState<string>("");

  // Reset form when modal closes
  const handleModalClose = () => {
    setGeneratedLink("");
    onClose();
  };
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [successData, setSuccessData] = useState<{
    candidateName: string;
    userAccount?: any;
    candidateId?: string;
    candidateEmail?: string;
  } | null>(null);

  const handleManualSubmit = async (data: CandidateFormData) => {
    try {
      // Validate jobOpeningId is provided
      if (!data.jobOpeningId && !jobOpeningId) {
        message.error("Please select a job opening");
        return;
      }

      const result = await createCandidate({
        ...data,
        jobOpeningId: data.jobOpeningId || jobOpeningId,
        position: defaultPosition || data.position,
      }).unwrap();

      // Show success screen with credentials
      setSuccessData({
        candidateName: `${data.firstName} ${data.lastName}`,
        userAccount: result.data?.userAccount,
        candidateId: result.data?.candidate?._id, // Include candidate ID for sending email
        candidateEmail: result.data?.candidateEmail || result.data?.candidate?.email || data.email, // Include candidate email
      });
      setShowSuccessScreen(true);
    } catch (error: any) {
      message.error(
        error?.data?.error?.message || "Failed to create candidate"
      );
    }
  };

  const handleGenerateLink = async () => {
    try {
      // Generate generic form link (no job opening required)
      // Candidate will select job opening when filling the form
      const result = await generateLink({
        expiresInDays: 30, // Default 30 days
      }).unwrap();
      setGeneratedLink(result.data.publicUrl);
      message.success("Form link generated successfully");
    } catch (error: any) {
      message.error(
        error?.data?.error?.message || "Failed to generate form link"
      );
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink);
    message.success("Link copied to clipboard");
  };

  const handleShareLink = () => {
    if (navigator.share) {
      navigator.share({
        title: "Job Application Form",
        text: "Please fill out this form to apply for the position",
        url: generatedLink,
      });
    } else {
      handleCopyLink();
    }
  };

  // Show success screen if candidate was created successfully
  if (showSuccessScreen && successData) {
    return (
      <Modal
        title=""
        open={open}
        onCancel={() => {
          setShowSuccessScreen(false);
          setSuccessData(null);
          setFormData({
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            education: [],
            experience: [],
            skills: [],
          });
          onClose();
        }}
        footer={null}
        width={900}
        closable={true}
      >
        <CandidateSuccessScreen
          candidateName={successData.candidateName}
          candidateId={successData.candidateId}
          candidateEmail={successData.candidateEmail}
          userAccount={successData.userAccount}
          onClose={() => {
            setShowSuccessScreen(false);
            setSuccessData(null);
            setFormData({
              firstName: "",
              lastName: "",
              email: "",
              phone: "",
              education: [],
              experience: [],
              skills: [],
            });
            onClose();
          }}
          showGoToLogin={false}
        />
      </Modal>
    );
  }

  return (
    <Modal
      title="Add Candidate"
      open={open}
      onCancel={handleModalClose}
      footer={null}
      width={900}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={(key) => setActiveTab(key as "manual" | "link")}>
        {/* Manual Add Tab */}
        <TabPane
          tab={
            <span>
              <UserAddOutlined /> Manual Add
            </span>
          }
          key="manual"
        >
          <CandidateApplicationForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleManualSubmit}
            isLoading={isCreating}
            isPublic={false}
            position={defaultPosition}
          />
        </TabPane>

        {/* Share Form Link Tab */}
        <TabPane
          tab={
            <span>
              <LinkOutlined /> Share Candidate Form Link
            </span>
          }
          key="link"
        >
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Generate Public Form Link</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Generate a general application form link. Candidates will select their desired job opening when filling out the form.
              </p>
              <div className="space-y-4">
                <Button
                  type="primary"
                  icon={<LinkOutlined />}
                  onClick={handleGenerateLink}
                  loading={isGeneratingLink}
                  size="large"
                  block
                >
                  Generate New Link
                </Button>
              </div>
            </div>

            {/* Generated Link Display */}
            {generatedLink && (
              <div className="p-4 border rounded-lg bg-gray-50">
                <label className="block text-sm font-medium mb-2">
                  Generated Form Link
                </label>
                <div className="flex gap-2">
                  <Input value={generatedLink} readOnly className="flex-1" />
                  <Button icon={<CopyOutlined />} onClick={handleCopyLink}>
                    Copy
                  </Button>
                  <Button icon={<ShareAltOutlined />} onClick={handleShareLink}>
                    Share
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Share this link with candidates via WhatsApp, Email, etc.
                </p>
              </div>
            )}
          </div>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default AddCandidateModal;

