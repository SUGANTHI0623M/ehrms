import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Pagination } from "@/components/ui/Pagination";
import MainLayout from "@/components/MainLayout";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Eye, Edit, Send, MoreVertical, FileText, X, User, Briefcase, Calendar, Wallet as DollarSign, ArrowRight, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useGetOffersQuery,
  useAcceptOfferMutation,
  useRejectOfferMutation,
  useMoveToOnboardingMutation,
  useCreateRevisedOfferMutation,
} from "@/store/api/offerApi";
import { formatDate, getOfferStatusColor, formatOfferStatus } from "@/utils/constants";
import { toast } from "sonner";
import { useAppSelector } from "@/store/hooks";
import { getUserPermissions, hasAction } from "@/utils/permissionUtils";

const OfferLetterList = () => {
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);
  const userPermissions = getUserPermissions(currentUser?.role, currentUser?.roleId, currentUser?.permissions);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounce search query
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setPage(1); // Reset to first page when search changes
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery]);

  // Fetch offers with search and filters
  const { data: offersData, isLoading: isLoadingOffers, error: offersError, refetch: refetchOffers } = useGetOffersQuery({
    search: debouncedSearchQuery.trim() || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
    page,
    limit: pageSize,
  });

  const [acceptOffer] = useAcceptOfferMutation();
  const [rejectOffer] = useRejectOfferMutation();
  const [moveToOnboarding, { isLoading: isMovingToOnboarding }] = useMoveToOnboardingMutation();
  const [createRevisedOffer, { isLoading: isCreatingRevision }] = useCreateRevisedOfferMutation();

  const offers = offersData?.data?.offers || [];
  const pagination = offersData?.data?.pagination;

  // Helper functions to extract data from offer
  const getCandidateName = (offer: any) => {
    if (typeof offer.candidateId === 'object' && offer.candidateId) {
      return `${offer.candidateId.firstName || ''} ${offer.candidateId.lastName || ''}`.trim();
    }
    return "N/A";
  };

  const getCandidateEmail = (offer: any) => {
    if (typeof offer.candidateId === 'object' && offer.candidateId) {
      return offer.candidateId.email || "N/A";
    }
    return "N/A";
  };

  const getCandidateStatus = (offer: any) => {
    if (typeof offer.candidateId === 'object' && offer.candidateId) {
      return offer.candidateId.status || "N/A";
    }
    return "N/A";
  };

  const getJobTitle = (offer: any) => {
    if (typeof offer.jobOpeningId === 'object' && offer.jobOpeningId) {
      return offer.jobOpeningId.title || "N/A";
    }
    if (typeof offer.candidateId === 'object' && offer.candidateId) {
      return offer.candidateId.position || "N/A";
    }
    return "N/A";
  };

  const getDepartment = (offer: any) => {
    if (offer.department) {
      return offer.department;
    }
    if (typeof offer.jobOpeningId === 'object' && offer.jobOpeningId) {
      return (offer.jobOpeningId as any).department || "N/A";
    }
    return "N/A";
  };

  const getSalary = (offer: any) => {
    if (offer.salary && offer.salary.amount !== undefined && offer.salary.amount !== null) {
      return `${offer.salary.currency || ''} ${offer.salary.amount.toLocaleString()} ${offer.salary.frequency || ''}`;
    }
    return "Not Specified";
  };

  const getOfferOwner = (offer: any) => {
    if (typeof offer.offerOwner === 'object' && offer.offerOwner) {
      return `${offer.offerOwner.firstName || ''} ${offer.offerOwner.lastName || ''}`.trim();
    }
    if (typeof offer.createdBy === 'object' && offer.createdBy) {
      return offer.createdBy.name || "N/A";
    }
    return "N/A";
  };

  const handleView = (offerId: string) => {
    navigate(`/offer-letter/${offerId}/view`);
  };

  const handleEdit = (offerId: string) => {
    navigate(`/offer-letter/${offerId}/edit`);
  };

  const handleResend = async (offerId: string) => {
    navigate(`/offer-letter/${offerId}/preview?resend=true`);
  };

  const handleRevisedOffer = async (offerId: string) => {
    try {
      const result = await createRevisedOffer({ id: offerId }).unwrap();
      toast.success("Revised offer created successfully");
      // Navigate to edit page for the revised offer
      navigate(`/offer-letter/${result.data.offer._id}/edit?revised=true`);
      refetchOffers();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to create revised offer");
    }
  };


  const handleAcceptOffer = async (offerId: string) => {
    try {
      await acceptOffer(offerId).unwrap();
      toast.success("Offer accepted successfully");
      refetchOffers();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to accept offer");
    }
  };

  const handleRejectOffer = async (offerId: string) => {
    try {
      await rejectOffer({ id: offerId, rejectionReason: "Rejected by HR/Admin" }).unwrap();
      toast.success("Offer rejected successfully");
      refetchOffers();
    } catch (error: any) {
      toast.error(error?.data?.error?.message || "Failed to reject offer");
    }
  };

  const handleMoveToOnboarding = async (offerId: string, candidateStatus?: string) => {
    // Check if candidate is already HIRED
    if (candidateStatus === 'HIRED') {
      toast.error("Candidate has already been converted to employee. Cannot move to onboarding.");
      return;
    }

    try {
      await moveToOnboarding(offerId).unwrap();
      toast.success("Candidate moved to onboarding successfully");
      refetchOffers();
    } catch (error: any) {
      const errorMessage = error?.data?.error?.message || "Failed to move candidate to onboarding";
      if (errorMessage.includes('converted to employee') || errorMessage.includes('already been hired')) {
        toast.error("Candidate has already been converted to employee. Cannot move to onboarding.");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  // Reset page when status filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  if (offersError) {
    toast.error("Failed to load offers");
  }

  return (
    <MainLayout>
      <main className="p-4">
        <div className="mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-foreground">Offer Letter</h1>
            <div className="flex gap-2 w-full md:w-auto">
              {hasAction(userPermissions, 'offer_letter', 'template') && (
                <Button
                  onClick={() => navigate("/offer-letter/templates")}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Offer Letter Template
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by candidate name, email, job title, or department..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className={`pl-10 ${searchQuery ? "pr-10" : ""}`}
                    />
                    {searchQuery && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                        onClick={() => setSearchQuery("")}
                        aria-label="Clear search"
                      >
                        <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="SENT">Sent</SelectItem>
                      <SelectItem value="ACCEPTED">Accepted</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="EXPIRED">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Offers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Offer Letters</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track all offer letters sent to candidates
              </p>
            </CardHeader>
            <CardContent>
              {isLoadingOffers ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-4 text-muted-foreground">Loading offers...</p>
                </div>
              ) : offers.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No offers found</h3>
                  <p className="text-muted-foreground">
                    {debouncedSearchQuery || statusFilter !== "all"
                      ? "No offers match your search criteria. Try adjusting your filters."
                      : "No offer letters have been created yet. Generate an offer letter for a candidate to get started."}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Candidate</TableHead>
                        <TableHead>Job Position</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Salary</TableHead>
                        <TableHead>Joining Date</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {offers
                        .filter((offer: any) => {
                          // Filter out offers for HIRED candidates
                          const candidateStatus = getCandidateStatus(offer);
                          return candidateStatus !== 'HIRED';
                        })
                        .map((offer: any) => (
                        <TableRow key={offer._id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {getCandidateName(offer)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {getCandidateEmail(offer)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Briefcase className="h-4 w-4 text-muted-foreground" />
                              {getJobTitle(offer)}
                            </div>
                          </TableCell>
                          <TableCell>{getDepartment(offer)}</TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getOfferStatusColor(offer.status)}
                            >
                              {formatOfferStatus(offer.status)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <DollarSign className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{getSalary(offer)}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {offer.joiningDate ? formatDate(offer.joiningDate) : "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {offer.expiryDate ? formatDate(offer.expiryDate) : "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {offer.createdAt ? formatDate(offer.createdAt) : "N/A"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleView(offer._id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Offer
                                </DropdownMenuItem>
                                {(offer.status === "SENT" || offer.status === "ACCEPTED") && (
                                  <DropdownMenuItem 
                                    onClick={() => handleRevisedOffer(offer._id)}
                                    disabled={isCreatingRevision}
                                    className="text-blue-600"
                                  >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    {isCreatingRevision ? "Creating..." : "Revised Offer Letter"}
                                  </DropdownMenuItem>
                                )}
                                {offer.status === "DRAFT" && (
                                  <DropdownMenuItem onClick={() => handleEdit(offer._id)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Offer
                                  </DropdownMenuItem>
                                )}
                                {(offer.status === "SENT" || offer.status === "DRAFT") && (
                                  <>
                                    {offer.status === "SENT" && (
                                      <DropdownMenuItem onClick={() => handleResend(offer._id)}>
                                        <Send className="mr-2 h-4 w-4" />
                                        Resend Offer
                                      </DropdownMenuItem>
                                    )}
                                    {offer.status !== "ACCEPTED" && offer.status !== "REJECTED" && (
                                      <>
                                        <DropdownMenuItem 
                                          onClick={() => handleAcceptOffer(offer._id)} 
                                          className="text-green-600"
                                        >
                                          <FileText className="mr-2 h-4 w-4" />
                                          Mark as Accepted
                                        </DropdownMenuItem>
                                        <DropdownMenuItem 
                                          onClick={() => handleRejectOffer(offer._id)} 
                                          className="text-red-600"
                                        >
                                          <FileText className="mr-2 h-4 w-4" />
                                          Mark as Rejected
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                  </>
                                )}
                                {offer.status === "ACCEPTED" && (
                                  <DropdownMenuItem 
                                    onClick={() => handleMoveToOnboarding(offer._id, getCandidateStatus(offer))}
                                    disabled={isMovingToOnboarding || getCandidateStatus(offer) === 'HIRED'}
                                    className="text-blue-600"
                                  >
                                    <ArrowRight className="mr-2 h-4 w-4" />
                                    {isMovingToOnboarding ? "Moving..." : "Move to Onboarding"}
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {pagination && (
                <div className="mt-6 pt-4 border-t">
                  <Pagination
                    page={pagination.page}
                    pageSize={pagination.limit}
                    total={pagination.total}
                    pages={pagination.pages}
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

export default OfferLetterList;
