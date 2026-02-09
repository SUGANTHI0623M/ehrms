import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, TrendingUp, TrendingDown, Users, Award, DollarSign, AlertCircle, Star } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useGetGoalsQuery } from "@/store/api/pmsApi";

interface PMSOutput {
  id: string;
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
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedCycle, setSelectedCycle] = useState("Q1 2024");

  const { data: goalsData, isLoading } = useGetGoalsQuery({
    cycle: selectedCycle,
    status: "completed",
    page: 1,
    limit: 100
  });

  const goals = goalsData?.data?.goals || [];

  // Calculate outputs from goals with HR reviews
  const outputs: PMSOutput[] = goals
    .filter(goal => goal.hrReview) // Only goals with HR review
    .map(goal => {
      const employee = goal.employeeId as any;
      const finalRating = goal.hrReview?.rating || goal.managerReview?.rating || 0;
      
      // Calculate recommendations
      let incrementPercent = 0;
      let bonusAmount = 0;
      let promotionFlag = false;
      let pipFlag = false;
      
      if (finalRating >= 4.5) {
        incrementPercent = 20;
        bonusAmount = 75000;
        promotionFlag = true;
      } else if (finalRating >= 4.0) {
        incrementPercent = 15;
        bonusAmount = 50000;
      } else if (finalRating >= 3.5) {
        incrementPercent = 8;
        bonusAmount = 25000;
      } else if (finalRating < 2.5) {
        incrementPercent = 0;
        bonusAmount = 0;
        pipFlag = true;
      }
      
      // Extract training needs from challenges or comments
      const trainingNeeds: string[] = [];
      if (goal.challenges) {
        trainingNeeds.push(goal.challenges);
      }
      if (goal.hrReview?.comments?.includes("training") || goal.hrReview?.comments?.includes("skill")) {
        trainingNeeds.push("Skill Development");
      }
      
      return {
        id: goal._id,
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

  const filteredOutputs = selectedDepartment === "all" 
    ? outputs 
    : outputs.filter(o => o.department === selectedDepartment);

  const departments = [...new Set(outputs.map(o => o.department))];

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
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <Select value={selectedCycle} onValueChange={setSelectedCycle}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Q1 2024">Q1 2024</SelectItem>
              <SelectItem value="Q4 2023">Q4 2023</SelectItem>
              <SelectItem value="Q3 2023">Q3 2023</SelectItem>
              <SelectItem value="Q2 2023">Q2 2023</SelectItem>
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
              <div className="text-center py-8 text-muted-foreground">Loading reports...</div>
            ) : filteredOutputs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No completed reviews found for this cycle</div>
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
      </main>
    </MainLayout>
  );
}
