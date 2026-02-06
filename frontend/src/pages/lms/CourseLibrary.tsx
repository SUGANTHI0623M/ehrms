import { useState, useEffect, useRef } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search,
  Grid,
  List,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  X,
  Clock,
  Upload,
  FileText,
  Plus,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import UploadVideo from "./UploadVideo";
import { useGetCoursesQuery, useCreateCourseMutation } from "@/store/api/lmsApi";
import { format } from "date-fns";
import { message } from "antd";

const formatDuration = (seconds?: number) => {
  if (!seconds) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VideoLibrary = () => {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");

  // Sync search with URL query params
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const navigate = useNavigate();

  const { data: coursesData, isLoading } = useGetCoursesQuery({
    search: searchQuery || undefined,
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    page: 1,
    limit: 50
  });
  const [createCourse, { isLoading: isCreating }] = useCreateCourseMutation();

  const courses = coursesData?.data?.courses || [];
  const [courseData, setCourseData] = useState({
    courseName: "",
    courseType: "",
    description: "",
    category: "",
    price: "",
    duration: "",
    imageFile: null as File | null,
    pdfFile: null as File | null,
    lessons: [{
      title: "",
      description: "",
      duration: "",
      videoFile: null as File | null,
      subtitleFile: null as File | null,
      pdfFile: null as File | null,
      qa: [{
        question: "",
        options: ["", ""],
        correctAnswer: "",
      }]
    }],
    status: "draft" as "draft" | "published",
  });

  const handleFileUpload = (field: string, file: File | null) => {
    setCourseData(prev => ({ ...prev, [field]: file }));
  };

  const handleLessonFileUpload = (lessonIndex: number, field: string, file: File | null) => {
    setCourseData(prev => ({
      ...prev,
      lessons: prev.lessons.map((lesson, idx) =>
        idx === lessonIndex ? { ...lesson, [field]: file } : lesson
      )
    }));
  };

  const addLesson = () => {
    setCourseData(prev => ({
      ...prev,
      lessons: [...prev.lessons, {
        title: "",
        description: "",
        duration: "",
        videoFile: null,
        subtitleFile: null,
        pdfFile: null,
        qa: [{
          question: "",
          options: ["", ""],
          correctAnswer: "",
        }]
      }]
    }));
  };

  const removeLesson = (index: number) => {
    setCourseData(prev => ({
      ...prev,
      lessons: prev.lessons.filter((_, idx) => idx !== index)
    }));
  };

  const addQA = (lessonIndex: number) => {
    setCourseData(prev => ({
      ...prev,
      lessons: prev.lessons.map((lesson, idx) =>
        idx === lessonIndex ? {
          ...lesson,
          qa: [...lesson.qa, { question: "", options: ["", ""], correctAnswer: "" }]
        } : lesson
      )
    }));
  };

  const removeQA = (lessonIndex: number, qaIndex: number) => {
    setCourseData(prev => ({
      ...prev,
      lessons: prev.lessons.map((lesson, idx) =>
        idx === lessonIndex ? {
          ...lesson,
          qa: lesson.qa.filter((_, qIdx) => qIdx !== qaIndex)
        } : lesson
      )
    }));
  };

  const handleInputChange = (field: string, value: string) => {
    setCourseData(prev => ({ ...prev, [field]: value }));
  };

  const handleLessonInputChange = (lessonIndex: number, field: string, value: string) => {
    setCourseData(prev => ({
      ...prev,
      lessons: prev.lessons.map((lesson, idx) =>
        idx === lessonIndex ? { ...lesson, [field]: value } : lesson
      )
    }));
  };

  const handleQAInputChange = (lessonIndex: number, qaIndex: number, field: string, value: string | string[]) => {
    setCourseData(prev => ({
      ...prev,
      lessons: prev.lessons.map((lesson, idx) =>
        idx === lessonIndex ? {
          ...lesson,
          qa: lesson.qa.map((qa, qIdx) =>
            qIdx === qaIndex ? { ...qa, [field]: value } : qa
          )
        } : lesson
      )
    }));
  };

  const handleAddOption = (lessonIndex: number, qaIndex: number) => {
    setCourseData(prev => ({
      ...prev,
      lessons: prev.lessons.map((lesson, idx) =>
        idx === lessonIndex ? {
          ...lesson,
          qa: lesson.qa.map((qa, qIdx) =>
            qIdx === qaIndex ? {
              ...qa,
              options: [...qa.options, ""]
            } : qa
          )
        } : lesson
      )
    }));
  };

  const handleOptionChange = (lessonIndex: number, qaIndex: number, optionIndex: number, value: string) => {
    setCourseData(prev => ({
      ...prev,
      lessons: prev.lessons.map((lesson, idx) =>
        idx === lessonIndex ? {
          ...lesson,
          qa: lesson.qa.map((qa, qIdx) =>
            qIdx === qaIndex ? {
              ...qa,
              options: qa.options.map((opt, oIdx) =>
                oIdx === optionIndex ? value : opt
              )
            } : qa
          )
        } : lesson
      )
    }));
  };

  const handleSubmit = async () => {
    try {
      await createCourse({
        title: courseData.courseName,
        description: courseData.description,
        category: courseData.category,
        status: courseData.status === "published" ? "published" : "draft",
        duration: courseData.duration ? parseInt(courseData.duration) : undefined,
        tags: courseData.category ? [courseData.category] : []
      }).unwrap();
      
      message.success("Course created successfully!");
      setCourseModalOpen(false);
      setCurrentStep(1);
      // Reset form
      setCourseData({
        courseName: "",
        courseType: "",
        description: "",
        category: "",
        price: "",
        duration: "",
        imageFile: null,
        pdfFile: null,
        lessons: [{
          title: "",
          description: "",
          duration: "",
          videoFile: null,
          subtitleFile: null,
          pdfFile: null,
          qa: [{
            question: "",
            options: ["", ""],
            correctAnswer: "",
          }]
        }],
        status: "draft",
      });
    } catch (error: any) {
      message.error(error?.data?.error?.message || "Failed to create course");
    }
  };

  const nextStep = () => {
    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  return (
    <MainLayout>
      <main className="p-3 sm:p-4">
        <div className="space-y-6">
          {/* TOP HEADER */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                Course Library
              </h2>
            </div>

            {/* 🔹 Course Creation Modal */}
            <Dialog open={courseModalOpen} onOpenChange={setCourseModalOpen}>
              <Button
                className="gradient-primary w-full sm:w-auto"
                onClick={() => setCourseModalOpen(true)}
              >
                Add New Course
              </Button>

              <DialogContent className="max-w-4xl w-full p-0 overflow-y-auto max-h-[90vh] rounded-lg">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                  <DialogTitle className="text-xl font-bold">
                    {currentStep === 1 && "Course Details"}
                    {currentStep === 2 && "Manage Lessons"}
                    {currentStep === 3 && "Review & Publish"}
                  </DialogTitle>
                  <DialogDescription>
                    Step {currentStep} of 3
                  </DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-6">
                  {/* Step 1: Course Details */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="courseName" className="text-sm font-medium">
                            * Course Name
                          </Label>
                          <Input
                            id="courseName"
                            placeholder="Enter course name"
                            value={courseData.courseName}
                            onChange={(e) => handleInputChange("courseName", e.target.value)}
                            maxLength={60}
                            className="mt-1"
                          />
                          <div className="text-xs text-muted-foreground mt-1 text-right">
                            {courseData.courseName.length} / 60
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="courseType" className="text-sm font-medium">
                            * Course Type
                          </Label>
                          <Select
                            value={courseData.courseType}
                            onValueChange={(value) => handleInputChange("courseType", value)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select course type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="video">Video Course</SelectItem>
                              <SelectItem value="interactive">Interactive Course</SelectItem>
                              <SelectItem value="text">Text-based Course</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="description" className="text-sm font-medium">
                            * Description
                          </Label>
                          <Textarea
                            id="description"
                            placeholder="Enter course description"
                            value={courseData.description}
                            onChange={(e) => handleInputChange("description", e.target.value)}
                            maxLength={300}
                            className="mt-1 min-h-[100px]"
                          />
                          <div className="text-xs text-muted-foreground mt-1 text-right">
                            {courseData.description.length} / 300
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="category" className="text-sm font-medium">
                              * Category
                            </Label>
                            <Select
                              value={courseData.category}
                              onValueChange={(value) => handleInputChange("category", value)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="programming">Programming</SelectItem>
                                <SelectItem value="design">Design</SelectItem>
                                <SelectItem value="business">Business</SelectItem>
                                <SelectItem value="marketing">Marketing</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label htmlFor="price" className="text-sm font-medium">
                              * Price
                            </Label>
                            <Input
                              id="price"
                              type="number"
                              placeholder="Enter price"
                              value={courseData.price}
                              onChange={(e) => handleInputChange("price", e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="duration" className="text-sm font-medium">
                            * Duration (in minutes)
                          </Label>
                          <Input
                            id="duration"
                            type="number"
                            placeholder="Enter course duration"
                            value={courseData.duration}
                            onChange={(e) => handleInputChange("duration", e.target.value)}
                            className="mt-1"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium flex items-center gap-1">
                              Upload Course Image <span className="text-xs">Ⓐ</span>
                            </Label>
                            <div className="mt-1">
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <Plus className="w-8 h-8 text-muted-foreground mb-2" />
                                  <p className="text-sm text-muted-foreground">Upload Image</p>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handleFileUpload("imageFile", e.target.files?.[0] || null)}
                                />
                              </label>
                            </div>
                          </div>

                          <div>
                            <Label className="text-sm font-medium flex items-center gap-1">
                              Upload Course PDF <span className="text-xs">Ⓑ</span>
                            </Label>
                            <div className="mt-1">
                              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <FileText className="w-8 h-8 text-muted-foreground mb-2" />
                                  <p className="text-sm text-muted-foreground">Upload PDF</p>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf"
                                  onChange={(e) => handleFileUpload("pdfFile", e.target.files?.[0] || null)}
                                />
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Manage Lessons */}
                  {currentStep === 2 && (
                    <div className="space-y-6">
                      {courseData.lessons.map((lesson, lessonIndex) => (
                        <div key={lessonIndex} className="border rounded-lg p-4 space-y-4">
                          <div className="flex justify-between items-center">
                            <h3 className="font-semibold">Lesson {lessonIndex + 1}</h3>
                            {courseData.lessons.length > 1 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeLesson(lessonIndex)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>

                          <div>
                            <Label htmlFor={`lesson-title-${lessonIndex}`} className="text-sm font-medium">
                              Lesson Title
                            </Label>
                            <Input
                              id={`lesson-title-${lessonIndex}`}
                              placeholder="Enter lesson title"
                              value={lesson.title}
                              onChange={(e) => handleLessonInputChange(lessonIndex, "title", e.target.value)}
                              maxLength={500}
                              className="mt-1"
                            />
                            <div className="text-xs text-muted-foreground mt-1 text-right">
                              {lesson.title.length} / 500
                            </div>
                          </div>

                          <div>
                            <Label htmlFor={`lesson-description-${lessonIndex}`} className="text-sm font-medium">
                              Lesson Description
                            </Label>
                            <Textarea
                              id={`lesson-description-${lessonIndex}`}
                              placeholder="Enter lesson description"
                              value={lesson.description}
                              onChange={(e) => handleLessonInputChange(lessonIndex, "description", e.target.value)}
                              className="mt-1 min-h-[80px]"
                            />
                          </div>

                          <div>
                            <Label htmlFor={`lesson-duration-${lessonIndex}`} className="text-sm font-medium">
                              Duration (minutes)
                            </Label>
                            <Input
                              id={`lesson-duration-${lessonIndex}`}
                              type="number"
                              placeholder="Enter duration"
                              value={lesson.duration}
                              onChange={(e) => handleLessonInputChange(lessonIndex, "duration", e.target.value)}
                              max={1500}
                              className="mt-1"
                            />
                            <div className="text-xs text-muted-foreground mt-1 text-right">
                              {lesson.duration} / 1500
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-sm font-medium">Upload Videos</Label>
                              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mt-1">
                                <div className="flex flex-col items-center justify-center p-4">
                                  <Upload className="w-6 h-6 text-muted-foreground mb-1" />
                                  <p className="text-xs text-muted-foreground">Upload Videos</p>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="video/*"
                                  onChange={(e) => handleLessonFileUpload(lessonIndex, "videoFile", e.target.files?.[0] || null)}
                                />
                              </label>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">Subtitle Files (.vtt)</Label>
                              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mt-1">
                                <div className="flex flex-col items-center justify-center p-4">
                                  <FileText className="w-6 h-6 text-muted-foreground mb-1" />
                                  <p className="text-xs text-muted-foreground">Upload Subtitles</p>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".vtt"
                                  onChange={(e) => handleLessonFileUpload(lessonIndex, "subtitleFile", e.target.files?.[0] || null)}
                                />
                              </label>
                            </div>

                            <div>
                              <Label className="text-sm font-medium">PDF Attachments</Label>
                              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors mt-1">
                                <div className="flex flex-col items-center justify-center p-4">
                                  <FileText className="w-6 h-6 text-muted-foreground mb-1" />
                                  <p className="text-xs text-muted-foreground">Upload PDF (Max 20MB)</p>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf"
                                  onChange={(e) => handleLessonFileUpload(lessonIndex, "pdfFile", e.target.files?.[0] || null)}
                                />
                              </label>
                            </div>
                          </div>

                          {/* Q&A Section */}
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm font-medium">Q&A Section (Optional)</Label>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addQA(lessonIndex)}
                              >
                                <Plus className="h-4 w-4 mr-2" /> Add Q&A
                              </Button>
                            </div>

                            {lesson.qa.map((qa, qaIndex) => (
                              <div key={qaIndex} className="border rounded-lg p-4 space-y-4">
                                <div className="flex justify-between items-center">
                                  <h4 className="font-medium">Q&A {qaIndex + 1}</h4>
                                  {lesson.qa.length > 1 && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeQA(lessonIndex, qaIndex)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>

                                <div>
                                  <Label htmlFor={`qa-question-${lessonIndex}-${qaIndex}`} className="text-sm font-medium">
                                    * Question
                                  </Label>
                                  <Input
                                    id={`qa-question-${lessonIndex}-${qaIndex}`}
                                    placeholder="Enter your question..."
                                    value={qa.question}
                                    onChange={(e) => handleQAInputChange(lessonIndex, qaIndex, "question", e.target.value)}
                                    maxLength={500}
                                    className="mt-1"
                                  />
                                  <div className="text-xs text-muted-foreground mt-1 text-right">
                                    {qa.question.length} / 500
                                  </div>
                                </div>

                                <div>
                                  <Label className="text-sm font-medium">Options *</Label>
                                  <div className="space-y-2 mt-1">
                                    {qa.options.map((option, optionIndex) => (
                                      <div key={optionIndex} className="flex gap-2">
                                        <Input
                                          placeholder={`Option ${optionIndex + 1}`}
                                          value={option}
                                          onChange={(e) => handleOptionChange(lessonIndex, qaIndex, optionIndex, e.target.value)}
                                          maxLength={500}
                                        />
                                      </div>
                                    ))}
                                    <div className="text-xs text-muted-foreground text-right">
                                      {qa.options.join('').length} / 500
                                    </div>
                                  </div>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => handleAddOption(lessonIndex, qaIndex)}
                                  >
                                    <Plus className="h-4 w-4 mr-2" /> Add Option
                                  </Button>
                                </div>

                                <div>
                                  <Label htmlFor={`correct-answer-${lessonIndex}-${qaIndex}`} className="text-sm font-medium">
                                    * Correct Answer
                                  </Label>
                                  <Select
                                    value={qa.correctAnswer}
                                    onValueChange={(value) => handleQAInputChange(lessonIndex, qaIndex, "correctAnswer", value)}
                                  >
                                    <SelectTrigger className="mt-1">
                                      <SelectValue placeholder="Select correct answer" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {qa.options.map((option, idx) => (
                                        <SelectItem key={idx} value={option || `option-${idx}`}>
                                          {option ? `Option ${idx + 1}` : `Option ${idx + 1} (empty)`}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <Button
                        type="button"
                        variant="outline"
                        onClick={addLesson}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" /> Add Lesson
                      </Button>
                    </div>
                  )}

                  {/* Step 3: Review & Publish */}
                  {currentStep === 3 && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg">Review Course Details</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Course Name</Label>
                            <p className="font-medium mt-1">{courseData.courseName || "Not provided"}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Course Type</Label>
                            <p className="font-medium mt-1">{courseData.courseType || "Not selected"}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Category</Label>
                            <p className="font-medium mt-1">{courseData.category || "Not selected"}</p>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Price</Label>
                            <p className="font-medium mt-1">${courseData.price || "0"}</p>
                          </div>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Description</Label>
                          <p className="mt-1 text-sm">{courseData.description || "No description"}</p>
                        </div>

                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Lessons</Label>
                          <div className="mt-2 space-y-2">
                            {courseData.lessons.map((lesson, idx) => (
                              <div key={idx} className="border rounded-lg p-3">
                                <p className="font-medium">Lesson {idx + 1}: {lesson.title || "Untitled"}</p>
                                <p className="text-sm text-muted-foreground mt-1">Duration: {lesson.duration || "0"} minutes</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label className="text-sm font-medium">Publish Status</Label>
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant={courseData.status === "draft" ? "default" : "outline"}
                            onClick={() => handleInputChange("status", "draft")}
                            className="flex-1"
                          >
                            Save as Draft
                          </Button>
                          <Button
                            type="button"
                            variant={courseData.status === "published" ? "default" : "outline"}
                            onClick={() => handleInputChange("status", "published")}
                            className="flex-1"
                          >
                            Publish Now
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex justify-between pt-6 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={currentStep === 1 ? () => setCourseModalOpen(false) : prevStep}
                    >
                      {currentStep === 1 ? "Cancel" : "Back"}
                    </Button>

                    <div className="flex gap-2">
                      {currentStep === 3 ? (
                        <Button
                          type="button"
                          onClick={handleSubmit}
                          className="gradient-primary"
                        >
                          {courseData.status === "draft" ? "Save as Draft" : "Create Course"}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={nextStep}
                          className="gradient-primary"
                        >
                          Next
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* 🔹 Original Upload Video Modal */}
            <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
              <DialogContent className="max-w-5xl w-full p-0 overflow-y-auto max-h-[90vh] rounded-lg">
                <DialogHeader className="px-6 pt-6">
                  <DialogTitle className="text-xl font-bold">
                    Upload Video Lesson
                  </DialogTitle>
                </DialogHeader>
                <div className="p-6">
                  <UploadVideo onClose={() => setUploadModalOpen(false)} />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* FILTERS / SEARCH SECTION */}
          <Card className="border-border/50">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search courses..." 
                    className={`pl-10 w-full ${searchQuery ? "pr-10" : ""}`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                      onClick={() => {
                        setSearchQuery("");
                        setSearchParams((prevParams) => {
                          const newParams = new URLSearchParams(prevParams);
                          newParams.delete("search");
                          return newParams;
                        }, { replace: true });
                      }}
                      aria-label="Clear search"
                    >
                      <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </Button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 justify-end w-full md:w-auto">
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full sm:w-[150px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="Programming">Programming</SelectItem>
                      <SelectItem value="Design">Design</SelectItem>
                      <SelectItem value="Business">Business</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select defaultValue="all">
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex border rounded-lg overflow-hidden">
                    <Button
                      variant={viewMode === "grid" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setViewMode("grid")}
                      className="flex-1"
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "table" ? "default" : "ghost"}
                      size="icon"
                      onClick={() => setViewMode("table")}
                      className="flex-1"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DISPLAY GRID / TABLE */}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading courses...</div>
          ) : courses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No courses found</div>
          ) : viewMode === "grid" ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {courses.map((course) => (
                <Card
                  key={course._id}
                  className="group overflow-hidden border-border/50 hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => navigate(`/course/${course.title}`)}
                >
                  <div className="relative aspect-video overflow-hidden bg-muted">
                    {course.thumbnail ? (
                      <img src={course.thumbnail} className="object-cover w-full h-full group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <FileText className="w-12 h-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-sm line-clamp-2">{course.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{course.category}</p>
                    {course.duration && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDuration(course.duration)}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-4 font-medium">Thumbnail</th>
                        <th className="text-left p-4 font-medium">Title</th>
                        <th className="text-left p-4 font-medium">Duration</th>
                        <th className="text-left p-4 font-medium">Category</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Date Added</th>
                        <th className="text-left p-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((course) => (
                        <tr
                          key={course._id}
                          className="border-t hover:bg-muted/30 cursor-pointer"
                          onClick={() => navigate(`/course/${course.title}`)}
                        >
                          <td className="p-4">
                            {course.thumbnail ? (
                              <img src={course.thumbnail} className="w-20 h-12 object-cover rounded" />
                            ) : (
                              <div className="w-20 h-12 flex items-center justify-center bg-muted rounded">
                                <FileText className="w-6 h-6 text-muted-foreground" />
                              </div>
                            )}
                          </td>
                          <td className="p-4 font-medium">{course.title}</td>
                          <td className="p-4">{course.duration ? formatDuration(course.duration) : "N/A"}</td>
                          <td className="p-4">{course.category || "N/A"}</td>
                          <td className="p-4">
                            <Badge variant={course.status === "published" ? "default" : "secondary"}>
                              {course.status || "draft"}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {course.createdAt ? format(new Date(course.createdAt), "MMM dd, yyyy") : "N/A"}
                          </td>
                          <td className="p-4" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Implement edit
                                }}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                {course.status === "draft" && (
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Implement publish
                                  }}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    Publish
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // TODO: Implement delete
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </MainLayout>
  );
};

export default VideoLibrary;