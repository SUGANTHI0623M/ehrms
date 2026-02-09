# LMS Learning Engine - Design Specification 🚀

## 🧠 Core Philosophy
Transform the dashboard from a passive reporting tool into an **active learning engine**. 
*   **Principle**: If it doesn't answer "What should I learn next?" or "Am I improving?", it is removed.
*   **UX Pattern**: Dense, actionable, LeetCode-style density, Ant Design driven.

---

## 🏗 Layout Structure (Grid System)

The dashboard uses a **Responsive Grid (AntD Row/Col)**.

### **Zone A: Header & Daily Driver (Top)**
*   **Daily Learning Goal**: Dynamic progress bar (Tasks/Time).
*   **Streak Counter**: Fire icon + protection status.
*   **Resume Button**: Primary CTA "Continue [Lesson Name]".
*   _Insight_: "You need 15m more to hit today's goal."

### **Zone B: Performance & Consistency (Middle)**
*   **Left (40%) - Skill Radar**: Multi-axis radar chart (Confidence vs Competence).
*   **Right (60%) - Consistency Heatmap**: Calendar view of intensity.

### **Zone C: Actionable Insights (Bottom)**
*   **Left (50%) - Friction Points**: List of courses where progress is stalled (`stuck: true`).
*   **Right (50%) - Smart Recommendations**: "Skip ahead", "Revise", "Practice".

### **Zone D: Career Alignment (Footer/Sidebar)**
*   **Readiness Index**: % fit for next role.
*   **Performance Matrix**: Scatter chart (Effort vs Outcome).

---

## 📋 Component List (Ant Design Mapped)

| Widget | Component | UI Elements |
| :--- | :--- | :--- |
| **Daily Goal** | `Card` | `Progress` (Line), `Typography.Title`, `Button` (Primary) |
| **Streak** | `Statistic` | `FireOutlined`, `Tooltip` (Protection logic) |
| **Skill Radar** | `Radar` (Recharts) | `PolarGrid`, `PolarAngleAxis`, Custom Tooltip |
| **Heatmap** | `div` (Grid) | Custom square cells, `Tooltip` for activity details |
| **Friction** | `List` | `List.Item`, `Alert` (Warning), `Tag` (Reason) |
| **Recs** | `Card` | `Steps` (Vertical) or `List` with `ArrowRightOutlined` |
| **Readiness** | `Progress` | `Progress` (Dashboard type), `Statistic` |

---

## 🧪 Insight Rules (Logic)

### 1. Goal Setting
```javascript
IF (yesterday_active === false) {
   today_goal = standard_goal * 0.7; // Reduce friction to restart habit
   message = "Let's ease back in. Just 20 mins today.";
} ELSE {
   today_goal = standard_goal;
}
```

### 2. Friction Detection
```javascript
IF (lesson_replays > 3 OR quiz_fails > 2) {
   stuck_status = true;
   recommendation = "Schedule Mentor Session";
}
```

### 3. Readiness Index
```javascript
Readiness = (Assigned_Skills_Avg_Score * Weight) + (Compliance_Completion * Weight);
// Visualized as a gauge towards "Senior Developer" (Target Role)
```

---

## ✍️ UX Copy (Motivational)

*   **Good**: "You're in the top 10% for React. Ready for Advanced Hooks?"
*   **Bad**: "React Course: 89% Complete."
*   **Good**: "You missed yesterday. Recovery Mode active: smaller goal today."
*   **Bad**: "Streak Broken."
*   **Good**: "High effort detected in 'TypeScript'. Try a lower difficulty?"
*   **Bad**: "Score: 4/10."
