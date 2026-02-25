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
    <div className="space-y-4 sm:space-y-6">
      {/* Header Section */}
      <Card className="border-2">
        <CardHeader className="pb-3 sm:pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold break-words">{job.title}</h1>
                <Badge variant={getStatusColor(job.status)} className="text-xs sm:text-sm shrink-0">
                  {job.status}
                </Badge>
              </div>
              {job.jobCode && (
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Code className="w-4 h-4" />
                  <span className="font-mono text-sm">Job Code: {job.jobCode}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                {branchName && (
                  <div className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span className="break-words">{branchName}</span>
                    {branchCity && <span className="ml-1 hidden sm:inline">- {branchCity}</span>}
                  </div>
                )}
                {job.department && (
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span>{job.department}</span>
                  </div>
                )}
                {job.workplaceType && (
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3 sm:w-4 sm:h-4 shrink-0" />
                    <span>{job.workplaceType}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Information Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
                <Briefcase className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Employment Type</p>
                <p className="font-semibold text-sm sm:text-base truncate">{job.employmentType}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Open Positions</p>
                <p className="font-semibold text-sm sm:text-base">{job.numberOfPositions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
                <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Education</p>
                <p className="font-semibold text-sm sm:text-base truncate">{job.educationalQualification || "Not specified"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Experience</p>
                <p className="font-semibold text-sm sm:text-base">{formatExperience()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
                <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Salary Range</p>
                <p className="font-semibold text-sm sm:text-base truncate">{formatSalary()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {job.candidateCount !== undefined && (
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg shrink-0">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Applications</p>
                  <p className="font-semibold text-sm sm:text-base">{job.candidateCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Job Description */}
      <Card>
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
            Job Description
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="prose max-w-none prose-sm sm:prose-base">
            <p className="whitespace-pre-wrap text-foreground text-sm sm:text-base">{job.description || "No description provided."}</p>
          </div>
        </CardContent>
      </Card>

      {/* Key Responsibilities */}
      {(job as any).keyResponsibilities && (
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              Key Responsibilities
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="prose max-w-none prose-sm sm:prose-base">
              <p className="whitespace-pre-wrap text-foreground text-sm sm:text-base">{(job as any).keyResponsibilities}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Required Skills */}
      {job.skills && job.skills.length > 0 && (
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              Required Skills
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="px-2 py-1 text-xs sm:text-sm">
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
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
              Requirements
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="list-disc list-inside space-y-1.5 sm:space-y-2">
              {job.requirements.map((req, index) => (
                <li key={index} className="text-foreground text-sm sm:text-base">
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
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
              Perks & Benefits
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="prose max-w-none prose-sm sm:prose-base">
              <p className="whitespace-pre-wrap text-foreground text-sm sm:text-base">{(job as any).benefits}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Location Details */}
      {job.workplaceType !== "Remote" && (
        <Card>
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              Location Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
        <CardHeader className="pb-3 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
            {(job.minExperience !== undefined || job.maxExperience !== undefined) && (
              <div>
                <p className="text-sm text-muted-foreground">Experience Range</p>
                <p className="font-medium">{formatExperience()}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobDetailView;

