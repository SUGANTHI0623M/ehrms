import { useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

const JobOpenings = () => {
  const [skills, setSkills] = useState<string[]>(["React", "TypeScript"]);
  const [remoteJob, setRemoteJob] = useState(false);

  const removeSkill = (skill: string) => {
    setSkills(skills.filter((s) => s !== skill));
  };

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mx-auto space-y-6">

          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-foreground">Create Job Opening</h1>


          </div>

          {/* Job Opening Information */}
          <Card>
            <CardHeader>
              <CardTitle>Job Opening Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="posting-title">Posting Title *</Label>
                  <Input id="posting-title" placeholder="Enter job title" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department Name *</Label>
                  <Input id="department" placeholder="Enter department" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recruiters">Assigned Recruiter(s)</Label>
                  <Input id="recruiters" placeholder="Select recruiters" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hiring-manager">Hiring Manager</Label>
                  <Input id="hiring-manager" placeholder="Select hiring manager" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="positions">Number of Positions</Label>
                  <Input id="positions" type="number" defaultValue="1" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target-date">Target Due Date</Label>
                  <Input id="target-date" type="date" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date-opened">Date Opened</Label>
                  <Input id="date-opened" type="date" defaultValue="2025-11-26" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job-status">Job Opening Status</Label>
                  <Select defaultValue="in-progress">
                    <SelectTrigger id="job-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="job-type">Job Type</Label>
                  <Select defaultValue="full-time">
                    <SelectTrigger id="job-type">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full Time</SelectItem>
                      <SelectItem value="part-time">Part Time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary">Salary</Label>
                  <Input id="salary" placeholder="Enter salary range" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Work Experience</Label>
                <Input id="experience" placeholder="e.g., 2-5 years" />
              </div>

              <div className="space-y-2">
                <Label>Required Skills</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {skills.map((skill, index) => (
                    <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="ml-2">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input placeholder="Search and add skills" />
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="remote-job">Remote Job</Label>
                <Switch id="remote-job" checked={remoteJob} onCheckedChange={setRemoteJob} />
              </div>

              {!remoteJob && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City</Label>
                      <Input id="city" placeholder="Enter city" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="province">Province</Label>
                      <Input id="province" placeholder="Enter province" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="country">Country</Label>
                      <Input id="country" placeholder="Enter country" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="postal-code">Postal Code</Label>
                      <Input id="postal-code" placeholder="Enter postal code" />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Description Section */}
          <Card>
            <CardHeader>
              <CardTitle>Description Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-description">Job Description</Label>
                <Textarea id="job-description" rows={6} placeholder="Enter job description" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirements">Requirements</Label>
                <Textarea id="requirements" rows={6} placeholder="Enter requirements" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="benefits">Benefits</Label>
                <Textarea id="benefits" rows={6} placeholder="Enter benefits" />
              </div>
            </CardContent>
          </Card>

          {/* Attachment Section */}
          <Card>
            <CardHeader>
              <CardTitle>Attachment Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="job-summary">Job Summary</Label>
                <Input id="job-summary" type="file" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="others">Others</Label>
                <Input id="others" type="file" />
              </div>
            </CardContent>
          </Card>

          {/* Footer Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-4 mt-4">
            <Button variant="outline" className="w-full sm:w-auto">Cancel</Button>
            <Button variant="outline" className="w-full sm:w-auto">Save</Button>
            <Button className="w-full sm:w-auto">Save and Publish</Button>
          </div>
        </div>
      </main>
    </MainLayout>
  );
};

export default JobOpenings;
