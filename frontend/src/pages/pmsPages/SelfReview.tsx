import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Star, Save, Send, Target, Award, AlertTriangle, BookOpen } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import { useToast } from "@/hooks/use-toast";

interface Goal {
  id: string;
  title: string;
  kpi: string;
  target: string;
  progress: number;
  selfRating: number;
  achievements: string;
}

const trainingOptions = [
  "Leadership Development",
  "Technical Skills",
  "Communication Skills",
  "Project Management",
  "Time Management",
  "Domain Knowledge",
  "Soft Skills",
  "Data Analytics",
];

export default function SelfReview() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [goals, setGoals] = useState<Goal[]>([
    {
      id: "1",
      title: "Improve Code Quality",
      kpi: "Code review score",
      target: "95%",
      progress: 75,
      selfRating: 0,
      achievements: "",
    },
    {
      id: "2",
      title: "On-time Delivery",
      kpi: "Sprint completion rate",
      target: "100%",
      progress: 80,
      selfRating: 0,
      achievements: "",
    },
    {
      id: "3",
      title: "Bug Resolution",
      kpi: "Critical bugs fixed",
      target: "50 bugs",
      progress: 60,
      selfRating: 0,
      achievements: "",
    },
  ]);

  const [overallAchievements, setOverallAchievements] = useState("");
  const [challenges, setChallenges] = useState("");
  const [selectedTraining, setSelectedTraining] = useState<string[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleRating = (goalId: string, rating: number) => {
    setGoals(goals.map((g) => (g.id === goalId ? { ...g, selfRating: rating } : g)));
  };

  const handleAchievementChange = (goalId: string, value: string) => {
    setGoals(goals.map((g) => (g.id === goalId ? { ...g, achievements: value } : g)));
  };

  const handleTrainingToggle = (training: string) => {
    setSelectedTraining((prev) =>
      prev.includes(training) ? prev.filter((t) => t !== training) : [...prev, training]
    );
  };

  const handleSubmit = () => {
    setIsSubmitted(true);
    toast({
      title: "Self Review Submitted",
      description: "Your self-assessment has been locked and sent for manager review.",
    });
  };

  const averageRating = goals.reduce((sum, g) => sum + g.selfRating, 0) / goals.length || 0;

  return (
    <MainLayout>
      <main className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Button size="icon" variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold">Self Assessment</h2>
              <p className="text-sm text-muted-foreground">
                Q1 2024 Performance Review
              </p>
            </div>
          </div>
          {isSubmitted && (
            <Badge className="bg-green-500 text-white text-sm px-4 py-2">
              ✓ Submitted & Locked
            </Badge>
          )}
        </div>

        {/* Rating Summary */}
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Average Self Rating</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-3xl font-bold">{averageRating.toFixed(1)}</span>
                  <span className="text-muted-foreground">/ 5</span>
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-8 h-8 ${
                      star <= Math.round(averageRating)
                        ? "text-yellow-500 fill-yellow-500"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Goal Ratings */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Rate Your Goals
          </h3>
          {goals.map((goal) => (
            <Card key={goal.id}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h4 className="font-semibold">{goal.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      KPI: {goal.kpi} • Target: {goal.target}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Progress</p>
                      <p className="font-semibold">{goal.progress}%</p>
                    </div>
                    <Progress value={goal.progress} className="w-24 h-2" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Your Rating</Label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <Button
                        key={rating}
                        variant={goal.selfRating === rating ? "default" : "outline"}
                        size="sm"
                        disabled={isSubmitted}
                        onClick={() => handleRating(goal.id, rating)}
                        className="gap-1"
                      >
                        <Star
                          className={`w-4 h-4 ${
                            goal.selfRating >= rating ? "fill-current" : ""
                          }`}
                        />
                        {rating}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Achievements / Evidence</Label>
                  <Textarea
                    value={goal.achievements}
                    onChange={(e) => handleAchievementChange(goal.id, e.target.value)}
                    placeholder="Describe your achievements for this goal..."
                    disabled={isSubmitted}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Overall Achievements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Award className="w-5 h-5 text-primary" />
              Overall Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={overallAchievements}
              onChange={(e) => setOverallAchievements(e.target.value)}
              placeholder="List your key achievements this cycle..."
              disabled={isSubmitted}
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Challenges */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Challenges Faced
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={challenges}
              onChange={(e) => setChallenges(e.target.value)}
              placeholder="Describe challenges you faced and how you overcame them..."
              disabled={isSubmitted}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Training Needs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-5 h-5 text-primary" />
              Training Needs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {trainingOptions.map((training) => (
                <div
                  key={training}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedTraining.includes(training)
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/50"
                  } ${isSubmitted ? "opacity-50 cursor-not-allowed" : ""}`}
                  onClick={() => !isSubmitted && handleTrainingToggle(training)}
                >
                  <Checkbox
                    checked={selectedTraining.includes(training)}
                    disabled={isSubmitted}
                  />
                  <span className="text-sm">{training}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        {!isSubmitted && (
          <div className="flex justify-end gap-4">
            <Button variant="outline" className="gap-2">
              <Save className="w-4 h-4" />
              Save Draft
            </Button>
            <Button onClick={handleSubmit} className="gap-2">
              <Send className="w-4 h-4" />
              Submit Self Review
            </Button>
          </div>
        )}
      </main>
    </MainLayout>
  );
}
