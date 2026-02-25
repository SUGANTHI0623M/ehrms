# LMS Module – Design System Documentation

This document describes the standardized UI patterns for the LMS (Learning Management System) module. Use these patterns to keep the module visually consistent and maintainable.

---

## 1. Page wrapper

- **Class:** `lms-page`
- **Usage:** Wrap the main content of every LMS page (inside MainLayout) with a container that has `lms-page`.
- **Behavior:** Applies typography (font family, size, line-height), table rules, and form/button styling. Use with responsive padding (e.g. `p-4 sm:p-6 md:p-8`).

```tsx
<div className="lms-page p-4 sm:p-6 max-w-7xl mx-auto">
  {/* page content */}
</div>
```

---

## 2. Spacing scale

Use a consistent scale for margins and padding:

- **4** = 16px (tight)
- **6** = 24px (default section)
- **8** = 32px (loose)
- **12** = 48px (empty/loading states)
- **16** = 64px (between major sections)

Responsive padding: `p-4 sm:p-6 md:p-8` for page containers.

---

## 3. Cards

- **Class:** `lms-card`
- **CSS variables:** `--radius` (border radius), `--border`, `--card` (background).
- **Spec:** Border radius `var(--radius)` (0.75rem), light shadow, 1px border, hover shadow increase. Body padding 24px (16px on mobile).

Use for all content cards (KPI, filters, content blocks). Prefer the shared component:

```tsx
import { LmsCard, LmsStatisticCard } from '@/components/lms/SharedComponents';

<LmsCard>...</LmsCard>
<LmsStatisticCard title="Total Courses" value={42} icon={<BookOutlined />} color="#2563eb" />
```

---

## 4. Tables

All LMS tables share the same header and cell styling.

- **Header:** Font size `0.75rem`, font-weight `600`, `text-transform: uppercase`, `letter-spacing: 0.05em`, padding `12px 16px`, min-height 48px. Background `hsl(var(--muted))`, color `hsl(var(--muted-foreground))`.
- **Alignment:** Headers and cells **center**; **first column left** (e.g. title/name).
- **Body:** Font size `0.8125rem` (13px), padding `12px 16px`, min-height 48px.

Apply by:

- Wrapping the page in `lms-page`, or
- Adding `lms-expandable-table` to the Table wrapper for expandable tables.

Scores tables use `scores-course-table` / `scores-department-table`; learner detail uses `learner-detail-table`. All inherit the same header/cell rules.

---

## 5. Buttons

- **Primary:** Class `lms-btn-primary` with `bg-primary hover:bg-primary/90`. Min-height 40px (44px on mobile), padding 8px 16px, border-radius `calc(var(--radius) - 2px)`, font-weight 500, icon + label with 8px gap.

Use the shared component when possible:

```tsx
import { LmsPrimaryButton } from '@/components/lms/SharedComponents';
<LmsPrimaryButton icon={<PlusOutlined />} onClick={...}>Create Course</LmsPrimaryButton>
```

---

## 6. Form inputs

Within `lms-page`:

- **Height:** Min-height 40px (44px at max-width 640px for touch).
- **Border radius:** `calc(var(--radius) - 2px)`.
- **Focus:** Border `hsl(var(--ring))`, box-shadow `0 0 0 2px hsl(var(--ring) / 0.2)`.

Applies to `ant-input`, `ant-input-number`, `ant-select-selector`, `ant-picker`.

---

## 7. Modals and drawers

- **Class:** `wrapClassName="lms-modal"` on every Ant Design `Modal` in the LMS module.
- **Content:** Border radius `var(--radius)`, overflow hidden.
- **Header:** Padding 20px 24px (16px on mobile), border-bottom 1px solid `hsl(var(--border))`.
- **Body:** Padding 24px (16px on mobile).
- **Footer:** Padding 16px 24px (12px 16px on mobile), flex end, gap 8px.

```tsx
<Modal wrapClassName="lms-modal" title="..." open={...} onCancel={...} footer={...}>
  ...
</Modal>
```

---

## 8. Loading, empty, and error states

- **Loading:** Wrapper class `lms-loading-state`. Flex center, min-height 200px (or `min-h-[60vh]` / `min-h-[calc(100vh-64px)]` for full page). Use `<Spin size="large" />` inside.

```tsx
<div className="lms-loading-state min-h-[60vh]">
  <Spin size="large" />
</div>
```

Optional shared component:

```tsx
import { LmsLoadingState } from '@/components/lms/SharedComponents';
<LmsLoadingState minHeight="200px" tip="Loading..." />
```

- **Empty:** Wrapper class `lms-empty-state`. Padding 48px 24px, centered text. Use `Empty.PRESENTED_IMAGE_SIMPLE` and a short description.

```tsx
import { LmsEmptyState } from '@/components/lms/SharedComponents';
<LmsEmptyState description="No courses found" primary="No courses" secondary="Try changing filters." />
```

- **Error:** Class `lms-error-state`. Padding 24px, border and background using `--destructive` at low opacity.

---

## 9. Status badges (tags)

- **Ant Design Tag:** Within `lms-page`, tags use font-size `0.75rem`, font-weight 500, padding 2px 8px, line-height 1.4, border-radius 4px.
- **Status → color:** Use the mapping in `src/utils/lmsDesignConstants.ts` (`LMS_STATUS_TAG_COLORS`) or the assessment workflow (`STATUS_TAG_COLOR` in `assessmentWorkflow.ts`) so all statuses (Requested, Scheduled, Live, Completed, etc.) use the same palette.

---

## 10. Date and time formats

Use a single set of formats (see `src/utils/lmsDesignConstants.ts`):

- **Date only:** `MMM D, YYYY` (e.g. Jan 15, 2025)
- **Date and time:** `MMM D, YYYY h:mm A` (e.g. Jan 15, 2025 2:30 PM)
- **Time only:** `h:mm A` (e.g. 2:30 PM)

Use with dayjs:

```ts
import dayjs from 'dayjs';
import { LMS_DATE_FORMAT, LMS_DATETIME_FORMAT } from '@/utils/lmsDesignConstants';
dayjs(date).format(LMS_DATE_FORMAT);
dayjs(date).format(LMS_DATETIME_FORMAT);
```

---

## 11. Progress bars

- Use Ant Design `Progress` with `size="small"` in tables/cards.
- Success: green (e.g. `#52c41a` or `hsl(var(--success))`). In progress/active: blue. Exception: red for failed/low.

---

## 12. Responsive breakpoints

Align with Tailwind defaults (see `src/utils/lmsDesignConstants.ts` – `LMS_BREAKPOINTS`):

- **sm:** 640px  
- **md:** 768px  
- **lg:** 1024px  
- **xl:** 1280px  
- **2xl:** 1536px  

Use these for layout (e.g. stack on small, grid on large) and for touch targets (min 44px height/width below 640px).

---

## 13. Session cards (Live Sessions / Assessment)

- **Wrapper:** `session-cards-wrapper`, list `session-cards-list`, card `session-card`.
- **Column header bar:** `session-cards-column-header session-card-header-grid` – same font as table headers (uppercase, 0.75rem, 600).
- **Card:** Border radius `var(--radius)`, hover shadow and ring border. Body padding 8px 16px; expanded body padding 8px 20px 12px.
- **Responsive:** At max-width 1024px column header is hidden and cards use a stacked layout with `data-label` for cell labels.

---

## 14. Chart colors

Use the shared palette for consistency (e.g. LMS Dashboard, Scores & Analytics):

```ts
import { LMS_CHART_COLORS } from '@/utils/lmsDesignConstants';
// Order: primary/success, blue, warning, destructive, purple, cyan
```

---

## 15. File reference

| Item | Location |
|------|----------|
| Design constants (status colors, date formats, breakpoints, chart colors) | `src/utils/lmsDesignConstants.ts` |
| Global LMS CSS (tables, cards, modals, forms, buttons, tags) | `src/index.css` (LMS Design System sections) |
| Shared components (LmsCard, LmsStatisticCard, LmsPrimaryButton, LmsEmptyState, LmsLoadingState, LmsCourseCard, LmsPageLayout) | `src/components/lms/SharedComponents.tsx` |
| Session card list (Live Sessions / Assessment) | `src/components/lms/SessionCardList.tsx` |
| Assessment status and actions | `src/pages/lms/admin/assessmentWorkflow.ts` |

---

## 16. Checklist for new LMS UI

- [ ] Page wrapper has `lms-page` and responsive padding.
- [ ] Cards use `lms-card` or `LmsCard` / `LmsStatisticCard`.
- [ ] Tables are inside `lms-page` or use the appropriate table class so headers match the standard.
- [ ] Primary actions use `LmsPrimaryButton` or `lms-btn-primary`.
- [ ] Modals use `wrapClassName="lms-modal"`.
- [ ] Loading: `lms-loading-state` + Spin; Empty: `lms-empty-state` or `LmsEmptyState`.
- [ ] Status tags use the shared status → color mapping.
- [ ] Dates/times use `LMS_DATE_FORMAT` / `LMS_DATETIME_FORMAT`.
- [ ] Layout and touch targets respect breakpoints (e.g. 44px below 640px).
