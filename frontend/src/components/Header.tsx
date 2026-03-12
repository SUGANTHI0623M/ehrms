import { useNavigate } from "react-router-dom";
import { Menu, User } from "lucide-react";
import { Button } from "./ui/button";
import NotificationCenter from "./NotificationCenter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "./ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { useLogoutMutation } from "@/store/api/authApi";
import { message } from "antd";
import { getProfileRoute } from "@/utils/roleUtils";
import { useEffect, useState } from "react";

const Header = ({ onMenuClick, collapsed = false }: { onMenuClick: () => void; collapsed?: boolean }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const [logoutApi] = useLogoutMutation();
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Load user avatar from localStorage on mount and when user changes
  useEffect(() => {
    const loadUserAvatar = () => {
      try {
        const storedAvatar = localStorage.getItem('userAvatar');
        if (storedAvatar) {
          setUserAvatar(storedAvatar);
        } else {
          setUserAvatar(null);
        }
      } catch (error) {
        console.error('Error loading user avatar from localStorage:', error);
        setUserAvatar(null);
      }
    };

    loadUserAvatar();

    // Listen for storage changes (when avatar is updated in other tabs/components)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'userAvatar') {
        setUserAvatar(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom event for same-tab updates
    const handleAvatarUpdate = () => {
      loadUserAvatar();
    };
    
    window.addEventListener('userAvatarUpdated', handleAvatarUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userAvatarUpdated', handleAvatarUpdate);
    };
  }, [user]);

  const handleLogout = async () => {
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
    <>
      <header className={`top-header fixed top-0 right-0 left-0 h-14 sm:h-16 bg-card border-b border-border flex items-center justify-between px-3 sm:px-4 md:px-6 z-[100] transition-all ${
        collapsed ? 'lg:left-20' : 'lg:left-64'
      }`}>
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Sidebar Toggle - Mobile and Desktop */}
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
          <NotificationCenter />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-primary/10 p-0"
              >
                {userAvatar ? (
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                    <AvatarImage src={userAvatar} alt={user?.name || "User"} />
                    <AvatarFallback className="bg-primary/20 text-primary">
                      {user?.name?.charAt(0)?.toUpperCase() || <User className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-primary/20 flex items-center justify-center">
                    {user?.name ? (
                      <span className="text-primary font-semibold text-sm sm:text-base">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    ) : (
                      <User className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    )}
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-48 z-[110]"
            >
              <DropdownMenuItem
                onClick={() => {
                  const profileRoute = user
                    ? getProfileRoute(user.role)
                    : "/profile";
                  navigate(profileRoute);
                }}
              >
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
};

export default Header;
