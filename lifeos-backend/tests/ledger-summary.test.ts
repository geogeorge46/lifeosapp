import { LedgerService } from "../src/modules/ledger/ledger.service";

describe("Ledger Service Unit Tests", () => {
  let mockRepository: any;
  let ledgerService: LedgerService;

  beforeEach(() => {
    mockRepository = {
      createTransaction: jest.fn().mockImplementation((data) => Promise.resolve({ id: "tx-mock-1", ...data })),
      findAllByUserId: jest.fn().mockResolvedValue([]),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      delete: jest.fn(),
      getSummary: jest.fn(),
    };
    ledgerService = new LedgerService(mockRepository);
  });

  test("should enforce absolute values to normalize negative transaction entries", async () => {
    const userId = "user-uuid-123";
    const negativeEntry = {
      amount: -75.5,
      type: "EXPENSE" as const,
      description: "Test expense with negative amount",
    };

    await ledgerService.addTransaction(userId, negativeEntry);

    // Verify absolute conversion in mock create database payload
    expect(mockRepository.createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 75.5, // Converted to positive absolute number
      })
    );
  });
});
