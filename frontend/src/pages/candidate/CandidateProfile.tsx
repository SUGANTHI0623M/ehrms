import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MainLayout from "@/components/MainLayout";
import {
  useGetCandidateProfileQuery,
  useUpdateCandidateProfileMutation,
  useChangePasswordMutation,
  useUploadProfilePictureMutation,
  useUploadResumeMutation,
} from "@/store/api/candidateDashboardApi";
import { useGetOfferByCandidateIdQuery, useAcceptOfferMutation, useRejectOfferMutation } from "@/store/api/offerApi";
import {
  useGetOnboardingByCurrentUserQuery,
  useGetAllOnboardingByCurrentUserQuery,
  useUploadOnboardingDocumentMutation,
  useBatchUploadOnboardingDocumentsMutation,
  DOCUMENT_STATUS,
  ONBOARDING_STATUS,
} from "@/store/api/onboardingApi";
import {
  User,
  Save,
  X,
  Camera,
  Lock,
  GraduationCap,
  FileText,
  MapPin,
  Calendar,
  Mail,
  Phone,
  Eye,
  EyeOff,
  Upload,
  CheckCircle2,
  Clock,
  FileCheck,
  FileCheck as OfferIcon,
  CheckCircle,
  XCircle,
  DollarSign,
  Briefcase,
} from "lucide-react";
import { message } from "antd";
import { toast } from "sonner";
import { format } from "date-fns";
import { getCountryOptions, phoneUtils } from "@/utils/countryCodeUtils";

const CandidateProfile = () => {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useGetCandidateProfileQuery();
  const [updateProfile, { isLoading: isUpdating }] = useUpdateCandidateProfileMutation();
  const [changePassword, { isLoading: isChangingPassword }] = useChangePasswordMutation();
  const [uploadProfilePicture, { isLoading: isUploadingPicture }] = useUploadProfilePictureMutation();
  const [uploadResume, { isLoading: isUploadingResume }] = useUploadResumeMutation();
  const {
    data: onboardingData,
    isLoading: onboardingLoading,
    refetch: refetchOnboarding
  } = useGetOnboardingByCurrentUserQuery();
  const {
    data: allOnboardingData,
    isLoading: allOnboardingLoading,
    refetch: refetchAllOnboarding
  } = useGetAllOnboardingByCurrentUserQuery();
  const [uploadDocument, { isLoading: isUploading }] = useUploadOnboardingDocumentMutation();
  const [batchUploadDocuments, { isLoading: isBatchUploading }] = useBatchUploadOnboardingDocumentsMutation();
  const [isOnboardingDetailsOpen, setIsOnboardingDetailsOpen] = useState(false);
  const [selectedOnboardingId, setSelectedOnboardingId] = useState<string | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [pendingUploads, setPendingUploads] = useState<Record<string, File>>({}); // documentId -> File
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  
  const profileData = data?.data?.candidateData;
  const profile = data?.data?.profile;
  const onboarding = onboardingData?.data?.onboarding;
  const allOnboardings = allOnboardingData?.data?.onboardings || [];
  
  // Get selected onboarding for details dialog
  const selectedOnboarding = selectedOnboardingId 
    ? (allOnboardings.find(o => o._id === selectedOnboardingId) || onboarding)
    : (allOnboardings.length > 0 ? allOnboardings[0] : onboarding);
  
  // Fetch offer for this candidate
  const candidateId = profileData?._id;
  const { data: offerData, refetch: refetchOffer } = useGetOfferByCandidateIdQuery(candidateId || "", {
    skip: !candidateId,
  });
  const offer = offerData?.data?.offer;
  
  // Offer actions
  const [acceptOffer, { isLoading: isAccepting }] = useAcceptOfferMutation();
  const [rejectOffer, { isLoading: isRejecting }] = useRejectOfferMutation();
  
  const handleAcceptOffer = async () => {
    if (!offer?._id) return;
    try {
      await acceptOffer(offer._id).unwrap();
      toast.success('Offer accepted successfully!');
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
      refetchOffer();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || 'Failed to reject offer');
    }
  };

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const countryOptions = getCountryOptions();
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("91");
  const [formData, setFormData] = useState({
    name: "",
    firstName: "",
    lastName: "",
    phone: "",
    countryCode: "91",
    dateOfBirth: "",
    gender: "",
    currentCity: "",
    preferredJobLocation: "",
    location: "", // Full address
  });
  
  // Education editing state
  const [isEditingEducation, setIsEditingEducation] = useState(false);
  const [educationData, setEducationData] = useState<Array<{
    qualification: string;
    courseName: string;
    institution: string;
    university?: string;
    yearOfPassing: string;
    percentage?: string;
    cgpa?: string;
  }>>([]);
  
  // Experience editing state
  const [isEditingExperience, setIsEditingExperience] = useState(false);
  const [experienceData, setExperienceData] = useState<Array<{
    designation: string;
    role?: string;
    company: string;
    durationFrom: string;
    durationTo?: string;
    reasonForLeaving?: string;
    keyResponsibilities?: string;
  }>>([]);

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Profile picture state
  const [profilePicturePreview, setProfilePicturePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Resume upload state
  const resumeInputRef = useRef<HTMLInputElement>(null);
  const [selectedResumeFile, setSelectedResumeFile] = useState<File | null>(null);
  const [resumePreview, setResumePreview] = useState<{ name: string; size: number } | null>(null);

  // Initialize form data
  useEffect(() => {
    if (profile && profileData && !isEditingProfile) {
      const countryCode = profile.countryCode || profileData.countryCode || "91";
      setSelectedCountryCode(countryCode);
      setFormData({
        name: profile.name || "",
        firstName: profileData.firstName || "",
        lastName: profileData.lastName || "",
        phone: profile.phone || profileData.phone || "",
        countryCode: countryCode,
        dateOfBirth: profileData.dateOfBirth
          ? new Date(profileData.dateOfBirth).toISOString().split("T")[0]
          : "",
        gender: profileData.gender || "",
        currentCity: profileData.currentCity || "",
        preferredJobLocation: profileData.preferredJobLocation || "",
        location: profileData.location || "",
      });
      
      // Initialize education and experience data
      if (profileData.education) {
        setEducationData(profileData.education.map((edu: any) => ({
          qualification: edu.qualification || "",
          courseName: edu.courseName || "",
          institution: edu.institution || "",
          university: edu.university || "",
          yearOfPassing: edu.yearOfPassing || "",
          percentage: edu.percentage || "",
          cgpa: edu.cgpa || "",
        })));
      } else {
        setEducationData([]);
      }
      
      if (profileData.experience) {
        setExperienceData(profileData.experience.map((exp: any) => ({
          designation: exp.designation || exp.role || "",
          role: exp.role || "",
          company: exp.company || "",
          durationFrom: exp.durationFrom ? new Date(exp.durationFrom).toISOString().split("T")[0] : "",
          durationTo: exp.durationTo ? new Date(exp.durationTo).toISOString().split("T")[0] : "",
          reasonForLeaving: exp.reasonForLeaving || "",
          keyResponsibilities: exp.keyResponsibilities || "",
        })));
      } else {
        setExperienceData([]);
      }
      if (profile.profilePicture) {
        const baseUrl = import.meta.env.VITE_API_URL
          ? import.meta.env.VITE_API_URL.replace('/api', '')
          : "http://localhost:5005";
        setProfilePicturePreview(
          profile.profilePicture.startsWith("http")
            ? profile.profilePicture
            : `${baseUrl}${profile.profilePicture}`
        );
      }
    }
  }, [profile, profileData, isEditingProfile]);

  const handleProfileSubmit = async () => {
    try {
      await updateProfile({
        name: formData.name,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        countryCode: selectedCountryCode,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        currentCity: formData.currentCity || undefined,
        preferredJobLocation: formData.preferredJobLocation || undefined,
        location: formData.location || undefined,
        education: educationData.length > 0 ? educationData : undefined,
        experience: experienceData.length > 0 ? experienceData : undefined,
      }).unwrap();

      toast.success("Profile updated successfully");
      setIsEditingProfile(false);
      setIsEditingEducation(false);
      setIsEditingExperience(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to update profile");
    }
  };

  const handlePasswordSubmit = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New password and confirm password do not match");
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    try {
      await changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
      }).unwrap();

      toast.success("Password changed successfully");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordSection(false);
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to change password");
    }
  };

  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePicturePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file using Cloudinary helper (backend handles Cloudinary upload)
    const formData = new FormData();
    formData.append("profilePicture", file);

    try {
      const result = await uploadProfilePicture(formData).unwrap();
      toast.success("Profile picture uploaded successfully");
      // Update preview with Cloudinary URL if returned
      if (result.data?.profilePicture) {
        setProfilePicturePreview(result.data.profilePicture);
      }
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to upload profile picture");
      setProfilePicturePreview(null);
    }
  };

  const getInitials = () => {
    if (profile?.name) {
      const names = profile.name.split(" ");
      return names
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (profileData) {
      return `${profileData.firstName?.[0] || ""}${profileData.lastName?.[0] || ""}`.toUpperCase();
    }
    return "U";
  };

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: "", color: "" };
    if (password.length < 8) return { strength: 1, label: "Weak", color: "text-red-500" };
    if (password.length < 12) return { strength: 2, label: "Medium", color: "text-yellow-500" };
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) {
      return { strength: 4, label: "Very Strong", color: "text-green-500" };
    }
    if (/[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password)) {
      return { strength: 3, label: "Strong", color: "text-green-500" };
    }
    return { strength: 2, label: "Medium", color: "text-yellow-500" };
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading profile...</p>
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
            Error loading profile
          </div>
        </div>
      </MainLayout>
    );
  }

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  return (
    <MainLayout>
      <div className="p-4 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Profile</h1>
            <p className="text-muted-foreground mt-1">
              Manage your candidate profile and information
            </p>
          </div>
        </div>

        {/* Profile Picture Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Profile Picture
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profilePicturePreview || undefined} />
                  <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPicture}
                >
                  <Camera className="w-4 h-4" />
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png"
                  className="hidden"
                  onChange={handleProfilePictureChange}
                />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Upload a profile picture (JPG or PNG, max 2MB)
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click the camera icon to change your profile picture
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              {!isEditingProfile && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingProfile(true)}
                >
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditingProfile}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input value={profile?.email || ""} disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>
              <div>
                <Label>Country Code</Label>
                <Select
                  value={selectedCountryCode}
                  onValueChange={(value) => {
                    setSelectedCountryCode(value);
                    setFormData({ ...formData, countryCode: value });
                  }}
                  disabled={!isEditingProfile}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select country code" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {countryOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phone Number</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");
                    setFormData({ ...formData, phone: value });
                  }}
                  disabled={!isEditingProfile}
                  placeholder="Enter mobile number"
                />
                {selectedCountryCode && formData.phone && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Full number: +{selectedCountryCode} {formData.phone}
                  </p>
                )}
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  disabled={!isEditingProfile}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  disabled={!isEditingProfile}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                    <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Current City</Label>
                <Input
                  value={formData.currentCity}
                  onChange={(e) => setFormData({ ...formData, currentCity: e.target.value })}
                  disabled={!isEditingProfile}
                  placeholder="Enter your current city"
                />
              </div>
              <div>
                <Label>Preferred Job Location</Label>
                <Input
                  value={formData.preferredJobLocation}
                  onChange={(e) =>
                    setFormData({ ...formData, preferredJobLocation: e.target.value })
                  }
                  disabled={!isEditingProfile}
                  placeholder="Enter preferred job location"
                />
              </div>
              <div className="col-span-2">
                <Label>Full Address</Label>
                <Input
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({ ...formData, location: e.target.value })
                  }
                  disabled={!isEditingProfile}
                  placeholder="Enter your complete address (Street, City, State, PIN Code)"
                />
              </div>
            </div>

            {isEditingProfile && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditingProfile(false);
                    // Reset form data
                    if (profile && profileData) {
                      setFormData({
                        name: profile.name || "",
                        firstName: profileData.firstName || "",
                        lastName: profileData.lastName || "",
                        phone: profile.phone || profileData.phone || "",
                        dateOfBirth: profileData.dateOfBirth
                          ? new Date(profileData.dateOfBirth).toISOString().split("T")[0]
                          : "",
                        gender: profileData.gender || "",
                        currentCity: profileData.currentCity || "",
                        preferredJobLocation: profileData.preferredJobLocation || "",
                        countryCode: profileData.countryCode || "",
                        location: profileData.location || "",
                      });
                      // Reset education and experience
                      if (profileData.education) {
                        setEducationData(profileData.education.map((edu: any) => ({
                          qualification: edu.qualification || "",
                          courseName: edu.courseName || "",
                          institution: edu.institution || "",
                          university: edu.university || "",
                          yearOfPassing: edu.yearOfPassing || "",
                          percentage: edu.percentage || "",
                          cgpa: edu.cgpa || "",
                        })));
                      } else {
                        setEducationData([]);
                      }
                      if (profileData.experience) {
                        setExperienceData(profileData.experience.map((exp: any) => ({
                          designation: exp.designation || exp.role || "",
                          role: exp.role || "",
                          company: exp.company || "",
                          durationFrom: exp.durationFrom ? new Date(exp.durationFrom).toISOString().split("T")[0] : "",
                          durationTo: exp.durationTo ? new Date(exp.durationTo).toISOString().split("T")[0] : "",
                          reasonForLeaving: exp.reasonForLeaving || "",
                          keyResponsibilities: exp.keyResponsibilities || "",
                        })));
                      } else {
                        setExperienceData([]);
                      }
                      setIsEditingEducation(false);
                      setIsEditingExperience(false);
                    }
                  }}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={handleProfileSubmit} disabled={isUpdating}>
                  <Save className="w-4 h-4 mr-2" />
                  {isUpdating ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Change Password
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPasswordSection(!showPasswordSection)}
              >
                {showPasswordSection ? "Cancel" : "Change Password"}
              </Button>
            </div>
          </CardHeader>
          {showPasswordSection && (
            <CardContent className="space-y-4">
              <div>
                <Label>Current Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.current ? "text" : "password"}
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    placeholder="Enter current password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, current: !showPasswords.current })
                    }
                  >
                    {showPasswords.current ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div>
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.new ? "text" : "password"}
                    value={passwordData.newPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, new: !showPasswords.new })
                    }
                  >
                    {showPasswords.new ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {passwordData.newPassword && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${passwordStrength.strength === 1
                            ? "bg-red-500 w-1/4"
                            : passwordStrength.strength === 2
                              ? "bg-yellow-500 w-2/4"
                              : passwordStrength.strength === 3
                                ? "bg-green-500 w-3/4"
                                : passwordStrength.strength === 4
                                  ? "bg-green-600 w-full"
                                  : ""
                            }`}
                        />
                      </div>
                      <span className={`text-xs ${passwordStrength.color}`}>
                        {passwordStrength.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Password must be at least 8 characters long
                    </p>
                  </div>
                )}
              </div>
              <div>
                <Label>Confirm New Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords.confirm ? "text" : "password"}
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    placeholder="Confirm new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() =>
                      setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })
                    }
                  >
                    {showPasswords.confirm ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                {passwordData.confirmPassword &&
                  passwordData.newPassword !== passwordData.confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordSection(false);
                    setPasswordData({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePasswordSubmit}
                  disabled={
                    isChangingPassword ||
                    !passwordData.currentPassword ||
                    !passwordData.newPassword ||
                    !passwordData.confirmPassword ||
                    passwordData.newPassword !== passwordData.confirmPassword ||
                    passwordData.newPassword.length < 8
                  }
                >
                  {isChangingPassword ? "Changing..." : "Change Password"}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Education & Experience */}
        {profileData && (
          <>
            {/* Education */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5" />
                    Education
                  </CardTitle>
                  {isEditingProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingEducation(!isEditingEducation)}
                    >
                      {isEditingEducation ? "Done" : "Edit"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingEducation ? (
                  <div className="space-y-4">
                    {educationData.map((edu, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Qualification *</Label>
                            <Input
                              value={edu.qualification}
                              onChange={(e) => {
                                const newEducation = [...educationData];
                                newEducation[index].qualification = e.target.value;
                                setEducationData(newEducation);
                              }}
                              placeholder="e.g., Bachelor's, Master's"
                            />
                          </div>
                          <div>
                            <Label>Course Name *</Label>
                            <Input
                              value={edu.courseName}
                              onChange={(e) => {
                                const newEducation = [...educationData];
                                newEducation[index].courseName = e.target.value;
                                setEducationData(newEducation);
                              }}
                              placeholder="e.g., Computer Science"
                            />
                          </div>
                          <div>
                            <Label>Institution *</Label>
                            <Input
                              value={edu.institution}
                              onChange={(e) => {
                                const newEducation = [...educationData];
                                newEducation[index].institution = e.target.value;
                                setEducationData(newEducation);
                              }}
                              placeholder="Institution name"
                            />
                          </div>
                          <div>
                            <Label>University</Label>
                            <Input
                              value={edu.university || ""}
                              onChange={(e) => {
                                const newEducation = [...educationData];
                                newEducation[index].university = e.target.value;
                                setEducationData(newEducation);
                              }}
                              placeholder="University name (optional)"
                            />
                          </div>
                          <div>
                            <Label>Year of Passing *</Label>
                            <Input
                              type="number"
                              value={edu.yearOfPassing}
                              onChange={(e) => {
                                const newEducation = [...educationData];
                                newEducation[index].yearOfPassing = e.target.value;
                                setEducationData(newEducation);
                              }}
                              placeholder="e.g., 2020"
                            />
                          </div>
                          <div>
                            <Label>Percentage or CGPA</Label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                value={edu.percentage || ""}
                                onChange={(e) => {
                                  const newEducation = [...educationData];
                                  newEducation[index].percentage = e.target.value;
                                  newEducation[index].cgpa = "";
                                  setEducationData(newEducation);
                                }}
                                placeholder="Percentage"
                                className="flex-1"
                              />
                              <span className="self-center text-xs">OR</span>
                              <Input
                                type="number"
                                step="0.01"
                                value={edu.cgpa || ""}
                                onChange={(e) => {
                                  const newEducation = [...educationData];
                                  newEducation[index].cgpa = e.target.value;
                                  newEducation[index].percentage = "";
                                  setEducationData(newEducation);
                                }}
                                placeholder="CGPA"
                                className="flex-1"
                              />
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setEducationData(educationData.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEducationData([
                          ...educationData,
                          {
                            qualification: "",
                            courseName: "",
                            institution: "",
                            university: "",
                            yearOfPassing: "",
                            percentage: "",
                            cgpa: "",
                          },
                        ]);
                      }}
                    >
                      <GraduationCap className="w-4 h-4 mr-2" />
                      Add Education
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {educationData.length > 0 ? (
                      educationData.map((edu, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{edu.qualification}</h4>
                              <p className="text-sm text-muted-foreground">{edu.courseName}</p>
                              <p className="text-sm text-muted-foreground">{edu.institution}</p>
                              {edu.university && (
                                <p className="text-sm text-muted-foreground">{edu.university}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>{edu.yearOfPassing}</span>
                                {(edu.percentage || edu.cgpa) && (
                                  <span>
                                    {edu.percentage ? `Percentage: ${edu.percentage}%` : `CGPA: ${edu.cgpa}`}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No education details added yet.</p>
                        {isEditingProfile && (
                          <p className="text-xs mt-1">Click "Edit" to add your education details.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Work Experience */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Work Experience
                  </CardTitle>
                  {isEditingProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingExperience(!isEditingExperience)}
                    >
                      {isEditingExperience ? "Done" : "Edit"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isEditingExperience ? (
                  <div className="space-y-4">
                    {experienceData.map((exp, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Designation *</Label>
                            <Input
                              value={exp.designation}
                              onChange={(e) => {
                                const newExperience = [...experienceData];
                                newExperience[index].designation = e.target.value;
                                setExperienceData(newExperience);
                              }}
                              placeholder="e.g., Software Engineer"
                            />
                          </div>
                          <div>
                            <Label>Company *</Label>
                            <Input
                              value={exp.company}
                              onChange={(e) => {
                                const newExperience = [...experienceData];
                                newExperience[index].company = e.target.value;
                                setExperienceData(newExperience);
                              }}
                              placeholder="Company name"
                            />
                          </div>
                          <div>
                            <Label>Start Date *</Label>
                            <Input
                              type="date"
                              value={exp.durationFrom}
                              onChange={(e) => {
                                const newExperience = [...experienceData];
                                newExperience[index].durationFrom = e.target.value;
                                setExperienceData(newExperience);
                              }}
                            />
                          </div>
                          <div>
                            <Label>End Date (leave empty if current)</Label>
                            <Input
                              type="date"
                              value={exp.durationTo || ""}
                              onChange={(e) => {
                                const newExperience = [...experienceData];
                                newExperience[index].durationTo = e.target.value || undefined;
                                setExperienceData(newExperience);
                              }}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Key Responsibilities</Label>
                            <Textarea
                              value={exp.keyResponsibilities || ""}
                              onChange={(e) => {
                                const newExperience = [...experienceData];
                                newExperience[index].keyResponsibilities = e.target.value;
                                setExperienceData(newExperience);
                              }}
                              placeholder="Describe your key responsibilities"
                              rows={3}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Reason for Leaving</Label>
                            <Input
                              value={exp.reasonForLeaving || ""}
                              onChange={(e) => {
                                const newExperience = [...experienceData];
                                newExperience[index].reasonForLeaving = e.target.value;
                                setExperienceData(newExperience);
                              }}
                              placeholder="Reason for leaving (optional)"
                            />
                          </div>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            setExperienceData(experienceData.filter((_, i) => i !== index));
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      onClick={() => {
                        setExperienceData([
                          ...experienceData,
                          {
                            designation: "",
                            company: "",
                            durationFrom: "",
                            durationTo: undefined,
                            reasonForLeaving: "",
                            keyResponsibilities: "",
                          },
                        ]);
                      }}
                    >
                      <Briefcase className="w-4 h-4 mr-2" />
                      Add Experience
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {experienceData.length > 0 ? (
                      experienceData.map((exp, index) => (
                        <div
                          key={index}
                          className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold">{exp.designation}</h4>
                              <p className="text-sm text-muted-foreground">{exp.company}</p>
                              {exp.role && exp.role !== exp.designation && (
                                <p className="text-sm text-muted-foreground">Role: {exp.role}</p>
                              )}
                              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                <span>
                                  {exp.durationFrom ? new Date(exp.durationFrom).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ""}
                                </span>
                                {exp.durationTo ? (
                                  <span>to {new Date(exp.durationTo).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                ) : (
                                  <span>to Present</span>
                                )}
                              </div>
                              {exp.keyResponsibilities && (
                                <div className="mt-2">
                                  <p className="text-xs font-medium text-muted-foreground">Key Responsibilities:</p>
                                  <p className="text-xs text-muted-foreground">{exp.keyResponsibilities}</p>
                                </div>
                              )}
                              {exp.reasonForLeaving && (
                                <p className="text-xs text-muted-foreground mt-2">
                                  Reason for leaving: {exp.reasonForLeaving}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No work experience added yet.</p>
                        {isEditingProfile && (
                          <p className="text-xs mt-1">Click "Edit" to add your work experience.</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Skills */}
            {profileData.skills && profileData.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Skills
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profileData.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Resume */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Resume
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current Resume Display */}
                {profileData.resume && (
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{profileData.resume.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Uploaded on{" "}
                          {new Date(profileData.resume.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => window.open(profileData.resume?.url, "_blank")}
                    >
                      View Resume
                    </Button>
                  </div>
                )}

                {/* Resume Upload Section */}
                <div className="space-y-3">
                  <div>
                    <Label>Upload New Resume</Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Accepted formats: PDF, DOC, DOCX (Max 10MB)
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        ref={resumeInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Validate file type
                            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
                            if (!allowedTypes.includes(file.type)) {
                              toast.error("Invalid file type. Only PDF, DOC, and DOCX files are allowed");
                              return;
                            }
                            // Validate file size (10MB)
                            const maxSize = 10 * 1024 * 1024;
                            if (file.size > maxSize) {
                              toast.error("File size exceeds 10MB limit");
                              return;
                            }
                            setSelectedResumeFile(file);
                            setResumePreview({
                              name: file.name,
                              size: file.size
                            });
                          }
                        }}
                      />
                      <Button
                        variant="outline"
                        onClick={() => resumeInputRef.current?.click()}
                        disabled={isUploadingResume}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {selectedResumeFile ? "Change File" : "Select Resume"}
                      </Button>
                      {selectedResumeFile && (
                        <div className="flex-1">
                          <p className="text-sm font-medium">{resumePreview?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {((resumePreview?.size || 0) / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Button - Only shown when file is selected */}
                  {selectedResumeFile && (
                    <div className="flex justify-end gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedResumeFile(null);
                          setResumePreview(null);
                          if (resumeInputRef.current) {
                            resumeInputRef.current.value = '';
                          }
                        }}
                        disabled={isUploadingResume}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!selectedResumeFile) return;
                          
                          const formData = new FormData();
                          formData.append('resume', selectedResumeFile);
                          
                          try {
                            const result = await uploadResume(formData).unwrap();
                            toast.success(result.message || "Resume uploaded successfully");
                            setSelectedResumeFile(null);
                            setResumePreview(null);
                            if (resumeInputRef.current) {
                              resumeInputRef.current.value = '';
                            }
                            refetch();
                          } catch (error: any) {
                            toast.error(error?.data?.error?.message || "Failed to upload resume");
                          }
                        }}
                        disabled={isUploadingResume}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {isUploadingResume ? "Uploading..." : "Upload Resume"}
                      </Button>
                    </div>
                  )}

                  {!profileData.resume && !selectedResumeFile && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No resume uploaded yet. Please upload your resume.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Offer Status */}
        {offer && (
          <Card className="border-2 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <OfferIcon className="w-5 h-5 text-primary" />
                Job Offer Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          offer.status === 'ACCEPTED' ? 'default' :
                          offer.status === 'REJECTED' ? 'destructive' :
                          offer.status === 'SENT' ? 'secondary' : 'outline'
                        }
                      >
                        {offer.status === 'ACCEPTED' && <CheckCircle className="w-3 h-3 mr-1" />}
                        {offer.status === 'REJECTED' && <XCircle className="w-3 h-3 mr-1" />}
                        {offer.status}
                      </Badge>
                    </div>
                    {offer.salary && (
                      <p className="text-sm text-muted-foreground">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        {offer.salary.currency || ''} {typeof offer.salary.amount === 'number' ? offer.salary.amount.toLocaleString() : offer.salary.amount || ''}{" "}
                        {offer.salary.frequency || ''}
                      </p>
                    )}
                    {offer.joiningDate && (
                      <p className="text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Joining Date: {format(new Date(offer.joiningDate), "PPP")}
                      </p>
                    )}
                    {offer.expiryDate && offer.status === 'SENT' && (
                      <p className="text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 inline mr-1" />
                        Expires: {format(new Date(offer.expiryDate), "PPP")}
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => navigate(`/candidate/offer/${offer._id}`)}
                    variant="outline"
                  >
                    View Offer Details
                  </Button>
                </div>
                {offer.status === 'SENT' && (
                  <div className="pt-2 border-t space-y-3">
                    <p className="text-sm text-muted-foreground">
                      You have received a job offer. Please review and respond.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => navigate(`/candidate/offer/${offer._id}`)}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        View Full Details
                      </Button>
                      <div className="flex gap-2 flex-1">
                        <Button
                          onClick={handleAcceptOffer}
                          disabled={isAccepting}
                          size="sm"
                          className="flex-1"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {isAccepting ? "Accepting..." : "Accept Offer"}
                        </Button>
                        <Button
                          onClick={() => setShowRejectDialog(true)}
                          variant="destructive"
                          size="sm"
                          disabled={isRejecting}
                          className="flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          {isRejecting ? "Rejecting..." : "Reject Offer"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Onboarding Progress */}
        {/* {onboardingLoading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center text-muted-foreground">Loading onboarding details...</div>
            </CardContent>
          </Card>
        ) : onboarding ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Onboarding Progress
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOnboardingDetailsOpen(true)}
              >
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {onboarding.staffId ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg">
                      {onboarding.staffId.name || 'N/A'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {onboarding.staffId.designation || 'N/A'} - {onboarding.staffId.department || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Employee ID: {onboarding.staffId.employeeId || 'N/A'} | Joining:{" "}
                      {onboarding.staffId.joiningDate ? format(new Date(onboarding.staffId.joiningDate), "yyyy-MM-dd") : 'N/A'}
                    </p>
                  </div>
                  <Badge
                    variant={
                      onboarding.status === ONBOARDING_STATUS.COMPLETED
                        ? "default"
                        : onboarding.status === ONBOARDING_STATUS.IN_PROGRESS
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {onboarding.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Staff information not available</p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Documents:{" "}
                      {onboarding.documents.filter(
                        (doc) => doc.status === DOCUMENT_STATUS.COMPLETED
                      ).length}{" "}
                      / {onboarding.documents.length}
                    </span>
                    <span className="font-medium">{onboarding.progress}%</span>
                  </div>
                  <Progress value={onboarding.progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2">
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-lg font-bold">
                      {onboarding.documents.filter(
                        (doc) => doc.status === DOCUMENT_STATUS.COMPLETED
                      ).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-lg font-bold">
                      {onboarding.documents.filter(
                        (doc) => doc.status === DOCUMENT_STATUS.PENDING
                      ).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-lg font-bold">
                      {onboarding.documents.filter(
                        (doc) => doc.status === DOCUMENT_STATUS.NOT_STARTED
                      ).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Not Started</div>
                  </div>
                  <div className="text-center p-2 bg-muted rounded">
                    <div className="text-lg font-bold">
                      {onboarding.documents.filter(
                        (doc) => doc.status === DOCUMENT_STATUS.REJECTED
                      ).length}
                    </div>
                    <div className="text-xs text-muted-foreground">Rejected</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null} */}

        {/* Onboarding Details Dialog */}
        <Dialog 
          open={isOnboardingDetailsOpen} 
          onOpenChange={(open) => {
            setIsOnboardingDetailsOpen(open);
            if (!open) {
              // Reset pending uploads when dialog closes
              setPendingUploads({});
            }
          }}
        >
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Onboarding Documents</DialogTitle>
              <DialogDescription>
                View and upload required documents for onboarding by job position
              </DialogDescription>
            </DialogHeader>

            {allOnboardings.length > 0 ? (
              <div className="space-y-6 py-4">
                {allOnboardings.map((onboardingItem: any) => {
                  // Safe access to candidateId
                  const candidateIdData = onboardingItem?.candidateId;
                  const jobIdValue = candidateIdData && typeof candidateIdData === 'object' 
                    ? (candidateIdData as any)?.jobId 
                    : null;
                  const jobData = jobIdValue && typeof jobIdValue === 'object' && jobIdValue !== null 
                    ? jobIdValue as any 
                    : null;
                  const jobTitle = jobData?.title || (candidateIdData && typeof candidateIdData === 'object' ? (candidateIdData as any)?.position : null) || 'Unknown Position';
                  const jobDepartment = jobData?.department || onboardingItem.staffId?.department || '-';
                  const jobCode = jobData?.jobCode || null;

                  return (
                    <div key={onboardingItem._id} className="space-y-4 p-4 border rounded-lg">
                      {/* Job Information Header */}
                      <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-center gap-2 mb-2">
                          <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          <p className="font-semibold text-blue-900 dark:text-blue-100">Job Position</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-blue-700 dark:text-blue-300">Job Title</p>
                            <p className="font-medium text-blue-900 dark:text-blue-100">{jobTitle}</p>
                          </div>
                          <div>
                            <p className="text-xs text-blue-700 dark:text-blue-300">Department</p>
                            <p className="font-medium text-blue-900 dark:text-blue-100">{jobDepartment}</p>
                          </div>
                          {jobCode && (
                            <div>
                              <p className="text-xs text-blue-700 dark:text-blue-300">Job Code</p>
                              <p className="font-medium text-blue-900 dark:text-blue-100">{jobCode}</p>
                            </div>
                          )}
                        </div>
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 italic">
                          The documents below are required for this job position.
                        </p>
                      </div>

                      {/* Employee Info */}
                      <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground">Employee ID</p>
                          <p className="font-medium">{onboardingItem.staffId?.employeeId || "Pending"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Department</p>
                          <p className="font-medium">{onboardingItem.staffId?.department || (candidateIdData && typeof candidateIdData === 'object' ? (candidateIdData as any)?.position : null) || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Designation</p>
                          <p className="font-medium">{onboardingItem.staffId?.designation || (candidateIdData && typeof candidateIdData === 'object' ? (candidateIdData as any)?.position : null) || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Joining Date</p>
                          <p className="font-medium">
                            {onboardingItem.staffId?.joiningDate 
                              ? format(new Date(onboardingItem.staffId.joiningDate), "yyyy-MM-dd")
                              : "-"}
                          </p>
                        </div>
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">Overall Progress</p>
                          <span className="font-bold">{onboardingItem.progress}%</span>
                        </div>
                        <Progress value={onboardingItem.progress} className="h-3" />
                      </div>

                      {/* Documents List for this job */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold">Required Documents for {jobTitle}</p>
                            {(() => {
                              const requiredDocs = onboardingItem.documents.filter(doc => doc.required && doc.status !== DOCUMENT_STATUS.COMPLETED);
                              const missingRequired = requiredDocs.filter(doc => !pendingUploads[`${onboardingItem._id}_${doc._id}`] && !doc.url);
                              if (missingRequired.length > 0) {
                                return (
                                  <p className="text-xs text-red-500 mt-1">
                                    {missingRequired.length} required document(s) missing
                                  </p>
                                );
                              }
                              return null;
                            })()}
                          </div>
                          {Object.keys(pendingUploads).filter(key => key.startsWith(`${onboardingItem._id}_`)).length > 0 && (
                            <Button
                              onClick={async () => {
                                if (!onboardingItem) return;

                                // Validate that all required documents are selected
                                const requiredDocuments = onboardingItem.documents.filter(
                                  doc => doc.required && doc.status !== DOCUMENT_STATUS.COMPLETED
                                );
                                const missingRequired = requiredDocuments.filter(
                                  doc => !pendingUploads[`${onboardingItem._id}_${doc._id}`] && !doc.url
                                );
                                
                                if (missingRequired.length > 0) {
                                  const missingNames = missingRequired.map(doc => doc.name).join(', ');
                                  toast.error(
                                    `Please upload all required documents. Missing: ${missingNames}`,
                                    { duration: 5000 }
                                  );
                                  return;
                                }

                                setIsSubmittingAll(true);
                                
                                try {
                                  // Prepare files and document IDs for this specific onboarding
                                  const documentIds = Object.keys(pendingUploads)
                                    .filter(key => key.startsWith(`${onboardingItem._id}_`))
                                    .map(key => key.replace(`${onboardingItem._id}_`, ''));
                                  const files = documentIds.map(id => pendingUploads[`${onboardingItem._id}_${id}`]);

                                  const result = await batchUploadDocuments({
                                    onboardingId: onboardingItem._id,
                                    files,
                                    documentIds,
                                  }).unwrap();

                                  if (result.data.uploaded.length > 0) {
                                    toast.success(
                                      `${result.data.uploaded.length} document(s) uploaded successfully${result.data.errors && result.data.errors.length > 0 ? `. ${result.data.errors.length} failed.` : ''}`
                                    );
                                    // Clear only this onboarding's pending uploads
                                    const newPendingUploads = { ...pendingUploads };
                                    documentIds.forEach(id => {
                                      delete newPendingUploads[`${onboardingItem._id}_${id}`];
                                    });
                                    setPendingUploads(newPendingUploads);
                                    refetchOnboarding();
                                    refetchAllOnboarding();
                                  }

                                  if (result.data.errors && result.data.errors.length > 0) {
                                    result.data.errors.forEach((error: any) => {
                                      toast.error(`Failed to upload ${error.fileName}: ${error.error}`);
                                    });
                                  }
                                } catch (error: any) {
                                  toast.error(
                                    error?.data?.error?.message || "Failed to upload documents"
                                  );
                                } finally {
                                  setIsSubmittingAll(false);
                                }
                              }}
                              disabled={isSubmittingAll || isBatchUploading || Object.keys(pendingUploads).filter(key => key.startsWith(`${onboardingItem._id}_`)).length === 0}
                              className="gap-2"
                            >
                              <Upload className="w-4 h-4" />
                              {isSubmittingAll || isBatchUploading
                                ? `Uploading ${Object.keys(pendingUploads).filter(key => key.startsWith(`${onboardingItem._id}_`)).length} file(s)...`
                                : `Submit All (${Object.keys(pendingUploads).filter(key => key.startsWith(`${onboardingItem._id}_`)).length})`}
                            </Button>
                          )}
                        </div>
                        {onboardingItem.documents.map((doc) => (
                          <div
                            key={doc._id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border"
                          >
                            <div className="flex items-start gap-3 flex-1">
                              {doc.status === DOCUMENT_STATUS.COMPLETED ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                              ) : (
                                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium">{doc.name || 'Unnamed Document'}</p>
                                {doc.required && (
                                  <span className="text-xs text-red-500">Required</span>
                                )}
                                {pendingUploads[`${onboardingItem._id}_${doc._id}`] && (
                                  <span className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                                    <Clock className="w-3 h-3" />
                                    Pending: {(pendingUploads[`${onboardingItem._id}_${doc._id}`].size / 1024).toFixed(2)} KB
                                  </span>
                                )}
                                {doc.url && !pendingUploads[`${onboardingItem._id}_${doc._id}`] && (
                                  <a
                                    href={doc.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline block mt-1"
                                  >
                                    View Document
                                  </a>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  doc.status === DOCUMENT_STATUS.COMPLETED
                                    ? "default"
                                    : doc.status === DOCUMENT_STATUS.PENDING
                                      ? "secondary"
                                      : doc.status === DOCUMENT_STATUS.REJECTED
                                        ? "destructive"
                                        : "outline"
                                }
                              >
                                {doc.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                              </Badge>
                              {doc.status !== DOCUMENT_STATUS.COMPLETED && (
                                <div className="flex items-center gap-2">
                                  {pendingUploads[`${onboardingItem._id}_${doc._id}`] ? (
                                    <>
                                      <span className="text-xs text-muted-foreground">
                                        {pendingUploads[`${onboardingItem._id}_${doc._id}`].name}
                                      </span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => {
                                          const newPending = { ...pendingUploads };
                                          delete newPending[`${onboardingItem._id}_${doc._id}`];
                                          setPendingUploads(newPending);
                                        }}
                                        className="text-red-500 hover:bg-red-50"
                                      >
                                        <X className="w-3 h-3" />
                                      </Button>
                                    </>
                                  ) : (
                                    <label className="cursor-pointer">
                                      <input
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            setPendingUploads((prev) => ({
                                              ...prev,
                                              [`${onboardingItem._id}_${doc._id}`]: file,
                                            }));
                                            // Reset input to allow selecting the same file again if needed
                                            e.target.value = '';
                                          }
                                        }}
                                        disabled={isSubmittingAll || isBatchUploading}
                                      />
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        asChild 
                                        className="gap-2"
                                        disabled={isSubmittingAll || isBatchUploading}
                                      >
                                        <span>
                                          <Upload className="w-3 h-3" />
                                          Select File
                                        </span>
                                      </Button>
                                    </label>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : onboarding ? (
              <div className="space-y-6 py-4">
                {/* Single onboarding display (fallback) */}
                {/* Job Information */}
                {onboarding.candidateId?.jobId && (() => {
                  const jobId = onboarding.candidateId?.jobId;
                  const jobData = jobId && typeof jobId === 'object' && jobId !== null ? jobId as any : null;
                  return (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <p className="font-semibold text-blue-900 dark:text-blue-100">Job Position</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-blue-700 dark:text-blue-300">Job Title</p>
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            {jobData?.title || onboarding.candidateId?.position || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-700 dark:text-blue-300">Department</p>
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            {jobData?.department || onboarding.staffId?.department || "-"}
                          </p>
                        </div>
                        {jobData?.jobCode && (
                          <div>
                            <p className="text-xs text-blue-700 dark:text-blue-300">Job Code</p>
                            <p className="font-medium text-blue-900 dark:text-blue-100">
                              {jobData.jobCode}
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 italic">
                        The documents below are required for this job position.
                      </p>
                    </div>
                  );
                })()}

                {/* Employee Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Employee ID</p>
                    <p className="font-medium">{onboarding.staffId?.employeeId || "Pending"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="font-medium">{onboarding.staffId?.department || onboarding.candidateId?.position || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Designation</p>
                    <p className="font-medium">{onboarding.staffId?.designation || onboarding.candidateId?.position || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Joining Date</p>
                    <p className="font-medium">
                      {onboarding.staffId?.joiningDate 
                        ? format(new Date(onboarding.staffId.joiningDate), "yyyy-MM-dd")
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Overall Progress</p>
                    <span className="font-bold">{onboarding.progress}%</span>
                  </div>
                  <Progress value={onboarding.progress} className="h-3" />
                </div>

                {/* Documents List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Required Documents</p>
                      {onboarding && (() => {
                        const requiredDocs = onboarding.documents.filter(doc => doc.required && doc.status !== DOCUMENT_STATUS.COMPLETED);
                        const missingRequired = requiredDocs.filter(doc => !pendingUploads[doc._id] && !doc.url);
                        if (missingRequired.length > 0) {
                          return (
                            <p className="text-xs text-red-500 mt-1">
                              {missingRequired.length} required document(s) missing
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    {Object.keys(pendingUploads).length > 0 && (
                      <Button
                        onClick={async () => {
                          if (!onboarding) return;

                          // Validate that all required documents are selected
                          const requiredDocuments = onboarding.documents.filter(
                            doc => doc.required && doc.status !== DOCUMENT_STATUS.COMPLETED
                          );
                          const missingRequired = requiredDocuments.filter(
                            doc => !pendingUploads[doc._id] && !doc.url
                          );
                          
                          if (missingRequired.length > 0) {
                            const missingNames = missingRequired.map(doc => doc.name).join(', ');
                            toast.error(
                              `Please upload all required documents. Missing: ${missingNames}`,
                              { duration: 5000 }
                            );
                            return;
                          }

                          setIsSubmittingAll(true);
                          
                          try {
                            // Prepare files and document IDs in order
                            const documentIds = Object.keys(pendingUploads);
                            const files = documentIds.map(id => pendingUploads[id]);

                            const result = await batchUploadDocuments({
                              onboardingId: onboarding._id,
                              files,
                              documentIds,
                            }).unwrap();

                            if (result.data.uploaded.length > 0) {
                              toast.success(
                                `${result.data.uploaded.length} document(s) uploaded successfully${result.data.errors && result.data.errors.length > 0 ? `. ${result.data.errors.length} failed.` : ''}`
                              );
                              setPendingUploads({});
                              refetchOnboarding();
                              refetchAllOnboarding();
                            }

                            if (result.data.errors && result.data.errors.length > 0) {
                              result.data.errors.forEach((error: any) => {
                                toast.error(`Failed to upload ${error.fileName}: ${error.error}`);
                              });
                            }
                          } catch (error: any) {
                            toast.error(
                              error?.data?.error?.message || "Failed to upload documents"
                            );
                          } finally {
                            setIsSubmittingAll(false);
                          }
                        }}
                        disabled={isSubmittingAll || isBatchUploading || Object.keys(pendingUploads).length === 0}
                        className="gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {isSubmittingAll || isBatchUploading
                          ? `Uploading ${Object.keys(pendingUploads).length} file(s)...`
                          : `Submit All (${Object.keys(pendingUploads).length})`}
                      </Button>
                    )}
                  </div>
                  {onboarding.documents.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {doc.status === DOCUMENT_STATUS.COMPLETED ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{doc.name || 'Unnamed Document'}</p>
                          {doc.required && (
                            <span className="text-xs text-red-500">Required</span>
                          )}
                          {pendingUploads[doc._id] && (
                            <span className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              Pending: {(pendingUploads[doc._id].size / 1024).toFixed(2)} KB
                            </span>
                          )}
                          {doc.url && !pendingUploads[doc._id] && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline block mt-1"
                            >
                              View Document
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            doc.status === DOCUMENT_STATUS.COMPLETED
                              ? "default"
                              : doc.status === DOCUMENT_STATUS.PENDING
                                ? "secondary"
                                : doc.status === DOCUMENT_STATUS.REJECTED
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {doc.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                        {doc.status !== DOCUMENT_STATUS.COMPLETED && (
                          <div className="flex items-center gap-2">
                            {pendingUploads[doc._id] ? (
                              <>
                                <span className="text-xs text-muted-foreground">
                                  {pendingUploads[doc._id].name}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const newPending = { ...pendingUploads };
                                    delete newPending[doc._id];
                                    setPendingUploads(newPending);
                                  }}
                                  className="text-red-500 hover:bg-red-50"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </>
                            ) : (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setPendingUploads((prev) => ({
                                        ...prev,
                                        [doc._id]: file,
                                      }));
                                      // Reset input to allow selecting the same file again if needed
                                      e.target.value = '';
                                    }
                                  }}
                                  disabled={isSubmittingAll || isBatchUploading}
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  asChild 
                                  className="gap-2"
                                  disabled={isSubmittingAll || isBatchUploading}
                                >
                                  <span>
                                    <Upload className="w-3 h-3" />
                                    Select File
                                  </span>
                                </Button>
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : onboarding ? (
              <div className="space-y-6 py-4">
                {/* Single onboarding display (fallback) */}
                {/* Job Information */}
                {onboarding.candidateId?.jobId && (() => {
                  const jobId = onboarding.candidateId?.jobId;
                  const jobData = jobId && typeof jobId === 'object' && jobId !== null ? jobId as any : null;
                  return (
                    <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        <p className="font-semibold text-blue-900 dark:text-blue-100">Job Position</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-blue-700 dark:text-blue-300">Job Title</p>
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            {jobData?.title || onboarding.candidateId?.position || "-"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-700 dark:text-blue-300">Department</p>
                          <p className="font-medium text-blue-900 dark:text-blue-100">
                            {jobData?.department || onboarding.staffId?.department || "-"}
                          </p>
                        </div>
                        {jobData?.jobCode && (
                          <div>
                            <p className="text-xs text-blue-700 dark:text-blue-300">Job Code</p>
                            <p className="font-medium text-blue-900 dark:text-blue-100">
                              {jobData.jobCode}
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-400 mt-3 italic">
                        The documents below are required for this job position.
                      </p>
                    </div>
                  );
                })()}

                {/* Employee Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Employee ID</p>
                    <p className="font-medium">{onboarding.staffId?.employeeId || "Pending"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Department</p>
                    <p className="font-medium">{onboarding.staffId?.department || onboarding.candidateId?.position || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Designation</p>
                    <p className="font-medium">{onboarding.staffId?.designation || onboarding.candidateId?.position || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Joining Date</p>
                    <p className="font-medium">
                      {onboarding.staffId?.joiningDate 
                        ? format(new Date(onboarding.staffId.joiningDate), "yyyy-MM-dd")
                        : "-"}
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Overall Progress</p>
                    <span className="font-bold">{onboarding.progress}%</span>
                  </div>
                  <Progress value={onboarding.progress} className="h-3" />
                </div>

                {/* Documents List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Required Documents</p>
                      {(() => {
                        const requiredDocs = onboarding.documents.filter(doc => doc.required && doc.status !== DOCUMENT_STATUS.COMPLETED);
                        const missingRequired = requiredDocs.filter(doc => !pendingUploads[doc._id] && !doc.url);
                        if (missingRequired.length > 0) {
                          return (
                            <p className="text-xs text-red-500 mt-1">
                              {missingRequired.length} required document(s) missing
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    {Object.keys(pendingUploads).length > 0 && (
                      <Button
                        onClick={async () => {
                          if (!onboarding) return;

                          const requiredDocuments = onboarding.documents.filter(
                            doc => doc.required && doc.status !== DOCUMENT_STATUS.COMPLETED
                          );
                          const missingRequired = requiredDocuments.filter(
                            doc => !pendingUploads[doc._id] && !doc.url
                          );
                          
                          if (missingRequired.length > 0) {
                            const missingNames = missingRequired.map(doc => doc.name).join(', ');
                            toast.error(
                              `Please upload all required documents. Missing: ${missingNames}`,
                              { duration: 5000 }
                            );
                            return;
                          }

                          setIsSubmittingAll(true);
                          
                          try {
                            const documentIds = Object.keys(pendingUploads);
                            const files = documentIds.map(id => pendingUploads[id]);

                            const result = await batchUploadDocuments({
                              onboardingId: onboarding._id,
                              files,
                              documentIds,
                            }).unwrap();

                            if (result.data.uploaded.length > 0) {
                              toast.success(
                                `${result.data.uploaded.length} document(s) uploaded successfully${result.data.errors && result.data.errors.length > 0 ? `. ${result.data.errors.length} failed.` : ''}`
                              );
                              setPendingUploads({});
                              refetchOnboarding();
                              refetchAllOnboarding();
                            }

                            if (result.data.errors && result.data.errors.length > 0) {
                              result.data.errors.forEach((error: any) => {
                                toast.error(`Failed to upload ${error.fileName}: ${error.error}`);
                              });
                            }
                          } catch (error: any) {
                            toast.error(
                              error?.data?.error?.message || "Failed to upload documents"
                            );
                          } finally {
                            setIsSubmittingAll(false);
                          }
                        }}
                        disabled={isSubmittingAll || isBatchUploading || Object.keys(pendingUploads).length === 0}
                        className="gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {isSubmittingAll || isBatchUploading
                          ? `Uploading ${Object.keys(pendingUploads).length} file(s)...`
                          : `Submit All (${Object.keys(pendingUploads).length})`}
                      </Button>
                    )}
                  </div>
                  {onboarding.documents.map((doc) => (
                    <div
                      key={doc._id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-lg border"
                    >
                      <div className="flex items-start gap-3 flex-1">
                        {doc.status === DOCUMENT_STATUS.COMPLETED ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                        ) : (
                          <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <p className="text-sm font-medium">{doc.name || 'Unnamed Document'}</p>
                          {doc.required && (
                            <span className="text-xs text-red-500">Required</span>
                          )}
                          {pendingUploads[doc._id] && (
                            <span className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                              <Clock className="w-3 h-3" />
                              Pending: {(pendingUploads[doc._id].size / 1024).toFixed(2)} KB
                            </span>
                          )}
                          {doc.url && !pendingUploads[doc._id] && (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline block mt-1"
                            >
                              View Document
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            doc.status === DOCUMENT_STATUS.COMPLETED
                              ? "default"
                              : doc.status === DOCUMENT_STATUS.PENDING
                                ? "secondary"
                                : doc.status === DOCUMENT_STATUS.REJECTED
                                  ? "destructive"
                                  : "outline"
                          }
                        >
                          {doc.status.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                        {doc.status !== DOCUMENT_STATUS.COMPLETED && (
                          <div className="flex items-center gap-2">
                            {pendingUploads[doc._id] ? (
                              <>
                                <span className="text-xs text-muted-foreground">
                                  {pendingUploads[doc._id].name}
                                </span>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const newPending = { ...pendingUploads };
                                    delete newPending[doc._id];
                                    setPendingUploads(newPending);
                                  }}
                                  className="text-red-500 hover:bg-red-50"
                                >
                                  <X className="w-3 h-3" />
                                </Button>
                              </>
                            ) : (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setPendingUploads((prev) => ({
                                        ...prev,
                                        [doc._id]: file,
                                      }));
                                      // Reset input to allow selecting the same file again if needed
                                      e.target.value = '';
                                    }
                                  }}
                                  disabled={isSubmittingAll || isBatchUploading}
                                />
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  asChild 
                                  className="gap-2"
                                  disabled={isSubmittingAll || isBatchUploading}
                                >
                                  <span>
                                    <Upload className="w-3 h-3" />
                                    Select File
                                  </span>
                                </Button>
                              </label>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No onboarding records found.
              </div>
            )}
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

export default CandidateProfile;
