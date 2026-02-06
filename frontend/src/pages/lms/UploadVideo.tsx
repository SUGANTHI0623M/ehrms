import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Upload, Video, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import MainLayout from "@/components/MainLayout";

const UploadVideo = ({ onClose }: { onClose?: () => void }) => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (
      file &&
      (file.type === "video/mp4" ||
        file.type === "video/quicktime" ||
        file.type === "video/webm")
    ) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoPreview(url);
      simulateUpload();
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a .mp4, .mov, or .webm file",
        variant: "destructive",
      });
    }
  };

  const simulateUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = () => {
    toast({
      title: "Video saved as draft",
      description: "Your video has been saved successfully",
    });
  };

  const handlePublish = () => {
    toast({
      title: "Video published",
      description: "Your video is now available to learners",
    });
  };

  return (
        <div className="space-y-6">
          {/* MAIN GRID */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* LEFT: VIDEO UPLOAD */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Video Upload</CardTitle>
                <CardDescription>
                  Upload your video file (.mp4, .mov, .webm)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!videoFile ? (
                  <div className="border-2 border-dashed border-border rounded-lg p-10 sm:p-12 text-center hover:border-primary transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="video/mp4,video/quicktime,video/webm"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="video-upload"
                    />
                    <label htmlFor="video-upload" className="cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm font-medium">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        MP4, MOV or WEBM (max. 500MB)
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative rounded-lg overflow-hidden bg-black">
                      <video
                        src={videoPreview}
                        controls
                        className="w-full aspect-video"
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" />
                        <span className="text-sm font-medium break-all">
                          {videoFile.name}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setVideoFile(null);
                          setVideoPreview("");
                          setUploadProgress(0);
                        }}
                      >
                        Replace
                      </Button>
                    </div>
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            Uploading...
                          </span>
                          <span className="font-medium">{uploadProgress}%</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {uploadProgress === 100 && !isUploading && (
                      <div className="flex items-center gap-2 text-sm text-success">
                        <div className="h-2 w-2 rounded-full bg-success" />
                        Upload complete
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* RIGHT: VIDEO DETAILS */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Video Details</CardTitle>
                <CardDescription>
                  Add metadata and publish settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" placeholder="Enter video title" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Describe what learners will learn from this video"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="programming">Programming</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="personal">Personal Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tags</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      placeholder="Add a tag"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addTag();
                        }
                      }}
                    />
                    <Button
                      onClick={addTag}
                      variant="secondary"
                      className="w-full sm:w-auto"
                    >
                      Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label htmlFor="publish">Publish Status</Label>
                    <p className="text-xs text-muted-foreground">
                      {isPublished ? "Visible to learners" : "Save as draft"}
                    </p>
                  </div>
                  <Switch
                    id="publish"
                    checked={isPublished}
                    onCheckedChange={setIsPublished}
                  />
                </div>

                <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleSave}
                  >
                    Save Draft
                  </Button>
                  <Button
                    className="flex-1 gradient-primary"
                    onClick={handlePublish}
                  >
                    {isPublished ? "Publish" : "Save & Publish"}
                  </Button>
                </div>

                {/* 🔹 Close button for modal */}
                {onClose && (
                  <Button
                    variant="destructive"
                    className="w-full mt-2"
                    onClick={onClose}
                  >
                    Cancel / Close
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
  );
};

export default UploadVideo;
