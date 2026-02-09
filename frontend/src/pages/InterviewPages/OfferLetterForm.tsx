import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Upload, X, Download, FileText, Eye, Calculator } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  useGetCandidatesQuery,
  useGetCandidateByIdQuery,
} from "@/store/api/candidateApi";
import {
  useGetJobOpeningsQuery,
} from "@/store/api/jobOpeningApi";
import {
  useCreateOfferMutation,
  useUpdateOfferMutation,
  useGetOfferByIdQuery,
  useUploadOfferDocumentsMutation,
  useGenerateOfferLetterPreviewQuery,
} from "@/store/api/offerApi";

import { useGetTemplatesQuery } from "@/store/api/offerTemplateApi";
import { CANDIDATE_STATUS } from "@/utils/constants";
import { toast } from "sonner";
import { generateOfferLetterPDF } from "@/utils/pdfGenerator";
import { calculateSalaryStructure, formatCurrency, type SalaryStructureInputs, type CalculatedSalaryStructure } from "@/utils/salaryStructureCalculation.util";
import { Separator } from "@/components/ui/separator";

const offerFormSchema = z.object({
  offerTemplateId: z.string().optional(),
  postingTitle: z.string().min(1, "Posting title is required"), // Job Opening ID
  department: z.string().optional(),
  candidateId: z.string().min(1, "Candidate is required"),
  joiningDate: z.date(),
  expiryDate: z.date(),
  role: z.enum(['Intern', 'Employee']).optional(),
  notes: z.string().optional(),
});

type OfferFormData = z.infer<typeof offerFormSchema>;

const OfferLetterForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const candidateIdFromQuery = searchParams.get("candidateId");
  const isEdit = location.pathname.includes("/edit") && !!id;
  const isView = location.pathname.includes("/view") && !!id;

  const [attachments, setAttachments] = useState<Array<{ name: string; url: string; type: string; isNew?: boolean }>>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [pendingOfferId, setPendingOfferId] = useState<string | null>(null);
  
  // Salary Structure State (Mandatory)
  const [salaryStructure, setSalaryStructure] = useState<SalaryStructureInputs>({
    basicSalary: 0,
    dearnessAllowance: 0,
    houseRentAllowance: 0,
    specialAllowance: 0,
    employerPFRate: 13,
    employerESIRate: 3.25,
    incentiveRate: 0,
    gratuityRate: 4.81,
    statutoryBonusRate: 8.33,
    medicalInsuranceAmount: 0,
    mobileAllowance: 0,
    mobileAllowanceType: 'monthly',
    employeePFRate: 12,
    employeeESIRate: 0.75,
  });
  const [calculatedSalary, setCalculatedSalary] = useState<CalculatedSalaryStructure | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    reset,
  } = useForm<OfferFormData>({
    resolver: zodResolver(offerFormSchema),
    defaultValues: {
      candidateId: candidateIdFromQuery || "",
      notes: "",
    }
  });

  const candidateId = watch("candidateId");
  const postingTitle = watch("postingTitle");

  // Fetch data
  const { data: candidatesData, isLoading: isLoadingCandidatesList } = useGetCandidatesQuery({
    status: CANDIDATE_STATUS.SELECTED,
    limit: 1000,
  });

  const { data: jobOpeningsData } = useGetJobOpeningsQuery({
    status: "ACTIVE",
    limit: 1000,
  });

  const { data: offerData } = useGetOfferByIdQuery(id || "", {
    skip: !isEdit && !isView,
  });

  const { data: candidateData, isLoading: isLoadingSelectedCandidate } = useGetCandidateByIdQuery(candidateId || "", {
    skip: !candidateId,
  });

  const [createOffer] = useCreateOfferMutation();
  const [updateOffer] = useUpdateOfferMutation();
  const [uploadDocuments] = useUploadOfferDocumentsMutation();

  const { data: templatesData } = useGetTemplatesQuery();
  const templates = templatesData?.data?.templates || [];
  const offerLetterTemplates = templates.filter(t => t.status === 'Active');

  // Set candidateId from query parameter if it changes or wasn't set initially
  useEffect(() => {
    if (candidateIdFromQuery && !isEdit && !isView) {
      // If form value is different from query param (e.g. on navigation), update it
      const currentId = watch("candidateId");
      if (currentId !== candidateIdFromQuery) {
        setValue("candidateId", candidateIdFromQuery, { shouldValidate: true });
      }
    }
  }, [candidateIdFromQuery, isEdit, isView, setValue, watch]);

  // Auto-fetch Job Details based on Candidate
  useEffect(() => {
    if (candidateData?.data?.candidate) {
      const candidate = candidateData.data.candidate;
      // Auto-fill Job Opening from Candidate's jobId
      if (candidate.jobId) {
        const jobId = typeof candidate.jobId === 'object' ? candidate.jobId._id : candidate.jobId;
        setValue("postingTitle", jobId);
      }
    }
  }, [candidateData, setValue]);

  // Auto-fill Department based on Job Opening
  useEffect(() => {
    if (postingTitle && jobOpeningsData?.data?.jobOpenings) {
      const jobList = jobOpeningsData.data.jobOpenings;
      const job = jobList.find(j => j._id === postingTitle);
      if (job && (job as any).department) {
        setValue("department", (job as any).department);
      }
    }
  }, [postingTitle, jobOpeningsData, setValue]);

  // Calculate salary structure whenever it changes
  useEffect(() => {
    if (salaryStructure.basicSalary > 0) {
      const calculated = calculateSalaryStructure(salaryStructure);
      setCalculatedSalary(calculated);
    } else {
      setCalculatedSalary(null);
    }
  }, [salaryStructure]);

  // Populate form when editing
  useEffect(() => {
    if (offerData?.data?.offer && isEdit) {
      const offer = offerData.data.offer;
      setValue("offerTemplateId", (offer as any).offerTemplateId || offer.offerTemplate || "");
      setValue("candidateId", typeof offer.candidateId === "object" ? offer.candidateId._id : offer.candidateId);
      setValue("postingTitle", typeof offer.jobOpeningId === "object" ? offer.jobOpeningId._id : offer.jobOpeningId || "");
      setValue("department", offer.department || "");
      setValue("joiningDate", new Date(offer.joiningDate));
      setValue("expiryDate", new Date(offer.expiryDate));
      setValue("role", (offer as any).role || undefined);
      setValue("notes", offer.notes || "");
      if (offer.attachments) {
        setAttachments(offer.attachments);
      }
      // Load salary structure if exists
      if ((offer as any).salaryStructure) {
        const ss = (offer as any).salaryStructure;
        setSalaryStructure({
          basicSalary: ss.basicSalary ?? 0,
          dearnessAllowance: ss.dearnessAllowance ?? 0,
          houseRentAllowance: ss.houseRentAllowance ?? 0,
          specialAllowance: ss.specialAllowance ?? 0,
          employerPFRate: ss.employerPFRate ?? 13,
          employerESIRate: ss.employerESIRate ?? 3.25,
          incentiveRate: ss.incentiveRate ?? 0,
          gratuityRate: ss.gratuityRate ?? 4.81,
          statutoryBonusRate: ss.statutoryBonusRate ?? 8.33,
          medicalInsuranceAmount: ss.medicalInsuranceAmount ?? 0,
          mobileAllowance: ss.mobileAllowance ?? 0,
          mobileAllowanceType: ss.mobileAllowanceType || 'monthly',
          employeePFRate: ss.employeePFRate ?? 12,
          employeeESIRate: ss.employeeESIRate ?? 0.75,
        });
      }
    }
  }, [offerData, isEdit, setValue]);

  const eligibleCandidates = candidatesData?.data?.candidates || [];
  const jobOpenings = jobOpeningsData?.data?.jobOpenings || [];

  const onSubmit = async (data: OfferFormData) => {
    // Validate salary structure (mandatory)
    if (!salaryStructure.basicSalary || salaryStructure.basicSalary <= 0) {
      toast.error("Basic Salary is required. Please enter a valid basic salary amount.");
      return;
    }

    try {
      const offerPayload: any = {
        candidateId: data.candidateId,
        jobOpeningId: data.postingTitle,
        offerTemplateId: data.offerTemplateId || undefined,
        department: data.department,
        joiningDate: data.joiningDate.toISOString(),
        expiryDate: data.expiryDate.toISOString(),
        role: data.role,
        notes: data.notes,
        // Include salary structure (mandatory)
        salaryStructure: {
          basicSalary: salaryStructure.basicSalary ?? 0,
          dearnessAllowance: salaryStructure.dearnessAllowance ?? 0,
          houseRentAllowance: salaryStructure.houseRentAllowance ?? 0,
          specialAllowance: salaryStructure.specialAllowance ?? 0,
          employerPFRate: salaryStructure.employerPFRate ?? 13,
          employerESIRate: salaryStructure.employerESIRate ?? 3.25,
          incentiveRate: salaryStructure.incentiveRate ?? 0,
          gratuityRate: salaryStructure.gratuityRate ?? 4.81,
          statutoryBonusRate: salaryStructure.statutoryBonusRate ?? 8.33,
          medicalInsuranceAmount: salaryStructure.medicalInsuranceAmount ?? 0,
          mobileAllowance: salaryStructure.mobileAllowance ?? 0,
          mobileAllowanceType: salaryStructure.mobileAllowanceType || 'monthly',
          employeePFRate: salaryStructure.employeePFRate ?? 12,
          employeeESIRate: salaryStructure.employeeESIRate ?? 0.75,
        },
        // Backend now allows optional salary/employmentType/emailMethod
      };

      let offerId = id;
      if (isEdit && id) {
        await updateOffer({ id, data: offerPayload }).unwrap();
        offerId = id;
        toast.success("Offer draft updated successfully");
      } else {
        const result = await createOffer(offerPayload as any).unwrap();
        offerId = result.data.offer._id;
        toast.success("Offer draft created successfully");
      }

      // Upload documents if any files are selected
      if (selectedFiles.length > 0 && offerId) {
        try {
          setUploadingFiles(true);
          const uploadResult = await uploadDocuments({ id: offerId, files: selectedFiles }).unwrap();
          toast.success("Documents uploaded successfully");
          
          // Update attachments with the uploaded URLs from Cloudinary
          if (uploadResult.data?.offer?.attachments) {
            // Filter out new file previews and add the actual uploaded attachments
            const existingAttachments = attachments.filter(att => !att.isNew);
            const uploadedAttachments = uploadResult.data.offer.attachments;
            // Only add newly uploaded ones (those not already in existingAttachments)
            const newUploadedAttachments = uploadedAttachments.filter(
              (uploaded: any) => !existingAttachments.some(
                (existing) => existing.url === uploaded.url || existing.name === uploaded.name
              )
            );
            setAttachments([...existingAttachments, ...newUploadedAttachments]);
          }
          
          setSelectedFiles([]);
        } catch (error: any) {
          toast.error(error?.data?.error?.message || "Failed to upload documents");
        } finally {
          setUploadingFiles(false);
        }
      }

      // Show preview modal before navigating
      setPendingOfferId(offerId);
      setShowPreviewModal(true);
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to save offer");
    }
  };

  const handleConfirmAndProceed = () => {
    if (pendingOfferId) {
      setShowPreviewModal(false);
      navigate(`/offer-letter/${pendingOfferId}/preview`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles = Array.from(files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      // Also add to attachments for preview
      newFiles.forEach((file) => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: URL.createObjectURL(file), // Preview URL
            type: file.type,
            isNew: true, // Mark as new file to upload
          },
        ]);
      });
    }
    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    const attachment = attachments[index];
    // If it's a new file (blob URL), remove from selectedFiles
    // Existing attachments have Cloudinary URLs (http/https), new ones have blob URLs
    if (attachment.url.startsWith('blob:')) {
      // Find the file by name in selectedFiles
      const fileIndex = selectedFiles.findIndex(file => file.name === attachment.name);
      if (fileIndex >= 0) {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== fileIndex));
      }
      // Revoke the blob URL to free memory
      URL.revokeObjectURL(attachment.url);
    }
    // Remove from attachments display
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Generate PDF from form data
  const handleGeneratePDF = async () => {
    const formData = watch();

    if (!formData.candidateId || !formData.postingTitle || !formData.department ||
      !formData.joiningDate || !formData.expiryDate) {
      toast.error("Please fill in all required fields before generating PDF");
      return;
    }

    // Get candidate and job details
    const candidate = eligibleCandidates.find(c => c._id === formData.candidateId);
    const jobOpening = jobOpenings.find(j => j._id === formData.postingTitle);

    if (!candidate) {
      toast.error("Candidate not found");
      return;
    }

    // Format dates
    const joiningDate = format(formData.joiningDate, "MMMM dd, yyyy");
    const expiryDate = format(formData.expiryDate, "MMMM dd, yyyy");

    // Generate PDF
    generateOfferLetterPDF({
      candidateName: `${candidate.firstName} ${candidate.lastName}`,
      candidateEmail: candidate.email,
      candidatePhone: candidate.phone,
      jobTitle: jobOpening?.title || "N/A", // Use title from job ID
      department: formData.department,
      employmentType: "Permanent", // Default or fetch if available
      compensation: "Discussed", // Placeholder since removed
      joiningDate: joiningDate,
      expiryDate: expiryDate,
      offerOwner: "HR Team",
      notes: formData.notes,
    });

    toast.success("PDF offer letter generated successfully!");
  };

  if (isView && offerData) {
    navigate(`/offer-letter/${id}/preview`);
    return null;
  }

  return (
    <MainLayout>
      <main className="p-4">
        <form onSubmit={handleSubmit(onSubmit, (errors) => console.error("Form Validation Errors:", errors))}>
          <div className="mx-auto space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  {isEdit ? "Edit Offer Letter" : "Generate Offer Letter"}
                </h1>
                <p className="text-muted-foreground mt-1">
                  Create and generate offer letter for selected candidates
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {/* Top actions removed as per new design workflow */}
              </div>
            </div>



            {/* Candidate Summary (Read-Only) */}
            {candidateId && (
              <div className="bg-muted p-4 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="font-semibold text-lg">
                    {candidateData?.data?.candidate ? `${candidateData.data.candidate.firstName} ${candidateData.data.candidate.lastName}` : "Loading Candidate..."}
                  </h3>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Position: <span className="font-medium text-foreground">{jobOpenings.find(j => j._id === postingTitle)?.title || "N/A"}</span></p>
                    <p>Department: <span className="font-medium text-foreground">{watch("department") || "N/A"}</span></p>
                    {candidateData?.data?.candidate?.email && (
                      <p>Email: {candidateData.data.candidate.email}</p>
                    )}
                  </div>
                </div>
                {candidateData?.data?.candidate?.status && (
                  <div className="px-3 py-1 bg-white border rounded text-xs font-medium">
                    Status: {candidateData.data.candidate.status}
                  </div>
                )}
              </div>
            )}

            {/* Hidden Inputs to maintain form state */}
            {/* If checking for validation errors, we can show a global error alert instead of field errors since fields are hidden */}
            {(errors.candidateId || errors.postingTitle) && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
                <p className="font-semibold">Missing Information</p>
                <ul className="list-disc list-inside text-sm mt-1">
                  {errors.candidateId && <li>Candidate is required.</li>}
                  {errors.postingTitle && <li>Posting Title (Job Opening) is missing for this candidate.</li>}
                </ul>
              </div>
            )}

            {/* Keep the selector ONLY if no candidateId (e.g. creating from scratch without URL param) */}
            {!candidateIdFromQuery && !isEdit && (
              <Card>
                <CardHeader>
                  <CardTitle>Select Candidate</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="candidate-name">
                      Candidate Name <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={candidateId || ""}
                      onValueChange={(value) => setValue("candidateId", value)}
                    >
                      <SelectTrigger id="candidate-name">
                        <SelectValue placeholder={isLoadingSelectedCandidate || isLoadingCandidatesList ? "Loading candidate..." : "Select candidate"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(isLoadingSelectedCandidate || isLoadingCandidatesList) && eligibleCandidates.length === 0 && (
                          <div className="p-2 text-sm text-muted-foreground text-center">Loading...</div>
                        )}
                        {eligibleCandidates.map((candidate) => (
                          <SelectItem key={candidate._id} value={candidate._id}>
                            {candidate.firstName} {candidate.lastName} - {candidate.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.candidateId && (
                      <p className="text-sm text-red-500">{errors.candidateId.message}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Employment Information */}
            <Card>
              <CardHeader>
                <CardTitle>Employment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="joining-date">
                      Expected Joining Date <span className="text-red-500">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !watch("joiningDate") && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {watch("joiningDate") ? (
                            format(watch("joiningDate"), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={watch("joiningDate")}
                          onSelect={(date) => date && setValue("joiningDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.joiningDate && (
                      <p className="text-sm text-red-500">{errors.joiningDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expiry-date">
                      Expiry Date <span className="text-red-500">*</span>
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !watch("expiryDate") && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {watch("expiryDate") ? (
                            format(watch("expiryDate"), "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={watch("expiryDate")}
                          onSelect={(date) => date && setValue("expiryDate", date)}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.expiryDate && (
                      <p className="text-sm text-red-500">{errors.expiryDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">
                      Role
                    </Label>
                    <Select
                      value={watch("role") || ""}
                      onValueChange={(value) => setValue("role", value as "Intern" | "Employee")}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Select role (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Intern">Intern</SelectItem>
                        <SelectItem value="Employee">Employee</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.role && (
                      <p className="text-sm text-red-500">{errors.role.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Offer Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="offer-template">Choose Offer Template</Label>
                  <Select
                    value={watch("offerTemplateId") || "__none__"}
                    onValueChange={(value) => setValue("offerTemplateId", value === "__none__" ? undefined : value)}
                  >
                    <SelectTrigger id="offer-template">
                      <SelectValue placeholder="Select template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Template (Use Default)</SelectItem>
                      {offerLetterTemplates.map(t => (
                        <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Select an offer template to use company logo and formatted content. Templates can be created in Offer Letter Templates.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Salary Structure - Mandatory */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Salary Structure <span className="text-red-500">*</span>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Enter salary components and rates. The preview table updates automatically.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Real-time Calculated Structure Table */}
                {calculatedSalary && salaryStructure.basicSalary > 0 && (
                  <div className="overflow-x-auto border rounded-lg mb-6">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-gray-300">
                          <th className="text-left p-3 font-semibold">Component</th>
                          <th className="text-right p-3 font-semibold">Per Month</th>
                          <th className="text-right p-3 font-semibold">Per Year</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* (A) Fixed Components */}
                        <tr className="bg-gray-50 dark:bg-gray-900">
                          <td colSpan={3} className="p-2 font-bold text-lg">(A) Fixed Components</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Basic</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.basicSalary)}</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.basicSalary * 12)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">DA (Dearness Allowance)</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.dearnessAllowance)}</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.dearnessAllowance * 12)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">HRA (House Rent Allowance)</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.houseRentAllowance)}</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.houseRentAllowance * 12)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Special Allowances</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.specialAllowance)}</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.specialAllowance * 12)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">ESI (Employer) {salaryStructure.employerESIRate ?? 0}%</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employerESI)}</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employerESI * 12)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">PF (Employer) {salaryStructure.employerPFRate ?? 0}%</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employerPF)}</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employerPF * 12)}</td>
                        </tr>
                        <tr className="border-b-2 border-gray-400 bg-blue-50 dark:bg-blue-950 font-bold">
                          <td className="p-3">Gross Salary</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.grossSalary)}</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.annualGrossSalary)}</td>
                        </tr>

                        {/* (B) Variables (Performance based) */}
                        <tr className="bg-gray-50 dark:bg-gray-900">
                          <td colSpan={3} className="p-2 font-bold text-lg">(B) Variables (Performance based)</td>
                        </tr>
                        <tr className="border-b-2 border-gray-400">
                          <td className="p-3">*Incentive ({salaryStructure.incentiveRate ?? 0}%)</td>
                          <td className="p-3 text-right">-</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.annualIncentive)}</td>
                        </tr>

                        {/* (C) Benefits (Yearly) */}
                        <tr className="bg-gray-50 dark:bg-gray-900">
                          <td colSpan={3} className="p-2 font-bold text-lg">(C) Benefits (Yearly)</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Medical Insurance</td>
                          <td className="p-3 text-right">-</td>
                          <td className="p-3 text-right">{formatCurrency(salaryStructure.medicalInsuranceAmount ?? 0)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Gratuity ({salaryStructure.gratuityRate ?? 0}%)</td>
                          <td className="p-3 text-right">-</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.annualGratuity)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Statutory Bonus ({salaryStructure.statutoryBonusRate ?? 0}%)</td>
                          <td className="p-3 text-right">-</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.annualStatutoryBonus)}</td>
                        </tr>
                        <tr className="border-b-2 border-gray-400 bg-blue-50 dark:bg-blue-950 font-bold">
                          <td className="p-3">Total Benefits (C)</td>
                          <td className="p-3 text-right">-</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.totalAnnualBenefits)}</td>
                        </tr>

                        {/* (D) Allowances */}
                        <tr className="bg-gray-50 dark:bg-gray-900">
                          <td colSpan={3} className="p-2 font-bold text-lg">(D) Allowances</td>
                        </tr>
                        <tr className="border-b-2 border-gray-400">
                          <td className="p-3">Mobile Allowances</td>
                          <td className="p-3 text-right">
                            {salaryStructure.mobileAllowanceType === 'monthly' 
                              ? formatCurrency(salaryStructure.mobileAllowance ?? 0)
                              : '-'}
                          </td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.annualMobileAllowance)}</td>
                        </tr>

                        {/* Employee Deductions */}
                        <tr className="bg-gray-50 dark:bg-gray-900">
                          <td colSpan={3} className="p-2 font-bold text-lg">Employee Deductions</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Employee contribution to PF ({salaryStructure.employeePFRate ?? 0}%)</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employeePF)}</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employeePF * 12)}</td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Employee contribution to ESI ({salaryStructure.employeeESIRate ?? 0}%)</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employeeESI)}</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.employeeESI * 12)}</td>
                        </tr>
                        <tr className="border-b-2 border-gray-400 bg-red-50 dark:bg-red-950 font-bold">
                          <td className="p-3">Total Deductions</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.totalMonthlyDeductions)}</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.totalMonthlyDeductions * 12)}</td>
                        </tr>

                        {/* Net Salary */}
                        <tr className="bg-gray-50 dark:bg-gray-900">
                          <td colSpan={3} className="p-2 font-bold text-lg">Net Salary</td>
                        </tr>
                        <tr className="border-b-2 border-gray-400 bg-green-50 dark:bg-green-950 font-bold">
                          <td className="p-3">Net Salary per month</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.monthly.netMonthlySalary)}</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.yearly.annualNetSalary)}</td>
                        </tr>

                        {/* Total CTC */}
                        <tr className="bg-gray-50 dark:bg-gray-900">
                          <td colSpan={3} className="p-2 font-bold text-lg">Total CTC (A+B+C+D)</td>
                        </tr>
                        <tr className="border-b-2 border-gray-400 bg-blue-100 dark:bg-blue-900 font-bold text-lg">
                          <td className="p-3">Total CTC (A+B+C+D)</td>
                          <td className="p-3 text-right">-</td>
                          <td className="p-3 text-right">{formatCurrency(calculatedSalary.totalCTC)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Fixed Salary Components */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Fixed Salary Components (Monthly)</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="basicSalary">
                        Basic Salary <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="basicSalary"
                        type="number"
                        value={salaryStructure.basicSalary !== undefined && salaryStructure.basicSalary !== null ? salaryStructure.basicSalary : ''}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setSalaryStructure(prev => ({
                            ...prev,
                            basicSalary: value,
                            // Auto-calculate DA and HRA
                            dearnessAllowance: value > 0 ? value * 0.5 : prev.dearnessAllowance,
                            houseRentAllowance: value > 0 ? value * 0.2 : prev.houseRentAllowance,
                          }));
                        }}
                        placeholder="e.g., 50000"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dearnessAllowance">Dearness Allowance (DA)</Label>
                      <Input
                        id="dearnessAllowance"
                        type="number"
                        value={salaryStructure.dearnessAllowance !== undefined && salaryStructure.dearnessAllowance !== null ? salaryStructure.dearnessAllowance : ''}
                        onChange={(e) => setSalaryStructure(prev => ({ ...prev, dearnessAllowance: parseFloat(e.target.value) || 0 }))}
                        placeholder="Auto-calculated: 50% of Basic"
                      />
                      <p className="text-xs text-muted-foreground">
                        Auto-calculated as 50% of Basic Salary (can be manually adjusted)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="houseRentAllowance">House Rent Allowance (HRA)</Label>
                      <Input
                        id="houseRentAllowance"
                        type="number"
                        value={salaryStructure.houseRentAllowance !== undefined && salaryStructure.houseRentAllowance !== null ? salaryStructure.houseRentAllowance : ''}
                        onChange={(e) => setSalaryStructure(prev => ({ ...prev, houseRentAllowance: parseFloat(e.target.value) || 0 }))}
                        placeholder="Auto-calculated: 20% of Basic"
                      />
                      <p className="text-xs text-muted-foreground">
                        Auto-calculated as 20% of Basic Salary (can be manually adjusted)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specialAllowance">Special Allowance</Label>
                      <Input
                        id="specialAllowance"
                        type="number"
                        value={salaryStructure.specialAllowance !== undefined && salaryStructure.specialAllowance !== null ? salaryStructure.specialAllowance : ''}
                        onChange={(e) => setSalaryStructure(prev => ({ ...prev, specialAllowance: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 0"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Employer Contributions */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Employer Contributions (Rates)</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employerPFRate">
                        Employer PF Rate (% of Basic)
                      </Label>
                      <Input
                        id="employerPFRate"
                        type="number"
                        step="0.01"
                        value={salaryStructure.employerPFRate !== undefined && salaryStructure.employerPFRate !== null ? salaryStructure.employerPFRate : ''}
                        onChange={(e) => setSalaryStructure(prev => ({ ...prev, employerPFRate: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 13"
                      />
                      <p className="text-xs text-muted-foreground">
                        Standard: 13% of Basic Salary
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employerESIRate">
                        Employer ESI Rate (% of Gross Fixed)
                      </Label>
                      <Input
                        id="employerESIRate"
                        type="number"
                        step="0.01"
                        value={salaryStructure.employerESIRate !== undefined && salaryStructure.employerESIRate !== null ? salaryStructure.employerESIRate : ''}
                        onChange={(e) => setSalaryStructure(prev => ({ ...prev, employerESIRate: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 3.25"
                      />
                      <p className="text-xs text-muted-foreground">
                        Standard: 3.25% of Gross Fixed Salary
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Variable Pay */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Variable Pay (Performance Based)</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="incentiveRate">
                        Incentive Rate (% of Annual Gross)
                      </Label>
                      <Input
                        id="incentiveRate"
                        type="number"
                        step="0.01"
                        value={salaryStructure.incentiveRate !== undefined && salaryStructure.incentiveRate !== null ? salaryStructure.incentiveRate : ''}
                        onChange={(e) => setSalaryStructure(prev => ({ ...prev, incentiveRate: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 5.25"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Benefits */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Benefits (Yearly)</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="gratuityRate">
                        Gratuity Rate (% of Basic)
                      </Label>
                      <Input
                        id="gratuityRate"
                        type="number"
                        step="0.01"
                        value={salaryStructure.gratuityRate !== undefined && salaryStructure.gratuityRate !== null ? salaryStructure.gratuityRate : ''}
                        onChange={(e) => setSalaryStructure(prev => ({ ...prev, gratuityRate: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 4.81"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="statutoryBonusRate">
                        Statutory Bonus Rate (% of Basic)
                      </Label>
                      <Input
                        id="statutoryBonusRate"
                        type="number"
                        step="0.01"
                        value={salaryStructure.statutoryBonusRate !== undefined && salaryStructure.statutoryBonusRate !== null ? salaryStructure.statutoryBonusRate : ''}
                        onChange={(e) => setSalaryStructure(prev => ({ ...prev, statutoryBonusRate: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 8.33"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="medicalInsuranceAmount">
                        Medical Insurance Amount (Yearly)
                      </Label>
                      <Input
                        id="medicalInsuranceAmount"
                        type="number"
                        value={salaryStructure.medicalInsuranceAmount !== undefined && salaryStructure.medicalInsuranceAmount !== null ? salaryStructure.medicalInsuranceAmount : ''}
                        onChange={(e) => setSalaryStructure(prev => ({ ...prev, medicalInsuranceAmount: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 5000"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Allowances */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Allowances (Optional)</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="mobileAllowance">Mobile Allowance</Label>
                      <Input
                        id="mobileAllowance"
                        type="number"
                        value={salaryStructure.mobileAllowance !== undefined && salaryStructure.mobileAllowance !== null ? salaryStructure.mobileAllowance : ''}
                        onChange={(e) => setSalaryStructure(prev => ({ ...prev, mobileAllowance: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 0"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobileAllowanceType">Mobile Allowance Type</Label>
                      <Select
                        value={salaryStructure.mobileAllowanceType || 'monthly'}
                        onValueChange={(value: 'monthly' | 'yearly') => setSalaryStructure(prev => ({ ...prev, mobileAllowanceType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Employee Deductions */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Employee Deductions (Rates)</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employeePFRate">
                        Employee PF Rate (% of Basic)
                      </Label>
                      <Input
                        id="employeePFRate"
                        type="number"
                        step="0.01"
                        value={salaryStructure.employeePFRate !== undefined && salaryStructure.employeePFRate !== null ? salaryStructure.employeePFRate : ''}
                        onChange={(e) => setSalaryStructure(prev => ({ ...prev, employeePFRate: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 12"
                      />
                      <p className="text-xs text-muted-foreground">
                        Standard: 12% of Basic Salary
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="employeeESIRate">
                        Employee ESI Rate (% of Gross Salary)
                      </Label>
                      <Input
                        id="employeeESIRate"
                        type="number"
                        step="0.01"
                        value={salaryStructure.employeeESIRate !== undefined && salaryStructure.employeeESIRate !== null ? salaryStructure.employeeESIRate : ''}
                        onChange={(e) => setSalaryStructure(prev => ({ ...prev, employeeESIRate: parseFloat(e.target.value) || 0 }))}
                        placeholder="e.g., 0.75"
                      />
                      <p className="text-xs text-muted-foreground">
                        Standard: 0.75% of Gross Salary
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    {...register("notes")}
                    placeholder="Add any additional notes or terms..."
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="attachments">Attach Offer-Related Documents (Optional)</Label>
                  <Input
                    id="attachments"
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-muted-foreground">
                    You can attach supporting documents like company policies, benefits, etc.
                  </p>
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-2">
                    <Label>Attached Files</Label>
                    <div className="space-y-2">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <span className="text-sm">{file.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttachment(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/offer-letter")}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || uploadingFiles}>
                {uploadingFiles ? "Uploading Documents..." : isSubmitting ? "Saving..." : isEdit ? "Update Offer" : "Save and Preview"}
              </Button>
            </div>
          </div>
        </form>

        {/* Preview Confirmation Modal */}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Preview Offer Letter
              </DialogTitle>
              <DialogDescription>
                Please review the offer letter before proceeding. You can make changes or proceed to send it.
              </DialogDescription>
            </DialogHeader>
            {pendingOfferId && (
              <OfferPreviewContent offerId={pendingOfferId} />
            )}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowPreviewModal(false);
                  if (pendingOfferId) {
                    navigate(`/offer-letter/${pendingOfferId}/edit`);
                  }
                }}
              >
                Edit Offer
              </Button>
              <Button onClick={handleConfirmAndProceed}>
                Proceed to Send
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </MainLayout>
  );
};

// Preview Component
const OfferPreviewContent = ({ offerId }: { offerId: string }) => {
  const { data: previewData, isLoading } = useGenerateOfferLetterPreviewQuery(offerId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-4 text-muted-foreground">Loading preview...</p>
      </div>
    );
  }

  const preview = previewData?.data;
  const logoUrl = preview?.business?.logo || '';

  return (
    <div className="space-y-4">
      {logoUrl && (
        <div className="flex justify-center mb-4">
          <img src={logoUrl} alt="Company Logo" className="max-h-20" />
        </div>
      )}
      <div 
        className="prose max-w-none p-6 border rounded-lg bg-white"
        dangerouslySetInnerHTML={{ __html: preview?.offerLetterContent || '<p>No content available</p>' }}
      />
    </div>
  );
};

export default OfferLetterForm;

