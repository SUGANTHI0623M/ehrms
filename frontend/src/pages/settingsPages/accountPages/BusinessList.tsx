import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

export default function Businesses() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <main className="p-4 space-y-6">
        {/* Back + Title */}
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl md:text-2xl font-bold">Businesses</h1>
        </div>

        {/* Count & Add Business */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Total businesses: <b>1</b> • Total Staff: <b>69</b>
          </p>

          <Button
            className="w-full sm:w-auto"
            onClick={() => navigate("/account/add-business")}
          >
            Add New Business
          </Button>
        </div>

        {/* Business Card */}
        <div
          className="bg-white dark:bg-card border rounded-xl shadow-sm p-5 cursor-pointer hover:bg-accent/40 transition"
          onClick={() => navigate("/account/view-business")}
        >
          <h2 className="text-lg font-semibold flex flex-wrap items-center gap-2">
            ASKEVA COMMUNICATION PRIVATE LIMITED
            <span className="text-xs bg-gray-300 dark:bg-gray-700 px-2 py-1 rounded">
              Current
            </span>
          </h2>

          <div className="text-sm mt-2 text-muted-foreground flex flex-wrap gap-2">
            <span>Total Staff: <b>69</b></span>
            <span className="text-gray-400">|</span>
            <span>Deactivated Staff: <b>31</b></span>
            <span className="text-gray-400">|</span>
            <span>State: <b>Tamil Nadu</b></span>
            <span className="text-gray-400">|</span>
            <span>City: <b>Hosur</b></span>
          </div>
        </div>
      </main>
    </MainLayout>
  );
}
