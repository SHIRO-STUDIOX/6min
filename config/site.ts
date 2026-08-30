export type SiteConfig = typeof siteConfig;

export const siteConfig = {
  name: "۶دقیقه - یادگیری فشرده با HeroUI v3",
  description: "سامانه آموزش فشرده روزانه بر پایه Next.js 16، HeroUI v3 و فونت ایران‌یکان X متغیر",
  navItems: [
    {
      label: "خانه",
      href: "/",
    },
    {
      label: "استودیو سندباکس (UI Sandbox)",
      href: "/sandbox",
    },
  ],
  navMenuItems: [
    {
      label: "خانه",
      href: "/",
    },
    {
      label: "استودیو سندباکس",
      href: "/sandbox",
    },
  ],
  links: {
    github: "https://github.com/heroui-inc/heroui",
    docs: "https://heroui.com",
  },
};
