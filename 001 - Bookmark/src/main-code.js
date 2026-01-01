import alea from "alea";
import opentype from "opentype.js";
import paper from "paper";
import { Pane } from "tweakpane";

import fontUrl from "./fonts/jet-brains-mono-thin.ttf";

// ------------------------------
// 0) Params (Tweakpane)
// ------------------------------
const PARAMS = {
  seed: "",

  // --- bookmark size (mm + viewBox units)
  bookmarkW: 48,
  bookmarkH: 164,

  // --- margins (independent)
  marginTop: 2,
  marginRight: 2,
  marginBottom: 18,
  marginLeft: 2,

  // --- text
  linesCount: 56,
  fontSize: 3,
  lineFactor: 1.2,

  // --- style
  bgColor: "#f5f5f5",
  fillColor: "#151515",

  // --- OpenType path precision (lower = lighter svg)
  pathPrecision: 2,

  // --- frame / clipping
  clipToFrame: true, // if false, no intersect
  showFrameDebug: false, // draw frame stroke for debug

  // --- optional debug
  debugMargins: false,
};

// random seed (readable)
function randomSeed(len = 14) {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  let s = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(len);
    crypto.getRandomValues(buf);
    for (let i = 0; i < len; i++) s += alphabet[buf[i] % alphabet.length];
  } else {
    for (let i = 0; i < len; i++)
      s += alphabet[(Math.random() * alphabet.length) | 0];
  }
  return s;
}
if (!PARAMS.seed) PARAMS.seed = randomSeed();

// ------------------------------
// 1) DOM: SVG host + Paper setup (offscreen canvas)
// ------------------------------
let svgHost = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svgHost.setAttribute("id", "bookmark");
document.getElementById("app").appendChild(svgHost);

// Paper needs a canvas; we keep it offscreen
const canvas = document.createElement("canvas");
paper.setup(canvas);

// Apply size to both SVG and Paper canvas/project
function applyBookmarkSize() {
  const W = PARAMS.bookmarkW;
  const H = PARAMS.bookmarkH;

  // Resize canvas and re-setup Paper (important)
  canvas.width = W;
  canvas.height = H;
  paper.setup(canvas);

  // Sync svg host
  svgHost.setAttribute("width", `${W}mm`);
  svgHost.setAttribute("height", `${H}mm`);
  svgHost.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svgHost.style.border = "1px solid #000";
}

// ------------------------------
// 2) Tweakpane UI
// ------------------------------
const pane = new Pane();

// Seed folder + buttons
const fSeed = pane.addFolder({ title: "Seed" });
const seedBinding = fSeed.addBinding(PARAMS, "seed");

fSeed.addButton({ title: "Generate" }).on("click", () => {
  PARAMS.seed = randomSeed();
  seedBinding.refresh();
  rerender();
});

fSeed.addButton({ title: "Copy SVG code" }).on("click", async () => {
  const svg = svgHost?.outerHTML ?? "";
  if (!svg) return;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(svg);
    } else {
      const ta = document.createElement("textarea");
      ta.value = svg;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    console.log("SVG copied");
  } catch (e) {
    console.error("Copy failed:", e);
  }
});

// Bookmark size folder
const fBookmark = pane.addFolder({ title: "Bookmark" });
fBookmark.addBinding(PARAMS, "bookmarkW", { min: 10, max: 200, step: 1 });
fBookmark.addBinding(PARAMS, "bookmarkH", { min: 10, max: 400, step: 1 });

// Margins folder (independent)
const fMargins = pane.addFolder({ title: "Margins" });
fMargins.addBinding(PARAMS, "marginTop", { min: 0, max: 80, step: 0.5 });
fMargins.addBinding(PARAMS, "marginRight", { min: 0, max: 80, step: 0.5 });
fMargins.addBinding(PARAMS, "marginBottom", { min: 0, max: 80, step: 0.5 });
fMargins.addBinding(PARAMS, "marginLeft", { min: 0, max: 80, step: 0.5 });

const fText = pane.addFolder({ title: "Text" });
fText.addBinding(PARAMS, "linesCount", { min: 1, max: 400, step: 1 });
fText.addBinding(PARAMS, "fontSize", { min: 1, max: 30, step: 0.1 });
fText.addBinding(PARAMS, "lineFactor", { min: 0.8, max: 2.5, step: 0.01 });
fText.addBinding(PARAMS, "pathPrecision", { min: 0, max: 4, step: 1 });

const fStyle = pane.addFolder({ title: "Style" });
fStyle.addBinding(PARAMS, "bgColor");
fStyle.addBinding(PARAMS, "fillColor");

const fFrame = pane.addFolder({ title: "Frame / Clip" });
fFrame.addBinding(PARAMS, "clipToFrame");
fFrame.addBinding(PARAMS, "showFrameDebug");

const fDebug = pane.addFolder({ title: "Debug" });
fDebug.addBinding(PARAMS, "debugMargins");

// rerender on any tweakpane change
pane.on("change", () => rerender());

// ------------------------------
// 3) Fake code generator (seeded)
// ------------------------------
function seededRandInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}
function seededChoice(rng, arr) {
  return arr[seededRandInt(rng, 0, arr.length - 1)];
}

function makeCodeLine(rng, i) {
  const parts = [
    "user",
    "room",
    "token",
    "state",
    "node",
    "view",
    "data",
    "rect",
    "path",
    "font",
    "line",
    "clip",
  ];
  const suffix = [
    "Id",
    "Map",
    "List",
    "Cfg",
    "Ref",
    "Count",
    "Index",
    "Value",
    "State",
  ];
  const ident = () =>
    rng() < 0.4
      ? seededChoice(rng, parts) + seededChoice(rng, suffix)
      : seededChoice(rng, parts);

  const words = [
    "hello",
    "bookmark",
    "paper",
    "opentype",
    "svg",
    "render",
    "stroke",
    "path",
  ];
  const stringLit = () =>
    `"${seededChoice(rng, words)}-${seededRandInt(rng, 1, 99)}"`;
  const numberLit = () => String(seededRandInt(rng, 0, 999));

  const templates = [
    () => `const ${ident()} = ${numberLit()};`,
    () => `let ${ident()} = ${stringLit()};`,
    () => `function ${ident()}(${ident()}) { return ${ident()}; }`,
    () => `if (${ident()} > ${numberLit()}) { ${ident()}++; }`,
    () =>
      `for (let i = 0; i < ${seededRandInt(
        rng,
        3,
        12
      )}; i++) { ${ident()}.push(i); }`,
    () => `console.log(${ident()}, ${stringLit()});`,
    () => `export const ${ident()} = (${ident()}) => ${ident()};`,
    () =>
      `${ident()}.${seededChoice(rng, [
        "add",
        "set",
        "get",
        "map",
        "filter",
      ])}(${ident()});`,
    () =>
      `// ${seededChoice(rng, ["TODO", "FIXME", "NOTE"])}: ${seededChoice(rng, [
        "cleanup",
        "optimize",
        "refactor",
        "edge case",
      ])} ${i}`,
  ];

  return templates[seededRandInt(rng, 0, templates.length - 1)]();
}

function generateFakeCode(seed, lineCount = 30) {
  const rng = alea(seed); // stable generation
  const lines = [];
  for (let i = 1; i <= lineCount; i++) lines.push(makeCodeLine(rng, i));
  return lines;
}

// ------------------------------
// 4) OpenType -> Paper import
// ------------------------------
function importFillPath(d) {
  const mini = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`;
  const imported = paper.project.importSVG(mini);
  const item = imported.className === "Group" ? imported.children[0] : imported;

  item.fillColor = PARAMS.fillColor;
  item.strokeColor = null;
  item.strokeWidth = null;

  return item;
}

// ------------------------------
// 5) Render + Export
// ------------------------------
function setSVGAttributes(svgEl) {
  svgEl.setAttribute("id", "bookmark");
  svgEl.setAttribute("width", `${PARAMS.bookmarkW}mm`);
  svgEl.setAttribute("height", `${PARAMS.bookmarkH}mm`);
  svgEl.setAttribute("viewBox", `0 0 ${PARAMS.bookmarkW} ${PARAMS.bookmarkH}`);
}

function renderCode(font, lines) {
  paper.project.clear();

  const W = PARAMS.bookmarkW;
  const H = PARAMS.bookmarkH;

  const {
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    fontSize,
    lineFactor,
  } = PARAMS;

  // Background
  const bg = new paper.Path.Rectangle(new paper.Rectangle(0, 0, W, H));
  bg.fillColor = PARAMS.bgColor;
  bg.strokeColor = null;

  // Frame (the "safe" drawing region)
  const frame = new paper.Path.Rectangle({
    point: [marginLeft, marginTop],
    size: [W - marginLeft - marginRight, H - marginTop - marginBottom],
    strokeColor: PARAMS.showFrameDebug ? "#ff00ff" : null,
    dashArray: PARAMS.showFrameDebug ? [2, 2] : null,
    fillColor: null,
  });

  const lineHeight =
    ((font.ascender - font.descender) / font.unitsPerEm) *
    fontSize *
    lineFactor;

  // baseline start
  let y = marginTop + (font.ascender / font.unitsPerEm) * fontSize;

  // We'll collect all glyph paths into a group so we can intersect once
  const glyphGroup = new paper.Group();

  for (const line of lines) {
    const x = marginLeft;

    const otPath = font.getPath(line, x, y, fontSize, { kerning: true });
    const d = otPath.toPathData(PARAMS.pathPrecision);
    const glyphItem = importFillPath(d);
    glyphGroup.addChild(glyphItem);

    y += lineHeight;

    // stop if we overflow bottom (taking descenders into account)
    const yBottom = y + (font.descender / font.unitsPerEm) * fontSize;
    if (yBottom > H - marginBottom) break;
  }

  // Unite all glyph shapes (so intersect is clean)
  // NOTE: unite() returns a new Path/CompoundPath
  let textUnion = null;
  for (const child of glyphGroup.children.slice()) {
    if (!textUnion) {
      textUnion = child.clone();
    } else {
      const next = textUnion.unite(child);
      textUnion.remove();
      textUnion = next;
    }
    child.remove(); // remove originals
  }
  glyphGroup.remove();

  // If no text (edge case)
  if (!textUnion) {
    paper.view.update();
    return;
  }

  // Intersect with frame if enabled
  let finalShape = textUnion;
  if (PARAMS.clipToFrame) {
    const clipped = textUnion.intersect(frame);
    textUnion.remove();
    finalShape = clipped;
  }

  // Keep only final (and optionally keep debug frame)
  paper.project.activeLayer.removeChildren();

  if (PARAMS.showFrameDebug) {
    // keep frame visible for debug
    frame.strokeColor = "#ff00ff";
    frame.dashArray = [2, 2];
    paper.project.activeLayer.addChild(frame);
  } else {
    frame.remove();
  }

  finalShape.fillColor = PARAMS.fillColor;
  finalShape.strokeColor = null;
  paper.project.activeLayer.addChild(finalShape);

  paper.view.update();
}

function exportToDOM() {
  const exported = paper.project.exportSVG({ asString: false, precision: 3 });
  setSVGAttributes(exported);

  svgHost.replaceWith(exported);
  svgHost = exported;

  svgHost.style.border = "1px solid #000";
}

// ------------------------------
// 6) Load font once + rerender
// ------------------------------
let LOADED_FONT = null;

function rerender() {
  if (!LOADED_FONT) return;

  applyBookmarkSize();

  const lines = [
    `tekh.studio("hny-2026")`,
    `const seed = "${PARAMS.seed}"`,
    `const sketch = "001 - Bookmark"`,
    ...generateFakeCode(PARAMS.seed, PARAMS.linesCount),
  ];

  renderCode(LOADED_FONT, lines);
  exportToDOM();
}

opentype.load(fontUrl, (err, font) => {
  if (err) return console.error(err);
  LOADED_FONT = font;
  rerender();
});
