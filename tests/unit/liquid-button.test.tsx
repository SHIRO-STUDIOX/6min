// @vitest-environment jsdom
import React from "react";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { ButtonGroup } from "@heroui/react";
import { afterEach, beforeAll, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { LiquidButton } from "../../components/liquid-glass/liquid-button";
import { advanceGlassQuality, registerGlass, useGlassDiagnostics } from "../../components/liquid-glass/performance";

beforeAll(() => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  globalThis.ResizeObserver = class { observe() {} disconnect() {} unobserve() {} };
});
afterEach(cleanup);

it("keeps HeroUI semantics, ref, render props and press behavior", () => {
  const pressed = vi.fn();
  const ref = React.createRef<HTMLButtonElement>();
  render(<LiquidButton ref={ref} performance="full" onPress={pressed}>{({ isDisabled }) => isDisabled ? "off" : "Continue"}</LiquidButton>);
  const button = screen.getByRole("button", { name: "Continue" });
  expect(ref.current).toBe(button);
  expect(button.querySelector("[aria-hidden=true]")).not.toBeNull();
  fireEvent.click(button);
  expect(pressed).toHaveBeenCalledTimes(1);
});

it("inherits disabled state from HeroUI ButtonGroup", () => {
  const pressed = vi.fn();
  render(<ButtonGroup isDisabled><LiquidButton onPress={pressed}>Continue</LiquidButton></ButtonGroup>);
  const button = screen.getByRole("button", { name: "Continue" }) as HTMLButtonElement;
  expect(button.disabled).toBe(true);
  fireEvent.click(button);
  expect(pressed).not.toHaveBeenCalled();
});

it("removes the expensive SVG filter in lightweight mode", () => {
  const { rerender } = render(<LiquidButton performance="full">Continue</LiquidButton>);
  expect(document.querySelector("filter")).not.toBeNull();
  rerender(<LiquidButton performance="light">Continue</LiquidButton>);
  expect(document.querySelector("filter")).toBeNull();
  expect(screen.getByRole("button").getAttribute("data-liquid-quality")).toBe("light");
});

it("caps automatic quality when the visible surface budget is exceeded", () => {
  const element = document.createElement("div");
  vi.spyOn(element, "getBoundingClientRect").mockReturnValue({ width: 1000, height: 500 } as DOMRect);
  const { result } = renderHook(() => useGlassDiagnostics());
  let unregister = () => {};
  act(() => { unregister = registerGlass(element); });
  expect(result.current.quality).toBe("light");
  expect(result.current.reason).toBe("visible surface budget");
  act(() => unregister());
  expect(result.current.quality).toBe("balanced");
});

it("requires sustained slow frames to downgrade and a longer stable period to recover", () => {
  let state = advanceGlassQuality({ quality: "full", badWindows: 0, goodWindows: 0 }, 40);
  expect(state.quality).toBe("full");
  state = advanceGlassQuality(state, 40);
  expect(state.quality).toBe("balanced");
  for (let i = 0; i < 11; i++) state = advanceGlassQuality(state, 16);
  expect(state.quality).toBe("balanced");
  state = advanceGlassQuality(state, 16);
  expect(state.quality).toBe("full");
});
