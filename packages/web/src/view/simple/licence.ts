import type { LicenceView } from "../../logic/viewModel.js";
import { el } from "./dom.js";

/** The Licence_Notice: the copyright line of sirv and a link to its MIT licence. */
export function renderLicence(licence: LicenceView): HTMLElement {
  // The href is relative, so it works under the Vite base path on GitHub Pages.
  return el("p", { class: "licence" }, [
    licence.copyright,
    " ",
    el("a", { href: licence.href }, [licence.linkText]),
  ]);
}
