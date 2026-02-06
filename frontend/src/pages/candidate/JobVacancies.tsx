import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MainLayout from "@/components/MainLayout";
import { 
  useGetJobVacanciesQuery, 
  useApplyForJobMutation,
  useGetCandidateProfileQuery
} from "@/store/api/candidateDashboardApi";
import { Briefcase, MapPin, Clock, Building2, CheckCircle2, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import CandidateApplicationForm from "@/components/candidate/CandidateApplicationForm";
import { CandidateFormData } from "@/store/api/candidateFormApi";

const JobVacancies = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useGetJobVacanciesQuery();
  const { data: profileData } = useGetCandidateProfileQuery();
  const [applyForJob, { isLoading: isApplying }] = useApplyForJobMutation();
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
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

  // Pre-fill form data from profile when modal opens
  useEffect(() => {
    if (showApplicationForm && profileData?.data?.candidateData && selectedJobId) {
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
        jobOpeningId: selectedJobId,
      });
    }
  }, [showApplicationForm, profileData, selectedJobId]);

  const handleApply = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowApplicationForm(true);
  };

  const handleFormSubmit = async (data: CandidateFormData) => {
    if (!selectedJobId) return;

    try {
      // Prepare form data for submission
      const submitData = {
        ...data,
        jobOpeningId: selectedJobId,
      };

      const result = await applyForJob({ 
        jobId: selectedJobId, 
        formData: submitData,
        skipValidation: true // Skip validation when applying from profile
      }).unwrap();
      
      toast.success(result.message || 'Application submitted successfully');
      setShowApplicationForm(false);
      setSelectedJobId(null);
      refetch(); // Refresh job list to update button states
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

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading job openings...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="text-center py-12 text-destructive">
            Error loading job openings
          </div>
        </div>
      </MainLayout>
    );
  }

  const jobVacancies = data?.data?.jobVacancies || [];

  const getButtonState = (job: any) => {
    if (!job.hasApplied) {
      return { text: 'Apply', variant: 'default' as const, disabled: false };
    }
    
    if (job.canReapply) {
      return { text: 'Re-Apply', variant: 'default' as const, disabled: false };
    }
    
    // Active application exists
    const statusLabels: Record<string, string> = {
      'APPLIED': 'Applied',
      'INTERVIEW_SCHEDULED': 'Interview Scheduled',
      'HR_INTERVIEW_IN_PROGRESS': 'Interview In Progress',
      'HR_INTERVIEW_COMPLETED': 'Interview Completed',
      'MANAGER_INTERVIEW_IN_PROGRESS': 'Manager Interview In Progress',
      'MANAGER_INTERVIEW_COMPLETED': 'Manager Interview Completed',
      'INTERVIEW_COMPLETED': 'Interview Completed',
      'SELECTED': 'Selected',
      'OFFER_SENT': 'Offer Sent',
      'OFFER_ACCEPTED': 'Offer Accepted',
      'HIRED': 'Hired'
    };
    
    const statusLabel = statusLabels[job.applicationStatus] || job.applicationStatus || 'Applied';
    return { 
      text: statusLabel, 
      variant: 'secondary' as const, 
      disabled: true 
    };
  };

  return (
    <MainLayout>
      <div className="p-4 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Job Openings</h1>
          <p className="text-muted-foreground mt-1">
            Browse available positions and apply
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobVacancies.length > 0 ? (
            jobVacancies.map((job) => {
              const buttonState = getButtonState(job);
              const isApplyingThisJob = applyingJobId === job._id && isApplying;
              
              return (
                <Card key={job._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Briefcase className="w-5 h-5 flex-shrink-0" />
                          <span className="truncate">{job.position}</span>
                        </CardTitle>
                        {job.department && (
                          <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                            <Building2 className="w-4 h-4" />
                            <span>{job.department}</span>
                          </div>
                        )}
                      </div>
                      <Badge variant={job.status === 'ACTIVE' ? 'default' : 'secondary'}>
                        {job.openPositions} {job.openPositions === 1 ? 'Position' : 'Positions'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {job.location && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-4 h-4" />
                          <span>{job.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span>Updated {formatDistanceToNow(new Date(job.latestUpdate), { addSuffix: true })}</span>
                      </div>
                      {job.employmentType && (
                        <Badge variant="outline" className="text-xs">
                          {job.employmentType}
                        </Badge>
                      )}
                      <div className="flex gap-2 mt-4">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/candidate/job-detail/${job._id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        <Button
                          className="flex-1"
                          variant={buttonState.variant}
                          disabled={buttonState.disabled || isApplyingThisJob}
                          onClick={() => !buttonState.disabled && handleApply(job._id)}
                        >
                          {isApplyingThisJob ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Applying...
                            </>
                          ) : buttonState.disabled ? (
                            <>
                              <CheckCircle2 className="w-3 h-4 mr-2" />
                              {buttonState.text}
                            </>
                          ) : (
                            buttonState.text
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground">No active job openings at the moment.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Check back later for new opportunities.
              </p>
            </div>
          )}
        </div>

        {/* Application Form Modal */}
        <Dialog 
          open={showApplicationForm} 
          onOpenChange={(open) => {
            setShowApplicationForm(open);
            if (!open) {
              // Reset form when modal closes
              setSelectedJobId(null);
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
                selectedJobTitle={selectedJobId ? jobVacancies.find(job => job._id === selectedJobId)?.position : undefined}
                availableJobOpenings={jobVacancies.map(job => ({ _id: job._id, title: job.position, department: job.department }))}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default JobVacancies;

