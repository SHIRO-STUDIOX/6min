import { SVGProps } from "react";

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export * from "./grammar";
export * from "./dictation";
export * from "./pronunciation";
export * from "./completion";
