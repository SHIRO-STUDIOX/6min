import type { PublicStage } from "./content";
import type { lessonAccess } from "../domain/identity/access";
export type CatalogItem = {
  id: string;
  number: number;
  title: string;
  published: boolean;
  demoOnly: boolean;
  score: number;
  videoCredited: boolean;
  access: ReturnType<typeof lessonAccess>;
};
export type LessonDTO = {
  id: string;
  sequenceNumber: number;
  title: string;
  currentRevisionId: string;
  demoOnly: boolean;
  progress: { videoCredited: boolean; lessonScore: number };
  video: {
    assetId: string;
    url: string;
    durationMs: number;
    captionsUrl: string;
  };
  stages: PublicStage[];
};
export type ProgressDTO = {
  subject: { id: string; kind: "guest" | "user" };
  lessons: CatalogItem[];
  currentLesson: string;
  lastActivity: {
    lesson_id: string;
    stage_id: string | null;
    source_route?: string;
  } | null;
  selectedContext: { lesson_id: string; stage_id: string } | null;
  activityDays: string[];
  exercises: {
    stageId: string;
    earnedFraction: number;
    bestFullScore: number | null;
    lastFullScore: number | null;
  }[];
};
export type Learner = {
  scope: string;
  kind: "guest" | "user";
  user: {
    id: string;
    displayName: string;
    avatarKey: string | null;
    authMode: string;
  } | null;
  progress: ProgressDTO;
};
