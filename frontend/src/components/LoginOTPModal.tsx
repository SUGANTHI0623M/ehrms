import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { message } from "antd";
import { useLoginMutation } from "@/store/api/authApi";
import { useAppDispatch } from "@/store/hooks";
import { setCredentials } from "@/store/slices/authSlice";
import { getRoleDashboard } from "@/utils/roleUtils";
import { useNavigate } from "react-router-dom";

interface LoginOTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  password: string;
}

const LoginOTPModal: React.FC<LoginOTPModalProps> = ({
  isOpen,
  onClose,
  email,
  password,
}) => {
  const [otp, setOtp] = useState("");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [login, { isLoading }] = useLoginMutation();

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      message.error("Please enter the complete 6-digit OTP");
      return;
    }

    try {
      const result = await login({ email, password, otp }).unwrap();
      
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
          console.error('[LoginOTPModal] Token was not stored in localStorage');
          message.error("Failed to store authentication token. Please try again.");
          return;
        }

        const userRole = result.data.user.role;
        const redirectPath = getRoleDashboard(userRole);

        console.log('[LoginOTPModal] Login successful, preparing navigation:', {
          hasToken: !!storedToken,
          userId: result.data.user.id,
          role: userRole,
          redirectPath: redirectPath,
          companyId: result.data.user.companyId
        });

        message.success("Login Successful!");
        handleClose();

        // Use a longer delay to ensure Redux state and localStorage are fully updated
        setTimeout(() => {
          console.log('[LoginOTPModal] Navigating to:', redirectPath);
          navigate(redirectPath, { replace: true });
        }, 300);
      }
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || "Invalid OTP. Please try again.";
      message.error(errorMessage);
    }
  };

  const handleClose = () => {
    setOtp("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Two-Factor Authentication</DialogTitle>
          <DialogDescription>
            Enter the 6-digit OTP sent to your email to complete login
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Enter OTP</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={(value) => setOtp(value)}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <p className="text-xs text-center text-gray-500 mt-2">
              OTP sent to {email}
            </p>
          </div>
          <Button
            onClick={handleVerifyOTP}
            disabled={isLoading || otp.length !== 6}
            className="w-full"
          >
            {isLoading ? "Verifying..." : "Verify OTP & Login"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginOTPModal;

