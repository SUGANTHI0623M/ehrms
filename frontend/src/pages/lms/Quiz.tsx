import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Clock, ChevronRight, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import MainLayout from "@/components/MainLayout";

const quizQuestions = [
  {
    id: 1,
    question: "What is the primary purpose of React Hooks?",
    options: [
      { id: "a", text: "To replace class components" },
      { id: "b", text: "To manage state in functional components" },
      { id: "c", text: "To improve performance" },
      { id: "d", text: "To handle routing" },
    ],
    correct: "b",
  },
  {
    id: 2,
    question: "Which hook is used for side effects?",
    options: [
      { id: "a", text: "useState" },
      { id: "b", text: "useContext" },
      { id: "c", text: "useEffect" },
      { id: "d", text: "useReducer" },
    ],
    correct: "c",
  },
  {
    id: 3,
    question: "What is the correct way to initialize state with useState?",
    options: [
      { id: "a", text: "useState = 0" },
      { id: "b", text: "const [count] = useState(0)" },
      { id: "c", text: "const [count, setCount] = useState(0)" },
      { id: "d", text: "useState(count, 0)" },
    ],
    correct: "c",
  },
];

const Quiz = () => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(600); // 10 minutes in seconds
  const { toast } = useToast();
  const navigate = useNavigate();

  const progress = ((currentQuestion + 1) / quizQuestions.length) * 100;
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  const handleAnswerSelect = (answerId: string) => {
    setSelectedAnswers({ ...selectedAnswers, [currentQuestion]: answerId });
  };

  const handleNext = () => {
    if (!selectedAnswers[currentQuestion]) {
      toast({
        title: "Please select an answer",
        description: "You must select an answer before proceeding",
        variant: "destructive",
      });
      return;
    }

    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    const correctCount = quizQuestions.filter(
      (q, idx) => selectedAnswers[idx] === q.correct
    ).length;

    toast({
      title: "Quiz submitted",
      description: `You answered ${correctCount} out of ${quizQuestions.length} questions correctly`,
    });

    navigate("/lms/analytics");
  };

  const question = quizQuestions[currentQuestion];
  const isLastQuestion = currentQuestion === quizQuestions.length - 1;

  return (
    <MainLayout>
      <main className="p-3 sm:p-4">
        <div className="space-y-6">
          {/* TOP HEADER */}
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Assessment
            </h2>
          </div>

          {/* SUMMARY CARDS */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Question</span>
                    <span className="font-semibold">
                      {currentQuestion + 1}/{quizQuestions.length}
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Time Remaining
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  <span className="text-2xl font-bold">
                    {minutes.toString().padStart(2, "0")}:
                    {seconds.toString().padStart(2, "0")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Answered</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                  <span className="text-2xl font-bold">
                    {Object.keys(selectedAnswers).length}/
                    {quizQuestions.length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* QUESTION CARD */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>
                  Question {currentQuestion + 1} of {quizQuestions.length}
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {Object.keys(selectedAnswers).filter(
                    (k) => Number(k) === currentQuestion
                  ).length > 0
                    ? "Answered"
                    : "Not answered"}
                </span>
              </div>
              <CardDescription className="text-base pt-4">
                {question.question}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={selectedAnswers[currentQuestion]}
                onValueChange={handleAnswerSelect}
                className="space-y-3"
              >
                {question.options.map((option) => (
                  <div
                    key={option.id}
                    className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${
                      selectedAnswers[currentQuestion] === option.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <RadioGroupItem value={option.id} id={option.id} />
                    <Label
                      htmlFor={option.id}
                      className="flex-1 cursor-pointer font-normal"
                    >
                      <span className="font-semibold mr-2">
                        {option.id.toUpperCase()}.
                      </span>
                      {option.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="flex flex-col gap-3 mt-8 pt-6 border-t sm:flex-row sm:items-center sm:justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentQuestion(Math.max(0, currentQuestion - 1))
                  }
                  disabled={currentQuestion === 0}
                  className="w-full sm:w-auto"
                >
                  Previous
                </Button>
                <div className="text-sm text-muted-foreground text-center">
                  {currentQuestion + 1} / {quizQuestions.length}
                </div>
                <Button
                  onClick={handleNext}
                  className="gradient-primary w-full sm:w-auto"
                  disabled={!selectedAnswers[currentQuestion]}
                >
                  {isLastQuestion ? "Submit Quiz" : "Next Question"}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ALERT CARD */}
          <Card className="border-border/50 bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
                Once you submit, you cannot change your answers. Make sure to
                review before submitting.
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </MainLayout>
  );
};

export default Quiz;
