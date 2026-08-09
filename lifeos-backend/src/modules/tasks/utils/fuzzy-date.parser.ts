export interface ParsedTask {
  title: string;
  dueDate: Date | null;
  originalDueDateText: string | null;
  recurrenceRule: string | null;
  scheduledTime: string | null;
}

/**
 * Parses natural language input (e.g. "Exercise every day at 10:00 AM", "clean room tomorrow")
 * and extracts the task title, calculated start date, recurrence rules, and scheduled time.
 */
export function parseFuzzyDate(input: string): ParsedTask {
  let text = input.trim();
  const now = new Date();
  
  let dueDate: Date | null = null;
  let originalDueDateText: string | null = null;
  let recurrenceRule: string | null = null;
  let scheduledTime: string | null = null;
  let title = text;

  const cleanTitle = (phrase: string) => {
    const escaped = phrase.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
    const regex = new RegExp(`\\b(by|before|on|at|this)?\\s*${escaped}\\b`, "gi");
    title = title.replace(regex, "").replace(/\s+/g, " ").trim();
  };


  // 1. Parse time (e.g. "at 10:00 AM", "at 2 PM", "at 9:30 pm")
  const timeMatch = text.match(/\bat\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i);
  if (timeMatch) {
    const hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const ampm = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

    let formattedHour = hour;
    let period = "AM";

    if (ampm) {
      period = ampm;
      formattedHour = hour;
    } else {
      if (hour >= 12) {
        period = "PM";
        formattedHour = hour === 12 ? 12 : hour - 12;
      } else {
        period = "AM";
        formattedHour = hour === 0 ? 12 : hour;
      }
    }

    const minStr = minute < 10 ? `0${minute}` : `${minute}`;
    scheduledTime = `${formattedHour}:${minStr} ${period}`;
    cleanTitle(timeMatch[0]);
  }

  const cleanLower = title.toLowerCase();

  // 2. Parse Recurrence (e.g. "every day", "daily", "every Monday")
  if (/\bevery\s*day\b/i.test(cleanLower) || /\bdaily\b/i.test(cleanLower)) {
    recurrenceRule = "FREQ=DAILY";
    originalDueDateText = "every day";
    dueDate = new Date(now); // Starts today
    dueDate.setHours(12, 0, 0, 0);
    cleanTitle("every day");
    cleanTitle("daily");
  } else {
    const weekdays = [
      { name: "sunday", code: "SU", index: 0 },
      { name: "monday", code: "MO", index: 1 },
      { name: "tuesday", code: "TU", index: 2 },
      { name: "wednesday", code: "WE", index: 3 },
      { name: "thursday", code: "TH", index: 4 },
      { name: "friday", code: "FR", index: 5 },
      { name: "saturday", code: "SA", index: 6 },
    ];

    let matchedRecurrence = false;
    for (const day of weekdays) {
      const everyRegex = new RegExp(`\\bevery\\s*${day.name}\\b`, "i");
      if (everyRegex.test(cleanLower)) {
        recurrenceRule = `FREQ=WEEKLY;BYDAY=${day.code}`;
        originalDueDateText = `every ${day.name.charAt(0).toUpperCase() + day.name.slice(1)}`;
        
        // Find the next occurrence of this day of week to start
        dueDate = getNextDayOfWeek(now, day.index);
        dueDate.setHours(12, 0, 0, 0);
        
        cleanTitle(`every ${day.name}`);
        matchedRecurrence = true;
        break;
      }
    }

    // 3. Parse standard single dates if no recurrence was found
    if (!matchedRecurrence) {
      if (/\btomorrow\b/i.test(cleanLower)) {
        dueDate = new Date(now);
        dueDate.setDate(now.getDate() + 1);
        dueDate.setHours(12, 0, 0, 0);
        originalDueDateText = "tomorrow";
        cleanTitle("tomorrow");
      } else if (/\btonight\b/i.test(cleanLower)) {
        dueDate = new Date(now);
        dueDate.setHours(21, 0, 0, 0);
        originalDueDateText = "tonight";
        cleanTitle("tonight");
      } else if (/\bbefore Friday\b/i.test(cleanLower)) {
        dueDate = getNextDayOfWeek(now, 5);
        dueDate.setDate(dueDate.getDate() - 1);
        dueDate.setHours(17, 0, 0, 0);
        originalDueDateText = "before Friday";
        cleanTitle("before Friday");
      } else if (/\bthis week\b/i.test(cleanLower)) {
        dueDate = getNextDayOfWeek(now, 5);
        dueDate.setHours(17, 0, 0, 0);
        originalDueDateText = "this week";
        cleanTitle("this week");
      } else {
        for (const day of weekdays) {
          const dayRegex = new RegExp(`\\b${day.name}\\b`, "i");
          if (dayRegex.test(cleanLower)) {
            dueDate = getNextDayOfWeek(now, day.index);
            dueDate.setHours(12, 0, 0, 0);
            originalDueDateText = `on ${day.name.charAt(0).toUpperCase() + day.name.slice(1)}`;
            cleanTitle(day.name);
            break;
          }
        }
      }
    }
  }

  // Clear any trailing prepositions
  title = title.replace(/\b(by|before|on|at|for|to)\s*$/gi, "").trim();



  return {
    title: title || "Untitled Task",
    dueDate,
    originalDueDateText,
    recurrenceRule,
    scheduledTime,
  };
}

function getNextDayOfWeek(fromDate: Date, dayOfWeek: number): Date {
  const resultDate = new Date(fromDate);
  const currentDay = fromDate.getDay();
  
  let diff = dayOfWeek - currentDay;
  if (diff <= 0) {
    diff += 7;
  }
  
  resultDate.setDate(fromDate.getDate() + diff);
  return resultDate;
}
