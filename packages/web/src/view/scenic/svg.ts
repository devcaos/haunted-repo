import { SVG_NS, isSameSiteHref, type ShapeNode } from "./art/shapes.js";
import type { Rect } from "./model/sceneLayout.js";

// prettier-ignore
const NUMBER_FIELDS = [
  "x", "y", "width", "height", "rx", "ry", "cx", "cy", "r", "fx", "fy",
  "x1", "y1", "x2", "y2", "offset",
] as const;

/**
 * The only place that creates an `<svg>`. It is decoration: screen readers
 * skip it and it never takes the keyboard focus (Requirements 17.1, 17.2).
 */
export function createSvgRoot(viewBox: Rect, className: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute(
    "viewBox",
    `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`,
  );
  svg.setAttribute("class", className);
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  return svg;
}

function transformText(t: NonNullable<ShapeNode["transform"]>): string {
  const parts: string[] = [];
  if (t.translate !== undefined) {
    parts.push(`translate(${t.translate[0]} ${t.translate[1]})`);
  }
  if (t.rotate !== undefined) parts.push(`rotate(${t.rotate})`);
  if (t.scale !== undefined) parts.push(`scale(${t.scale})`);
  return parts.join(" ");
}

/**
 * Builds the DOM of a Shape_Data tree with `createElementNS`, one element per
 * node. Attributes come only from numbers, keywords and class names; no markup
 * is ever parsed (Requirements 22.2, 22.3). The one address, `href` of an
 * `image`, is set only when it is a same-site path; the browser loads that
 * file as a picture, so its markup never reaches the DOM. Ids and the `url(#...)` references
 * to them get `idPrefix`, so several SVGs on one page never share an id.
 */
export function mountShape(node: ShapeNode, idPrefix: string): SVGElement {
  const element = document.createElementNS(SVG_NS, node.kind);
  const set = (name: string, value: string | number | undefined): void => {
    if (value !== undefined) element.setAttribute(name, String(value));
  };
  const ref = (id: string | undefined): string | undefined =>
    id === undefined ? undefined : `url(#${idPrefix}${id})`;
  set("class", node.cls);
  set("id", node.id === undefined ? undefined : `${idPrefix}${node.id}`);
  set("data-part", node.part);
  set("d", node.d);
  set("points", node.points?.join(" "));
  for (const name of NUMBER_FIELDS) set(name, node[name]);
  set("transform", node.transform && transformText(node.transform));
  set("gradientUnits", node.units);
  set("fill", ref(node.paint) ?? node.fill);
  set("clip-path", ref(node.clip));
  set("stroke", node.stroke);
  if (
    node.kind === "image" &&
    node.href !== undefined &&
    isSameSiteHref(node.href)
  ) {
    set("href", node.href);
  }
  for (const child of node.children ?? []) {
    element.append(mountShape(child, idPrefix));
  }
  return element;
}
