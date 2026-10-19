/**
 * ORBIT domain model. Every persisted row is owned by exactly one user
 * (`user_id`) and enforced both in the repository layer and, in Supabase
 * mode, by row-level security.
 */

export type ISODate = string;

export interface BaseRow {
  id: string;
  user_id: string;
  created_at: ISODate;
  updated_at: ISODate;
}

export type ThemePref = "light" | "dark" | "system";

export interface SettingsRow extends BaseRow {
  display_name: string | null;
  theme: ThemePref;
  language: string;
  daily_goal_minutes: number;
  focus_minutes: number;
  break_minutes: number;
  long_break_minutes: number;
  notifications: boolean;
  default_persona_id: string | null;
  active_workspace_id: string | null;
  embeddings_credential_id: string | null;
}

export interface WorkspaceRow extends BaseRow {
  name: string;
  description: string | null;
}

export interface SubjectRow extends BaseRow {
  workspace_id: string;
  name: string;
  code: string | null;
  description: string | null;
  /** 0–5, used for the monochrome orbit glyph variant */
  glyph: number;
}

export interface NoteRow extends BaseRow {
  workspace_id: string;
  subject_id: string | null;
  title: string;
  content: string; // HTML from the editor
  plain: string; // derived plain text (search + AI)
  folder: string | null;
  tags: string[];
  pinned: boolean;
  word_count: number;
}

export type SourceKind = "pdf" | "docx" | "text" | "markdown" | "image" | "url" | "youtube" | "transcript" | "summary";
export type SourceStatus = "queued" | "processing" | "ready" | "failed" | "needs_input";

export interface SourceOutlineItem {
  title: string;
  page: number | null;
  level: number;
}

export interface SourceRow extends BaseRow {
  workspace_id: string;
  subject_id: string | null;
  title: string;
  kind: SourceKind;
  status: SourceStatus;
  status_detail: string | null;
  progress: number; // 0–100
  url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  page_count: number | null;
  text: string | null; // full extracted text (or user-provided)
  outline: SourceOutlineItem[];
  summary: string | null;
  summary_model: string | null;
  collection: string | null;
  pinned: boolean;
}

export interface SourceChunkRow extends BaseRow {
  source_id: string;
  ord: number;
  content: string;
  page: number | null;
  heading: string | null;
  token_count: number;
  embedding: number[] | null;
}

export type ChatMode = "concise" | "detailed" | "tutorial" | "examples" | "practice" | "socratic";

export interface ChatScope {
  subjectIds: string[];
  sourceIds: string[];
  noteIds: string[];
  collections: string[];
}

export interface ConversationRow extends BaseRow {
  workspace_id: string;
  title: string;
  persona_id: string | null;
  credential_id: string | null;
  model: string | null;
  mode: ChatMode;
  scope: ChatScope;
  grounded: boolean;
  pinned: boolean;
}

export interface Citation {
  key: string; // e.g. "S1"
  sourceId: string;
  sourceTitle: string;
  chunkId: string;
  page: number | null;
  heading: string | null;
  excerpt: string;
  kind: "source" | "note";
}

export interface MessageRow extends BaseRow {
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  persona_name: string | null;
  model: string | null;
  provider: string | null;
  citations: Citation[];
  grounding: "grounded" | "partial" | "ungrounded" | "none";
  error: string | null;
}

export type Depth = "brief" | "standard" | "deep";
export type ResponseLength = "short" | "medium" | "long";

export interface PersonaRow extends BaseRow {
  slug: string;
  name: string;
  role: string;
  tagline: string;
  teaching_style: string;
  instructions: string;
  credential_id: string | null;
  model: string | null;
  temperature: number | null;
  depth: Depth;
  length: ResponseLength;
  language: string;
  source_collections: string[];
  builtin: boolean;
  glyph: number;
}

export type ProviderKind = "openai" | "anthropic" | "gemini" | "openrouter" | "deepseek" | "custom";

export interface CredentialRow extends BaseRow {
  provider: ProviderKind;
  label: string;
  base_url: string | null;
  key_ciphertext: string; // never leaves the server
  key_hint: string; // e.g. "sk-…a9F2"
  status: "untested" | "connected" | "error";
  status_detail: string | null;
  default_model: string | null;
  models_cache: ModelInfo[];
  last_tested_at: ISODate | null;
}

/** The safe projection of a credential that may be sent to the browser. */
export type PublicCredential = Omit<CredentialRow, "key_ciphertext">;

export interface ModelInfo {
  id: string;
  label: string;
  contextWindow: number | null;
  vision: boolean | null;
  /** USD per 1M tokens, only when the provider publishes it via API. */
  inputPrice: number | null;
  outputPrice: number | null;
}

export type HomeworkMode = "guide" | "solve" | "research" | "automate" | "review";
export type StageKey = "input" | "analysis" | "sources" | "generation" | "review" | "export";
export type StageStatus = "idle" | "running" | "done" | "error" | "stale";

export interface AssignmentRequirements {
  subject: string | null;
  summary: string;
  questions: string[];
  instructions: string[];
  dueDate: string | null;
  outputFormat: string | null;
  objectives: string[];
  constraints: string[];
}

export interface ReviewFinding {
  category: "completeness" | "reasoning" | "accuracy" | "clarity" | "grammar" | "instructions";
  severity: "info" | "minor" | "major";
  excerpt: string | null;
  comment: string;
  suggestion: string | null;
}

export interface AssignmentRow extends BaseRow {
  workspace_id: string;
  subject_id: string | null;
  title: string;
  prompt_text: string;
  attachment_source_ids: string[];
  linked_note_ids: string[];
  selected_source_ids: string[];
  mode: HomeworkMode;
  status: "planning" | "in_progress" | "review" | "complete";
  due_at: ISODate | null;
  requirements: AssignmentRequirements | null;
  stages: Record<StageKey, StageStatus>;
  ai_output: string | null; // AI generated draft / explanation (markdown)
  ai_output_model: string | null;
  student_work: string; // student's own answer (markdown/plain)
  review: ReviewFinding[];
  guide_log: { role: "student" | "ai"; content: string }[];
}

export interface AssignmentStepRow extends BaseRow {
  assignment_id: string;
  ord: number;
  title: string;
  detail: string | null;
  done: boolean;
  estimate_minutes: number | null;
  scheduled_at: ISODate | null;
  origin: "student" | "ai";
}

export interface FlashcardRow extends BaseRow {
  workspace_id: string;
  subject_id: string | null;
  deck: string;
  front: string;
  back: string;
  source_ref: SourceRef | null;
  ease: number;
  interval_days: number;
  reps: number;
  lapses: number;
  due_at: ISODate;
  last_reviewed_at: ISODate | null;
}

export interface SourceRef {
  type: "note" | "source";
  id: string;
  title: string;
  page: number | null;
  excerpt: string | null;
}

export type QuestionType = "mcq" | "short" | "open";

export interface QuizQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  options: string[];
  answer: string; // for mcq: the correct option text
  explanation: string;
  source: SourceRef | null;
}

export interface QuizRow extends BaseRow {
  workspace_id: string;
  subject_id: string | null;
  title: string;
  exam: boolean;
  time_limit_minutes: number | null;
  questions: QuizQuestion[];
  model: string | null;
}

export interface QuizAnswer {
  questionId: string;
  response: string;
  correct: boolean | null;
  score: number; // 0–1
  feedback: string | null;
}

export interface QuizAttemptRow extends BaseRow {
  quiz_id: string;
  answers: QuizAnswer[];
  score: number; // 0–1
  duration_seconds: number;
}

export interface StudySessionRow extends BaseRow {
  workspace_id: string;
  subject_id: string | null;
  assignment_id: string | null;
  label: string;
  kind: "focus" | "break";
  planned_seconds: number;
  actual_seconds: number;
  started_at: ISODate;
  ended_at: ISODate | null;
  completed_note: string | null;
}

export interface EventRow extends BaseRow {
  workspace_id: string;
  title: string;
  kind: "study" | "deadline" | "exam" | "other" | "class";
  starts_at: ISODate;
  ends_at: ISODate | null;
  subject_id: string | null;
  assignment_id: string | null;
  done: boolean;
  origin: "student" | "ai" | "feed";
  /** Set when the event comes from a subscribed calendar (iCal feed). */
  feed_id?: string | null;
  location?: string | null;
  external_uid?: string | null;
}

export interface CalendarFeedRow extends BaseRow {
  workspace_id: string;
  name: string;
  /** Encrypted when ORBIT_ENCRYPTION_KEY is set (the link is a private token). */
  url: string;
  color: string | null;
  last_synced_at: ISODate | null;
  last_error: string | null;
  event_count: number;
}

export type EntityType = "subject" | "note" | "source" | "conversation" | "assignment" | "concept";
export type EdgeKind = "belongs_to" | "references" | "builds_upon" | "related" | "prerequisite";

export interface GraphNodeRow extends BaseRow {
  workspace_id: string;
  entity_type: EntityType;
  entity_id: string; // for concept nodes, equals the row id
  label: string | null; // concept label
  x: number;
  y: number;
}

export interface GraphEdgeRow extends BaseRow {
  workspace_id: string;
  from_type: EntityType;
  from_id: string;
  to_type: EntityType;
  to_id: string;
  kind: EdgeKind;
  origin: "user" | "ai";
  status: "approved" | "suggested" | "rejected";
  rationale: string | null;
}

export interface Tables {
  settings: SettingsRow;
  workspaces: WorkspaceRow;
  subjects: SubjectRow;
  notes: NoteRow;
  sources: SourceRow;
  source_chunks: SourceChunkRow;
  conversations: ConversationRow;
  messages: MessageRow;
  personas: PersonaRow;
  credentials: CredentialRow;
  assignments: AssignmentRow;
  assignment_steps: AssignmentStepRow;
  flashcards: FlashcardRow;
  quizzes: QuizRow;
  quiz_attempts: QuizAttemptRow;
  study_sessions: StudySessionRow;
  events: EventRow;
  calendar_feeds: CalendarFeedRow;
  graph_nodes: GraphNodeRow;
  graph_edges: GraphEdgeRow;
}

export type TableName = keyof Tables;
export type Row<T extends TableName> = Tables[T];
export type SystemColumn = "id" | "user_id" | "created_at" | "updated_at";
export type Insert<T extends TableName> = Partial<Omit<Tables[T], SystemColumn>> & { id?: string };
export type Patch<T extends TableName> = Partial<Omit<Tables[T], SystemColumn>>;

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
}
