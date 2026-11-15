import { Classroom } from "@/components/templates/classroom";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ stage?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  return (
    <Classroom
      key={id}
      lessonId={id}
      initialStageId={typeof query.stage === "string" ? query.stage : undefined}
    />
  );
}
