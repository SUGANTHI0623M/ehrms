import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, X } from "lucide-react";
import MainLayout from "@/components/MainLayout";

export default function EditBusinessLogo() {
  const navigate = useNavigate();
  const [preview, setPreview] = useState("");

  return (
    <MainLayout>
      <main className="p-4 flex flex-col items-center space-y-6">
        <div className="flex items-center gap-3 self-start">
          <Button
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-xl md:text-2xl font-bold">Business Logo</h2>
        </div>

        <Card className="w-full max-w-xl shadow-md">
          <CardHeader className="flex justify-between items-center pb-0">
            <CardTitle className="text-lg font-bold">Business Logo</CardTitle>
            {/* <Button
              size="icon"
              variant="ghost"
              className="rounded-full"
              onClick={() => navigate(-1)}
            >
              <X className="w-5 h-5" />
            </Button> */}
          </CardHeader>

          <CardContent className="mt-4 space-y-6">
            {preview && (
              <img
                src={preview}
                className="w-40 h-40 mx-auto object-contain rounded-md border"
              />
            )}

            <input
              type="file"
              accept="image/*"
              id="logoUpload"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPreview(URL.createObjectURL(file));
              }}
            />

            <div className="text-center">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => document.getElementById("logoUpload")?.click()}
              >
                Upload Logo
              </Button>
              <p className="text-xs text-muted-foreground mt-1">Max size: 20 MB</p>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button className="w-full sm:w-auto">Save</Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </MainLayout>
  );
}
