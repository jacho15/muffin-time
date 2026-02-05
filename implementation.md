# implementation.md - Muffin Time

## Goal Description
Create a comprehensive productivity application that merges the best features of Google Calendar, Notion, and Timy Lab while addressing specific user-identified usability issues. The app will feature a unified sidebar navigation controlling different views (Events, Focus, Stats, To-Do, Assignments).

## User Review Required
> [!IMPORTANT]
> - **Tech Stack**: Access to `npx` and a modern Node.js environment is assumed. I will use **React.js (Vite)** for the frontend as requested. For the backend, **Node.js (Express)** can serve as a lightweight API layer if needed, but we will primarily use **Supabase** for the database and authentication.
> - **Data Persistence**: **Supabase** (PostgreSQL) will store calendar events, study stats, and session logs.
> - **Design**: The UI will follow a **"Starry Night"** aesthetic (Deep blues, gold accents, dark mode) and support the specific "funky" interaction fixes.

## Proposed Features & Changes

### 1. Core Layout & Design
- **Theme**: "Starry Night" Aesthetic.
    - **Palette**: Deep midnight blues (`#0B1026`), nebulous purples (`#2B1B48`), and starlight golds (`#F5E050`).
    - **Visuals**: Glassmorphism for panels, subtle high-contrast borders, maybe usage of particles/stars for background elements.
- **Sidebar**: A persistent left-hand sidebar to toggle between views.
    - [ ] **Events**: Weekly Google Calendar style.
    - [ ] **Focus**: Timy Lab style focus timer.
    - [ ] **Study Session Log**: Stats view.
    - [ ] **To-Do Calendar**: Notion monthly style.
    - [ ] **Assignment Calendar**: Notion monthly style.

### 2. Events (Google Calendar Improvement)
- **Problem**: Google Calendar's "Time Insights" are limited to the primary calendar. It fails to dynamically update stats when specific sub-calendars (e.g., "Work") are toggled on or off, making it impossible to see isolated stats for secondary categories.
- **Solution**:
    - **Dynamic Insight Aggregation**: The "Time Insights" panel will purely reflect the *currently visible* calendars.
        - *Scenario*: If only "Work" is toggled on, the stats will show 100% "Work" hours.
        - *Scenario*: If "Work" and "Study" are toggled on, the stats will aggregate and compare both.
    - **Weekly View**: A standard weekly calendar view that serves as the source of truth for these insights.

### 3. To-Do & Assignments (Notion Improvement)
- **Problem**: Notion UI interactions are clunky (selection vs editing) and shortcuts are non-standard.
- **Solution**:
    - **Interaction**: Single click = Select/Highlight. Double click = Edit text/Open details.
    - **Shortcuts**: Standardize `Ctrl+C` (Copy) and `Ctrl+V` (Paste) for tasks/blocks.
    - **Views**: Monthly calendar view for both To-Dos and Assignments.

### 4. Focus Mode (Timy Lab Improvement)
- **Problem**: Timy Lab is "doing too much". Needs simplification.
- **Solution**:
    - **Right Sidebar/Toggle**: Select the active "Session" (Subject, e.g., Physics 3).
    - **Taskbar Controls**:
        - Start Timer
        - Pause Timer
        - Finish Timer
        - Change Subject
    - **Logic**: Timer logs time against the selected subject.

### 5. Statistics & Logs
- **Visuals**:
    - **Activity Heatmap**: GitHub-style contribution graph for study focus.
    - **Pie Chart**: Breakdown of study time by subject.
    - **Metrics**: Display % of total time, Hours, and Minutes per subject next to the chart.
- **Logs**:
    - Detailed list of sessions filterable by subject.

## Verification Plan

### Automated Tests
- Unit tests for Timer logic (start, pause, stop, duration calculation).
- Component tests for Calendar rendering.

### Manual Verification
- **Calendar**: Verify time insights update correctly when multiple categories are used.
- **Notion-like**: Test click behaviors (1 click vs 2 clicks) and Copy/Paste shortcuts.
- **Timer**: Start a timer for "Subject A", pause, resume, finish. Check if stats update correctly.
- **Stats**: Verify the pie chart percentages sum to 100% and match the logs.
