"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import {
  SandboxComponent,
  ComponentCategory,
  ViewportMode,
  CanvasBackground,
  BrandPreset,
} from "./sandbox-types";
import { sandboxRegistry, getComponentById } from "./sandbox-registry";

interface SandboxContextType {
  // Component Selection
  selectedId: string;
  selectedComponent: SandboxComponent;
  setSelectedId: (id: string) => void;

  // Dynamic Props
  componentProps: Record<string, any>;
  updateProp: (key: string, value: any) => void;
  resetProps: () => void;
  applyPreset: (props: Record<string, any>) => void;

  // Viewport & Canvas
  viewportMode: ViewportMode;
  setViewportMode: (mode: ViewportMode) => void;
  customWidth: number;
  setCustomWidth: (w: number) => void;
  zoom: number;
  setZoom: (z: number) => void;
  canvasBg: CanvasBackground;
  setCanvasBg: (bg: CanvasBackground) => void;
  isRTL: boolean;
  setIsRTL: (rtl: boolean) => void;
  refreshKey: number;
  refreshCanvas: () => void;

  // Theming & Brand
  brandPreset: BrandPreset;
  setBrandPreset: (brand: BrandPreset) => void;

  // Inspect Drawer & Interactive Figma Inspector
  isInspectOpen: boolean;
  setIsInspectOpen: (open: boolean) => void;
  toggleInspect: () => void;
  isInteractiveInspectActive: boolean;
  setIsInteractiveInspectActive: (active: boolean) => void;
  toggleInteractiveInspect: () => void;
  inspectTab: "code" | "props" | "deps";
  setInspectTab: (tab: "code" | "props" | "deps") => void;

  // Catalog Filter & Favorites
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeCategory: ComponentCategory;
  setActiveCategory: (cat: ComponentCategory) => void;
  favorites: string[];
  toggleFavorite: (id: string) => void;

  // Stats
  filteredComponents: SandboxComponent[];
  totalCount: number;
}

const SandboxContext = createContext<SandboxContextType | null>(null);

export function SandboxProvider({ children }: { children: React.ReactNode }) {
  // Default to floating-header or first component
  const [selectedId, setSelectedIdState] = useState<string>("floating-header");
  const selectedComponent = useMemo(
    () => getComponentById(selectedId) || sandboxRegistry[0],
    [selectedId],
  );

  // Dynamic Props state initialized from component defaultProps
  const [componentProps, setComponentProps] = useState<Record<string, any>>(() => {
    return selectedComponent?.defaultProps || {};
  });

  // When selected component changes, reset props to its defaults
  const setSelectedId = useCallback((id: string) => {
    const target = getComponentById(id);
    setSelectedIdState(id);
    if (target) {
      setComponentProps(target.defaultProps || {});
      if (target.defaultViewport) {
        setViewportMode(target.defaultViewport);
      }
    }
  }, []);

  const updateProp = useCallback((key: string, value: any) => {
    setComponentProps((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetProps = useCallback(() => {
    if (selectedComponent) {
      setComponentProps(selectedComponent.defaultProps || {});
    }
  }, [selectedComponent]);

  const applyPreset = useCallback((props: Record<string, any>) => {
    setComponentProps((prev) => ({ ...prev, ...props }));
  }, []);

  // Viewport
  const [viewportMode, setViewportMode] = useState<ViewportMode>("mobile");
  const [customWidth, setCustomWidth] = useState<number>(420);
  const [zoom, setZoom] = useState<number>(100);
  const [canvasBg, setCanvasBg] = useState<CanvasBackground>("grid");
  const [isRTL, setIsRTL] = useState<boolean>(true);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const refreshCanvas = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // Brand Preset
  const [brandPreset, setBrandPreset] = useState<BrandPreset>("default");

  // Inspect Drawer & Figma Interactive Inspector
  const [isInspectOpen, setIsInspectOpen] = useState<boolean>(true);
  const toggleInspect = useCallback(() => {
    setIsInspectOpen((v) => !v);
  }, []);
  const [isInteractiveInspectActive, setIsInteractiveInspectActive] = useState<boolean>(false);
  const toggleInteractiveInspect = useCallback(() => {
    setIsInteractiveInspectActive((v) => !v);
  }, []);
  const [inspectTab, setInspectTab] = useState<"code" | "props" | "deps">("code");

  // Filter & Favorites
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeCategory, setActiveCategory] = useState<ComponentCategory>("all");
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("heroui_sandbox_favs");
        return saved ? JSON.parse(saved) : ["floating-header"];
      } catch {
        return ["floating-header"];
      }
    }
    return ["floating-header"];
  });

  const toggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("heroui_sandbox_favs", JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  // Filtered components list
  const filteredComponents = useMemo(() => {
    return sandboxRegistry.filter((comp) => {
      const matchCategory =
        activeCategory === "all" || comp.category === activeCategory;
      const matchSearch =
        searchQuery.trim() === "" ||
        comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.persianName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.dependencies.some((dep) =>
          dep.toLowerCase().includes(searchQuery.toLowerCase()),
        );
      return matchCategory && matchSearch;
    });
  }, [activeCategory, searchQuery]);

  return (
    <SandboxContext.Provider
      value={{
        selectedId,
        selectedComponent,
        setSelectedId,
        componentProps,
        updateProp,
        resetProps,
        applyPreset,
        viewportMode,
        setViewportMode,
        customWidth,
        setCustomWidth,
        zoom,
        setZoom,
        canvasBg,
        setCanvasBg,
        isRTL,
        setIsRTL,
        refreshKey,
        refreshCanvas,
        brandPreset,
        setBrandPreset,
        isInspectOpen,
        setIsInspectOpen,
        toggleInspect,
        isInteractiveInspectActive,
        setIsInteractiveInspectActive,
        toggleInteractiveInspect,
        inspectTab,
        setInspectTab,
        searchQuery,
        setSearchQuery,
        activeCategory,
        setActiveCategory,
        favorites,
        toggleFavorite,
        filteredComponents,
        totalCount: sandboxRegistry.length,
      }}
    >
      {children}
    </SandboxContext.Provider>
  );
}

export function useSandbox() {
  const context = useContext(SandboxContext);
  if (!context) {
    throw new Error("useSandbox must be used within a SandboxProvider");
  }
  return context;
}
