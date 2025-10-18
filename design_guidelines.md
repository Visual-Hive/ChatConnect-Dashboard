# Design Guidelines: Conference Chat Widget Configuration Platform

## Design Approach

**Selected Approach:** Design System Approach with references to Stripe, Vercel, and Notion dashboards

**Justification:** This is a utility-focused SaaS dashboard requiring efficiency, clarity, and professional polish. Users need to quickly configure widgets, analyze data, and manage knowledge bases without visual distraction.

**Key Design Principles:**
- Clarity over decoration: Every element serves a functional purpose
- Progressive disclosure: Complex features revealed through logical information hierarchy
- Confident simplicity: Clean layouts that make technical tasks feel approachable
- Data transparency: Analytics and metrics presented with visual clarity

---

## Color Palette

### Light Mode (Primary)
- **Background Base:** 0 0% 100% (pure white)
- **Background Secondary:** 240 5% 96% (subtle gray for cards/panels)
- **Background Tertiary:** 240 5% 98% (hover states, sidebar background)
- **Primary Brand:** 217 91% 60% (modern blue - primary actions, links, active states)
- **Primary Hover:** 217 91% 55% (darker blue for interactions)
- **Text Primary:** 222 47% 11% (near-black for headings)
- **Text Secondary:** 215 16% 47% (muted for descriptions, labels)
- **Text Tertiary:** 215 14% 61% (subtle for metadata)
- **Border Default:** 214 32% 91% (light borders, dividers)
- **Border Focus:** 217 91% 60% (input focus states)
- **Success:** 142 71% 45% (status indicators, positive metrics)
- **Warning:** 38 92% 50% (alerts, cost warnings)
- **Error:** 0 84% 60% (errors, failed uploads)

### Dark Mode
- **Background Base:** 222 47% 11%
- **Background Secondary:** 217 33% 17%
- **Background Tertiary:** 217 19% 21%
- **Primary Brand:** 217 91% 65%
- **Text Primary:** 210 40% 98%
- **Text Secondary:** 215 20% 65%
- **Border Default:** 217 19% 27%

---

## Typography

**Font Families:**
- **Primary (UI/Body):** 'Inter', system-ui, -apple-system, sans-serif
- **Monospace (Code/API Keys):** 'JetBrains Mono', 'Fira Code', monospace

**Type Scale:**
- **Display (Hero/Empty States):** text-4xl (36px), font-semibold, tracking-tight
- **Heading 1 (Page Titles):** text-3xl (30px), font-semibold, tracking-tight
- **Heading 2 (Section Headers):** text-2xl (24px), font-semibold
- **Heading 3 (Card Titles):** text-lg (18px), font-semibold
- **Body Large:** text-base (16px), font-normal
- **Body Default:** text-sm (14px), font-normal
- **Body Small (Metadata):** text-xs (12px), font-normal
- **Labels:** text-sm (14px), font-medium, uppercase tracking-wide for form labels
- **Code/Monospace:** text-sm (14px), font-mono

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 1, 2, 3, 4, 6, 8, 12, 16, 20, 24

**Standard Patterns:**
- **Sidebar Width:** w-64 (256px) fixed
- **Main Content Padding:** p-6 to p-8 (24-32px)
- **Card Padding:** p-6 (24px)
- **Section Spacing:** mb-8 or space-y-8 between major sections
- **Input/Button Heights:** h-10 (40px) for standard controls
- **Card Gaps:** gap-6 in grid layouts
- **Border Radius:** rounded-lg (8px) for cards, rounded-md (6px) for inputs

**Grid Patterns:**
- **Stats Cards:** grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6
- **Dashboard Cards:** grid-cols-1 lg:grid-cols-2 gap-6
- **Settings Forms:** Single column max-w-2xl

---

## Component Library

### Navigation & Layout
- **Sidebar:** Fixed left navigation, dark background (secondary), white icons/text with hover states, active state with primary color left border (border-l-4)
- **Breadcrumbs:** Text-sm with chevron separators, muted text for non-current items
- **Page Header:** Flex justify-between with title left, actions right, pb-6 border-b

### Data Display
- **Stats Cards:** White background, rounded-lg, p-6, shadow-sm, includes icon (top-left), value (large semibold), label (small muted), change indicator (+/- percentage in success/error color)
- **Table:** Striped rows (alternate bg-secondary), hover state on rows, sticky header, text-sm throughout
- **Charts:** Use Chart.js with primary brand color, muted gridlines, clear axis labels, tooltips on hover
- **Activity Feed:** Timeline with avatar/icon left, content right, timestamp muted, dividers between items
- **Empty States:** Centered layout with illustrative icon, heading, description, primary action button

### Forms & Inputs
- **Text Inputs:** h-10, px-3, border rounded-md, focus ring-2 ring-primary, placeholder text-tertiary
- **Textareas:** min-h-32, same styling as text inputs
- **Toggle Switches:** Modern switches with primary color when active, gray when inactive
- **File Upload:** Dashed border dropzone, hover state (border-primary), drag-over state (bg-primary/5)
- **Color Picker:** Custom input with color preview swatch, HEX input field
- **Select Dropdowns:** Native styled or custom with chevron icon

### Buttons & Actions
- **Primary Button:** bg-primary text-white, hover darker, px-4 h-10, rounded-md, font-medium
- **Secondary Button:** border border-default bg-white text-primary, hover bg-secondary
- **Ghost Button:** No background, text-primary, hover bg-secondary/50
- **Icon Button:** p-2, rounded-md, hover bg-secondary
- **Copy Button:** Icon with tooltip, success state feedback ("Copied!")

### Feedback & Overlays
- **Toast Notifications:** Fixed bottom-right, slide-in animation, auto-dismiss, icon + message + close button
- **Loading States:** Skeleton screens for cards, spinner for buttons, shimmer effect on content loads
- **Modals:** Centered overlay with backdrop blur, max-w-2xl, rounded-lg shadow-2xl
- **Tooltips:** Small rounded-md, dark background, white text, arrow pointer, appear on hover after 300ms delay

### Widget-Specific Components
- **Live Preview Window:** Card with phone/desktop frame mockup showing widget positioning, styles update in real-time
- **Code Block:** Monospace font, dark background, syntax highlighting (optional), copy button top-right
- **Document List Item:** Flex layout with file icon, name, size, status badge, actions menu (3-dot)
- **Progress Tracker:** Horizontal steps with checkmarks for completed, numbered circles for upcoming, connecting lines

---

## Animations

**Minimal, purposeful motion:**
- **Hover States:** transition-colors duration-150
- **Modal/Toast Entry:** transition-transform duration-200
- **Tab Switches:** fade transition duration-150
- **Loading Spinners:** Simple rotation animation
- **No decorative animations** - focus on functional feedback

---

## Images

**Hero/Marketing Imagery:** NOT applicable - this is a dashboard application without hero sections

**Functional Images:**
- **Logo Upload Preview:** 80x80px rounded square in brand settings
- **Avatar Placeholders:** Circular 40x40px for team members, generated from initials
- **Empty State Illustrations:** Simple line-art style icons (upload cloud, analytics chart, settings gear) - use Heroicons or similar, scaled to 64x64px
- **Widget Preview:** Screenshot/mockup of chat widget in bottom-right of browser window mockup

---

## Page-Specific Layouts

**Overview Dashboard:** 2-column layout - left (2/3 width) shows setup progress card + stats grid (4 columns) + activity feed, right (1/3 width) shows quick actions card + recent metrics

**Widget Configuration:** Split view - left form sections (60%), right live preview panel (40% sticky)

**Knowledge Base:** Table layout with upload dropzone at top, filterable document list below, system prompt editor in expandable section

**Analytics:** Full-width time selector at top, 2-column chart grid, followed by tabular data sections

**Settings:** Vertical tab navigation left (200px), form content right (max-w-2xl centered)