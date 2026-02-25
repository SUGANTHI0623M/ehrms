import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetStaffCustomFieldsQuery } from "@/store/api/settingsApi";

const getDefaultDescription = (category: string): string => {
  const descriptions: { [key: string]: string } = {
    "Profile Information": "Salary Cycle, Salary Access",
    "General Information": "Email, Gender, Date of Birth, Marital Status, Blood Group, Emergency Contact, Father's Name, Mother's Name, Spouse's Name, Physically Challenged",
    "Personal Information": "Gender, Date of Birth, Address",
    "Employment Information": "Staff ID, Date of Joining, Department, Designation",
    "Bank Details": "Name of Bank, IFSC Code, Account Number, Name of Account Holder, UPI ID",
    "Custom": "Custom fields"
  };
  return descriptions[category] || "No fields configured";
};

export default function StaffDetails() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetStaffCustomFieldsQuery();
  const groupedFields = data?.data?.groupedFields || {};

  return (
    <MainLayout>
      <main className="p-4 space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
          <div className="flex items-center gap-3">
            <Button

              size="icon"
          
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-xl md:text-2xl font-bold">Staff Details</h2>
          </div>

          <Button variant="outline" className="flex gap-2 w-full md:w-auto">
            📄 Bulk Upload Details
          </Button>
        </div>

        <Card className="p-6 flex justify-between items-center">
          <p className="font-semibold text-lg">Custom Fields</p>
          <Button>Add Field</Button>
        </Card>

        {isLoading ? (
          <Card className="p-6">
            <p className="text-muted-foreground">Loading...</p>
          </Card>
        ) : (
          <>
            {Object.entries(groupedFields).map(([category, fields]) => (
              <Card key={category} className="p-6 cursor-pointer hover:bg-muted/40 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{category}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {fields.length > 0 
                        ? fields.map(f => f.label).join(", ")
                        : getDefaultDescription(category)
                      }
                    </p>
                  </div>
                  {fields.length > 0 && (
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {fields.length} field{fields.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </Card>
            ))}
            
            {/* Default categories if no custom fields */}
            {Object.keys(groupedFields).length === 0 && (
              <>
                <Card className="p-6 cursor-pointer hover:bg-muted/40 transition">
                  <p className="font-semibold text-lg">Profile Information</p>
                  <p className="text-sm text-muted-foreground mt-1">Salary Cycle, Salary Access</p>
                </Card>

                <Card className="p-6 cursor-pointer hover:bg-muted/40 transition">
                  <p className="font-semibold text-lg">General Information</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Email, Gender, Date of Birth, Marital Status, Blood Group, Emergency Contact, Father's Name,
                    Mother's Name, Spouse's Name, Physically Challenged
                  </p>
                </Card>

                <Card className="p-6 cursor-pointer hover:bg-muted/40 transition">
                  <p className="font-semibold text-lg">Personal Information</p>
                  <p className="text-sm text-muted-foreground mt-1">Gender, Date of Birth, Address</p>
                </Card>

                <Card className="p-6 cursor-pointer hover:bg-muted/40 transition">
                  <p className="font-semibold text-lg">Employment Information</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Staff ID, Date of Joining, Department, Designation
                  </p>
                </Card>

                <Card className="p-6 cursor-pointer hover:bg-muted/40 transition mb-8">
                  <p className="font-semibold text-lg">Bank Details</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Name of Bank, IFSC Code, Account Number, Name of Account Holder, UPI ID
                  </p>
                </Card>
              </>
            )}
          </>
        )}
      </main>
    </MainLayout>
  );
}
