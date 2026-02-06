import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Brain, Edit, Trash2, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/MainLayout";

const mockQuestions = [
  {
    id: 1,
    question: "What is the primary purpose of React Hooks?",
    options: [
      "A) To replace class components",
      "B) To manage state in functional components",
      "C) To improve performance",
      "D) To handle routing",
    ],
    correct: "B",
    difficulty: "Medium",
  },
  {
    id: 2,
    question: "Which hook is used for side effects?",
    options: ["A) useState", "B) useContext", "C) useEffect", "D) useReducer"],
    correct: "C",
    difficulty: "Easy",
  },
  {
    id: 3,
    question: "What is the correct way to initialize state with useState?",
    options: [
      "A) useState = 0",
      "B) const [count] = useState(0)",
      "C) const [count, setCount] = useState(0)",
      "D) useState(count, 0)",
    ],
    correct: "C",
    difficulty: "Easy",
  },
];

const QuestionGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [difficulty, setDifficulty] = useState("all");
  const { toast } = useToast();

  const generateQuestions = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Questions generated",
        description: "5 new questions have been generated from the video content",
      });
    }, 2000);
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff) {
      case "Easy":
        return "bg-success/10 text-success";
      case "Medium":
        return "bg-warning/10 text-warning";
      case "Hard":
        return "bg-destructive/10 text-destructive";
      default:
        return "";
    }
  };

  const filteredQuestions =
    difficulty === "all"
      ? mockQuestions
      : mockQuestions.filter(
          (q) => q.difficulty.toLowerCase() === difficulty
        );

  return (
    <MainLayout>
      <main className="p-3 sm:p-4">
        <div className="space-y-6">
          {/* TOP HEADER */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Auto Question Generator
              </h2>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="border-border/50 lg:col-span-2">
              <CardHeader>
                <CardTitle>Video Selection</CardTitle>
                <CardDescription>
                  Choose a video to generate questions from
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a video" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">
                      Introduction to React Hooks
                    </SelectItem>
                    <SelectItem value="2">
                      Advanced TypeScript Patterns
                    </SelectItem>
                    <SelectItem value="3">
                      UI/UX Design Fundamentals
                    </SelectItem>
                    <SelectItem value="4">
                      Database Optimization Techniques
                    </SelectItem>
                  </SelectContent>
                </Select>

                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Video preview will appear here
                    </p>
                  </div>
                </div>

                <Button
                  className="w-full gradient-primary"
                  onClick={generateQuestions}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" />
                      Generate Questions Automatically
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  AI will analyze the video content and generate relevant
                  questions
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
                <CardDescription>Question generation overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Total Questions
                    </span>
                    <span className="font-semibold">24</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Easy</span>
                    <Badge className={getDifficultyColor("Easy")}>8</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Medium</span>
                    <Badge className={getDifficultyColor("Medium")}>12</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hard</span>
                    <Badge className={getDifficultyColor("Hard")}>4</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* GENERATED QUESTIONS LIST */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle>Generated Questions</CardTitle>
                  <CardDescription>
                    Review and edit AI-generated questions
                  </CardDescription>
                </div>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger className="w-full md:w-[180px]">
                    <SelectValue placeholder="Filter by difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredQuestions.map((q, index) => (
                  <Card key={q.id} className="border-border/50">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start gap-3">
                            <span className="font-semibold text-primary">
                              Q{index + 1}.
                            </span>
                            <p className="font-medium flex-1">
                              {q.question}
                            </p>
                            <Badge className={getDifficultyColor(q.difficulty)}>
                              {q.difficulty}
                            </Badge>
                          </div>
                          <div className="grid gap-2 pl-8">
                            {q.options.map((option) => (
                              <div
                                key={option}
                                className={`p-2 rounded border ${
                                  option.startsWith(q.correct)
                                    ? "border-success bg-success/5"
                                    : "border-border"
                                }`}
                              >
                                <span className="text-sm">{option}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2 self-end md:self-start">
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </MainLayout>
  );
};

export default QuestionGenerator;
