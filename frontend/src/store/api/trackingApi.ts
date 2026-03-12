import { apiSlice } from './apiSlice';

export interface StaffWithLocationAccess {
  _id: string;
  name: string;
  email: string;
  employeeId: string;
  phone: string;
  designation?: string;
  department?: string;
  locationAccess: boolean;
}

export interface TaskDetail {
  _id?: string;
  taskId?: string;
  taskTitle?: string;
  description?: string;
  status?: string;
  assignedTo?: any;
  customerId?: any;
  expectedCompletionDate?: string;
  completedDate?: string;
  startTime?: string;
  started?: string;
  startLocation?: { lat?: number; lng?: number };
  sourceLocation?: { lat?: number; lng?: number; address?: string; fullAddress?: string; pincode?: string };
  destinationLocation?: { lat?: number; lng?: number; address?: string; fullAddress?: string; pincode?: string };
  destinationChanged?: boolean;
  destinations?: any[];
  tripDistanceKm?: number;
  tripDurationSeconds?: number;
  arrivalTime?: string;
  arrived?: string;
  arrivedLatitude?: number;
  arrivedLongitude?: number;
  arrivedFullAddress?: string;
  arrivedPincode?: string;
  arrivedDate?: string;
  arrivedTime?: string;
  sourceFullAddress?: string;
  photoProofUrl?: string;
  photoProofUploadedAt?: string;
  photoProofDescription?: string;
  photoProofLat?: number;
  photoProofLng?: number;
  photoProofAddress?: string;
  otpCode?: string;
  otpSentAt?: string;
  otpVerifiedAt?: string;
  otpVerifiedLat?: number;
  otpVerifiedLng?: number;
  otpVerifiedAddress?: string;
  progressSteps?: {
    reachedLocation?: boolean;
    photoProof?: boolean;
    formFilled?: boolean;
    otpVerified?: boolean;
  };
  exit?: any[];
  restarted?: any[];
  approvedAt?: string;
  approvedBy?: any;
  rejectedAt?: string;
  rejectedBy?: any;
  completedAt?: string;
  completedBy?: any;
  rideStartedAt?: string;
  rideStartLocation?: { lat?: number; lng?: number; address?: string; pincode?: string; recordedAt?: string };
  arrivalLocation?: { lat?: number; lng?: number; address?: string; pincode?: string; recordedAt?: string };
  taskTravelDuration?: Array<{
    segment?: string; // travel_started | travel_resumed
    endType?: string; // travel_exited | arrived
    durationSeconds?: number;
    endTime?: string;
  }>;
  taskTravelDistance?: Array<{
    segment?: string; // travel_started | travel_resumed
    endType?: string; // travel_exited | arrived
    distanceKm?: number;
    endTime?: string;
  }>;
}

export interface TimelineEvent {
  id: string;
  staffId?: string;
  staffName?: string;
  time: string;
  type?: 'walk' | 'stop' | 'drive' | 'arrived' | 'exited' | 'live' | 'geotag' | 'outage' | 'location';
  description: string;
  position: [number, number];
  address?: string;
  fullAddress?: string;
  city?: string;
  pincode?: string;
  timestamp: string;
  accuracy?: number;
  speed?: number;
  heading?: number;
  distance?: number;
  duration?: number;
  batteryPercent?: number;
  destinationLat?: number;
  destinationLng?: number;
  presenceStatus?: string;
  taskStatus?: string;
  notes?: string;
  exitStatus?: string;
  exitReason?: string;
  exitedAt?: string;
  status?: string;
  alert?: string;
  taskId?: string;
  taskTitle?: string;
  stepNumber?: number;
  isTaskStart?: boolean;
  isTaskEnd?: boolean;
  taskDetail?: TaskDetail; // TaskDetail when status is "arrived"
}

export interface LiveWorker {
  id: string;
  staffId: string;
  name: string;
  employeeId: string;
  position: [number, number];
  address?: string;
  timestamp: string;
  movementType: string;
  taskId?: string;
  lastUpdated: string;
  isActive: boolean;
}

export interface StaffTimelineResponse {
  staff: {
    _id: string;
    name: string;
    employeeId: string;
    email: string;
  };
  events: TimelineEvent[];
  totalEvents: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

export const trackingApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Get staff with location access enabled
    getStaffWithLocationAccess: builder.query<{
      staff: StaffWithLocationAccess[];
      locationEnabled: boolean;
    }, void>({
      query: () => '/tracking/staff/location-access',
      providesTags: ['Staff'],
    }),

    // Get timeline for a specific staff member
    getStaffTimeline: builder.query<
      StaffTimelineResponse,
      { staffId: string; date?: string; startDate?: string; endDate?: string; page?: number; limit?: number }
    >({
      query: ({ staffId, date, startDate, endDate, page, limit }) => {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (page) params.append('page', page.toString());
        if (limit) params.append('limit', limit.toString());
        
        const queryString = params.toString();
        return `/tracking/timeline/${staffId}${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: (result, error, arg) => [{ type: 'Timeline', id: arg.staffId }],
    }),

    // Get live tracking data for all users
    getLiveTracking: builder.query<{
      success: boolean;
      data: {
        liveWorkers: LiveWorker[];
        trackingPoints: Array<{
          id: string;
          staffId: string;
          staffName: string;
          position: [number, number];
          address?: string;
          timestamp: string;
          movementType?: string;
          taskId?: string;
          accuracy?: number;
          speed?: number;
        }>;
      };
    }, { date?: string; staffId?: string }>({
      query: ({ date, staffId } = {}) => {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        if (staffId) params.append('staffId', staffId);
        const queryString = params.toString();
        return `/tracking/live${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['LiveTracking'],
    }),

    // Get timeline for multiple staff members
    getMultipleStaffTimeline: builder.query<
      {
        staff: Array<{
          _id: string;
          name: string;
          employeeId: string;
          email: string;
        }>;
        events: TimelineEvent[];
        totalEvents: number;
      },
      { staffIds?: string[]; date?: string; startDate?: string; endDate?: string }
    >({
      query: ({ staffIds, date, startDate, endDate }) => {
        const params = new URLSearchParams();
        if (staffIds && staffIds.length > 0) {
          params.append('staffIds', staffIds.join(','));
        }
        if (date) params.append('date', date);
        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        
        const queryString = params.toString();
        return `/tracking/timeline${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['Timeline'],
    }),

    // Get tracking dashboard statistics (API returns { success, data: { summary, staffStats, dateRange, pagination } })
    getTrackingDashboardStats: builder.query<{
      success: boolean;
      data: {
        summary: {
          totalDistance: number;
          totalTime: number;
          totalTimeInMotion: number;
          totalTimeAtRest: number;
          totalStaff: number;
        };
        staffStats: Array<{
          staffId: string;
          staffName: string;
          employeeId: string;
          totalDistance: number;
          totalTime: number;
          totalTimeInMotion: number;
          totalTimeAtRest: number;
          trackingPoints: number;
          status: string;
          currentLocation?: {
            latitude: number;
            longitude: number;
            address?: string;
            fullAddress?: string;
            city?: string;
            pincode?: string;
            timestamp: string;
            movementType?: string;
            batteryPercent?: number;
            lastUpdated: string;
          };
        }>;
        dateRange: { start: string; end: string } | null;
        pagination: { page: number; limit: number; total: number; pages: number };
      };
    }, { date?: string; month?: string; year?: string; staffId?: string; startDate?: string; endDate?: string; page?: number; limit?: number; search?: string }>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.date) queryParams.append('date', params.date);
        if (params.month) queryParams.append('month', params.month);
        if (params.year) queryParams.append('year', params.year);
        if (params.staffId) queryParams.append('staffId', params.staffId);
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.page) queryParams.append('page', params.page.toString());
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.search) queryParams.append('search', params.search);
        const queryString = queryParams.toString();
        return `/tracking/dashboard/stats${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['TrackingDashboard'],
    }),

    // Generate tracking report (for download)
    generateTrackingReport: builder.query<
      Blob,
      { date?: string; month?: string; year?: string; staffId?: string; startDate?: string; endDate?: string; format?: string }
    >({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params.date) queryParams.append('date', params.date);
        if (params.month) queryParams.append('month', params.month);
        if (params.year) queryParams.append('year', params.year);
        if (params.staffId) queryParams.append('staffId', params.staffId);
        if (params.startDate) queryParams.append('startDate', params.startDate);
        if (params.endDate) queryParams.append('endDate', params.endDate);
        if (params.format) queryParams.append('format', params.format);
        const queryString = queryParams.toString();
        return {
          url: `/tracking/report${queryString ? `?${queryString}` : ''}`,
          responseHandler: async (response) => {
            const blob = await response.blob();
            return blob;
          },
        };
      },
    }),
  }),
});

export const {
  useGetStaffWithLocationAccessQuery,
  useGetStaffTimelineQuery,
  useLazyGetStaffTimelineQuery,
  useGetLiveTrackingQuery,
  useGetMultipleStaffTimelineQuery,
  useLazyGetMultipleStaffTimelineQuery,
  useGetTrackingDashboardStatsQuery,
  useLazyGenerateTrackingReportQuery,
} = trackingApi;
