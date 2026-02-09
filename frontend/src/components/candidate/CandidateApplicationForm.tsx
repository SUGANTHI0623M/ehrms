import { useState, useEffect } from "react";
import { Form, Input, Select, DatePicker, Button, Upload, Steps, Card, message } from "antd";
import { PlusOutlined, DeleteOutlined, UploadOutlined, FileTextOutlined, EyeOutlined } from "@ant-design/icons";
import type { UploadFile } from "antd/es/upload/interface";
import dayjs, { Dayjs } from "dayjs";
import { CandidateFormData, useCheckCandidateDuplicateMutation } from "@/store/api/candidateFormApi";
import { useGetJobOpeningsQuery } from "@/store/api/jobOpeningApi";
import { getCountryOptions, phoneUtils } from "@/utils/countryCodeUtils";
import { uploadResume } from "@/utils/cloudinaryUpload";

const { TextArea } = Input;
const { Option } = Select;

interface CandidateApplicationFormProps {
  formData: CandidateFormData;
  setFormData: (data: CandidateFormData) => void;
  onSubmit: (data: CandidateFormData) => Promise<void>;
  isLoading?: boolean;
  isPublic?: boolean;
  position?: string;
  availableJobOpenings?: Array<{ _id: string; title: string; department?: string }>; // For public forms
  skipValidation?: boolean; // Skip duplicate validation when applying from profile
  hideJobSelection?: boolean; // Hide job selection dropdown when applying from profile
  selectedJobTitle?: string; // Display selected job title when job selection is hidden
}

// Helper function to format field names for error messages
const formatFieldName = (fieldNameArray: (string | number)[]): string => {
  if (fieldNameArray.length === 0) return 'Field';
  
  const firstPart = String(fieldNameArray[0]);
  const lastPart = String(fieldNameArray[fieldNameArray.length - 1]);
  
  // Check if it's an education field
  if (firstPart === 'education' && fieldNameArray.length === 3) {
    const index = parseInt(String(fieldNameArray[1]), 10) + 1;
    const fieldName = String(lastPart);
    const fieldNameMap: Record<string, string> = {
      'qualification': 'Highest Qualification',
      'courseName': 'Course Name',
      'institution': 'Institution Name',
      'university': 'University',
      'yearOfPassing': 'Year of Passing',
      'percentage': 'Percentage',
      'cgpa': 'CGPA'
    };
    const readableFieldName = fieldNameMap[fieldName] || fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    return `Education ${index} - ${readableFieldName}`;
  }
  // Check if it's an experience field
  else if (firstPart === 'experience' && fieldNameArray.length === 3) {
    const index = parseInt(String(fieldNameArray[1]), 10) + 1;
    const fieldName = String(lastPart);
    const fieldNameMap: Record<string, string> = {
      'company': 'Company Name',
      'role': 'Role',
      'designation': 'Designation',
      'durationFrom': 'Duration From',
      'durationTo': 'Duration To',
      'keyResponsibilities': 'Key Responsibilities',
      'reasonForLeaving': 'Reason for Leaving'
    };
    const readableFieldName = fieldNameMap[fieldName] || fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
    return `Experience ${index} - ${readableFieldName}`;
  }
  // Handle other fields
  else {
    const fieldName = String(lastPart || firstPart);
    const fieldNameMap: Record<string, string> = {
      'firstName': 'First Name',
      'lastName': 'Last Name',
      'email': 'Email',
      'phone': 'Mobile Number',
      'countryCode': 'Country Code',
      'jobOpeningId': 'Job Opening'
    };
    return fieldNameMap[fieldName] || fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }
};

const CandidateApplicationForm: React.FC<CandidateApplicationFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  isLoading = false,
  isPublic = false,
  position: defaultPosition,
  availableJobOpenings = [], // For public forms
  skipValidation = false, // Skip validation when applying from profile
  hideJobSelection = false, // Hide job selection when applying from profile
  selectedJobTitle, // Display selected job title when job selection is hidden
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const countryOptions = getCountryOptions();
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(
    formData.countryCode || "91"
  );
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  
  // Duplicate check mutation
  const [checkDuplicate, { isLoading: isCheckingDuplicate }] = useCheckCandidateDuplicateMutation();

  // Fetch active job openings for manual add - Skip if job selection is hidden (applying from profile)
  const { data: jobOpeningsData, isLoading: isLoadingJobs } = useGetJobOpeningsQuery(
    { status: "ACTIVE", limit: 100 },
    { skip: isPublic || hideJobSelection } // Skip API call for public forms or when applying from profile
  );

  // Use availableJobOpenings for public forms, otherwise use API data
  const jobOpenings = isPublic 
    ? availableJobOpenings 
    : (jobOpeningsData?.data?.jobOpenings || []);

  // Sync form with formData when it changes (especially when pre-filled from profile)
  useEffect(() => {
    if (formData && formData.jobOpeningId) {
      const formValues: any = {
        jobOpeningId: formData.jobOpeningId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        countryCode: formData.countryCode || selectedCountryCode,
        gender: formData.gender,
        currentCity: formData.currentCity,
        preferredJobLocation: formData.preferredJobLocation,
        totalYearsOfExperience: formData.totalYearsOfExperience,
        currentCompany: formData.currentCompany,
        currentJobTitle: formData.currentJobTitle,
        employmentType: formData.employmentType,
      };
      
      if (formData.dateOfBirth) {
        formValues.dateOfBirth = dayjs(formData.dateOfBirth);
      }
      
      if (formData.education && formData.education.length > 0) {
        formValues.education = formData.education.map(edu => ({
          ...edu,
          yearOfPassing: edu.yearOfPassing ? dayjs(edu.yearOfPassing) : undefined,
        }));
      }
      
      if (formData.experience && formData.experience.length > 0) {
        formValues.experience = formData.experience.map(exp => ({
          ...exp,
          durationFrom: exp.durationFrom ? dayjs(exp.durationFrom) : undefined,
          durationTo: exp.durationTo ? dayjs(exp.durationTo) : undefined,
        }));
      }
      
      if (formData.courses && formData.courses.length > 0) {
        formValues.courses = formData.courses.map(course => ({
          ...course,
          completionDate: course.completionDate ? dayjs(course.completionDate) : undefined,
        }));
      }
      
      if (formData.internships && formData.internships.length > 0) {
        formValues.internships = formData.internships.map(internship => ({
          ...internship,
          durationFrom: internship.durationFrom ? dayjs(internship.durationFrom) : undefined,
          durationTo: internship.durationTo ? dayjs(internship.durationTo) : undefined,
        }));
      }
      
      if (formData.resume) {
        formValues.resume = formData.resume;
      }
      
      form.setFieldsValue(formValues);
      
      if (formData.countryCode) {
        setSelectedCountryCode(formData.countryCode);
      }
    }
  }, [formData.jobOpeningId]);

  const steps = [
    { title: "Personal Details", key: "personal" },
    { title: "Education", key: "education" },
    { title: "Experience", key: "experience" },
    { title: "Review & Submit", key: "review" },
  ];

  const handleNext = async () => {
    try {
      console.log('[handleNext] Starting validation', {
        currentStep,
        resumeFile: resumeFile ? { name: resumeFile instanceof File ? resumeFile.name : 'unknown', type: typeof resumeFile } : null,
        formDataResume: formData.resume ? { name: formData.resume.name, url: formData.resume.url?.substring(0, 50) + '...' } : null,
        isUploadingResume
      });

      // Define field order for step 0 (Personal Details) - this determines error display order
      const step0FieldOrder = [
        'jobOpeningId',
        'firstName',
        'lastName',
        'email',
        'countryCode',
        'phone',
        'resume'
      ];

      // Collect all validation errors first
      const allErrors: Array<{ field: string | (string | number)[]; message: string; fieldName: string }> = [];

      // Step 0: Personal Details - Check resume first but don't return early
      if (currentStep === 0) {
        const hasResumeFile = resumeFile !== null;
        const hasResumeInFormData = formData.resume && formData.resume.name;
        
        // Check resume and add to errors if missing (but continue checking other fields)
        if (!hasResumeFile && !hasResumeInFormData) {
          allErrors.push({
            field: 'resume',
            message: 'Resume is required',
            fieldName: 'Resume Upload'
          });
        } else {
          // Sync resume to formData if needed
          if (hasResumeFile) {
            if (!hasResumeInFormData || (formData.resume.name !== (resumeFile instanceof File ? resumeFile.name : "resume.pdf"))) {
              const tempUrl = resumeFile instanceof File ? URL.createObjectURL(resumeFile) : '';
              const resumeName = resumeFile instanceof File ? resumeFile.name : "resume.pdf";
              setFormData({
                ...formData,
                resume: {
                  url: tempUrl,
                  name: resumeName,
                },
              });
            }
            if (!hasResumeInFormData) {
              const tempUrl = resumeFile instanceof File ? URL.createObjectURL(resumeFile) : '';
              const resumeName = resumeFile instanceof File ? resumeFile.name : "resume.pdf";
              form.setFieldsValue({ resume: { url: tempUrl, name: resumeName } });
            } else {
              form.setFieldsValue({ resume: formData.resume });
            }
          } else if (hasResumeInFormData) {
            form.setFieldsValue({ resume: formData.resume });
          }
        }

        // Check for duplicate email/phone (only for manual forms, not public, and not when skipValidation is true)
        if (!isPublic && !skipValidation && formData.email && formData.phone) {
          try {
            const emailToCheck = formData.email.trim();
            const phoneToCheck = formData.phone.trim();
            
            console.log('[handleNext] Checking for duplicate candidate:', {
              email: emailToCheck,
              phone: phoneToCheck
            });
            
            const result = await checkDuplicate({
              email: emailToCheck,
              phone: phoneToCheck
            }).unwrap();
            
            console.log('[handleNext] Duplicate check result:', JSON.stringify(result, null, 2));
            
            if (result.success && result.data?.exists === true) {
              const duplicateFields = result.data.duplicateFields || [];
              let errorMessage = 'A candidate with this ';
              if (duplicateFields.includes('email') && duplicateFields.includes('phone')) {
                errorMessage += 'email and phone number already exists';
              } else if (duplicateFields.includes('email')) {
                errorMessage += 'email already exists';
              } else if (duplicateFields.includes('phone')) {
                errorMessage += 'phone number already exists';
              } else {
                errorMessage += 'information already exists';
              }
              errorMessage += '. Please use a different email or phone number.';
              
              message.error(errorMessage);
              try {
                if (duplicateFields.includes('email')) {
                  form.scrollToField('email');
                } else if (duplicateFields.includes('phone')) {
                  form.scrollToField('phone');
                }
              } catch (e) {
                // Ignore scroll errors
              }
              return; // Return early for duplicate check as it's a blocking error
            } else if (result.success && result.data?.exists === false) {
              console.log('[handleNext] No duplicate found, proceeding to next step');
            } else {
              console.warn('[handleNext] Unexpected duplicate check response format:', result);
            }
          } catch (error: any) {
            console.error('[handleNext] Error checking duplicate candidate:', error);
            const errorMsg = error?.data?.error?.message || error?.message || 'Failed to verify candidate information. Please try again.';
            message.error(errorMsg);
            return; // Block progression if check fails
          }
        }
      }
      
      // Step 1: Education - Validate education entries
      if (currentStep === 1) {
        if (!formData.education || formData.education.length === 0) {
          message.error("Please add at least one education entry");
          return;
        }
        // Validate each education entry and collect all errors
        for (let i = 0; i < formData.education.length; i++) {
          const edu = formData.education[i];
          if (!edu.qualification) {
            allErrors.push({
              field: ['education', i, 'qualification'],
              message: `Education ${i + 1} - Highest Qualification is required`,
              fieldName: `Education ${i + 1} - Highest Qualification`
            });
          }
          if (!edu.courseName) {
            allErrors.push({
              field: ['education', i, 'courseName'],
              message: `Education ${i + 1} - Course Name is required`,
              fieldName: `Education ${i + 1} - Course Name`
            });
          }
          if (!edu.institution) {
            allErrors.push({
              field: ['education', i, 'institution'],
              message: `Education ${i + 1} - Institution Name is required`,
              fieldName: `Education ${i + 1} - Institution Name`
            });
          }
          if (!edu.yearOfPassing) {
            allErrors.push({
              field: ['education', i, 'yearOfPassing'],
              message: `Education ${i + 1} - Year of Passing is required`,
              fieldName: `Education ${i + 1} - Year of Passing`
            });
          }
        }
      }
      
      // Validate form fields using Ant Design validation
      try {
        console.log('[handleNext] Validating form fields...');
        const values = await form.validateFields();
        console.log('[handleNext] Form validation passed', { fieldCount: Object.keys(values).length });
      } catch (formError: any) {
        // Collect form validation errors
        if (formError.errorFields && Array.isArray(formError.errorFields)) {
          formError.errorFields.forEach((field: any) => {
            const fieldNameArray = field.name || [];
            const userFriendlyName = formatFieldName(fieldNameArray);
            const fieldError = field.errors && field.errors.length > 0 ? field.errors[0] : null;
            let errorMessage = fieldError;
            
            if (errorMessage && typeof errorMessage === 'string') {
              if (errorMessage.includes('education.') || errorMessage.includes('experience.')) {
                errorMessage = `${userFriendlyName} is required`;
              }
            } else {
              errorMessage = `${userFriendlyName} is required`;
            }
            
            allErrors.push({
              field: fieldNameArray,
              message: errorMessage,
              fieldName: userFriendlyName
            });
          });
        }
      }

      // If we have errors, display them in order
      if (allErrors.length > 0) {
        // For step 0, sort errors by field order
        if (currentStep === 0) {
          allErrors.sort((a, b) => {
            const aField = Array.isArray(a.field) ? a.field[0] : a.field;
            const bField = Array.isArray(b.field) ? b.field[0] : b.field;
            const aIndex = step0FieldOrder.indexOf(String(aField));
            const bIndex = step0FieldOrder.indexOf(String(bField));
            // If field not in order list, put it at the end
            if (aIndex === -1 && bIndex === -1) return 0;
            if (aIndex === -1) return 1;
            if (bIndex === -1) return -1;
            return aIndex - bIndex;
          });
        }

        // Create comprehensive error message
        if (allErrors.length === 1) {
          message.error(allErrors[0].message);
        } else {
          // Show all missing fields in order - create a readable list
          const errorFieldsList = allErrors.map(err => err.fieldName).join(', ');
          message.error(`Please fill the following required fields: ${errorFieldsList}`, 6);
          
          // Also log detailed errors for debugging
          console.log('[handleNext] Multiple validation errors found:', allErrors);
        }

        // Scroll to first error field
        try {
          const firstError = allErrors[0];
          if (firstError?.field) {
            form.scrollToField(firstError.field);
          }
        } catch (e) {
          // Ignore scroll errors
        }
        return; // Don't proceed to next step
      }

      // If resume was valid, ensure it's synced
      if (currentStep === 0) {
        const hasResumeFile = resumeFile !== null;
        const hasResumeInFormData = formData.resume && formData.resume.name;
        if (hasResumeFile && !hasResumeInFormData) {
          const tempUrl = resumeFile instanceof File ? URL.createObjectURL(resumeFile) : '';
          const resumeName = resumeFile instanceof File ? resumeFile.name : "resume.pdf";
          setFormData({
            ...formData,
            resume: {
              url: tempUrl,
              name: resumeName,
            },
          });
        }
      }
      
      // All validations passed - proceed to next step
      const values = form.getFieldsValue();
      const mergedData = { 
        ...formData, 
        ...values,
        experience: formData.experience || values.experience || [],
        education: formData.education || values.education || []
      };
      setFormData(mergedData);
      setCurrentStep(currentStep + 1);
    } catch (error: any) {
      console.error("Unexpected validation error:", error);
      if (error?.message) {
        message.error(error.message);
      } else {
        message.error("Please fill all required fields");
      }
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      // Ensure jobOpeningId is set when applying from profile
      if (hideJobSelection && !formData.jobOpeningId) {
        message.error('Job opening is required');
        return;
      }
      
      const values = await form.validateFields();
      
      // Ensure jobOpeningId is in the values
      if (hideJobSelection && formData.jobOpeningId) {
        values.jobOpeningId = formData.jobOpeningId;
      }
      
      // Check for duplicate email/phone before final submission (only for manual forms, skip if skipValidation is true)
      if (!isPublic && !skipValidation && formData.email && formData.phone) {
        try {
          const emailToCheck = formData.email.trim();
          const phoneToCheck = formData.phone.trim();
          
          console.log('[handleSubmit] Final duplicate check before submission:', {
            email: emailToCheck,
            phone: phoneToCheck
          });
          
          const result = await checkDuplicate({
            email: emailToCheck,
            phone: phoneToCheck
          }).unwrap();
          
          console.log('[handleSubmit] Final duplicate check result:', JSON.stringify(result, null, 2));
          
          if (result.success && result.data?.exists === true) {
            const duplicateFields = result.data.duplicateFields || [];
            let errorMessage = 'A candidate with this ';
            if (duplicateFields.includes('email') && duplicateFields.includes('phone')) {
              errorMessage += 'email and phone number already exists';
            } else if (duplicateFields.includes('email')) {
              errorMessage += 'email already exists';
            } else if (duplicateFields.includes('phone')) {
              errorMessage += 'phone number already exists';
            } else {
              errorMessage += 'information already exists';
            }
            errorMessage += '. Please use a different email or phone number.';
            
            message.error(errorMessage);
            try {
              if (duplicateFields.includes('email')) {
                form.scrollToField('email');
              } else if (duplicateFields.includes('phone')) {
                form.scrollToField('phone');
              }
            } catch (e) {
              // Ignore scroll errors
            }
            return; // Block submission if duplicate found
          } else if (result.success && result.data?.exists === false) {
            console.log('[handleSubmit] No duplicate found, proceeding with submission');
          } else {
            console.warn('[handleSubmit] Unexpected duplicate check response format:', result);
            // Don't block submission if response format is unexpected, but log it
          }
        } catch (error: any) {
          console.error('[handleSubmit] Error checking duplicate candidate:', error);
          const errorMsg = error?.data?.error?.message || error?.message || 'Failed to verify candidate information. Please try again.';
          message.error(errorMsg);
          return; // Block submission if check fails
        }
      }
      
      // Validate resume - check both formData.resume and resumeFile
      const hasResume = formData.resume && formData.resume.name;
      const hasResumeFile = resumeFile !== null;
      
      if (!hasResume && !hasResumeFile) {
        message.error("Resume is required. Please upload your resume.");
        try {
          form.scrollToField('resume');
        } catch (e) {
          // Ignore scroll errors
        }
        return;
      }
      
      // Prepare resume data - use formData.resume if available, otherwise create from resumeFile
      let resumeData = formData.resume;
      if (hasResumeFile && !hasResume) {
        const tempUrl = resumeFile instanceof File ? URL.createObjectURL(resumeFile) : '';
        const resumeName = resumeFile instanceof File ? resumeFile.name : "resume.pdf";
        resumeData = {
          url: tempUrl,
          name: resumeName,
        };
        // Update formData state
        setFormData({
          ...formData,
          resume: resumeData,
        });
      }
      
      // If resume has blob URL (not uploaded to Cloudinary yet), upload it now before submitting
      if (resumeFile && resumeData?.url && resumeData.url.startsWith('blob:')) {
        try {
          setIsUploadingResume(true);
          message.loading({ content: 'Uploading resume to Cloudinary...', key: 'final-upload', duration: 0 });
          // When admin is adding manually (isPublic=false), use admin upload endpoint
          const result = await uploadResume(resumeFile, isPublic, !isPublic);
          
          if (result.success && result.url) {
            // Update resume data with Cloudinary URL
            resumeData = {
              url: result.url,
              name: result.name || (resumeFile instanceof File ? resumeFile.name : "resume.pdf"),
            };
            message.success({ content: 'Resume uploaded successfully', key: 'final-upload' });
          } else {
            message.error({ 
              content: result.error || 'Failed to upload resume. Please try again.', 
              key: 'final-upload' 
            });
            setIsUploadingResume(false);
            return; // Don't submit if resume upload failed
          }
        } catch (error: any) {
          message.error({ 
            content: error?.message || 'Failed to upload resume. Please try again.', 
            key: 'final-upload' 
          });
          setIsUploadingResume(false);
          return; // Don't submit if resume upload failed
        } finally {
          setIsUploadingResume(false);
        }
      }
      
      // Validate education
      if (!formData.education || formData.education.length === 0) {
        message.error("Please add at least one education entry");
        return;
      }
      
      // Validate each education entry
      for (let i = 0; i < formData.education.length; i++) {
        const edu = formData.education[i];
        if (!edu.qualification || !edu.courseName || !edu.institution || !edu.yearOfPassing) {
          message.error(`Please fill all required fields in Education ${i + 1}`);
          return;
        }
      }
      
      const finalData = { ...formData, ...values, countryCode: selectedCountryCode, resume: resumeData };
      
      // Ensure resume has valid URL (not blob) and name before submitting
      if (finalData.resume && (!finalData.resume.url || finalData.resume.url.startsWith('blob:') || !finalData.resume.name)) {
        message.error("Resume must be uploaded to Cloudinary before submission. Please wait for upload to complete or try again.");
        return;
      }
      
      await onSubmit(finalData);
    } catch (error: any) {
      // Format validation errors to be user-friendly
      if (error.errorFields && Array.isArray(error.errorFields)) {
        const errorMessages: string[] = [];
        
        error.errorFields.forEach((field: any) => {
          const fieldNameArray = field.name || [];
          const userFriendlyName = formatFieldName(fieldNameArray);
          
          // Get the error message from field.errors or use default
          const fieldError = field.errors && field.errors.length > 0 ? field.errors[0] : null;
          // Check if the error message is already user-friendly (from our custom rules)
          let errorMessage = fieldError;
          
          // If error message contains the field path (like 'education.0.qualification'), replace it
          if (errorMessage && typeof errorMessage === 'string') {
            if (errorMessage.includes('education.') || errorMessage.includes('experience.')) {
              errorMessage = `${userFriendlyName} is required`;
            }
          } else {
            errorMessage = `${userFriendlyName} is required`;
          }
          
          errorMessages.push(errorMessage);
        });
        
        // Show first error message
        if (errorMessages.length > 0) {
          message.error(errorMessages[0]);
          // Scroll to first error field
          try {
            const firstErrorField = error.errorFields[0];
            if (firstErrorField?.name) {
              form.scrollToField(firstErrorField.name);
            }
          } catch (e) {
            // Ignore scroll errors
          }
        }
      } else {
        console.error("Submission failed:", error);
        if (error?.message) {
          message.error(error.message);
        } else {
          message.error("Please fill all required fields");
        }
      }
    }
  };

  const handleEducationAdd = () => {
    // Limit education entries to maximum 5
    const currentEducationCount = formData.education?.length || 0;
    if (currentEducationCount >= 5) {
      message.warning("Maximum 5 education entries allowed");
      return;
    }

    const newEducation = {
      qualification: "",
      courseName: "",
      institution: "",
      university: "",
      yearOfPassing: "",
      percentage: "",
      cgpa: "",
    };
    setFormData({
      ...formData,
      education: [...(formData.education || []), newEducation],
    });
  };

  const handleEducationRemove = (index: number) => {
    const newEducation = formData.education?.filter((_, i) => i !== index) || [];
    if (newEducation.length === 0) {
      message.warning("At least one education entry is required");
      return;
    }
    setFormData({ ...formData, education: newEducation });
  };

  const handleExperienceAdd = () => {
    const newExperience = {
      company: "",
      role: "",
      designation: "",
      durationFrom: "",
      durationTo: "",
      keyResponsibilities: "",
      reasonForLeaving: "",
    };
    setFormData({
      ...formData,
      experience: [...(formData.experience || []), newExperience],
    });
  };

  const handleExperienceRemove = (index: number) => {
    const newExperience = formData.experience?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, experience: newExperience });
  };

  // Handlers for Courses (for freshers)
  const handleCourseAdd = () => {
    const newCourse = {
      courseName: "",
      institution: "",
      completionDate: "",
      duration: "",
      description: "",
      certificateUrl: "",
    };
    setFormData({
      ...formData,
      courses: [...(formData.courses || []), newCourse],
    });
  };

  const handleCourseRemove = (index: number) => {
    const newCourses = formData.courses?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, courses: newCourses });
  };

  // Handlers for Internships (for freshers)
  const handleInternshipAdd = () => {
    const newInternship = {
      company: "",
      role: "",
      durationFrom: "",
      durationTo: "",
      keyResponsibilities: "",
      skillsLearned: "",
      mentorName: "",
    };
    setFormData({
      ...formData,
      internships: [...(formData.internships || []), newInternship],
    });
  };

  const handleInternshipRemove = (index: number) => {
    const newInternships = formData.internships?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, internships: newInternships });
  };

  const handleResumeUpload = async (file: UploadFile) => {
    const fileObj = file as any;
    console.log('[handleResumeUpload] File selected', {
      fileName: fileObj?.name,
      fileSize: fileObj?.size,
      fileType: fileObj?.type,
      isFile: fileObj instanceof File,
      currentResumeFile: resumeFile ? (resumeFile instanceof File ? resumeFile.name : 'unknown') : null,
      currentFormDataResume: formData.resume?.name || 'none'
    });

    if (!fileObj) {
      console.error('[handleResumeUpload] No file object provided');
      message.error("Please select a valid file");
      return false;
    }

    // Set resume immediately with temporary blob URL so validation passes
    // Don't upload to Cloudinary yet - will upload only on final submission
    const tempUrl = URL.createObjectURL(fileObj);
    const resumeData = {
      url: tempUrl,
      name: fileObj.name || "resume.pdf",
    };
    
    console.log('[handleResumeUpload] Setting resume data', {
      resumeName: resumeData.name,
      resumeUrl: tempUrl.substring(0, 50) + '...',
      currentFormDataResume: formData.resume ? formData.resume.name : 'none'
    });
    
    // Update formData immediately - use current formData to ensure we have latest state
    setFormData({
      ...formData,
      resume: resumeData,
    });
    
    // Store the file for later upload on submission
    setResumeFile(fileObj);
    
    // Set form field value so Ant Design validation passes
    form.setFieldsValue({ resume: resumeData });
    
    console.log('[handleResumeUpload] Resume file stored successfully', {
      resumeFileSet: true,
      resumeFileName: fileObj.name,
      resumeFileType: fileObj instanceof File ? 'File' : typeof fileObj,
      formFieldSet: true
    });
    
    message.success('Resume file selected. It will be uploaded when you submit the form.');

    return false; // Prevent auto upload
  };

  const isFresher = !formData.totalYearsOfExperience || formData.totalYearsOfExperience === 0;

  return (
    <div className="space-y-6">
      <Steps current={currentStep} items={steps} className="mb-6" />

      <Form 
        form={form} 
        layout="vertical" 
        initialValues={formData}
      >
        {/* Step 1: Personal Details */}
        {currentStep === 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Job Opening Selection - Hide when applying from profile */}
              {!hideJobSelection ? (
                <Form.Item
                  name="jobOpeningId"
                  label="Job Opening"
                  rules={[{ required: true, message: "Please select a job opening" }]}
                  className="md:col-span-2"
                >
                  <Select
                    placeholder="Select a job opening"
                    loading={isPublic ? false : isLoadingJobs}
                    value={formData.jobOpeningId}
                    onChange={(value) =>
                      setFormData({ ...formData, jobOpeningId: value })
                    }
                    showSearch
                    filterOption={(input, option) => {
                      const label = typeof option?.label === 'string' ? option.label : String(option?.label || '');
                      return label.toLowerCase().includes(input.toLowerCase());
                    }}
                  >
                    {jobOpenings.length === 0 ? (
                      <Option value="" disabled>
                        No active job openings available
                      </Option>
                    ) : (
                      jobOpenings.map((job) => (
                        <Option key={job._id} value={job._id}>
                          {job.title} {job.department ? `- ${job.department}` : ""}
                        </Option>
                      ))
                    )}
                  </Select>
                  {jobOpenings.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      No active job openings are currently available. Please contact the administrator.
                    </p>
                  )}
                </Form.Item>
              ) : (
                // Display selected job when applying from profile
                <Form.Item
                  label="Job Opening"
                  className="md:col-span-2"
                >
                  <Input
                    value={selectedJobTitle || formData.jobOpeningId || 'Not selected'}
                    disabled
                    className="bg-muted"
                  />
                  <input
                    type="hidden"
                    name="jobOpeningId"
                    value={formData.jobOpeningId || ''}
                  />
                </Form.Item>
              )}
              <Form.Item
                name="firstName"
                label="First Name"
                rules={[{ required: true, message: "First name is required" }]}
              >
                <Input
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                />
              </Form.Item>
              <Form.Item
                name="lastName"
                label="Last Name"
                rules={[{ required: true, message: "Last name is required" }]}
              >
                <Input
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                />
              </Form.Item>
              <Form.Item
                name="email"
                label="Email Address"
                rules={[
                  { required: true, message: "Email is required" },
                  { type: "email", message: "Invalid email format" },
                ]}
              >
                <Input
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
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
                    setFormData({ ...formData, countryCode: value });
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
                rules={[
                  { required: true, message: "Mobile number is required" },
                  {
                    validator: (_, value) => {
                      // if (!value) {
                      //   return Promise.reject(new Error("Mobile number is required"));
                      // }
                      const cleanNumber = value.replace(/\D/g, "");
                      const limits = phoneUtils.getLimits(selectedCountryCode);
                      if (limits) {
                        if (cleanNumber.length < limits.min || cleanNumber.length > limits.max) {
                          return Promise.reject(
                            new Error(`Mobile number must be ${limits.min}-${limits.max} digits for this country`)
                          );
                        }
                      }
                      return Promise.resolve();
                    },
                  },
                ]}
                className="md:col-span-1"
              >
                <Input
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setFormData({ ...formData, phone: value });
                  }}
                  placeholder="Enter mobile number"
                />
              </Form.Item>
              <Form.Item name="dateOfBirth" label="Date of Birth">
                  <DatePicker
                  style={{ width: "100%" }}
                  value={formData.dateOfBirth ? dayjs(formData.dateOfBirth) : undefined}
                  onChange={(date: Dayjs | null) =>
                    setFormData({
                      ...formData,
                      dateOfBirth: date ? date.format("YYYY-MM-DD") : undefined,
                    })
                  }
                />
              </Form.Item>
              <Form.Item name="gender" label="Gender">
                <Select
                  value={formData.gender}
                  onChange={(value) =>
                    setFormData({ ...formData, gender: value })
                  }
                >
                  <Option value="Male">Male</Option>
                  <Option value="Female">Female</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
              <Form.Item name="currentCity" label="Current City / Location">
                <Input
                  value={formData.currentCity}
                  onChange={(e) =>
                    setFormData({ ...formData, currentCity: e.target.value })
                  }
                />
              </Form.Item>
              <Form.Item name="preferredJobLocation" label="Preferred Job Location">
                <Input
                  value={formData.preferredJobLocation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preferredJobLocation: e.target.value,
                    })
                  }
                />
              </Form.Item>
            </div>
            <Form.Item 
              name="resume" 
              label={
                <span>
                  Resume Upload <span className="text-red-500">*</span>
                </span>
              }
              rules={[
                {
                  validator: (_, value) => {
                    // Custom validator that checks both formData.resume and resumeFile
                    const hasResume = formData.resume && formData.resume.name;
                    const hasResumeFile = resumeFile !== null;
                    if (hasResume || hasResumeFile) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Resume is required'));
                  }
                }
              ]}
            >
              <Upload
                beforeUpload={handleResumeUpload}
                maxCount={1}
                accept=".pdf,.doc,.docx"
                fileList={formData.resume ? [{
                  uid: '-1',
                  name: formData.resume.name,
                  status: 'done',
                  url: formData.resume.url,
                }] : []}
                onRemove={() => {
                  setFormData({ ...formData, resume: undefined });
                  return true;
                }}
              >
                <Button icon={<UploadOutlined />}>Upload Resume</Button>
              </Upload>
              <p className="text-xs text-muted-foreground mt-1">
                Accepted formats: PDF, DOC, DOCX (Required)
              </p>
            </Form.Item>
          </div>
        )}

        {/* Step 2: Educational Details */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Educational Details</h3>
              <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={handleEducationAdd}
                disabled={(formData.education?.length || 0) >= 5}
              >
                Add Education {(formData.education?.length || 0) >= 5 && "(Max 5)"}
              </Button>
            </div>
            {formData.education?.map((edu, index) => (
              <Card key={index} className="mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium">Education {index + 1}</h4>
                  {formData.education && formData.education.length > 1 && (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => handleEducationRemove(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item
                    name={["education", index, "qualification"]}
                    label="Highest Qualification"
                    rules={[
                      { 
                        required: true, 
                        message: `Education ${index + 1} - Highest Qualification is required`
                      }
                    ]}
                    validateTrigger="onBlur"
                  >
                    <Select
                      value={edu.qualification}
                      onChange={(value) => {
                        const newEducation = [...(formData.education || [])];
                        newEducation[index].qualification = value;
                        setFormData({ ...formData, education: newEducation });
                      }}
                    >
                      <Option value="High School">High School</Option>
                      <Option value="Diploma">Diploma</Option>
                      <Option value="Bachelor's">Bachelor's</Option>
                      <Option value="Master's">Master's</Option>
                      <Option value="PhD">PhD</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item
                    name={["education", index, "courseName"]}
                    label="Course / Degree Name"
                    rules={[{ required: true, message: `Education ${index + 1} - Course Name is required` }]}
                  >
                    <Input
                      value={edu.courseName}
                      onChange={(e) => {
                        const newEducation = [...(formData.education || [])];
                        newEducation[index].courseName = e.target.value;
                        setFormData({ ...formData, education: newEducation });
                      }}
                    />
                  </Form.Item>
                  <Form.Item
                    name={["education", index, "institution"]}
                    label="Institution / College Name"
                    rules={[{ required: true, message: `Education ${index + 1} - Institution Name is required` }]}
                  >
                    <Input
                      value={edu.institution}
                      onChange={(e) => {
                        const newEducation = [...(formData.education || [])];
                        newEducation[index].institution = e.target.value;
                        setFormData({ ...formData, education: newEducation });
                      }}
                    />
                  </Form.Item>
                  <Form.Item
                    name={["education", index, "university"]}
                    label="University"
                  >
                    <Input
                      value={edu.university}
                      onChange={(e) => {
                        const newEducation = [...(formData.education || [])];
                        newEducation[index].university = e.target.value;
                        setFormData({ ...formData, education: newEducation });
                      }}
                    />
                  </Form.Item>
                  <Form.Item
                    name={["education", index, "yearOfPassing"]}
                    label="Year of Passing"
                    rules={[{ required: true, message: `Education ${index + 1} - Year of Passing is required` }]}
                  >
                    <Input
                      value={edu.yearOfPassing}
                      onChange={(e) => {
                        const newEducation = [...(formData.education || [])];
                        newEducation[index].yearOfPassing = e.target.value;
                        setFormData({ ...formData, education: newEducation });
                      }}
                    />
                  </Form.Item>
                  <Form.Item
                    name={["education", index, "percentage"]}
                    label="Percentage / CGPA"
                  >
                    <Input
                      value={edu.percentage || edu.cgpa}
                      onChange={(e) => {
                        const newEducation = [...(formData.education || [])];
                        newEducation[index].percentage = e.target.value;
                        setFormData({ ...formData, education: newEducation });
                      }}
                      placeholder="e.g., 85% or 8.5 CGPA"
                    />
                  </Form.Item>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Step 3: Work Experience */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Work Experience</h3>
            <Form.Item name="totalYearsOfExperience" label="Total Years of Experience">
              <Input
                type="number"
                min={0}
                value={formData.totalYearsOfExperience}
                onChange={(e) => {
                  const value = e.target.value === '' ? '' : parseInt(e.target.value);
                  if (value === '' || (!isNaN(value as number) && (value as number) >= 0)) {
                    setFormData({
                      ...formData,
                      totalYearsOfExperience: value === '' ? undefined : (value as number),
                    });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && formData.totalYearsOfExperience === 0) {
                    setFormData({
                      ...formData,
                      totalYearsOfExperience: undefined,
                    });
                  }
                }}
                placeholder="0 for freshers"
              />
            </Form.Item>

            {!isFresher && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Form.Item name="currentCompany" label="Current Company Name">
                    <Input
                      value={formData.currentCompany}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentCompany: e.target.value,
                        })
                      }
                    />
                  </Form.Item>
                  <Form.Item name="currentJobTitle" label="Current Job Title">
                    <Input
                      value={formData.currentJobTitle}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentJobTitle: e.target.value,
                        })
                      }
                    />
                  </Form.Item>
                  <Form.Item name="employmentType" label="Employment Type">
                    <Select
                      value={formData.employmentType}
                      onChange={(value) =>
                        setFormData({ ...formData, employmentType: value })
                      }
                    >
                      <Option value="Full-time">Full-time</Option>
                      <Option value="Contract">Contract</Option>
                      <Option value="Internship">Internship</Option>
                    </Select>
                  </Form.Item>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <h4 className="font-medium">Previous Companies</h4>
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    onClick={handleExperienceAdd}
                  >
                    Add Experience
                  </Button>
                </div>

                {formData.experience?.map((exp, index) => (
                  <Card key={index} className="mb-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Experience {index + 1}</h4>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => handleExperienceRemove(index)}
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Form.Item
                        name={["experience", index, "company"]}
                        label="Company Name"
                        rules={[{ required: true }]}
                      >
                        <Input
                          value={exp.company}
                          onChange={(e) => {
                            const newExperience = [...(formData.experience || [])];
                            newExperience[index].company = e.target.value;
                            setFormData({ ...formData, experience: newExperience });
                          }}
                        />
                      </Form.Item>
                      <Form.Item
                        name={["experience", index, "role"]}
                        label="Role"
                        rules={[{ required: true }]}
                      >
                        <Input
                          value={exp.role}
                          onChange={(e) => {
                            const newExperience = [...(formData.experience || [])];
                            newExperience[index].role = e.target.value;
                            setFormData({ ...formData, experience: newExperience });
                          }}
                        />
                      </Form.Item>
                      <Form.Item
                        name={["experience", index, "designation"]}
                        label="Designation"
                        rules={[{ required: true }]}
                      >
                        <Input
                          value={exp.designation}
                          onChange={(e) => {
                            const newExperience = [...(formData.experience || [])];
                            newExperience[index].designation = e.target.value;
                            setFormData({ ...formData, experience: newExperience });
                          }}
                        />
                      </Form.Item>
                      <Form.Item
                        name={["experience", index, "durationFrom"]}
                        label="Duration From"
                        rules={[{ required: true }]}
                      >
                        <DatePicker
                          style={{ width: "100%" }}
                          value={exp.durationFrom ? dayjs(exp.durationFrom) : undefined}
                          onChange={(date: Dayjs | null) => {
                            const newExperience = [...(formData.experience || [])];
                            newExperience[index].durationFrom = date
                              ? date.format("YYYY-MM-DD")
                              : "";
                            setFormData({ ...formData, experience: newExperience });
                          }}
                        />
                      </Form.Item>
                      <Form.Item
                        name={["experience", index, "durationTo"]}
                        label="Duration To"
                      >
                        <DatePicker
                          style={{ width: "100%" }}
                          value={exp.durationTo ? dayjs(exp.durationTo) : undefined}
                          onChange={(date: Dayjs | null) => {
                            const newExperience = [...(formData.experience || [])];
                            newExperience[index].durationTo = date
                              ? date.format("YYYY-MM-DD")
                              : "";
                            setFormData({ ...formData, experience: newExperience });
                          }}
                        />
                      </Form.Item>
                      <Form.Item
                        name={["experience", index, "keyResponsibilities"]}
                        label="Key Responsibilities"
                      >
                        <TextArea
                          rows={3}
                          value={exp.keyResponsibilities}
                          onChange={(e) => {
                            const newExperience = [...(formData.experience || [])];
                            newExperience[index].keyResponsibilities = e.target.value;
                            setFormData({ ...formData, experience: newExperience });
                          }}
                        />
                      </Form.Item>
                    </div>
                  </Card>
                ))}
              </>
            )}

            {/* Courses and Internships Section for Freshers */}
            {isFresher && (
              <>
                <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Have you completed any courses or internships?
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
                    Please provide details about any relevant courses or internships you have completed.
                  </p>
                </div>

                {/* Courses Section */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">Courses Completed</h4>
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={handleCourseAdd}
                    >
                      Add Course
                    </Button>
                  </div>

                  {formData.courses?.map((course, index) => (
                    <Card key={index} className="mb-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium">Course {index + 1}</h4>
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleCourseRemove(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                          name={["courses", index, "courseName"]}
                          label="Course Name"
                          rules={[{ required: true, message: "Course name is required" }]}
                        >
                          <Input
                            value={course.courseName}
                            onChange={(e) => {
                              const newCourses = [...(formData.courses || [])];
                              newCourses[index].courseName = e.target.value;
                              setFormData({ ...formData, courses: newCourses });
                            }}
                            placeholder="e.g., Full Stack Web Development"
                          />
                        </Form.Item>
                        <Form.Item
                          name={["courses", index, "institution"]}
                          label="Institution/Platform"
                          rules={[{ required: true, message: "Institution is required" }]}
                        >
                          <Input
                            value={course.institution}
                            onChange={(e) => {
                              const newCourses = [...(formData.courses || [])];
                              newCourses[index].institution = e.target.value;
                              setFormData({ ...formData, courses: newCourses });
                            }}
                            placeholder="e.g., Udemy, Coursera, University Name"
                          />
                        </Form.Item>
                        <Form.Item
                          name={["courses", index, "completionDate"]}
                          label="Completion Date"
                        >
                          <DatePicker
                            style={{ width: "100%" }}
                            value={course.completionDate ? dayjs(course.completionDate) : undefined}
                            onChange={(date: Dayjs | null) => {
                              const newCourses = [...(formData.courses || [])];
                              newCourses[index].completionDate = date
                                ? date.format("YYYY-MM-DD")
                                : "";
                              setFormData({ ...formData, courses: newCourses });
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          name={["courses", index, "duration"]}
                          label="Duration"
                        >
                          <Input
                            value={course.duration}
                            onChange={(e) => {
                              const newCourses = [...(formData.courses || [])];
                              newCourses[index].duration = e.target.value;
                              setFormData({ ...formData, courses: newCourses });
                            }}
                            placeholder="e.g., 3 months, 6 weeks"
                          />
                        </Form.Item>
                        <Form.Item
                          name={["courses", index, "description"]}
                          label="Description"
                          className="md:col-span-2"
                        >
                          <TextArea
                            rows={3}
                            value={course.description}
                            onChange={(e) => {
                              const newCourses = [...(formData.courses || [])];
                              newCourses[index].description = e.target.value;
                              setFormData({ ...formData, courses: newCourses });
                            }}
                            placeholder="Brief description of what you learned..."
                          />
                        </Form.Item>
                        <Form.Item
                          name={["courses", index, "certificateUrl"]}
                          label="Certificate URL (Optional)"
                          className="md:col-span-2"
                        >
                          <Input
                            value={course.certificateUrl}
                            onChange={(e) => {
                              const newCourses = [...(formData.courses || [])];
                              newCourses[index].certificateUrl = e.target.value;
                              setFormData({ ...formData, courses: newCourses });
                            }}
                            placeholder="Link to your certificate (if available)"
                          />
                        </Form.Item>
                      </div>
                    </Card>
                  ))}
                </div>

                {/* Internships Section */}
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">Internships</h4>
                    <Button
                      type="dashed"
                      icon={<PlusOutlined />}
                      onClick={handleInternshipAdd}
                    >
                      Add Internship
                    </Button>
                  </div>

                  {formData.internships?.map((internship, index) => (
                    <Card key={index} className="mb-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium">Internship {index + 1}</h4>
                        <Button
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => handleInternshipRemove(index)}
                        >
                          Remove
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Form.Item
                          name={["internships", index, "company"]}
                          label="Company/Organization"
                          rules={[{ required: true, message: "Company name is required" }]}
                        >
                          <Input
                            value={internship.company}
                            onChange={(e) => {
                              const newInternships = [...(formData.internships || [])];
                              newInternships[index].company = e.target.value;
                              setFormData({ ...formData, internships: newInternships });
                            }}
                            placeholder="Company name"
                          />
                        </Form.Item>
                        <Form.Item
                          name={["internships", index, "role"]}
                          label="Role/Position"
                          rules={[{ required: true, message: "Role is required" }]}
                        >
                          <Input
                            value={internship.role}
                            onChange={(e) => {
                              const newInternships = [...(formData.internships || [])];
                              newInternships[index].role = e.target.value;
                              setFormData({ ...formData, internships: newInternships });
                            }}
                            placeholder="e.g., Software Development Intern"
                          />
                        </Form.Item>
                        <Form.Item
                          name={["internships", index, "durationFrom"]}
                          label="Start Date"
                          rules={[{ required: true, message: "Start date is required" }]}
                        >
                          <DatePicker
                            style={{ width: "100%" }}
                            value={internship.durationFrom ? dayjs(internship.durationFrom) : undefined}
                            onChange={(date: Dayjs | null) => {
                              const newInternships = [...(formData.internships || [])];
                              newInternships[index].durationFrom = date
                                ? date.format("YYYY-MM-DD")
                                : "";
                              setFormData({ ...formData, internships: newInternships });
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          name={["internships", index, "durationTo"]}
                          label="End Date"
                        >
                          <DatePicker
                            style={{ width: "100%" }}
                            value={internship.durationTo ? dayjs(internship.durationTo) : undefined}
                            onChange={(date: Dayjs | null) => {
                              const newInternships = [...(formData.internships || [])];
                              newInternships[index].durationTo = date
                                ? date.format("YYYY-MM-DD")
                                : "";
                              setFormData({ ...formData, internships: newInternships });
                            }}
                          />
                        </Form.Item>
                        <Form.Item
                          name={["internships", index, "keyResponsibilities"]}
                          label="Key Responsibilities"
                          className="md:col-span-2"
                        >
                          <TextArea
                            rows={3}
                            value={internship.keyResponsibilities}
                            onChange={(e) => {
                              const newInternships = [...(formData.internships || [])];
                              newInternships[index].keyResponsibilities = e.target.value;
                              setFormData({ ...formData, internships: newInternships });
                            }}
                            placeholder="Describe your main responsibilities..."
                          />
                        </Form.Item>
                        <Form.Item
                          name={["internships", index, "skillsLearned"]}
                          label="Skills Learned"
                          className="md:col-span-2"
                        >
                          <TextArea
                            rows={2}
                            value={internship.skillsLearned}
                            onChange={(e) => {
                              const newInternships = [...(formData.internships || [])];
                              newInternships[index].skillsLearned = e.target.value;
                              setFormData({ ...formData, internships: newInternships });
                            }}
                            placeholder="List the skills you gained during this internship..."
                          />
                        </Form.Item>
                        <Form.Item
                          name={["internships", index, "mentorName"]}
                          label="Mentor Name (Optional)"
                        >
                          <Input
                            value={internship.mentorName}
                            onChange={(e) => {
                              const newInternships = [...(formData.internships || [])];
                              newInternships[index].mentorName = e.target.value;
                              setFormData({ ...formData, internships: newInternships });
                            }}
                            placeholder="Your mentor's name"
                          />
                        </Form.Item>
                      </div>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step 4: Review & Submit */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review & Submit</h3>
            <Card>
              <h4 className="font-semibold mb-2">Personal Details</h4>
              <p>Name: {formData.firstName} {formData.lastName}</p>
              <p>Email: {formData.email}</p>
              <p>Phone: {formData.phone}</p>
              {formData.currentCity && <p>City: {formData.currentCity}</p>}
            </Card>
            <Card>
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold">Resume</h4>
                <Upload
                  beforeUpload={handleResumeUpload}
                  maxCount={1}
                  accept=".pdf,.doc,.docx"
                  showUploadList={false}
                >
                  <Button size="small" icon={<UploadOutlined />} loading={isUploadingResume}>
                    {formData.resume ? 'Replace Resume' : 'Upload Resume'}
                  </Button>
                </Upload>
              </div>
              {formData.resume ? (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileTextOutlined className="text-2xl text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate" title={formData.resume.name}>
                        {formData.resume.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Resume file uploaded</p>
                    </div>
                  </div>
                  {formData.resume.url && (
                    <Button
                      type="link"
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => {
                        window.open(formData.resume?.url, '_blank');
                      }}
                      className="flex-shrink-0"
                    >
                      View
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-600 font-medium">⚠️ No resume uploaded</p>
                  <p className="text-xs text-red-500 mt-1">Please upload your resume before submitting</p>
                </div>
              )}
            </Card>
            <Card>
              <h4 className="font-semibold mb-2">Education</h4>
              {formData.education?.map((edu, i) => (
                <div key={i} className="mb-2">
                  <p>{edu.qualification} - {edu.courseName}</p>
                  <p className="text-sm text-muted-foreground">
                    {edu.institution} ({edu.yearOfPassing})
                  </p>
                </div>
              ))}
            </Card>
            {isFresher && formData.courses && formData.courses.length > 0 && (
              <Card>
                <h4 className="font-semibold mb-2">Courses Completed</h4>
                {formData.courses.map((course, i) => (
                  <div key={i} className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{course.courseName}</p>
                    <p className="text-sm text-muted-foreground">
                      {course.institution}
                      {course.completionDate && ` • Completed: ${course.completionDate}`}
                      {course.duration && ` • Duration: ${course.duration}`}
                    </p>
                    {course.description && (
                      <p className="text-sm mt-1">{course.description}</p>
                    )}
                    {course.certificateUrl && (
                      <a href={course.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
                        View Certificate
                      </a>
                    )}
                  </div>
                ))}
              </Card>
            )}
            {isFresher && formData.internships && formData.internships.length > 0 && (
              <Card>
                <h4 className="font-semibold mb-2">Internships</h4>
                {formData.internships.map((internship, i) => (
                  <div key={i} className="mb-3 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium">{internship.role} at {internship.company}</p>
                    <p className="text-sm text-muted-foreground">
                      {internship.durationFrom && `From: ${internship.durationFrom}`}
                      {internship.durationTo && ` To: ${internship.durationTo}`}
                    </p>
                    {internship.keyResponsibilities && (
                      <p className="text-sm mt-1"><strong>Responsibilities:</strong> {internship.keyResponsibilities}</p>
                    )}
                    {internship.skillsLearned && (
                      <p className="text-sm mt-1"><strong>Skills Learned:</strong> {internship.skillsLearned}</p>
                    )}
                    {internship.mentorName && (
                      <p className="text-sm mt-1"><strong>Mentor:</strong> {internship.mentorName}</p>
                    )}
                  </div>
                ))}
              </Card>
            )}
            {!isFresher && (
              <Card>
                <h4 className="font-semibold mb-2">Experience</h4>
                <p className="mb-3">Total: {formData.totalYearsOfExperience} years</p>
                
                {/* Current Company Information */}
                {(formData.currentCompany || formData.currentJobTitle) && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-base mb-1">Current Employment</p>
                    {formData.currentCompany && (
                      <p className="text-sm">Company: {formData.currentCompany}</p>
                    )}
                    {formData.currentJobTitle && (
                      <p className="text-sm">Job Title: {formData.currentJobTitle}</p>
                    )}
                    {formData.employmentType && (
                      <p className="text-sm">Employment Type: {formData.employmentType}</p>
                    )}
                  </div>
                )}

                {/* Previous Work Experience */}
                {formData.experience && formData.experience.length > 0 ? (
                  formData.experience.map((exp, i) => {
                    // Only show if experience has at least company or role
                    if (!exp.company && !exp.role && !exp.designation) {
                      return null;
                    }
                    return (
                      <div key={i} className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-base mb-1">
                          {exp.company || 'Company'} - {exp.role || 'Role'}
                        </p>
                        {exp.designation && (
                          <p className="text-sm text-muted-foreground">Designation: {exp.designation}</p>
                        )}
                        <p className="text-sm text-muted-foreground">
                          Duration: {exp.durationFrom ? (typeof exp.durationFrom === 'string' ? dayjs(exp.durationFrom).format('MMM YYYY') : dayjs(exp.durationFrom).format('MMM YYYY')) : 'N/A'} to {exp.durationTo ? (typeof exp.durationTo === 'string' ? dayjs(exp.durationTo).format('MMM YYYY') : dayjs(exp.durationTo).format('MMM YYYY')) : 'Present'}
                        </p>
                        {exp.keyResponsibilities && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Key Responsibilities:</p>
                            <p className="text-sm text-muted-foreground">{exp.keyResponsibilities}</p>
                          </div>
                        )}
                        {exp.reasonForLeaving && (
                          <div className="mt-2">
                            <p className="text-sm font-medium">Reason for Leaving:</p>
                            <p className="text-sm text-muted-foreground">{exp.reasonForLeaving}</p>
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">No previous work experience added</p>
                )}
              </Card>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          {currentStep > 0 && (
            <Button onClick={handlePrev}>Previous</Button>
          )}
          <div className="ml-auto">
            {currentStep < steps.length - 1 ? (
              <Button type="primary" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleSubmit}
                loading={isLoading}
              >
                Submit Application
              </Button>
            )}
          </div>
        </div>
      </Form>
    </div>
  );
};

export default CandidateApplicationForm;

