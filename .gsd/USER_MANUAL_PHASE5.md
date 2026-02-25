# GSD User Manual - Phase 5.2 & 5.3 Features

## Dashboard Analytics | Notification System | Activity Logging

---

## 1. Dashboard

The dashboard is your home screen, showing a personalized overview of your work across all projects.

### 1.1 Stats Cards

Four summary cards at the top of the dashboard:

| Card | Description | Color |
|------|-------------|-------|
| **Active Tasks** | Total non-completed tasks assigned to you | Blue |
| **Overdue** | Tasks past their due date that are not complete | Red |
| **Completed This Week** | Tasks you finished in the last 7 days | Green |
| **Team Members** | Total unique members across your projects | Gray |

Stats refresh automatically every 60 seconds.

### 1.2 My Tasks

Shows up to 10 tasks assigned to you. Each task displays:
- Priority dot (color-coded: red=urgent, orange=high, blue=medium, gray=low)
- Task title
- Project name badge
- Current status badge
- Due date

**Overdue tasks** appear with a red due date. Completed tasks show strikethrough text.

Click any task to navigate to its project.

### 1.3 Upcoming Deadlines

Shows tasks due within the next 7 days, sorted by urgency:
- **Red** - Due today or tomorrow
- **Yellow** - Due within 2 days
- **Gray** - Due later this week

Dates display as "Today", "Tomorrow", or the weekday + date.

### 1.4 Recent Activity

A timeline of the 10 most recent actions across all your projects. Each entry shows:
- Who performed the action (avatar + name)
- What they did (verb + detail)
- Which project it happened in
- When it happened (relative time: "2m ago", "1h ago")

Click any activity entry to navigate to the related project. Refreshes every 30 seconds.

### 1.5 Projects

- **Search bar** to filter projects by name or description
- **Recent Projects** carousel (horizontal scroll) showing your 5 newest projects
- **All Projects** grid with name, description, status, and created date
- **+ New Project** button to create a project (name required, description optional)

---

## 2. Notification System

### 2.1 Notification Bell

Located in the top-right of the navigation bar (next to the theme toggle and user menu).

- **Red badge** shows unread count (displays "99+" for large numbers)
- Badge only appears when you have unread notifications
- Click the bell to open the notification dropdown

### 2.2 Notification Dropdown

A panel showing your recent notifications with:
- **Header:** "Notifications" with unread count
- **Mark all read** button (appears when you have unread items)
- **Clear all** button (appears when you have any notifications)
- **Scrollable list** of notification items
- **Footer:** Total notification count

### 2.3 Notification Types

| Type | Icon | When You Receive It |
|------|------|---------------------|
| Task Assigned | U (blue) | Someone assigns a task to you |
| Task Updated | T (orange) | A task assigned to you is modified by someone else |
| Task Commented | C (green) | Someone comments on a task you created or are assigned to |
| Project Invited | P (purple) | You are added to a project |
| Permission Changed | R (red) | Your role in a project changes |
| Mention | @ (blue) | Someone mentions you (future feature) |

### 2.4 Notification Actions

- **Click a notification** to mark it as read and navigate to the related project
- **Hover** over a notification to reveal the delete (X) button
- **Click X** to dismiss a single notification
- **Mark all read** clears the unread indicator on all notifications
- **Clear all** removes all notifications

### 2.5 Real-Time Updates

Notifications arrive instantly via WebSocket. When a new notification arrives:
- The unread badge count updates immediately
- A toast notification appears briefly with the notification title
- No page refresh needed

---

## 3. Admin Panel - Activity Logs

*Accessible to System Admin users only.*

### 3.1 Navigating to Activity Logs

1. Click **Admin** in the sidebar
2. Click the **Activity Logs** tab

### 3.2 Stats Overview

Three cards at the top show system-wide counts:
- **Total Users** | **Total Projects** | **Total Tasks**

### 3.3 Activity Logs Table

| Column | Content |
|--------|---------|
| Time | Relative timestamp ("2m ago") |
| Action | Action type (e.g., "auth.login", "task.created") |
| Actor ID | Who performed the action |
| Target | Resource affected |
| IP | IP address of the actor |
| Details | JSON metadata about the action |

### 3.4 Filtering & Pagination

- **Filter by action:** Type in the search field to filter logs (e.g., "login", "create")
- **Pagination:** 25 logs per page with Prev/Next navigation
- Total log count shown above the table

---

## 4. Activity Logging Coverage

The system tracks 21 event types across all project operations:

### Task Events
| Event | Trigger |
|-------|---------|
| task.created | New task created |
| task.updated | Task fields modified (title, priority, due date, etc.) |
| task.deleted | Task removed |
| task.status_changed | Task moved to a different status column |
| task.bulk.move | Multiple tasks moved at once |
| task.bulk.delete | Multiple tasks deleted at once |
| task.bulk.assign | Multiple tasks assigned at once |
| task.bulk.setPriority | Multiple tasks priority changed at once |

### Comment Events
| Event | Trigger |
|-------|---------|
| comment.created | Comment added to a task |

### Status Events
| Event | Trigger |
|-------|---------|
| status.created | New status column added |
| status.updated | Status properties changed |
| status.deleted | Status column removed |

### File Events
| Event | Trigger |
|-------|---------|
| file.uploaded | File attached to a task |
| file.deleted | File removed |

### Label Events
| Event | Trigger |
|-------|---------|
| label.created | New label created |
| label.deleted | Label removed |
| label.assigned | Label added to a task |
| label.unassigned | Label removed from a task |

### Member Events
| Event | Trigger |
|-------|---------|
| member.invited | Team member added to project |
| member.role_changed | Member role/permissions updated |
| member.removed | Member removed from project |

### Project Events
| Event | Trigger |
|-------|---------|
| project.created | New project created |
| project.updated | Project details modified |
| project.archived | Project archived |

---

## 5. Keyboard Accessibility

All features support keyboard navigation:
- **Tab** to move between interactive elements
- **Enter** or **Space** to activate buttons and links
- **Escape** to close dropdowns and modals

---

## 6. Data Refresh Rates

| Feature | Auto-Refresh |
|---------|-------------|
| Dashboard Stats | Every 60s |
| My Tasks | Every 30s |
| Recent Activity | Every 30s |
| Upcoming Deadlines | Every 60s |
| Notifications | Real-time via WebSocket |
| Admin Logs | Manual (navigate pages) |
