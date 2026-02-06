import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, X } from "lucide-react";
import MainLayout from "@/components/MainLayout";

export default function ChannelPartnerID() {
  const [open, setOpen] = useState(true);
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  const closeModal = () => {
    setOpen(false);
    navigate(-1);
  };

  return (
    <MainLayout>
      <main className="p-4 space-y-6 ">
        {/* Back Button */}
        <Button
          size="icon"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Modal */}
        {open && (
          <div className="fixed inset-0  flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-card w-full max-w-md rounded-xl p-6 space-y-5 shadow-lg relative">

              {/* Close Icon */}
              <button
                onClick={closeModal}
                className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
              >
                {/* <X className="w-5 h-5" /> */}
              </button>

              {/* Modal Header */}
              <h2 className="text-xl font-bold">Add Channel Partner ID</h2>
              <p className="text-sm text-muted-foreground">
                Add an optional Channel Partner ID to your account.
              </p>

              {/* Input */}
              <Input
                placeholder="Channel Partner ID (optional)"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={closeModal} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={closeModal} className="w-full sm:w-auto">
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </MainLayout>
  );
}
