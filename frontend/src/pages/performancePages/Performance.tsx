import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Star, Calendar, FileText, Award } from "lucide-react";
import MainLayout from "@/components/MainLayout";

const Performance = () => {
  const upcomingReviews = [
    { id: 1, employee: "Rahul Sharma", position: "Senior Developer", date: "2024-12-05", type: "Quarterly" },
    { id: 2, employee: "Priya Patel", position: "HR Manager", date: "2024-12-08", type: "Annual" },
    { id: 3, employee: "Amit Kumar", position: "Designer", date: "2024-12-12", type: "Quarterly" },
  ];

  const performanceScores = [
    {
      id: 1,
      employee: "Rahul Sharma",
      position: "Senior Developer",
      department: "Development",
      overallScore: 9.2,
      technical: 9.5,
      communication: 8.8,
      leadership: 9.0,
      lastReview: "2024-09-15"
    },
    {
      id: 2,
      employee: "Priya Patel",
      position: "HR Manager",
      department: "HR",
      overallScore: 8.5,
      technical: 8.0,
      communication: 9.2,
      leadership: 8.8,
      lastReview: "2024-08-20"
    },
    {
      id: 3,
      employee: "Amit Kumar",
      position: "Designer",
      department: "Marketing",
      overallScore: 8.8,
      technical: 9.0,
      communication: 8.5,
      leadership: 8.5,
      lastReview: "2024-10-10"
    },
  ];

  const topPerformers = [
    { name: "Rahul Sharma", score: 9.2, department: "Development" },
    { name: "Amit Kumar", score: 8.8, department: "Marketing" },
    { name: "Priya Patel", score: 8.5, department: "HR" },
  ];

  return (
    <MainLayout>
      <main className="p-3 sm:p-6">
        <div className="mx-auto space-y-6">

          {/* HEADER */}
          <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              Performance Dashboard
            </h1>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto">
                <FileText className="w-4 h-4 mr-2" /> Generate Report
              </Button>
              <Button className="w-full sm:w-auto">
                <Calendar className="w-4 h-4 mr-2" /> Schedule Review
              </Button>
            </div>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg Score</CardTitle>
                <Star className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">8.4/10</div>
                <p className="text-xs text-success mt-1">+0.3 from last quarter</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Reviews</CardTitle>
                <Calendar className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">3</div>
                <p className="text-xs text-muted-foreground mt-1">Next 7 days</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Completed Reviews</CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">24</div>
                <p className="text-xs text-muted-foreground mt-1">This quarter</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Top Performers</CardTitle>
                <Award className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">12</div>
                <p className="text-xs text-success mt-1">Score &gt; 9.0</p>
              </CardContent>
            </Card>
          </div>

          {/* MAIN CONTENT */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* left 2/3 */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Performance Scorecards</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceScores.map((score) => (
                    <div key={score.id} className="p-4 border border-border rounded-lg space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-foreground">{score.employee}</h3>
                          <p className="text-sm text-muted-foreground">{score.position} · {score.department}</p>
                          <p className="text-xs text-muted-foreground mt-1">Last Review: {score.lastReview}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-foreground">{score.overallScore}</div>
                          <Badge variant="default">Overall</Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Technical</p>
                          <Progress value={score.technical * 10} className="h-2" />
                          <p className="text-sm font-medium text-foreground">{score.technical}/10</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Communication</p>
                          <Progress value={score.communication * 10} className="h-2" />
                          <p className="text-sm font-medium text-foreground">{score.communication}/10</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Leadership</p>
                          <Progress value={score.leadership * 10} className="h-2" />
                          <p className="text-sm font-medium text-foreground">{score.leadership}/10</p>
                        </div>
                      </div>

                      <Button variant="outline" size="sm" className="w-full">View Full Scorecard</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* right 1/3 */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Top Performers</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topPerformers.map((performer, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <div>
                        <p className="font-semibold text-foreground">{performer.name}</p>
                        <p className="text-xs text-muted-foreground">{performer.department}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-bold text-foreground">{performer.score}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Reviews</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {upcomingReviews.map((review) => (
                    <div key={review.id} className="p-3 border border-border rounded-lg space-y-2">
                      <p className="font-semibold text-sm text-foreground">{review.employee}</p>
                      <p className="text-xs text-muted-foreground">{review.position}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{review.type}</Badge>
                        <span className="text-xs text-muted-foreground">{review.date}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default Performance;
