import { parseFuzzyDate } from "../src/modules/tasks/utils/fuzzy-date.parser";

describe("Fuzzy Date NLP Parser Test Suite", () => {
  // Save date offsets to make calculations timezone-agnostic
  const now = new Date();

  test("should parse 'tomorrow' scheduled task title and date", () => {
    const rawInput = "Call Mom tomorrow";
    const result = parseFuzzyDate(rawInput);

    expect(result.title).toBe("Call Mom");
    expect(result.dueDate).not.toBeNull();

    const expectedDate = new Date();
    expectedDate.setDate(now.getDate() + 1);
    expectedDate.setHours(12, 0, 0, 0);

    expect(result.dueDate?.getDate()).toBe(expectedDate.getDate());
    expect(result.dueDate?.getHours()).toBe(12);
  });

  test("should parse 'this week' target date to Friday evening", () => {
    const rawInput = "Clean the garage this week";
    const result = parseFuzzyDate(rawInput);

    expect(result.title).toBe("Clean the garage");
    expect(result.dueDate).not.toBeNull();

    // Check that target day of week is Friday (5)
    expect(result.dueDate?.getDay()).toBe(5);
    expect(result.dueDate?.getHours()).toBe(17); // 05:00 PM
  });

  test("should parse 'before Friday' deadline target to Thursday evening", () => {
    const rawInput = "File taxes before Friday";
    const result = parseFuzzyDate(rawInput);

    expect(result.title).toBe("File taxes");
    expect(result.dueDate).not.toBeNull();

    // Check that target day of week is Thursday (4)
    expect(result.dueDate?.getDay()).toBe(4);
    expect(result.dueDate?.getHours()).toBe(17); // 05:00 PM
  });

  test("should fall back to raw input when no date cue matches", () => {
    const rawInput = "Standard task description";
    const result = parseFuzzyDate(rawInput);

    expect(result.title).toBe("Standard task description");
    expect(result.dueDate).toBeNull();
  });
});
