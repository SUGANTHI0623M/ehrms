import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";
import ExotelSetupConfig from "./components/ExotelSetupConfig";

const ExotelConfig = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/integrations")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Integrations
          </Button>
        </div>
        <ExotelSetupConfig
          onSuccess={() => {
            // Configuration updated successfully
          }}
        />
      </main>
    </MainLayout>
  );
};

export default ExotelConfig;

