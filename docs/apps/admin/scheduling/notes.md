# Product Notes — Tender Progress & Checklists (Phase B)

These notes outline the requirements for adding granular progress tracking and checklists to individual tenders. This will allow teams to track the specific returnables and milestones for each tender independently.

---

## 1. Tender Progress Tracking

Each tender has unique requirements. Rather than using a rigid, one-size-fits-all checklist, the system must allow users to build a custom structure of **Sections** and **Checklist Items** per tender.

### Custom Sections & Categories
Users can group related checklist items into custom sections. Examples of sections include:

#### 📋 Document Progress
- [ ] Document created
- [ ] Document initialised
- [ ] Document inked

#### 📁 Returnable List Progress
- [ ] Key personnel CV completed
- [ ] Company experience completed
- [ ] Method statement completed
- [ ] Pricing schedule completed

### Functional Requirements
- **Create**: Add custom sections and add checklist items under them.
- **Edit**: Rename sections or edit the text of checklist items.
- **Delete**: Remove checklist items or entire sections.
- **Reorder**: Drag-and-drop to reorder sections and checklist items (future enhancement).

---

## 2. Dynamic Progress Calculation

Each tender will feature a visual **Progress Bar** that automatically updates in real-time as checklist items are completed.

### Calculation Logic
The progress percentage is calculated dynamically using the following formula:

\[\text{Progress \%} = \left( \frac{\text{Completed Checklist Items}}{\text{Total Checklist Items}} \right) \times 100\]

> [!NOTE]
> If a tender has `0` checklist items, its progress defaults to `0%` (or is hidden) to avoid division-by-zero errors.

### Example Case
*   **Total Checklist Items:** 20
*   **Completed Items:** 15
*   **Calculation:** \(\frac{15}{20} \times 100 = 75\%\)
*   **UI Representation:** A progress bar filled to 75% with a text indicator (`15 / 20 items completed`).

---

## 3. Overall Tender Status

Tenders have an overall **Status** that is independent of the checklist progress bar. This represents the high-level operational state of the tender.

| Status | Description |
| :--- | :--- |
| **Not Started** | Preparation has not yet begun. No work has started. |
| **In Progress** | The team is actively working on returnables and drafting the document. |
| **Completed** | All checklist items are finished and the document is ready for submission. |

> [!IMPORTANT]
> The progress bar and the overall status are decoupled. For example, a tender can have a status of `In Progress` while its progress bar is at `90%`. Once it hits `100%`, the system can prompt the user to transition the status to `Completed`.
