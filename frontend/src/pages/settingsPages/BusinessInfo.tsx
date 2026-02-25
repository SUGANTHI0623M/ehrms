import React, { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Upload, 
  Edit, 
  Save, 
  X,
  Plus,
  Trash2,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import BranchManagement from "./components/BranchManagement";
import { useGetBusinessQuery, useUpdateBusinessMutation, useUploadBusinessLogoMutation } from "@/store/api/businessApi";

const BusinessInfo: React.FC = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"company" | "branches">("company");
  
  // Fetch business data
  const { data, isLoading, error, refetch } = useGetBusinessQuery();
  const [updateBusiness, { isLoading: isUpdating }] = useUpdateBusinessMutation();
  const [uploadLogo, { isLoading: isUploadingLogo }] = useUploadBusinessLogoMutation();
  
  // File input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const business = data?.data?.business;
  
  // Company master details state
  const [companyData, setCompanyData] = useState({
    name: "",
    legalEntityType: "",
    email: "",
    phone: "",
    logo: "",
    registeredAddress: {
      street: "",
      city: "",
      state: "",
      country: "India",
      zipCode: ""
    }
  });

  // Load business data when fetched
  useEffect(() => {
    if (business) {
      const address = (business.registeredAddress || business.address || {}) as {
        street?: string;
        city?: string;
        state?: string;
        country?: string;
        zipCode?: string;
      };
      setCompanyData({
        name: business.name || "",
        legalEntityType: business.legalEntityType || "",
        email: business.email || "",
        phone: business.phone || "",
        logo: business.logo || "",
        registeredAddress: {
          street: address.street && address.street !== "Not provided" ? address.street : "",
          city: address.city && address.city !== "Not provided" ? address.city : "",
          state: address.state && address.state !== "Not provided" ? address.state : "",
          country: address.country || "India",
          zipCode: address.zipCode && address.zipCode !== "Not provided" ? address.zipCode : ""
        }
      });
    }
  }, [business]);

  const handleSave = async () => {
    try {
      // Validate required fields
      if (!companyData.name || !companyData.email || !companyData.phone) {
        toast.error("Please fill in all required fields");
        return;
      }

      // Validate address fields (allow empty but warn if critical fields are missing)
      if (!companyData.registeredAddress.street || !companyData.registeredAddress.city || 
          !companyData.registeredAddress.state) {
        toast.error("Please fill in street, city, and state");
        return;
      }

      await updateBusiness({
        name: companyData.name,
        legalEntityType: companyData.legalEntityType || undefined,
        email: companyData.email,
        phone: companyData.phone,
        logo: companyData.logo,
        registeredAddress: {
          street: companyData.registeredAddress.street,
          city: companyData.registeredAddress.city,
          state: companyData.registeredAddress.state,
          country: companyData.registeredAddress.country,
          zipCode: companyData.registeredAddress.zipCode
        }
      }).unwrap();

      toast.success("Company details saved successfully");
      setIsEditing(false);
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to save company details");
    }
  };

  const handleCancel = () => {
    // Reset to original business data
    if (business) {
      setCompanyData({
        name: business.name || "",
        legalEntityType: business.legalEntityType || "",
        email: business.email || "",
        phone: business.phone || "",
        logo: business.logo || "",
        registeredAddress: business.registeredAddress || business.address || {
          street: "",
          city: "",
          state: "",
          country: "India",
          zipCode: ""
        }
      });
    }
    setIsEditing(false);
  };

  const handleLogoUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Only JPG and PNG images are allowed');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit');
      return;
    }

    try {
      const result = await uploadLogo(file).unwrap();
      if (result.success && result.data.logoUrl) {
        setCompanyData({ ...companyData, logo: result.data.logoUrl });
        toast.success('Logo uploaded successfully');
        refetch();
      }
    } catch (error: any) {
      toast.error(error?.data?.error?.message || 'Failed to upload logo');
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <MainLayout>
      <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Business Info</h2>
          <div className="flex gap-2">
            <Button
              variant={activeTab === "company" ? "default" : "outline"}
              onClick={() => setActiveTab("company")}
            >
              Company Details
            </Button>
            <Button
              variant={activeTab === "branches" ? "default" : "outline"}
              onClick={() => setActiveTab("branches")}
            >
              Branches & Locations
            </Button>
          </div>
        </div>

        {activeTab === "company" && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Master Details
              </CardTitle>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={isUpdating}>
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isUpdating}>
                      {isUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <Button size="sm" onClick={() => setIsEditing(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="mt-4 text-muted-foreground">Loading company details...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <p className="text-destructive">Failed to load company details</p>
                  <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                    Retry
                  </Button>
                </div>
              ) : (
                <>
              {/* Company Name & Legal Entity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">
                    Business / Company Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="company-name"
                    value={companyData.name}
                    onChange={(e) => setCompanyData({ ...companyData, name: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Enter company name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="legal-entity">Legal Entity Type</Label>
                  <Select
                    value={companyData.legalEntityType}
                    onValueChange={(value) => setCompanyData({ ...companyData, legalEntityType: value })}
                    disabled={!isEditing}
                  >
                    <SelectTrigger id="legal-entity">
                      <SelectValue placeholder="Select entity type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LLP">LLP</SelectItem>
                      <SelectItem value="Private Limited">Private Limited</SelectItem>
                      <SelectItem value="Public Limited">Public Limited</SelectItem>
                      <SelectItem value="Sole Proprietorship">Sole Proprietorship</SelectItem>
                      <SelectItem value="Partnership">Partnership</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Primary Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="primary-email"
                    type="email"
                    value={companyData.email}
                    onChange={(e) => setCompanyData({ ...companyData, email: e.target.value })}
                    disabled={!isEditing}
                    placeholder="company@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primary-phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Primary Contact Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="primary-phone"
                    type="tel"
                    value={companyData.phone}
                    onChange={(e) => setCompanyData({ ...companyData, phone: e.target.value })}
                    disabled={!isEditing}
                    placeholder="+91 1234567890"
                  />
                </div>
              </div>

              {/* Company Logo */}
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  {companyData.logo ? (
                    <img
                      src={companyData.logo}
                      alt="Company Logo"
                      className="h-20 w-20 object-contain border rounded"
                    />
                  ) : (
                    <div className="h-20 w-20 border-2 border-dashed rounded flex items-center justify-center">
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  {isEditing && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleLogoUpload}
                        disabled={isUploadingLogo}
                      >
                        {isUploadingLogo ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Logo
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
                {isEditing && (
                  <p className="text-xs text-muted-foreground">
                    Supported formats: JPG, PNG. Max size: 5MB
                  </p>
                )}
              </div>

              <Separator />

              {/* Registered Address */}
              <div className="space-y-4">
                <Label className="flex items-center gap-2 text-lg font-semibold">
                  <MapPin className="h-5 w-5" />
                  Registered Address (Head Office)
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="street">Street Address <span className="text-red-500">*</span></Label>
                    <Input
                      id="street"
                      value={companyData.registeredAddress.street}
                      onChange={(e) => setCompanyData({
                        ...companyData,
                        registeredAddress: { ...companyData.registeredAddress, street: e.target.value }
                      })}
                      disabled={!isEditing}
                      placeholder="Enter street address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">City <span className="text-red-500">*</span></Label>
                    <Input
                      id="city"
                      value={companyData.registeredAddress.city}
                      onChange={(e) => setCompanyData({
                        ...companyData,
                        registeredAddress: { ...companyData.registeredAddress, city: e.target.value }
                      })}
                      disabled={!isEditing}
                      placeholder="Enter city"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State <span className="text-red-500">*</span></Label>
                    <Input
                      id="state"
                      value={companyData.registeredAddress.state}
                      onChange={(e) => setCompanyData({
                        ...companyData,
                        registeredAddress: { ...companyData.registeredAddress, state: e.target.value }
                      })}
                      disabled={!isEditing}
                      placeholder="Enter state"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country <span className="text-red-500">*</span></Label>
                    <Input
                      id="country"
                      value={companyData.registeredAddress.country}
                      onChange={(e) => setCompanyData({
                        ...companyData,
                        registeredAddress: { ...companyData.registeredAddress, country: e.target.value }
                      })}
                      disabled={!isEditing}
                      placeholder="Enter country"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pincode">Pincode <span className="text-red-500">*</span></Label>
                    <Input
                      id="pincode"
                      value={companyData.registeredAddress.zipCode}
                      onChange={(e) => setCompanyData({
                        ...companyData,
                        registeredAddress: { ...companyData.registeredAddress, zipCode: e.target.value }
                      })}
                      disabled={!isEditing}
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>
              </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === "branches" && (
          <BranchManagement />
        )}
      </div>
    </MainLayout>
  );
};

export default BusinessInfo;

