import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldX } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { getRoleDashboard } from "@/utils/roleUtils";
import MainLayout from "@/components/MainLayout";

const AccessDenied = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const handleGoBack = () => {
    if (user) {
      const dashboard = getRoleDashboard(user.role);
      navigate(dashboard);
    } else {
      navigate("/");
    }
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[60vh] p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <ShieldX className="w-16 h-16 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-muted-foreground">
              You don't have permission to access this page.
            </p>
            <p className="text-center text-sm text-muted-foreground">
              If you believe this is an error, please contact your administrator.
            </p>
            <div className="flex justify-center pt-4">
              <Button onClick={handleGoBack} variant="default">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default AccessDenied;

