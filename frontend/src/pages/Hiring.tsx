import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, CheckCircle, FileText, Calendar } from "lucide-react";
import { useGetHiringCandidatesQuery, useConvertCandidateToEmployeeMutation } from "@/store/api/hiringApi";
import { formatCandidateStatus, getCandidateStatusColor } from "@/utils/constants";
import { formatOfferStatus } from "@/utils/constants";
import { toast } from "sonner";

const Hiring = () => {
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [employeeData, setEmployeeData] = useState({
    designation: "",
    department: "",
    staffType: "Full Time" as const,
    managerId: "",
    teamLeaderId: "",
    role: "Employee",
  });

  const { data: hiringData, isLoading } = useGetHiringCandidatesQuery({ page: 1, limit: 50 });
  const [convertToEmployee, { isLoading: isConverting }] = useConvertCandidateToEmployeeMutation();

  const candidatesForHiring = hiringData?.data?.candidates || [];

  const handleConvert = async () => {
    if (!selectedCandidate) return;

    try {
      await convertToEmployee({
        candidateId: selectedCandidate,
        data: employeeData,
      }).unwrap();
      toast.success("Candidate converted to employee successfully");
      setIsConvertDialogOpen(false);
      setSelectedCandidate(null);
      setEmployeeData({
        designation: "",
        department: "",
        staffType: "Full Time",
        managerId: "",
        teamLeaderId: "",
        role: "Employee",
      });
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to convert candidate");
    }
  };

  return (
    <MainLayout>
      <main className="p-4">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Hiring Module</h1>
              <p className="text-muted-foreground mt-1">Convert candidates to employees and manage hiring process</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pending Offers</CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">3</div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting acceptance</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">This Month Hires</CardTitle>
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">2</div>
                <p className="text-xs text-success mt-1">+15% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Joinings</CardTitle>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">3</div>
                <p className="text-xs text-muted-foreground mt-1">Next 2 weeks</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Candidates Ready for Hiring</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading candidates...</div>
              ) : candidatesForHiring.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No candidates ready for hiring
                </div>
              ) : (
                <div className="space-y-3">
                  {candidatesForHiring.map((candidate) => {
                    const offer = candidate.offer;
                    return (
                      <div key={candidate._id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="space-y-1">
                          <h3 className="font-semibold text-foreground">
                            {candidate.firstName} {candidate.lastName}
                          </h3>
                          <p className="text-sm text-muted-foreground">{candidate.position}</p>
                          {offer && (
                            <p className="text-xs text-muted-foreground">
                              Expected Joining: {new Date(offer.joiningDate).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className={getCandidateStatusColor(candidate.status)}>
                            {formatCandidateStatus(candidate.status)}
                          </Badge>
                          {offer && (
                            <Badge variant="outline">
                              Offer: {formatOfferStatus(offer.status)}
                            </Badge>
                          )}
                          <Dialog open={isConvertDialogOpen && selectedCandidate === candidate._id} onOpenChange={(open) => {
                            setIsConvertDialogOpen(open);
                            if (!open) setSelectedCandidate(null);
                          }}>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedCandidate(candidate._id);
                                  setIsConvertDialogOpen(true);
                                }}
                              >
                                Convert to Employee
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Convert to Employee</DialogTitle>
                                <DialogDescription>
                                  Convert {candidate.firstName} {candidate.lastName} to an employee
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <Label htmlFor="designation">Designation *</Label>
                                  <Input
                                    id="designation"
                                    value={employeeData.designation}
                                    onChange={(e) => setEmployeeData({ ...employeeData, designation: e.target.value })}
                                    placeholder="Senior Developer"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="department">Department *</Label>
                                  <Input
                                    id="department"
                                    value={employeeData.department}
                                    onChange={(e) => setEmployeeData({ ...employeeData, department: e.target.value })}
                                    placeholder="Engineering"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="staffType">Staff Type</Label>
                                  <Select
                                    value={employeeData.staffType}
                                    onValueChange={(value: any) => setEmployeeData({ ...employeeData, staffType: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Full Time">Full Time</SelectItem>
                                      <SelectItem value="Part Time">Part Time</SelectItem>
                                      <SelectItem value="Contract">Contract</SelectItem>
                                      <SelectItem value="Intern">Intern</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="role">Role *</Label>
                                  <Select
                                    value={employeeData.role}
                                    onValueChange={(value: any) => setEmployeeData({ ...employeeData, role: value })}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Employee">Employee</SelectItem>
                                      <SelectItem value="EmployeeAdmin">Employee Admin</SelectItem>
                                      <SelectItem value="Admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <Button
                                  onClick={handleConvert}
                                  disabled={!employeeData.designation || !employeeData.department || isConverting}
                                  className="w-full"
                                >
                                  {isConverting ? "Converting..." : "Convert to Employee"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </MainLayout>
  );
};

export default Hiring;
