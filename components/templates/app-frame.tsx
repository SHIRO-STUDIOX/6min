"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Button,
  Calendar,
  Popover,
  Modal,
  TextField,
  Label,
  TextArea,
} from "@heroui/react";
import {
  Flame,
  Ellipsis,
  BookOpen,
  Map,
  User,
  CircleAlert,
} from "lucide-react";
import { scopedApi } from "@/lib/client/api";
import { errorMessage } from "@/lib/client/messages";
import type { Learner } from "@/lib/contracts/experience";

export function AppFrame({
  children,
  model = null,
  focus = false,
  lessonId = null,
  stageId = null,
}: {
  children: ReactNode;
  model?: Learner | null;
  focus?: boolean;
  lessonId?: string | null;
  stageId?: string | null;
}) {
  const api = scopedApi(model?.scope);
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [modal, setModal] = useState<"appearance" | "help" | "report" | null>(
    null,
  );
  const [moreOpen, setMoreOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [keyboard, setKeyboard] = useState(false);
  const [report, setReport] = useState("");
  const [reportStatus, setReportStatus] = useState("");
  const positions = useRef(new WeakMap<HTMLElement, number>());
  useEffect(() => {
    const identityChanged = (event: StorageEvent) => {
      if (event.key === "shish:identity-change") window.location.reload();
    };
    window.addEventListener("storage", identityChanged);
    const scrolled = (event: Event) => {
      const target = event.target as HTMLElement;
      if (!target?.hasAttribute?.("data-app-scroll")) return;
      const next = target.scrollTop;
      const previous = positions.current.get(target) ?? 0;
      if (Math.abs(next - previous) > 8)
        setHidden(next > previous && next > 30);
      positions.current.set(target, next);
    };
    const resize = () =>
      setKeyboard(
        Boolean(
          window.visualViewport &&
            window.innerHeight - window.visualViewport.height > 120,
        ),
      );
    document.addEventListener("scroll", scrolled, true);
    window.visualViewport?.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("storage", identityChanged);
      document.removeEventListener("scroll", scrolled, true);
      window.visualViewport?.removeEventListener("resize", resize);
    };
  }, []);
  const returnTo = lessonId
    ? `/classroom/${encodeURIComponent(lessonId)}${stageId ? `?stage=${encodeURIComponent(stageId)}&restore=1` : ""}`
    : pathname;
  const selected = pathname.startsWith("/path")
    ? "path"
    : pathname.startsWith("/profile")
      ? "profile"
      : "classroom";
  const days = model?.progress.activityDays ?? [];
  return (
    <div
      className="h-dvh w-full flex flex-col bg-background text-foreground"
      data-focus={focus || undefined}
    >
      <header
        className="shrink-0 flex items-center justify-between gap-3 p-3 sm:px-6"
        aria-label="ابزارهای کلاس"
      >
        <span className="font-black text-xl">شیش</span>
        <div className="flex items-center gap-2">
          <Popover>
            <Button variant="secondary" aria-label="استریک و تقویم فعالیت">
              <Flame className="size-4" />
              <span className="hidden sm:inline">استریک</span>
            </Button>
            <Popover.Content>
              <Popover.Dialog>
                <Popover.Heading>تقویم فعالیت</Popover.Heading>
                <p>{days.length} روز با تلاش کامل ثبت‌شده</p>
                <Calendar aria-label="تقویم فعالیت" isReadOnly>
                  <Calendar.Header>
                    <Calendar.Heading />
                    <Calendar.NavButton slot="previous" />
                    <Calendar.NavButton slot="next" />
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>
                      {(day) => (
                        <Calendar.HeaderCell>{day}</Calendar.HeaderCell>
                      )}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>
                      {(date) => (
                        <Calendar.Cell
                          date={date}
                          className={
                            days.includes(date.toString())
                              ? "ring-1 ring-accent font-bold"
                              : ""
                          }
                        />
                      )}
                    </Calendar.GridBody>
                  </Calendar.Grid>
                </Calendar>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
          <Popover>
            <Button variant="secondary" aria-label="اشتباهات">
              <CircleAlert className="size-4" />
              <span className="hidden sm:inline">اشتباهات</span>
            </Button>
            <Popover.Content>
              <Popover.Dialog>
                <Popover.Heading>مرور اشتباهات</Popover.Heading>
                <p>پاسخ‌های نیازمند مرور را از جدید به قدیم ببینید.</p>
                <Button
                  onPress={() =>
                    router.push(
                      `/mistakes?returnTo=${encodeURIComponent(returnTo)}`,
                    )
                  }
                >
                  باز کردن اشتباهات
                </Button>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
          <Popover isOpen={moreOpen} onOpenChange={setMoreOpen}>
            <Button variant="secondary" aria-label="بیشتر">
              <Ellipsis className="size-4" />
            </Button>
            <Popover.Content>
              <Popover.Dialog>
                <Popover.Heading>بیشتر</Popover.Heading>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="tertiary"
                    onPress={() => {
                      setMoreOpen(false);
                      setModal("appearance");
                    }}
                  >
                    ظاهر و محیط کلاس
                  </Button>
                  <Button
                    variant="tertiary"
                    onPress={() => {
                      setMoreOpen(false);
                      setModal("help");
                    }}
                  >
                    راهنما
                  </Button>
                  <Button
                    variant="tertiary"
                    onPress={() => {
                      setMoreOpen(false);
                      setModal("report");
                    }}
                  >
                    گزارش مشکل
                  </Button>
                  <Button
                    variant="tertiary"
                    onPress={() => router.push("/path")}
                  >
                    خروج از کلاس
                  </Button>
                </div>
              </Popover.Dialog>
            </Popover.Content>
          </Popover>
          <Button
            size="sm"
            variant="tertiary"
            onPress={() =>
              router.push(`/auth?returnTo=${encodeURIComponent(returnTo)}`)
            }
          >
            {model?.kind === "user" ? "حساب" : "ورود"}
          </Button>
        </div>
      </header>
      <div
        data-app-scroll
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-24"
      >
        {children}
      </div>
      <nav
        aria-label="ناوبری اصلی"
        dir="ltr"
        className={`fixed bottom-4 inset-x-0 mx-auto w-fit flex items-center gap-2 p-2 rounded-full bg-surface/80 border border-separator backdrop-blur-xl z-40 motion-safe:transition-transform ${hidden || keyboard ? "translate-y-32 pointer-events-none" : "translate-y-0"} ${focus ? "opacity-70 focus-within:opacity-100" : ""}`}
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {[
          { id: "path", label: "مسیر من", icon: Map, path: "/path" },
          {
            id: "classroom",
            label: "کلاس",
            icon: BookOpen,
            path: "/classroom",
          },
          { id: "profile", label: "پروفایل", icon: User, path: "/profile" },
        ].map((item) => (
          <Button
            key={item.id}
            aria-current={selected === item.id ? "page" : undefined}
            aria-label={item.label}
            isDisabled={Boolean(modal) || hidden || keyboard}
            variant={selected === item.id ? "primary" : "secondary"}
            onPress={() => router.push(item.path)}
          >
            <item.icon className="size-4" />
            <span dir="rtl">{item.label}</span>
          </Button>
        ))}
      </nav>
      <Modal.Backdrop
        isOpen={Boolean(modal)}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <Modal.Container>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>
                {modal === "appearance"
                  ? "ظاهر و محیط کلاس"
                  : modal === "help"
                    ? "راهنما"
                    : "گزارش مشکل"}
              </Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {modal === "appearance" ? (
                <Button
                  onPress={() =>
                    setTheme(resolvedTheme === "dark" ? "light" : "dark")
                  }
                >
                  تغییر حالت روشن / تیره
                </Button>
              ) : modal === "help" ? (
                <p>
                  با نقطه‌های بالای کارت، مرحله را انتخاب کنید. مرحله قفل را
                  می‌توانید ببینید، اما فعالیت آن پس از پیش‌نیاز فعال می‌شود.
                  امتیاز پس از ثبت تلاش کامل محاسبه می‌شود.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  <TextField value={report} onChange={setReport}>
                    <Label>شرح مشکل (بدون رمز یا اطلاعات حساس)</Label>
                    <TextArea maxLength={1000} />
                  </TextField>
                  <Button
                    isDisabled={!model || report.trim().length < 5}
                    onPress={() => {
                      void api<{ reportId: string }>(
                        "/support/reports",
                        "POST",
                        { message: report, lessonId, stageId },
                      )
                        .then(() => {
                          setReportStatus("گزارش شما ثبت شد.");
                          setReport("");
                        })
                        .catch((error) =>
                          setReportStatus(
                            errorMessage(
                              error instanceof Error
                                ? error.message
                                : "REQUEST_FAILED",
                            ),
                          ),
                        );
                    }}
                  >
                    ثبت گزارش
                  </Button>
                  <p role="status">{reportStatus}</p>
                </div>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button slot="close" variant="secondary">
                بستن
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </div>
  );
}
