# 3. Task Board & Project Milestones

> Learn how to use interactive Kanban and list task boards, assign responsibilities, track deliverables, and manage project milestones.

---

## What Is The Task Board?

Within each project or tender in `apps/admin -> /projects/[id]`, the **Task Board** breaks down large deliverables into clear, actionable work items.

```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  BACKLOG     │  IN PROGRESS │  REVIEW      │  COMPLETED   │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ • SBD 6.1    │ • Pricing    │ • Technical  │ • CSD Report │
│   Preference │   Schedule   │   Proposal   │   Attached   │
│ • COIDA cert │ • BOQ        │   Draft      │ • Company    │
│              │   Review     │              │   Profile    │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

---

## Core Task Properties

Every task item includes:

- **Title & Description**: Clear scope of what needs to be created or reviewed.
- **Priority**: `Low`, `Medium`, `High`, or `Urgent`.
- **Status Column**: `Backlog` → `In Progress` → `Review` → `Completed`.
- **Due Date**: Exact deadline for completion.
- **Assignee**: Team member responsible for delivery.
- **Crypto-Secure UUID**: System-generated identifier ensuring immutable task tracking.

---

## Daily Task Board Routines

1. **Morning Standup**: Open the project task board in Kanban view. Move cards that team members are picking up from `Backlog` to `In Progress`.
2. **Reviewing Deliverables**: When technical documents or designs are ready for quality assurance, drag the card into `Review`.
3. **Completing Items**: Once verified and signed off, move the card to `Completed`.
4. **Client Visibility**: Tasks flagged for client review automatically reflect on the client's self-service portal timeline.
