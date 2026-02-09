import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input, Select, DatePicker, TimePicker, Form, message, Modal, Spin, Button as AntButton } from "antd";
import { Download, Calendar, MapPin, User, Briefcase, GraduationCap, FileText, Clock, Video, Building2, AlertCircle } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetCandidateByIdQuery, useUpdateCandidateMutation, useUpdateCandidateStatusMutation } from "@/store/api/candidateApi";
import {
  useGetCandidateInterviewsQuery,
  useScheduleInterviewMutation,
  useUpdateInterviewMutation
} from "@/store/api/interviewApi";
import InterviewStatusTimeline from "@/components/candidate/InterviewStatusTimeline";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { useGetInterviewProgressQuery } from "@/store/api/interviewResponseApi";
import { getCandidateAction } from "@/utils/candidateActionUtils";
import { useAppSelector } from "@/store/hooks";
import { getCountryOptions } from "@/utils/countryCodeUtils";

dayjs.extend(customParseFormat);

const { TextArea } = Input;
const { Option } = Select;

const InterviewStatusTimelineContainer = ({ candidate, interviews }: { candidate: any, interviews: any[] }) => {
  const { data: progressData } = useGetInterviewProgressQuery(candidate._id, {
    skip: !candidate._id
  });

  return (
    <InterviewStatusTimeline
      timeline={progressData?.data?.timeline}
    />
  );
};

const CandidateProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editInterviewModalOpen, setEditInterviewModalOpen] = useState(false);
  const [editContactModalOpen, setEditContactModalOpen] = useState(false);
  const [selectedInterview, setSelectedInterview] = useState<any>(null);
  const [form] = Form.useForm();
  const [interviewForm] = Form.useForm();
  const [editContactForm] = Form.useForm();
  const currentUser = useAppSelector((state) => state.auth.user);
  const canEditCandidate = currentUser?.role === 'Admin';
  const countryOptions = getCountryOptions();
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("91");

  const { data: candidateData, isLoading: isLoadingCandidate, refetch: refetchCandidate } = useGetCandidateByIdQuery(id!);
  const { data: interviewsData, isLoading: isLoadingInterviews, refetch: refetchInterviews } = useGetCandidateInterviewsQuery(id!);
  const [updateCandidateStatus] = useUpdateCandidateStatusMutation();
  const [updateCandidate, { isLoading: isUpdatingCandidate }] = useUpdateCandidateMutation();
  const [scheduleInterview, { isLoading: isScheduling }] = useScheduleInterviewMutation();
  const [updateInterview, { isLoading: isUpdating }] = useUpdateInterviewMutation();

  const candidate = candidateData?.data?.candidate;
  const interviews = interviewsData?.data?.interviews || [];

  const handleScheduleInterview = async (values: any) => {
    // Check if candidate is hired for another job
    if (candidate?.hiredForOtherJob) {
      message.error(`This candidate has already been hired for ${candidate.hiredForOtherJob.jobTitle}. Cannot schedule interviews.`);
      return;
    }

    try {
      await scheduleInterview({
        candidateId: id!,
        data: {
          interviewType: 'Virtual', // Default value - not shown in UI (backend requires this field)
          interviewDate: values.interviewDate.format('YYYY-MM-DD'),
          interviewTime: values.interviewTime.format('HH:mm'),
          interviewMode: values.interviewMode,
          notes: values.notes,
        }
      }).unwrap();

      message.success("Interview scheduled successfully!");
      setScheduleModalOpen(false);
      form.resetFields();
      refetchCandidate();
      refetchInterviews();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to schedule interview");
    }
  };

  const handleUpdateInterview = async (values: any) => {
    try {
      await updateInterview({
        id: selectedInterview._id,
        data: {
          interviewType: values.interviewType,
          interviewDate: values.interviewDate.format('YYYY-MM-DD'),
          interviewTime: values.interviewTime.format('HH:mm'),
          interviewLocation: values.interviewLocation,
          interviewMode: values.interviewMode,
          interviewerName: values.interviewerName,
          interviewerEmail: values.interviewerEmail,
          notes: values.notes,
          status: values.status,
        }
      }).unwrap();

      message.success("Interview updated successfully!");
      setEditInterviewModalOpen(false);
      interviewForm.resetFields();
      refetchInterviews();
      refetchCandidate();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to update interview");
    }
  };

  const openEditInterview = (interview: any) => {
    setSelectedInterview(interview);
    interviewForm.setFieldsValue({
      interviewType: interview.interviewType,
      interviewDate: dayjs(interview.interviewDate),
      interviewTime: dayjs(interview.interviewTime, 'HH:mm'),
      interviewLocation: interview.interviewLocation,
      interviewMode: interview.interviewMode,
      interviewerName: interview.interviewerName,
      interviewerEmail: interview.interviewerEmail,
      notes: interview.notes,
      status: interview.status,
    });
    setEditInterviewModalOpen(true);
  };

  const handleOpenEditContact = () => {
    if (!candidate) return;
    const countryCode = candidate.countryCode || '91';
    setSelectedCountryCode(countryCode);
    editContactForm.setFieldsValue({
      firstName: candidate.firstName,
      lastName: candidate.lastName,
      email: candidate.email,
      phone: candidate.phone,
      countryCode: countryCode,
    });
    setEditContactModalOpen(true);
  };

  const handleUpdateContact = async (values: any) => {
    if (!candidate) return;
    try {
      await updateCandidate({
        id: candidate._id,
        data: {
          firstName: values.firstName?.trim(),
          lastName: values.lastName?.trim(),
          email: values.email?.trim(),
          phone: values.phone?.trim(),
          countryCode: values.countryCode?.trim() || undefined,
        }
      }).unwrap();

      message.success("Candidate details updated");
      setEditContactModalOpen(false);
      refetchCandidate();
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to update candidate");
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Hired':
      case 'Selected':
        return 'default';
      case 'Rejected':
        return 'destructive';
      case 'Interview':
      case 'Scheduled':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoadingCandidate) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Spin size="large" />
        </div>
      </MainLayout>
    );
  }

  if (!candidate) {
    return (
      <MainLayout>
        <div className="p-4">
          <Button onClick={() => navigate(-1)} className="mb-4">← Back</Button>
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Candidate not found</p>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <main className="p-3 sm:p-4 lg:p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Button onClick={() => navigate(-1)} variant="outline" className="w-fit">← Back</Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {candidate.firstName} {candidate.lastName}
                </h1>
                <p className="text-muted-foreground text-sm sm:text-base">{candidate.position}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={getStatusBadgeVariant(candidate.status)} className="text-sm px-3 py-1">
                {candidate.status}
              </Badge>
              {(() => {
                const action = getCandidateAction(candidate);

                // If view is 'NONE' or 'VIEW_PROFILE' (which effectively means we are already here and no action is needed), default to showing nothing or a status text
                if (action.type === 'VIEW_PROFILE' || action.type === 'NONE') return null;

                return (
                  <Button
                    className={action.color}
                    variant={action.variant}
                    disabled={action.disabled || !!candidate?.hiredForOtherJob}
                    onClick={() => {
                      if (candidate?.hiredForOtherJob && action.type === 'SCHEDULE') {
                        message.warning(`This candidate has already been hired for ${candidate.hiredForOtherJob.jobTitle}. Cannot schedule interviews.`);
                        return;
                      }
                      switch (action.type) {
                        case 'SCHEDULE':
                          setScheduleModalOpen(true);
                          break;
                        case 'START':
                          // Navigate to progress page to start the interview
                          navigate(`/interview/candidate/${candidate._id}/progress`);
                          break;
                        case 'VIEW_PROGRESS':
                          navigate(`/interview/candidate/${candidate._id}/progress`);
                          break;
                        case 'GENERATE_OFFER':
                          navigate(`/offer-letter/create?candidateId=${candidate._id}`);
                          break;
                        case 'VIEW_OFFER':
                          navigate("/offer-letter");
                          break;
                        case 'BACKGROUND_VERIFICATION':
                          const hasDocs = candidate.documents && candidate.documents.length > 0;
                          if (hasDocs) {
                            navigate(`/interview/background-verification/${candidate._id}`);
                          } else {
                            navigate(`/interview/candidate/${candidate._id}/progress`);
                          }
                          break;
                        case 'CONVERT_TO_STAFF':
                          // Existing logic for convert
                          if (candidate.status !== 'OFFER_ACCEPTED' && candidate.status !== 'HIRED') {
                            updateCandidateStatus({
                              id: candidate._id,
                              status: 'OFFER_ACCEPTED'
                            }).then(() => {
                              message.success("Candidate marked as ready for hiring");
                              navigate('/hiring');
                            }).catch((err) => {
                              message.error(err?.data?.error?.message || "Failed to update candidate status");
                            });
                          } else {
                            navigate('/hiring');
                          }
                          break;
                      }
                    }}
                  >
                    {action.label}
                  </Button>
                );
              })()}
            </div>
          </div>

          {/* HIRED for Other Job Warning */}
          {candidate?.hiredForOtherJob && candidate.status !== 'HIRED' && (
            <Card className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-950">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-100 mb-2">
                      Candidate Already Hired for Another Job
                    </h3>
                    <p className="text-sm text-orange-800 dark:text-orange-200">
                      This candidate has already been hired and converted to an employee for <strong>{candidate.hiredForOtherJob.jobTitle}</strong>. 
                      They cannot proceed with the interview process for this job. Please contact HR if this is an error.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Candidate Details */}
          <div className="space-y-6">
            {/* Personal Details */}
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <CardTitle className="flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Personal Details
                        </CardTitle>
                        {canEditCandidate && (
                          <Button size="sm" variant="outline" onClick={handleOpenEditContact}>
                            Edit
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                  <p className="text-base">{candidate.firstName} {candidate.lastName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                  <p className="text-base">{candidate.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Mobile Number</label>
                  <p className="text-base">{candidate.phone}</p>
                </div>
                {candidate.gender && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Gender</label>
                    <p className="text-base">{candidate.gender}</p>
                  </div>
                )}
                {candidate.dateOfBirth && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                    <p className="text-base">{new Date(candidate.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                )}
                {candidate.currentCity && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Current City / Location</label>
                    <p className="text-base">{candidate.currentCity}</p>
                  </div>
                )}
                {candidate.preferredJobLocation && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Preferred Job Location</label>
                    <p className="text-base">{candidate.preferredJobLocation}</p>
                  </div>
                )}
                {candidate.resume && (
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Resume</label>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(candidate.resume?.url, '_blank')}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        {candidate.resume.name || 'View Resume'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Referral Information */}
            {candidate.source === 'REFERRAL' && (candidate.referrerId || candidate.referralMetadata) && (
              <Card className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <User className="w-5 h-5" />
                    Referral Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {candidate.referrerId && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Referred By</label>
                      <div className="mt-1">
                        {typeof candidate.referrerId === 'object' && candidate.referrerId ? (
                          <div>
                            <p className="text-base font-semibold">
                              {candidate.referrerId.name || 
                               `${(candidate.referrerId as any).firstName || ''} ${(candidate.referrerId as any).lastName || ''}`.trim() || 
                               'Unknown'}
                            </p>
                            {candidate.referrerId.email && (
                              <p className="text-sm text-muted-foreground">{candidate.referrerId.email}</p>
                            )}
                          </div>
                        ) : (
                          <p className="text-base">Referrer ID: {typeof candidate.referrerId === 'string' ? candidate.referrerId : candidate.referrerId?._id || 'N/A'}</p>
                        )}
                      </div>
                    </div>
                  )}
                  {candidate.referralMetadata?.relationship && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Relationship</label>
                      <p className="text-base capitalize">{candidate.referralMetadata.relationship}</p>
                    </div>
                  )}
                  {candidate.referralMetadata?.knownPeriod && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Known Period</label>
                      <p className="text-base">
                        {candidate.referralMetadata.knownPeriod === 'less-1' ? 'Less than 1 year' :
                         candidate.referralMetadata.knownPeriod === '1-3' ? '1-3 years' :
                         candidate.referralMetadata.knownPeriod === '3-5' ? '3-5 years' :
                         candidate.referralMetadata.knownPeriod === 'more-5' ? 'More than 5 years' :
                         candidate.referralMetadata.knownPeriod}
                      </p>
                    </div>
                  )}
                  {candidate.referralMetadata?.notes && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">Referrer Notes</label>
                      <p className="text-base mt-1 whitespace-pre-wrap">{candidate.referralMetadata.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            {/* Educational Details */}
                  {candidate.education && candidate.education.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <GraduationCap className="w-5 h-5" />
                          Educational Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {candidate.education.map((edu: any, index: number) => (
                          <div key={index} className="border rounded-lg p-4 space-y-2">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Highest Qualification</label>
                          <p className="text-base">{edu.qualification || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Degree / Course Name</label>
                          <p className="text-base">{edu.courseName || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Institution Name</label>
                          <p className="text-base">{edu.institution || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">University / Board</label>
                          <p className="text-base">{edu.university || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Year of Passing</label>
                          <p className="text-base">{edu.yearOfPassing || '-'}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Percentage / CGPA</label>
                          <p className="text-base">
                            {edu.percentage ? `${edu.percentage}%` : edu.cgpa ? `CGPA: ${edu.cgpa}` : '-'}
                          </p>
                        </div>
                      </div>
                            </div>
                        ))}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No educational details available
                      </CardContent>
                    </Card>
                  )}
            {/* Work Experience */}
                  {(candidate.totalYearsOfExperience || candidate.experience?.length > 0) ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Briefcase className="w-5 h-5" />
                          Work Experience Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {candidate.totalYearsOfExperience && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Total Years of Experience</label>
                              <p className="text-base">{candidate.totalYearsOfExperience} years</p>
                            </div>
                          )}
                          {candidate.currentCompany && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Current Company</label>
                              <p className="text-base">{candidate.currentCompany}</p>
                            </div>
                          )}
                          {candidate.currentJobTitle && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Current Job Title</label>
                              <p className="text-base">{candidate.currentJobTitle}</p>
                            </div>
                          )}
                          {candidate.employmentType && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Employment Type</label>
                              <p className="text-base">{candidate.employmentType}</p>
                            </div>
                          )}
                        </div>
                        {candidate.experience && candidate.experience.length > 0 && (
                          <div className="space-y-4 mt-4">
                            <h4 className="font-semibold">Previous Companies:</h4>
                            {candidate.experience.map((exp: any, index: number) => (
                              <div key={index} className="border rounded-lg p-4 space-y-2">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                              <p className="text-base">{exp.company || '-'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Role</label>
                              <p className="text-base">{exp.role || exp.designation || '-'}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Duration</label>
                              <p className="text-base">
                                {exp.durationFrom
                                  ? `${new Date(exp.durationFrom).toLocaleDateString()} - ${exp.durationTo ? new Date(exp.durationTo).toLocaleDateString() : 'Present'}`
                                  : '-'}
                              </p>
                            </div>
                          </div>
                          {exp.keyResponsibilities && (
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">Responsibilities</label>
                              <p className="text-base whitespace-pre-wrap">{exp.keyResponsibilities}</p>
                            </div>
                          )}
                                </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center text-muted-foreground">
                        No work experience details available
                      </CardContent>
                    </Card>
                  )}
            {/* Application Details */}
            {candidate && (
              <InterviewStatusTimelineContainer
                candidate={candidate}
                interviews={interviews}
              />
            )}

            {/* Interviews Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Interviews {interviews.length > 0 && `(${interviews.length})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                      {isLoadingInterviews ? (
                        <div className="flex justify-center py-8">
                          <Spin />
                        </div>
                      ) : interviews.length === 0 ? (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground mb-4">No interviews scheduled yet</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {interviews.map((interview: any) => (
                            <Card key={interview._id}>
                              <CardHeader>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                  <CardTitle className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Round {interview.round} - {interview.status}
                                  </CardTitle>
                                  <div className="flex items-center gap-2">
                                    <Badge variant={getStatusBadgeVariant(interview.status)}>
                                      {interview.status}
                                    </Badge>
                                    <Button size="sm" variant="outline" onClick={() => openEditInterview(interview)}>
                                      Edit
                                    </Button>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Date & Time</label>
                                    <p className="text-base">
                                      {new Date(interview.interviewDate).toLocaleDateString()} at {interview.interviewTime}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {interview.interviewType === 'Virtual' ? (
                                    <Video className="w-4 h-4 text-muted-foreground" />
                                  ) : (
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Type</label>
                                    <p className="text-base">{interview.interviewType}</p>
                                  </div>
                                </div>
                                {interview.interviewLocation && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-muted-foreground" />
                                    <div>
                                      <label className="text-sm font-medium text-muted-foreground">Location</label>
                                      <p className="text-base">{interview.interviewLocation}</p>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center gap-2">
                                  <Clock className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Mode</label>
                                    <p className="text-base">{interview.interviewMode}</p>
                                  </div>
                                </div>
                                {interview.interviewerName && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Interviewer</label>
                                    <p className="text-base">{interview.interviewerName}</p>
                                    {interview.interviewerEmail && (
                                      <p className="text-sm text-muted-foreground">{interview.interviewerEmail}</p>
                                    )}
                                  </div>
                                )}
                                {interview.notes && (
                                  <div className="sm:col-span-2">
                                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                                    <p className="text-base whitespace-pre-wrap">{interview.notes}</p>
                                  </div>
                                )}
                                {interview.feedback && (
                                  <div className="sm:col-span-2">
                                    <label className="text-sm font-medium text-muted-foreground">Feedback</label>
                                    <p className="text-base whitespace-pre-wrap">{interview.feedback}</p>
                                  </div>
                                )}
                                {interview.rating && (
                                  <div>
                                    <label className="text-sm font-medium text-muted-foreground">Rating</label>
                                    <p className="text-base">{interview.rating}/5</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
              </CardContent>
            </Card>

            {/* Application Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Application Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Job Role Applied For</label>
                  <p className="text-base">{candidate.position}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Application Source</label>
                  <p className="text-base">{candidate.source || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Application Status</label>
                  <Badge variant={getStatusBadgeVariant(candidate.status)}>
                    {candidate.status}
                  </Badge>
                </div>
                {candidate.createdBy && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created By</label>
                    <p className="text-base">{candidate.createdBy.name} ({candidate.createdBy.role || 'System'})</p>
                  </div>
                )}
                {candidate.createdAt && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                    <p className="text-base">{new Date(candidate.createdAt).toLocaleDateString()}</p>
                  </div>
                )}
                {candidate.skills && candidate.skills.length > 0 && (
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Skills</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {candidate.skills.map((skill: string, index: number) => (
                        <Badge key={index} variant="outline">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Contact Modal */}
        <Modal
          title="Edit Candidate Contact"
          open={editContactModalOpen}
          onCancel={() => {
            setEditContactModalOpen(false);
            editContactForm.resetFields();
          }}
          footer={null}
          width={520}
          destroyOnClose
        >
          <Form
            form={editContactForm}
            layout="vertical"
            onFinish={handleUpdateContact}
          >
            <Form.Item
              name="firstName"
              label="First Name"
              rules={[{ required: true, message: 'First name is required' }]}
            >
              <Input placeholder="Enter first name" />
            </Form.Item>
            <Form.Item
              name="lastName"
              label="Last Name"
              rules={[{ required: true, message: 'Last name is required' }]}
            >
              <Input placeholder="Enter last name" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: 'email', message: 'Valid email is required' }]}
            >
              <Input placeholder="Enter email" />
            </Form.Item>
            <Form.Item
              name="countryCode"
              label="Country Code"
              rules={[{ required: true, message: "Country code is required" }]}
            >
              <Select
                value={selectedCountryCode}
                onChange={(value) => {
                  setSelectedCountryCode(value);
                  editContactForm.setFieldsValue({ countryCode: value });
                }}
                showSearch
                filterOption={(input, option) => {
                  const label = typeof option?.label === 'string' ? option.label : String(option?.label || '');
                  return label.toLowerCase().includes(input.toLowerCase());
                }}
              >
                {countryOptions.map((country) => (
                  <Option key={country.value} value={country.value}>
                    {country.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="phone"
              label="Mobile Number"
              rules={[{ required: true, message: 'Phone number is required' }]}
            >
              <Input placeholder="Enter phone number" />
            </Form.Item>
            <Form.Item>
              <div className="flex justify-end gap-2">
                <Button onClick={() => {
                  setEditContactModalOpen(false);
                  editContactForm.resetFields();
                }}>
                  Cancel
                </Button>
                <AntButton type="primary" htmlType="submit" loading={isUpdatingCandidate}>
                  Save Changes
                </AntButton>
              </div>
            </Form.Item>
          </Form>
        </Modal>

        {/* Schedule Interview Modal */}
        <Modal
          title="Schedule Interview"
          open={scheduleModalOpen}
          onCancel={() => {
            setScheduleModalOpen(false);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
          {candidate?.hiredForOtherJob && (
            <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 rounded">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Warning:</strong> This candidate has already been hired for {candidate.hiredForOtherJob.jobTitle}. 
                Interview scheduling is disabled.
              </p>
            </div>
          )}
          <Form
            form={form}
            layout="vertical"
            onFinish={handleScheduleInterview}
            initialValues={{
              interviewMode: 'Virtual',
            }}
          >
            <Form.Item
              name="interviewDate"
              label="Interview Date"
              rules={[{ required: true, message: 'Please select interview date' }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>

            <Form.Item
              name="interviewTime"
              label="Interview Time"
              rules={[{ required: true, message: 'Please select interview time' }]}
            >
              <TimePicker className="w-full" format="HH:mm" />
            </Form.Item>

            <Form.Item
              name="interviewMode"
              label="Interview Mode"
              rules={[{ required: true, message: 'Please select interview mode' }]}
            >
              <Select>
                <Select.Option value="Virtual">Virtual</Select.Option>
                <Select.Option value="Direct">In-Person</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notes"
            >
              <TextArea rows={4} placeholder="Enter any additional notes" />
            </Form.Item>

            <Form.Item>
              <div className="flex justify-end gap-2">
                <Button onClick={() => {
                  setScheduleModalOpen(false);
                  form.resetFields();
                }}>
                  Cancel
                </Button>
                <AntButton 
                  type="primary" 
                  htmlType="submit" 
                  loading={isScheduling}
                  disabled={!!candidate?.hiredForOtherJob}
                >
                  Schedule Interview
                </AntButton>
              </div>
            </Form.Item>
          </Form>
        </Modal>

        {/* Edit Interview Modal */}
        <Modal
          title="Edit Interview"
          open={editInterviewModalOpen}
          onCancel={() => {
            setEditInterviewModalOpen(false);
            interviewForm.resetFields();
            setSelectedInterview(null);
          }}
          footer={null}
          width={600}
        >
          <Form
            form={interviewForm}
            layout="vertical"
            onFinish={handleUpdateInterview}
          >
            <Form.Item
              name="interviewType"
              label="Interview Type"
              rules={[{ required: true, message: 'Please select interview type' }]}
            >
              <Select>
                <Select.Option value="Virtual">Virtual</Select.Option>
                <Select.Option value="In-Person">In-Person</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="interviewDate"
              label="Interview Date"
              rules={[{ required: true, message: 'Please select interview date' }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>

            <Form.Item
              name="interviewTime"
              label="Interview Time"
              rules={[{ required: true, message: 'Please select interview time' }]}
            >
              <TimePicker className="w-full" format="HH:mm" />
            </Form.Item>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) => prevValues.interviewType !== currentValues.interviewType}
            >
              {({ getFieldValue }) =>
                getFieldValue('interviewType') === 'In-Person' ? (
                  <Form.Item
                    name="interviewLocation"
                    label="Interview Location"
                    rules={[{ required: true, message: 'Location is required for In-Person interviews' }]}
                  >
                    <Input placeholder="Enter interview location" />
                  </Form.Item>
                ) : (
                  <Form.Item name="interviewLocation" label="Interview Location">
                    <Input placeholder="Enter interview location (optional for Virtual)" />
                  </Form.Item>
                )
              }
            </Form.Item>

            <Form.Item
              name="interviewMode"
              label="Interview Mode"
              rules={[{ required: true, message: 'Please select interview mode' }]}
            >
              <Select>
                <Select.Option value="Virtual">Virtual</Select.Option>
                <Select.Option value="Direct">Direct</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="interviewerName"
              label="Interviewer Name"
            >
              <Input placeholder="Enter interviewer name" />
            </Form.Item>

            <Form.Item
              name="interviewerEmail"
              label="Interviewer Email"
            >
              <Input type="email" placeholder="Enter interviewer email" />
            </Form.Item>

            <Form.Item
              name="status"
              label="Interview Status"
            >
              <Select>
                <Select.Option value="Scheduled">Scheduled</Select.Option>
                <Select.Option value="Completed">Completed</Select.Option>
                <Select.Option value="Selected">Selected</Select.Option>
                <Select.Option value="Rejected">Rejected</Select.Option>
                <Select.Option value="Rescheduled">Rescheduled</Select.Option>
                <Select.Option value="Cancelled">Cancelled</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="notes"
              label="Notes"
            >
              <TextArea rows={4} placeholder="Enter any additional notes" />
            </Form.Item>

            <Form.Item>
              <div className="flex justify-end gap-2">
                <Button onClick={() => {
                  setEditInterviewModalOpen(false);
                  interviewForm.resetFields();
                  setSelectedInterview(null);
                }}>
                  Cancel
                </Button>
                <AntButton type="primary" htmlType="submit" loading={isUpdating}>
                  Update Interview
                </AntButton>
              </div>
            </Form.Item>
          </Form>
        </Modal>
      </main>
    </MainLayout>
  );
};

export default CandidateProfile;
