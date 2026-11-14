/**
 * Creates an element. Attributes are set with setAttribute.
 * Text is set with textContent only; it is never parsed as HTML.
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
      // A text node holds plain text: the string is never parsed as HTML.
      const text = document.createTextNode("");
      text.textContent = child;
      node.append(text);
    } else {
      node.append(child);
    }
  }
  return node;
}
