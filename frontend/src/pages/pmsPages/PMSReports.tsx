import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, TrendingUp, TrendingDown, Users, Award, DollarSign, AlertCircle, Star, Edit } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetPerformanceReviewsQuery, useUpdatePerformanceReviewMutation } from "@/store/api/performanceReviewApi";
import { useGetReviewCyclesQuery } from "@/store/api/reviewCycleApi";
import { useGetStaffQuery } from "@/store/api/staffApi";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface PMSOutput {
  id: string;
  reviewId: string;
  employeeName: string;
  employeeId: string;
  department: string;
  finalRating: number;
  incrementPercent: number;
  bonusAmount: number;
  promotionFlag: boolean;
  pipFlag: boolean;
  trainingNeeds: string[];
}

export default function PMSReports() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedCycle, setSelectedCycle] = useState<string>("all");
  const [editingReview, setEditingReview] = useState<PMSOutput | null>(null);
  const [editForm, setEditForm] = useState({
    incrementPercent: 0,
    bonusAmount: 0,
    promotionFlag: false,
    pipFlag: false,
    trainingNeeds: [] as string[],
    trainingNeedsText: ""
  });
  
  const [updateReview, { isLoading: isUpdating }] = useUpdatePerformanceReviewMutation();

  // Fetch all review cycles for filter
  const { data: cyclesData } = useGetReviewCyclesQuery({ page: 1, limit: 100 });
  const cycles = cyclesData?.data?.cycles || [];
  
  // Fetch all staff to get all departments
  const { data: staffData } = useGetStaffQuery({ page: 1, limit: 1000 });
  const staff = staffData?.data?.staff || [];

  // Get unique cycle names from all cycles
  const cycleNames = useMemo(() => {
    return cycles.map((c: any) => c.name).filter(Boolean);
  }, [cycles]);
  
  // Get all departments from staff API (all available departments)
  const departments = useMemo(() => {
    const depts = new Set<string>();
    staff.forEach((s: any) => {
      if (s.department) depts.add(s.department);
    });
    return Array.from(depts).sort();
  }, [staff]);

  // Fetch completed performance reviews
  const { data: reviewsData, isLoading } = useGetPerformanceReviewsQuery({
    status: "completed",
    reviewCycle: selectedCycle !== "all" ? selectedCycle : undefined,
    page: 1,
    limit: 1000
  });

  const reviews = reviewsData?.data?.reviews || [];

  // Get outputs from completed performance reviews (use stored values, no auto-calculation)
  const outputs: PMSOutput[] = useMemo(() => {
    return reviews
      .filter((review: any) => review.finalRating && review.status === "completed")
      .map((review: any) => {
        const employee = review.employeeId as any;
        const finalRating = review.finalRating || 0;
        
        // Use stored values from review (admin sets these manually)
        const incrementPercent = review.incrementPercent ?? 0;
        const bonusAmount = review.bonusAmount ?? 0;
        const promotionFlag = review.promotionFlag ?? false;
        const pipFlag = review.pipFlag ?? false;
        const trainingNeeds = review.trainingNeeds || [];
        
        return {
          id: review._id,
          reviewId: review._id, // Store for update
          employeeName: employee?.name || "N/A",
          employeeId: employee?.employeeId || "N/A",
          department: employee?.department || "N/A",
          finalRating,
          incrementPercent,
          bonusAmount,
          promotionFlag,
          pipFlag,
          trainingNeeds
        };
      });
  }, [reviews]);

  const filteredOutputs = selectedDepartment === "all" 
    ? outputs 
    : outputs.filter(o => o.department === selectedDepartment);

  const stats = {
    avgRating: filteredOutputs.length > 0 
      ? filteredOutputs.reduce((sum, o) => sum + o.finalRating, 0) / filteredOutputs.length 
      : 0,
    avgIncrement: filteredOutputs.length > 0
      ? filteredOutputs.reduce((sum, o) => sum + o.incrementPercent, 0) / filteredOutputs.length
      : 0,
    totalBonus: filteredOutputs.reduce((sum, o) => sum + o.bonusAmount, 0),
    promotions: filteredOutputs.filter(o => o.promotionFlag).length,
    pips: filteredOutputs.filter(o => o.pipFlag).length,
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return "text-green-600";
    if (rating >= 3.5) return "text-blue-600";
    if (rating >= 2.5) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <MainLayout>
      <main className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">PMS Reports & Analytics</h2>
              <p className="text-sm text-muted-foreground">
                Performance cycle outcomes and analysis
              </p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => {
              // Export to CSV
              const headers = ["Employee Name", "Employee ID", "Department", "Final Rating", "Increment %", "Bonus (₹)", "Promotion", "PIP", "Training Needs"];
              const rows = filteredOutputs.map(o => [
                o.employeeName,
                o.employeeId,
                o.department,
                o.finalRating.toFixed(1),
                o.incrementPercent,
                o.bonusAmount,
                o.promotionFlag ? "Yes" : "No",
                o.pipFlag ? "Yes" : "No",
                o.trainingNeeds.join("; ")
              ]);
              
              const csvContent = [
                headers.join(","),
                ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
              ].join("\n");
              
              const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
              const link = document.createElement("a");
              const url = URL.createObjectURL(blob);
              link.setAttribute("href", url);
              link.setAttribute("download", `PMS_Report_${selectedCycle}_${new Date().toISOString().split('T')[0]}.csv`);
              link.style.visibility = "hidden";
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              
              toast({
                title: "Report Exported",
                description: "PMS report has been exported successfully.",
              });
            }}
          >
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={selectedCycle} onValueChange={setSelectedCycle}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select review cycle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cycles</SelectItem>
              {cycleNames.map((cycle: string) => (
                <SelectItem key={cycle} value={cycle}>
                  {cycle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-yellow-500 mb-2">
                <Star className="w-5 h-5 fill-yellow-500" />
              </div>
              <p className="text-2xl font-bold">
                {isLoading ? "..." : stats.avgRating.toFixed(1)}
              </p>
              <p className="text-xs text-muted-foreground">Avg Rating</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-green-500 mb-2">
                <TrendingUp className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">
                {isLoading ? "..." : stats.avgIncrement.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Avg Increment</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-blue-500 mb-2">
                <DollarSign className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">
                {isLoading ? "..." : `₹${(stats.totalBonus / 1000).toFixed(0)}K`}
              </p>
              <p className="text-xs text-muted-foreground">Total Bonus</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-purple-500 mb-2">
                <Award className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">
                {isLoading ? "..." : stats.promotions}
              </p>
              <p className="text-xs text-muted-foreground">Promotions</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-1 text-red-500 mb-2">
                <AlertCircle className="w-5 h-5" />
              </div>
              <p className="text-2xl font-bold">
                {isLoading ? "..." : stats.pips}
              </p>
              <p className="text-xs text-muted-foreground">PIPs</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Employee Outcomes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : filteredOutputs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No completed performance reviews found for the selected cycle.
                <p className="text-xs mt-2">Complete reviews will appear here once HR reviews are submitted.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-center">Final Rating</TableHead>
                      <TableHead className="text-center">Increment</TableHead>
                      <TableHead className="text-center">Bonus</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead>Training Needs</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOutputs.map((output) => (
                    <TableRow key={output.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{output.employeeName}</p>
                          <p className="text-xs text-muted-foreground">
                            {output.employeeId} • {output.department}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className={`flex items-center justify-center gap-1 font-bold ${getRatingColor(output.finalRating)}`}>
                          <Star className="w-4 h-4 fill-current" />
                          {output.finalRating.toFixed(1)}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          {output.incrementPercent > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          )}
                          <span className={output.incrementPercent > 0 ? "text-green-600" : "text-red-600"}>
                            {output.incrementPercent}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        ₹{output.bonusAmount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center">
                        {output.promotionFlag && (
                          <Badge className="bg-purple-500 mr-1">Promotion</Badge>
                        )}
                        {output.pipFlag && (
                          <Badge className="bg-red-500">PIP</Badge>
                        )}
                        {!output.promotionFlag && !output.pipFlag && (
                          <Badge variant="outline">Standard</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {output.trainingNeeds.length > 0 ? (
                            output.trainingNeeds.map((t, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {t}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-muted-foreground">None</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingReview(output);
                            setEditForm({
                              incrementPercent: output.incrementPercent,
                              bonusAmount: output.bonusAmount,
                              promotionFlag: output.promotionFlag,
                              pipFlag: output.pipFlag,
                              trainingNeeds: output.trainingNeeds,
                              trainingNeedsText: output.trainingNeeds.join(", ")
                            });
                          }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Push to Payroll */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h3 className="font-semibold text-lg">Auto Push to Payroll</h3>
                <p className="text-sm text-muted-foreground">
                  PMS outcomes will be automatically applied to payroll calculations
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Badge className="bg-green-500 text-white px-4 py-2">
                  ✓ Synced with Payroll
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingReview} onOpenChange={(open) => !open && setEditingReview(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit PMS Outcomes - {editingReview?.employeeName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="increment">Increment Percentage (%)</Label>
                  <Input
                    id="increment"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={editForm.incrementPercent}
                    onChange={(e) => setEditForm({ ...editForm, incrementPercent: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonus">Bonus Amount (₹)</Label>
                  <Input
                    id="bonus"
                    type="number"
                    min="0"
                    step="1000"
                    value={editForm.bonusAmount}
                    onChange={(e) => setEditForm({ ...editForm, bonusAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="promotion"
                    checked={editForm.promotionFlag}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, promotionFlag: !!checked })}
                  />
                  <Label htmlFor="promotion" className="cursor-pointer">Promotion Recommended</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="pip"
                    checked={editForm.pipFlag}
                    onCheckedChange={(checked) => setEditForm({ ...editForm, pipFlag: !!checked })}
                  />
                  <Label htmlFor="pip" className="cursor-pointer">Performance Improvement Plan (PIP)</Label>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="training">Training Needs (comma-separated)</Label>
                <Textarea
                  id="training"
                  placeholder="e.g., Skill Development, Leadership Training, Technical Certification"
                  value={editForm.trainingNeedsText}
                  onChange={(e) => setEditForm({ ...editForm, trainingNeedsText: e.target.value })}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Enter training needs separated by commas
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingReview(null)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!editingReview) return;
                  
                  try {
                    const trainingNeeds = editForm.trainingNeedsText
                      .split(",")
                      .map(t => t.trim())
                      .filter(t => t.length > 0);

                    await updateReview({
                      id: editingReview.reviewId,
                      data: {
                        incrementPercent: editForm.incrementPercent,
                        bonusAmount: editForm.bonusAmount,
                        promotionFlag: editForm.promotionFlag,
                        pipFlag: editForm.pipFlag,
                        trainingNeeds: trainingNeeds
                      }
                    }).unwrap();

                    toast({
                      title: "PMS Outcomes Updated",
                      description: `Outcomes for ${editingReview.employeeName} have been updated successfully.`,
                    });
                    setEditingReview(null);
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error?.data?.error?.message || "Failed to update PMS outcomes",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={isUpdating}
              >
                {isUpdating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </MainLayout>
  );
}
