import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Search, Eye, Plus, Copy, Mail, MessageCircle, CheckCircle2, X } from "lucide-react";
import MainLayout from "@/components/MainLayout";
import {
  useGetReferralCandidatesQuery,
  useGenerateReferralLinkMutation,
} from "@/store/api/referralApi";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { useToast } from "@/hooks/use-toast";
import {
  formatInterviewStatus,
  getInterviewStatusColor,
} from "@/utils/constants";
import { Pagination } from "@/components/ui/Pagination";

const ReferCandidate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAppSelector((state) => state.auth);
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10); // Default 10

  // Sync search with URL query params
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    if (urlSearch !== searchQuery) {
      setSearchQuery(urlSearch);
    }
  }, [searchParams]);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [linkCopied, setLinkCopied] = useState(false);

  const { data: candidatesData, isLoading } = useGetReferralCandidatesQuery({
    page,
    limit: pageSize,
    search: searchQuery || undefined,
  });

  const [generateLink, { isLoading: isGeneratingLink }] =
    useGenerateReferralLinkMutation();

  const candidates = candidatesData?.data?.candidates || [];
  const pagination = candidatesData?.data?.pagination;

  const handleGenerateLink = async () => {
    try {
      const result = await generateLink().unwrap();
      if (result.success && result.data.publicUrl) {
        setGeneratedLink(result.data.publicUrl);
        setIsLinkDialogOpen(true);
        toast({
          title: "Referral link generated",
          description: "Share this link to refer candidates",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error?.data?.error?.message || "Failed to generate referral link",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      setLinkCopied(true);
      toast({
        title: "Link copied",
        description: "Referral link copied to clipboard",
      });
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    if (generatedLink) {
      const message = encodeURIComponent(
        `I'm referring candidates for our company. Use this link to apply: ${generatedLink}`
      );
      window.open(`https://wa.me/?text=${message}`, "_blank");
    }
  };

  const handleShareEmail = () => {
    if (generatedLink) {
      const subject = encodeURIComponent("Referral Link - Candidate Application");
      const body = encodeURIComponent(
        `Hello,\n\nI'm referring candidates for our company. Please use this link to apply:\n\n${generatedLink}\n\nThank you!`
      );
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
    }
  };

  const getStatusColor = (status: string) => {
    return getInterviewStatusColor(status);
  };

  return (
    <MainLayout>
      <main className="p-3 sm:p-4">
        <div className="space-y-6">
          {/* HEADER */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-foreground">
              Refer a Candidate
            </h1>

            <Button onClick={handleGenerateLink} disabled={isGeneratingLink}>
              <Plus className="w-4 h-4 mr-2" />
              {isGeneratingLink ? "Generating..." : "Refer a Candidate"}
            </Button>
          </div>

          {/* REFERRAL LINK DIALOG */}
          <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Your Referral Link</DialogTitle>
                <DialogDescription>
                  Share this link with candidates to refer them. The link
                  automatically tracks you as the referrer.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Referral Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={generatedLink}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyLink}
                    >
                      {linkCopied ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    onClick={handleShareWhatsApp}
                    className="flex-1 sm:flex-none"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Share via WhatsApp
                  </Button>
                  {/* <Button
                    variant="outline"
                    onClick={handleShareEmail}
                    className="flex-1 sm:flex-none"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    Share via Email
                  </Button> */}
                  <Button
                    variant="outline"
                    onClick={handleCopyLink}
                    className="flex-1 sm:flex-none"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* REFERRAL CANDIDATES LIST */}
          <Card>
            <CardHeader>
              <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
                <CardTitle>Referral Candidates</CardTitle>

                <div className="relative w-full xl:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search candidates..."
                    className={`pl-10 ${searchQuery ? "pr-10" : ""}`}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                  {searchQuery && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                      onClick={() => {
                        setSearchQuery("");
                        setPage(1);
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
              </div>
            </CardHeader>

            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Job Referred For</TableHead>
                      <TableHead>Referred By</TableHead>
                      <TableHead>Referral Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8"
                        >
                          Loading candidates...
                        </TableCell>
                      </TableRow>
                    ) : candidates.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No referral candidates found. Generate a referral link
                          to start referring candidates.
                        </TableCell>
                      </TableRow>
                    ) : (
                      candidates.map((candidate) => (
                        <TableRow key={candidate._id}>
                          <TableCell className="font-medium">
                            {candidate.firstName} {candidate.lastName}
                          </TableCell>
                          <TableCell>{candidate.email}</TableCell>
                          <TableCell>{candidate.phone}</TableCell>
                          <TableCell>
                            {candidate.jobReferredFor ? (
                              <div>
                                <div className="font-medium">
                                  {candidate.jobReferredFor.title}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {candidate.jobReferredFor.department}
                                </div>
                              </div>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell>
                            {candidate.referredBy ? (
                              <div>
                                <div className="font-medium">
                                  {candidate.referredBy.name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {candidate.referredBy.email}
                                </div>
                              </div>
                            ) : (
                              "N/A"
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(candidate.referralDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={getStatusColor(candidate.status)}
                            >
                              {formatInterviewStatus(candidate.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                navigate(`/candidate/${candidate._id}`)
                              }
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* PAGINATION */}
              {candidatesData?.data && (
                <div className="mt-6 pt-4 border-t">
                  <Pagination
                    page={pagination?.page || page}
                    pageSize={pageSize}
                    total={pagination?.total || (candidatesData.data.candidates?.length || 0)}
                    pages={pagination?.pages || Math.ceil((pagination?.total || candidatesData.data.candidates?.length || 0) / pageSize)}
                    onPageChange={(newPage) => {
                      setPage(newPage);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    onPageSizeChange={(newSize) => {
                      setPageSize(newSize);
                      setPage(1);
                    }}
                    showPageSizeSelector={true}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </MainLayout>
  );
};

export default ReferCandidate;
