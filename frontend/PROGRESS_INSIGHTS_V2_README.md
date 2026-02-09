# Progress Insights Dashboard (V2 - Real Data Integration)

## 📋 Overview
The dashboard has been updated to work with the **existing** LMS backend API (`/lms/employee/courses`) instead of requiring new dedicated analytics endpoints. All statistics are calculated client-side from the enrolled courses data.

## 🔌 API Integration

**Endpoint Used:**
`GET /api/lms/employee/courses`
(via `useGetEmployeeCoursesQuery` hook)

## 📊 Logic & Calculations

### 1. Stats Cards
- **Streak**: Calculated from `lastAccessedAt` dates. Checks strictly for consecutive activity days (Today/Yesterday backwards).
- **Completed**: Count of courses with `status === 'Completed'`.
- **Learning Time**: Sum of `timeSpent` (minutes) from all courses. Displayed as Hours/Minutes.
- **In Progress**: Count of courses with `status === 'In Progress'`.

### 2. Activity Calendar
- Displays activity for the **current month only**.
- Green indicators for days where any course was accessed (`lastAccessedAt` matches the day).

### 3. Charts & Lists
- **Progress Pie Chart**: Breakdown by status (Completed / In Progress / Not Started).
- **Category List**: Aggregation of courses by `category` field.
- **Upcoming Deadlines**: Filters for courses with valid `completionDuration` and non-completed status. Urgency calculated based on days remaining.
- **Recent Activity**: Sorts all courses by `lastAccessedAt` descending to show most recent interactions.

## 🛠 Removed Features (Simplification)
To match the current backend capabilities, the following mock features were removed:
- ❌ Skills Radar Chart
- ❌ Achievements/Badges System
- ❌ Leaderboard
- ❌ Year Selector for Heatmap

## 💻 Usage

The component is already integrated into `EmployeeLMSDashboard.tsx`.

```typescript
// Import
import { useProgressInsightsData, ProgressInsightsContent } from './ProgressInsightsPage';

// Component
const MyPage = () => {
  const data = useProgressInsightsData();
  
  if (data.isLoading) return <Spin />;
  
  return <ProgressInsightsContent {...data} />;
};
```
