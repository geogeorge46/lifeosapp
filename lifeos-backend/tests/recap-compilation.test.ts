import { RecapService } from "../src/modules/recap/recap.service";
import { prisma } from "../src/infrastructure/database/prisma.client";

// Mock the prisma client module to prevent actual database socket connections
jest.mock("../src/infrastructure/database/prisma.client", () => ({
  prisma: {
    taskOccurrence: { findMany: jest.fn() },
    brainDump: { findMany: jest.fn() },
    transaction: { findMany: jest.fn() },
    notificationLog: { create: jest.fn() },
    dailyRecap: { upsert: jest.fn() },
  },
}));

describe("Daily Recap Compilation Integration Test Suite", () => {
  let mockRecapRepository: any;
  let recapService: RecapService;

  beforeEach(() => {
    mockRecapRepository = {
      createRecap: jest.fn().mockImplementation((data) =>
        Promise.resolve({
          id: "recap-mock-uuid-99",
          userId: data.userId,
          summary: data.content,
          date: new Date(),
        })
      ),
      findTodayRecapByUserId: jest.fn().mockResolvedValue(null),
    };
    recapService = new RecapService(mockRecapRepository);
    jest.clearAllMocks();
  });

  test("should load database entities and compile them into formatted markdown recaps", async () => {
    // 1. Mock Today's Tasks
    (prisma.taskOccurrence.findMany as jest.Mock).mockResolvedValue([
      {
        id: "occ-1",
        taskId: "t-1",
        status: "SCHEDULED",
        scheduledDate: new Date(),
        scheduledTime: null,
        task: { id: "t-1", title: "Complete design layout" },
      },
    ]);

    // 2. Mock Unprocessed Inbox items
    (prisma.brainDump.findMany as jest.Mock).mockResolvedValue([
      { id: "i-1", content: "Check client guidelines", contentType: "TEXT", status: "INBOX" },
    ]);

    // 3. Mock Ledger debt listings
    (prisma.transaction.findMany as jest.Mock).mockResolvedValue([
      {
        id: "tx-1",
        amount: "35.50",
        type: "LENT",
        description: "Shared taxi ride",
        person: { name: "Alice" },
      },
    ]);

    // Mock notification queues
    (prisma.notificationLog.create as jest.Mock).mockResolvedValue({ id: "log-1" });

    // Execute compilation
    const result = await recapService.generateDailyRecap("user-uuid-1122");

    // Assertions
    expect(result.summary).toContain("# Morning Recap");
    expect(result.summary).toContain("Complete design layout");
    expect(result.summary).toContain("Check client guidelines");
    expect(result.summary).toContain("$35.50 from Alice (Shared taxi ride)");
    expect(mockRecapRepository.createRecap).toHaveBeenCalled();
  });
});
