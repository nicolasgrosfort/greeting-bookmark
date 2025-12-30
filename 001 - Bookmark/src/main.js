import opentype from "opentype.js";
import paper from "paper";
import camBamStickyUrl from "./fonts/jet-brains-mono-thin.ttf";

// --- Bookmark setup (mm-like units in viewBox)
const BOOKMARK = { w: 50, h: 200 };
const MARGIN = 0;

// --- Style
const STROKE_COLOR = "#252525";
const BG_COLOR = "#f5f5f5";
const FONT_SIZE = 3; // in viewBox units
const STROKE_WIDTH = 0.32; // in viewBox units
const LINE_FACTOR = 1.2; // line height multiplier

// --- 1) Create SVG host in DOM
let svgHost = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svgHost.setAttribute("id", "bookmark");
svgHost.setAttribute("width", `${BOOKMARK.w}mm`);
svgHost.setAttribute("height", `${BOOKMARK.h}mm`);
svgHost.setAttribute("viewBox", `0 0 ${BOOKMARK.w} ${BOOKMARK.h}`);
document.getElementById("app").appendChild(svgHost);

// --- 2) Paper "offscreen" setup (we export SVG at the end)
paper.setup(new paper.Size(BOOKMARK.w, BOOKMARK.h));

function setSVGAttributes(svgEl) {
  svgEl.setAttribute("id", "bookmark");
  svgEl.setAttribute("width", `${BOOKMARK.w}mm`);
  svgEl.setAttribute("height", `${BOOKMARK.h}mm`);
  svgEl.setAttribute("viewBox", `0 0 ${BOOKMARK.w} ${BOOKMARK.h}`);
}

// --- 3) Fake code generator (about ~30 lines)
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function choice(arr) {
  return arr[randInt(0, arr.length - 1)];
}
function ident() {
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
  return Math.random() < 0.4 ? choice(parts) + choice(suffix) : choice(parts);
}
function stringLit() {
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
  return `"${choice(words)}-${randInt(1, 99)}"`;
}
function numberLit() {
  return String(randInt(0, 999));
}

function makeCodeLine(i) {
  const templates = [
    () => `const ${ident()} = ${numberLit()};`,
    () => `let ${ident()} = ${stringLit()};`,
    () => `function ${ident()}(${ident()}) { return ${ident()}; }`,
    () => `if (${ident()} > ${numberLit()}) { ${ident()}++; }`,
    () => `for (let i = 0; i < ${randInt(3, 12)}; i++) { ${ident()}.push(i); }`,
    () => `console.log(${ident()}, ${stringLit()});`,
    () => `export const ${ident()} = (${ident()}) => ${ident()};`,
    () =>
      `${ident()}.${choice([
        "add",
        "set",
        "get",
        "map",
        "filter",
      ])}(${ident()});`,
    () =>
      `// ${choice(["TODO", "FIXME", "NOTE"])}: ${choice([
        "cleanup",
        "optimize",
        "refactor",
        "edge case",
      ])} ${i}`,
  ];
  return templates[randInt(0, templates.length - 1)]();
}

function generateFakeCode(lineCount = 30) {
  const lines = [];
  for (let i = 1; i <= lineCount; i++) lines.push(makeCodeLine(i));
  return lines;
}

// --- 4) Convert OpenType path data -> Paper item (stroke only)
function importStrokePath(d) {
  const mini = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`;
  const imported = paper.project.importSVG(mini);
  const item = imported.className === "Group" ? imported.children[0] : imported;

  item.fillColor = "black";
  item.strokeColor = null;
  item.strokeWidth = null;
  item.strokeCap = "round";
  item.strokeJoin = "round";

  return item;
}

// --- 5) Render lines using OpenType baseline metrics
function renderCode(font, lines) {
  paper.project.clear();

  // Background (optional)
  const bg = new paper.Path.Rectangle(
    new paper.Rectangle(0, 0, BOOKMARK.w, BOOKMARK.h)
  );
  bg.fillColor = BG_COLOR;
  bg.strokeColor = null;

  const lineHeight =
    ((font.ascender - font.descender) / font.unitsPerEm) *
    FONT_SIZE *
    LINE_FACTOR;

  // Baseline start (top margin + ascender)
  let y = MARGIN + (font.ascender / font.unitsPerEm) * FONT_SIZE;

  for (const line of lines) {
    const x = MARGIN;

    // OpenType gives us a single outline path for the whole line
    const otPath = font.getPath(line, x, y, FONT_SIZE, { kerning: true });
    const d = otPath.toPathData(2);

    importStrokePath(d);

    y += lineHeight;
    if (y > BOOKMARK.h - MARGIN) break; // stop if we overflow bookmark
  }

  paper.view.update();
}

// --- 6) Export SVG to DOM
function exportToDOM() {
  const exported = paper.project.exportSVG({ asString: false, precision: 3 });
  setSVGAttributes(exported);

  svgHost.replaceWith(exported);
  svgHost = exported;
}

// --- 7) Load font once + run
opentype.load(camBamStickyUrl, (err, font) => {
  if (err) return console.error(err);

  const lines = ['tekh.log("hny-26").refine()', ...generateFakeCode(56)];
  renderCode(font, lines);
  exportToDOM();
});
