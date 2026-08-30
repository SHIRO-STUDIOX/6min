import React from "react";

export type ComponentCategory =
  | "all"
  | "atoms"
  | "molecules"
  | "organisms"
  | "bento"
  | "heroui";

export type ViewportMode = "mobile" | "tablet" | "desktop" | "full" | "custom";

export type CanvasBackground = "grid" | "dots" | "blueprint" | "clean" | "contrast";

export type BrandPreset =
  | "default"
  | "emerald"
  | "indigo"
  | "violet"
  | "amber"
  | "rose"
  | "cyan";

export interface ViewportSize {
  name: string;
  width: number | string;
  height: number | string;
  label: string;
}

export type PropControlCategory = "appearance" | "state" | "content" | "behavior";

export interface PropOption {
  label: string;
  value: string | number | boolean;
}

export interface PropDefinition {
  name: string;
  label: string;
  type: "boolean" | "string" | "number" | "select" | "radio";
  options?: PropOption[];
  defaultValue: any;
  description?: string;
  category?: PropControlCategory;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface ComponentPreset {
  name: string;
  label: string;
  props: Record<string, any>;
}

export interface SandboxComponent {
  id: string;
  name: string;
  persianName: string;
  category: "atoms" | "molecules" | "organisms" | "bento" | "heroui";
  description: string;
  filePath: string;
  dependencies: string[];
  defaultProps: Record<string, any>;
  propDefinitions: PropDefinition[];
  presets?: ComponentPreset[];
  render: (props: Record<string, any>) => React.ReactNode;
  getCodeSnippet?: (props: Record<string, any>) => string;
  defaultViewport?: ViewportMode;
  isFavorite?: boolean;
  tags?: string[];
}
