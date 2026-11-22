import { TEXTS } from "../../logic/texts.js";
import { ghostIconArt, ICON_BOX } from "./art/icons.js";
import { createBestiary } from "./bestiary.js";
import { el, setText } from "./dom.js";
import type { HudView } from "./model/hudView.js";
import { createSvgRoot, mountShape } from "./svg.js";

export interface HudHandlers {
  /** The Live_Plaque was submitted (button or Enter); `url` is the field text as typed. */
  onSubmit(url: string): void;
  onShowSample(): void;
}

export interface Hud {
  header: HTMLElement;
  aside: HTMLElement;
  /** The Scenic_Announcer: a visually hidden polite live region, separate from the Status_Region. */
  announcer: HTMLElement;
  footer: HTMLElement;
  /** Changes only text, `hidden`, `disabled` and the content of lists. Never replaces the URL field. */
  update(view: HudView): void;
}

/** One tiny decorative SVG: a Candle flame (exorcised) or a Spectral Wisp head (haunted). */
function ghostIcon(state: "haunted" | "exorcised"): SVGSVGElement {
  const svg = createSvgRoot(
    { x: 0, y: 0, w: ICON_BOX, h: ICON_BOX },
    "ghost-icon",
  );
  svg.setAttribute("data-icon-state", state);
  svg.append(mountShape(ghostIconArt(state), `icon-${state}-`));
  return svg;
}

/** Builds the HUD once (Requirements 4.1, 4.2, 4.5 to 4.11, 4.13 to 4.16). */
export function createHud(handlers: HudHandlers): Hud {
  const logo = el("h1", { class: "hud-logo" });
  const tagline = el("p", { class: "hud-tagline" });
  const meterLine = el("p", { class: "meter-line" });
  const meterFill = el("div", { class: "meter-fill" });
  const meter = el("div", { class: "haunt-meter" }, [
    meterLine,
    el("div", { class: "meter-track", "aria-hidden": "true" }, [meterFill]),
  ]);
  const icons = el("div", { class: "ghost-icons", "aria-hidden": "true" });
  const simpleLink = el("a", { class: "view-link", href: "?view=simple" }, [
    TEXTS.viewLinks.simple,
  ]);
  const header = el("header", { class: "hud-top" }, [
    logo,
    tagline,
    meter,
    icons,
    simpleLink,
  ]);

  // The form and the field are built once and never replaced, so the typed
  // URL survives every render (Requirement 4.9).
  const input = el("input", {
    id: "live-url",
    name: "url",
    type: "text",
    inputmode: "url",
    autocomplete: "url",
    spellcheck: "false",
  });
  const submit = el("button", { type: "submit" }, [
    TEXTS.actionLabels["submit-live"],
  ]);
  // noValidate: a blank or odd URL goes to Core, which answers with its own message.
  const plaque = el("form", { class: "live-plaque", novalidate: "" }, [
    el("div", { class: "field" }, [
      el("label", { for: "live-url" }, [TEXTS.formLabel]),
      input,
    ]),
    submit,
  ]);
  plaque.addEventListener("submit", (event) => {
    event.preventDefault();
    handlers.onSubmit(input.value);
  });
  const status = el("p", {
    class: "status",
    role: "status",
    "aria-live": "polite",
  });
  const showSample = el("button", { type: "button", class: "show-sample" }, [
    TEXTS.actionLabels["show-sample"],
  ]);
  showSample.addEventListener("click", () => handlers.onShowSample());
  const powerLine = el("p", { class: "power-line" });
  const warnings = el("div", { class: "report-warnings" });
  const aside = el("aside", { class: "hud-side" }, [
    plaque,
    status,
    showSample,
    powerLine,
    warnings,
    createBestiary().element,
  ]);

  const announcer = el("p", { class: "announcer", "aria-live": "polite" });

  const copyright = el("span", { class: "copyright" });
  const licenceLink = el("a");
  const licence = el("p", { class: "licence" }, [copyright, " ", licenceLink]);
  const footer = el("footer", { class: "hud-foot" }, [licence]);

  let iconSignature = "";

  return {
    header,
    aside,
    announcer,
    footer,
    update(view: HudView): void {
      setText(logo, view.logo);
      setText(tagline, view.tagline);

      meter.hidden = view.meter === null;
      if (view.meter !== null) {
        setText(meterLine, view.meter.line);
        // After a Return_Glow the bar starts at the old share and moves (12.6).
        meterFill.classList.remove("is-moving");
        if (view.meter.from !== null) {
          meterFill.style.transform = view.meter.from;
          void meterFill.getBoundingClientRect();
          meterFill.classList.add("is-moving");
        }
        meterFill.style.transform = view.meter.scale;
      }

      const signature = view.icons.join(",");
      if (signature !== iconSignature) {
        iconSignature = signature;
        icons.replaceChildren(...view.icons.map((state) => ghostIcon(state)));
      }

      plaque.hidden = !view.plaque.visible;
      submit.disabled = !view.plaque.submitEnabled;
      setText(status, view.statusText);
      showSample.hidden = !view.showSample;

      powerLine.hidden = view.powerLine === null;
      setText(powerLine, view.powerLine ?? "");

      warnings.hidden = view.warnings === null;
      warnings.replaceChildren(
        ...(view.warnings === null
          ? []
          : [
              ...view.warnings.lines.map((line) => el("p", {}, [line])),
              ...(view.warnings.skippedTitle === null
                ? []
                : [
                    el("p", {}, [view.warnings.skippedTitle]),
                    el(
                      "ul",
                      {},
                      view.warnings.skipped.map((file) =>
                        el("li", {}, [
                          el("code", {}, [file.path]),
                          ` (${file.reason})`,
                        ]),
                      ),
                    ),
                  ]),
            ]),
      );

      licence.hidden = view.licence === null;
      if (view.licence !== null) {
        setText(copyright, view.licence.copyright);
        setText(licenceLink, view.licence.linkText);
        // The address is relative, so it works under the Vite base path.
        if (licenceLink.getAttribute("href") !== view.licence.href) {
          licenceLink.setAttribute("href", view.licence.href);
        }
      }
    },
  };
}
