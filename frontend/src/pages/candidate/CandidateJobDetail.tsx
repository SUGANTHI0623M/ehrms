import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  MapPin,
  Building2,
  Users,
  GraduationCap,
  DollarSign,
  Clock,
  FileText,
  CheckCircle2,
  Calendar,
  ArrowLeft,
  Globe,
  FileCheck,
  CheckCircle,
  XCircle,
  Download,
  Eye,
} from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetJobOpeningByIdQuery } from "@/store/api/jobOpeningApi";
import { useGetCandidateProfileQuery, useApplyForJobMutation, useGetJobVacanciesQuery } from "@/store/api/candidateDashboardApi";
import { 
  useGetOfferByCandidateIdQuery,
  useGetOfferByIdQuery,
  useAcceptOfferMutation, 
  useRejectOfferMutation,
  useGenerateOfferLetterPreviewQuery
} from "@/store/api/offerApi";
import { toast } from "sonner";
import CandidateApplicationForm from "@/components/candidate/CandidateApplicationForm";
import { CandidateFormData } from "@/store/api/candidateFormApi";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";

const CandidateJobDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: jobData, isLoading: isLoadingJob } = useGetJobOpeningByIdQuery(id || "", { skip: !id });
  const { data: profileData } = useGetCandidateProfileQuery();
  const { data: jobVacanciesData } = useGetJobVacanciesQuery();
  const [applyForJob, { isLoading: isApplying }] = useApplyForJobMutation();
  
  // Get candidate ID from profile to fetch offer
  const candidateId = profileData?.data?.candidateData?._id;
  
  // Fetch offer by candidate ID (returns most recent offer)
  const { data: offerData, refetch: refetchOffer } = useGetOfferByCandidateIdQuery(candidateId || "", {
    skip: !candidateId,
  });
  
  const fetchedOffer = offerData?.data?.offer;
  
  // Check if the fetched offer matches the current job
  // Handle both populated (object) and non-populated (string) jobOpeningId
  let offer = null;
  if (fetchedOffer && id) {
    const offerJobId = typeof fetchedOffer.jobOpeningId === 'object' && fetchedOffer.jobOpeningId?._id
      ? fetchedOffer.jobOpeningId._id.toString()
      : typeof fetchedOffer.jobOpeningId === 'object' && fetchedOffer.jobOpeningId
      ? fetchedOffer.jobOpeningId.toString()
      : fetchedOffer.jobOpeningId?.toString() || '';
    
    if (offerJobId === id) {
      offer = fetchedOffer;
    }
  }
  
  // Get offer letter preview if offer exists
  const { data: previewData } = useGenerateOfferLetterPreviewQuery(
    offer?._id || "",
    {
      skip: !offer?._id,
    }
  );
  
  const preview = previewData?.data;
  const business = preview?.business;
  const offerLetterContent = preview?.offerLetterContent;
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [activeTab, setActiveTab] = useState("job-details");
  
  // Offer actions
  const [acceptOffer, { isLoading: isAccepting }] = useAcceptOfferMutation();
  const [rejectOffer, { isLoading: isRejecting }] = useRejectOfferMutation();
  
  const handleAcceptOffer = async () => {
    if (!offer?._id) return;
    try {
      await acceptOffer(offer._id).unwrap();
      toast.success('Offer accepted successfully!');
      // Refetch offer data
      refetchOffer();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || 'Failed to accept offer');
    }
  };
  
  const handleRejectOffer = async () => {
    if (!offer?._id) return;
    try {
      await rejectOffer({ id: offer._id, rejectionReason: rejectionReason || undefined }).unwrap();
      toast.success('Offer rejected');
      setShowRejectDialog(false);
      setRejectionReason("");
      // Refetch offer data
      refetchOffer();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || 'Failed to reject offer');
    }
  };
  const [formData, setFormData] = useState<CandidateFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    countryCode: "91",
    education: [],
    experience: [],
    jobOpeningId: "",
  });

  const job = jobData?.data?.jobOpening;

  // Pre-fill form data from profile when modal opens
  useEffect(() => {
    if (showApplicationForm && profileData?.data?.candidateData && id) {
      const candidate = profileData.data.candidateData;
      const profile = profileData.data.profile;
      
      setFormData({
        firstName: candidate.firstName || "",
        lastName: candidate.lastName || "",
        email: profile?.email || candidate.email || "",
        phone: profile?.phone || candidate.phone || "",
        countryCode: profile?.countryCode || candidate.countryCode || "91",
        dateOfBirth: candidate.dateOfBirth ? new Date(candidate.dateOfBirth).toISOString().split('T')[0] : undefined,
        gender: candidate.gender || undefined,
        currentCity: candidate.currentCity || undefined,
        preferredJobLocation: candidate.preferredJobLocation || undefined,
        totalYearsOfExperience: candidate.totalYearsOfExperience || 0,
        currentCompany: candidate.currentCompany || undefined,
        currentJobTitle: candidate.currentJobTitle || undefined,
        employmentType: candidate.employmentType || undefined,
        education: candidate.education || [],
        experience: candidate.experience || [],
        resume: candidate.resume || undefined,
        skills: candidate.skills || [],
        jobOpeningId: id,
      });
    }
  }, [showApplicationForm, profileData, id]);

  const handleApply = () => {
    setShowApplicationForm(true);
  };

  const handleFormSubmit = async (data: CandidateFormData) => {
    if (!id) return;

    try {
      const submitData = {
        ...data,
        jobOpeningId: id,
      };

      const result = await applyForJob({ 
        jobId: id, 
        formData: submitData,
        skipValidation: true
      }).unwrap();
      
      toast.success(result.message || 'Application submitted successfully');
      setShowApplicationForm(false);
      navigate("/candidate/job-vacancies");
    } catch (error: any) {
      if (error?.data?.error?.message) {
        toast.error(error.data.error.message);
      } else if (error?.data?.error?.applicationStatus) {
        toast.info('You have already applied for this position');
      } else {
        toast.error('Failed to submit application. Please try again.');
      }
    }
  };

  const formatSalary = () => {
    if (!job?.salaryRange) return "Not disclosed";
    const { min, max, salaryType, currency = "INR" } = job.salaryRange;
    if (min === 0 && max === 0) return "Not disclosed";
    if (min === max) {
      return `${currency} ${min.toLocaleString()} ${salaryType === "Monthly" ? "/month" : "/year"}`;
    }
    return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()} ${salaryType === "Monthly" ? "/month" : "/year"}`;
  };

  const formatExperience = () => {
    if (!job) return "Not specified";
    if (job.minExperience !== undefined && job.maxExperience !== undefined) {
      if (job.minExperience === job.maxExperience) {
        return `${job.minExperience} ${job.minExperience === 1 ? "year" : "years"}`;
      }
      return `${job.minExperience} - ${job.maxExperience} years`;
    }
    if (job.minExperience !== undefined) {
      return `${job.minExperience}+ years`;
    }
    if (job.maxExperience !== undefined) {
      return `Up to ${job.maxExperience} years`;
    }
    return "Not specified";
  };

  const getBranchInfo = () => {
    if (!job?.branchId) return null;
    const branch = typeof job.branchId === 'object' ? job.branchId : null;
    return {
      name: branch?.branchName || "",
      city: branch?.address?.city || branch?.city || "",
      isHeadOffice: branch?.isHeadOffice || false,
    };
  };

  const branchInfo = getBranchInfo();
  
  // Get application status from job vacancies list
  const jobVacancy = jobVacanciesData?.data?.jobVacancies?.find(j => j._id === id);
  const hasApplied = jobVacancy?.hasApplied || false;
  const applicationStatus = jobVacancy?.applicationStatus || null;

  if (isLoadingJob) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading job details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!job) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="text-center py-12 text-destructive">
            <p className="text-lg font-semibold mb-2">Job not found</p>
            <p className="text-muted-foreground">The job you're looking for doesn't exist or has been removed.</p>
            <Button onClick={() => navigate("/candidate/job-vacancies")} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Job Listings
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="p-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/candidate/job-vacancies")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Job Listings
          </Button>
          {!hasApplied && (
            <Button onClick={handleApply} size="lg" className="px-6">
              Apply Now
            </Button>
          )}
          {hasApplied && (
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              {applicationStatus ? applicationStatus.replace(/_/g, ' ') : 'Applied'}
            </Badge>
          )}
        </div>

        {/* Job Header Card */}
        <Card className="border-2">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-3">{job.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  {branchInfo?.name && (
                    <div className="flex items-center gap-1">
                      <Building2 className="w-4 h-4" />
                      <span>{branchInfo.name}</span>
                      {branchInfo.city && <span className="ml-1">- {branchInfo.city}</span>}
                    </div>
                  )}
                  {job.department && (
                    <div className="flex items-center gap-1">
                      <Briefcase className="w-4 h-4" />
                      <span>{job.department}</span>
                    </div>
                  )}
                  {job.workplaceType && (
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      <span>{job.workplaceType}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs for Job Details and Offer Details */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="job-details">Job Details</TabsTrigger>
            <TabsTrigger value="offer-details">
              Offer Details {offer && (
                <Badge 
                  variant={
                    offer.status === 'ACCEPTED' ? 'default' :
                    offer.status === 'REJECTED' ? 'destructive' :
                    offer.status === 'SENT' ? 'secondary' : 'outline'
                  }
                  className="ml-2"
                >
                  {offer.status}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Job Details Tab */}
          <TabsContent value="job-details" className="space-y-6 mt-6">

        {/* Key Information Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Briefcase className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Employment Type</p>
                  <p className="font-semibold">{job.employmentType}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Open Positions</p>
                  <p className="font-semibold">{job.numberOfPositions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Education Required</p>
                  <p className="font-semibold">{job.educationalQualification || "Not specified"}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Experience Required</p>
                  <p className="font-semibold">{formatExperience()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Salary Range</p>
                  <p className="font-semibold">{formatSalary()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {job.createdAt && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Posted On</p>
                    <p className="font-semibold">{format(new Date(job.createdAt), "PPP")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Job Description */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Job Description
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap text-foreground">{job.description || "No description provided."}</p>
            </div>
          </CardContent>
        </Card>

        {/* Key Responsibilities */}
        {(job as any).keyResponsibilities && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Key Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap text-foreground">{(job as any).keyResponsibilities}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Required Skills */}
        {job.skills && job.skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Required Skills
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {job.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                    {skill}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

          </TabsContent>

          {/* Offer Details Tab */}
          <TabsContent value="offer-details" className="space-y-6 mt-6">
            {offer ? (
              <>
                {/* Offer Status Badge */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-primary" />
                        Job Offer
                      </CardTitle>
                      <Badge 
                        variant={
                          offer.status === 'ACCEPTED' ? 'default' :
                          offer.status === 'REJECTED' ? 'destructive' :
                          offer.status === 'SENT' ? 'secondary' : 'outline'
                        }
                        className="text-sm px-3 py-1"
                      >
                        {offer.status === 'ACCEPTED' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {offer.status === 'REJECTED' && <XCircle className="w-3 h-3 mr-1" />}
                        {offer.status}
                      </Badge>
                    </div>
                  </CardHeader>
                </Card>

                {/* Offer Details Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Offer Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Job Information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {job && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Position
                          </p>
                          <p className="font-medium">{job.title}</p>
                        </div>
                      )}
                      {offer.department && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Department
                          </p>
                          <p className="font-medium">{offer.department}</p>
                        </div>
                      )}
                      {offer.employmentType && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Employment Type</p>
                          <p className="font-medium">{offer.employmentType}</p>
                        </div>
                      )}
                      {offer.salary && offer.salary.amount !== undefined && offer.salary.amount !== null && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Compensation
                          </p>
                          <p className="font-medium">
                            {offer.salary.currency || ''} {typeof offer.salary.amount === 'number' ? offer.salary.amount.toLocaleString() : offer.salary.amount}{" "}
                            {offer.salary.frequency || ''}
                          </p>
                        </div>
                      )}
                      {offer.joiningDate && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Joining Date
                          </p>
                          <p className="font-medium">
                            {format(new Date(offer.joiningDate), "PPP")}
                          </p>
                        </div>
                      )}
                      {offer.expiryDate && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            Expiry Date
                          </p>
                          <p className="font-medium">
                            {format(new Date(offer.expiryDate), "PPP")}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Notes */}
                    {offer.notes && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Additional Notes</p>
                          <p className="text-sm whitespace-pre-wrap">{offer.notes}</p>
                        </div>
                      </>
                    )}

                    {/* Attachments */}
                    {offer.attachments && offer.attachments.length > 0 && (
                      <>
                        <Separator />
                        <div className="space-y-4">
                          <h3 className="font-semibold text-lg">Attached Documents</h3>
                          <div className="space-y-2">
                            {offer.attachments.map((attachment: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <FileText className="h-5 w-5 text-primary" />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{attachment.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {attachment.type || "Document"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => window.open(attachment.url, "_blank")}
                                    className="gap-2"
                                  >
                                    <Eye className="h-4 w-4" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const link = document.createElement("a");
                                      link.href = attachment.url;
                                      link.download = attachment.name;
                                      link.target = "_blank";
                                      link.click();
                                    }}
                                    className="gap-2"
                                  >
                                    <Download className="h-4 w-4" />
                                    Download
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Offer Letter Content Preview */}
                {offerLetterContent && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Offer Letter</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {business?.logo && (
                        <div className="mb-4 flex justify-center">
                          <img
                            src={business.logo}
                            alt={business.name || "Company Logo"}
                            className="max-h-24 object-contain"
                          />
                        </div>
                      )}
                      <div
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: offerLetterContent }}
                      />
                    </CardContent>
                  </Card>
                )}

                {/* Action Buttons */}
                {offer.status === "SENT" && (
                  <Card className="border-2 border-primary/20">
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row gap-4 justify-end">
                        <Button
                          variant="outline"
                          onClick={() => setShowRejectDialog(true)}
                          disabled={isRejecting}
                          className="gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          {isRejecting ? "Rejecting..." : "Reject Offer"}
                        </Button>
                        <Button
                          onClick={handleAcceptOffer}
                          disabled={isAccepting}
                          className="gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          {isAccepting ? "Accepting..." : "Accept Offer"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Status Messages */}
                {offer.status === "ACCEPTED" && (
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">
                            Offer Accepted
                          </p>
                          <p className="text-sm text-green-700">
                            You accepted this offer on{" "}
                            {offer.acceptedAt
                              ? format(new Date(offer.acceptedAt), "PPP 'at' p")
                              : "recently"}
                            . The HR team will contact you soon.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {offer.status === "REJECTED" && (
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium text-red-900">Offer Rejected</p>
                          <p className="text-sm text-red-700">
                            You rejected this offer on{" "}
                            {offer.rejectedAt
                              ? format(new Date(offer.rejectedAt), "PPP 'at' p")
                              : "recently"}
                            .
                            {offer.rejectionReason && (
                              <span className="block mt-1">
                                Reason: {offer.rejectionReason}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center py-12">
                    <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Offer Available</h3>
                    <p className="text-muted-foreground">
                      You haven't received an offer for this job position yet.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Requirements */}
        {job.requirements && job.requirements.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Requirements
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2">
                {job.requirements.map((req, index) => (
                  <li key={index} className="text-foreground">
                    {req}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Perks/Benefits */}
        {(job as any).benefits && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Perks & Benefits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <p className="whitespace-pre-wrap text-foreground">{(job as any).benefits}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Location Details */}
        {job.workplaceType !== "Remote" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                Location Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(job as any).city && (
                  <div>
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="font-medium">{(job as any).city}</p>
                  </div>
                )}
                {(job as any).province && (
                  <div>
                    <p className="text-sm text-muted-foreground">State/Province</p>
                    <p className="font-medium">{(job as any).province}</p>
                  </div>
                )}
                {(job as any).country && (
                  <div>
                    <p className="text-sm text-muted-foreground">Country</p>
                    <p className="font-medium">{(job as any).country}</p>
                  </div>
                )}
                {(job as any).postalCode && (
                  <div>
                    <p className="text-sm text-muted-foreground">Postal Code</p>
                    <p className="font-medium">{(job as any).postalCode}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Apply Button at Bottom */}
        <div className="flex justify-center pb-6">
          {!hasApplied ? (
            <Button onClick={handleApply} size="lg" className="px-8">
              Apply for this Position
            </Button>
          ) : (
            <Badge variant="secondary" className="px-6 py-3 text-base">
              {applicationStatus ? applicationStatus.replace(/_/g, ' ') : 'You have already applied'}
            </Badge>
          )}
        </div>

        {/* Application Form Modal */}
        <Dialog 
          open={showApplicationForm} 
          onOpenChange={(open) => {
            setShowApplicationForm(open);
            if (!open) {
              setFormData({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                countryCode: "91",
                education: [],
                experience: [],
                jobOpeningId: "",
              });
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Form</DialogTitle>
              <DialogDescription>
                Please fill out the application form to apply for this position. Your profile information has been pre-filled.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <CandidateApplicationForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleFormSubmit}
                isLoading={isApplying}
                isPublic={false}
                skipValidation={true}
                hideJobSelection={true}
                selectedJobTitle={job.title}
                availableJobOpenings={[{ _id: job._id, title: job.title, department: job.department || "" }]}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Reject Offer Dialog */}
        <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Offer</DialogTitle>
              <DialogDescription>
                Are you sure you want to reject this offer? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">
                  Reason for Rejection (Optional)
                </Label>
                <textarea
                  id="rejection-reason"
                  className="w-full min-h-[100px] p-2 border rounded-md"
                  placeholder="Please provide a reason for rejecting this offer..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowRejectDialog(false);
                    setRejectionReason("");
                  }}
                >
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleRejectOffer} disabled={isRejecting}>
                  {isRejecting ? "Rejecting..." : "Reject Offer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default CandidateJobDetail;

