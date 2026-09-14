"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Button,
  Chip,
  Avatar,
  Dropdown,
  Label,
  Description,
  Separator,
} from "@heroui/react";
import {
  User,
  Menu,
  X,
  ChevronDown,
  BookOpen,
  Compass,
  CreditCard,
  Settings,
  LogOut,
  ShieldCheck,
  Award,
  Layers,
  CheckCircle2,
  Sun,
  Moon,
} from "lucide-react";

export interface FloatingHeaderProps {
  brandTitle?: string;
  isLoggedIn?: boolean;
  userName?: string;
  userRole?: string;
  avatarUrl?: string;
  activeNavItem?: string;
  isCompact?: boolean;
}

const navItems = [
  { id: "home", label: "خانه", href: "#", icon: Compass },
  { id: "courses", label: "سرفصل‌های دوره", href: "#", icon: BookOpen },
  { id: "roadmap", label: "نقشه یادگیری", href: "#", icon: Layers },
  { id: "pricing", label: "اشتراک PRO", href: "#", icon: CreditCard },
];

export function FloatingHeader({
  brandTitle = "۶دقیقه",
  isLoggedIn = true,
  userName = "علی رضوانی",
  userRole = "دانشجوی سطح پیشرفته",
  avatarUrl = "https://i.pravatar.cc/150?u=a042581f4e29026024d",
  activeNavItem = "home",
  isCompact = false,
}: FloatingHeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setIsMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isLight = resolvedTheme === "light";
  const isHeaderCompact = isCompact || scrolled;

  return (
    <div className="@container w-full flex flex-col items-center px-2.5 @[640px]:px-6 pt-3 @[640px]:pt-6 z-40 select-none">
      {/* ۱. بدنه اصلی هدر شناور با ارتفاع ۴۲ پیکسل در موبایل و کوئری کانتینر (Container Query) */}
      <header
        className={`w-full h-[42px] @[640px]:h-auto ${
          isHeaderCompact ? "max-w-4xl p-1 @[640px]:p-2" : "max-w-6xl p-1 @[640px]:p-2.5 @[768px]:p-3"
        } rounded-full glass-rim bg-surface/80 backdrop-blur-3xl backdrop-saturate-150 border border-separator/50 shadow-[0_8px_32px_0_rgba(0,0,0,0.06)] hover:shadow-[0_16px_48px_0_rgba(0,0,0,0.12)] flex items-center justify-between transition-all duration-500 [transition-timing-function:cubic-bezier(0.23,1,0.32,1)] active:scale-[0.985] active:duration-180 cursor-default`}
      >
        {/* بخش راست (RTL Start): لوگو و برند کپسولی */}
        <div className="flex items-center gap-1.5 @[640px]:gap-2.5 @[768px]:gap-5">
          <Link
            href="/"
            className="flex items-center gap-1.5 @[640px]:gap-2.5 rounded-full group transition-transform active:scale-95"
          >
            <div className="size-[34px] @[640px]:size-10 rounded-full bg-gradient-to-tr from-accent to-accent/70 text-accent-foreground flex items-center justify-center shadow-lg shadow-accent/30 group-hover:shadow-accent/50 group-hover:scale-105 transition-all">
              <span className="font-black text-sm @[640px]:text-lg select-none leading-none pt-0.5 font-tabular">۶</span>
            </div>
            <div className="flex items-center gap-1 @[640px]:gap-1.5">
              <span className="font-black text-xs @[640px]:text-base tracking-tight text-foreground">
                {brandTitle}
              </span>
              <Chip
                size="sm"
                variant="primary"
                color="accent"
                className="h-3.5 text-[8px] px-1 @[640px]:h-4 @[640px]:text-[9px] @[640px]:px-1.5 font-bold rounded-full"
              >
                PRO
              </Chip>
            </div>
          </Link>

          <Separator orientation="vertical" className="h-5 hidden @[1024px]:block" />

          {/* منوی ناوبری دسکتاپ به صورت متن مینیمال */}
          <nav className="hidden @[768px]:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = activeNavItem === item.id;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${
                    isActive
                      ? "text-foreground font-black bg-surface-secondary"
                      : "text-muted hover:text-foreground font-medium hover:bg-surface-secondary/50"
                  }`}
                >
                  <Icon className={`size-3.5 ${isActive ? "text-foreground stroke-[2.5]" : "text-muted"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* بخش چپ (RTL End): تم، آواتار و منوی واکنش‌گرا */}
        <div className="flex items-center gap-1 @[640px]:gap-2">
          {/* سوییچر تم کپسولی */}
          <Button
            variant="outline"
            size="sm"
            isIconOnly
            className="size-[34px] min-w-[34px] @[640px]:size-10 @[640px]:min-w-10 rounded-full border-separator"
            aria-label="تغییر تم"
            onClick={() => setTheme(isLight ? "dark" : "light")}
          >
            {isMounted && isLight ? <Sun className="size-3.5 @[640px]:size-4" /> : <Moon className="size-3.5 @[640px]:size-4" />}
          </Button>

          {/* بخش پروفایل کاربری با HeroUI Dropdown رسمی */}
          {isLoggedIn ? (
            <Dropdown>
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center gap-1 p-0.5 pe-1.5 @[640px]:p-1 @[640px]:pe-2 rounded-full hover:bg-surface-secondary/60 transition-all cursor-pointer h-auto min-w-0"
                aria-label="حساب کاربری"
              >
                <Avatar size="sm" className="size-7 @[640px]:size-8 ring-2 ring-accent/30 rounded-full shadow-sm">
                  <Avatar.Image src={avatarUrl} alt={userName} />
                  <Avatar.Fallback className="bg-accent/20 text-accent font-bold text-[10px] @[640px]:text-xs rounded-full">
                    {userName.slice(0, 2)}
                  </Avatar.Fallback>
                </Avatar>
                <ChevronDown className="size-3 @[640px]:size-3.5 text-muted hidden @[640px]:block" />
              </Button>

              <Dropdown.Popover placement="bottom end" className="rounded-3xl bg-overlay/95 backdrop-blur-2xl border border-separator/50 shadow-2xl p-2 w-60">
                <Dropdown.Menu aria-label="منوی کاربری" className="text-right">
                  <Dropdown.Section>
                    <Dropdown.Item id="user-info" textValue={userName} className="p-3 rounded-2xl bg-surface-secondary/70 border border-separator/40 flex flex-col gap-1 cursor-default pointer-events-none mb-1">
                      <Label className="text-xs font-black text-foreground truncate">
                        {userName}
                      </Label>
                      <Description className="text-[10px] text-accent font-bold flex items-center gap-1">
                        <ShieldCheck className="size-3" />
                        {userRole}
                      </Description>
                    </Dropdown.Item>
                  </Dropdown.Section>

                  <Dropdown.Item id="dashboard" textValue="داشبورد یادگیری من" className="rounded-xl py-2 px-2.5 text-xs font-medium">
                    <User className="size-3.5 text-accent" />
                    <Label>داشبورد یادگیری من</Label>
                  </Dropdown.Item>

                  <Dropdown.Item id="awards" textValue="گواهینامه‌ها و دستاوردها" className="rounded-xl py-2 px-2.5 text-xs font-medium">
                    <Award className="size-3.5 text-warning" />
                    <Label>گواهینامه‌ها و دستاوردها</Label>
                  </Dropdown.Item>

                  <Dropdown.Item id="settings" textValue="تنظیمات حساب" className="rounded-xl py-2 px-2.5 text-xs font-medium">
                    <Settings className="size-3.5 text-muted" />
                    <Label>تنظیمات حساب</Label>
                  </Dropdown.Item>

                  <Dropdown.Item id="logout" textValue="خروج از حساب" variant="danger" className="rounded-xl py-2 px-2.5 text-xs font-bold text-danger">
                    <LogOut className="size-3.5" />
                    <Label>خروج از حساب</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          ) : (
            <Button
              variant="primary"
              size="sm"
              className="h-[34px] px-3.5 @[640px]:h-10 @[640px]:px-5 rounded-full font-bold text-[11px] @[640px]:text-xs shadow-md shadow-accent/20 flex items-center justify-center"
            >
              <span>ورود / ثبت‌نام</span>
            </Button>
          )}

          {/* دکمه منوی موبایل کپسولی با HeroUI Button */}
          <Button
            variant="outline"
            size="sm"
            isIconOnly
            className="@[768px]:hidden size-[34px] min-w-[34px] @[640px]:size-10 @[640px]:min-w-10 rounded-full border-separator"
            aria-label="منوی اصلی"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="size-3.5 @[640px]:size-4" /> : <Menu className="size-3.5 @[640px]:size-4" />}
          </Button>
        </div>
      </header>

      {/* ۲. منوی کشویی موبایل */}
      {isMobileMenuOpen && (
        <div className="@[768px]:hidden w-full max-w-6xl mt-2.5 p-4 rounded-3xl bg-overlay/95 backdrop-blur-3xl backdrop-saturate-150 border border-separator/60 shadow-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = activeNavItem === item.id;
              const Icon = item.icon;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center justify-between p-3 rounded-2xl text-xs transition-colors ${
                    isActive
                      ? "text-foreground font-black bg-surface-secondary"
                      : "text-muted hover:text-foreground font-medium hover:bg-surface-secondary/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`size-4 ${isActive ? "text-foreground stroke-[2.5]" : "text-muted"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <CheckCircle2 className="size-3.5 text-accent" />}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </div>
  );
}
