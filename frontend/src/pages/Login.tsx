import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { message } from "antd";
import { Eye, EyeOff } from "lucide-react";
import { useLoginMutation, useGetPlatformLogoQuery } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { getRoleDashboard } from "@/utils/roleUtils";
import ForgotPasswordModal from "@/components/ForgotPasswordModal";
import LoginOTPModal from "@/components/LoginOTPModal";

const Login = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();
  const { data: platformLogoData } = useGetPlatformLogoQuery();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showOTPModal, setShowOTPModal] = useState(false);
  const [platformLogo, setPlatformLogo] = useState<string | null>(null);

  useEffect(() => {
    if (platformLogoData?.data?.logo) {
      const logo = platformLogoData.data.logo;
      setPlatformLogo(logo.startsWith('http') || logo.startsWith('/') 
        ? logo 
        : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:7001'}${logo}`
      );
    }
  }, [platformLogoData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await login({ email, password }).unwrap();
      
      // Check if OTP is required
      if (result.requiresOTP) {
        setShowOTPModal(true);
        message.info(result.message || "OTP has been sent to your email. Please enter the OTP to complete login.");
        return;
      }

      if (result.success) {
        const token = result.data.accessToken || result.data.token;
        if (!token) {
          message.error("Login successful but token not received. Please try again.");
          return;
        }

        // Store credentials in Redux and localStorage
        dispatch(setCredentials({
          user: result.data.user,
          token: token,
        }));

        // Verify token was stored
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
          console.error('[Login] Token was not stored in localStorage');
          message.error("Failed to store authentication token. Please try again.");
          return;
        }

        const userRole = result.data.user.role;
        const companyId = result.data.user.companyId;

        console.log('[Login] Login successful, preparing navigation:', {
          hasToken: !!storedToken,
          userId: result.data.user.id,
          role: userRole,
          companyId: companyId
        });

        message.success("Login Successful!");

        // Check setup status for company users (not Super Admin)
        if (companyId && userRole !== "Super Admin") {
          // Import and check setup status
          try {
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:7001/api'}/settings/setup-status`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const setupData = await response.json();
              const isSetupComplete = setupData?.data?.setupCompleted?.isComplete ?? false;
              
              if (!isSetupComplete) {
                // Redirect to setup wizard
                setTimeout(() => {
                  navigate("/setup", { replace: true });
                }, 300);
                return;
              }
            }
          } catch (error) {
            console.error('[Login] Error checking setup status:', error);
            // Continue to dashboard if check fails
          }
        }

        // Use a longer delay to ensure Redux state and localStorage are fully updated
        // Also ensure navigation happens after React has processed the state update
        setTimeout(() => {
          const redirectPath = getRoleDashboard(userRole);
          console.log('[Login] Navigating to:', redirectPath);
          navigate(redirectPath, { replace: true });
        }, 300);
      }
    } catch (error: any) {
      // Don't show error if it's a 401 from login (expected for invalid credentials)
      const errorMessage = error?.data?.error?.message || "Invalid email or password!";
      console.error('[Login] Login failed:', {
        error: errorMessage,
        status: error?.status,
        data: error?.data
      });
      message.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: 'white' }}>

      {/* ── Full-screen background with textures ── */}
      <svg
        className="absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1440 900"
        style={{ zIndex: 0 }}
      >
        {/* 1. Primary color base */}
        <rect x="0" y="0" width="1440" height="900" fill="#efaa1f" />

        {/* 2. Dark massive circle - plain, no lines */}
        <circle cx="720" cy="1350" r="1050" fill="#2C2C2C" />
      </svg>

      {/* Login Form - Centered */}
      <div className="absolute inset-0 flex items-center justify-center p-3 sm:p-4 md:p-6" style={{ zIndex: 10 }}>
        <div className="w-full max-w-md bg-white shadow-2xl rounded-xl p-4 sm:p-6 md:p-8">
        {platformLogo && (
          <div className="flex justify-center mb-6">
            <img
              src={platformLogo}
              alt="Platform logo"
              className="h-24 w-auto object-contain max-w-[280px]"
            />
          </div>
        )}
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800 text-center">Welcome Back</h2>
        <p className="text-sm sm:text-base text-gray-500 text-center mb-4 sm:mb-6">Login to continue</p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base font-medium text-gray-700">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base focus:ring focus:ring-indigo-200 outline-none"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-1.5 sm:mb-2 text-sm sm:text-base font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-lg border px-3 sm:px-4 py-2.5 sm:py-3 pr-10 text-sm sm:text-base focus:ring focus:ring-indigo-200 outline-none"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none touch-manipulation"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
              </button>
            </div>
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowForgotPasswordModal(true)}
                className="text-xs sm:text-sm text-primary hover:underline font-medium touch-manipulation"
              >
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full text-white font-semibold py-2.5 sm:py-3 text-sm sm:text-base rounded-lg transition disabled:opacity-50 touch-manipulation min-h-[44px]"
            style={{ backgroundColor: '#efaa1f' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#efaa1f'}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="text-xs sm:text-sm text-gray-600 text-center mt-4 sm:mt-6">
          Don't have an account?{" "}
          <Link to="/signup" className="text-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPasswordModal}
        onClose={() => setShowForgotPasswordModal(false)}
      />

      <LoginOTPModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        email={email}
        password={password}
      />
    </div>
  );
};

export default Login;