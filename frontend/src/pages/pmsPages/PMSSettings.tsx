import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Settings, Target, Calendar, Users, Star } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";

const roles = [
  "Developer",
  "Digital Marketing",
  "BDE",
  "Tech Support",
  "Videographer",
  "Editor",
  "Photographer",
  "Coordinator",
  "Manager",
  "HR",
];

const ratingScaleOptions = [
  { value: 5, label: "Outstanding", color: "bg-green-500" },
  { value: 4, label: "Exceeds Expectations", color: "bg-blue-500" },
  { value: 3, label: "Meets Expectations", color: "bg-yellow-500" },
  { value: 2, label: "Needs Improvement", color: "bg-orange-500" },
  { value: 1, label: "Poor", color: "bg-red-500" },
];

export default function PMSSettings() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [performanceModel, setPerformanceModel] = useState("hybrid");
  const [reviewCycle, setReviewCycle] = useState("quarterly");
  const [weightage, setWeightage] = useState({
    goals: 60,
    skills: 20,
    behaviour: 20,
  });
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(1);

  const handleRoleToggle = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleWeightageChange = (field: keyof typeof weightage, value: number) => {
    const newWeightage = { ...weightage, [field]: value };
    const total = Object.values(newWeightage).reduce((a, b) => a + b, 0);
    if (total <= 100) {
      setWeightage(newWeightage);
    }
  };

  const handleSave = () => {
    toast({
      title: "PMS Configuration Saved",
      description: "Performance cycle has been activated successfully.",
    });
    navigate("/pms/my-goals");
  };

  const steps = [
    { number: 1, title: "Performance Model", icon: Target },
    { number: 2, title: "Review Cycle", icon: Calendar },
    { number: 3, title: "Weightage", icon: Settings },
    { number: 4, title: "Rating Scale", icon: Star },
    { number: 5, title: "Roles", icon: Users },
  ];

  return (
    <MainLayout>
      <main className="p-4 md:p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">PMS Setup</h2>
            <p className="text-sm text-muted-foreground">
              Configure performance management framework
            </p>
          </div>
        </div>

        {/* Steps Progress */}
        <div className="flex items-center justify-between overflow-x-auto pb-2">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`flex items-center ${index < steps.length - 1 ? "flex-1" : ""}`}
            >
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full cursor-pointer transition-all ${
                  currentStep >= step.number
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
                onClick={() => setCurrentStep(step.number)}
              >
                <step.icon className="w-5 h-5" />
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`h-1 flex-1 mx-2 ${
                    currentStep > step.number ? "bg-primary" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Performance Model */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Select Performance Model
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={performanceModel} onValueChange={setPerformanceModel}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { value: "okr", label: "OKR", desc: "Objectives & Key Results" },
                    { value: "kpi", label: "KPI", desc: "Key Performance Indicators" },
                    { value: "competency", label: "Competency", desc: "Skills & Competency Based" },
                    { value: "hybrid", label: "Hybrid", desc: "Most Common - Combined Approach" },
                  ].map((model) => (
                    <div
                      key={model.value}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        performanceModel === model.value
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setPerformanceModel(model.value)}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={model.value} id={model.value} />
                        <div>
                          <Label htmlFor={model.value} className="font-semibold cursor-pointer">
                            {model.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">{model.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Review Cycle */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Choose Review Cycle
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={reviewCycle} onValueChange={setReviewCycle}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { value: "monthly", label: "Monthly", desc: "Review every month" },
                    { value: "quarterly", label: "Quarterly", desc: "Review every 3 months" },
                    { value: "half-yearly", label: "Half-Yearly", desc: "Review every 6 months" },
                    { value: "annual", label: "Annual", desc: "Review once a year" },
                  ].map((cycle) => (
                    <div
                      key={cycle.value}
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        reviewCycle === cycle.value
                          ? "border-primary bg-primary/5"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setReviewCycle(cycle.value)}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={cycle.value} id={cycle.value} />
                        <div>
                          <Label htmlFor={cycle.value} className="font-semibold cursor-pointer">
                            {cycle.label}
                          </Label>
                          <p className="text-sm text-muted-foreground">{cycle.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Weightage */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Define Weightage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="font-medium">Total Weightage</span>
                <Badge
                  variant={
                    weightage.goals + weightage.skills + weightage.behaviour === 100
                      ? "default"
                      : "destructive"
                  }
                >
                  {weightage.goals + weightage.skills + weightage.behaviour}%
                </Badge>
              </div>

              {[
                { key: "goals", label: "Goals", icon: Target },
                { key: "skills", label: "Skills", icon: Star },
                { key: "behaviour", label: "Behaviour", icon: Users },
              ].map((item) => (
                <div key={item.key} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Label>
                    <span className="font-semibold">{weightage[item.key as keyof typeof weightage]}%</span>
                  </div>
                  <Input
                    type="range"
                    min={0}
                    max={100}
                    value={weightage[item.key as keyof typeof weightage]}
                    onChange={(e) =>
                      handleWeightageChange(item.key as keyof typeof weightage, parseInt(e.target.value))
                    }
                    className="w-full"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 4: Rating Scale */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-primary" />
                Define Rating Scale (1-5)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ratingScaleOptions.map((rating) => (
                  <div
                    key={rating.value}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full ${rating.color} flex items-center justify-center text-white font-bold`}
                      >
                        {rating.value}
                      </div>
                      <span className="font-medium">{rating.label}</span>
                    </div>
                    <Badge variant="outline">{rating.value} Stars</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Roles */}
        {currentStep === 5 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Assign Applicable Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {roles.map((role) => (
                  <div
                    key={role}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedRoles.includes(role)
                        ? "border-primary bg-primary/5"
                        : "hover:border-primary/50"
                    }`}
                    onClick={() => handleRoleToggle(role)}
                  >
                    <Checkbox
                      checked={selectedRoles.includes(role)}
                      onCheckedChange={() => handleRoleToggle(role)}
                    />
                    <span>{role}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
          >
            Previous
          </Button>
          {currentStep < 5 ? (
            <Button onClick={() => setCurrentStep((prev) => prev + 1)}>Next</Button>
          ) : (
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Save & Activate Cycle
            </Button>
          )}
        </div>
      </main>
    </MainLayout>
  );
}
