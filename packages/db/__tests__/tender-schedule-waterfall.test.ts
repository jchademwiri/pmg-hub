import { describe, expect, it } from "vitest";
import type { TenderScheduleEntry } from "../src/schema/tender-schedule";
import { calculateTenderWaterfallUpdates } from "../src/queries/tender-schedule";

function makeTender(
  overrides: Partial<TenderScheduleEntry> & { id: string },
): TenderScheduleEntry {
  return {
    id: overrides.id,
    clientId: "client-1",
    divisionId: null,
    tenderReference: overrides.tenderReference ?? overrides.id,
    closingDate: overrides.closingDate ?? "2026-07-20",
    effortDays: overrides.effortDays ?? 2,
    actualEffortDays: null,
    bufferDays: overrides.bufferDays ?? 5,
    startDate: overrides.startDate ?? "2026-07-01",
    targetCompletionDate: overrides.targetCompletionDate ?? "2026-07-03",
    actualCompletionDate: null,
    submissionDate: null,
    status: overrides.status ?? "planned",
    priority: overrides.priority ?? "normal",
    notes: null,
    sortOrder: null,
    blockers: null,
    outcome: null,
    createdBy: "user-1",
    createdAt: overrides.createdAt ?? new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: null,
  };
}

describe("calculateTenderWaterfallUpdates", () => {
  it("orders urgent tenders before non-urgent tenders, then by closing date", () => {
    const updates = calculateTenderWaterfallUpdates([
      makeTender({ id: "normal-early", closingDate: "2026-07-01", priority: "normal" }),
      makeTender({ id: "urgent-late", closingDate: "2026-07-10", priority: "urgent" }),
      makeTender({ id: "urgent-early", closingDate: "2026-07-05", priority: "urgent" }),
      makeTender({ id: "normal-late", closingDate: "2026-07-20", priority: "high" }),
    ]);

    expect(updates.map((update) => update.id)).toEqual([
      "urgent-early",
      "urgent-late",
      "normal-early",
      "normal-late",
    ]);
  });

  it("uses creation date as the stable tiebreaker for equal closing dates", () => {
    const updates = calculateTenderWaterfallUpdates([
      makeTender({
        id: "created-second",
        closingDate: "2026-07-10",
        createdAt: new Date("2026-06-02T00:00:00.000Z"),
      }),
      makeTender({
        id: "created-first",
        closingDate: "2026-07-10",
        createdAt: new Date("2026-06-01T00:00:00.000Z"),
      }),
    ]);

    expect(updates.map((update) => update.id)).toEqual([
      "created-first",
      "created-second",
    ]);
  });

  it("cascades planned tenders so each starts when the previous target ends", () => {
    const updates = calculateTenderWaterfallUpdates([
      makeTender({
        id: "first",
        closingDate: "2026-07-20",
        effortDays: 3,
        bufferDays: 5,
      }),
      makeTender({
        id: "second",
        closingDate: "2026-07-21",
        effortDays: 4,
        bufferDays: 5,
      }),
    ]);

    expect(updates).toEqual([
      {
        id: "first",
        sortOrder: 1,
        startDate: "2026-07-12",
        targetCompletionDate: "2026-07-15",
      },
      {
        id: "second",
        sortOrder: 2,
        startDate: "2026-07-15",
        targetCompletionDate: "2026-07-19",
      },
    ]);
  });

  it("keeps an in-progress tender as the current schedule anchor", () => {
    const updates = calculateTenderWaterfallUpdates([
      makeTender({
        id: "urgent-planned",
        closingDate: "2026-07-05",
        priority: "urgent",
        effortDays: 2,
      }),
      makeTender({
        id: "current",
        status: "in_progress",
        priority: "normal",
        startDate: "2026-07-01",
        effortDays: 3,
      }),
    ]);

    expect(updates).toEqual([
      {
        id: "current",
        sortOrder: 1,
        startDate: "2026-07-01",
        targetCompletionDate: "2026-07-04",
      },
      {
        id: "urgent-planned",
        sortOrder: 2,
        startDate: "2026-07-04",
        targetCompletionDate: "2026-07-06",
      },
    ]);
  });
});
