/**
 * Study buddy feature types
 */

export interface StudyBuddyUser {
  id: string;
  buddyId: string;
  name: string;
  grade?: string;
  age?: number;
  isBuddy?: boolean;
}

export interface StudyBuddyRequest {
  id: string;
  message?: string | null;
  createdAt: string;
  from?: StudyBuddyUser;
  to?: StudyBuddyUser;
}

export interface SharedQuizSummary {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
  questionCount: number;
}

export interface StudyBuddyQuizShare {
  id: string;
  message?: string | null;
  status: 'unread' | 'read' | 'started';
  createdAt: string;
  from: Pick<StudyBuddyUser, 'id' | 'name' | 'buddyId'>;
  quiz: SharedQuizSummary;
}

export type BuddyConnectionSource = 'you_sent' | 'they_sent';

export interface AcceptedStudyBuddy extends StudyBuddyUser {
  connectedAt?: string;
  connectedVia?: BuddyConnectionSource;
}

export interface StudyBuddyDashboard {
  myBuddyId: string | null;
  myName: string | null;
  buddies: AcceptedStudyBuddy[];
  incomingRequests: StudyBuddyRequest[];
  outgoingRequests: StudyBuddyRequest[];
  receivedQuizShares: StudyBuddyQuizShare[];
}

export interface QuizLibraryListItem {
  id: string;
  title: string;
  subject: string;
  difficulty: string;
  question_count: number;
}
