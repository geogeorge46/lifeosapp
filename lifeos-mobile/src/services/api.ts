const BASE_URL = "http://10.237.142.165:3000/api";

export interface BrainDumpCollection {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrainDump {
  id: string;
  userId: string;
  contentType: "TEXT" | "AUDIO";
  content: string;
  rawText: string | null;
  status: "INBOX" | "PROCESSED" | "ARCHIVED";
  type: string | null; // e.g. THOUGHT, IDEA, QUESTION, PROBLEM, NOTE
  collectionId: string | null;
  collection?: BrainDumpCollection | null;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InboxItem = BrainDump;

export interface Idea {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  notes: string | null;
  category: string;
  brainDumpId: string | null;
  personId: string | null;
  placeId: string | null;
  createdAt: string;
  updatedAt: string;
  brainDump?: BrainDump | null;
  person?: any | null;
  place?: any | null;
}

export const apiService = {
  async fetchInbox(collectionId?: string | null, type?: string | null): Promise<BrainDump[]> {
    let url = `${BASE_URL}/inbox`;
    const params: string[] = [];
    if (collectionId !== undefined && collectionId !== null) params.push(`collectionId=${collectionId}`);
    if (type !== undefined && type !== null) params.push(`type=${type}`);
    if (params.length > 0) url += `?${params.join("&")}`;

    const response = await fetch(url);
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || "Failed to fetch inbox");
    }
    const result = await response.json();
    return result.data;
  },

  async captureText(content: string): Promise<InboxItem> {
    const response = await fetch(`${BASE_URL}/inbox`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType: "TEXT", content }),
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || "Failed to capture text note");
    }
    const result = await response.json();
    return result.data;
  },

  async captureAudio(fileUri: string): Promise<InboxItem> {
    const formData = new FormData();
    
    // React Native specific File Upload wrapper
    formData.append("audio", {
      uri: fileUri,
      name: "capture-voice.m4a",
      type: "audio/m4a",
    } as any);

    const response = await fetch(`${BASE_URL}/inbox`, {
      method: "POST",
      body: formData,
      headers: {
        // Leave Content-Type blank so the fetch layer automatically generates boundary headers
      },
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody?.error?.message || "Failed to upload audio capture");
    }
    const result = await response.json();
    return result.data;
  },

  async processInboxItem(id: string): Promise<InboxItem> {
    const response = await fetch(`${BASE_URL}/inbox/${id}/process`, {
      method: "PATCH",
    });
    if (!response.ok) throw new Error("Failed to process item");
    const result = await response.json();
    return result.data;
  },

  async archiveInboxItem(id: string): Promise<InboxItem> {
    const response = await fetch(`${BASE_URL}/inbox/${id}/archive`, {
      method: "PATCH",
    });
    if (!response.ok) throw new Error("Failed to archive item");
    const result = await response.json();
    return result.data;
  },

  async deleteInboxItem(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/inbox/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete item");
  },

  async unarchiveInboxItem(id: string): Promise<BrainDump> {
    const response = await fetch(`${BASE_URL}/inbox/${id}/unarchive`, {
      method: "PATCH",
    });
    if (!response.ok) throw new Error("Failed to unarchive item");
    const result = await response.json();
    return result.data;
  },

  async fetchCollections(): Promise<BrainDumpCollection[]> {
    const response = await fetch(`${BASE_URL}/inbox/collections`);
    if (!response.ok) throw new Error("Failed to fetch collections");
    const result = await response.json();
    return result.data;
  },

  async createCollection(name: string): Promise<BrainDumpCollection> {
    const response = await fetch(`${BASE_URL}/inbox/collections`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) throw new Error("Failed to create collection");
    const result = await response.json();
    return result.data;
  },

  async deleteCollection(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/inbox/collections/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete collection");
  },

  async moveToCollection(id: string, collectionId: string | null): Promise<BrainDump> {
    const response = await fetch(`${BASE_URL}/inbox/${id}/move`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ collectionId }),
    });
    if (!response.ok) throw new Error("Failed to move to collection");
    const result = await response.json();
    return result.data;
  },

  async updateBrainDumpType(id: string, type: string | null): Promise<BrainDump> {
    const response = await fetch(`${BASE_URL}/inbox/${id}/type`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
    if (!response.ok) throw new Error("Failed to update type");
    const result = await response.json();
    return result.data;
  },

  async updateBrainDumpContent(id: string, content: string): Promise<BrainDump> {
    const response = await fetch(`${BASE_URL}/inbox/${id}/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error("Failed to edit content");
    const result = await response.json();
    return result.data;
  },

  async fetchIdeas(): Promise<Idea[]> {
    const response = await fetch(`${BASE_URL}/ideas`);
    if (!response.ok) throw new Error("Failed to fetch ideas");
    const result = await response.json();
    return result.data;
  },

  async createIdea(data: {
    title: string;
    description?: string;
    notes?: string;
    category?: string;
    brainDumpId?: string | null;
    personId?: string | null;
    placeId?: string | null;
  }): Promise<Idea> {
    const response = await fetch(`${BASE_URL}/ideas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create idea");
    const result = await response.json();
    return result.data;
  },

  async updateIdea(id: string, data: Partial<Idea>): Promise<Idea> {
    const response = await fetch(`${BASE_URL}/ideas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update idea");
    const result = await response.json();
    return result.data;
  },

  async deleteIdea(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/ideas/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete idea");
  },

  // --- Tasks API ---
  // --- Tasks API ---
  async fetchTodayTasks(dateStr: string): Promise<{ today: TaskOccurrence[]; backlog: TaskOccurrence[] }> {
    const response = await fetch(`${BASE_URL}/tasks/today?date=${dateStr}`);
    if (!response.ok) throw new Error("Failed to fetch today's tasks");
    const result = await response.json();
    return result.data;
  },

  async createTask(rawInput: string, notes?: string): Promise<Task> {
    const response = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawInput, notes }),
    });
    if (!response.ok) throw new Error("Failed to create task");
    const result = await response.json();
    return result.data;
  },

  async createTaskFromInbox(inboxItemId: string): Promise<Task> {
    const response = await fetch(`${BASE_URL}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inboxItemId }),
    });
    if (!response.ok) throw new Error("Failed to convert inbox capture to task");
    const result = await response.json();
    return result.data;
  },

  async updateTaskStatus(occurrenceId: string, status: string): Promise<TaskOccurrence> {
    const response = await fetch(`${BASE_URL}/tasks/occurrences/${occurrenceId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error("Failed to update task status");
    const result = await response.json();
    return result.data;
  },

  async rescheduleTask(occurrenceId: string, dateStr: string, reason?: string): Promise<TaskOccurrence> {
    const response = await fetch(`${BASE_URL}/tasks/occurrences/${occurrenceId}/reschedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr, reason }),
    });
    if (!response.ok) throw new Error("Failed to reschedule task");
    const result = await response.json();
    return result.data;
  },

  async deleteTaskOccurrence(occurrenceId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/tasks/occurrences/${occurrenceId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete task occurrence");
  },

  async deleteTask(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/tasks/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete task");
  },

  async fetchTaskHistory(taskId: string): Promise<TaskHistory[]> {
    const response = await fetch(`${BASE_URL}/tasks/${taskId}/history`);
    if (!response.ok) throw new Error("Failed to fetch task history");
    const result = await response.json();
    return result.data;
  },

  async fetchWeeklyReport(startStr: string, endStr: string): Promise<WeeklyReport> {
    const response = await fetch(`${BASE_URL}/tasks/weekly-report?start=${startStr}&end=${endStr}`);
    if (!response.ok) throw new Error("Failed to fetch weekly insights report");
    const result = await response.json();
    return result.data;
  },

  async fetchCalendarOccurrences(startStr: string, endStr: string): Promise<TaskOccurrence[]> {
    const response = await fetch(`${BASE_URL}/tasks/calendar?start=${startStr}&end=${endStr}`);
    if (!response.ok) throw new Error("Failed to fetch calendar tasks");
    const result = await response.json();
    return result.data;
  },

  async fetchHabits(): Promise<Habit[]> {
    const response = await fetch(`${BASE_URL}/habits`);
    if (!response.ok) throw new Error("Failed to fetch habits list");
    const result = await response.json();
    return result.data;
  },

  async createHabit(title: string): Promise<Habit> {
    const response = await fetch(`${BASE_URL}/habits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!response.ok) throw new Error("Failed to create habit");
    const result = await response.json();
    return result.data;
  },

  async toggleHabitCompletion(id: string, dateStr?: string): Promise<Habit> {
    const response = await fetch(`${BASE_URL}/habits/${id}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr }),
    });
    if (!response.ok) throw new Error("Failed to toggle habit completion");
    const result = await response.json();
    return result.data;
  },

  async deleteHabit(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/habits/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete habit");
  },

  // --- Events API ---
  async fetchEvents(startStr: string, endStr: string): Promise<Event[]> {
    const response = await fetch(`${BASE_URL}/events?start=${startStr}&end=${endStr}`);
    if (!response.ok) throw new Error("Failed to fetch events");
    const result = await response.json();
    return result.data;
  },

  async createEvent(data: { title: string; description?: string; startDate: string; endDate: string; brainDumpId?: string; placeId?: string }): Promise<Event> {
    const response = await fetch(`${BASE_URL}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create event");
    const result = await response.json();
    return result.data;
  },

  async deleteEvent(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/events/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete event");
  },

  // --- Places & Geofencing API ---
  async fetchPlaces(): Promise<Place[]> {
    const response = await fetch(`${BASE_URL}/places`);
    if (!response.ok) throw new Error("Failed to fetch places");
    const result = await response.json();
    return result.data;
  },

  async createPlace(
    name: string,
    latitude: number,
    longitude: number,
    radius?: number,
    address?: string
  ): Promise<Place> {
    const response = await fetch(`${BASE_URL}/places`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, latitude, longitude, radius, address }),
    });
    if (!response.ok) throw new Error("Failed to create place");
    const result = await response.json();
    return result.data;
  },

  async deletePlace(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/places/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete place");
  },

  async bindTaskToPlace(
    placeId: string,
    taskId: string,
    triggerType: "ENTER" | "EXIT" = "ENTER"
  ): Promise<any> {
    const response = await fetch(`${BASE_URL}/places/bind`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId, taskId, triggerType }),
    });
    if (!response.ok) throw new Error("Failed to bind task to place");
    const result = await response.json();
    return result.data;
  },

  async triggerGeofenceEvent(placeId: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/places/trigger`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
    });
    if (!response.ok) throw new Error("Failed to process trigger event");
    const result = await response.json();
    return result.data;
  },

  // --- People CRM API ---
  async fetchPeople(): Promise<Person[]> {
    const response = await fetch(`${BASE_URL}/people`);
    if (!response.ok) throw new Error("Failed to fetch contacts");
    const result = await response.json();
    return result.data;
  },

  async createPerson(
    name: string,
    phone?: string,
    relationship?: string,
    birthday?: string,
    tags?: string[]
  ): Promise<Person> {
    const response = await fetch(`${BASE_URL}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, relationship, birthday, tags }),
    });
    if (!response.ok) throw new Error("Failed to create contact");
    const result = await response.json();
    return result.data;
  },

  async deletePerson(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/people/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete contact");
  },

  async linkPlaceToPerson(personId: string, placeId: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/people/${personId}/places`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placeId }),
    });
    if (!response.ok) throw new Error("Failed to link place");
    const result = await response.json();
    return result.data;
  },

  async unlinkPlaceFromPerson(personId: string, placeId: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/people/${personId}/places/${placeId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to unlink place");
  },

  async addTagToPerson(personId: string, tagName: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/people/${personId}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tagName }),
    });
    if (!response.ok) throw new Error("Failed to add tag");
    const result = await response.json();
    return result.data;
  },

  // --- Money Ledger API ---
  async fetchTransactions(): Promise<Transaction[]> {
    const response = await fetch(`${BASE_URL}/transactions`);
    if (!response.ok) throw new Error("Failed to fetch ledger transactions");
    const result = await response.json();
    return result.data;
  },

  async fetchLedgerSummary(): Promise<LedgerSummary> {
    const response = await fetch(`${BASE_URL}/transactions/summary`);
    if (!response.ok) throw new Error("Failed to fetch ledger summary");
    const result = await response.json();
    return result.data;
  },

  async createTransaction(
    amount: number,
    type: "EXPENSE" | "LENT" | "BORROWED",
    description: string,
    personId?: string | null,
    placeId?: string | null,
    category?: string | null,
    dueDate?: string | null
  ): Promise<Transaction> {
    const response = await fetch(`${BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-timezone-offset": String(new Date().getTimezoneOffset()),
      },
      body: JSON.stringify({ amount, type, description, personId, placeId, category, dueDate }),
    });
    if (!response.ok) throw new Error("Failed to create transaction");
    const result = await response.json();
    return result.data;
  },

  async settleTransaction(id: string, amount?: number): Promise<Transaction> {
    const response = await fetch(`${BASE_URL}/transactions/${id}/settle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    if (!response.ok) throw new Error("Failed to settle transaction");
    const result = await response.json();
    return result.data;
  },

  async splitExpense(
    totalAmount: number,
    description: string,
    placeId: string | null,
    splits: Array<{ personId: string; amount: number }>
  ): Promise<Transaction[]> {
    const response = await fetch(`${BASE_URL}/transactions/split`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ totalAmount, description, placeId, splits }),
    });
    if (!response.ok) throw new Error("Failed to execute split expense");
    const result = await response.json();
    return result.data;
  },

  async fetchPersonBalance(personId: string): Promise<{ netBalance: number; transactions: Transaction[] }> {
    const response = await fetch(`${BASE_URL}/transactions/people/${personId}`);
    if (!response.ok) throw new Error("Failed to fetch balance details");
    const result = await response.json();
    return result.data;
  },

  async deleteTransaction(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/transactions/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete transaction log");
  },

  // --- Daily Recap API ---
  async fetchTodayRecap(): Promise<DailyRecap> {
    const response = await fetch(`${BASE_URL}/recap/today`);
    if (!response.ok) throw new Error("Failed to fetch today's morning recap");
    const result = await response.json();
    return result.data;
  },

  async triggerRecapGeneration(): Promise<DailyRecap> {
    const response = await fetch(`${BASE_URL}/recap/trigger`, {
      method: "POST",
    });
    if (!response.ok) throw new Error("Failed to trigger recap compilation");
    const result = await response.json();
    return result.data;
  },

  // --- Relationships Graph API ---
  async fetchRelationships(): Promise<Relationship[]> {
    const response = await fetch(`${BASE_URL}/people/relationships`);
    if (!response.ok) throw new Error("Failed to fetch relationships");
    const result = await response.json();
    return result.data;
  },

  async createRelationship(
    personAId: string,
    personBId: string,
    type: string
  ): Promise<Relationship> {
    const response = await fetch(`${BASE_URL}/people/relationships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personAId, personBId, type }),
    });
    if (!response.ok) throw new Error("Failed to create relationship");
    const result = await response.json();
    return result.data;
  },

  async deleteRelationship(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/people/relationships/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete relationship");
  },

  async fetchConnections(
    personId: string
  ): Promise<Record<string, Array<{ name: string; relation: string }>>> {
    const response = await fetch(`${BASE_URL}/people/${personId}/connections`);
    if (!response.ok) throw new Error("Failed to fetch graph pathways");
    const result = await response.json();
    return result.data;
  },

  async exportFullData(): Promise<any> {
    const response = await fetch(`${BASE_URL}/settings/export`);
    if (!response.ok) throw new Error("Failed to compile full backup");
    const result = await response.json();
    return result.data;
  },

  async fetchOccasions(personId: string): Promise<Occasion[]> {
    const response = await fetch(`${BASE_URL}/people/${personId}/occasions`);
    if (!response.ok) throw new Error("Failed to fetch occasions");
    const result = await response.json();
    return result.data;
  },

  async createOccasion(
    personId: string,
    title: string,
    date: string,
    type: string,
    offsets: number[]
  ): Promise<Occasion> {
    const response = await fetch(`${BASE_URL}/people/occasions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, title, date, type, offsets }),
    });
    if (!response.ok) throw new Error("Failed to create occasion");
    const result = await response.json();
    return result.data;
  },

  async deleteOccasion(id: string): Promise<void> {
    const response = await fetch(`${BASE_URL}/people/occasions/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete occasion");
  }
};

export interface Occasion {
  id: string;
  personId: string;
  title: string;
  date: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  triggers?: any[];
}

export interface Relationship {
  id: string;
  personAId: string;
  personBId: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  personA: Person;
  personB: Person;
}

export interface DailyRecap {
  id: string;
  userId: string;
  date: string;
  summary: string;
  generatedAt: string;
}

export interface Person {
  id: string;
  userId: string;
  name: string;
  phone: string | null;
  relationship: string | null;
  birthday: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: Array<{
    tag: {
      id: string;
      name: string;
    };
  }>;
  linkedPlaces?: Array<{
    place: {
      id: string;
      name: string;
      latitude: number;
      longitude: number;
    };
  }>;
  transactions?: Transaction[];
  tasks?: Task[];
  brainDumps?: BrainDump[];
  ideas?: Idea[];
}

export interface Transaction {
  id: string;
  userId: string;
  personId: string | null;
  placeId: string | null;
  amount: string;
  type: "EXPENSE" | "LENT" | "BORROWED";
  description: string;
  dueDate: string | null;
  status: "PENDING" | "SETTLED";
  category: string | null;
  settledAt: string | null;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  person?: Person | null;
  place?: Place | null;
  parent?: Transaction | null;
  partialPayments?: Transaction[];
}

export interface LedgerSummary {
  totalExpense: number;
  totalLentPending: number;
  totalBorrowedPending: number;
}


export interface Place {
  id: string;
  userId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  radius: number;
  createdAt: string;
  updatedAt: string;
  geofences?: Array<{
    id: string;
    userId: string;
    placeId: string;
    taskId: string | null;
    triggerType: "ENTER" | "EXIT";
    active: boolean;
    task?: Task;
  }>;
}


export interface Task {
  id: string;
  userId: string;
  inboxItemId: string | null;
  title: string;
  description: string | null;
  source: string;
  priority: string;
  recurrenceRule: string | null;
  fuzzyDate: string | null;
  personId: string | null;
  placeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskOccurrence {
  id: string;
  taskId: string;
  status: "CAPTURED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "NOT_COMPLETED" | "CANCELLED" | "DEFERRED";
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string | null;
  completedAt: string | null;
  task: Task;
  rescheduleCount?: number;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  fromDate: string;
  toDate: string;
  rescheduledAt: string;
  reason: string | null;
}

export interface Event {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  recurrenceRule: string | null;
  placeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyRescheduleStat {
  taskId: string;
  title: string;
  postponeCount: number;
  history: Array<{
    fromDate: string;
    toDate: string;
    rescheduledAt: string;
    reason: string | null;
  }>;
}

export interface WeeklyReport {
  completed: TaskOccurrence[];
  dropped: TaskOccurrence[];
  rescheduled: WeeklyRescheduleStat[];
  uncompleted: TaskOccurrence[];
}

export interface HabitCompletion {
  id: string;
  habitId: string;
  date: string;
  completedAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  title: string;
  streak: number;
  longestStreak: number;
  createdAt: string;
  updatedAt: string;
  completions?: HabitCompletion[];
}

