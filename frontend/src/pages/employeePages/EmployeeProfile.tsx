import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MainLayout from "@/components/MainLayout";
import {
  useGetEmployeeProfileQuery,
  useUpdateEmployeeProfileMutation,
} from "@/store/api/employeeApi";
import {
  useGetOnboardingByCurrentUserQuery,
  useUploadOnboardingDocumentMutation,
  DOCUMENT_STATUS,
} from "@/store/api/onboardingApi";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  GraduationCap,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  Edit,
  Save,
  X,
  Upload,
} from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { message } from "antd";

const EmployeeProfile = () => {
  const { data, isLoading, error, refetch } = useGetEmployeeProfileQuery();
  const [uploadDocument, { isLoading: isUploading }] = useUploadOnboardingDocumentMutation();
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const {
    data: onboardingData,
    isLoading: onboardingLoading,
    refetch: refetchOnboarding,
  } = useGetOnboardingByCurrentUserQuery();
  const [updateEmployeeProfile, { isLoading: isUpdating }] = useUpdateEmployeeProfileMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  const profile = data?.data?.profile;
  const staffData = data?.data?.staffData;
  const candidateData = staffData?.candidateId && typeof staffData.candidateId === 'object' ? staffData.candidateId : null;
  const onboarding = onboardingData?.data?.onboarding;

  // Initialize form data when staffData loads
  useEffect(() => {
    if (staffData && !isEditing) {
      setFormData({
        name: staffData.name || "",
        phone: staffData.phone || "",
        gender: staffData.gender || "",
        dob: staffData.dob ? new Date(staffData.dob).toISOString().split('T')[0] : '',
        maritalStatus: staffData.maritalStatus || "",
        bloodGroup: staffData.bloodGroup || "",
        address: {
          line1: staffData.address?.line1 || "",
          city: staffData.address?.city || "",
          state: staffData.address?.state || "",
          postalCode: staffData.address?.postalCode || "",
          country: staffData.address?.country || ""
        },
        bankDetails: {
          bankName: staffData.bankDetails?.bankName || "",
          accountNumber: staffData.bankDetails?.accountNumber || "",
          ifscCode: staffData.bankDetails?.ifscCode || "",
          accountHolderName: staffData.bankDetails?.accountHolderName || "",
          upiId: staffData.bankDetails?.upiId || ""
        },
        uan: staffData.uan || "",
        pan: staffData.pan || "",
        aadhaar: staffData.aadhaar || "",
        pfNumber: staffData.pfNumber || "",
        esiNumber: staffData.esiNumber || ""
      });
    }
  }, [staffData, isEditing]);

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

  const handleSave = async () => {
    try {
      await updateEmployeeProfile(formData).unwrap();
      message.success("Profile updated successfully");
      setIsEditing(false);
      refetch();
    } catch (err: any) {
      message.error(err?.data?.error?.message || "Failed to update profile");
    }
  };

  const handleCancel = () => {
    if (staffData) {
      setFormData({
        name: staffData.name || "",
        phone: staffData.phone || "",
        gender: staffData.gender || "",
        dob: staffData.dob ? new Date(staffData.dob).toISOString().split('T')[0] : '',
        maritalStatus: staffData.maritalStatus || "",
        bloodGroup: staffData.bloodGroup || "",
        address: {
          line1: staffData.address?.line1 || "",
          city: staffData.address?.city || "",
          state: staffData.address?.state || "",
          postalCode: staffData.address?.postalCode || "",
          country: staffData.address?.country || ""
        },
        bankDetails: {
          bankName: staffData.bankDetails?.bankName || "",
          accountNumber: staffData.bankDetails?.accountNumber || "",
          ifscCode: staffData.bankDetails?.ifscCode || "",
          accountHolderName: staffData.bankDetails?.accountHolderName || "",
          upiId: staffData.bankDetails?.upiId || ""
        },
        uan: staffData.uan || "",
        pan: staffData.pan || "",
        aadhaar: staffData.aadhaar || "",
        pfNumber: staffData.pfNumber || "",
        esiNumber: staffData.esiNumber || ""
      });
    }
    setIsEditing(false);
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
    if (staffData?.name) {
      const names = staffData.name.split(" ");
      return names
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return "E";
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case DOCUMENT_STATUS.COMPLETED:
        return (
          <Badge className="bg-green-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case DOCUMENT_STATUS.REJECTED:
        return (
          <Badge className="bg-red-500">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      case DOCUMENT_STATUS.PENDING:
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

  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-4">
          <div className="space-y-6">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error || !staffData) {
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

  return (
    <MainLayout>
      <div className="p-4 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground mt-1">
              {isEditing ? "Edit your employee profile and information" : "View your employee profile and information"}
            </p>
          </div>
          {!isEditing ? (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isUpdating}>
                <Save className="w-4 h-4 mr-2" />
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>

        {/* Profile Header Card */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={undefined} />
                <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold">
                  {isEditing ? (
                    <Input
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="text-2xl font-bold h-10 max-w-md"
                    />
                  ) : staffData.name}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2 justify-center sm:justify-start">
                  <Badge>{staffData.employeeId}</Badge>
                  <Badge variant="secondary">{staffData.designation}</Badge>
                  <Badge variant={staffData.status === 'Active' ? 'default' : 'secondary'}>
                    {staffData.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground justify-center sm:justify-start">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {staffData.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {isEditing ? (
                      <Input
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        className="h-8 w-40"
                      />
                    ) : staffData.phone}
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4" />
                    {staffData.department}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                {isEditing ? (
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.name}</p>
                )}
              </div>
              <div>
                <Label>Employee ID</Label>
                <p className="font-medium mt-2 text-muted-foreground">{staffData.employeeId}</p>
              </div>
              <div>
                <Label>Email</Label>
                <p className="font-medium mt-2 text-muted-foreground">{staffData.email}</p>
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
              </div>
              <div>
                <Label>Phone</Label>
                {isEditing ? (
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="mt-2"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.phone}</p>
                )}
              </div>
              <div>
                <Label>Gender</Label>
                {isEditing ? (
                  <Select value={formData.gender} onValueChange={(val) => handleInputChange('gender', val)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                      <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium mt-2">{staffData.gender || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>Date of Birth</Label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleInputChange('dob', e.target.value)}
                    className="mt-2"
                  />
                ) : (
                  <p className="font-medium mt-2">
                    {staffData.dob ? format(new Date(staffData.dob), "MMMM dd, yyyy") : "N/A"}
                  </p>
                )}
              </div>
              <div>
                <Label>Marital Status</Label>
                {isEditing ? (
                  <Select value={formData.maritalStatus} onValueChange={(val) => handleInputChange('maritalStatus', val)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Single">Single</SelectItem>
                      <SelectItem value="Married">Married</SelectItem>
                      <SelectItem value="Divorced">Divorced</SelectItem>
                      <SelectItem value="Widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="font-medium mt-2">{staffData.maritalStatus || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>Blood Group</Label>
                {isEditing ? (
                  <Input
                    value={formData.bloodGroup}
                    onChange={(e) => handleInputChange('bloodGroup', e.target.value)}
                    className="mt-2"
                    placeholder="e.g., A+, B-, O+"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.bloodGroup || "N/A"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Employment Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Designation</Label>
                <p className="font-medium mt-2">{staffData.designation}</p>
              </div>
              <div>
                <Label>Department</Label>
                <p className="font-medium mt-2">{staffData.department}</p>
              </div>
              <div>
                <Label>Employee Type</Label>
                <p className="font-medium mt-2">{staffData.staffType}</p>
              </div>
              <div>
                <Label>Joining Date</Label>
                <p className="font-medium mt-2">
                  {staffData.joiningDate
                    ? format(new Date(staffData.joiningDate), "MMMM dd, yyyy")
                    : "N/A"}
                </p>
              </div>
              {staffData.salary && (
                <>
                  {staffData.salary.gross !== undefined && staffData.salary.gross !== null && (
                    <div>
                      <Label>Gross Salary</Label>
                      <p className="font-medium mt-2">₹{Number(staffData.salary.gross).toLocaleString()}</p>
                    </div>
                  )}
                  {staffData.salary.net !== undefined && staffData.salary.net !== null && (
                    <div>
                      <Label>Net Salary</Label>
                      <p className="font-medium mt-2">₹{Number(staffData.salary.net).toLocaleString()}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Address Line 1</Label>
                {isEditing ? (
                  <Input
                    value={formData.address?.line1 || ""}
                    onChange={(e) => handleInputChange('address.line1', e.target.value)}
                    className="mt-2"
                    placeholder="Street address, building, apartment"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.address?.line1 || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>City</Label>
                {isEditing ? (
                  <Input
                    value={formData.address?.city || ""}
                    onChange={(e) => handleInputChange('address.city', e.target.value)}
                    className="mt-2"
                    placeholder="City"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.address?.city || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>State</Label>
                {isEditing ? (
                  <Input
                    value={formData.address?.state || ""}
                    onChange={(e) => handleInputChange('address.state', e.target.value)}
                    className="mt-2"
                    placeholder="State"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.address?.state || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>Postal Code</Label>
                {isEditing ? (
                  <Input
                    value={formData.address?.postalCode || ""}
                    onChange={(e) => handleInputChange('address.postalCode', e.target.value)}
                    className="mt-2"
                    placeholder="PIN Code"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.address?.postalCode || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>Country</Label>
                {isEditing ? (
                  <Input
                    value={formData.address?.country || ""}
                    onChange={(e) => handleInputChange('address.country', e.target.value)}
                    className="mt-2"
                    placeholder="Country"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.address?.country || "N/A"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Employment IDs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Employment IDs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>UAN (Universal Account Number)</Label>
                {isEditing ? (
                  <Input
                    value={formData.uan || ""}
                    onChange={(e) => handleInputChange('uan', e.target.value)}
                    className="mt-2"
                    placeholder="UAN Number"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.uan || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>PAN Number</Label>
                {isEditing ? (
                  <Input
                    value={formData.pan || ""}
                    onChange={(e) => handleInputChange('pan', e.target.value)}
                    className="mt-2"
                    placeholder="PAN Number"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.pan || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>Aadhaar Number</Label>
                {isEditing ? (
                  <Input
                    value={formData.aadhaar || ""}
                    onChange={(e) => handleInputChange('aadhaar', e.target.value)}
                    className="mt-2"
                    placeholder="Aadhaar Number"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.aadhaar || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>PF Number</Label>
                {isEditing ? (
                  <Input
                    value={formData.pfNumber || ""}
                    onChange={(e) => handleInputChange('pfNumber', e.target.value)}
                    className="mt-2"
                    placeholder="PF Number"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.pfNumber || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>ESI Number</Label>
                {isEditing ? (
                  <Input
                    value={formData.esiNumber || ""}
                    onChange={(e) => handleInputChange('esiNumber', e.target.value)}
                    className="mt-2"
                    placeholder="ESI Number"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.esiNumber || "N/A"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Bank Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Bank Name</Label>
                {isEditing ? (
                  <Input
                    value={formData.bankDetails?.bankName || ""}
                    onChange={(e) => handleInputChange('bankDetails.bankName', e.target.value)}
                    className="mt-2"
                    placeholder="Bank Name"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.bankDetails?.bankName || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>Account Number</Label>
                {isEditing ? (
                  <Input
                    value={formData.bankDetails?.accountNumber || ""}
                    onChange={(e) => handleInputChange('bankDetails.accountNumber', e.target.value)}
                    className="mt-2"
                    placeholder="Account Number"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.bankDetails?.accountNumber || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>IFSC Code</Label>
                {isEditing ? (
                  <Input
                    value={formData.bankDetails?.ifscCode || ""}
                    onChange={(e) => handleInputChange('bankDetails.ifscCode', e.target.value)}
                    className="mt-2"
                    placeholder="IFSC Code"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.bankDetails?.ifscCode || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>Account Holder Name</Label>
                {isEditing ? (
                  <Input
                    value={formData.bankDetails?.accountHolderName || ""}
                    onChange={(e) => handleInputChange('bankDetails.accountHolderName', e.target.value)}
                    className="mt-2"
                    placeholder="Account Holder Name"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.bankDetails?.accountHolderName || "N/A"}</p>
                )}
              </div>
              <div>
                <Label>UPI ID</Label>
                {isEditing ? (
                  <Input
                    value={formData.bankDetails?.upiId || ""}
                    onChange={(e) => handleInputChange('bankDetails.upiId', e.target.value)}
                    className="mt-2"
                    placeholder="UPI ID (optional)"
                  />
                ) : (
                  <p className="font-medium mt-2">{staffData.bankDetails?.upiId || "N/A"}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Education from Candidate Data */}
        {candidateData?.education && candidateData.education.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Education
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {candidateData.education.map((edu: any, idx: number) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Qualification</p>
                        <p className="font-medium">{edu.qualification || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Course</p>
                        <p className="font-medium">{edu.courseName || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Institution</p>
                        <p className="font-medium">{edu.institution || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">University</p>
                        <p className="font-medium">{edu.university || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Year of Passing</p>
                        <p className="font-medium">{edu.yearOfPassing || "N/A"}</p>
                      </div>
                      {(edu.percentage || edu.cgpa) && (
                        <div>
                          <p className="text-sm text-muted-foreground">Score</p>
                          <p className="font-medium">{edu.percentage || edu.cgpa}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Experience from Candidate Data */}
        {candidateData?.experience && candidateData.experience.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {candidateData.experience.map((exp: any, idx: number) => (
                  <div key={idx} className="p-4 border rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Company</p>
                        <p className="font-medium">{exp.company || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Role</p>
                        <p className="font-medium">{exp.role || exp.designation || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">
                          {exp.durationFrom} - {exp.durationTo || "Present"}
                        </p>
                      </div>
                      {exp.keyResponsibilities && (
                        <div className="md:col-span-2">
                          <p className="text-sm text-muted-foreground">Responsibilities</p>
                          <p className="font-medium">{exp.keyResponsibilities}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Skills from Candidate Data */}
        {candidateData?.skills && candidateData.skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {candidateData.skills.map((skill: string, idx: number) => (
                  <Badge key={idx} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents
            </CardTitle>
            {onboarding && (
              <p className="text-sm text-muted-foreground mt-1">
                Progress: {onboarding.progress}% • Status: {onboarding.status.replace('_', ' ')}
              </p>
            )}
          </CardHeader>
          <CardContent>
            {onboardingLoading ? (
              <div className="text-center py-12">
                <Skeleton className="h-8 w-full mb-4" />
                <Skeleton className="h-8 w-full mb-4" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : !onboarding || !onboarding.documents || onboarding.documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                <p className="text-lg font-medium text-muted-foreground mb-2">
                  No documents available
                </p>
                <p className="text-sm text-muted-foreground">
                  No onboarding documents have been uploaded yet.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {onboarding.progress < 100 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Overall Progress</p>
                      <span className="font-bold">{onboarding.progress}%</span>
                    </div>
                    <Progress value={onboarding.progress} className="h-3" />
                  </div>
                )}
                {onboarding.documents.map((doc) => (
                  <div key={doc._id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <h4 className="font-medium">{doc.name}</h4>
                          {doc.required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {getStatusBadge(doc.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Type: {doc.type}
                        </p>
                        {doc.uploadedAt && (
                          <p className="text-xs text-muted-foreground">
                            Uploaded: {format(new Date(doc.uploadedAt), "MMMM dd, yyyy")}
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
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = doc.url!;
                                link.download = doc.name;
                                link.click();
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            {doc.status !== DOCUMENT_STATUS.COMPLETED && (
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
                                        message.success('Document uploaded successfully');
                                        refetch();
                                      } catch (error: any) {
                                        message.error(error?.data?.error?.message || 'Failed to upload document');
                                      } finally {
                                        setUploadingDocId(null);
                                        e.target.value = '';
                                      }
                                    }
                                  }}
                                  disabled={isUploading || uploadingDocId === doc._id}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  asChild
                                  disabled={isUploading || uploadingDocId === doc._id}
                                >
                                  <span>
                                    <Upload className="w-3 h-3 mr-1" />
                                    {uploadingDocId === doc._id ? 'Uploading...' : 'Replace'}
                                  </span>
                                </Button>
                              </label>
                            )}
                          </>
                        ) : (
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
                                    message.success('Document uploaded successfully');
                                    refetch();
                                  } catch (error: any) {
                                    message.error(error?.data?.error?.message || 'Failed to upload document');
                                  } finally {
                                    setUploadingDocId(null);
                                    e.target.value = '';
                                  }
                                }
                              }}
                              disabled={isUploading || uploadingDocId === doc._id}
                            />
                            <Button
                              size="sm"
                              variant="default"
                              asChild
                              disabled={isUploading || uploadingDocId === doc._id}
                            >
                              <span>
                                <Upload className="w-3 h-3 mr-1" />
                                {uploadingDocId === doc._id ? 'Uploading...' : 'Upload'}
                              </span>
                            </Button>
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default EmployeeProfile;
