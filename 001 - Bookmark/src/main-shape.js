import alea from "alea";
import paper from "paper";
import { createNoise2D } from "simplex-noise";
import { Pane } from "tweakpane";

const PARAMS = {
  seed: "",

  // --- bookmark size (mm + viewBox units)
  bookmarkW: 48,
  bookmarkH: 164,

  // --- margins
  marginTop: 2,
  marginRight: 2,
  marginBottom: 18,
  marginLeft: 2,

  // --- noise controls
  freq: 0.5,
  warp: 1,
  chSpread: 1000,
  angleMin: -180,
  angleMax: 180,

  // --- sizes
  circleMin: 10,
  circleMax: 30,
  rectSizeMin: 40,
  rectSizeMax: 50,
  smallRectSizeMin: 10,
  smallRectSizeMax: 15,
  triMin: 30,
  triMax: 40,

  // --- T values
  tCircle: 0,
  tRect: 50,
  tSmallRect: 100,
  tTriangle: 150,

  // --- union style
  unionFill: "#151515",
  unionStroke: "#151515",
};

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

// --- Tweakpane UI
const pane = new Pane();

// Seed folder + buttons
const fSeed = pane.addFolder({ title: "Seed" });
const seedBinding = fSeed.addBinding(PARAMS, "seed");

fSeed.addButton({ title: "Generate" }).on("click", () => {
  PARAMS.seed = randomSeed();
  seedBinding.refresh();
  render();
});

fSeed.addButton({ title: "Copy SVG code" }).on("click", async () => {
  try {
    const svg = svgHost?.outerHTML ?? "";
    if (!svg) return;

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
    console.log("SVG copied to clipboard");
  } catch (e) {
    console.error("Failed to copy SVG:", e);
  }
});

// Bookmark size folder
const fBookmark = pane.addFolder({ title: "Bookmark" });
fBookmark.addBinding(PARAMS, "bookmarkW", { min: 10, max: 200, step: 1 });
fBookmark.addBinding(PARAMS, "bookmarkH", { min: 10, max: 400, step: 1 });

const fMargins = pane.addFolder({ title: "Margins" });
fMargins.addBinding(PARAMS, "marginTop", { min: 0, max: 50, step: 0.5 });
fMargins.addBinding(PARAMS, "marginRight", { min: 0, max: 50, step: 0.5 });
fMargins.addBinding(PARAMS, "marginBottom", { min: 0, max: 80, step: 0.5 });
fMargins.addBinding(PARAMS, "marginLeft", { min: 0, max: 50, step: 0.5 });

const fNoise = pane.addFolder({ title: "Noise" });
fNoise.addBinding(PARAMS, "freq", { min: 0.01, max: 1.0, step: 0.01 });
fNoise.addBinding(PARAMS, "warp", { min: 0.0, max: 2.0, step: 0.01 });
fNoise.addBinding(PARAMS, "chSpread", { min: 10, max: 5000, step: 10 });

const fAngles = pane.addFolder({ title: "Angles" });
fAngles.addBinding(PARAMS, "angleMin", { min: -180, max: 0, step: 1 });
fAngles.addBinding(PARAMS, "angleMax", { min: 0, max: 180, step: 1 });

const fT = pane.addFolder({ title: "T (shape samples)" });
fT.addBinding(PARAMS, "tCircle", { min: 0, max: 500, step: 0.1 });
fT.addBinding(PARAMS, "tRect", { min: 0, max: 500, step: 0.1 });
fT.addBinding(PARAMS, "tSmallRect", { min: 0, max: 500, step: 0.1 });
fT.addBinding(PARAMS, "tTriangle", { min: 0, max: 500, step: 0.1 });

const fSizes = pane.addFolder({ title: "Sizes" });
fSizes.addBinding(PARAMS, "circleMin", { min: 1, max: 200, step: 1 });
fSizes.addBinding(PARAMS, "circleMax", { min: 1, max: 200, step: 1 });
fSizes.addBinding(PARAMS, "rectSizeMin", { min: 1, max: 200, step: 1 });
fSizes.addBinding(PARAMS, "rectSizeMax", { min: 1, max: 200, step: 1 });
fSizes.addBinding(PARAMS, "smallRectSizeMin", { min: 1, max: 200, step: 1 });
fSizes.addBinding(PARAMS, "smallRectSizeMax", { min: 1, max: 200, step: 1 });
fSizes.addBinding(PARAMS, "triMin", { min: 1, max: 200, step: 1 });
fSizes.addBinding(PARAMS, "triMax", { min: 1, max: 200, step: 1 });

const fStyle = pane.addFolder({ title: "Style" });
fStyle.addBinding(PARAMS, "unionFill");
fStyle.addBinding(PARAMS, "unionStroke");

// --- SVG host
let svgHost = document.createElementNS("http://www.w3.org/2000/svg", "svg");
document.getElementById("app").appendChild(svgHost);

// --- Paper offscreen canvas (we will resize it)
const canvas = document.createElement("canvas");
document.body.appendChild(canvas); // optional; can omit if you don't want it in DOM
paper.setup(canvas);

// --- helpers
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;

function applyBookmarkSize() {
  // sync canvas size (Paper works in px-like units; we use same units as viewBox)
  canvas.width = PARAMS.bookmarkW;
  canvas.height = PARAMS.bookmarkH;

  // IMPORTANT: re-setup Paper after resizing canvas
  paper.setup(canvas);

  // sync svg host attributes
  svgHost.setAttribute("width", `${PARAMS.bookmarkW}mm`);
  svgHost.setAttribute("height", `${PARAMS.bookmarkH}mm`);
  svgHost.setAttribute(
    "viewBox",
    `0 0 ${PARAMS.bookmarkW} ${PARAMS.bookmarkH}`
  );
  svgHost.style.border = "1px solid black";
}

function render() {
  applyBookmarkSize();

  paper.project.clear();

  const W = PARAMS.bookmarkW;
  const H = PARAMS.bookmarkH;

  const MARGIN = {
    top: PARAMS.marginTop,
    right: PARAMS.marginRight,
    bottom: PARAMS.marginBottom,
    left: PARAMS.marginLeft,
  };

  const noise2D = createNoise2D(alea(PARAMS.seed));
  const n01 = (x, y) => (noise2D(x, y) + 1) / 2;

  const organic01 = (t, channel = 0) => {
    const x = t * PARAMS.freq;
    const y = channel * PARAMS.chSpread;
    const w = n01(x + 12.3, y + 45.6) * 2 - 1;
    return clamp(n01(x + w * PARAMS.warp, y + w * PARAMS.warp), 0, 1);
  };

  const organicBetween = (t, min, max, channel = 0) =>
    lerp(min, max, organic01(t, channel));

  const organicPoint = (t) => [
    organicBetween(t, MARGIN.left, W - MARGIN.right, 1),
    organicBetween(t, MARGIN.top, H - MARGIN.bottom, 2),
  ];

  const organicAngle = (t) =>
    organicBetween(t, PARAMS.angleMin, PARAMS.angleMax, 3);

  // shapes
  const circle = new paper.Path.Circle({
    center: organicPoint(PARAMS.tCircle),
    radius: organicBetween(
      PARAMS.tCircle,
      PARAMS.circleMin,
      PARAMS.circleMax,
      4
    ),
    strokeColor: "none",
    fillColor: "none",
  });
  circle.rotate(organicAngle(PARAMS.tCircle));

  const rectSize = organicBetween(
    PARAMS.tRect,
    PARAMS.rectSizeMin,
    PARAMS.rectSizeMax,
    4
  );
  const rect = new paper.Path.Rectangle({
    center: organicPoint(PARAMS.tRect),
    size: [rectSize, rectSize],
    strokeColor: "none",
    fillColor: "none",
  });
  rect.rotate(organicAngle(PARAMS.tRect));

  const smallRectSize = organicBetween(
    PARAMS.tSmallRect,
    PARAMS.smallRectSizeMin,
    PARAMS.smallRectSizeMax,
    4
  );
  const smallRect = new paper.Path.Rectangle({
    center: organicPoint(PARAMS.tSmallRect),
    size: [smallRectSize, smallRectSize],
    strokeColor: "none",
    fillColor: "none",
  });
  smallRect.rotate(organicAngle(PARAMS.tSmallRect));

  const triangle = new paper.Path.RegularPolygon({
    center: organicPoint(PARAMS.tTriangle),
    sides: 3,
    radius: organicBetween(PARAMS.tTriangle, PARAMS.triMin, PARAMS.triMax, 4),
    strokeColor: "none",
    fillColor: "none",
  });
  triangle.rotate(organicAngle(PARAMS.tTriangle));

  const frame = new paper.Path.Rectangle({
    point: [MARGIN.left, MARGIN.top],
    size: [W - MARGIN.left - MARGIN.right, H - MARGIN.top - MARGIN.bottom],
    strokeColor: "none",
    fillColor: "none",
  });

  const unionShape = circle.unite(rect).unite(smallRect).unite(triangle);
  const frameIntersect = unionShape.intersect(frame);

  paper.project.activeLayer.removeChildren();
  paper.project.activeLayer.addChild(frameIntersect);

  frameIntersect.fillColor = PARAMS.unionFill;
  frameIntersect.strokeColor = PARAMS.unionStroke;
  frameIntersect.strokeWidth = 0.32;

  paper.view.update();

  const exportedSVG = paper.project.exportSVG({
    asString: false,
    bounds: "content",
    precision: 2,
  });

  svgHost.innerHTML = "";
  while (exportedSVG.firstChild) svgHost.appendChild(exportedSVG.firstChild);
}

render();
pane.on("change", render);
