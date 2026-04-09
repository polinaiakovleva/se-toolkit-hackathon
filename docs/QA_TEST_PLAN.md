# ContextTask AI - QA Test Plan

## Overview
This document outlines the comprehensive testing strategy for verifying the ContextTask AI web application. It covers all user workflows, edge cases, error scenarios, and system behaviors.

---

## 1. Environment Setup

### 1.1 Prerequisites
- [ ] Backend server running on port 8000
- [ ] Frontend dev server running on port 5173
- [ ] PostgreSQL database connected
- [ ] Ollama LLM service running with configured model
- [ ] Test user account (if auth is implemented)

### 1.2 Browser Coverage
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Chrome (Android)
- [ ] Mobile Safari (iOS)

---

## 2. Task Creation Workflow

### 2.1 Natural Language Input (Happy Path)
| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.1.1 | Enter simple task: "Submit C++ lab by Friday 5pm" | Modal opens with parsed task, correct title, Friday deadline |
| 2.1.2 | Enter multiple tasks: "Tomorrow submit report, Wednesday meeting at 10am" | Modal shows 2 tasks with correct deadlines |
| 2.1.3 | Enter task with priority: "Critical bug fix ASAP" | Task priority set to high/critical |
| 2.1.4 | Enter task with tags: "Math homework due Monday #university #homework" | Tags extracted and displayed |
| 2.1.5 | Enter Russian text: "Завтра в 16:00 сдать лабу" | Russian date parsed, task created with correct deadline |

### 2.2 Idea Mode
| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.2.1 | Toggle "Add as Idea" before input | Button shows yellow "Idea Mode (no deadline)" |
| 2.2.2 | Create task in idea mode | Task created without deadline, appears in Ideas section |
| 2.2.3 | Toggle idea mode OFF after preview | Original deadline restored from LLM response |
| 2.2.4 | Toggle idea mode ON after setting deadline | Deadline cleared in preview |

### 2.3 Preview Modal Editing
| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.3.1 | Edit task title in preview modal | Title updated, task still valid |
| 2.3.2 | Edit description | Description saved correctly |
| 2.3.3 | Change priority dropdown | Priority badge updates visually |
| 2.3.4 | Change deadline date/time | New deadline saved |
| 2.3.5 | Toggle "All day" checkbox | Input changes to date-only, time set to end of day |
| 2.3.6 | Add tag via Enter key | Tag appears with color badge |
| 2.3.7 | Remove tag via X button | Tag removed from list |
| 2.3.8 | Delete task via X button in modal | Task removed from preview list |
| 2.3.9 | Click "Cancel" button | Modal closes, no tasks created |
| 2.3.10 | Click "Create" button | Tasks created, modal closes, list refreshes |

### 2.4 Input Validation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 2.4.1 | Submit empty input | Error message: "Please enter a task description" |
| 2.4.2 | Submit whitespace-only input | Error message shown, no API call |
| 2.4.3 | Submit while loading | Button disabled, cannot submit again |

---

## 3. Task Management Workflow

### 3.1 Task List Display
| Step | Action | Expected Result |
|------|--------|-----------------|
| 3.1.1 | View task list on load | Tasks with deadlines shown, sorted by priority then deadline |
| 3.1.2 | Check overdue task | Red text styling for overdue deadline |
| 3.1.3 | View all-day task | Shows date + "All day" badge, no time displayed |
| 3.1.4 | Task with description | Description text visible below title |
| 3.1.5 | Task with multiple tags | All tags displayed with colors |

### 3.2 Status Management
| Step | Action | Expected Result |
|------|--------|-----------------|
| 3.2.1 | Change status to "In Progress" | Status badge updates, task remains in list |
| 3.2.2 | Change status to "Completed" | Status badge updates |
| 3.2.3 | Use swipe gesture (mobile) | Status change buttons revealed |
| 3.2.4 | Swipe left to right | Status changes to "In Progress" |
| 3.2.5 | Swipe right to left | Status changes to "Completed" |

### 3.3 Task Editing
| Step | Action | Expected Result |
|------|--------|-----------------|
| 3.3.1 | Click edit button (hover/focus) | Edit modal opens |
| 3.3.2 | Clear title and save | Error: "Title is required" |
| 3.3.3 | Edit all fields and save | Changes persisted, list updates |
| 3.3.4 | Press Escape key | Modal closes without saving |
| 3.3.5 | Click outside modal | Modal closes without saving |
| 3.3.6 | Tab through modal fields | Focus trapped within modal |
| 3.3.7 | Delete task from modal | Confirmation not shown, task deleted immediately |

### 3.4 Filtering and Search
| Step | Action | Expected Result |
|------|--------|-----------------|
| 3.4.1 | Search by task title | List filters to matching tasks |
| 3.4.2 | Search by description | Tasks with matching description shown |
| 3.4.3 | Filter by status | Only tasks with selected status shown |
| 3.4.4 | Filter by priority | Only tasks with selected priority shown |
| 3.4.5 | Filter by tag | Only tasks with selected tag shown |
| 3.4.6 | Combine filters | Intersection of all filters shown |
| 3.4.7 | Clear search query | All tasks shown again |
| 3.4.8 | Click refresh button | Task list reloads, loading spinner shown |

---

## 4. Ideas Workflow

### 4.1 Ideas List
| Step | Action | Expected Result |
|------|--------|-----------------|
| 4.1.1 | View ideas section | Only tasks WITHOUT deadlines shown |
| 4.1.2 | Click on idea | Edit modal opens |
| 4.1.3 | Add deadline to idea | Task moves from Ideas to Tasks list |
| 4.1.4 | Create new idea via SmartInput | Idea appears in Ideas section |

### 4.2 Idea to Task Conversion
| Step | Action | Expected Result |
|------|--------|-----------------|
| 4.2.1 | Edit idea, add deadline | Task now has deadline |
| 4.2.2 | Save changes | Task moves to Tasks list, removed from Ideas |
| 4.2.3 | Refresh page | Task remains in Tasks list |

---

## 5. Calendar Workflow

### 5.1 Calendar Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 5.1.1 | View current month | Current month displayed with today highlighted |
| 5.1.2 | Click previous month | Calendar shows previous month |
| 5.1.3 | Click next month | Calendar shows next month |
| 5.1.4 | View dates with tasks | Colored dots indicate task priority |

### 5.2 Date Selection
| Step | Action | Expected Result |
|------|--------|-----------------|
| 5.2.1 | Click on date with tasks | Modal opens showing tasks for that date |
| 5.2.2 | Click on date without tasks | Modal opens with empty message |
| 5.2.3 | Close modal via X button | Modal closes |
| 5.2.4 | Click date, then edit task | Edit modal opens for that task |

---

## 6. Date Parsing (Critical)

### 6.1 English Relative Dates
| Input | Expected Behavior |
|-------|-------------------|
| "today" | Today's date, time 00:00 |
| "tomorrow" | Tomorrow's date, time 00:00 |
| "tomorrow at 5pm" | Tomorrow's date, time 17:00 |
| "day after tomorrow" | Date +2 days |
| "next week" | Monday of next week |
| "this Friday" | This week's Friday (or next if already past) |
| "next Friday" | Next week's Friday |
| "in 3 days" | Date +3 days |
| "in 2 weeks" | Date +14 days |
| "at 10am" | Today at 10:00 (or tomorrow if already past) |

### 6.2 Russian Relative Dates
| Input | Expected Behavior |
|-------|-------------------|
| "сегодня" | Today's date |
| "завтра" | Tomorrow's date |
| "послезавтра" | Date +2 days |
| "в субботу" | This week's Saturday |
| "в следующую субботу" | NEXT week's Saturday |
| "в 16:00" | Today at 16:00 |
| "завтра в 10 утра" | Tomorrow at 10:00 |
| "через 3 дня" | Date +3 days |

### 6.3 Edge Cases - Date Parsing
| Step | Action | Expected Result |
|------|--------|-----------------|
| 6.3.1 | Submit "Saturday" when today is Saturday | Next Saturday (not today) |
| 6.3.2 | Submit "next Saturday" when today is Saturday | Saturday in 7 days |
| 6.3.3 | Submit task late at night near midnight | Correct date transition |
| 6.3.4 | Submit "February 30" | LLM should interpret reasonably |
| 6.3.5 | Submit with timezone boundary | Time parsed correctly in local timezone |

---

## 7. Notification System

### 7.1 Permission Request
| Step | Action | Expected Result |
|------|--------|-----------------|
| 7.1.1 | First-time enable notifications | Browser permission prompt shown |
| 7.1.2 | Grant permission | Notifications enabled, settings saved |
| 7.1.3 | Deny permission | Warning shown: "Notifications blocked" |
| 7.1.4 | Permission previously denied | Settings shows denied state, cannot enable |

### 7.2 Notification Scheduling
| Step | Action | Expected Result |
|------|--------|-----------------|
| 7.2.1 | Create task due in 30min (15min reminder) | Notification scheduled for 15min before |
| 7.2.2 | Create task due in 5min (15min reminder) | No notification (time already passed) |
| 7.2.3 | Create past-due task | No notification scheduled |
| 7.2.4 | Delete task | Scheduled notification cancelled |
| 7.2.5 | Edit task deadline | Old notification cancelled, new one scheduled |
| 7.2.6 | Close browser tab | Notification may be delayed (setTimeout throttled) |

### 7.3 Notification Content
| Step | Action | Expected Result |
|------|--------|-----------------|
| 7.3.1 | Receive notification | Title: "📋 Task Reminder" |
| 7.3.2 | Check body text | Shows task title and deadline time |
| 7.3.3 | Click notification | Opens/focuses browser tab |

---

## 8. Error Handling

### 8.1 Network Errors
| Step | Action | Expected Result |
|------|--------|-----------------|
| 8.1.1 | Disconnect network, create task | Error: "Network error. Please check your connection." |
| 8.1.2 | Backend server down | Error: "Server error. Please try again later." |
| 8.1.3 | Request timeout (30s) | Error: "Request timed out. Please try again." |
| 8.1.4 | Click "Retry" on error | Re-fetches tasks, clears error |
| 8.1.5 | Failed task fetch | Error banner shown with retry button |

### 8.2 LLM Errors
| Step | Action | Expected Result |
|------|--------|-----------------|
| 8.2.1 | Ollama service down | Task still created with fallback title |
| 8.2.2 | Invalid LLM response | JSON parse fallback, task created |
| 8.2.3 | Very long input text | Task title truncated to 100 chars |

### 8.3 Data Validation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 8.3.1 | Empty title in edit modal | Error: "Title is required" |
| 8.3.2 | Invalid date format from LLM | Warning logged, task created without deadline |
| 8.3.3 | Empty tag submission | No tag added |
| 8.3.4 | Duplicate tag submission | Tag not duplicated |

---

## 9. Accessibility Testing

### 9.1 Keyboard Navigation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 9.1.1 | Tab through app | Logical focus order |
| 9.1.2 | Press Enter on SmartInput textarea | Form submitted |
| 9.1.3 | Press Escape in modal | Modal closes |
| 9.1.4 | Tab in modal | Focus trapped within modal |
| 9.1.5 | Tab to calendar date | Date button focused |
| 9.1.6 | Press Enter on calendar date | Date modal opens |

### 9.2 Screen Reader
| Step | Action | Expected Result |
|------|--------|-----------------|
| 9.2.1 | Navigate with NVDA/JAWS | All elements have proper labels |
| 9.2.2 | Calendar date buttons | Announces date and task count |
| 9.2.3 | Status dropdown | Announces current status |
| 9.2.4 | Priority badges | Announces priority level |
| 9.2.5 | Edit modal | Role="dialog" with proper labeling |

### 9.3 Visual Accessibility
| Step | Action | Expected Result |
|------|--------|-----------------|
| 9.3.1 | Toggle dark mode | All text readable, contrast sufficient |
| 9.3.2 | Zoom to 200% | No layout breaks, content readable |
| 9.3.3 | Focus indicators | Visible focus ring on all interactive elements |

---

## 10. Cross-Browser / Cross-Device

### 10.1 Desktop Browsers
| Browser | Test Cases | Status |
|---------|-----------|--------|
| Chrome | All workflows | [ ] |
| Firefox | All workflows | [ ] |
| Safari | All workflows | [ ] |
| Edge | All workflows | [ ] |

### 10.2 Mobile Browsers
| Browser | Test Cases | Status |
|---------|-----------|--------|
| Chrome (Android) | Swipe actions, touch UI | [ ] |
| Safari (iOS) | Swipe actions, touch UI | [ ] |

### 10.3 Known Browser Issues
- **Safari**: Web Speech API may not be supported
- **Mobile**: Hover states show as tap states
- **Firefox**: Notification permission handling differs

---

## 11. Performance Testing

### 11.1 Load Times
| Metric | Target | Status |
|--------|--------|--------|
| Initial page load | < 3s | [ ] |
| Task list render | < 500ms | [ ] |
| LLM parse response | < 30s | [ ] |
| Calendar month change | < 100ms | [ ] |

### 11.2 Large Data Sets
| Step | Action | Expected Result |
|------|--------|-----------------|
| 11.2.1 | 100+ tasks in list | Smooth scrolling, no lag |
| 11.2.2 | Many tasks on same date | Calendar dots overlap gracefully |
| 11.2.3 | Long task title | Title truncated with ellipsis |

---

## 12. Voice Input Testing

### 12.1 Speech Recognition
| Step | Action | Expected Result |
|------|--------|-----------------|
| 12.1.1 | Click microphone button | Recording starts, button shows recording state |
| 12.1.2 | Speak clearly in English | Text appears in textarea |
| 12.1.3 | Speak clearly in Russian | Text appears in textarea |
| 12.1.4 | Click button again | Recording stops |
| 12.1.5 | Browser doesn't support | Error: "Voice input is not supported" |
| 12.1.6 | Deny microphone permission | Error message shown |

---

## 13. Daily Briefing Testing

### 13.1 Briefing Generation
| Step | Action | Expected Result |
|------|--------|-----------------|
| 13.1.1 | Click "Generate Briefing" | Loading state shown |
| 13.1.2 | Briefing content | Shows urgent tasks, statistics, recommendations |
| 13.1.3 | No tasks | Shows appropriate message |
| 13.1.4 | LLM timeout | Error message shown |

---

## 14. Regression Test Checklist

### Critical Paths (Must Pass)
- [ ] Create task with natural language
- [ ] Edit existing task
- [ ] Delete task
- [ ] Filter by status/priority/tag
- [ ] Search tasks
- [ ] Create idea (no deadline)
- [ ] Convert idea to task (add deadline)
- [ ] View calendar and date tasks
- [ ] Dark mode toggle
- [ ] Notification permission request

### Known Fixed Issues (Verify Closed)
- [ ] Ideas appearing in task list (was: filter not working)
- [ ] "Next Saturday" parsing wrong date
- [ ] All-day task not saving correctly
- [ ] Empty title allowing save
- [ ] Double render on task creation
- [ ] Deadline lost on idea mode toggle

---

## 15. Test Execution Log

### Pre-Test Checklist
- [ ] Database migrations run
- [ ] Backend server healthy
- [ ] Ollama model loaded
- [ ] Environment variables set

### Test Run Template

| Date | Tester | Environment | Result | Notes |
|------|--------|-------------|--------|-------|
| YYYY-MM-DD | Name | Dev/Staging | Pass/Fail | Details |

### Bug Report Template

```
**Title:** [Bug title]
**Severity:** Critical / High / Medium / Low
**Steps to Reproduce:**
1. 
2. 
3. 
**Expected Result:** 
**Actual Result:** 
**Environment:** Browser, OS, Device
**Screenshots:** [If applicable]
```

---

## 16. Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| QA Engineer | | | |
| Developer | | | |
| Product Owner | | | |

---

*Document Version: 1.0*
*Last Updated: April 2026*