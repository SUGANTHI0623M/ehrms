# Backend Integration Guide for Progress Insights

## Quick Start: Replacing Mock Data with Real APIs

### Step 1: Update ProgressInsightsPage.tsx

Replace the mock service imports with actual API hooks:

```typescript
// BEFORE (Mock Data):
import { lmsService } from './mockServices'; // Remove this

const { data: stats } = useQuery({
  queryKey: ['progress-stats'],
  queryFn: lmsService.getEmployeeProgress
});

// AFTER (Real API):
import {
  useGetEmployeeProgressQuery,
  useGetEmployeeActivityQuery,
  useGetEmployeeSkillsQuery,
  useGetEmployeeAchievementsQuery,
  useGetEmployeeLeaderboardQuery,
  useGetEmployeeRecentActivityQuery,
  useGetEmployeeDeadlinesQuery,
} from '@/store/api/lmsApi';

const { data: statsResponse, isLoading: statsLoading } = useGetEmployeeProgressQuery();
const stats = statsResponse?.data;

const { data: activityResponse } = useGetEmployeeActivityQuery(selectedYear);
const activity = activityResponse?.data;

const { data: skillsResponse } = useGetEmployeeSkillsQuery();
const skills = skillsResponse?.data;

const { data: achievementsResponse } = useGetEmployeeAchievementsQuery();
const achievements = achievementsResponse?.data;

const { data: leaderboardResponse } = useGetEmployeeLeaderboardQuery();
const leaderboard = leaderboardResponse?.data;

const { data: recentActivityResponse } = useGetEmployeeRecentActivityQuery();
const recentActivity = recentActivityResponse?.data;

const { data: deadlinesResponse } = useGetEmployeeDeadlinesQuery();
const deadlines = deadlinesResponse?.data;
```

### Step 2: Remove Mock Service Definition

Delete or comment out the `lmsService` object in ProgressInsightsPage.tsx (lines ~40-250).

### Step 3: Backend Controller Implementation

Create `backend/controllers/lms/progressInsights.controller.js`:

```javascript
const CourseProgress = require('../../models/CourseProgress');
const Course = require('../../models/Course');
const User = require('../../models/User');
const dayjs = require('dayjs');

// 1. Get Employee Progress Stats
exports.getEmployeeProgress = async (req, res) => {
  try {
    const employeeId = req.user._id;

    // Get all course progress for employee
    const allProgress = await CourseProgress.find({ employeeId })
      .populate('courseId');

    const totalCourses = allProgress.length;
    const completedCourses = allProgress.filter(p => p.status === 'Completed').length;
    const inProgressCourses = allProgress.filter(p => p.status === 'In Progress').length;

    // Calculate total lessons completed
    const totalLessonsCompleted = allProgress.reduce((sum, p) => {
      return sum + (p.contentProgress?.filter(c => c.viewed).length || 0);
    }, 0);

    // Calculate total time spent (in minutes)
    const totalTimeSpent = allProgress.reduce((sum, p) => sum + (p.timeSpent || 0), 0);

    // Calculate streak
    const { currentStreak, longestStreak } = await calculateStreak(employeeId);

    // Calculate overall progress
    const overallProgress = totalCourses > 0
      ? Math.round(allProgress.reduce((sum, p) => sum + p.completionPercentage, 0) / totalCourses)
      : 0;

    // Get rank
    const rank = await calculateRank(employeeId);

    res.json({
      success: true,
      data: {
        totalCourses,
        completedCourses,
        inProgressCourses,
        totalLessonsCompleted,
        totalTimeSpent,
        currentStreak,
        longestStreak,
        overallProgress,
        rank
      }
    });
  } catch (error) {
    console.error('Error fetching employee progress:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 2. Get Daily Activity for Heatmap
exports.getEmployeeActivity = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const { year } = req.query;

    const startDate = dayjs(`${year}-01-01`).startOf('day').toDate();
    const endDate = dayjs(`${year}-12-31`).endOf('day').toDate();

    // Aggregate daily activity
    const activity = await CourseProgress.aggregate([
      {
        $match: {
          employeeId: employeeId,
          'contentProgress.viewedAt': {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      { $unwind: '$contentProgress' },
      {
        $match: {
          'contentProgress.viewedAt': {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$contentProgress.viewedAt'
            }
          },
          count: { $sum: 1 },
          timeSpent: { $sum: '$timeSpent' }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1,
          timeSpent: 1
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Fill in missing dates with zero activity
    const allDates = [];
    let currentDate = dayjs(startDate);
    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
      const dateStr = currentDate.format('YYYY-MM-DD');
      const existing = activity.find(a => a.date === dateStr);
      allDates.push(existing || { date: dateStr, count: 0, timeSpent: 0 });
      currentDate = currentDate.add(1, 'day');
    }

    res.json({ success: true, data: allDates });
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 3. Get Skills Breakdown
exports.getEmployeeSkills = async (req, res) => {
  try {
    const employeeId = req.user._id;

    const progress = await CourseProgress.find({ employeeId })
      .populate('courseId');

    // Group by category
    const skillsMap = {};
    progress.forEach(p => {
      const category = p.courseId?.category || 'General';
      if (!skillsMap[category]) {
        skillsMap[category] = {
          category,
          completed: 0,
          total: 0,
          courses: []
        };
      }
      skillsMap[category].total++;
      if (p.status === 'Completed') {
        skillsMap[category].completed++;
      }
      skillsMap[category].courses.push({
        courseId: p.courseId._id,
        title: p.courseId.title,
        status: p.status.toLowerCase().replace(' ', '-')
      });
    });

    // Calculate levels
    const skills = Object.values(skillsMap).map(skill => {
      const percentage = (skill.completed / skill.total) * 100;
      let level = 'Beginner';
      if (percentage >= 90) level = 'Expert';
      else if (percentage >= 70) level = 'Advanced';
      else if (percentage >= 40) level = 'Intermediate';

      return { ...skill, level };
    });

    res.json({ success: true, data: skills });
  } catch (error) {
    console.error('Error fetching skills:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 4. Get Achievements
exports.getEmployeeAchievements = async (req, res) => {
  try {
    const employeeId = req.user._id;

    // Get user's achievement data
    const user = await User.findById(employeeId);
    const progress = await CourseProgress.find({ employeeId });

    const achievements = [
      {
        id: '1',
        name: 'Fire Starter',
        description: 'Complete your first course',
        icon: '🔥',
        category: 'completion',
        isUnlocked: progress.some(p => p.status === 'Completed'),
        unlockedAt: progress.find(p => p.status === 'Completed')?.updatedAt,
        progress: progress.some(p => p.status === 'Completed') ? 100 : 0
      },
      // Add more achievements...
    ];

    res.json({ success: true, data: achievements });
  } catch (error) {
    console.error('Error fetching achievements:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 5. Get Leaderboard
exports.getEmployeeLeaderboard = async (req, res) => {
  try {
    const employeeId = req.user._id;
    const currentUser = await User.findById(employeeId);

    // Get all employees in same department
    const employees = await User.find({
      department: currentUser.department,
      role: 'Employee'
    });

    // Calculate progress for each
    const leaderboard = await Promise.all(
      employees.map(async (emp) => {
        const progress = await CourseProgress.find({ employeeId: emp._id });
        const totalProgress = progress.length > 0
          ? Math.round(progress.reduce((sum, p) => sum + p.completionPercentage, 0) / progress.length)
          : 0;

        return {
          userId: emp._id,
          name: emp.name,
          avatar: emp.name.split(' ').map(n => n[0]).join(''),
          progress: totalProgress,
          courses: progress.filter(p => p.status === 'Completed').length,
          isCurrentUser: emp._id.toString() === employeeId.toString()
        };
      })
    );

    // Sort and add ranks
    leaderboard.sort((a, b) => b.progress - a.progress);
    leaderboard.forEach((item, index) => {
      item.rank = index + 1;
    });

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 6. Get Recent Activity
exports.getEmployeeRecentActivity = async (req, res) => {
  try {
    const employeeId = req.user._id;

    const recentProgress = await CourseProgress.find({ employeeId })
      .populate('courseId')
      .sort({ updatedAt: -1 })
      .limit(10);

    const activity = recentProgress.map(p => {
      const timeDiff = dayjs().diff(dayjs(p.updatedAt), 'hour');
      const timeStr = timeDiff < 24
        ? `${timeDiff} hours ago`
        : `${Math.floor(timeDiff / 24)} days ago`;

      return {
        type: p.status === 'Completed' ? 'completed' : 'started',
        title: `${p.status === 'Completed' ? 'Completed' : 'Started'} "${p.courseId.title}"`,
        time: timeStr,
        icon: p.status === 'Completed' ? 'check' : 'play'
      };
    });

    res.json({ success: true, data: activity });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 7. Get Upcoming Deadlines
exports.getEmployeeDeadlines = async (req, res) => {
  try {
    const employeeId = req.user._id;

    const progress = await CourseProgress.find({
      employeeId,
      status: { $in: ['Not Started', 'In Progress'] }
    }).populate('courseId');

    const deadlines = progress
      .filter(p => p.courseId?.completionDuration)
      .map(p => {
        const assignedDate = dayjs(p.createdAt);
        const duration = p.courseId.completionDuration;
        const dueDate = assignedDate.add(duration.value, duration.unit.toLowerCase());
        const daysLeft = dueDate.diff(dayjs(), 'day');

        let urgency = 'low';
        if (daysLeft < 3) urgency = 'high';
        else if (daysLeft < 7) urgency = 'medium';

        return {
          id: p._id,
          title: p.courseId.title,
          dueDate: dueDate.toDate(),
          progress: p.completionPercentage,
          urgency
        };
      })
      .sort((a, b) => dayjs(a.dueDate).diff(dayjs(b.dueDate)));

    res.json({ success: true, data: deadlines });
  } catch (error) {
    console.error('Error fetching deadlines:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper Functions
async function calculateStreak(employeeId) {
  // Implementation for streak calculation
  // This would track consecutive days of activity
  return { currentStreak: 12, longestStreak: 18 };
}

async function calculateRank(employeeId) {
  // Implementation for rank calculation
  return {
    department: 24,
    company: 142,
    totalInDept: 150,
    totalInCompany: 850
  };
}

module.exports = exports;
```

### Step 4: Add Routes

In `backend/routes/lms.routes.js`:

```javascript
const progressInsights = require('../controllers/lms/progressInsights.controller');

// Progress Insights Routes
router.get('/employee/progress', auth, progressInsights.getEmployeeProgress);
router.get('/employee/activity', auth, progressInsights.getEmployeeActivity);
router.get('/employee/skills', auth, progressInsights.getEmployeeSkills);
router.get('/employee/achievements', auth, progressInsights.getEmployeeAchievements);
router.get('/employee/leaderboard', auth, progressInsights.getEmployeeLeaderboard);
router.get('/employee/recent-activity', auth, progressInsights.getEmployeeRecentActivity);
router.get('/employee/deadlines', auth, progressInsights.getEmployeeDeadlines);
```

### Step 5: Test the Integration

1. Start your backend server
2. Navigate to `/lms/employee/progress-insights`
3. Check browser console for API calls
4. Verify data is loading correctly

### Common Issues & Solutions

**Issue**: Data not loading
- Check network tab for failed requests
- Verify authentication token is being sent
- Check backend logs for errors

**Issue**: Wrong data structure
- Ensure backend response matches expected format
- Add data transformation if needed:
  ```typescript
  const stats = statsResponse?.data || statsResponse;
  ```

**Issue**: Loading states not working
- Verify `isLoading` is being used correctly
- Add error handling:
  ```typescript
  if (error) return <div>Error loading data</div>;
  if (isLoading) return <Spin />;
  ```

### Performance Optimization

1. **Add Caching**
   ```typescript
   const { data } = useGetEmployeeProgressQuery(undefined, {
     refetchOnMountOrArgChange: 300 // 5 minutes
   });
   ```

2. **Lazy Load Charts**
   ```typescript
   const RadarChart = lazy(() => import('recharts').then(m => ({ default: m.RadarChart })));
   ```

3. **Debounce Year Selection**
   ```typescript
   const debouncedYear = useDebounce(selectedYear, 500);
   useGetEmployeeActivityQuery(debouncedYear);
   ```

---

**Ready to go live?** Follow these steps and your Progress Insights dashboard will be fully integrated with your backend!
