# HRMS (Human Resource Management System) - Frontend Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [Core Modules & Features](#core-modules--features)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [Routing](#routing)
9. [Components](#components)
10. [Configuration](#configuration)
11. [Development Setup](#development-setup)
12. [Key Implementation Details](#key-implementation-details)

---

## Project Overview

**HRMS (Human Resource Management System)** is a comprehensive web application designed to manage all aspects of human resources, from recruitment and onboarding to payroll, performance management, and employee lifecycle management. The frontend is built as a modern, responsive Single Page Application (SPA) using React and TypeScript.

### Key Characteristics
- **Type**: Enterprise HR Management System
- **Architecture**: Client-Server (SPA Frontend + RESTful Backend API)
- **Primary Purpose**: Complete HR operations management including:
  - Recruitment & Candidate Management
  - Staff Management
  - Payroll & Attendance
  - Performance Management (PMS)
  - Learning Management (LMS)
  - Asset Management
  - Leave & Loan Management
  - Settings & Configuration

---

## Technology Stack

### Core Framework & Libraries
- **React 18.3.1** - UI library
- **TypeScript 5.8.3** - Type safety
- **Vite 5.4.19** - Build tool and dev server
- **React Router DOM 6.30.1** - Client-side routing

### State Management
- **Redux Toolkit 2.0.1** - State management
- **RTK Query** - Data fetching and caching (part of Redux Toolkit)
- **React Redux 9.0.4** - React bindings for Redux

### UI Framework & Components
- **Shadcn UI** - Component library (built on Radix UI)
- **Radix UI** - Accessible component primitives
- **Ant Design 6.0.0** - Additional UI components (DatePicker, Select, etc.)
- **Tailwind CSS 3.4.17** - Utility-first CSS framework
- **Lucide React 0.462.0** - Icon library

### Form Management
- **React Hook Form 7.61.1** - Form state management
- **Zod 3.25.76** - Schema validation
- **@hookform/resolvers 3.10.0** - Form validation resolvers

### Additional Libraries
- **date-fns 3.6.0** - Date manipulation
- **recharts 2.15.4** - Charting library
- **sonner 1.7.4** - Toast notifications
- **next-themes 0.3.0** - Theme management (dark/light mode support)

### Development Tools
- **ESLint 9.32.0** - Code linting
- **TypeScript ESLint** - TypeScript-specific linting
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

---

## Project Structure

```
frontend/
├── public/                 # Static assets
│   ├── favicon.ico
│   └── placeholder.svg
├── src/
│   ├── components/         # Reusable components
│   │   ├── ui/            # Shadcn UI components (50+ components)
│   │   ├── Header.tsx     # Top navigation header
│   │   ├── Sidebar.tsx    # Side navigation menu
│   │   ├── MainLayout.tsx # Main layout wrapper
│   │   └── NavLink.tsx    # Navigation link component
│   ├── pages/             # Page components (route components)
│   │   ├── InterviewPages/    # Recruitment module
│   │   ├── staffPages/        # Staff management
│   │   ├── payrollPages/      # Payroll & attendance
│   │   ├── pmsPages/          # Performance management
│   │   ├── performancePages/   # Performance & KRA/KPI
│   │   ├── lms/               # Learning management
│   │   ├── assetsPages/      # Asset management
│   │   └── settingsPages/    # Settings & configuration
│   ├── store/             # Redux store configuration
│   │   ├── api/           # RTK Query API slices
│   │   │   ├── apiSlice.ts        # Base API configuration
│   │   │   ├── authApi.ts         # Authentication endpoints
│   │   │   ├── candidateApi.ts    # Candidate management
│   │   │   ├── staffApi.ts         # Staff management
│   │   │   ├── payrollApi.ts      # Payroll endpoints
│   │   │   ├── attendanceApi.ts   # Attendance endpoints
│   │   │   ├── dashboardApi.ts    # Dashboard data
│   │   │   ├── pmsApi.ts           # Performance management
│   │   │   ├── lmsApi.ts           # Learning management
│   │   │   ├── assetsApi.ts       # Asset management
│   │   │   ├── reimbursementApi.ts # Reimbursements
│   │   │   ├── loanApi.ts          # Loans
│   │   │   ├── leaveApi.ts         # Leaves
│   │   │   ├── kraApi.ts           # KRA/KPI
│   │   │   └── settingsApi.ts     # Settings
│   │   ├── slices/        # Redux slices
│   │   │   └── authSlice.ts # Authentication state
│   │   ├── store.ts        # Store configuration
│   │   └── hooks.ts        # Typed Redux hooks
│   ├── hooks/             # Custom React hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/               # Utility functions
│   │   └── utils.ts       # Helper functions (cn, etc.)
│   ├── App.tsx            # Root component with routing
│   ├── main.tsx           # Application entry point
│   └── index.css          # Global styles
├── package.json           # Dependencies & scripts
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind CSS configuration
├── tsconfig.json          # TypeScript configuration
└── components.json        # Shadcn UI configuration
```

---

## Architecture

### Application Architecture Pattern
The application follows a **Component-Based Architecture** with:
- **Separation of Concerns**: UI components, business logic (API calls), and state management are separated
- **Container/Presentational Pattern**: Pages act as containers, UI components as presentational
- **Feature-Based Organization**: Pages organized by business domain/module

### Data Flow
```
User Action → Component → RTK Query Hook → API Call → Backend
                ↓                              ↓
         Redux Store ← Cache Update ← Response
                ↓
         Component Re-render
```

### State Management Architecture
- **Global State**: Redux Toolkit Store
  - Authentication state (authSlice)
  - API cache (RTK Query)
- **Local State**: React useState/useReducer for component-specific state
- **Server State**: RTK Query handles all server state, caching, and synchronization

### Authentication Flow
1. User submits login/signup form
2. API call via RTK Query mutation
3. On success: Store token in localStorage + Redux state
4. Token included in all subsequent API requests via `prepareHeaders`
5. Protected routes check authentication state

---

## Core Modules & Features

### 1. **Dashboard Module** (`/dashboard`)
- **Purpose**: Central hub displaying key metrics and recent activity
- **Features**:
  - Statistics cards (Total Employees, Hired This Month, Avg Performance, Payroll Processed)
  - Recent activity feed
  - Quick action buttons
- **API Integration**: `useGetDashboardStatsQuery` from `dashboardApi`

### 2. **Recruitment & Interview Module** (`/candidates`, `/interview-*`)
- **Main Pages**:
  - **Candidates** (`/candidates`): Candidate management with multiple views
    - Table View: Detailed list with sorting/filtering
    - Card View: Visual card layout
    - Kanban View: Status-based board (Applied → Screening → Shortlisted → Interview → Offer → Hired → Rejected)
    - Multi-step candidate creation form
  - **Interview Appointments** (`/interview-appointments`): Schedule and manage interviews
  - **Job Openings** (`/job-openings`): Manage job postings
  - **Onboarding** (`/onboarding`): New employee onboarding workflow
  - **Refer Candidate** (`/refer-candidate`): Employee referral system
  - **Generate Offer Letter** (`/generate-offer-letter`): Create offer letters
  - **Applications** (`/create-interview`): Create interview applications
  - **Candidate Profile** (`/candidate/:id`): Detailed candidate view
- **API Integration**: `candidateApi` with endpoints for CRUD operations, status updates, statistics

### 3. **Staff Management Module** (`/staff`)
- **Main Pages**:
  - **Staff Overview** (`/staff`): List all staff members with filters
  - **Staff Profile** (`/staff-profile/:id`): Individual staff details
  - **Leaves Pending Approval** (`/leaves-pending-approval`): Leave request management
  - **Loans** (`/loans`): Employee loan management
  - **Expense Claim** (`/expense-claim`): Expense reimbursement claims
- **API Integration**: `staffApi`, `leaveApi`, `loanApi`

### 4. **Payroll Module** (`/payroll`, `/payroll-attendance`)
- **Main Pages**:
  - **Payroll Hub** (`/payroll`): Payroll overview and navigation
  - **Payroll Management** (`/payroll/management`): Process and manage payroll
  - **Attendance** (`/payroll-attendance`): Track employee attendance
  - **Attendance Detail** (`/payroll/attendance/:employeeId`): Individual attendance records
  - **Reimbursements** (`/reimbursement`): Reimbursement requests and approvals
- **API Integration**: `payrollApi`, `attendanceApi`, `reimbursementApi`

### 5. **Performance Management System (PMS)** (`/pms/*`)
- **Main Pages**:
  - **My Goals** (`/pms/my-goals`): Employee goal setting and tracking
  - **Goal Progress** (`/pms/goal-progress`): Monitor goal completion
  - **Goal Approval** (`/pms/goal-approval`): Manager approval workflow
  - **Self Review** (`/pms/self-review`): Employee self-assessment
  - **Manager Review** (`/pms/manager-review`): Manager performance reviews
  - **HR Review** (`/pms/hr-review`): HR performance evaluation
  - **PMS Reports** (`/pms/reports`): Performance analytics and reports
  - **PMS Settings** (`/pms/settings`): Configure PMS parameters
- **API Integration**: `pmsApi`

### 6. **Performance & KRA/KPI Module** (`/performance`, `/kra`, `/kpi`)
- **Main Pages**:
  - **Performance** (`/performance`): Overall performance dashboard
  - **KRA/KPI** (`/kra`, `/kpi`): Key Result Areas and Key Performance Indicators management
  - **SOP** (`/sop`): Standard Operating Procedures
  - **Compliance** (`/compliance`): Compliance tracking
- **API Integration**: `kraApi`

### 7. **Learning Management System (LMS)** (`/course-library`, `/live-session`, etc.)
- **Main Pages**:
  - **Course Library** (`/course-library`): Browse and access training courses
  - **Course View** (`/course/:courseName`): Individual course details
  - **Live Session** (`/live-session`): Schedule and attend live training sessions
  - **Auto Quiz Generator** (`/quiz-generator`): Generate quizzes automatically
  - **Quiz/Assessment** (`/assessment`): Take quizzes and assessments
  - **Score/Analytics** (`/score`): View quiz scores and learning analytics
- **API Integration**: `lmsApi`

### 8. **Asset Management Module** (`/assets`, `/assets-type`)
- **Main Pages**:
  - **Assets** (`/assets`): Manage company assets (laptops, equipment, etc.)
  - **Asset Types** (`/assets-type`): Define asset categories
- **API Integration**: `assetsApi`

### 9. **Settings Module** (`/settings`, `/settings/*`)
Comprehensive settings management with multiple sub-modules:

#### 9.1 **User Management** (`/user-management`)
- Manage system users and permissions

#### 9.2 **Attendance Settings** (`/attendance-setting`)
- **Attendance Templates** (`/attendance-templates`): Create attendance templates
- **Geofence** (`/attendance-geofence`): Location-based attendance
- **Shift Settings** (`/attendance-shifts`): Configure work shifts
- **Automation Rules** (`/attendance-automation-rules`): Automated attendance rules

#### 9.3 **Business Settings** (`/business-setting`)
- **Holiday Templates** (`/business/holiday-templates`): Define holidays
- **Leave Templates** (`/business/leave-templates`): Leave policy templates
- **Manage Users** (`/business/manage-users`): User administration
- **Celebrations** (`/business/celebrations`): Company events and celebrations
- **Weekly Holidays** (`/business/weekly-holidays`): Weekly off days
- **Roles & Permissions** (`/business/roles-permissions`): Access control
- **Business Functions** (`/business/business-functions`): Organizational functions
- **Staff Details** (`/business/staff-details`): Staff information management

#### 9.4 **Salary Settings** (`/salary-setting`)
- **Calculation Logic** (`/salary/calculation-logic`): Payroll calculation rules
- **Salary Components** (`/salary/components`): Salary structure components
- **Details Access** (`/salary/details-access`): Salary visibility controls
- **Payslip Customization** (`/salary/payslip-customization`): Customize payslip format
- **Template Builder** (`/salary/template-builder`): Create salary templates

#### 9.5 **Payment Settings** (`/payment-setting`)
- **Business Bank Account** (`/payment/business-account`): Bank account details
- **Business Name Bank Statement** (`/payment/business-name`): Bank statement configuration

#### 9.6 **Business Info Settings** (`/businessinfo-setting`)
- **Edit Business Name** (`/business-info/edit-business-name`)
- **Edit State/City** (`/business-info/edit-state-city`)
- **Edit Business Address** (`/business-info/edit-business-address`)
- **Edit Business Logo** (`/business-info/edit-business-logo`)

#### 9.7 **Account Settings** (`/account-setting`)
- **Edit Name** (`/account/edit-name`)
- **Edit Phone Number** (`/account/edit-phone-number`)
- **Edit Email** (`/account/edit-email`)
- **Business List** (`/account/business-list`): Multi-business management

#### 9.8 **Other Settings** (`/others-setting`)
- **Channel Partner ID** (`/others/channel-partner-id`)
- **Alerts & Notifications** (`/others/alerts-notifications`)

- **API Integration**: `settingsApi`

### 10. **Company Policies** (`/company`)
- View and manage company policies

---

## State Management

### Redux Store Structure

```typescript
{
  api: {
    queries: {},      // RTK Query cache
    mutations: {},    // RTK Query mutations
    provided: {},    // Tag-based cache invalidation
    subscriptions: {}
  },
  auth: {
    user: User | null,
    token: string | null,
    isAuthenticated: boolean
  }
}
```

### Redux Slices

#### **authSlice** (`store/slices/authSlice.ts`)
- **State**: User information, authentication token, authentication status
- **Actions**:
  - `setCredentials`: Store user and token after login/signup
  - `logout`: Clear authentication data
- **Persistence**: Token stored in localStorage

### RTK Query API Slices

All API slices extend the base `apiSlice` and provide:
- **Automatic caching**: Responses cached by default
- **Cache invalidation**: Tag-based invalidation system
- **Loading states**: Built-in loading/error states
- **Optimistic updates**: Support for optimistic UI updates

#### Available API Slices:
1. **authApi**: Authentication (login, register, getCurrentUser, updateProfile)
2. **candidateApi**: Candidate CRUD, status updates, statistics
3. **staffApi**: Staff management, statistics
4. **payrollApi**: Payroll processing, statistics
5. **attendanceApi**: Attendance tracking, statistics
6. **dashboardApi**: Dashboard statistics and recent activity
7. **pmsApi**: Performance management goals and reviews
8. **lmsApi**: Courses, quizzes, analytics
9. **assetsApi**: Asset management
10. **reimbursementApi**: Reimbursement requests
11. **loanApi**: Loan applications and management
12. **leaveApi**: Leave requests and approvals
13. **kraApi**: KRA/KPI management
14. **settingsApi**: Settings management

### Typed Hooks

Custom typed hooks in `store/hooks.ts`:
- `useAppDispatch`: Typed dispatch function
- `useAppSelector`: Typed selector hook

---

## API Integration

### Base API Configuration (`store/api/apiSlice.ts`)

```typescript
baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
credentials: 'include'  // Include cookies in requests
```

**Headers**:
- `Authorization: Bearer <token>` (from localStorage)
- `Content-Type: application/json`
- `Accept: application/json`

### API Response Format

All API responses follow a consistent structure:
```typescript
{
  success: boolean,
  data: T,  // Actual response data
  error?: {
    message: string,
    errors?: Array<{ msg: string, param: string }>
  }
}
```

### RTK Query Tag System

Tags used for cache invalidation:
- `'User'`, `'Staff'`, `'Candidate'`, `'Payroll'`, `'Attendance'`
- `'Dashboard'`, `'Performance'`, `'PMS'`, `'LMS'`, `'Assets'`
- `'Settings'`, `'Reimbursement'`, `'Loan'`, `'Leave'`, `'KRA'`

### Example API Usage

```typescript
// In a component
const { data, isLoading, error } = useGetCandidatesQuery({
  search: searchTerm,
  status: 'Applied',
  page: 1,
  limit: 50
});

const [createCandidate, { isLoading: isCreating }] = useCreateCandidateMutation();

const handleSubmit = async () => {
  try {
    const result = await createCandidate(candidateData).unwrap();
    // Success handling
  } catch (error) {
    // Error handling
  }
};
```

---

## Routing

### Route Structure

The application uses **React Router DOM v6** with:
- **Public Routes**: `/`, `/signup` (Login/Signup pages)
- **Protected Routes**: All other routes (require authentication)
- **Dynamic Routes**: Routes with parameters (e.g., `/candidate/:id`)

### Main Routes

#### Authentication
- `/` - Login page
- `/signup` - Registration page

#### Core Modules
- `/dashboard` - Main dashboard
- `/candidates` - Candidate management
- `/candidate/:id` - Candidate profile
- `/staff` - Staff overview
- `/staff-profile/:id` - Staff profile
- `/payroll` - Payroll hub
- `/payroll/management` - Payroll management
- `/payroll-attendance` - Attendance tracking
- `/reimbursement` - Reimbursements
- `/loans` - Loan management
- `/leaves-pending-approval` - Leave approvals

#### Performance & PMS
- `/pms/my-goals` - Employee goals
- `/pms/goal-progress` - Goal tracking
- `/pms/self-review` - Self review
- `/pms/manager-review` - Manager review
- `/pms/hr-review` - HR review
- `/pms/reports` - PMS reports
- `/pms/settings` - PMS settings
- `/performance` - Performance dashboard
- `/kra`, `/kpi` - KRA/KPI management
- `/sop` - Standard Operating Procedures
- `/compliance` - Compliance

#### Learning Management
- `/course-library` - Course library
- `/course/:courseName` - Course details
- `/live-session` - Live sessions
- `/quiz-generator` - Quiz generator
- `/assessment` - Quizzes
- `/score` - Analytics

#### Assets
- `/assets` - Asset management
- `/assets-type` - Asset types

#### Settings (50+ routes)
- `/settings` - Settings hub
- `/user-management` - User management
- `/attendance-setting` - Attendance settings
- `/business-setting` - Business settings
- `/salary-setting` - Salary settings
- `/payment-setting` - Payment settings
- `/businessinfo-setting` - Business info
- `/account-setting` - Account settings
- `/others-setting` - Other settings
- ... (many sub-routes)

#### Other
- `/company` - Company policies
- `*` - 404 Not Found page

### Route Protection

Currently, route protection is handled at the component level. Future enhancement: Add route guards/private routes.

---

## Components

### Layout Components

#### **MainLayout** (`components/MainLayout.tsx`)
- Wraps all authenticated pages
- Provides Sidebar and Header
- Responsive layout with mobile sidebar support

#### **Sidebar** (`components/Sidebar.tsx`)
- Fixed desktop sidebar (256px width)
- Mobile drawer sidebar (Sheet component)
- Collapsible menu sections
- Active route highlighting
- Auto-expands based on current route

**Menu Structure**:
- Dashboard
- Interview (7 sub-items)
- Asset Management (2 sub-items)
- Staff (1 sub-item)
- Performance (7 sub-items)
- Payroll (3 sub-items)
- LMS (5 sub-items)
- Company Policy
- Settings (9 sub-items)

#### **Header** (`components/Header.tsx`)
- Fixed top header (64px height)
- Mobile menu toggle button
- Notification bell
- User profile dropdown
- Profile drawer (Sheet)

### UI Components (Shadcn UI)

50+ reusable components in `components/ui/`:
- **Form Components**: Input, Textarea, Select, Checkbox, Radio, Switch
- **Layout**: Card, Separator, Sheet, Dialog, Drawer
- **Navigation**: Tabs, Breadcrumb, Navigation Menu
- **Feedback**: Toast, Alert, Progress, Skeleton
- **Data Display**: Table, Badge, Avatar, Chart
- **Overlay**: Popover, Tooltip, Hover Card, Dropdown Menu
- **Calendar**: Date picker, Calendar
- **And more...**

All components are:
- Built on Radix UI primitives
- Fully accessible (ARIA compliant)
- Customizable via Tailwind CSS
- TypeScript typed

### Custom Hooks

#### **use-mobile** (`hooks/use-mobile.tsx`)
- Detects mobile/desktop viewport
- Returns boolean for responsive behavior

#### **use-toast** (`hooks/use-toast.ts`)
- Toast notification hook
- Used with Shadcn Toast component

---

## Configuration

### Environment Variables

Create `.env` file in `frontend/`:
```env
VITE_API_URL=http://localhost:5000/api
```

### Vite Configuration (`vite.config.ts`)

```typescript
{
  server: {
    host: "::",
    port: 8080
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
}
```

**Path Alias**: `@/` maps to `src/` directory

### Tailwind Configuration (`tailwind.config.ts`)

- **Dark Mode**: Class-based (`darkMode: ["class"]`)
- **Custom Colors**: Primary, secondary, destructive, muted, accent, success, warning, info
- **Sidebar Colors**: Custom sidebar color scheme
- **Animations**: Accordion animations
- **Plugins**: `tailwindcss-animate`

### TypeScript Configuration

- **Strict Mode**: Enabled
- **Path Mapping**: `@/*` → `src/*`
- **Target**: ES2020
- **Module**: ESNext

---

## Development Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- npm or yarn or bun

### Installation

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

Server runs on `http://localhost:8080`

### Build for Production

```bash
npm run build
```

Output: `dist/` directory

### Preview Production Build

```bash
npm run preview
```

### Linting

```bash
npm run lint
```

---

## Key Implementation Details

### Authentication Flow

1. **Login/Signup**:
   ```typescript
   const [login, { isLoading }] = useLoginMutation();
   const dispatch = useAppDispatch();
   
   const result = await login({ email, password }).unwrap();
   dispatch(setCredentials({
     user: result.data.user,
     token: result.data.token
   }));
   ```

2. **Token Management**:
   - Stored in localStorage
   - Automatically included in API requests via `prepareHeaders`
   - Cleared on logout

3. **Protected Routes**:
   - Currently handled at component level
   - Future: Implement route guards

### Candidate Management Implementation

**Multi-step Form**:
- Step 1: Personal & Position Details
- Step 2: Education
- Step 3: Experience
- Step 4: Documents
- Step 5: Review & Submit

**Views**:
- **Table View**: Sortable, filterable table
- **Card View**: Visual card grid
- **Kanban View**: Status-based drag-and-drop board

**Filtering**:
- Search by name, email, position, skill
- Filter by status
- Real-time filtering

### API Error Handling

```typescript
try {
  const result = await mutation(data).unwrap();
  // Success
} catch (error: any) {
  const errorMessage = 
    error?.data?.error?.message || 
    error?.data?.error?.errors?.[0]?.msg || 
    "Operation failed";
  message.error(errorMessage);
}
```

### Loading States

RTK Query provides built-in loading states:
```typescript
const { data, isLoading, error, isFetching } = useQuery();
```

### Cache Management

- **Automatic Caching**: All queries cached by default
- **Cache Invalidation**: Using tags
  ```typescript
  invalidatesTags: ['Candidate']
  ```
- **Refetching**: Automatic refetch on window focus (configurable)

### Responsive Design

- **Mobile-First**: Tailwind CSS mobile-first approach
- **Breakpoints**: 
  - `sm`: 640px
  - `md`: 768px
  - `lg`: 1024px
  - `xl`: 1280px
- **Mobile Sidebar**: Sheet drawer on mobile
- **Responsive Grids**: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

### Form Validation

- **Client-Side**: React Hook Form + Zod
- **Server-Side**: Backend validation (errors returned in API response)
- **Error Display**: Field-level and form-level errors

### Toast Notifications

Using **Sonner** and **Shadcn Toast**:
```typescript
import { message } from "antd";
message.success("Operation successful");
message.error("Operation failed");
```

---

## API Endpoints Summary

### Authentication
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`
- `PUT /api/auth/profile`

### Candidates
- `GET /api/candidates` (with query params: search, status, page, limit)
- `GET /api/candidates/stats`
- `GET /api/candidates/:id`
- `POST /api/candidates`
- `PUT /api/candidates/:id`
- `PATCH /api/candidates/:id/status`
- `DELETE /api/candidates/:id`

### Staff
- `GET /api/staff`
- `GET /api/staff/stats`
- `GET /api/staff/:id`
- `POST /api/staff`
- `PUT /api/staff/:id`
- `DELETE /api/staff/:id`

### Payroll
- `GET /api/payroll`
- `GET /api/payroll/stats`
- `GET /api/payroll/:id`
- `POST /api/payroll`
- `PUT /api/payroll/:id`
- `POST /api/payroll/process`

### Attendance
- `GET /api/attendance`
- `GET /api/attendance/stats`
- `GET /api/attendance/employee/:employeeId`
- `GET /api/attendance/:id`
- `POST /api/attendance`
- `PUT /api/attendance/:id`

### Dashboard
- `GET /api/dashboard/stats`

### And many more...

---

## Best Practices Implemented

1. **Type Safety**: Full TypeScript coverage
2. **Component Reusability**: Shadcn UI components
3. **State Management**: Centralized with Redux Toolkit
4. **API Caching**: RTK Query automatic caching
5. **Error Handling**: Comprehensive error handling
6. **Loading States**: Proper loading indicators
7. **Responsive Design**: Mobile-first approach
8. **Code Organization**: Feature-based folder structure
9. **Accessibility**: ARIA-compliant components
10. **Performance**: Code splitting, lazy loading (future)

---

## Future Enhancements

1. **Route Guards**: Implement protected route components
2. **Role-Based Access Control (RBAC)**: Show/hide features based on user role
3. **Real-time Updates**: WebSocket integration for live updates
4. **Offline Support**: Service workers for offline functionality
5. **Internationalization (i18n)**: Multi-language support
6. **Advanced Filtering**: More sophisticated filter options
7. **Export Functionality**: PDF/Excel export for reports
8. **File Upload**: Enhanced file upload with progress
9. **Data Visualization**: More charts and analytics
10. **Performance Optimization**: Code splitting, lazy loading

---

## Conclusion

This HRMS frontend is a comprehensive, modern React application built with best practices, providing a complete solution for human resource management. The architecture is scalable, maintainable, and ready for production deployment.

For backend documentation, refer to `backend/README.md`.

---

**Document Version**: 1.0  
**Last Updated**: December 2024  
**Maintained By**: Development Team

