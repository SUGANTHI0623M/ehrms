import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X, ArrowLeft, Check, ChevronsUpDown, Edit2, MapPin, Users, FileText, Building2, Search } from "lucide-react";
import {
  useGetJobOpeningByIdQuery,
  useCreateJobOpeningMutation,
  useUpdateJobOpeningMutation,
  usePublishJobOpeningMutation,
  useGetDepartmentsQuery,
  useCreateDepartmentMutation,
  useGetNextJobCodeQuery, // Import new hook
  useGetCandidatesByJobIdQuery,
} from "@/store/api/jobOpeningApi";
import { useGetActiveBranchesQuery } from "@/store/api/branchApi";
import { toast } from "sonner";
import { formatErrorMessage } from "@/utils/errorFormatter";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import JobDetailView from "@/components/job/JobDetailView";

interface JobOpeningFormData {
  title: string;
  description: string;
  requirements: string[];
  skills: string[];
  location: string;
  branchId?: string;
  department: string;
  employmentType: "Full-time" | "Part-time" | "Contract" | "Internship";
  workplaceType: "Remote" | "On-site" | "Hybrid" | "OffShore";
  numberOfPositions: number;
  educationalQualification: string;
  experienceLevel: "Fresher" | "Experienced" | "Fresher / Experienced";
  minExperience: number | undefined;
  maxExperience: number | undefined;
  salaryRange: {
    min: number | undefined;
    max: number | undefined;
    salaryType: "Monthly" | "Annual";
  };
  publicApplyEnabled: boolean; // Kept in interface but not used in UI for now
  status: "ACTIVE" | "INACTIVE" | "DRAFT" | "CLOSED" | "CANCELLED";
  city: string;
  province: string;
  country: string;
  postalCode: string;
  remoteJob: boolean; // Retained for logic compatibility, but UI will use workplaceType
  benefits: string; // Mapped to Perks in UI
  keyResponsibilities: string; // New field
  jobCode?: string;
}

const QUALIFICATION_OPTIONS = ["Any Degree", "Bachelor's Degree", "Master's Degree", "Diploma", "PhD"];

const JobOpeningForm = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const location = window.location.pathname;
  const isViewMode = location.includes("/view");
  const isCreateMode = !id;

  const [formData, setFormData] = useState<JobOpeningFormData>({
    title: "",
    description: "",
    requirements: [],
    skills: [],
    location: "",
    branchId: undefined as any,
    department: "",
    employmentType: "Full-time",
    workplaceType: "On-site",
    numberOfPositions: 1,
    educationalQualification: "",
    experienceLevel: "Fresher / Experienced",
    minExperience: undefined,
    maxExperience: undefined,
    salaryRange: {
      min: undefined,
      max: undefined,
      salaryType: "Annual"
    },
    publicApplyEnabled: false,
    status: "DRAFT",
    city: "",
    province: "",
    country: "",
    postalCode: "",
    remoteJob: false,
    benefits: "",
    keyResponsibilities: "",
    jobCode: "",
  });

  const [skillInput, setSkillInput] = useState("");

  const [openDepartment, setOpenDepartment] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState("");
  const [showAddDepartment, setShowAddDepartment] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState("");

  // Search state for candidates tab
  const [candidateSearch, setCandidateSearch] = useState("");
  const [debouncedCandidateSearch, setDebouncedCandidateSearch] = useState("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { data: jobData, isLoading: isLoadingJob } = useGetJobOpeningByIdQuery(id || "", { skip: isCreateMode });
  const { data: branchesData } = useGetActiveBranchesQuery();
  const { data: departmentsData, refetch: refetchDepartments } = useGetDepartmentsQuery();
  // Always call the hook, but skip the query if not in view mode or no id
  const shouldFetchCandidates = isViewMode && !!id;
  const { data: candidatesData, isLoading: isLoadingCandidates } = useGetCandidatesByJobIdQuery(id || "", { skip: !shouldFetchCandidates });

  // Fetch next job code based on branch selection (only in create mode)
  const { data: nextJobCodeData } = useGetNextJobCodeQuery(
    formData.branchId || "",
    { skip: !isCreateMode || !formData.branchId }
  );

  const [createJobOpening, { isLoading: isCreating }] = useCreateJobOpeningMutation();
  const [updateJobOpening, { isLoading: isUpdating }] = useUpdateJobOpeningMutation();
  const [publishJobOpening, { isLoading: isPublishing }] = usePublishJobOpeningMutation();
  const [createDepartment] = useCreateDepartmentMutation();

  const branches = branchesData?.data?.branches || [];
  const departments = departmentsData?.data?.departments || [];

  // Update jobCode when nextJobCodeData arrives
  useEffect(() => {
    if (isCreateMode && nextJobCodeData?.data?.jobCode) {
      setFormData(prev => ({ ...prev, jobCode: nextJobCodeData.data.jobCode }));
    }
  }, [nextJobCodeData, isCreateMode]);

  useEffect(() => {
    if (jobData?.data?.jobOpening && !isCreateMode) {
      const job = jobData.data.jobOpening;
      const eduQual = (job as any).educationalQualification || "";
      
      // Extract branchId - handle both object (populated) and string cases
      let branchIdValue: string | undefined = undefined;
      if ((job as any).branchId) {
        if (typeof (job as any).branchId === 'object' && (job as any).branchId._id) {
          branchIdValue = (job as any).branchId._id;
        } else if (typeof (job as any).branchId === 'string') {
          branchIdValue = (job as any).branchId;
        }
      }

      setFormData({
        title: job.title || "",
        description: job.description || "",
        requirements: job.requirements || [],
        skills: job.skills || [],
        location: job.location || "",
        branchId: branchIdValue,
        department: (job as any).department || "",
        employmentType: (job.employmentType as any) || "Full-time",
        workplaceType: (job as any).workplaceType || ((job.location === undefined && !(job as any).city) ? "Remote" : "On-site"),
        numberOfPositions: job.numberOfPositions || 1,
        educationalQualification: eduQual,
        experienceLevel: (job as any).experienceLevel || "Fresher / Experienced",
        minExperience: (job as any).minExperience !== undefined && (job as any).minExperience !== null ? (job as any).minExperience : undefined,
        maxExperience: (job as any).maxExperience !== undefined && (job as any).maxExperience !== null ? (job as any).maxExperience : undefined,
        salaryRange: job.salaryRange ? {
          min: job.salaryRange.min !== undefined && job.salaryRange.min !== null ? job.salaryRange.min : undefined,
          max: job.salaryRange.max !== undefined && job.salaryRange.max !== null ? job.salaryRange.max : undefined,
          salaryType: (job.salaryRange as any).salaryType || "Annual"
        } : { min: undefined, max: undefined, salaryType: "Annual" },
        publicApplyEnabled: job.publicApplyEnabled || false,
        status: (job.status as any) || "ACTIVE",
        // Address fields will be auto-populated from branch by useEffect
        city: "",
        province: "",
        country: "",
        postalCode: "",
        remoteJob: job.location === undefined && !(job as any).city,
        benefits: (job as any).benefits || "", // Backend field for Perks
        keyResponsibilities: (job as any).keyResponsibilities || "",
        jobCode: (job as any).jobCode || "",
      });
    }
  }, [jobData, isCreateMode]);

  // Update remoteJob flag based on workplaceType change
  useEffect(() => {
    const isRemote = formData.workplaceType === "Remote";
    if (formData.remoteJob !== isRemote) {
      setFormData(prev => ({ ...prev, remoteJob: isRemote }));
    }
  }, [formData.workplaceType]);

  // Update address fields based on branch selection or workplace type
  // Auto-populate address from branch when branch is selected (always read-only, based on branch)
  useEffect(() => {
    if (formData.workplaceType === "Remote") {
      // Clear address for remote jobs
      setFormData(prev => ({
        ...prev,
        city: "",
        province: "",
        country: "",
        postalCode: ""
      }));
    } else if (formData.branchId && branches.length > 0) {
      // Auto-fill address from selected branch
      const selectedBranch = branches.find(b => b._id === formData.branchId);
      let addressSource = selectedBranch?.address;

      if (!addressSource || (!addressSource.street && !addressSource.city)) {
        const headOffice = branches.find(b => b.isHeadOffice);
        if (headOffice?.address) {
          addressSource = headOffice.address;
        }
      }

      if (addressSource) {
        setFormData(prev => ({
          ...prev,
          city: addressSource?.street || addressSource?.city || "",
          province: addressSource?.state || "",
          country: addressSource?.country || "India",
          postalCode: addressSource?.pincode || ""
        }));
      } else {
        // Clear if no address found
        setFormData(prev => ({
          ...prev,
          city: "",
          province: "",
          country: "",
          postalCode: ""
        }));
      }
    } else if (!formData.branchId) {
      // Clear address if no branch selected
      setFormData(prev => ({
        ...prev,
        city: "",
        province: "",
        country: "",
        postalCode: ""
      }));
    }
  }, [formData.branchId, branches, formData.workplaceType]);


  const addSkill = () => { if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) { setFormData({ ...formData, skills: [...formData.skills, skillInput.trim()] }); setSkillInput(""); } };
  const removeSkill = (skill: string) => { setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) }); };

  const handleCreateDepartment = async () => {
    if (!newDepartmentName.trim()) {
      toast.error("Please enter a department name");
      return;
    }

    // Check if department already exists (case-insensitive)
    const existing = departments.find(d => d.name.toLowerCase() === newDepartmentName.trim().toLowerCase());
    if (existing) {
      toast.info("Department already exists");
      setFormData({ ...formData, department: existing.name });
      setShowAddDepartment(false);
      setNewDepartmentName("");
      setDepartmentSearch("");
      setOpenDepartment(false);
      return;
    }

    try {
      const result = await createDepartment({ name: newDepartmentName.trim() }).unwrap();
      if (result.success) {
        setFormData({ ...formData, department: result.data.department.name });
        toast.success("Department created successfully");
        setShowAddDepartment(false);
        setNewDepartmentName("");
        setDepartmentSearch("");
        setOpenDepartment(false);
        refetchDepartments();
      }
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || "Failed to create department";
      // Check if error is because department already exists
      if (errorMessage.toLowerCase().includes("already exists") || errorMessage.toLowerCase().includes("duplicate")) {
        toast.info("Department already exists");
        // Try to find and select the existing department
        refetchDepartments().then(() => {
          const existingDept = departments.find(d => d.name.toLowerCase() === newDepartmentName.trim().toLowerCase());
          if (existingDept) {
            setFormData({ ...formData, department: existingDept.name });
          }
        });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleSave = async (publish: boolean = false) => {
    if (!formData.title || !formData.description) { toast.error("Please fill in all required fields"); return; }
    if (!formData.educationalQualification) { toast.error("Educational Qualification is required"); return; }
    if (!formData.branchId) { toast.error("Please select a job location/branch"); return; }

    if (!formData.skills || formData.skills.length === 0) {
      toast.error("At least one required skill is mandatory");
      return;
    }

    if (formData.salaryRange.min !== undefined && formData.salaryRange.max !== undefined && 
        Number(formData.salaryRange.min) >= Number(formData.salaryRange.max) && Number(formData.salaryRange.max) > 0) {
      toast.error("Minimum salary must be less than maximum salary");
      return;
    }

    if (formData.minExperience !== undefined && formData.maxExperience !== undefined && 
        Number(formData.maxExperience) < Number(formData.minExperience) + 1) {
      toast.error("Maximum experience must be greater than minimum experience");
      return;
    }

    try {
      const payload: any = {
        title: formData.title,
        description: formData.description,
        requirements: formData.requirements,
        skills: formData.skills,
        location: formData.workplaceType === "Remote" ? undefined : formData.location || formData.city,
        branchId: formData.branchId || undefined,
        department: formData.department,
        employmentType: formData.employmentType,
        workplaceType: formData.workplaceType,
        numberOfPositions: formData.numberOfPositions,
        educationalQualification: formData.educationalQualification,
        minExperience: formData.minExperience !== undefined ? Number(formData.minExperience) : undefined,
        maxExperience: formData.maxExperience !== undefined ? Number(formData.maxExperience) : undefined,
        experienceLevel: "Fresher / Experienced",
        // Pass keyResponsibilities
        keyResponsibilities: formData.keyResponsibilities,
        salaryRange: {
          min: formData.salaryRange.min !== undefined ? Number(formData.salaryRange.min) : 0,
          max: formData.salaryRange.max !== undefined ? Number(formData.salaryRange.max) : 0,
          currency: "INR",
          salaryType: formData.salaryRange.salaryType
        },
        publicApplyEnabled: formData.publicApplyEnabled,
        // Set status: 
        // - When creating: DRAFT if not publishing, ACTIVE if publishing
        // - When editing: Preserve selected status if not publishing, ACTIVE if publishing
        status: publish ? "ACTIVE" : (isCreateMode ? "DRAFT" : formData.status),
        city: formData.city,
        province: formData.province,
        country: formData.country,
        postalCode: formData.postalCode,
        // Pass benefits as Perks
        benefits: formData.benefits
      };

      if (isCreateMode) {
        const result = await createJobOpening(payload).unwrap();
        toast.success(publish ? "Job opening created and published successfully" : "Job opening created successfully");
        if (publish && result.data.jobOpening._id) {
          await publishJobOpening(result.data.jobOpening._id).unwrap();
        }
        navigate("/job-openings");
      } else {
        await updateJobOpening({ id: id!, data: payload }).unwrap();
        toast.success(publish ? "Job opening updated and published successfully" : "Job opening updated successfully");
        if (publish) {
          await publishJobOpening(id!).unwrap();
        }
        navigate("/job-openings");
      }
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || "Failed to save job opening";
      
      // Check if it's a validation error
      if (errorMessage.includes("Validation failed") || 
          errorMessage.includes("required") || 
          errorMessage.includes("Missing required fields") ||
          error?.status === 400) {
        toast.error("Please fill all required fields", {
          position: "top-right",
        });
      } else {
        // Use formatted error message for other errors
        const formattedError = formatErrorMessage(error);
        toast.error(formattedError, {
          position: "top-right",
        });
      }
    }
  };

  const candidates = candidatesData?.data?.candidates || [];

  // Debounce candidate search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedCandidateSearch(candidateSearch);
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [candidateSearch]);

  // Filter candidates based on search query
  const filteredCandidates = useMemo(() => {
    if (!debouncedCandidateSearch.trim()) {
      return candidates;
    }

    const searchLower = debouncedCandidateSearch.toLowerCase().trim();
    return candidates.filter((candidate) => {
      const fullName = `${candidate.firstName} ${candidate.lastName}`.toLowerCase();
      const email = candidate.email?.toLowerCase() || "";
      const phone = candidate.phone?.toLowerCase() || "";
      const status = candidate.status?.replace(/_/g, " ").toLowerCase() || "";

      return (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        phone.includes(searchLower) ||
        status.includes(searchLower)
      );
    });
  }, [candidates, debouncedCandidateSearch]);

  // Helper function to get status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'HIRED':
      case 'OFFER_ACCEPTED':
        return 'default';
      case 'SELECTED':
      case 'OFFER_SENT':
        return 'default';
      case 'REJECTED':
        return 'destructive';
      case 'INTERVIEW_SCHEDULED':
      case 'HR_INTERVIEW_IN_PROGRESS':
      case 'MANAGER_INTERVIEW_IN_PROGRESS':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (isLoadingJob && !isCreateMode) return <MainLayout><div className="p-4 text-center">Loading...</div></MainLayout>;

  // Get branch logo for view mode
  const branchLogo = isViewMode && jobData?.data?.jobOpening ? (() => {
    const jobBranch = (jobData.data.jobOpening as any).branchId;
    if (typeof jobBranch === 'object' && jobBranch?.logo) {
      return jobBranch.logo;
    }
    const branch = branches.find(b => b._id === formData.branchId);
    return branch?.logo;
  })() : null;

  return (
    <MainLayout>
      <main className="p-4">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/job-openings")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              {isViewMode && branchLogo && (
                <div className="flex items-center gap-3">
                  <img 
                    src={branchLogo} 
                    alt="Branch Logo" 
                    className="w-12 h-12 rounded-lg object-cover border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold">{isCreateMode ? "Create Job Opening" : isViewMode ? "View Job Opening" : "Edit Job Opening"}</h1>
                  <Badge variant={formData.status === 'ACTIVE' ? 'default' : formData.status === 'INACTIVE' ? 'secondary' : 'outline'}>
                    {formData.status}
                  </Badge>
                </div>
                {isViewMode && formData.title && (
                  <p className="text-muted-foreground mt-1">{formData.title}</p>
                )}
              </div>
            </div>
            {!isViewMode && (
              <div className="flex gap-2">
                <Button variant="destructive" onClick={() => navigate("/job-openings")}>Cancel</Button>
                <Button variant="outline" onClick={() => handleSave(false)} disabled={isCreating || isUpdating}>
                  {isCreateMode ? "Save" : "Update Job"}
                </Button>
                {isCreateMode && (
                  <Button onClick={() => handleSave(true)} disabled={isCreating || isUpdating || formData.status === "INACTIVE"}>
                    Save & Publish
                  </Button>
                )}
              </div>
            )}
            {isViewMode && (
              <Button onClick={() => navigate(`/job-openings/${id}/edit`)}>
                <Edit2 className="mr-2 h-4 w-4" /> Edit Job
              </Button>
            )}
          </div>

          {isViewMode ? (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList>
                <TabsTrigger value="details">
                  <FileText className="mr-2 h-4 w-4" />
                  Job Details
                </TabsTrigger>
                <TabsTrigger value="applications">
                  <Users className="mr-2 h-4 w-4" />
                  Applications ({candidates.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                {jobData?.data?.jobOpening && (() => {
                  const job = jobData.data.jobOpening;
                  const jobBranch = typeof job.branchId === 'object' ? job.branchId : null;
                  const branchName = jobBranch?.branchName || branches.find(b => b._id === formData.branchId)?.branchName || "";
                  const branchCity = jobBranch?.address?.city || jobBranch?.city || branches.find(b => b._id === formData.branchId)?.address?.city || "";
                  const createdByName = typeof job.createdBy === 'object' ? job.createdBy.name : "";
                  
                  return (
                    <JobDetailView
                      job={job}
                      branchName={branchName}
                      branchCity={branchCity}
                      createdByName={createdByName}
                    />
                  );
                })()}
              </TabsContent>

              <TabsContent value="applications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Job Applications</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      All candidates who have applied for this job position
                    </p>
                  </CardHeader>
                  <CardContent>
                    {isLoadingCandidates ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="mt-4 text-muted-foreground">Loading candidates...</p>
                      </div>
                    ) : candidates.length === 0 ? (
                      <div className="text-center py-12">
                        <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                        <p className="text-muted-foreground">
                          No candidates have applied for this job opening yet.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Search Bar */}
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                          <Input
                            placeholder="Search candidates by name, email, phone, or status..."
                            className="pl-10 pr-10"
                            value={candidateSearch}
                            onChange={(e) => setCandidateSearch(e.target.value)}
                          />
                          {candidateSearch && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                              onClick={() => setCandidateSearch("")}
                              aria-label="Clear search"
                            >
                              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            </Button>
                          )}
                        </div>

                        {/* Results count */}
                        {debouncedCandidateSearch && (
                          <p className="text-sm text-muted-foreground">
                            Showing {filteredCandidates.length} of {candidates.length} candidates
                          </p>
                        )}

                        {/* Table */}
                        {filteredCandidates.length === 0 ? (
                          <div className="text-center py-12">
                            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">No candidates found</h3>
                            <p className="text-muted-foreground">
                              No candidates match your search criteria.
                            </p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <Table style={{width: 'max-content'}}>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Name</TableHead>
                                  <TableHead>Email</TableHead>
                                  <TableHead>Phone</TableHead>
                                  <TableHead>Status</TableHead>
                                  <TableHead>Stage</TableHead>
                                  <TableHead>Applied Date</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {filteredCandidates.map((candidate) => (
                                  <TableRow key={candidate._id}>
                                    <TableCell className="font-medium">
                                      {candidate.firstName} {candidate.lastName}
                                    </TableCell>
                                    <TableCell>{candidate.email}</TableCell>
                                    <TableCell>{candidate.phone}</TableCell>
                                    <TableCell>
                                      <Badge variant={getStatusBadgeVariant(candidate.status)}>
                                        {candidate.status.replace(/_/g, ' ')}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {candidate.currentJobStage ? `Round ${candidate.currentJobStage}` : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                      {new Date(candidate.createdAt).toLocaleDateString()}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <>
              <Card>
                <CardHeader><CardTitle>Job Opening Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Job Code</Label>
                      <Input
                        value={formData.jobCode || (isCreateMode ? "Select branch to generate" : "Not generated")}
                        disabled={true}
                        className="bg-muted font-mono"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Job Title *</Label>
                      <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Department</Label>
                      <div className="flex gap-2">
                        <Popover open={openDepartment} onOpenChange={setOpenDepartment}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" aria-expanded={openDepartment} className="flex-1 justify-between">
                              {formData.department ? formData.department : "Select or enter department..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search or type new department..."
                                value={departmentSearch}
                                onValueChange={(value) => {
                                  setDepartmentSearch(value);
                                  setNewDepartmentName(value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && departmentSearch.trim()) {
                                    e.preventDefault();
                                    setNewDepartmentName(departmentSearch);
                                    handleCreateDepartment();
                                  }
                                }}
                              />
                              <CommandList>
                                <CommandEmpty>
                                  <div className="p-2 space-y-2">
                                    <div className="text-sm text-muted-foreground text-center">
                                      No department found.
                                    </div>
                                    {departmentSearch.trim() && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => {
                                          setNewDepartmentName(departmentSearch);
                                          handleCreateDepartment();
                                        }}
                                      >
                                        <X className="h-4 w-4 mr-2 rotate-45" />
                                        Add "{departmentSearch}"
                                      </Button>
                                    )}
                                  </div>
                                </CommandEmpty>
                                <CommandGroup>
                                  {departments
                                    .filter((dept) =>
                                      !departmentSearch || dept.name.toLowerCase().includes(departmentSearch.toLowerCase())
                                    )
                                    .map((dept) => (
                                      <CommandItem
                                        key={dept._id}
                                        value={dept.name}
                                        onSelect={(currentValue) => {
                                          setFormData({ ...formData, department: dept.name });
                                          setOpenDepartment(false);
                                          setDepartmentSearch("");
                                        }}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", formData.department === dept.name ? "opacity-100" : "opacity-0")} />
                                        {dept.name}
                                      </CommandItem>
                                    ))}
                                  {/* Show "Add new" option if search doesn't match any existing department */}
                                  {departmentSearch.trim() && 
                                   !departments.some(d => d.name.toLowerCase() === departmentSearch.toLowerCase()) && (
                                    <CommandItem
                                      onSelect={() => {
                                        setNewDepartmentName(departmentSearch);
                                        handleCreateDepartment();
                                      }}
                                      className="text-primary font-medium"
                                    >
                                      <X className="h-4 w-4 mr-2 rotate-45" />
                                      Add "{departmentSearch}" as new department
                                    </CommandItem>
                                  )}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <Popover open={showAddDepartment} onOpenChange={setShowAddDepartment}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" type="button">
                              <X className="h-4 w-4 mr-1 rotate-45" />
                              Add
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-4">
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="newDepartment">New Department Name</Label>
                                <Input
                                  id="newDepartment"
                                  placeholder="Enter department name..."
                                  value={newDepartmentName}
                                  onChange={(e) => setNewDepartmentName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleCreateDepartment();
                                    }
                                  }}
                                  autoFocus
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setShowAddDepartment(false);
                                    setNewDepartmentName("");
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={handleCreateDepartment}
                                  disabled={!newDepartmentName.trim()}
                                >
                                  Add Department
                                </Button>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                  </div>

                  {/* Branch and Workplace Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {!isCreateMode && (
                      <div className="space-y-2">
                        <Label>Branch</Label>
                        <Input
                          value={branches.find(b => b._id === formData.branchId)?.branchName || "N/A"}
                          disabled={true}
                          className="bg-muted"
                        />
                      </div>
                    )}
                    {isCreateMode && (
                      <div className="space-y-2">
                        <Label>Branch *</Label>
                        <Select
                          value={formData.branchId || undefined}
                          onValueChange={(v) => setFormData({ ...formData, branchId: v })}
                        >
                          <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                          <SelectContent>
                            {branches.map(b => (
                              <SelectItem key={b._id} value={b._id}>
                                {b.branchName} {b.isHeadOffice && "(Head Office)"} - {b.address?.city || ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Workplace Type *</Label>
                      <Select value={formData.workplaceType} onValueChange={(val: any) => setFormData({ ...formData, workplaceType: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="On-site">On-site</SelectItem>
                          <SelectItem value="Remote">Remote</SelectItem>
                          <SelectItem value="Hybrid">Hybrid</SelectItem>
                          <SelectItem value="OffShore">OffShore</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Job Opening Status</Label>
                      <Select value={formData.status} onValueChange={(val: any) => setFormData({ ...formData, status: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">DRAFT</SelectItem>
                          <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                          <SelectItem value="INACTIVE">INACTIVE</SelectItem>
                          <SelectItem value="CLOSED">CLOSED</SelectItem>
                          <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Job Type *</Label>
                      <Select value={formData.employmentType} onValueChange={(val: any) => setFormData({ ...formData, employmentType: val })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full-time">Full-time</SelectItem>
                          <SelectItem value="Part-time">Part-time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                          <SelectItem value="Internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Educational Qualification *</Label>
                      <Select
                        value={formData.educationalQualification}
                        onValueChange={(value) => setFormData({ ...formData, educationalQualification: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select qualification" />
                        </SelectTrigger>
                        <SelectContent>
                          {QUALIFICATION_OPTIONS.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                          {formData.educationalQualification && !QUALIFICATION_OPTIONS.includes(formData.educationalQualification) && (
                            <SelectItem value={formData.educationalQualification} disabled={false}>
                              {formData.educationalQualification}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Number of Positions *</Label>
                      <Input 
                        type="number" 
                        min={1} 
                        value={formData.numberOfPositions} 
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : Number(e.target.value);
                          if (value === '' || (!isNaN(value as number) && (value as number) >= 1)) {
                            setFormData({ ...formData, numberOfPositions: value === '' ? 1 : (value as number) });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && formData.numberOfPositions === 1) {
                            e.preventDefault();
                            setFormData({ ...formData, numberOfPositions: 1 });
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Min Experience (Years)</Label>
                      <Input 
                        type="number" 
                        min={0} 
                        value={formData.minExperience ?? ""} 
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : Number(e.target.value);
                          if (value === '' || (!isNaN(value as number) && (value as number) >= 0)) {
                            setFormData({ ...formData, minExperience: value === '' ? undefined : (value as number) });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && formData.minExperience === 0) {
                            e.preventDefault();
                            setFormData({ ...formData, minExperience: undefined });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Experience (Years)</Label>
                      <Input 
                        type="number" 
                        min={0} 
                        value={formData.maxExperience ?? ""} 
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : Number(e.target.value);
                          if (value === '' || (!isNaN(value as number) && (value as number) >= 0)) {
                            setFormData({ ...formData, maxExperience: value === '' ? undefined : (value as number) });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && formData.maxExperience === 0) {
                            e.preventDefault();
                            setFormData({ ...formData, maxExperience: undefined });
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Min Salary</Label>
                      <Input 
                        type="number" 
                        min={0}
                        value={formData.salaryRange.min ?? ""} 
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : Number(e.target.value);
                          if (value === '' || (!isNaN(value as number) && (value as number) >= 0)) {
                            setFormData({ ...formData, salaryRange: { ...formData.salaryRange, min: value === '' ? undefined : (value as number) } });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && formData.salaryRange.min === 0) {
                            e.preventDefault();
                            setFormData({ ...formData, salaryRange: { ...formData.salaryRange, min: undefined } });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Salary</Label>
                      <Input 
                        type="number" 
                        min={0}
                        value={formData.salaryRange.max ?? ""} 
                        onChange={(e) => {
                          const value = e.target.value === '' ? '' : Number(e.target.value);
                          if (value === '' || (!isNaN(value as number) && (value as number) >= 0)) {
                            setFormData({ ...formData, salaryRange: { ...formData.salaryRange, max: value === '' ? undefined : (value as number) } });
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && formData.salaryRange.max === 0) {
                            e.preventDefault();
                            setFormData({ ...formData, salaryRange: { ...formData.salaryRange, max: undefined } });
                          }
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Salary Type</Label>
                      <Select value={formData.salaryRange.salaryType} onValueChange={(val: any) => setFormData({ ...formData, salaryRange: { ...formData.salaryRange, salaryType: val } })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Monthly">Monthly</SelectItem>
                          <SelectItem value="Annual">Annual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Address Information</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Address is automatically populated from the selected branch and cannot be edited
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {formData.workplaceType !== "Remote" ? (
                    <div className="space-y-4">
                      {formData.branchId ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Address</Label>
                            <Input 
                              value={formData.city} 
                              disabled 
                              readOnly 
                              className="bg-muted cursor-not-allowed" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>State</Label>
                            <Input 
                              value={formData.province} 
                              disabled 
                              readOnly 
                              className="bg-muted cursor-not-allowed" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Country</Label>
                            <Input 
                              value={formData.country} 
                              disabled 
                              readOnly 
                              className="bg-muted cursor-not-allowed" 
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Postal Code</Label>
                            <Input 
                              value={formData.postalCode} 
                              disabled 
                              readOnly 
                              className="bg-muted cursor-not-allowed" 
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground p-4 text-center border rounded-md bg-muted/50">
                          Please select a branch to view address information
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 text-center">
                      Remote Job - No Address Required
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle>Job Requirements & Description Information</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Job Description *</Label>
                    <Textarea rows={6} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>

                  {/* Required Skills */}
                  <div className="space-y-2">
                    <Label>Required Skills *</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                          {skill}
                          <button onClick={() => removeSkill(skill)} className="ml-2"><X className="w-3 h-3" /></button>
                        </Badge>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Add skill" 
                        value={skillInput} 
                        onChange={(e) => setSkillInput(e.target.value)} 
                        onKeyPress={(e) => { 
                          if (e.key === "Enter") { 
                            e.preventDefault(); 
                            addSkill(); 
                          } 
                        }} 
                      />
                      <Button type="button" onClick={addSkill} variant="outline">Add</Button>
                    </div>
                  </div>

                  {/* Key Responsibilities Field */}
                  <div className="space-y-2">
                    <Label>Key Responsibilities</Label>
                    <Textarea 
                      rows={6} 
                      value={formData.keyResponsibilities} 
                      onChange={(e) => setFormData({ ...formData, keyResponsibilities: e.target.value })} 
                      placeholder="List the key responsibilities..." 
                    />
                  </div>

                  {/* Benefits Renamed to Perks */}
                  <div className="space-y-2">
                    <Label>Perks</Label>
                    <Textarea 
                      rows={4} 
                      value={formData.benefits} 
                      onChange={(e) => setFormData({ ...formData, benefits: e.target.value })} 
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

        </div>
      </main>
    </MainLayout>
  );
};

export default JobOpeningForm;
