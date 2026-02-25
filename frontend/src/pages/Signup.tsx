import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { message } from "antd";
import { useRegisterMutation, useGetPlatformLogoQuery } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { getRoleDashboard } from "@/utils/roleUtils";
import { Eye, EyeOff } from "lucide-react";

const Signup = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [register, { isLoading }] = useRegisterMutation();
  const { data: platformLogoData } = useGetPlatformLogoQuery();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    // Company fields
    companyName: "",
    companyEmail: "",
    companyPhone: "",
  });

  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [platformLogo, setPlatformLogo] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirmPassword: false,
  });

  useEffect(() => {
    if (platformLogoData?.data?.logo) {
      const logo = platformLogoData.data.logo;
      setPlatformLogo(logo.startsWith('http') || logo.startsWith('/') 
        ? logo 
        : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:9000'}${logo}`
      );
    }
  }, [platformLogoData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-fill company email with user email when user email changes
      // Only if company email hasn't been manually edited or is empty
      if (name === 'email') {
        // If company email is empty or matches the old user email, update it
        if (!prev.companyEmail || prev.companyEmail === prev.email) {
          updated.companyEmail = value;
        }
      }
      return updated;
    });
    // Clear errors when user types
    if (errors.password || errors.confirmPassword) {
      setErrors({});
    }
  };

  const validateForm = () => {
    const newErrors: { password?: string; confirmPassword?: string } = {};

    if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    // Validate company fields
    if (!form.companyName || form.companyName.trim() === '') {
      message.error("Company name is required");
      return false;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      message.error("Please fix the form errors");
      return;
    }

    try {
      const result = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        phone: form.phone || undefined,
        // Company registration data
        companyName: form.companyName,
        companyEmail: form.companyEmail || form.email, // Default to user email if not provided
        companyPhone: form.companyPhone || form.phone || undefined,
      }).unwrap();

      if (result.success) {
        // Store credentials - backend now returns accessToken instead of token
        const token = result.data.accessToken || result.data.token;
        if (!token) {
          message.error("Registration successful but token not received. Please login.");
          return;
        }
        
        dispatch(setCredentials({
          user: result.data.user,
          token: token,
        }));

        // Ensure token is stored before navigation
        const successMessage = result.message || 
          (result.data.company 
            ? "Company and account created successfully! Redirecting to dashboard..." 
            : "Registration successful! Redirecting to dashboard...");
        message.success(successMessage);
        // Get role-based dashboard path
        const userRole = result.data.user.role;
        const dashboardPath = getRoleDashboard(userRole);
        // Use a small delay to ensure Redux state is updated
        setTimeout(() => {
          navigate(dashboardPath);
        }, 100);
      }
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || 
                          error?.data?.error?.errors?.[0]?.msg ||
                          "Registration failed. Please try again.";
      message.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-md bg-white shadow-lg rounded-xl p-4 sm:p-6 md:p-8 overflow-y-auto max-h-[95vh]">
        {platformLogo && (
          <div className="flex justify-center mb-4">
            <img
              src={platformLogo}
              alt="Platform logo"
              className="h-16 w-auto object-contain max-w-[200px]"
            />
          </div>
        )}
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 text-center">Create an Account</h2>
        <p className="text-sm sm:text-base text-gray-500 text-center mb-4 sm:mb-6">Sign up to create your company account</p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          {/* Personal Information */}
          <div className="border-b pb-3 sm:pb-4 mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Personal Information</h3>
            <div>
              <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base font-medium text-gray-700">Full Name *</label>
              <input
                type="text"
                name="name"
                className="w-full rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:ring focus:ring-indigo-200 outline-none"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mt-3 sm:mt-4">
              <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base font-medium text-gray-700">Email *</label>
              <input
                type="email"
                name="email"
                className="w-full rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:ring focus:ring-indigo-200 outline-none"
                placeholder="Enter your email"
                value={form.email}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500 mt-1">This will be your admin login email</p>
            </div>

            <div className="mt-3 sm:mt-4">
              <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base font-medium text-gray-700">Phone Number (Optional)</label>
              <input
                type="tel"
                name="phone"
                className="w-full rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:ring focus:ring-indigo-200 outline-none"
                placeholder="Enter your phone number"
                value={form.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Company Information */}
          <div className="border-b pb-3 sm:pb-4 mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3">Company Information</h3>
            <div>
              <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base font-medium text-gray-700">Company Name *</label>
              <input
                type="text"
                name="companyName"
                className="w-full rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:ring focus:ring-indigo-200 outline-none"
                placeholder="Enter company name"
                value={form.companyName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="mt-3 sm:mt-4">
              <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base font-medium text-gray-700">Company Email *</label>
              <input
                type="email"
                name="companyEmail"
                className="w-full rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:ring focus:ring-indigo-200 outline-none"
                placeholder="Enter company email"
                value={form.companyEmail}
                onChange={handleChange}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Auto-filled with your email. You can change it if needed.</p>
            </div>

            <div className="mt-3 sm:mt-4">
              <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base font-medium text-gray-700">Company Phone (Optional)</label>
              <input
                type="tel"
                name="companyPhone"
                className="w-full rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:ring focus:ring-indigo-200 outline-none"
                placeholder="Enter company phone number"
                value={form.companyPhone}
                onChange={handleChange}
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPasswords.password ? "text" : "password"}
                name="password"
                className={`w-full rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 pr-10 text-sm sm:text-base focus:ring focus:ring-indigo-200 outline-none ${
                  errors.password ? "border-red-500" : ""
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
                  <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base font-medium text-gray-700">Confirm Password</label>
            <div className="relative">
              <input
                type={showPasswords.confirmPassword ? "text" : "password"}
                name="confirmPassword"
                className={`w-full rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 pr-10 text-sm sm:text-base focus:ring focus:ring-indigo-200 outline-none ${
                  errors.confirmPassword ? "border-red-500" : ""
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
                  <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs sm:text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary-700 text-white font-semibold py-2.5 sm:py-3 text-sm sm:text-base rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation min-h-[44px]"
          >
            {isLoading ? "Creating Account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-xs sm:text-sm text-gray-600 text-center mt-4 sm:mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;