import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Edit,
  Trash2,
  MapPin,
  Building2,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { getCountryOptions, phoneUtils } from "@/utils/countryCodeUtils";
import { toast } from "sonner";
import {
  useGetBranchesQuery,
  useCreateBranchMutation,
  useUpdateBranchMutation,
  useDeleteBranchMutation,
  useUploadBranchLogoMutation,
  type Branch,
  type CreateBranchRequest,
} from "@/store/api/branchApi";

const BranchManagement: React.FC = () => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<CreateBranchRequest>({
    branchName: "",
    branchCode: "",
    isHeadOffice: false,
    email: "",
    contactNumber: "",
    countryCode: "91", // Default to India
    address: {
      street: "",
      city: "",
      state: "",
      country: "",
      pincode: "",
    },
    status: "ACTIVE",
  });
  
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>("91");
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  const countryOptions = getCountryOptions();

  const { data, isLoading, refetch } = useGetBranchesQuery({ includeInactive: true });
  const [createBranch, { isLoading: isCreating }] = useCreateBranchMutation();
  const [updateBranch, { isLoading: isUpdating }] = useUpdateBranchMutation();
  const [deleteBranch, { isLoading: isDeleting }] = useDeleteBranchMutation();
  const [uploadLogo, { isLoading: isUploadingLogo }] = useUploadBranchLogoMutation();
  
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null);

  const branches = data?.data?.branches || [];

  // Calculate preview of branch code based on branch name (not company name)
  const getBranchCodePreview = (): string => {
    if (!formData.branchName) return "";
    
    // Extract prefix from branch name (same logic as backend)
    // Remove common words like "Branch", "Office", "Location", etc.
    let cleanName = formData.branchName
      .toUpperCase()
      .replace(/\b(BRANCH|OFFICE|LOCATION|CENTER|CENTRE|HEAD|HQ|MAIN)\b/gi, '')
      .trim();
    
    // If name is empty after removing common words, use original
    if (!cleanName) {
      cleanName = formData.branchName.toUpperCase();
    }
    
    // Extract first 3-4 letters from cleaned branch name
    let prefix = cleanName
      .replace(/[^A-Z0-9]/g, '');
    
    // Take first 3-4 characters (prefer 3, but can be 4 for longer names)
    if (prefix.length >= 4) {
      prefix = prefix.substring(0, 4);
    } else if (prefix.length >= 3) {
      prefix = prefix.substring(0, 3);
    } else {
      // If less than 3 characters, pad with X
      prefix = prefix.padEnd(3, 'X');
    }
    
    // Find highest existing sequence for this prefix
    const existingBranches = branches.filter(b => {
      const match = b.branchCode?.match(new RegExp(`^${prefix}-(\\d+)$`));
      return match !== null;
    });
    
    let sequence = 1;
    if (existingBranches.length > 0) {
      const sequences = existingBranches
        .map(b => {
          const match = b.branchCode?.match(new RegExp(`^${prefix}-(\\d+)$`));
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter(n => n > 0);
      
      if (sequences.length > 0) {
        sequence = Math.max(...sequences) + 1;
      }
    }
    
    return `${prefix}-${String(sequence).padStart(3, '0')}`;
  };

  // Auto-generate branch code from branch name (will be handled by backend)
  // Frontend shows a preview - actual generation happens on backend
  const handleAutoGenerateCode = () => {
    if (!formData.branchName) {
      toast.error("Please enter branch name first");
      return;
    }
    
    const preview = getBranchCodePreview();
    if (preview) {
      setFormData({ ...formData, branchCode: "" }); // Clear to let backend generate
      toast.info(`Branch code will be auto-generated: ${preview}`);
    } else {
      setFormData({ ...formData, branchCode: "" });
      toast.info("Branch code will be auto-generated on save");
    }
  };

  const handleOpenDialog = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        branchName: branch.branchName,
        branchCode: branch.branchCode,
        isHeadOffice: branch.isHeadOffice,
        email: branch.email || "",
        contactNumber: branch.contactNumber || "",
        countryCode: branch.countryCode || "91",
        address: branch.address,
        status: branch.status,
      });
      setSelectedCountryCode(branch.countryCode || "91");
      setCountryCodeOpen(false);
      setLogoPreview(branch.logo || null);
    } else {
      setEditingBranch(null);
      setFormData({
        branchName: "",
        branchCode: "",
        isHeadOffice: false,
        email: "",
        contactNumber: "",
        countryCode: "91",
        address: {
          street: "",
          city: "",
          state: "",
          country: "",
          pincode: "",
        },
        status: "ACTIVE",
      });
      setSelectedCountryCode("91");
      setCountryCodeOpen(false);
      setLogoPreview(null);
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingBranch(null);
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload if editing existing branch
    if (editingBranch) {
      try {
        const result = await uploadLogo({ id: editingBranch._id, file }).unwrap();
        if (result.success && result.data.logoUrl) {
          setLogoPreview(result.data.logoUrl);
          toast.success('Logo uploaded successfully');
          refetch();
        }
      } catch (error: any) {
        toast.error(error?.data?.error?.message || 'Failed to upload logo');
        setLogoPreview(editingBranch.logo || null);
      }
    }
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.branchName || !formData.address.street || !formData.address.city) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    if (!formData.email || !formData.email.trim()) {
      toast.error("Email is required");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    
    if (!formData.contactNumber || !formData.contactNumber.trim()) {
      toast.error("Contact number is required");
      return;
    }
    
    if (!formData.countryCode) {
      toast.error("Country code is required");
      return;
    }

    // Branch code will be auto-generated by backend if not provided
    // Format: COMPANY-001, COMPANY-002, etc. based on company name
    const submitData = { ...formData };

    try {
      if (editingBranch) {
        await updateBranch({
          id: editingBranch._id,
          data: submitData,
        }).unwrap();
        toast.success("Branch updated successfully");
      } else {
        const result = await createBranch(submitData).unwrap();
        const generatedCode = result.data?.branch?.branchCode;
        if (generatedCode) {
          toast.success(`Branch created successfully with code: ${generatedCode}`);
        } else {
          toast.success("Branch created successfully");
        }
      }
      handleCloseDialog();
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to save branch");
    }
  };

  const handleDelete = async (branch: Branch) => {
    if (!confirm(`Are you sure you want to ${branch.status === 'ACTIVE' ? 'deactivate' : 'delete'} this branch?`)) {
      return;
    }

    try {
      await deleteBranch(branch._id).unwrap();
      toast.success("Branch deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to delete branch");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">Loading branches...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Branches & Locations
          </CardTitle>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Branch
          </Button>
        </CardHeader>
        <CardContent>
          {branches.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No branches added yet</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Branch
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>Branch Code</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  {/* <TableHead>Type</TableHead> */}
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((branch) => (
                  <TableRow key={branch._id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        {branch.logo ? (
                          <img
                            src={branch.logo}
                            alt={`${branch.branchName} logo`}
                            className="w-10 h-10 rounded-lg object-cover border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg border bg-muted flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium">
                            {branch.isHeadOffice ? 'Head Office' : `Branch - ${branch.branchName}`}
                          </div>
                          {branch.isHeadOffice && (
                            <div className="text-sm text-muted-foreground">{branch.branchName}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{branch.branchCode}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {branch.address.city}, {branch.address.state}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {branch.email}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {branch.countryCode ? `+${branch.countryCode} ` : ''}{branch.contactNumber}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {branch.status === "ACTIVE" ? (
                        <Badge className="bg-green-500">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    {/* <TableCell>
                      {branch.isHeadOffice && (
                        <Badge variant="default">Head Office</Badge>
                      )}
                    </TableCell> */}
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(branch)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(branch)}
                          disabled={branch.isHeadOffice}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Branch Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? "Edit Branch" : "Add New Branch"}
            </DialogTitle>
            <DialogDescription>
              {editingBranch
                ? "Update branch information below."
                : "Fill in the details to create a new branch."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Branch Name & Code */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch-name">
                  Branch Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="branch-name"
                  value={formData.branchName}
                  onChange={(e) =>
                    setFormData({ ...formData, branchName: e.target.value })
                  }
                  placeholder="e.g., Mumbai Branch"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-code">Branch Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="branch-code"
                    value={formData.branchCode}
                    onChange={(e) =>
                      setFormData({ ...formData, branchCode: e.target.value.toUpperCase() })
                    }
                    placeholder={!formData.branchCode && formData.branchName ? getBranchCodePreview() : "Auto-generated from branch name"}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAutoGenerateCode}
                    disabled={!formData.branchName}
                    title="Auto-generate code from branch name"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Auto
                  </Button>
                </div>
                {!formData.branchCode && formData.branchName && (
                  <p className="text-xs text-blue-600 font-medium">
                    Preview: {getBranchCodePreview()} (will be generated on save)
                  </p>
                )}
                {formData.branchCode && (
                  <p className="text-xs text-muted-foreground">
                    Manual code entered
                  </p>
                )}
                {!formData.branchCode && !formData.branchName && (
                  <p className="text-xs text-muted-foreground">
                    Enter branch name to see auto-generated code preview (format: BRANCH-001)
                  </p>
                )}
              </div>
            </div>

            {/* Logo Upload */}
            <div className="space-y-2">
              <Label>Branch Logo</Label>
              <div className="flex items-center gap-4">
                {logoPreview && (
                  <div className="relative">
                    <img
                      src={logoPreview}
                      alt="Branch logo preview"
                      className="w-20 h-20 rounded-lg object-cover border"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleLogoUpload}
                    disabled={isUploadingLogo}
                  >
                    {logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG or PNG, max 5MB
                  </p>
                </div>
              </div>
            </div>

            {/* Head Office Toggle */}
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is-head-office"
                checked={formData.isHeadOffice}
                onChange={(e) =>
                  setFormData({ ...formData, isHeadOffice: e.target.checked })
                }
                className="rounded"
              />
              <Label htmlFor="is-head-office">Mark as Head Office</Label>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="branch-email">
                  Branch Email <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="branch-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="branch@company.com"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="branch-country-code">
                    Country Code <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={countryCodeOpen} onOpenChange={setCountryCodeOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="branch-country-code"
                        variant="outline"
                        role="combobox"
                        aria-expanded={countryCodeOpen}
                        className="w-full justify-between"
                      >
                        {selectedCountryCode
                          ? countryOptions.find((option) => option.value === selectedCountryCode)?.label
                          : "Select country code..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search country code..." />
                        <CommandList>
                          <CommandEmpty>No country code found.</CommandEmpty>
                          <CommandGroup>
                            {countryOptions.map((option) => (
                              <CommandItem
                                key={option.value}
                                value={`${option.label} ${option.value}`}
                                onSelect={() => {
                                  setSelectedCountryCode(option.value);
                                  setFormData({ ...formData, countryCode: option.value });
                                  setCountryCodeOpen(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCountryCode === option.value ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {option.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="branch-phone">
                    Contact Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="branch-phone"
                    type="tel"
                    value={formData.contactNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '');
                      setFormData({ ...formData, contactNumber: value });
                      
                      // Validate phone number length if country code is selected
                      if (formData.countryCode && value) {
                        const isValid = phoneUtils.validateMobileNumber(formData.countryCode, value);
                        if (!isValid && value.length > 0) {
                          const limits = phoneUtils.getLimits(formData.countryCode);
                          if (limits && value.length < limits.min) {
                            // Show warning if too short (but allow typing)
                            // Validation will be checked on submit
                          }
                        }
                      }
                    }}
                    placeholder="1234567890"
                    required
                  />
                  {formData.countryCode && formData.contactNumber && (() => {
                    const limits = phoneUtils.getLimits(formData.countryCode);
                    if (limits) {
                      const isValid = phoneUtils.validateMobileNumber(formData.countryCode, formData.contactNumber);
                      if (!isValid) {
                        return (
                          <p className="text-xs text-red-500 mt-1">
                            Phone number must be between {limits.min} and {limits.max} digits
                          </p>
                        );
                      }
                    }
                    return null;
                  })()}
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="space-y-4 border-t pt-4">
              <Label className="text-base font-semibold">Address</Label>
              <div className="space-y-2">
                <Label htmlFor="street">
                  Street Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="street"
                  value={formData.address.street}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value },
                    })
                  }
                  placeholder="Enter street address"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="city"
                    value={formData.address.city}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, city: e.target.value },
                      })
                    }
                    placeholder="Enter city"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="state"
                    value={formData.address.state}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, state: e.target.value },
                      })
                    }
                    placeholder="Enter state"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">
                    Country <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="country"
                    value={formData.address.country}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, country: e.target.value },
                      })
                    }
                    placeholder="Enter country"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pincode">
                    Pincode <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="pincode"
                    value={formData.address.pincode}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        address: { ...formData.address, pincode: e.target.value },
                      })
                    }
                    placeholder="Enter pincode"
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: "ACTIVE" | "INACTIVE") =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isCreating || isUpdating}
            >
              {editingBranch ? "Update Branch" : "Create Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BranchManagement;

