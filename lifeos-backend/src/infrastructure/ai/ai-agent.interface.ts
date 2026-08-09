export interface AIAgentAnalysisResult {
  suggestedTasks?: string[];
  suggestedTags?: string[];
  sentiment?: string;
  category?: string;
}

export interface IAIAgentService {
  /**
   * Semantically parses inbox text captures to extract task items,
   * categorizations tags, and general sentiment profiles.
   */
  analyzeCapture(text: string): Promise<AIAgentAnalysisResult>;

  /**
   * Formats raw, disjointed speech transcripts into refined text.
   */
  polishTranscript(rawTranscript: string): Promise<string>;

  /**
   * Synthesizes daily markdown details into a short subject headline.
   */
  summarizeRecap(recapMarkdown: string): Promise<string>;
}
