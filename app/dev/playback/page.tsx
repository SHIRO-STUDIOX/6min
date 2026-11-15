import { notFound } from "next/navigation";
import { LessonVideo } from "@/components/organisms/lesson-video";
import { demoContentAllowed } from "@/lib/contracts/content";

export const dynamic = "force-dynamic";
export default function PlaybackHarness() {
  if (!demoContentAllowed()) notFound();
  return (
    <main className="p-6">
      <LessonVideo
        lessonId="de-01"
        revisionId="de-01-v1"
        assetId="de-01-video"
        src="/demo/synthetic.mp4"
        captionsUrl="/demo/synthetic.vtt"
        durationMs={10000}
        persist
      />
    </main>
  );
}
