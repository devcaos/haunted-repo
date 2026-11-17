/**
 * Creates an HTML element. Attributes are set with setAttribute.
 * Text is set with a text node only; it is never parsed as HTML.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    node.setAttribute(name, value);
  }
  for (const child of children) {
    if (typeof child === "string") {
      const text = document.createTextNode("");
      text.textContent = child;
      node.append(text);
    } else {
      node.append(child);
    }
  }
  return node;
}

/** Sets the text of a node only when it changed, so a live region is not re-announced for nothing. */
export function setText(node: HTMLElement, text: string): void {
  if (node.textContent !== text) node.textContent = text;
}
