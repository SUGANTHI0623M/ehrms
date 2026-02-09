import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Briefcase,
  MapPin,
  Building2,
  Users,
  GraduationCap,
  DollarSign,
  Clock,
  FileText,
  CheckCircle2,
  Calendar,
  Code,
  Globe,
} from "lucide-react";
import { JobOpening } from "@/store/api/jobOpeningApi";
import { format } from "date-fns";

interface JobDetailViewProps {
  job: JobOpening;
  branchName?: string;
  branchCity?: string;
  createdByName?: string;
}

const JobDetailView = ({ job, branchName, branchCity, createdByName }: JobDetailViewProps) => {
  const formatSalary = () => {
    if (!job.salaryRange) return "Not specified";
    const { min, max, salaryType, currency = "INR" } = job.salaryRange;
    if (min === 0 && max === 0) return "Not specified";
    if (min === max) {
      return `${currency} ${min.toLocaleString()} ${salaryType === "Monthly" ? "/month" : "/year"}`;
    }
    return `${currency} ${min.toLocaleString()} - ${max.toLocaleString()} ${salaryType === "Monthly" ? "/month" : "/year"}`;
  };

  const formatExperience = () => {
    if (job.minExperience !== undefined && job.maxExperience !== undefined) {
      if (job.minExperience === job.maxExperience) {
        return `${job.minExperience} ${job.minExperience === 1 ? "year" : "years"}`;
      }
      return `${job.minExperience} - ${job.maxExperience} years`;
    }
    if (job.minExperience !== undefined) {
      return `${job.minExperience}+ years`;
    }
    if (job.maxExperience !== undefined) {
      return `Up to ${job.maxExperience} years`;
    }
    return "Not specified";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "DRAFT":
        return "secondary";
      case "CLOSED":
        return "outline";
      case "CANCELLED":
        return "destructive";
      case "INACTIVE":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="border-2">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{job.title}</h1>
                <Badge variant={getStatusColor(job.status)} className="text-sm">
                  {job.status}
                </Badge>
              </div>
              {job.jobCode && (
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Code className="w-4 h-4" />
                  <span className="font-mono text-sm">Job Code: {job.jobCode}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {branchName && (
                  <div className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    <span>{branchName}</span>
                    {branchCity && <span className="ml-1">- {branchCity}</span>}
                  </div>
                )}
                {job.department && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    <span>{job.department}</span>
                  </div>
                )}
                {job.workplaceType && (
                  <div className="flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    <span>{job.workplaceType}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Briefcase className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Employment Type</p>
                <p className="font-semibold">{job.employmentType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open Positions</p>
                <p className="font-semibold">{job.numberOfPositions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <GraduationCap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Education</p>
                <p className="font-semibold">{job.educationalQualification || "Not specified"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Experience</p>
                <p className="font-semibold">{formatExperience()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Salary Range</p>
                <p className="font-semibold">{formatSalary()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {job.candidateCount !== undefined && (
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Applications</p>
                  <p className="font-semibold">{job.candidateCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Job Description */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Job Description
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose max-w-none">
            <p className="whitespace-pre-wrap text-foreground">{job.description || "No description provided."}</p>
          </div>
        </CardContent>
      </Card>

      {/* Key Responsibilities */}
      {(job as any).keyResponsibilities && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Key Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap text-foreground">{(job as any).keyResponsibilities}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Required Skills */}
      {job.skills && job.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Required Skills
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requirements */}
      {job.requirements && job.requirements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc list-inside space-y-2">
              {job.requirements.map((req, index) => (
                <li key={index} className="text-foreground">
                  {req}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Perks/Benefits */}
      {(job as any).benefits && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Perks & Benefits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none">
              <p className="whitespace-pre-wrap text-foreground">{(job as any).benefits}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Details */}
      {job.workplaceType !== "Remote" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Location Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(job as any).city && (
                <div>
                  <p className="text-sm text-muted-foreground">City</p>
                  <p className="font-medium">{(job as any).city}</p>
                </div>
              )}
              {(job as any).province && (
                <div>
                  <p className="text-sm text-muted-foreground">State/Province</p>
                  <p className="font-medium">{(job as any).province}</p>
                </div>
              )}
              {(job as any).country && (
                <div>
                  <p className="text-sm text-muted-foreground">Country</p>
                  <p className="font-medium">{(job as any).country}</p>
                </div>
              )}
              {(job as any).postalCode && (
                <div>
                  <p className="text-sm text-muted-foreground">Postal Code</p>
                  <p className="font-medium">{(job as any).postalCode}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {createdByName && (
              <div>
                <p className="text-sm text-muted-foreground">Created By</p>
                <p className="font-medium">{createdByName}</p>
              </div>
            )}
            {job.createdAt && (
              <div>
                <p className="text-sm text-muted-foreground">Created On</p>
                <p className="font-medium">{format(new Date(job.createdAt), "PPP")}</p>
              </div>
            )}
            {job.updatedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Last Updated</p>
                <p className="font-medium">{format(new Date(job.updatedAt), "PPP")}</p>
              </div>
            )}
            {job.experienceLevel && (
              <div>
                <p className="text-sm text-muted-foreground">Experience Level</p>
                <p className="font-medium">{job.experienceLevel}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobDetailView;

