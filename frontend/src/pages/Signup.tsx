import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { message } from "antd";
import { useRegisterMutation, useGetPlatformLogoQuery } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { getRoleDashboard } from "@/utils/roleUtils";
import { Eye, EyeOff, Upload, Building2, User, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { getCountryOptions, phoneUtils } from "@/utils/countryCodeUtils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [register, { isLoading }] = useRegisterMutation();
  const { data: platformLogoData } = useGetPlatformLogoQuery();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState({
    // Personal Information
    name: "",
    email: "",
    phone: "",
    countryCode: "91", // Default to India
    password: "",
    confirmPassword: "",
    // Company Information
    companyName: "",
    companyEmail: "",
    companyPhone: "",
    companyCountryCode: "91", // Default to India
    companyLogo: "",
    companyAddress: {
      street: "",
      city: "",
      state: "",
      country: "India",
      pincode: "",
    },
  });

  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  const [companyCountryCodeOpen, setCompanyCountryCodeOpen] = useState(false);
  const countryOptions = getCountryOptions();

  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
    [key: string]: string | undefined;
  }>({});
  const [platformLogo, setPlatformLogo] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirmPassword: false,
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Image URL - user will provide this
  const leftSideImageUrl = "https://t3.ftcdn.net/jpg/06/24/59/74/360_F_624597492_AcJkmVhHXM7LEVsKt1WtMXHJHYSPhmRP.jpg";

  useEffect(() => {
    if (platformLogoData?.data?.logo) {
      const logo = platformLogoData.data.logo;
      setPlatformLogo(logo.startsWith('http') || logo.startsWith('/') 
        ? logo 
        : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:7001'}${logo}`
      );
    }
  }, [platformLogoData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // For pincode, only allow numeric characters
    let processedValue = value;
    if (name === 'address.pincode') {
      processedValue = value.replace(/\D/g, ''); // Remove all non-digit characters
    }
    
    // For name field, validate in real-time (only letters and spaces)
    if (name === 'name') {
      // Allow only letters and spaces
      processedValue = value.replace(/[^a-zA-Z\s]/g, '');
      // Validate immediately
      if (processedValue.trim() && !/^[a-zA-Z\s]+$/.test(processedValue.trim())) {
        setErrors((prev) => ({ ...prev, name: "Name can only contain letters and spaces" }));
      } else if (processedValue.trim().length < 2) {
        setErrors((prev) => ({ ...prev, name: "Name must be at least 2 characters" }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.name;
          return newErrors;
        });
      }
    }
    
    // For phone fields, only allow numeric characters based on country code
    if (name === 'phone') {
      const limits = phoneUtils.getLimits(form.countryCode);
      const maxLen = limits ? limits.max : 15;
      processedValue = value.replace(/\D/g, '').slice(0, maxLen);
    } else if (name === 'companyPhone') {
      const limits = phoneUtils.getLimits(form.companyCountryCode);
      const maxLen = limits ? limits.max : 15;
      processedValue = value.replace(/\D/g, '').slice(0, maxLen);
    }
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setForm((prev) => ({
        ...prev,
        companyAddress: {
          ...prev.companyAddress,
          [addressField]: processedValue,
        },
      }));
    } else {
      setForm((prev) => {
        const updated = { ...prev, [name]: processedValue };
        // Auto-fill company email with user email when user email changes
        if (name === 'email' && (!prev.companyEmail || prev.companyEmail === prev.email)) {
          updated.companyEmail = processedValue;
        }
        return updated;
      });
    }
    
    // Clear errors when user types (except for name which is handled above)
    if (name !== 'name' && errors[name as keyof typeof errors]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      message.error('Invalid file type. Only JPG and PNG images are allowed');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      message.error('File size exceeds 5MB limit');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Store file for later upload during registration
    setForm((prev) => ({ ...prev, logoFile: file as any }));
  };

  const validateStep1 = () => {
    const newErrors: typeof errors = {};

    if (!form.companyName.trim()) {
      newErrors.companyName = "Company name is required";
    }

    if (!form.companyEmail.trim()) {
      newErrors.companyEmail = "Company email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.companyEmail)) {
      newErrors.companyEmail = "Please enter a valid email";
    }

    // Address validation
    if (!form.companyAddress.street.trim()) {
      newErrors['address.street'] = "Street address is required";
    }
    if (!form.companyAddress.city.trim()) {
      newErrors['address.city'] = "City is required";
    }
    if (!form.companyAddress.state.trim()) {
      newErrors['address.state'] = "State is required";
    }
    if (!form.companyAddress.pincode.trim()) {
      newErrors['address.pincode'] = "Pincode is required";
    } else if (!/^\d+$/.test(form.companyAddress.pincode)) {
      newErrors['address.pincode'] = "Pincode must contain only numbers";
    } else if (form.companyAddress.pincode.length < 4 || form.companyAddress.pincode.length > 10) {
      newErrors['address.pincode'] = "Pincode must be between 4 and 10 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: typeof errors = {};

    if (!form.name.trim()) {
      newErrors.name = "Full name is required";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else {
      const phoneDigits = form.phone.replace(/\D/g, '');
      const limits = phoneUtils.getLimits(form.countryCode);
      if (limits) {
        if (phoneDigits.length < limits.min || phoneDigits.length > limits.max) {
          newErrors.phone = `Phone number must be ${limits.min}-${limits.max} digits for selected country`;
        }
      } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        newErrors.phone = "Please enter a valid phone number (10-15 digits)";
      }
    }

    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      } else {
        message.error("Please fill all the required form fields");
      }
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate step 2
    if (!validateStep2()) {
      message.error("Please fill all the required form fields");
      return;
    }

    try {
      const result = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        countryCode: form.countryCode,
        companyName: form.companyName,
        companyEmail: form.companyEmail || form.email,
        companyPhone: form.companyPhone || form.phone || undefined,
        companyCountryCode: form.companyCountryCode,
        companyLogo: (form as any).logoFile || undefined,
        companyAddress: form.companyAddress,
      }).unwrap();

      if (result.success) {
        const token = result.data.accessToken || result.data.token;
        if (!token) {
          message.error("Registration successful but token not received. Please login.");
          return;
        }
        
        dispatch(setCredentials({
          user: result.data.user,
          token: token,
        }));

        const successMessage = (result as any).message || 
          ((result.data as any).company 
            ? "Company and account created successfully! Redirecting to dashboard..." 
            : "Registration successful! Redirecting to dashboard...");
        message.success(successMessage);
        
        const userRole = result.data.user.role;
        const companyId = result.data.user.companyId;
        
        // For new company registrations, redirect to setup wizard
        // Super Admin doesn't need setup
        if (companyId && userRole !== "Super Admin") {
          setTimeout(() => {
            navigate("/setup", { replace: true });
          }, 100);
        } else {
          const dashboardPath = getRoleDashboard(userRole);
          setTimeout(() => {
            navigate(dashboardPath, { replace: true });
          }, 100);
        }
      }
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || 
                          error?.data?.error?.errors?.[0]?.msg ||
                          "Registration failed. Please try again.";
      message.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Image (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 h-screen relative overflow-hidden">
        <img
          src={leftSideImageUrl}
          alt="Signup illustration"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 h-screen flex flex-col bg-white overflow-hidden">
        <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 md:px-8 lg:px-12 w-full h-full flex flex-col">
          {/* Fixed Header Section */}
          <div className="flex-shrink-0 pt-4 sm:pt-6 lg:pt-4 pb-4 bg-white">
            {/* Logo */}
            {platformLogo && (
              <div className="flex justify-center mb-4">
                <img
                  src={platformLogo}
                  alt="Platform logo"
                  className="h-12 w-auto object-contain max-w-[200px]"
                />
              </div>
            )}

            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Create an Account</h2>
              <p className="text-sm sm:text-base text-gray-500">Sign up to create your company account</p>
            </div>

            {/* Step Indicator */}
            <div className="mb-4">
              <div className="flex items-center justify-center">
                {/* Step 1 */}
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    currentStep >= 1 
                      ? "bg-primary border-primary text-white" 
                      : "bg-white border-gray-300 text-gray-400"
                  }`}>
                    {currentStep > 1 ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-semibold">1</span>
                    )}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    currentStep >= 1 ? "text-primary" : "text-gray-400"
                  }`}>
                    Company Details
                  </span>
                </div>

                {/* Connector */}
                <div className={`flex-1 h-0.5 mx-4 transition-all ${
                  currentStep > 1 ? "bg-primary" : "bg-gray-300"
                }`} />

                {/* Step 2 */}
                <div className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                    currentStep >= 2 
                      ? "bg-primary border-primary text-white" 
                      : "bg-white border-gray-300 text-gray-400"
                  }`}>
                    <span className="text-sm font-semibold">2</span>
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    currentStep >= 2 ? "text-primary" : "text-gray-400"
                  }`}>
                    Personal Details
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable Form Section */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-6 pb-4">
            {/* Step 1: Company Information */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                 
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="companyName"
                        className={`w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all ${
                          errors.companyName ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter company name"
                        value={form.companyName}
                        onChange={handleChange}
                        required
                      />
                      {errors.companyName && (
                        <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Company Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="companyEmail"
                        className={`w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all ${
                          errors.companyEmail ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter company email"
                        value={form.companyEmail}
                        onChange={handleChange}
                        required
                      />
                      {errors.companyEmail && (
                        <p className="text-red-500 text-xs mt-1">{errors.companyEmail}</p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Company Phone
                      </label>
                      <div className="flex gap-2">
                        <Popover open={companyCountryCodeOpen} onOpenChange={setCompanyCountryCodeOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-[140px] justify-between shrink-0"
                            >
                              {countryOptions.find(opt => opt.value === form.companyCountryCode)?.label || "Select"}
                              <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50 rotate-90" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search country..." />
                              <CommandList>
                                <CommandEmpty>No country found.</CommandEmpty>
                                <CommandGroup>
                                  {countryOptions.map((option) => (
                                    <CommandItem
                                      key={option.value}
                                      value={`${option.name} +${option.code} ${option.value}`}
                                      onSelect={() => {
                                        const limits = phoneUtils.getLimits(option.value);
                                        const maxLen = limits ? limits.max : 15;
                                        let phone = (form.companyPhone || '').replace(/\D/g, '').slice(0, maxLen);
                                        setForm((prev) => ({
                                          ...prev,
                                          companyCountryCode: option.value,
                                          companyPhone: phone
                                        }));
                                        setCompanyCountryCodeOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          form.companyCountryCode === option.value ? "opacity-100" : "opacity-0"
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
                        <input
                          type="tel"
                          name="companyPhone"
                          inputMode="numeric"
                          maxLength={phoneUtils.getLimits(form.companyCountryCode)?.max || 15}
                          className="flex-1 rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                          placeholder={`Enter phone number (${phoneUtils.getLimits(form.companyCountryCode)?.min || 10}-${phoneUtils.getLimits(form.companyCountryCode)?.max || 15} digits)`}
                          value={form.companyPhone}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Company Address */}
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Street Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address.street"
                        className={`w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all ${
                          errors['address.street'] ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter street address"
                        value={form.companyAddress.street}
                        onChange={handleChange}
                        required
                      />
                      {errors['address.street'] && (
                        <p className="text-red-500 text-xs mt-1">{errors['address.street']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address.city"
                        className={`w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all ${
                          errors['address.city'] ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter city"
                        value={form.companyAddress.city}
                        onChange={handleChange}
                        required
                      />
                      {errors['address.city'] && (
                        <p className="text-red-500 text-xs mt-1">{errors['address.city']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address.state"
                        className={`w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all ${
                          errors['address.state'] ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter state"
                        value={form.companyAddress.state}
                        onChange={handleChange}
                        required
                      />
                      {errors['address.state'] && (
                        <p className="text-red-500 text-xs mt-1">{errors['address.state']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Country <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address.country"
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
                        placeholder="Enter country"
                        value={form.companyAddress.country}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Pincode <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="address.pincode"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={10}
                        className={`w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all ${
                          errors['address.pincode'] ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter pincode (numbers only)"
                        value={form.companyAddress.pincode}
                        onChange={handleChange}
                        required
                      />
                      {errors['address.pincode'] && (
                        <p className="text-red-500 text-xs mt-1">{errors['address.pincode']}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Company Logo */}
                <div>
                  <div className="flex items-center gap-4">
                    {logoPreview ? (
                      <>
                        <div className="flex-shrink-0">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="w-16 h-16 object-contain rounded-lg border border-gray-200"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700 font-medium mb-1">Logo uploaded</p>
                          <p className="text-xs text-gray-500">Click below to change or remove</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setLogoPreview(null);
                            setForm((prev) => ({ ...prev, logoFile: undefined as any }));
                            if (fileInputRef.current) {
                              fileInputRef.current.value = '';
                            }
                          }}
                          className="px-4 py-2 text-sm    hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <div
                          className={`flex-1 border-2 border-dashed rounded-lg p-3 flex items-center gap-3 transition-all cursor-pointer ${
                            "border-gray-300 hover:border-primary hover:bg-primary/5"
                          }`}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Upload className="w-5 h-5 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-700">
                              Click to upload logo
                            </p>
                            <p className="text-xs text-gray-500">
                              JPG, PNG (Max 5MB)
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                  {logoPreview && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 text-sm text-primary hover:underline"
                    >
                      Change Logo
                    </button>
                  )}
                </div>

                {/* Next Button */}
                <div className="flex justify-end pt-4">
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 text-sm rounded-lg transition-all shadow-md"
                  >
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Personal Information */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                
                  <div className="space-y-4">
                    {/* Name and Email in a row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          className={`w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all ${
                            errors.name ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Enter your full name"
                          value={form.name}
                          onChange={handleChange}
                          required
                        />
                        {errors.name && (
                          <p className="text-red-500 text-xs mt-1">{errors.name}</p>
                        )}
                      </div>

                      <div>
                        <label className="block mb-2 text-sm font-medium text-gray-700">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          name="email"
                          className={`w-full rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all ${
                            errors.email ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Enter your email"
                          value={form.email}
                          onChange={handleChange}
                          required
                        />
                        {errors.email && (
                          <p className="text-red-500 text-xs mt-1">{errors.email}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">This will be your admin login email</p>
                      </div>
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Phone Number <span className="text-red-500">*</span>
                      </label>
                      <div className="flex gap-2">
                        <Popover open={countryCodeOpen} onOpenChange={setCountryCodeOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className="w-[140px] justify-between shrink-0"
                            >
                              {countryOptions.find(opt => opt.value === form.countryCode)?.label || "Select"}
                              <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50 rotate-90" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Search country..." />
                              <CommandList>
                                <CommandEmpty>No country found.</CommandEmpty>
                                <CommandGroup>
                                  {countryOptions.map((option) => (
                                    <CommandItem
                                      key={option.value}
                                      value={`${option.name} +${option.code} ${option.value}`}
                                      onSelect={() => {
                                        const limits = phoneUtils.getLimits(option.value);
                                        const maxLen = limits ? limits.max : 15;
                                        let phone = (form.phone || '').replace(/\D/g, '').slice(0, maxLen);
                                        setForm((prev) => ({
                                          ...prev,
                                          countryCode: option.value,
                                          phone
                                        }));
                                        setCountryCodeOpen(false);
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          form.countryCode === option.value ? "opacity-100" : "opacity-0"
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
                        <input
                          type="tel"
                          name="phone"
                          inputMode="numeric"
                          maxLength={phoneUtils.getLimits(form.countryCode)?.max || 15}
                          className={`flex-1 rounded-lg border px-4 py-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all ${
                            errors.phone ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder={`Enter phone number (${phoneUtils.getLimits(form.countryCode)?.min || 10}-${phoneUtils.getLimits(form.countryCode)?.max || 15} digits)`}
                          value={form.phone}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      {errors.phone && (
                        <p className="text-red-500 text-xs mt-1">{errors.phone}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.password ? "text" : "password"}
                          name="password"
                          className={`w-full rounded-lg border px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all ${
                            errors.password ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Enter password (min 6 characters)"
                          value={form.password}
                          onChange={handleChange}
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, password: !showPasswords.password })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                          aria-label={showPasswords.password ? "Hide password" : "Show password"}
                        >
                          {showPasswords.password ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <p className="text-red-500 text-xs mt-1">{errors.password}</p>
                      )}
                    </div>

                    <div>
                      <label className="block mb-2 text-sm font-medium text-gray-700">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          className={`w-full rounded-lg border px-4 py-3 pr-12 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all ${
                            errors.confirmPassword ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Confirm password"
                          value={form.confirmPassword}
                          onChange={handleChange}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords({ ...showPasswords, confirmPassword: !showPasswords.confirmPassword })}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                          aria-label={showPasswords.confirmPassword ? "Hide password" : "Show password"}
                        >
                          {showPasswords.confirmPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-4">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-3 text-sm rounded-lg transition-all"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold px-6 py-3 text-sm rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                  >
                    {isLoading ? "Creating Account..." : "Sign Up"}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* Fixed Footer */}
          <div className="flex-shrink-0 pt-4 pb-4 sm:pb-6 lg:pb-4 bg-white border-t border-gray-100">
            <p className="text-sm text-gray-600 text-center">
              Already have an account?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
