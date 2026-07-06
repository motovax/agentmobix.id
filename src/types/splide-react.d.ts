declare module "@splidejs/react-splide" {
  import type { Options, Splide as SplideCore } from "@splidejs/splide";
  import type {
    Component,
    HTMLAttributes,
    LiHTMLAttributes,
    ReactNode,
  } from "react";

  export interface SplideProps extends HTMLAttributes<HTMLElement> {
    children?: ReactNode;
    extensions?: Record<string, unknown>;
    hasTrack?: boolean;
    options?: Options;
    tag?: "div" | "section" | "header" | "footer" | "nav";
    transition?: unknown;
    onClick?: (
      splide: SplideCore,
      slide: unknown,
      event: MouseEvent,
    ) => void;
    onMoved?: (
      splide: SplideCore,
      index: number,
      prev: number,
      dest: number,
    ) => void;
  }

  export class Splide extends Component<SplideProps> {
    splide: SplideCore | undefined;
    go(control: number | string): void;
    sync(splide: SplideCore): void;
  }

  export const SplideSlide: (props: LiHTMLAttributes<HTMLLIElement>) => ReactNode;
}

declare module "@splidejs/react-splide/css/core";
