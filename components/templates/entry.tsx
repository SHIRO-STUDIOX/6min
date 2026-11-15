"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@heroui/react";
import { resumePath } from "@/lib/client/resume-path";
import { loadLearner } from "@/lib/client/learner";

export function Entry() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void loadLearner()
      .then((model) => {
        if (model.progress.lastActivity)
          router.replace(resumePath(model.progress));
        else setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);
  return (
    <main className="h-dvh overflow-auto flex items-center justify-center p-6">
      <Card className="p-6 max-w-md gap-4">
        <Card.Header>
          <Card.Title>یادگیری آلمانی با شیش</Card.Title>
        </Card.Header>
        <Card.Content>
          <p>
            ویدیو را ببینید، تمرین کنید و اشتباه‌ها را مرور کنید. سه درس اول
            برای مهمان رایگان است. اکنون محتوای موجود نمونه آزمایشی است.
          </p>
          {loading && <p role="status">در حال بررسی ادامه یادگیری…</p>}
        </Card.Content>
        <Card.Footer className="flex flex-wrap gap-2">
          <Button
            isDisabled={loading}
            onPress={() => router.push("/classroom/de-01")}
          >
            شروع درس اول
          </Button>
          <Button
            isDisabled={loading}
            variant="secondary"
            onPress={() => router.push("/auth")}
          >
            ورود به حساب
          </Button>
        </Card.Footer>
      </Card>
    </main>
  );
}
