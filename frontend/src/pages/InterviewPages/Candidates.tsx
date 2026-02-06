import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Filter, Search, X, User } from "lucide-react";
import { DatePicker, Select, message } from "antd";
import dayjs, { Dayjs } from "dayjs";
const { RangePicker } = DatePicker;
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppstoreOutlined, TableOutlined, IdcardOutlined, CloseOutlined } from "@ant-design/icons";
import MainLayout from "@/components/MainLayout";
import { useGetCandidatesQuery, useGetCandidateStatsQuery, useUpdateCandidateStatusMutation, useCreateCandidateMutation } from "@/store/api/candidateApi";
import AddCandidateModal from "@/components/candidate/AddCandidateModal";
import { formatCandidateStatus, getCandidateStatusColor, CANDIDATE_STATUS } from "@/utils/constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ScheduleInterviewModal from "@/components/candidate/ScheduleInterviewModal";
import { getCandidateAction } from "@/utils/candidateActionUtils";
import { useAppSelector } from "@/store/hooks";
import { getUserPermissions, hasAction } from "@/utils/permissionUtils";
import { Pagination } from "@/components/ui/Pagination";

interface CandidateFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  position: string;
  primarySkill: string;
  education: {
    qualification: string;
    institution: string;
    university: string;
    period: string;
    marks: string;
  };
  experience: {
    company: string;
    designation: string;
    period: string;
    reasonForLeaving: string;
  };
  resumeFile: File | null;
}

const Candidates = () => {
  // Track renders for debugging double blink issue
  const renderCount = useRef(0);
  renderCount.current += 1;

  const [view, setView] = useState<"kanban" | "table" | "card" | "add">("table");
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filterOpen, setFilterOpen] = useState(false);
  const navigate = useNavigate();
  const currentUser = useAppSelector((state) => state.auth.user);
  const userPermissions = useMemo(() => {
    if (!currentUser) return [];
    const roleId = typeof currentUser.roleId === 'object' ? currentUser.roleId : null;
    return getUserPermissions(currentUser?.role, roleId as any, currentUser?.permissions || []);
  }, [currentUser]);
  const [addCandidateOpen, setAddCandidateOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<number>(1);
  const [isStepForm, setIsStepForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get("page");
    const initialPage = pageParam ? parseInt(pageParam, 10) : 1;
    console.log('[Candidates] 🟦 Initial page state:', { pageParam, initialPage });
    return initialPage;
  });
  const [pageSize, setPageSize] = useState(() => {
    const sizeParam = searchParams.get("limit");
    return sizeParam ? parseInt(sizeParam, 10) : 10; // Default 10
  });

  const isInitialMount = useRef(true);
  const lastPage = useRef(page);
  const lastPageSize = useRef(pageSize);
  const lastStatusFilter = useRef(statusFilter);
  const lastDateRange = useRef<string | null>(dateRange ? JSON.stringify(dateRange) : null);
  const lastSearch = useRef(search);

  // Log render with current state (for debugging double blink issue)
  useEffect(() => {
    console.log('[Candidates] 🟦 COMPONENT RENDER #' + renderCount.current, {
      timestamp: new Date().toISOString(),
      page,
      pageSize,
      statusFilter,
      dateRange: dateRange ? JSON.stringify(dateRange) : null,
      urlPage: searchParams.get("page"),
      urlLimit: searchParams.get("limit"),
      isInitialMount: isInitialMount.current,
      lastPage: lastPage.current
    });
  });

  // Schedule Interview Modal State
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [selectedCandidateForInterview, setSelectedCandidateForInterview] = useState<{ id: string, name: string, round?: number } | null>(null);

  const [formData, setFormData] = useState<CandidateFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    position: "",
    primarySkill: "",
    education: {
      qualification: "",
      institution: "",
      university: "",
      period: "",
      marks: "",
    },
    experience: {
      company: "",
      designation: "",
      period: "",
      reasonForLeaving: "",
    },
    resumeFile: null,
  });

  const [updateCandidateStatus] = useUpdateCandidateStatusMutation();
  const [createCandidate, { isLoading: isCreating }] = useCreateCandidateMutation();
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(searchParams.get("search") || "");

  // Sync search, page, and page size with URL query params on mount (only once)
  useEffect(() => {
    if (isInitialMount.current) {
      console.log('[Candidates] 🔵 INITIAL MOUNT - Syncing with URL params');
      const urlSearch = searchParams.get("search") || "";
      const urlPage = searchParams.get("page");
      const urlLimit = searchParams.get("limit");
      
      console.log('[Candidates] 🔵 Initial URL params:', { urlSearch, urlPage, urlLimit, currentPage: page });
      
      if (urlSearch) {
        setSearch(urlSearch);
        setDebouncedSearch(urlSearch);
      }
      if (urlPage) {
        const pageNum = parseInt(urlPage, 10);
        if (pageNum > 0) {
          console.log('[Candidates] 🔵 Setting initial page from URL:', pageNum);
          setPage(pageNum);
          lastPage.current = pageNum;
        }
      } else {
        // Ensure page is 1 if not in URL
        if (page !== 1) {
          console.log('[Candidates] 🔵 No page in URL, setting to 1');
          setPage(1);
          lastPage.current = 1;
        }
      }
      if (urlLimit) {
        const limitNum = parseInt(urlLimit, 10);
        if (limitNum > 0 && [10, 20, 50, 100].includes(limitNum)) {
          setPageSize(limitNum);
          lastPageSize.current = limitNum;
        }
      }
      
      // Initialize filter refs
      lastStatusFilter.current = statusFilter;
      lastDateRange.current = dateRange ? JSON.stringify(dateRange) : null;
      lastSearch.current = search;
      
      console.log('[Candidates] 🔵 Initial mount complete. Initialized refs:', {
        lastPage: lastPage.current,
        lastPageSize: lastPageSize.current,
        lastStatusFilter: lastStatusFilter.current,
        lastDateRange: lastDateRange.current,
        lastSearch: lastSearch.current
      });
      
      isInitialMount.current = false;
    }
  }, [searchParams, page]);

  // Debounce search input and update URL (only when search actually changes)
  useEffect(() => {
    if (isInitialMount.current) {
      lastSearch.current = search;
      return;
    }
    
    // Only proceed if search actually changed
    if (lastSearch.current === search) {
      console.log('[Candidates] 🟡 Search unchanged, skipping debounce');
      return;
    }
    
    console.log('[Candidates] 🟡 Search changed:', { 
      from: lastSearch.current, 
      to: search, 
      currentPage: page, 
      lastPage: lastPage.current 
    });
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      console.log('[Candidates] 🟡 Debounced search executing, resetting to page 1');
      lastSearch.current = search;
      setDebouncedSearch(search);
      setSearchParams((prevParams) => {
        const newParams = new URLSearchParams(prevParams);
        if (search.trim()) {
          newParams.set("search", search.trim());
        } else {
          newParams.delete("search");
        }
        newParams.set("page", "1");
        return newParams;
      }, { replace: true });
      
      if (lastPage.current !== 1) {
        console.log('[Candidates] 🟡 Resetting page to 1 due to search change');
        lastPage.current = 1;
        setPage(1);
      }
    }, 500);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [search, setSearchParams]);

  // Update page size in URL when it changes
  useEffect(() => {
    if (isInitialMount.current) return;
    if (lastPageSize.current === pageSize) return;
    
    console.log('[Candidates] 🟢 Page size changed:', { from: lastPageSize.current, to: pageSize, currentPage: page });
    
    lastPageSize.current = pageSize;
    
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      if (pageSize !== 10) {
        newParams.set("limit", pageSize.toString());
      } else {
        newParams.delete("limit");
      }
      newParams.set("page", "1");
      return newParams;
    }, { replace: true });
    
    if (lastPage.current !== 1) {
      console.log('[Candidates] 🟢 Resetting page to 1 due to page size change');
      lastPage.current = 1;
      setPage(1);
    }
  }, [pageSize, setSearchParams, page]);

  // Reset to page 1 when status filter or date range changes (only if they actually changed)
  useEffect(() => {
    if (isInitialMount.current) {
      lastStatusFilter.current = statusFilter;
      lastDateRange.current = dateRange ? JSON.stringify(dateRange) : null;
      return;
    }
    
    // Only reset if status filter or date range actually changed
    const currentDateRangeStr = dateRange ? JSON.stringify(dateRange) : null;
    const statusChanged = lastStatusFilter.current !== statusFilter;
    const dateRangeChanged = lastDateRange.current !== currentDateRangeStr;
    
    console.log('[Candidates] 🟣 Filter check:', {
      statusFilter,
      lastStatusFilter: lastStatusFilter.current,
      statusChanged,
      dateRange: currentDateRangeStr,
      lastDateRange: lastDateRange.current,
      dateRangeChanged,
      currentPage: page
    });
    
    if (statusChanged || dateRangeChanged) {
      console.log('[Candidates] 🟣 Filter changed! Resetting page to 1');
      lastStatusFilter.current = statusFilter;
      lastDateRange.current = currentDateRangeStr;
      
      // Only reset page if we're not already on page 1
      if (page !== 1) {
        lastPage.current = 1;
        setPage(1);
        setSearchParams((prevParams) => {
          const newParams = new URLSearchParams(prevParams);
          newParams.set("page", "1");
          return newParams;
        }, { replace: true });
      }
    }
  }, [statusFilter, dateRange, page, setSearchParams]);

  // Update page in URL when page changes (but don't interfere with other effects)
  useEffect(() => {
    if (isInitialMount.current) {
      console.log('[Candidates] 🔵 Page effect skipped (initial mount)');
      return;
    }
    
    // Skip if page hasn't actually changed from what we last set
    if (lastPage.current === page) {
      console.log('[Candidates] 🔴 Page effect skipped (page unchanged):', { page, lastPage: lastPage.current });
      return;
    }
    
    // Check current URL page to avoid unnecessary updates and loops
    const currentUrlPage = parseInt(searchParams.get("page") || "1", 10);
    console.log('[Candidates] 🔴 Page effect running:', {
      page,
      lastPage: lastPage.current,
      currentUrlPage,
      searchParams: searchParams.toString()
    });
    
    if (currentUrlPage === page) {
      console.log('[Candidates] 🔴 Page already in sync with URL, updating ref only');
      lastPage.current = page;
      return; // Already in sync, no need to update
    }
    
    // Update the ref to track the change BEFORE updating URL to prevent loops
    console.log('[Candidates] 🔴 Updating URL with new page:', { from: lastPage.current, to: page });
    lastPage.current = page;
    
    setSearchParams((prevParams) => {
      const newParams = new URLSearchParams(prevParams);
      if (page > 1) {
        newParams.set("page", page.toString());
      } else {
        newParams.delete("page");
      }
      console.log('[Candidates] 🔴 URL updated:', { old: prevParams.toString(), new: newParams.toString() });
      return newParams;
    }, { replace: true });
  }, [page, setSearchParams, searchParams]);

  // Normalize query parameters to ensure consistent cache keys
  // For Kanban and Card views, fetch all candidates (no pagination)
  // For Table view, use pagination
  const queryParams = useMemo(() => {
    const params: any = {};
    
    // Only use pagination for table view
    if (view === "table") {
      params.page = page;
      params.limit = pageSize;
    } else {
      // For Kanban and Card views, fetch all candidates
      params.page = 1;
      params.limit = 1000; // Large limit to get all candidates
    }
    
    if (debouncedSearch) params.search = debouncedSearch;
    if (statusFilter) params.status = statusFilter;
    if (dateRange?.[0]) params.startDate = dateRange[0];
    if (dateRange?.[1]) params.endDate = dateRange[1];
    
    console.log('[Candidates] 🟠 Query params updated:', { ...params, view });
    return params;
  }, [debouncedSearch, statusFilter, dateRange, page, pageSize, view]);

  const { data: candidatesData, isLoading: isLoadingCandidates, isFetching: isFetchingCandidates, refetch } = useGetCandidatesQuery(queryParams, {
    // Force refetch when arguments change (especially page changes)
    refetchOnMountOrArgChange: true,
  });

  // Log API call states
  useEffect(() => {
    console.log('[Candidates] 🟠 API Query State:', {
      isLoading: isLoadingCandidates,
      isFetching: isFetchingCandidates,
      hasData: !!candidatesData,
      pagination: candidatesData?.data?.pagination,
      queryParams
    });
  }, [isLoadingCandidates, isFetchingCandidates, candidatesData, queryParams]);

  // Use isFetching to show loading state during pagination (not just initial load)
  const showLoading = isLoadingCandidates || isFetchingCandidates;

  const { data: statsData } = useGetCandidateStatsQuery();

  const stats = statsData?.data?.stats ? [
    { title: "Total Candidates", value: statsData.data.stats.total, color: "text-gray-900" },
    { title: "Interview Appointments", value: statsData.data.stats.interviewAppointments, color: "text-blue-600" },
    { title: "Round 1", value: statsData.data.stats.round1, color: "text-purple-600" },
    { title: "Round 2", value: statsData.data.stats.round2, color: "text-purple-600" },
    { title: "Round 3", value: statsData.data.stats.round3, color: "text-purple-600" },
    { title: "Final Round", value: statsData.data.stats.round4, color: "text-purple-600" },
    { title: "Selected", value: statsData.data.stats.selected, color: "text-green-600" },
    { title: "Offer Letter", value: statsData.data.stats.offerLetter, color: "text-orange-600" },
    { title: "Document Verification", value: statsData.data.stats.documentVerification, color: "text-teal-600" },
    { title: "Background Verification", value: statsData.data.stats.backgroundVerification, color: "text-indigo-600" },
    { title: "Hired Candidates", value: statsData.data.stats.hired, color: "text-green-700" },
    { title: "Rejected", value: statsData.data.stats.rejected, color: "text-red-600" },
  ] : [
    { title: "Total Candidates", value: 0, color: "text-gray-900" },
    { title: "Interview Appointments", value: 0, color: "text-blue-600" },
    { title: "Round 1", value: 0, color: "text-purple-600" },
    { title: "Round 2", value: 0, color: "text-purple-600" },
    { title: "Round 3", value: 0, color: "text-purple-600" },
    { title: "Final Round", value: 0, color: "text-purple-600" },
    { title: "Selected", value: 0, color: "text-green-600" },
    { title: "Offer Letter", value: 0, color: "text-orange-600" },
    { title: "Document Verification", value: 0, color: "text-teal-600" },
    { title: "Background Verification", value: 0, color: "text-indigo-600" },
    { title: "Hired Candidates", value: 0, color: "text-green-700" },
    { title: "Rejected", value: 0, color: "text-red-600" },
  ];

  // Get all candidates from API response (already filtered by backend)
  const allCandidates = candidatesData?.data?.candidates || [];
  const filteredCandidates = allCandidates; // Backend handles all filtering

  return (
    <MainLayout>
      <main className="p-3 sm:p-4 overflow-x-hidden">
        <div className="space-y-6 w-full max-w-full">

          {/* DASHBOARD STATS */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {stats.map((stat, index) => (
              <Card key={index} className="shadow-sm hover:shadow-md transition">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-xs font-medium text-muted-foreground truncate" title={stat.title}>
                    {stat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color}`}>
                    {stat.value}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>


          {/* TOP HEADER */}
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-foreground">Candidates</h1>

            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
              <Button variant={view === "kanban" ? "default" : "outline"} onClick={() => setView("kanban")} className="flex items-center gap-2">
                <AppstoreOutlined /> Kanban
              </Button>

              <Button variant={view === "table" ? "default" : "outline"} onClick={() => setView("table")} className="flex items-center gap-2">
                <TableOutlined /> Table
              </Button>

              <Button variant={view === "card" ? "default" : "outline"} onClick={() => setView("card")} className="flex items-center gap-2">
                <IdcardOutlined /> Card
              </Button>

              <Button variant="outline" onClick={() => setFilterOpen(!filterOpen)}>
                <Filter className="w-4 h-4 mr-2" />
                {filterOpen ? "Hide Filters" : "Filters"}
              </Button>

              {hasAction(userPermissions, 'candidates', 'add') && (
                <Button
                  onClick={() => setAddCandidateOpen(true)}
                  className="bg-green-600 text-white w-full sm:w-auto hover:bg-green-700"
                >
                  + Add Candidate
                </Button>
              )}
            </div>
          </div>

          {/* SEARCH BAR - Always Visible */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search candidates by name, position, email, or skill..."
              className={`pl-10 ${search ? "pr-10" : ""}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-transparent"
                onClick={() => {
                  setSearch("");
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete("search");
                  setSearchParams(newParams, { replace: true });
                }}
                aria-label="Clear search"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </Button>
            )}
          </div>

          {/* FILTER SECTION */}
          {filterOpen && (
            <div className="border rounded-xl p-4 bg-white shadow-sm space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RangePicker 
                  className="w-full" 
                  placeholder={["Applied Start Date", "Applied End Date"]}
                  format="YYYY-MM-DD"
                  value={dateRange ? [
                    dateRange[0] ? dayjs(dateRange[0]) : null,
                    dateRange[1] ? dayjs(dateRange[1]) : null
                  ] as [Dayjs | null, Dayjs | null] : null}
                  onChange={(dates) => {
                    if (dates && dates[0] && dates[1]) {
                      setDateRange([
                        dates[0].format('YYYY-MM-DD'),
                        dates[1].format('YYYY-MM-DD')
                      ]);
                      // Reset to page 1 when date range changes
                      if (lastPage.current !== 1) {
                        lastPage.current = 1;
                        setPage(1);
                        setSearchParams((prevParams) => {
                          const newParams = new URLSearchParams(prevParams);
                          newParams.set("page", "1");
                          return newParams;
                        }, { replace: true });
                      }
                    } else {
                      setDateRange(null);
                      // Reset to page 1 when date range is cleared
                      if (lastPage.current !== 1) {
                        lastPage.current = 1;
                        setPage(1);
                        setSearchParams((prevParams) => {
                          const newParams = new URLSearchParams(prevParams);
                          newParams.set("page", "1");
                          return newParams;
                        }, { replace: true });
                      }
                    }
                  }}
                />
                <Select
                  className="w-full"
                  placeholder="Filter by status"
                  value={statusFilter || undefined}
                  onChange={(value) => setStatusFilter(value || "")}
                  allowClear
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={Object.values(CANDIDATE_STATUS).map((status) => ({
                    value: status,
                    label: formatCandidateStatus(status)
                  }))}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("");
                    setDateRange(null);
                    const newParams = new URLSearchParams();
                    setSearchParams(newParams, { replace: true });
                    setPage(1);
                  }}
                  className="w-full sm:w-auto"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          )}

          {/* DISPLAY */}
          <Card className="w-full overflow-hidden max-w-full">
            <CardHeader className="w-full">
              <div className="flex justify-between items-center w-full">
                <CardTitle>
                  All Candidates
                  {candidatesData?.data?.pagination && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ({candidatesData.data.pagination.total} total)
                    </span>
                  )}
                </CardTitle>
                <div className="flex gap-2">
                  {statusFilter && (
                    <Badge variant="outline" className="cursor-pointer" onClick={() => setStatusFilter("")}>
                      Status: {statusFilter} ×
                    </Badge>
                  )}
                  {dateRange && (
                    <Badge variant="outline" className="cursor-pointer" onClick={() => setDateRange(null)}>
                      Date: {dateRange[0]} to {dateRange[1]} ×
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-hidden w-full max-w-full" style={{ padding: view === "kanban" ? 0 : undefined }}>

              {/* CARD VIEW */}
              {view === "card" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {showLoading ? (
                    <div className="col-span-full text-center py-8">Loading candidates...</div>
                  ) : filteredCandidates.length === 0 ? (
                    <div className="col-span-full text-center py-8">
                      <p className="text-muted-foreground">No candidates found</p>
                      {search && (
                        <Button
                          variant="outline"
                          className="mt-2"
                          onClick={() => setSearch("")}
                        >
                          Clear search
                        </Button>
                      )}
                    </div>
                  ) : (
                    filteredCandidates.map((c) => (
                      <div key={c._id} onClick={() => navigate(`/candidate/${c._id}`)}
                        className="cursor-pointer p-4 border rounded-xl shadow-sm bg-white hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{c.firstName} {c.lastName}</h3>
                            <p className="text-sm text-muted-foreground">{c.email}</p>
                          </div>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge className={getCandidateStatusColor(c.displayStatus || c.status)}>
                                  {formatCandidateStatus(c.displayStatus || c.status)}
                                </Badge>
                              </TooltipTrigger>
                              {c.appliedJobs && c.appliedJobs.length > 0 && (
                                <TooltipContent>
                                  <div className="space-y-1">
                                    <p className="font-semibold">Applied for:</p>
                                    <ul className="list-disc list-inside">
                                      {c.appliedJobs.map((job: string, idx: number) => (
                                        <li key={idx} className="text-xs">{job}</li>
                                      ))}
                                    </ul>
                                  </div>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <p className="text-sm font-medium mt-2">{c.position}</p>
                        {c.primarySkill && (
                          <p className="text-xs text-muted-foreground mt-1">Skill: {c.primarySkill}</p>
                        )}
                        {c.phone && (
                          <p className="text-xs text-muted-foreground mt-1">Phone: {c.phone}</p>
                        )}
                        {c.experience && c.experience.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Experience: {c.experience[0].company} - {c.experience[0].designation}
                          </p>
                        )}
                        {c.source === 'REFERRAL' && c.referrerId && (
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                              <User className="w-3 h-3 mr-1" />
                              Referred
                            </Badge>
                            {typeof c.referrerId === 'object' && c.referrerId && (
                              <span className="text-xs text-muted-foreground">
                                by {c.referrerId.name || `${(c.referrerId as any).firstName || ''} ${(c.referrerId as any).lastName || ''}`.trim()}
                              </span>
                            )}
                          </div>
                        )}
                        <div className="flex justify-end items-center mt-4">
                          {['SELECTED', 'Offer', 'OFFER_ACCEPTED', 'Hired', 'HIRED'].includes(c.status) && (
                            <Button size="sm" onClick={async (e) => {
                              e.stopPropagation();
                              if (c.status !== 'OFFER_ACCEPTED' && c.status !== 'HIRED') {
                                try {
                                  await updateCandidateStatus({
                                    id: c._id,
                                    status: 'OFFER_ACCEPTED'
                                  }).unwrap();
                                  message.success("Candidate marked as ready for hiring");
                                } catch (err) {
                                  message.error("Failed to update status");
                                  return;
                                }
                              }
                              navigate(`/hiring`);
                            }}>
                              Convert to Staff
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TABLE VIEW */}
              {view === "table" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border rounded-lg overflow-hidden">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3 text-left">Name</th>
                        <th className="p-3 text-left">Email</th>
                        <th className="p-3 text-left">Position</th>
                        <th className="p-3 text-left">Primary Skill</th>
                        <th className="p-3 text-left">Phone</th>
                        <th className="p-3 text-left">Source</th>
                        <th className="p-3 text-left">Applied Date</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showLoading ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center">Loading candidates...</td>
                        </tr>
                      ) : filteredCandidates.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-8 text-center">
                            <p className="text-muted-foreground">No candidates found</p>
                            {(search || statusFilter) && (
                              <Button
                                variant="outline"
                                className="mt-2"
                                onClick={() => {
                                  setSearch("");
                                  setStatusFilter("");
                                }}
                              >
                                Clear filters
                              </Button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        filteredCandidates.map((c) => (
                          <tr key={c._id} onClick={() => navigate(`/candidate/${c._id}`)}
                            className="border-t hover:bg-accent/40 cursor-pointer">
                            <td className="p-3 font-medium">{c.firstName} {c.lastName}</td>
                            <td className="p-3 text-muted-foreground">{c.email}</td>
                            <td className="p-3">{c.position}</td>
                            <td className="p-3">{c.primarySkill || '-'}</td>
                            <td className="p-3">{c.phone}</td>
                            <td className="p-3">
                              {c.source === 'REFERRAL' && c.referrerId ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                    <User className="w-3 h-3 mr-1" />
                                    Referred
                                  </Badge>
                                  {typeof c.referrerId === 'object' && c.referrerId && (
                                    <span className="text-xs text-muted-foreground">
                                      by {c.referrerId.name || `${(c.referrerId as any).firstName || ''} ${(c.referrerId as any).lastName || ''}`.trim()}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">
                                  {c.source === 'SELF_APPLIED' ? 'Self Applied' : c.source === 'MANUAL' ? 'Manual Entry' : c.source || '-'}
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-muted-foreground">
                              {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-GB', { 
                                day: '2-digit', 
                                month: 'short', 
                                year: 'numeric' 
                              }) : '-'}
                            </td>
                            <td className="p-3 text-center">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge className={getCandidateStatusColor(c.displayStatus || c.status)}>
                                      {(() => {
                                        const status = c.displayStatus || c.status;
                                        const round = c.currentRound || 1;
                                        if (status === 'INTERVIEW_SCHEDULED') return `Round ${round} In Progress`;
                                        if (status === 'INTERVIEW_COMPLETED') return `Round ${round} Completed`;
                                        return formatCandidateStatus(status);
                                      })()}
                                    </Badge>
                                  </TooltipTrigger>
                                  {c.appliedJobs && c.appliedJobs.length > 0 && (
                                    <TooltipContent>
                                      <div className="space-y-1">
                                        <p className="font-semibold">Applied for:</p>
                                        <ul className="list-disc list-inside">
                                          {c.appliedJobs.map((job: string, idx: number) => (
                                            <li key={idx} className="text-xs">{job}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </td>
                            <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                              {(() => {
                                const action = getCandidateAction(c, currentUser);

                                // Permission Check Logic
                                let hasPermission = false;
                                switch (action.type) {
                                  case 'SCHEDULE':
                                    hasPermission = hasAction(userPermissions, 'interview_appointments', 'schedule');
                                    break;
                                  case 'START':
                                    hasPermission = hasAction(userPermissions, 'candidates', 'start_interview');
                                    break;
                                  case 'CONVERT_TO_STAFF':
                                    hasPermission = hasAction(userPermissions, 'candidates', 'convert_to_staff');
                                    break;
                                  case 'VIEW_PROFILE':
                                    hasPermission = hasAction(userPermissions, 'candidates', 'view_profile');
                                    break;
                                  case 'VIEW_OFFER':
                                    hasPermission = hasAction(userPermissions, 'candidates', 'view_offer');
                                    break;
                                  case 'GENERATE_OFFER':
                                    hasPermission = hasAction(userPermissions, 'offer_letter', 'generate');
                                    break;
                                  case 'ONBOARD':
                                  case 'DOCUMENT_COLLECTION':
                                    hasPermission = hasAction(userPermissions, 'document_collection', 'view');
                                    break;
                                  case 'BACKGROUND_VERIFICATION':
                                    hasPermission = hasAction(userPermissions, 'background_verification', 'view');
                                    break;
                                  case 'VIEW_LOGS':
                                  case 'VIEW_PROGRESS':
                                    hasPermission = hasAction(userPermissions, 'candidates', 'view');
                                    break;
                                  default:
                                    hasPermission = false;
                                }

                                if (!hasPermission) return <span className="text-xs text-muted-foreground">Restricted</span>;

                                return (
                                  <Button
                                    size="sm"
                                    variant={action.variant}
                                    className={action.color}
                                    disabled={action.disabled}
                                    onClick={(e) => {
                                      e.stopPropagation();

                                      switch (action.type) {
                                        case 'SCHEDULE':
                                          setSelectedCandidateForInterview({
                                            id: c._id,
                                            name: `${c.firstName} ${c.lastName}`,
                                            round: action.round
                                          });
                                          setIsScheduleModalOpen(true);
                                          break;

                                        case 'START':
                                          // Navigate to interview progress/session
                                          navigate(`/interview/candidate/${c._id}/progress`);
                                          break;

                                        case 'VIEW_PROGRESS':
                                        case 'VIEW_PROFILE':
                                          navigate(`/candidate/${c._id}`);
                                          break;

                                        case 'GENERATE_OFFER':
                                          navigate(`/offer-letter/create?candidateId=${c._id}`);
                                          break;

                                        case 'VIEW_OFFER':
                                          navigate("/offer-letter");
                                          break;

                                        case 'ONBOARD':
                                          // Navigate to onboarding/document collection
                                          navigate(`/interview/candidate/${c._id}/progress`);
                                          break;

                                        case 'DOCUMENT_COLLECTION':
                                          navigate(`/onboarding`);
                                          break;

                                        case 'BACKGROUND_VERIFICATION':
                                          const hasDocs = c.documents && c.documents.length > 0;
                                          if (hasDocs) {
                                            navigate(`/interview/background-verification/${c._id}`);
                                          } else {
                                            navigate(`/interview/candidate/${c._id}/progress`);
                                          }
                                          break;

                                        case 'CONVERT_TO_STAFF':
                                          navigate(`/hiring`);
                                          break;

                                        case 'VIEW_LOGS':
                                          // View-only candidate logs
                                          navigate(`/candidate/${c._id}`);
                                          break;
                                      }
                                    }}
                                  >
                                    {action.label}
                                  </Button>
                                );
                              })()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* Pagination Controls */}
                  {candidatesData?.data?.pagination && (
                    <Pagination
                      page={page}
                      pageSize={pageSize}
                      total={candidatesData.data.pagination.total}
                      pages={candidatesData.data.pagination.pages}
                      onPageChange={(newPage) => {
                        console.log('[Candidates] 🎯 PAGINATION BUTTON CLICKED:', {
                          from: page,
                          to: newPage,
                          lastPage: lastPage.current,
                          urlPage: searchParams.get("page"),
                          timestamp: new Date().toISOString()
                        });
                        setPage(newPage);
                        // Force scroll to top when page changes
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      onPageSizeChange={(newSize) => {
                        console.log('[Candidates] 🎯 PAGE SIZE CHANGED:', {
                          from: pageSize,
                          to: newSize,
                          currentPage: page
                        });
                        setPageSize(newSize);
                        setPage(1);
                      }}
                      showPageSizeSelector={true}
                    />
                  )}
                </div>
              )}

              {/* KANBAN VIEW */}
              {view === "kanban" && (
                <div className="w-full overflow-hidden max-w-full">
                  {isLoadingCandidates ? (
                    <div className="text-center py-8">Loading candidates...</div>
                  ) : (
                    <div 
                      className="flex overflow-x-auto gap-4" 
                      style={{ 
                        minHeight: 'calc(100vh - 250px)', 
                        scrollbarWidth: 'thin',
                        WebkitOverflowScrolling: 'touch',
                        padding: '1rem',
                        width: '100%',
                        maxWidth: '100%'
                      }}
                    >
                      {[
                        { title: "Applied", color: "bg-blue-500", id: "applied", status: "APPLIED", round: 0 },
                        { title: "Interview Scheduled", color: "bg-indigo-500", id: "scheduled", status: "INTERVIEW_SCHEDULED", round: 0 },
                        { title: "Round 1", color: "bg-purple-500", id: "round1", status: "INTERVIEW_SCHEDULED", round: 1 },
                        { title: "Round 2", color: "bg-purple-600", id: "round2", status: "INTERVIEW_COMPLETED", round: 2 },
                        { title: "Round 3", color: "bg-purple-700", id: "round3", status: "INTERVIEW_COMPLETED", round: 3 },
                        { title: "Final Round", color: "bg-purple-800", id: "round4", status: "INTERVIEW_COMPLETED", round: 4 },
                        { title: "Generate Offer", color: "bg-orange-500", id: "offer", status: "SELECTED", round: 0 },
                        { title: "Document Collection", color: "bg-teal-500", id: "docs", status: "OFFER_ACCEPTED", round: 0 },
                        { title: "Background Verification", color: "bg-cyan-600", id: "bgv", status: "OFFER_ACCEPTED", round: 0 },
                        { title: "Onboarded", color: "bg-green-600", id: "onboarded", status: "HIRED", round: 0 },
                      ].map((column, idx) => {
                        // Use the same backend-filtered candidates as Table and Card views
                        // Backend already handles search, status, and date filtering
                        const columnCandidates = (candidatesData?.data?.candidates || []).filter(
                          (c) => {
                            const status = c.status;
                            // Use currentJobStage (from backend) or fallback to currentRound (legacy)
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const currentRound = (c as any).currentJobStage || c.currentRound || 0;
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const bgStatus = (c as any).backgroundVerification?.status;

                            // Column Specific Filter
                            switch (column.id) {
                              case 'applied':
                                return status === 'APPLIED';
                              case 'scheduled':
                                // Candidates who are scheduled but round info might be plain or 0
                                return status === 'INTERVIEW_SCHEDULED' && currentRound === 0;
                              case 'round1':
                                return currentRound === 1 && !['SELECTED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'HIRED', 'REJECTED'].includes(status);
                              case 'round2':
                                return currentRound === 2 && !['SELECTED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'HIRED', 'REJECTED'].includes(status);
                              case 'round3':
                                return currentRound === 3 && !['SELECTED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'HIRED', 'REJECTED'].includes(status);
                              case 'round4':
                                return currentRound === 4 && !['SELECTED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'HIRED', 'REJECTED'].includes(status);
                              case 'offer':
                                // Selected candidates (ready for offer) or Offer Sent
                                return status === 'SELECTED' || status === 'OFFER_SENT';
                              case 'docs':
                                // Offer Accepted -> Document Collection
                                // Exclude if BG verification has started
                                return status === 'OFFER_ACCEPTED' && (!bgStatus || bgStatus === 'NOT_STARTED');
                              case 'bgv':
                                // BG Verification started
                                return bgStatus && bgStatus !== 'NOT_STARTED' && status !== 'HIRED';
                              case 'onboarded':
                                return status === 'HIRED';
                              default:
                                return false;
                            }
                          }
                        );
                        const handleDragOver = (e: React.DragEvent) => {
                          e.preventDefault();
                          e.currentTarget.classList.add('bg-gray-50');
                        };

                        const handleDragLeave = (e: React.DragEvent) => {
                          e.currentTarget.classList.remove('bg-gray-50');
                        };

                        const handleDrop = async (e: React.DragEvent, targetColumn: typeof column) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove('bg-gray-50');
                          const candidateId = e.dataTransfer.getData('candidateId');
                          if (!candidateId) return;

                          // Find the candidate to get their name
                          const candidate = (candidatesData?.data?.candidates || []).find((c: any) => c._id === candidateId);
                          if (!candidate) {
                            message.error('Candidate not found');
                            return;
                          }

                          const candidateName = `${candidate.firstName} ${candidate.lastName}`;

                          // Check if moving to an interview column (scheduled, round1, round2, round3, round4)
                          const isInterviewColumn = targetColumn.id === 'scheduled' || 
                                                   targetColumn.id === 'round1' || 
                                                   targetColumn.id === 'round2' || 
                                                   targetColumn.id === 'round3' || 
                                                   targetColumn.id === 'round4';

                          if (isInterviewColumn) {
                            // Open schedule interview modal instead of directly updating status
                            // The modal will handle scheduling and status update automatically
                            setSelectedCandidateForInterview({
                              id: candidateId,
                              name: candidateName,
                              round: targetColumn.round && targetColumn.round > 0 ? targetColumn.round : 1
                            });
                            setIsScheduleModalOpen(true);
                          } else {
                            // For non-interview columns, update status directly
                            try {
                              await updateCandidateStatus({
                                id: candidateId,
                                status: targetColumn.status as any
                              }).unwrap();
                              message.success(`Candidate moved to ${targetColumn.title}`);
                              // Refetch candidates to update the Kanban view
                              refetch();
                            } catch (error: any) {
                              message.error(error?.data?.error?.message || 'Failed to update candidate status');
                            }
                          }
                        };

                        return (
                          <div
                            key={idx}
                            className="min-w-[300px] w-[300px] bg-white border rounded-xl shadow-sm flex flex-col shrink-0 h-full"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, column)}
                            style={{ maxHeight: 'calc(100vh - 200px)' }}
                          >
                            <div className={`${column.color} text-white px-4 py-3 rounded-t-xl flex items-center justify-between`}>
                              <span className="font-semibold">{column.title}</span>
                              <span className="bg-white/30 rounded-full px-2 text-sm font-semibold">
                                {columnCandidates.length}
                              </span>
                            </div>

                            <div className="flex flex-col gap-3 p-4 overflow-y-auto flex-1 min-h-0" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                              {columnCandidates.length === 0 ? (
                                <p className="text-center text-sm text-gray-400 mt-6">No candidates</p>
                              ) : (
                                columnCandidates.map((c) => {
                                  const handleDragStart = (e: React.DragEvent) => {
                                    e.dataTransfer.setData('candidateId', c._id);
                                    e.dataTransfer.effectAllowed = 'move';
                                  };

                                  return (
                                    <div
                                      key={c._id}
                                      draggable
                                      onDragStart={handleDragStart}
                                      onClick={() => navigate(`/candidate/${c._id}`)}
                                      className="cursor-move border p-4 rounded-xl bg-white shadow hover:shadow-md transition"
                                    >
                                      <h3 className="font-semibold">{c.firstName} {c.lastName}</h3>
                                      <p className="text-sm text-gray-500">{c.position}</p>

                                      {c.primarySkill && (
                                        <div className="flex flex-wrap gap-1 mt-2">
                                          <span className="px-2 py-1 text-xs rounded-md bg-gray-100">
                                            {c.primarySkill}
                                          </span>
                                          {c.skills?.slice(0, 2).map((skill, j) => (
                                            <span key={j} className="px-2 py-1 text-xs rounded-md bg-gray-100">
                                              {skill}
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                      {c.experience?.[0] && (
                                        <p className="text-xs text-gray-500 mt-2">
                                          {c.experience[0].company} - {c.experience[0].designation}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {view === "add" && isStepForm && (
                <div className="space-y-8">

                  {/* STEP PROGRESS */}
                  <div className="flex items-center justify-center gap-3">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`w-9 h-9 flex items-center justify-center rounded-full text-white font-bold
            ${selectedCard === step ? "bg-green-600" : step < selectedCard ? "bg-green-300" : "bg-gray-300"}
          `}
                      >
                        {step}
                      </div>
                    ))}
                  </div>

                  {/* STEP 1 -- PERSONAL DETAILS + POSITION */}
                  {selectedCard === 1 && (
                    <>
                      <h2 className="text-xl font-bold mb-4">Step 1 — Personal & Position Details</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                          placeholder="First Name *"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          required
                        />
                        <Input
                          placeholder="Last Name *"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          required
                        />
                        <Input
                          placeholder="Email *"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          required
                        />
                        <Input
                          placeholder="Phone Number *"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          required
                        />
                        <DatePicker
                          placeholder="Date of Birth"
                          style={{ width: "100%" }}
                          value={formData.dateOfBirth ? dayjs(formData.dateOfBirth) : undefined}
                          onChange={(date: Dayjs | null) =>
                            setFormData({
                              ...formData,
                              dateOfBirth: date ? date.format("YYYY-MM-DD") : undefined,
                            })
                          }
                          disabledDate={(current) => {
                            // Disable future dates
                            return current && current > dayjs().endOf('day');
                          }}
                        />
                        <Input
                          placeholder="Gender"
                          value={formData.gender}
                          onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        />
                        <Input
                          placeholder="Primary Skill / Competency *"
                          value={formData.primarySkill}
                          onChange={(e) => setFormData({ ...formData, primarySkill: e.target.value })}
                          required
                        />
                        <Input
                          placeholder="Position Applying For *"
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          required
                        />
                      </div>

                      <div className="flex justify-end mt-6">
                        <Button
                          onClick={() => {
                            if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.position || !formData.primarySkill) {
                              message.error("Please fill all required fields");
                              return;
                            }
                            setSelectedCard(2);
                          }}
                        >
                          Next
                        </Button>
                      </div>
                    </>
                  )}

                  {/* STEP 2 -- EDUCATION */}
                  {selectedCard === 2 && (
                    <>
                      <h2 className="text-xl font-bold mb-4">Step 2 — Education Details</h2>
                      <div className="space-y-3">
                        <Input
                          placeholder="Highest Qualification"
                          value={formData.education.qualification}
                          onChange={(e) => setFormData({
                            ...formData,
                            education: { ...formData.education, qualification: e.target.value }
                          })}
                        />
                        <Input
                          placeholder="Institution Name & City"
                          value={formData.education.institution}
                          onChange={(e) => setFormData({
                            ...formData,
                            education: { ...formData.education, institution: e.target.value }
                          })}
                        />
                        <Input
                          placeholder="University / Board"
                          value={formData.education.university}
                          onChange={(e) => setFormData({
                            ...formData,
                            education: { ...formData.education, university: e.target.value }
                          })}
                        />
                        <Input
                          placeholder="Period (From – To)"
                          value={formData.education.period}
                          onChange={(e) => setFormData({
                            ...formData,
                            education: { ...formData.education, period: e.target.value }
                          })}
                        />
                        <Input
                          placeholder="Marks / CGPA"
                          value={formData.education.marks}
                          onChange={(e) => setFormData({
                            ...formData,
                            education: { ...formData.education, marks: e.target.value }
                          })}
                        />
                      </div>
                      <div className="flex justify-between mt-6">
                        <Button variant="outline" onClick={() => setSelectedCard(1)}>Back</Button>
                        <Button onClick={() => setSelectedCard(3)}>Next</Button>
                      </div>
                    </>
                  )}

                  {/* STEP 3 -- EMPLOYMENT + DOCUMENT UPLOAD */}
                  {selectedCard === 3 && (
                    <>
                      <h2 className="text-xl font-bold mb-4">Step 3 — Experience & Documents</h2>
                      <div className="space-y-3">
                        <Input
                          placeholder="Company Name (Latest or Internship)"
                          value={formData.experience.company}
                          onChange={(e) => setFormData({
                            ...formData,
                            experience: { ...formData.experience, company: e.target.value }
                          })}
                        />
                        <Input
                          placeholder="Designation / Role"
                          value={formData.experience.designation}
                          onChange={(e) => setFormData({
                            ...formData,
                            experience: { ...formData.experience, designation: e.target.value }
                          })}
                        />
                        <Input
                          placeholder="Employment Period (From – To)"
                          value={formData.experience.period}
                          onChange={(e) => setFormData({
                            ...formData,
                            experience: { ...formData.experience, period: e.target.value }
                          })}
                        />
                        <Input
                          placeholder="Reason for Leaving"
                          value={formData.experience.reasonForLeaving}
                          onChange={(e) => setFormData({
                            ...formData,
                            experience: { ...formData.experience, reasonForLeaving: e.target.value }
                          })}
                        />
                        <Input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setFormData({ ...formData, resumeFile: file });
                          }}
                        />
                        {formData.resumeFile && (
                          <p className="text-sm text-muted-foreground">
                            Selected: {formData.resumeFile.name}
                          </p>
                        )}
                      </div>

                      <div className="flex justify-between mt-6">
                        <Button variant="outline" onClick={() => setSelectedCard(2)}>Back</Button>
                        <Button onClick={() => setSelectedCard(4)}>Next</Button>
                      </div>
                    </>
                  )}

                  {/* STEP 4 -- REVIEW & SUBMIT */}
                  {selectedCard === 4 && (
                    <>
                      <h2 className="text-xl font-bold mb-4">Final Step — Review & Submit</h2>
                      <p className="text-sm text-muted-foreground mb-3">
                        Review entered information before submitting.
                      </p>

                      <div className="border rounded-lg p-4 text-sm space-y-2">
                        <p><b>Name:</b> {formData.firstName} {formData.lastName}</p>
                        <p><b>Email:</b> {formData.email}</p>
                        <p><b>Phone:</b> {formData.phone}</p>
                        {formData.dateOfBirth && <p><b>Date of Birth:</b> {new Date(formData.dateOfBirth).toLocaleDateString()}</p>}
                        {formData.gender && <p><b>Gender:</b> {formData.gender}</p>}
                        <p><b>Position:</b> {formData.position}</p>
                        <p><b>Primary Skill:</b> {formData.primarySkill}</p>
                        {formData.education.qualification && (
                          <>
                            <p><b>Qualification:</b> {formData.education.qualification}</p>
                            <p><b>Institution:</b> {formData.education.institution}</p>
                            {formData.education.university && <p><b>University:</b> {formData.education.university}</p>}
                          </>
                        )}
                        {formData.experience.company && (
                          <>
                            <p><b>Company:</b> {formData.experience.company}</p>
                            {formData.experience.designation && <p><b>Designation:</b> {formData.experience.designation}</p>}
                            {formData.experience.period && <p><b>Period:</b> {formData.experience.period}</p>}
                            {formData.experience.reasonForLeaving && <p><b>Reason for Leaving:</b> {formData.experience.reasonForLeaving}</p>}
                          </>
                        )}
                        {formData.resumeFile && <p><b>Resume:</b> {formData.resumeFile.name}</p>}
                      </div>


                      <div className="flex justify-between mt-6">
                        <Button variant="outline" onClick={() => setSelectedCard(3)}>Back</Button>
                        <Button
                          className="bg-green-600 text-white"
                          onClick={async () => {
                            try {
                              // Prepare candidate data
                              const candidateData: any = {
                                firstName: formData.firstName,
                                lastName: formData.lastName,
                                email: formData.email,
                                phone: formData.phone,
                                position: formData.position,
                                primarySkill: formData.primarySkill,
                                status: 'Applied',
                              };

                              // Add optional fields
                              if (formData.dateOfBirth) candidateData.dateOfBirth = formData.dateOfBirth;
                              if (formData.gender) candidateData.gender = formData.gender;

                              // Add education if provided
                              if (formData.education.qualification || formData.education.institution) {
                                candidateData.education = [{
                                  qualification: formData.education.qualification || '',
                                  institution: formData.education.institution || '',
                                  university: formData.education.university || '',
                                  period: formData.education.period || '',
                                  marks: formData.education.marks || '',
                                }];
                              }

                              // Add experience if provided
                              if (formData.experience.company || formData.experience.designation) {
                                candidateData.experience = [{
                                  company: formData.experience.company || '',
                                  designation: formData.experience.designation || '',
                                  period: formData.experience.period || '',
                                  reasonForLeaving: formData.experience.reasonForLeaving || '',
                                }];
                              }

                              await createCandidate(candidateData).unwrap();

                              message.success("Candidate created successfully!");

                              // Reset form
                              setFormData({
                                firstName: "",
                                lastName: "",
                                email: "",
                                phone: "",
                                dateOfBirth: "",
                                gender: "",
                                position: "",
                                primarySkill: "",
                                education: {
                                  qualification: "",
                                  institution: "",
                                  university: "",
                                  period: "",
                                  marks: "",
                                },
                                experience: {
                                  company: "",
                                  designation: "",
                                  period: "",
                                  reasonForLeaving: "",
                                },
                                resumeFile: null,
                              });

                              setIsStepForm(false);
                              setView("table");
                              setSelectedCard(1);
                            } catch (error: any) {
                              message.error(error?.data?.error?.message || "Failed to create candidate");
                            }
                          }}
                          disabled={isCreating}
                        >
                          {isCreating ? "Submitting..." : "Submit Candidate"}
                        </Button>
                      </div>
                    </>
                  )}

                  {/* CANCEL */}
                  <div className="flex justify-center mt-4">
                    <Button
                      variant="destructive"
                      onClick={() => {
                        setIsStepForm(false);
                        setView("table");
                        setSelectedCard(1);
                        // Reset form on cancel
                        setFormData({
                          firstName: "",
                          lastName: "",
                          email: "",
                          phone: "",
                          dateOfBirth: "",
                          gender: "",
                          position: "",
                          primarySkill: "",
                          education: {
                            qualification: "",
                            institution: "",
                            university: "",
                            period: "",
                            marks: "",
                          },
                          experience: {
                            company: "",
                            designation: "",
                            period: "",
                            reasonForLeaving: "",
                          },
                          resumeFile: null,
                        });
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Add Candidate Modal */}
        <AddCandidateModal
          open={addCandidateOpen}
          onClose={() => {
            setAddCandidateOpen(false);
            setView("table");
          }}
        />

        <ScheduleInterviewModal
          isOpen={isScheduleModalOpen}
          onClose={() => {
            setIsScheduleModalOpen(false);
            setSelectedCandidateForInterview(null);
            // Refetch candidates to update the Kanban view after scheduling
            if (view === "kanban") {
              console.log('[Kanban] Refetching candidates after interview modal closed');
              // Use setTimeout to ensure the backend has processed the update
              setTimeout(() => {
                refetch();
              }, 500);
            }
          }}
          candidateId={selectedCandidateForInterview?.id || null}
          candidateName={selectedCandidateForInterview?.name || ""}
          roundNumber={selectedCandidateForInterview?.round}
        />
      </main>
    </MainLayout>
  );
};

export default Candidates;
