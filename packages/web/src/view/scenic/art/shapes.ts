/** The SVG namespace: every scenic SVG element is created in it. */
export const SVG_NS = "http://www.w3.org/2000/svg";

// prettier-ignore
export type ShapeKind = "g" | "path" | "rect" | "circle" | "ellipse" | "polygon"
  | "polyline" | "line" | "defs" | "linearGradient" | "radialGradient" | "stop"
  | "clipPath" | "image";

/**
 * A same-site path such as "/haunted-repo/assets/house-scene-abc.svg": it
 * starts with one "/", has no scheme, no "//", no "..", no query and no quote.
 * The only address Shape_Data may hold, and only on an `image`.
 */
const SAME_SITE_HREF =
  /^\/(?!\/)(?:[\w-]+(?:\.[\w-]+)*\/)*[\w-]+(?:\.[\w-]+)+$/;

export function isSameSiteHref(href: string): boolean {
  return SAME_SITE_HREF.test(href);
}

/** The only paint values Shape_Data may hold; real colours come from CSS classes. */
export type Keyword = "transparent" | "currentColor" | "none" | "inherit";

/**
 * One SVG element as plain data (Shape_Data). No field can hold a colour,
 * text or an event handler. The only address is `href` on an `image`, and it
 * must pass `isSameSiteHref` (the built URL of a local asset).
 */
// prettier-ignore
export interface ShapeNode {
  kind: ShapeKind;
  cls?: string; // class names: /^[a-z][a-z0-9-]*( [a-z][a-z0-9-]*)*$/
  id?: string; // only on defs children (gradients, clip paths); prefixed at mount
  part?: string; // semantic part for tests, written as data-part
  d?: string; // path data: /^[MmLlHhVvCcSsQqTtAaZz0-9.,\s-]+$/ only
  points?: readonly number[];
  x?: number; y?: number; width?: number; height?: number; rx?: number; ry?: number;
  cx?: number; cy?: number; r?: number; fx?: number; fy?: number;
  x1?: number; y1?: number; x2?: number; y2?: number; offset?: number;
  transform?: { translate?: readonly [number, number]; rotate?: number; scale?: number };
  units?: "userSpaceOnUse" | "objectBoundingBox"; // gradients
  paint?: string; // id of a gradient in the same tree, written as fill="url(#...)"
  clip?: string; // id of a clipPath in the same tree
  href?: string; // image only: a same-site path (isSameSiteHref)
  fill?: Keyword;
  stroke?: Keyword;
  children?: readonly ShapeNode[];
}

/** Optional fields a builder adds to the node it makes. */
export type Extra = Partial<Omit<ShapeNode, "kind">>;

export function g(
  cls: string,
  children: readonly ShapeNode[],
  extra: Extra = {},
): ShapeNode {
  return { kind: "g", cls, children, ...extra };
}

export function path(cls: string, d: string, extra: Extra = {}): ShapeNode {
  return { kind: "path", cls, d, ...extra };
}

/** A path drawn only by its stroke (beams, threads, rim light). */
export function strokePath(
  cls: string,
  d: string,
  extra: Extra = {},
): ShapeNode {
  return path(cls, d, { fill: "none", ...extra });
}

export function rect(
  cls: string,
  x: number,
  y: number,
  width: number,
  height: number,
  extra: Extra = {},
): ShapeNode {
  return { kind: "rect", cls, x, y, width, height, ...extra };
}

export function circle(
  cls: string,
  cx: number,
  cy: number,
  r: number,
  extra: Extra = {},
): ShapeNode {
  return { kind: "circle", cls, cx, cy, r, ...extra };
}

export function ellipse(
  cls: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  extra: Extra = {},
): ShapeNode {
  return { kind: "ellipse", cls, cx, cy, rx, ry, ...extra };
}

/** A closed polygon from flat x, y pairs. */
export function poly(
  cls: string,
  points: readonly number[],
  extra: Extra = {},
): ShapeNode {
  return { kind: "polygon", cls, points, ...extra };
}

/** A gradient with its stops; each stop gets its colour from its CSS class. */
export function gradient(
  kind: "linearGradient" | "radialGradient",
  id: string,
  stops: readonly (readonly [cls: string, offset: number])[],
  extra: Extra = {},
): ShapeNode {
  const children = stops.map(([cls, offset]): ShapeNode => ({
    kind: "stop",
    cls,
    offset,
  }));
  return { kind, id, children, ...extra };
}

/** A picture file shown in the box; `href` is a same-site path. */
export function image(
  cls: string,
  href: string,
  x: number,
  y: number,
  width: number,
  height: number,
): ShapeNode {
  return { kind: "image", cls, href, x, y, width, height };
}

export function defs(children: readonly ShapeNode[]): ShapeNode {
  return { kind: "defs", children };
}

/** A pointed (gothic) arch from its foot line, centre, half width and height. */
export function arch(
  cx: number,
  foot: number,
  half: number,
  h: number,
): string {
  const spring = foot - h + half * 1.6;
  const top = foot - h;
  return `M${cx - half} ${foot} V${spring} Q${cx - half} ${top + half * 0.6} ${cx} ${top} Q${cx + half} ${top + half * 0.6} ${cx + half} ${spring} V${foot} Z`;
}
