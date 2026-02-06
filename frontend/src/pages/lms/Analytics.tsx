import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Trophy, Target, Clock, TrendingUp, Award, RefreshCw } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const mockLeaderboard = [
  { rank: 1, name: "Sarah Johnson", score: 95, time: "8:45", badge: "🏆" },
  { rank: 2, name: "Mike Chen", score: 92, time: "9:12", badge: "🥈" },
  { rank: 3, name: "Emma Davis", score: 88, time: "9:48", badge: "🥉" },
  { rank: 4, name: "James Wilson", score: 85, time: "10:03", badge: "" },
  { rank: 5, name: "Lisa Anderson", score: 82, time: "10:27", badge: "" },
];

const Analytics = () => {
  const userScore = 85;
  const totalQuestions = 10;
  const correctAnswers = 8;
  const wrongAnswers = 2;
  const percentage = (correctAnswers / totalQuestions) * 100;
  const passed = percentage >= 70;

  return (
    <MainLayout>
      <main className="p-3 sm:p-4">
        <div className="space-y-6">
          {/* TOP HEADER */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Score & Analytics</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" className="w-full sm:w-auto">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retake Quiz
              </Button>
            </div>
          </div>

          {/* STATS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Questions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totalQuestions}</div>
              </CardContent>
            </Card>

            <Card className="border-border/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-success/10 rounded-bl-full" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Correct Answers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">
                  {correctAnswers}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-destructive/10 rounded-bl-full" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Wrong Answers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-destructive">
                  {wrongAnswers}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-accent/10 rounded-bl-full" />
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Time Taken
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">8:45</div>
              </CardContent>
            </Card>
          </div>

          {/* MAIN GRID */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border/50 lg:col-span-2">
              <CardHeader>
                <CardTitle>Quiz Results</CardTitle>
                <CardDescription>
                  Introduction to React Hooks Assessment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4 py-6">
                  <div className="relative inline-block">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        className="text-muted"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        stroke="currentColor"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 88}`}
                        strokeDashoffset={`${
                          2 * Math.PI * 88 * (1 - percentage / 100)
                        }`}
                        className={
                          passed ? "text-success" : "text-destructive"
                        }
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center flex-col">
                      <span className="text-5xl font-bold">
                        {percentage}%
                      </span>
                      <span className="text-sm text-muted-foreground">
                        Final Score
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Badge
                      variant={passed ? "default" : "destructive"}
                      className="text-base px-6 py-2"
                    >
                      {passed ? (
                        <>
                          <Trophy className="h-4 w-4 mr-2" />
                          PASSED
                        </>
                      ) : (
                        "FAILED"
                      )}
                    </Badge>
                    {passed && (
                      <p className="text-sm text-muted-foreground">
                        Congratulations! You've successfully completed this
                        assessment.
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Target className="h-5 w-5 text-primary" />
                      <span className="font-medium">Accuracy</span>
                    </div>
                    <span className="font-bold">{percentage}%</span>
                  </div>
                  <Progress value={percentage} className="h-2" />

                  <div className="grid grid-cols-2 gap-4 pt-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Average Score
                      </p>
                      <p className="text-2xl font-bold">82%</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">
                        Your Rank
                      </p>
                      <p className="text-2xl font-bold">#4</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Performance Breakdown</CardTitle>
                <CardDescription>Detailed analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                    <span className="text-sm font-medium">Correct</span>
                    <span className="text-lg font-bold text-success">
                      {correctAnswers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10">
                    <span className="text-sm font-medium">Incorrect</span>
                    <span className="text-lg font-bold text-destructive">
                      {wrongAnswers}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-lg font-bold">
                      {totalQuestions}
                    </span>
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Time: 8:45 / 10:00</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Above average</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Badge earned</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* LEADERBOARD */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>Top performers in this quiz</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockLeaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border transition-all ${
                      entry.rank <= 3
                        ? "border-primary/50 bg-primary/5"
                        : "border-border hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted font-bold">
                        {entry.badge || entry.rank}
                      </div>
                      <div>
                        <p className="font-medium">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Completed in {entry.time}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{entry.score}%</p>
                      {entry.rank <= 3 && (
                        <Badge variant="secondary" className="text-xs">
                          Top {entry.rank}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </MainLayout>
  );
};

export default Analytics;
