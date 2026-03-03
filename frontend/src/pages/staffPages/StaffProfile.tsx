import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from "@/components/ui/select";
import { User, Edit, Save, X, Ban, CheckCircle, Calendar, DollarSign, FileText, Receipt, CreditCard, Clock, CheckCircle2, XCircle, AlertCircle, Download, Eye, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useParams, useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import ExpenseClaim from "./ExpenseClaim";
import LeavesPendingApproval from "./LeavesPendingApproval";
import SalaryOverview from "./SalaryOverview";
import Loans from "./Loans";
import EmployeeAttendance from "./EmployeeAttendance";
import PayslipRequests from "./PayslipRequests";
import { useGetStaffByIdQuery, useUpdateStaffMutation, useGetAvailableShiftsQuery, useGetAvailableTemplatesQuery, useUploadStaffAvatarMutation } from "@/store/api/staffApi";
import { useGetOnboardingByStaffIdQuery, useVerifyDocumentMutation, useUploadOnboardingDocumentMutation } from "@/store/api/onboardingApi";
import { useGetActiveBranchesQuery } from "@/store/api/branchApi";
import SalaryStructureForm from "@/components/SalaryStructureForm";
import { Skeleton } from "@/components/ui/skeleton";
import { message } from "antd";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  calculateSalaryStructure,
  type SalaryStructureInputs,
} from "@/utils/salaryStructureCalculation.util";
import { useAppSelector } from "@/store/hooks";
import { getUserPermissions, hasAction } from "@/utils/permissionUtils";
import { formatErrorMessage } from "@/utils/errorFormatter";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const StaffProfile = () => {
  const [activeTab, setActiveTab] = useState("profile");
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  
  // Tab scroll functionality
  const tabsListRef = useRef<HTMLDivElement>(null);
  const [showLeftScroll, setShowLeftScroll] = useState(false);
  const [showRightScroll, setShowRightScroll] = useState(false);

  // If no ID, redirect to staff list
  useEffect(() => {
    if (!id) {
      navigate('/staff');
    }
  }, [id, navigate]);

  const { data: staffDataResponse, isLoading, error, refetch } = useGetStaffByIdQuery(id || "", {
    skip: !id,
    refetchOnMountOrArgChange: true
  });

  const { data: onboardingData, isLoading: isLoadingOnboarding, refetch: refetchOnboarding } = useGetOnboardingByStaffIdQuery(id || "", {
    skip: !id
  });

  // Fetch templates and shifts for editing
  const { data: shiftsData } = useGetAvailableShiftsQuery();
  const { data: templatesData } = useGetAvailableTemplatesQuery();
  const { data: branchesData } = useGetActiveBranchesQuery();
  
  const shifts = shiftsData?.data?.shifts || [];
  const attendanceTemplates = templatesData?.data?.attendanceTemplates || [];
  const leaveTemplates = templatesData?.data?.leaveTemplates || [];
  const holidayTemplates = templatesData?.data?.holidayTemplates || [];
  const weeklyHolidayTemplates = templatesData?.data?.weeklyHolidayTemplates || [];
  const branches = branchesData?.data?.branches || [];

  const [updateStaff, { isLoading: isUpdating }] = useUpdateStaffMutation();
  const [verifyDocument, { isLoading: isVerifying }] = useVerifyDocumentMutation();
  const [uploadAvatar, { isLoading: isUploadingAvatar }] = useUploadStaffAvatarMutation();
  const [uploadDocument, { isLoading: isUploadingDocument }] = useUploadOnboardingDocumentMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Document verification state
  const [selectedDocument, setSelectedDocument] = useState<any>(null);
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<"COMPLETED" | "REJECTED">("COMPLETED");
  const [verifyNotes, setVerifyNotes] = useState("");
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);

  // Permission checks
  const { user } = useAppSelector((state) => state.auth);
  const permissions = user ? getUserPermissions(user.role, user.roleId as any, user.permissions) : [];
  const canVerifyDocuments = hasAction(permissions, 'staff', 'update') || hasAction(permissions, 'staff', 'edit') || user?.role === 'Admin' || user?.role === 'Super Admin';

  const employeeData = staffDataResponse?.data?.staff;
  const candidateData = employeeData?.candidateId && typeof employeeData.candidateId === 'object' ? employeeData.candidateId : null;
  const onboarding = onboardingData?.data?.onboarding;

  useEffect(() => {
    if (employeeData) {
      // Extract template IDs - handle both string and populated object cases
      const getTemplateId = (template: any) => {
        if (!template) return "";
        if (typeof template === 'string') return template;
        if (typeof template === 'object' && template._id) return template._id;
        return "";
      };

      setFormData({
        name: employeeData.name || "",
        email: employeeData.email || "",
        phone: employeeData.phone || "",
        alternativePhone: employeeData.alternativePhone || "",
        countryCode: employeeData.countryCode || "",
        designation: employeeData.designation || "",
        department: employeeData.department || "",
        staffType: employeeData.staffType || "Full Time",
        joiningDate: employeeData.joiningDate ? new Date(employeeData.joiningDate).toISOString().split('T')[0] : '',
        gender: employeeData.gender || "",
        dob: employeeData.dob ? new Date(employeeData.dob).toISOString().split('T')[0] : '',
        maritalStatus: employeeData.maritalStatus || "",
        bloodGroup: employeeData.bloodGroup || "",
        branchId: typeof employeeData.branchId === 'string' ? employeeData.branchId : (employeeData.branchId?._id || ""),
        shiftName: employeeData.shiftName || "",
        attendanceTemplateId: getTemplateId(employeeData.attendanceTemplateId),
        leaveTemplateId: getTemplateId(employeeData.leaveTemplateId),
        holidayTemplateId: getTemplateId(employeeData.holidayTemplateId),
        weeklyHolidayTemplateId: getTemplateId(employeeData.weeklyHolidayTemplateId),
        address: {
          line1: employeeData.address?.line1 || "",
          city: employeeData.address?.city || "",
          state: employeeData.address?.state || "",
          postalCode: employeeData.address?.postalCode || "",
          country: employeeData.address?.country || ""
        },
        bankDetails: {
          bankName: employeeData.bankDetails?.bankName || "",
          accountNumber: employeeData.bankDetails?.accountNumber || "",
          ifscCode: employeeData.bankDetails?.ifscCode || "",
          accountHolderName: employeeData.bankDetails?.accountHolderName || "",
          upiId: employeeData.bankDetails?.upiId || ""
        },
        uan: employeeData.uan || "",
        pan: employeeData.pan || "",
        aadhaar: employeeData.aadhaar || "",
        pfNumber: employeeData.pfNumber || "",
        esiNumber: employeeData.esiNumber || ""
      });
    }
  }, [employeeData]);

  // Check scroll position and show/hide scroll buttons
  // Shows buttons when tabs overflow (works regardless of sidebar state or screen size)
  const checkScrollButtons = () => {
    if (!tabsListRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = tabsListRef.current;
    const hasOverflow = scrollWidth > clientWidth;
    
    // Always show buttons when there's overflow, regardless of screen size
    // This handles: small screens, large screens with sidebar expanded, etc.
    if (hasOverflow) {
      setShowLeftScroll(scrollLeft > 0);
      setShowRightScroll(scrollLeft < scrollWidth - clientWidth - 1);
    } else {
      setShowLeftScroll(false);
      setShowRightScroll(false);
    }
  };

  // Scroll functions - scroll by tab width to show next/previous tabs
  const scrollLeft = () => {
    if (tabsListRef.current) {
      // Get the first visible tab to calculate scroll amount
      const firstTab = tabsListRef.current.querySelector('[role="tab"]') as HTMLElement;
      const scrollAmount = firstTab ? firstTab.offsetWidth + 8 : tabsListRef.current.clientWidth * 0.6;
      tabsListRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      // Recheck after scroll animation
      setTimeout(checkScrollButtons, 350);
    }
  };

  const scrollRight = () => {
    if (tabsListRef.current) {
      // Get the first visible tab to calculate scroll amount
      const firstTab = tabsListRef.current.querySelector('[role="tab"]') as HTMLElement;
      const scrollAmount = firstTab ? firstTab.offsetWidth + 8 : tabsListRef.current.clientWidth * 0.6;
      tabsListRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      // Recheck after scroll animation
      setTimeout(checkScrollButtons, 350);
    }
  };

  // Check scroll buttons on mount and resize
  useEffect(() => {
    // Initial check with multiple delays to ensure DOM is ready
    const timers = [
      setTimeout(() => checkScrollButtons(), 100),
      setTimeout(() => checkScrollButtons(), 300),
      setTimeout(() => checkScrollButtons(), 500),
    ];

    const handleResize = () => {
      setTimeout(checkScrollButtons, 200);
    };

    // Check on window resize
    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver to detect when tabs container size changes
    let resizeObserver: ResizeObserver | null = null;
    if (tabsListRef.current) {
      resizeObserver = new ResizeObserver(() => {
        setTimeout(checkScrollButtons, 100);
      });
      resizeObserver.observe(tabsListRef.current);
    }

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      window.removeEventListener('resize', handleResize);
      if (resizeObserver && tabsListRef.current) {
        resizeObserver.unobserve(tabsListRef.current);
      }
    };
  }, []);

  // Check scroll buttons when activeTab changes and scroll active tab into view
  useEffect(() => {
    setTimeout(() => {
      checkScrollButtons();
      // Scroll active tab into view
      if (tabsListRef.current) {
        const activeTabElement = tabsListRef.current.querySelector(`[data-state="active"]`) as HTMLElement;
        if (activeTabElement) {
          activeTabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    }, 150);
  }, [activeTab]);

  const handleSave = async () => {
    if (!id) return;
    try {
      // Helper function to clean empty strings from nested objects
      const cleanNestedObject = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return obj;
        const cleaned: any = {};
        for (const key in obj) {
          const value = obj[key];
          if (value !== null && value !== undefined && value !== "") {
            cleaned[key] = value;
          }
        }
        return Object.keys(cleaned).length > 0 ? cleaned : undefined;
      };

      // Prepare update data - convert "none" to undefined and empty strings to undefined
      const updateData: any = {
        name: formData.name || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        alternativePhone: formData.alternativePhone && formData.alternativePhone.trim() ? formData.alternativePhone.trim() : undefined,
        countryCode: formData.countryCode && formData.countryCode.trim() ? formData.countryCode.trim() : undefined,
        designation: formData.designation || undefined,
        department: formData.department || undefined,
        staffType: formData.staffType || undefined,
        joiningDate: formData.joiningDate && formData.joiningDate.trim() ? formData.joiningDate : undefined,
        gender: formData.gender && formData.gender !== "" && formData.gender !== "none" ? formData.gender : undefined,
        dob: formData.dob && formData.dob.trim() ? formData.dob : undefined,
        maritalStatus: formData.maritalStatus && formData.maritalStatus !== "" && formData.maritalStatus !== "none" ? formData.maritalStatus : undefined,
        bloodGroup: formData.bloodGroup && formData.bloodGroup.trim() ? formData.bloodGroup.trim() : undefined,
        shiftName: formData.shiftName && formData.shiftName !== "none" && formData.shiftName.trim() ? formData.shiftName.trim() : undefined,
        attendanceTemplateId: formData.attendanceTemplateId && formData.attendanceTemplateId !== "none" && formData.attendanceTemplateId.trim() ? formData.attendanceTemplateId : undefined,
        leaveTemplateId: formData.leaveTemplateId && formData.leaveTemplateId !== "none" && formData.leaveTemplateId.trim() ? formData.leaveTemplateId : undefined,
        holidayTemplateId: formData.holidayTemplateId && formData.holidayTemplateId !== "none" && formData.holidayTemplateId.trim() ? formData.holidayTemplateId : undefined,
        branchId: formData.branchId && formData.branchId !== "none" && formData.branchId.trim() ? formData.branchId : undefined,
        address: cleanNestedObject(formData.address),
        bankDetails: cleanNestedObject(formData.bankDetails),
        uan: formData.uan && formData.uan.trim() ? formData.uan.trim() : undefined,
        pan: formData.pan && formData.pan.trim() ? formData.pan.trim() : undefined,
        aadhaar: formData.aadhaar && formData.aadhaar.trim() ? formData.aadhaar.trim() : undefined,
        pfNumber: formData.pfNumber && formData.pfNumber.trim() ? formData.pfNumber.trim() : undefined,
        esiNumber: formData.esiNumber && formData.esiNumber.trim() ? formData.esiNumber.trim() : undefined,
      };

      // Remove undefined values to avoid sending them
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      await updateStaff({
        id,
        data: updateData
      }).unwrap();
      message.success("Profile updated successfully");
      setIsEditing(false);
      refetch(); // Refresh the data
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      message.error(errorMessage);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!id) return;
    try {
      await updateStaff({
        id,
        data: { status: newStatus } as any
      }).unwrap();
      message.success(`Staff ${newStatus.toLowerCase()} successfully`);
    } catch (err: any) {
      const errorMessage = formatErrorMessage(err);
      message.error(errorMessage);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData((prev: any) => ({
        ...prev,
        [parent]: {
          ...prev[parent] || {},
          [child]: value
        }
      }));
    } else {
      setFormData((prev: any) => ({ ...prev, [field]: value }));
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </MainLayout>
    );
  }

  if (!employeeData) {
    return (
      <MainLayout>
        <div className="p-6 text-red-500">
          Employee not found or failed to load.
          {error && <p className="text-sm text-muted-foreground mt-2">{JSON.stringify(error)}</p>}
        </div>
      </MainLayout>
    );
  }

  // Helper to safely get manager name if populated or string
  const getManagerName = (manager: any) => {
    if (!manager) return "";
    return typeof manager === 'object' ? manager.name : "";
  };

  return (
    <MainLayout>
      <main className="p-3 sm:p-4 lg:p-6">
        <Button onClick={() => navigate(-1)} className="mb-4 w-full sm:w-auto">
          ← Back
        </Button>

        <div className="space-y-6 mt-3">

          {/* HEADER CARD */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-4">

                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <Avatar className="w-20 h-20">
                      <AvatarImage src={employeeData.avatar} />
                      <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                        {employeeData.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-full flex items-center justify-center transition-opacity cursor-pointer">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/jpeg,image/jpg,image/png"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file && id) {
                          try {
                            await uploadAvatar({
                              staffId: id,
                              file,
                            }).unwrap();
                            message.success("Avatar uploaded successfully");
                            refetch();
                          } catch (error: any) {
                            message.error(
                              error?.data?.error?.message ||
                                "Failed to upload avatar"
                            );
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        fileInputRef.current?.click();
                      }}
                      className="absolute inset-0 rounded-full"
                      disabled={isUploadingAvatar}
                    />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                      {isEditing ? (
                        <Input
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          className="text-2xl font-bold h-10"
                        />
                      ) : employeeData.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge>{employeeData.employeeId}</Badge>
                      <Badge variant="secondary">{employeeData.staffType}</Badge>
                      <span className="text-muted-foreground">{employeeData.designation}</span>
                      <Badge variant={employeeData.status === 'Active' ? 'default' : 'secondary'}>{employeeData.status}</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {activeTab === "profile" && (
                    <>
                      {isEditing ? (
                        <>
                          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                            <X className="w-4 h-4 mr-2" /> Cancel
                          </Button>
                          <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                            <Save className="w-4 h-4 mr-2" /> {isUpdating ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                          <Edit className="w-4 h-4 mr-2" /> Edit Profile
                        </Button>
                      )}
                    </>
                  )}

                  {employeeData.status === 'Active' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange('Deactivated')}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Ban className="w-4 h-4 mr-2" /> Deactivate Staff
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange('Active')}
                      className="text-[#efaa1f] hover:text-[#d97706] hover:bg-[#fffbeb] border-[#fde68a]"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Activate Staff
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>


          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-6">
            {/* TOP TABS WITH SCROLL BUTTONS */}
            <div className="relative w-full mb-6">
              {/* Left Scroll Button - Show when tabs overflow */}
              <Button
                variant="outline"
                size="icon"
                className={`absolute left-0 top-1/2 -translate-y-1/2 z-30 h-10 w-10 bg-background/98 backdrop-blur-sm shadow-lg border-2 hover:bg-background transition-opacity duration-200 ${
                  showLeftScroll ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={scrollLeft}
                aria-label="Scroll left"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              {/* Right Scroll Button - Show when tabs overflow */}
              <Button
                variant="outline"
                size="icon"
                className={`absolute right-0 top-1/2 -translate-y-1/2 z-30 h-10 w-10 bg-background/98 backdrop-blur-sm shadow-lg border-2 hover:bg-background transition-opacity duration-200 ${
                  showRightScroll ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={scrollRight}
                aria-label="Scroll right"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>

              <TabsList
                ref={tabsListRef}
                onScroll={checkScrollButtons}
                className="
                  flex flex-row
                  bg-card border rounded-lg py-2 gap-1.5
                  w-full
                  min-h-[44px]
                  overflow-x-auto
                  overflow-y-visible
                  scroll-smooth
                  [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]
                  pl-12 pr-12
                  min-[1400px]:pl-2 min-[1400px]:pr-2
                  snap-x snap-mandatory
                "
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
              >
              <TabsTrigger 
                className="flex items-center justify-center whitespace-nowrap px-2.5 sm:px-3 md:px-4 flex-shrink-0" 
                value="profile"
                style={{ minWidth: 'fit-content' }}
              >
                <User className="w-4 h-4 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Profile</span>
              </TabsTrigger>
              <TabsTrigger 
                className="flex items-center justify-center whitespace-nowrap px-2.5 sm:px-3 md:px-4 flex-shrink-0" 
                value="attendance"
                style={{ minWidth: 'fit-content' }}
              >
                <Clock className="w-4 h-4 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Attendance</span>
              </TabsTrigger>
              <TabsTrigger 
                className="flex items-center justify-center whitespace-nowrap px-2.5 sm:px-3 md:px-4 flex-shrink-0" 
                value="salary"
                style={{ minWidth: 'fit-content' }}
              >
                <DollarSign className="w-4 h-4 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Salary Overview</span>
              </TabsTrigger>
              <TabsTrigger 
                className="flex items-center justify-center whitespace-nowrap px-2.5 sm:px-3 md:px-4 flex-shrink-0" 
                value="salaryStructure"
                style={{ minWidth: 'fit-content' }}
              >
                <Receipt className="w-4 h-4 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Salary Structure</span>
              </TabsTrigger>
              <TabsTrigger 
                className="flex items-center justify-center whitespace-nowrap px-2.5 sm:px-3 md:px-4 flex-shrink-0" 
                value="leaves"
                style={{ minWidth: 'fit-content' }}
              >
                <Calendar className="w-4 h-4 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Leaves</span>
              </TabsTrigger>
              <TabsTrigger 
                className="flex items-center justify-center whitespace-nowrap px-2.5 sm:px-3 md:px-4 flex-shrink-0" 
                value="loans"
                style={{ minWidth: 'fit-content' }}
              >
                <CreditCard className="w-4 h-4 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Loans</span>
              </TabsTrigger>
              <TabsTrigger 
                className="flex items-center justify-center whitespace-nowrap px-2.5 sm:px-3 md:px-4 flex-shrink-0" 
                value="documents"
                style={{ minWidth: 'fit-content' }}
              >
                <FileText className="w-4 h-4 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Documents</span>
              </TabsTrigger>
              <TabsTrigger 
                className="flex items-center justify-center whitespace-nowrap px-2.5 sm:px-3 md:px-4 flex-shrink-0" 
                value="claim"
                style={{ minWidth: 'fit-content' }}
              >
                <Receipt className="w-4 h-4 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Expense Claim</span>
              </TabsTrigger>
              <TabsTrigger 
                className="flex items-center justify-center whitespace-nowrap px-2.5 sm:px-3 md:px-4 flex-shrink-0" 
                value="payslips"
                style={{ minWidth: 'fit-content' }}
              >
                <FileText className="w-4 h-4 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Payslip Requests</span>
              </TabsTrigger>
            </TabsList>
            </div>

            {/* TAB CONTENT */}
            <div className="w-full">

                {/* TAB: PROFILE */}
                <TabsContent value="profile" className="space-y-6 mt-4">
                  <Card>
                    <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={isEditing ? formData.name : employeeData.name || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Employee ID</Label>
                        <Input value={employeeData.employeeId || "N/A"} readOnly className="bg-muted" />
                      </div>
                      <div className="space-y-2">
                        <Label>Designation</Label>
                        <Input
                          value={isEditing ? formData.designation : employeeData.designation || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('designation', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Staff Type</Label>
                        {isEditing ? (
                          <Select
                            value={formData.staffType}
                            onValueChange={(val) => handleInputChange('staffType', val)}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Full Time">Full Time</SelectItem>
                              <SelectItem value="Part Time">Part Time</SelectItem>
                              <SelectItem value="Contract">Contract</SelectItem>
                              <SelectItem value="Intern">Intern</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={employeeData.staffType || "N/A"} readOnly />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Contact Number</Label>
                        <Input
                          value={isEditing ? formData.phone : employeeData.phone || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Country Code</Label>
                        <Input
                          value={isEditing ? formData.countryCode : employeeData.countryCode || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('countryCode', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                          placeholder="e.g., 91 for India"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Alternative Phone (Optional)</Label>
                        <Input
                          value={isEditing ? formData.alternativePhone : employeeData.alternativePhone || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('alternativePhone', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                          placeholder="Alternative contact number"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Department</Label>
                        {isEditing ? (
                          <Select
                            value={formData.department}
                            onValueChange={(val) => handleInputChange('department', val)}
                          >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="HR">HR</SelectItem>
                              <SelectItem value="Development">Development</SelectItem>
                              <SelectItem value="Marketing">Marketing</SelectItem>
                              <SelectItem value="Engineering">Engineering</SelectItem>
                              <SelectItem value="IT">IT</SelectItem>
                              <SelectItem value="Sales">Sales</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={employeeData.department || "N/A"} readOnly />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Reporting Manager</Label>
                        <Input value={getManagerName(employeeData.managerId) || ""} readOnly className="bg-muted" placeholder="Not assigned" />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Input value={employeeData.designation || ""} readOnly className="bg-muted" placeholder="Not assigned" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>General Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Salary Cycle" value="Monthly" />
                      {employeeData.salary && (() => {
                        // Check if salary has basicSalary (new structure) or gross/net (old structure)
                        const salary = employeeData.salary as any;
                        const hasBasicSalary = salary && typeof salary.basicSalary === 'number';
                        
                        if (hasBasicSalary) {
                          // Use new salary structure calculation
                          const staffSalary = salary as SalaryStructureInputs;
                          try {
                            const calculatedSalary = calculateSalaryStructure(staffSalary);
                            return (
                              <>
                                <Field 
                                  label="Gross Salary" 
                                  value={`₹ ${calculatedSalary.monthly.grossSalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                                />
                                <Field 
                                  label="Net Salary" 
                                  value={`₹ ${calculatedSalary.monthly.netMonthlySalary.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
                                />
                              </>
                            );
                          } catch (error) {
                            console.error('Error calculating salary structure:', error);
                            return null;
                          }
                        } else {
                          // Fallback to old structure (if gross/net exist directly)
                          return (
                            <>
                              <Field 
                                label="Gross Salary" 
                                value={`₹ ${salary.gross?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`} 
                              />
                              <Field 
                                label="Net Salary" 
                                value={`₹ ${salary.net?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}`} 
                              />
                            </>
                          );
                        }
                      })()}
                      {employeeData.offerLetterUrl && (
                        <div className="space-y-2">
                          <Label>Offer Letter</Label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(employeeData.offerLetterUrl, '_blank')}
                            className="w-full"
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            View Offer Letter
                          </Button>
                        </div>
                      )}
                      <div className="space-y-2">
                        <Label>Shift</Label>
                        {isEditing ? (
                          <Select
                            value={formData.shiftName || undefined}
                            onValueChange={(value) => setFormData({ ...formData, shiftName: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select shift (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {shifts.map((shift, index) => (
                                <SelectItem key={index} value={shift.name}>
                                  {shift.name} ({shift.startTime} - {shift.endTime})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={
                              employeeData.shiftName 
                                ? `${employeeData.shiftName}${shifts.find(s => s.name === employeeData.shiftName) ? ` (${shifts.find(s => s.name === employeeData.shiftName)?.startTime} - ${shifts.find(s => s.name === employeeData.shiftName)?.endTime})` : ''}`
                                : "Not assigned"
                            } 
                            readOnly 
                            className="bg-muted" 
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Attendance Template</Label>
                        {isEditing ? (
                          <Select
                            value={formData.attendanceTemplateId || undefined}
                            onValueChange={(value) => setFormData({ ...formData, attendanceTemplateId: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select attendance template (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {attendanceTemplates.map((template) => (
                                <SelectItem key={template._id} value={template._id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={
                              employeeData.attendanceTemplateId 
                                ? (typeof employeeData.attendanceTemplateId === 'object' 
                                    ? employeeData.attendanceTemplateId.name 
                                    : attendanceTemplates.find(t => t._id === employeeData.attendanceTemplateId)?.name || "Unknown")
                                : "Not assigned"
                            } 
                            readOnly 
                            className="bg-muted" 
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Leave Template</Label>
                        {isEditing ? (
                          <Select
                            value={formData.leaveTemplateId || undefined}
                            onValueChange={(value) => setFormData({ ...formData, leaveTemplateId: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select leave template (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {leaveTemplates.map((template) => (
                                <SelectItem key={template._id} value={template._id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={
                              employeeData.leaveTemplateId 
                                ? (typeof employeeData.leaveTemplateId === 'object' 
                                    ? employeeData.leaveTemplateId.name 
                                    : leaveTemplates.find(t => t._id === employeeData.leaveTemplateId)?.name || "Unknown")
                                : "Not assigned"
                            } 
                            readOnly 
                            className="bg-muted" 
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Holiday Template</Label>
                        {isEditing ? (
                          <Select
                            value={formData.holidayTemplateId || undefined}
                            onValueChange={(value) => setFormData({ ...formData, holidayTemplateId: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select holiday template (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {holidayTemplates.map((template) => (
                                <SelectItem key={template._id} value={template._id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={
                              employeeData.holidayTemplateId 
                                ? (typeof employeeData.holidayTemplateId === 'object' 
                                    ? employeeData.holidayTemplateId.name 
                                    : holidayTemplates.find(t => t._id === employeeData.holidayTemplateId)?.name || "Unknown")
                                : "Not assigned"
                            } 
                            readOnly 
                            className="bg-muted" 
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Weekly Holiday Template</Label>
                        {isEditing ? (
                          <Select
                            value={formData.weeklyHolidayTemplateId || undefined}
                            onValueChange={(value) => setFormData({ ...formData, weeklyHolidayTemplateId: value === "none" ? "" : value })}
                          >
                            <SelectTrigger><SelectValue placeholder="Select weekly holiday template (optional)" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {weeklyHolidayTemplates.map((template) => (
                                <SelectItem key={template._id} value={template._id}>
                                  {template.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input 
                            value={
                              employeeData.weeklyHolidayTemplateId 
                                ? (typeof employeeData.weeklyHolidayTemplateId === 'object' 
                                    ? employeeData.weeklyHolidayTemplateId.name 
                                    : weeklyHolidayTemplates.find(t => t._id === employeeData.weeklyHolidayTemplateId)?.name || "Unknown")
                                : "Not assigned"
                            } 
                            readOnly 
                            className="bg-muted" 
                          />
                        )}
                      </div>
                      {branches.length > 0 && (
                        <div className="space-y-2">
                          <Label>Branch</Label>
                          {isEditing ? (
                            <Select
                              value={formData.branchId || undefined}
                              onValueChange={(value) => setFormData({ ...formData, branchId: value === "none" ? "" : value })}
                            >
                              <SelectTrigger><SelectValue placeholder="Select branch (optional)" /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">None</SelectItem>
                                {branches.map((branch) => (
                                  <SelectItem key={branch._id} value={branch._id}>
                                    {branch.branchName} {branch.isHeadOffice ? "(Head Office)" : ""} - {branch.branchCode}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input 
                              value={
                                employeeData.branchId 
                                  ? (typeof employeeData.branchId === 'object' 
                                      ? `${employeeData.branchId.branchName} ${employeeData.branchId.isHeadOffice ? "(Head Office)" : ""} - ${employeeData.branchId.branchCode}`
                                      : branches.find(b => b._id === employeeData.branchId) 
                                        ? `${branches.find(b => b._id === employeeData.branchId)?.branchName} ${branches.find(b => b._id === employeeData.branchId)?.isHeadOffice ? "(Head Office)" : ""} - ${branches.find(b => b._id === employeeData.branchId)?.branchCode}`
                                        : "Unknown")
                                  : "Not assigned"
                              } 
                              readOnly 
                              className="bg-muted" 
                            />
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          value={isEditing ? formData.email : employeeData.email || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        {isEditing ? (
                          <Select value={formData.gender} onValueChange={(val) => handleInputChange('gender', val)}>
                            <SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={employeeData.gender || "N/A"} readOnly className="bg-muted" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Date of Birth</Label>
                        <Input
                          type={isEditing ? "date" : "text"}
                          value={isEditing ? formData.dob : (employeeData.dob ? new Date(employeeData.dob).toLocaleDateString() : "N/A")}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('dob', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Marital Status</Label>
                        {isEditing ? (
                          <Select value={formData.maritalStatus} onValueChange={(val) => handleInputChange('maritalStatus', val)}>
                            <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Single">Single</SelectItem>
                              <SelectItem value="Married">Married</SelectItem>
                              <SelectItem value="Divorced">Divorced</SelectItem>
                              <SelectItem value="Widowed">Widowed</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input value={employeeData.maritalStatus || "N/A"} readOnly className="bg-muted" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Blood Group</Label>
                        <Input
                          value={isEditing ? formData.bloodGroup : employeeData.bloodGroup || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Current Address</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2 space-y-2">
                        <Label>Address Line 1</Label>
                        <Input
                          value={isEditing ? formData.address.line1 : employeeData.address?.line1 || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('address.line1', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          value={isEditing ? formData.address.city : employeeData.address?.city || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('address.city', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Input
                          value={isEditing ? formData.address.state : employeeData.address?.state || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('address.state', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Postal Code</Label>
                        <Input
                          value={isEditing ? formData.address.postalCode : employeeData.address?.postalCode || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Country</Label>
                        <Input
                          value={isEditing ? formData.address.country : employeeData.address?.country || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('address.country', e.target.value)}
                          className={!isEditing ? "bg-muted" : ""}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Employment Information</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Date of Joining</Label>
                        {isEditing ? (
                          <DatePicker
                            value={formData.joiningDate && formData.joiningDate.trim() ? new Date(formData.joiningDate) : undefined}
                            onChange={(date) => {
                              if (date) {
                                handleInputChange('joiningDate', format(date, 'yyyy-MM-dd'));
                              } else {
                                handleInputChange('joiningDate', '');
                              }
                            }}
                            placeholder="Select joining date"
                          />
                        ) : (
                          <Input
                            type="text"
                            value={employeeData.joiningDate ? format(new Date(employeeData.joiningDate), 'PPP') : "N/A"}
                            readOnly
                            className="bg-muted"
                          />
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>UAN</Label>
                        <Input
                          value={isEditing ? formData.uan : employeeData.uan || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('uan', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>PAN Number</Label>
                        <Input
                          value={isEditing ? formData.pan : employeeData.pan || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('pan', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Aadhaar Number</Label>
                        <Input
                          value={isEditing ? formData.aadhaar : employeeData.aadhaar || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('aadhaar', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>PF Number</Label>
                        <Input
                          value={isEditing ? formData.pfNumber : employeeData.pfNumber || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('pfNumber', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ESI Number</Label>
                        <Input
                          value={isEditing ? formData.esiNumber : employeeData.esiNumber || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('esiNumber', e.target.value)}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle>Bank Details</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Name of Bank</Label>
                        <Input
                          value={isEditing ? formData.bankDetails.bankName : employeeData.bankDetails?.bankName || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('bankDetails.bankName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>IFSC Code</Label>
                        <Input
                          value={isEditing ? formData.bankDetails.ifscCode : employeeData.bankDetails?.ifscCode || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('bankDetails.ifscCode', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                          value={isEditing ? formData.bankDetails.accountNumber : employeeData.bankDetails?.accountNumber || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('bankDetails.accountNumber', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Holder Name</Label>
                        <Input
                          value={isEditing ? formData.bankDetails.accountHolderName : employeeData.bankDetails?.accountHolderName || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('bankDetails.accountHolderName', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>UPI ID</Label>
                        <Input
                          value={isEditing ? formData.bankDetails.upiId : employeeData.bankDetails?.upiId || "N/A"}
                          readOnly={!isEditing}
                          onChange={(e) => handleInputChange('bankDetails.upiId', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Verification Status</Label>
                        <div className="pt-2"><Badge variant="outline">Pending</Badge></div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Candidate Details Section */}
                  {candidateData && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Previous Candidate Details</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">Information from candidate application</p>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Education */}
                        {candidateData.education && candidateData.education.length > 0 && (
                          <div>
                            <Label className="text-base font-semibold mb-3 block">Education</Label>
                            <div className="space-y-3">
                              {candidateData.education.map((edu: any, idx: number) => (
                                <div key={idx} className="p-3 border rounded-lg">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    <div><span className="font-medium">Qualification:</span> {edu.qualification || "N/A"}</div>
                                    <div><span className="font-medium">Course:</span> {edu.courseName || "N/A"}</div>
                                    <div><span className="font-medium">Institution:</span> {edu.institution || "N/A"}</div>
                                    <div><span className="font-medium">University:</span> {edu.university || "N/A"}</div>
                                    <div><span className="font-medium">Year:</span> {edu.yearOfPassing || "N/A"}</div>
                                    {(edu.percentage || edu.cgpa) && (
                                      <div><span className="font-medium">Score:</span> {edu.percentage || edu.cgpa}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Experience */}
                        {candidateData.experience && candidateData.experience.length > 0 && (
                          <div>
                            <Label className="text-base font-semibold mb-3 block">Work Experience</Label>
                            <div className="space-y-3">
                              {candidateData.experience.map((exp: any, idx: number) => (
                                <div key={idx} className="p-3 border rounded-lg">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    <div><span className="font-medium">Company:</span> {exp.company || "N/A"}</div>
                                    <div><span className="font-medium">Role:</span> {exp.role || exp.designation || "N/A"}</div>
                                    <div><span className="font-medium">Duration:</span> {exp.durationFrom} - {exp.durationTo || "Present"}</div>
                                    {exp.keyResponsibilities && (
                                      <div className="sm:col-span-2"><span className="font-medium">Responsibilities:</span> {exp.keyResponsibilities}</div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Skills */}
                        {candidateData.skills && candidateData.skills.length > 0 && (
                          <div>
                            <Label className="text-base font-semibold mb-3 block">Skills</Label>
                            <div className="flex flex-wrap gap-2">
                              {candidateData.skills.map((skill: string, idx: number) => (
                                <Badge key={idx} variant="secondary">{skill}</Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Total Experience */}
                        {candidateData.totalYearsOfExperience && (
                          <div>
                            <Label className="text-base font-semibold mb-2 block">Total Years of Experience</Label>
                            <p className="text-sm">{candidateData.totalYearsOfExperience} years</p>
                          </div>
                        )}

                        {/* Referral Information */}
                        {candidateData.source === 'REFERRAL' && (candidateData.referrerId || candidateData.referralMetadata) && (
                          <div>
                            <Label className="text-base font-semibold mb-3 block">Referral Information</Label>
                            <div className="p-3 border rounded-lg space-y-2 text-sm">
                              {candidateData.referrerId && typeof candidateData.referrerId === 'object' && (
                                <div>
                                  <span className="font-medium">Referred by:</span> {candidateData.referrerId.name} ({candidateData.referrerId.email})
                                </div>
                              )}
                              {candidateData.referralMetadata && (
                                <>
                                  {candidateData.referralMetadata.relationship && (
                                    <div><span className="font-medium">Relationship:</span> {candidateData.referralMetadata.relationship}</div>
                                  )}
                                  {candidateData.referralMetadata.knownPeriod && (
                                    <div><span className="font-medium">Known Period:</span> {candidateData.referralMetadata.knownPeriod}</div>
                                  )}
                                  {candidateData.referralMetadata.notes && (
                                    <div><span className="font-medium">Notes:</span> {candidateData.referralMetadata.notes}</div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ... other tabs ... */}
                {/* OTHER TABS */}
                <TabsContent value="attendance" className="mt-4">
                  <div className="w-full">
                    {id ? (
                    <EmployeeAttendance employeeId={id} />
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-base font-medium mb-2">Staff ID Required</p>
                        <p className="text-sm">Unable to load attendance. Please ensure a valid staff ID is provided.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="salary" className="mt-4 space-y-6">
                  <div className="w-full">
                    <SalaryOverview employeeId={id} />
                  </div>
                </TabsContent>

                <TabsContent value="salaryStructure" className="mt-4 space-y-6">
                  <SalaryStructureForm 
                    staffId={id || ''} 
                    staff={employeeData}
                    onSave={() => refetch()}
                  />
                </TabsContent>

                <TabsContent value="leaves" className="mt-4">
                  <div className="w-full">
                    <LeavesPendingApproval employeeId={id} />
                  </div>
                </TabsContent>

                <TabsContent value="loans" className="mt-4">
                  <div className="w-full">
                    <Loans employeeId={id} />
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="mt-4">
                  <div className="w-full space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Onboarding Documents</CardTitle>
                        {onboarding && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Progress: {onboarding.progress}% • Status: {onboarding.status.replace('_', ' ')}
                          </p>
                        )}
                      </CardHeader>
                      <CardContent>
                        {isLoadingOnboarding ? (
                          <div className="text-center py-12">
                            <Skeleton className="h-8 w-full mb-4" />
                            <Skeleton className="h-8 w-full mb-4" />
                            <Skeleton className="h-8 w-full" />
                          </div>
                        ) : !onboarding || !onboarding.documents || onboarding.documents.length === 0 ? (
                          <div className="text-center py-12">
                            <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-lg font-medium text-muted-foreground mb-2">No documents available</p>
                            <p className="text-sm text-muted-foreground">No onboarding documents have been uploaded yet.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {onboarding.documents.map((doc) => {
                              const getStatusBadge = () => {
                                switch (doc.status) {
                                  case 'COMPLETED':
                                    return (
                                      <Badge className="bg-[#efaa1f]">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Approved
                                      </Badge>
                                    );
                                  case 'REJECTED':
                                    return (
                                      <Badge className="bg-red-500">
                                        <XCircle className="w-3 h-3 mr-1" />
                                        Rejected
                                      </Badge>
                                    );
                                  case 'PENDING':
                                    return (
                                      <Badge className="bg-yellow-500">
                                        <Clock className="w-3 h-3 mr-1" />
                                        Under Review
                                      </Badge>
                                    );
                                  default:
                                    return (
                                      <Badge variant="outline">
                                        <AlertCircle className="w-3 h-3 mr-1" />
                                        Not Started
                                      </Badge>
                                    );
                                }
                              };

                              return (
                                <div key={doc._id} className="border rounded-lg p-4">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-4 h-4 text-muted-foreground" />
                                        <h4 className="font-medium">{doc.name}</h4>
                                        {doc.required && (
                                          <Badge variant="destructive" className="text-xs">Required</Badge>
                                        )}
                                        {getStatusBadge()}
                                      </div>
                                      <p className="text-sm text-muted-foreground mb-2">Type: {doc.type}</p>
                                      {doc.uploadedAt && (
                                        <p className="text-xs text-muted-foreground">
                                          Uploaded: {new Date(doc.uploadedAt).toLocaleDateString()}
                                        </p>
                                      )}
                                      {doc.notes && (
                                        <p className="text-sm text-muted-foreground mt-2">
                                          <span className="font-medium">Notes:</span> {doc.notes}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {doc.url ? (
                                        <>
                                          <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(doc.url, '_blank')}
                                          >
                                            <Eye className="w-4 h-4 mr-1" />
                                            View
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={async () => {
                                              try {
                                                const response = await fetch(doc.url!);
                                                const blob = await response.blob();
                                                const url = window.URL.createObjectURL(blob);
                                                const link = document.createElement('a');
                                                link.href = url;
                                                link.download = doc.name;
                                                document.body.appendChild(link);
                                                link.click();
                                                document.body.removeChild(link);
                                                window.URL.revokeObjectURL(url);
                                              } catch (error) {
                                                console.error("Failed to download document:", error);
                                                // Fallback to opening in new tab if download fails
                                                window.open(doc.url!, '_blank');
                                              }
                                            }}
                                          >
                                            <Download className="w-4 h-4" />
                                          </Button>
                                          {canVerifyDocuments && doc.status === 'PENDING' && (
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                setSelectedDocument(doc);
                                                setVerifyStatus("COMPLETED");
                                                setVerifyNotes("");
                                                setIsVerifyDialogOpen(true);
                                              }}
                                            >
                                              Review
                                            </Button>
                                          )}
                                          {canVerifyDocuments && (
                                            <label className="cursor-pointer">
                                              <input
                                                type="file"
                                                className="hidden"
                                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                onChange={async (e) => {
                                                  const file = e.target.files?.[0];
                                                  if (file && onboarding?._id) {
                                                    setUploadingDocId(doc._id);
                                                    try {
                                                      await uploadDocument({
                                                        onboardingId: onboarding._id,
                                                        documentId: doc._id,
                                                        file,
                                                      }).unwrap();
                                                      message.success("Document uploaded successfully");
                                                      refetchOnboarding();
                                                    } catch (error: any) {
                                                      message.error(
                                                        error?.data?.error?.message ||
                                                          "Failed to upload document"
                                                      );
                                                    } finally {
                                                      setUploadingDocId(null);
                                                      e.target.value = "";
                                                    }
                                                  }
                                                }}
                                                disabled={isUploadingDocument || uploadingDocId === doc._id}
                                              />
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                asChild
                                                disabled={isUploadingDocument || uploadingDocId === doc._id}
                                              >
                                                <span>
                                                  <Upload className="w-3 h-3 mr-1" />
                                                  {uploadingDocId === doc._id
                                                    ? "Uploading..."
                                                    : "Replace"}
                                                </span>
                                              </Button>
                                            </label>
                                          )}
                                        </>
                                      ) : (
                                        canVerifyDocuments ? (
                                          <label className="cursor-pointer">
                                            <input
                                              type="file"
                                              className="hidden"
                                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                              onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file && onboarding?._id) {
                                                  setUploadingDocId(doc._id);
                                                  try {
                                                    await uploadDocument({
                                                      onboardingId: onboarding._id,
                                                      documentId: doc._id,
                                                      file,
                                                    }).unwrap();
                                                    message.success("Document uploaded successfully");
                                                    refetchOnboarding();
                                                  } catch (error: any) {
                                                    message.error(
                                                      error?.data?.error?.message ||
                                                        "Failed to upload document"
                                                    );
                                                  } finally {
                                                    setUploadingDocId(null);
                                                    e.target.value = "";
                                                  }
                                                }
                                              }}
                                              disabled={isUploadingDocument || uploadingDocId === doc._id}
                                            />
                                            <Button
                                              size="sm"
                                              variant="default"
                                              asChild
                                              disabled={isUploadingDocument || uploadingDocId === doc._id}
                                            >
                                              <span>
                                                <Upload className="w-3 h-3 mr-1" />
                                                {uploadingDocId === doc._id
                                                  ? "Uploading..."
                                                  : "Upload"}
                                              </span>
                                            </Button>
                                          </label>
                                        ) : (
                                          <span className="text-sm text-muted-foreground">Not uploaded</span>
                                        )
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="claim" className="mt-4">
                  <div className="w-full">
                    <ExpenseClaim employeeId={id} />
                  </div>
                </TabsContent>

                <TabsContent value="payslips" className="mt-4">
                  <div className="w-full">
                    <PayslipRequests employeeId={id} />
                  </div>
                </TabsContent>
            </div>
          </Tabs>

          {/* Document Verification Dialog */}
          <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Review Document</DialogTitle>
                <DialogDescription>
                  Review and verify the document for {employeeData?.name} ({employeeData?.employeeId})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Document Name</Label>
                  <p className="text-sm font-medium">{selectedDocument?.name}</p>
                </div>
                {selectedDocument?.url && (
                  <div>
                    <Label>Document Preview</Label>
                    <div className="mt-2">
                      <Button
                        variant="outline"
                        onClick={() => window.open(selectedDocument.url, "_blank")}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Document
                      </Button>
                    </div>
                  </div>
                )}
                <div>
                  <Label>Verification Status *</Label>
                  <Select
                    value={verifyStatus}
                    onValueChange={(value: "COMPLETED" | "REJECTED") =>
                      setVerifyStatus(value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMPLETED">Approve (Verified)</SelectItem>
                      <SelectItem value="REJECTED">Reject</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add any notes or comments about this document..."
                    value={verifyNotes}
                    onChange={(e) => setVerifyNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsVerifyDialogOpen(false);
                      setSelectedDocument(null);
                      setVerifyNotes("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!selectedDocument || !onboarding?._id) return;
                      try {
                        await verifyDocument({
                          onboardingId: onboarding._id,
                          documentId: selectedDocument._id,
                          status: verifyStatus,
                          notes: verifyNotes || undefined,
                        }).unwrap();
                        message.success(
                          `Document ${verifyStatus === "COMPLETED" ? "approved" : "rejected"} successfully`
                        );
                        setIsVerifyDialogOpen(false);
                        setSelectedDocument(null);
                        setVerifyNotes("");
                        refetchOnboarding();
                      } catch (error: any) {
                        const errorMessage = formatErrorMessage(error);
                        message.error(errorMessage);
                      }
                    }}
                    disabled={isVerifying}
                  >
                    {isVerifying
                      ? "Processing..."
                      : verifyStatus === "COMPLETED"
                      ? "Approve Document"
                      : "Reject Document"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

        </div>
      </main>
    </MainLayout>
  );
};

export default StaffProfile;


const Field = ({ label, value, className = "" }) => (
  <div className={`${className} space-y-2`}>
    <Label>{label}</Label>
    <Input value={value} readOnly />
  </div>
);
