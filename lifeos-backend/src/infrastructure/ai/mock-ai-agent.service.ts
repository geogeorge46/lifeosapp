import { IAIAgentService, AIAgentAnalysisResult } from "./ai-agent.interface";

export class MockAIAgentService implements IAIAgentService {
  async analyzeCapture(text: string): Promise<AIAgentAnalysisResult> {
    const tasks: string[] = [];
    const tags: string[] = [];
    const lower = text.toLowerCase();

    // Match keywords to simulate AI heuristics
    if (lower.includes("buy") || lower.includes("grocery")) {
      tasks.push(text);
      tags.push("errands");
      tags.push("shopping");
    } else if (lower.includes("call") || lower.includes("meet")) {
      tasks.push(text);
      tags.push("social");
      tags.push("meetings");
    } else if (lower.includes("project") || lower.includes("code") || lower.includes("work")) {
      tasks.push(text);
      tags.push("career");
      tags.push("productive");
    } else {
      tags.push("general");
    }

    return {
      suggestedTasks: tasks,
      suggestedTags: tags,
      sentiment: lower.includes("happy") || lower.includes("great") ? "POSITIVE" : "NEUTRAL",
      category: tags[0] || "general",
    };
  }

  async polishTranscript(rawTranscript: string): Promise<string> {
    if (!rawTranscript) return "";
    const clean = rawTranscript.trim();
    return clean.charAt(0).toUpperCase() + clean.slice(1) + (clean.endsWith(".") ? "" : ".");
  }

  async summarizeRecap(_recapMarkdown: string): Promise<string> {
    return "🌅 Your Day at a Glance: Focus Digest Ready";
  }
}
