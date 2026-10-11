import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = "C:/Users/james/daniel-battle-generator";
const skillDir = "C:/Users/james/.codex/plugins/cache/openai-primary-runtime/presentations/26.1007.11041/skills/presentations";
const runtimePython = "C:/Users/james/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
const buildDir = path.join(workspaceDir, "tmp", "creator-actions-deck");
const finalPath = path.join(workspaceDir, "output", "pptx", "First-Class-Creator-Action-Review-October-2026-Comparison.pptx");
const candidatePath = path.join(buildDir, "candidate.pptx");
const logoPath = path.join(workspaceDir, "public", "branding", "first-class-logo.png");
const dataPath = path.join(workspaceDir, "tmp", "creator-actions-deck-data.json");

const BLACK = "#080806";
const GOLD = "#F1C95B";
const PALE_GOLD = "#FBE6A8";
const WHITE = "#F7F4EC";
const MUTED = "#BFB8AA";
const LINE = "#725D28";

async function imageBytes(filePath) {
  const bytes = await fs.readFile(filePath);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

function addText(slide, text, x, y, w, h, options = {}) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left: x, top: y, width: w, height: h },
    fill: "none",
    line: { style: "solid", fill: "none", width: 0 },
  });
  shape.text = text;
  shape.text.style = {
    fontFamily: "Arial",
    fontSize: options.fontSize ?? 18,
    color: options.color ?? WHITE,
    bold: options.bold ?? false,
    ...(options.align ? { align: options.align } : {}),
  };
  return shape;
}

function addRule(slide, y, x = 66, width = 1148, color = LINE, height = 2) {
  slide.shapes.add({
    geometry: "rect",
    position: { left: x, top: y, width, height },
    fill: color,
    line: { style: "solid", fill: color, width: 0 },
  });
}

function brand(slide, logo) {
  slide.background.fill = BLACK;
  addText(slide, "FIRST CLASS AGENCY", 66, 34, 260, 20, { fontSize: 14, bold: true, color: GOLD });
  addRule(slide, 65);
  slide.images.add({
    blob: logo,
    contentType: "image/png",
    position: { left: 1040, top: 23, width: 170, height: 40 },
    fit: "contain",
  });
}

function slideFooter(slide, number) {
  addText(slide, `OCTOBER 2026  |  ACTION REVIEW  |  ${number}`, 66, 684, 420, 15, { fontSize: 10, color: MUTED });
}

function titleSlide(presentation, logo, creators, managers) {
  const slide = presentation.slides.add();
  slide.background.fill = BLACK;
  slide.images.add({
    blob: logo,
    contentType: "image/png",
    position: { left: 92, top: 92, width: 680, height: 170 },
    fit: "contain",
  });
  addRule(slide, 315, 92, 940, GOLD, 3);
  addText(slide, "Creator Action Review", 92, 354, 800, 80, { fontSize: 54, bold: true, color: WHITE });
  addText(slide, "Top 50 below matching September pace", 94, 448, 700, 36, { fontSize: 28, bold: true, color: GOLD });
  addText(slide, "All uploaded data from 1-8 September compared with 1-8 October 2026", 94, 495, 760, 30, { fontSize: 20, color: MUTED });
  addText(slide, `${creators} creators\n${managers} manager emails`, 890, 384, 240, 100, { fontSize: 24, bold: true, color: PALE_GOLD, align: "right" });
  addText(slide, "A visual manager pack for clear conversations and practical recovery plans.", 94, 620, 800, 30, { fontSize: 17, color: MUTED });
}

function overviewSlide(presentation, logo, groups) {
  const slide = presentation.slides.add();
  brand(slide, logo);
  addText(slide, "How to use this pack", 66, 106, 650, 50, { fontSize: 38, bold: true, color: WHITE });
  addText(slide, "Each slide contains a small number of creators for one manager. Read the cause first, then use the manager conversation as the action to agree.", 66, 174, 900, 45, { fontSize: 20, color: MUTED });
  addRule(slide, 252, 66, 1148, GOLD, 2);
  addText(slide, "1", 80, 300, 70, 56, { fontSize: 40, bold: true, color: GOLD });
  addText(slide, "Check what changed", 170, 304, 400, 34, { fontSize: 26, bold: true });
  addText(slide, "The cause section shows whether the gap comes from live hours, streams, matches, or weaker conversion at similar activity.", 170, 348, 760, 50, { fontSize: 18, color: MUTED });
  addText(slide, "2", 80, 440, 70, 56, { fontSize: 40, bold: true, color: GOLD });
  addText(slide, "Have the right conversation", 170, 444, 550, 34, { fontSize: 26, bold: true });
  addText(slide, "Use the written action to agree a live schedule, match plan, or a visual and conversion review with the creator.", 170, 488, 760, 50, { fontSize: 18, color: MUTED });
  addText(slide, "3", 80, 580, 70, 56, { fontSize: 40, bold: true, color: GOLD });
  addText(slide, "Check back within the week", 170, 584, 550, 34, { fontSize: 26, bold: true });
  addText(slide, "The goal is a practical change in the creator's next lives, rather than simply recording the issue.", 170, 628, 760, 36, { fontSize: 18, color: MUTED });
}

function creatorStrip(slide, creator, y) {
  const baseline = Math.round(creator.sep_8.diamonds).toLocaleString("en-GB");
  const october = Math.round(creator.oct.diamonds).toLocaleString("en-GB");
  const downPercent = creator.sep_8.diamonds > 0
    ? Math.max(0, Math.round((1 - creator.oct.diamonds / creator.sep_8.diamonds) * 100))
    : 0;
  addRule(slide, y, 66, 1148, "#4B4127", 1);
  addText(slide, `@${creator.username}`, 66, y + 22, 330, 38, { fontSize: 27, bold: true, color: WHITE });
  addText(slide, "DOWN VS SEP 1-8", 68, y + 74, 240, 16, { fontSize: 11, bold: true, color: GOLD });
  addText(slide, `-${downPercent}%`, 66, y + 94, 280, 42, { fontSize: 30, bold: true, color: GOLD });
  addText(slide, `Sep 1-8: ${baseline}  |  Oct 1-8: ${october}`, 68, y + 138, 320, 20, { fontSize: 13, color: MUTED });
  addText(slide, "WHY IT'S DOWN", 420, y + 24, 230, 16, { fontSize: 11, bold: true, color: GOLD });
  addText(slide, creator.factors.replaceAll("<br/>", "\n"), 420, y + 50, 335, 140, { fontSize: 16, color: WHITE });
  addText(slide, "MANAGER CONVERSATION", 800, y + 24, 300, 16, { fontSize: 11, bold: true, color: GOLD });
  addText(slide, creator.task.replaceAll("<br/><br/>", "\n\n"), 800, y + 50, 400, 155, { fontSize: 14, color: WHITE });
}

function managerSlides(presentation, logo, manager, creators, numberStart) {
  let number = numberStart;
  // Two creator cards per page keeps every manager conversation fully readable.
  for (let index = 0; index < creators.length; index += 2) {
    const chunk = creators.slice(index, index + 2);
    const slide = presentation.slides.add();
    brand(slide, logo);
    addText(slide, manager, 66, 98, 940, 44, { fontSize: 30, bold: true, color: WHITE });
    addText(slide, index ? "Creator action review - continued" : "Creator action review", 68, 148, 420, 24, { fontSize: 16, color: MUTED });
    const yStart = chunk.length === 1 ? 245 : 190;
    const gap = chunk.length === 1 ? 0 : 230;
    chunk.forEach((creator, position) => creatorStrip(slide, creator, yStart + position * gap));
    slideFooter(slide, number++);
  }
  return number;
}

async function writeBlob(filePath, blob) {
  await fs.writeFile(filePath, new Uint8Array(await blob.arrayBuffer()));
}

async function main() {
  const creators = JSON.parse(await fs.readFile(dataPath, "utf8"));
  const groups = new Map();
  for (const creator of creators) {
    if (!groups.has(creator.manager)) groups.set(creator.manager, []);
    groups.get(creator.manager).push(creator);
  }
  const logo = await imageBytes(logoPath);
  const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
  titleSlide(presentation, logo, creators.length, groups.size);
  overviewSlide(presentation, logo, groups);
  let slideNumber = 3;
  for (const [manager, members] of [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    members.sort((a, b) => b.diamond_lost - a.diamond_lost);
    slideNumber = managerSlides(presentation, logo, manager, members, slideNumber);
  }

  await fs.mkdir(buildDir, { recursive: true });
  for (const [index, slide] of presentation.slides.items.entries()) {
    await writeBlob(path.join(buildDir, `slide-${String(index + 1).padStart(2, "0")}.png`), await presentation.export({ slide, format: "png", scale: 1 }));
  }
  await writeBlob(path.join(buildDir, "deck-montage.webp"), await presentation.export({ format: "webp", montage: true }));
  await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

  const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools", "artifact_tool_utils.mjs")).href);
  const result = await finalizePresentation({
    workspaceDir,
    candidatePath,
    finalPath,
    pythonExecutable: runtimePython,
    integrityValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_package_integrity.py"),
    layoutValidatorPath: path.join(skillDir, "container_tools", "inspect_presentation_layout_geometry.py"),
    layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-heading-fit"],
    requiredNativeTableOwnerSlides: [],
    fontPolicy: { basis: "design", families: ["Aptos"] },
    verifyArtifactToolImport: true,
    receiptPath: path.join(buildDir, "validation-comparison.json"),
  });
  console.log(JSON.stringify({slides: presentation.slides.items.length, finalPath, result}, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
