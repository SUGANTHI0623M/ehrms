import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { useAppDispatch } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { useLogoutMutation } from "@/store/api/authApi";
import { message } from "antd";

export default function OtherSettings() {
  const items = [
    { name: "Channel Partner ID (Optional)", description: "Not Added" },
    { name: "Alerts and Notifications", description: "" },
    { name: "Logout", description: "" }
  ];
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [logoutApi] = useLogoutMutation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    try {
      await logoutApi().unwrap();
    } catch (error) {
      // Continue with logout even if API call fails
      console.error("Logout API error:", error);
    } finally {
      // Clear all auth state
      dispatch(logout());
      
      // Clear any remaining storage
      sessionStorage.clear();
      
      // Clear cookies by setting them to expire
      document.cookie.split(";").forEach((c) => {
        document.cookie = c
          .replace(/^ +/, "")
          .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      message.success("Logged out successfully");
      
      // Force redirect to login page and prevent back navigation
      window.location.href = "/";
    }
  };

  return (
    <MainLayout>
      <main className="p-4">
        <h2 className="text-2xl font-bold mb-4">Other Settings</h2>
        <Card className="">
          <CardContent className="p-6">


            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  onClick={() => {
                    if (item.name === "Channel Partner ID (Optional)") navigate("/others/channel-partner-id");
                    else if (item.name === "Alerts and Notifications") navigate("/others/alerts-notifications");
                    else if (item.name === "Logout") setShowLogoutModal(true);
                  }}
                  className="p-4 rounded-lg border hover:bg-muted cursor-pointer flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    )}
                  </div>
                  <ChevronRight className="text-muted-foreground" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {showLogoutModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-[380px] p-6 space-y-5 animate-in fade-in">
              <h2 className="text-xl font-semibold text-center">Confirm Logout</h2>
              <p className="text-sm text-muted-foreground text-center">
                Are you sure you want to logout from your account?
              </p>

              <div className="flex justify-end gap-4">
                <button
                  className="px-6 py-2 rounded-md border hover:bg-muted"
                  onClick={() => setShowLogoutModal(false)}
                >
                  Cancel
                </button>

                <button
                  className="px-6 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </MainLayout>
  );
}
