// Lightweight pre-press checks for artwork/brand assets — resolution,
// likely colour space, and a static bleed reminder. This is deliberately
// NOT a full RIP/pre-flight tool (no ICC profile parsing, no real CMYK
// conversion) — it's a fast first-pass warning system so obviously
// under-spec files get flagged before an order reaches production, per
// TrioCraft's print workflow.

let sizeOf;
try {
  sizeOf = require('image-size');
} catch (e) {
  sizeOf = null; // package not installed — checks degrade gracefully below
}

const MIN_LONG_EDGE_PX = 1500; // below this, flag as likely low-resolution for most print sizes
const TARGET_DPI = 300;

const RASTER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif']);
const PRINT_READY_EXTENSIONS = new Set(['.pdf', '.eps', '.ai', '.tif', '.tiff', '.svg']);

function extOf(filename) {
  const m = /\.[^.]+$/.exec(filename || '');
  return m ? m[0].toLowerCase() : '';
}

/**
 * @param {string} filePath - absolute path to the uploaded file on disk
 * @param {string} originalName - original filename (for extension sniffing)
 * @param {{widthMm:number, heightMm:number}} [targetSize] - intended print size, if known
 * @returns {{ widthPx: number|null, heightPx: number|null, colorSpace: string, warnings: string[] }}
 */
function runPreflight(filePath, originalName, targetSize) {
  const ext = extOf(originalName);
  const warnings = [];
  let widthPx = null;
  let heightPx = null;
  let colorSpace = 'Unknown';

  if (PRINT_READY_EXTENSIONS.has(ext)) {
    colorSpace = ext === '.svg' ? 'Vector' : 'Vector/PDF (assumed print-ready)';
  } else if (RASTER_EXTENSIONS.has(ext)) {
    colorSpace = 'RGB (assumed — convert to CMYK for accurate colour matching)';
    warnings.push('This looks like an RGB file (screen colours). For accurate Pantone/CMYK matching in print, ask your designer for a CMYK export where possible.');

    if (sizeOf) {
      try {
        const dimensions = sizeOf(filePath);
        widthPx = dimensions.width;
        heightPx = dimensions.height;
        const longEdge = Math.max(widthPx, heightPx);

        if (targetSize && targetSize.widthMm && targetSize.heightMm) {
          const requiredLongEdgePx = (Math.max(targetSize.widthMm, targetSize.heightMm) / 25.4) * TARGET_DPI;
          const effectiveDpi = Math.round((longEdge / Math.max(targetSize.widthMm, targetSize.heightMm)) * 25.4);
          if (longEdge < requiredLongEdgePx) {
            warnings.push(`Effective resolution is about ${effectiveDpi} DPI at your selected size — ${TARGET_DPI} DPI is recommended for sharp print output.`);
          }
        } else if (longEdge < MIN_LONG_EDGE_PX) {
          warnings.push(`This file is ${widthPx}×${heightPx}px — fairly low-resolution. Verify it will look sharp at your intended print size (aim for ${TARGET_DPI} DPI).`);
        }
      } catch (e) {
        warnings.push('Could not read image dimensions automatically — double-check resolution manually before this goes to print.');
      }
    }
  } else {
    warnings.push(`Unrecognised file type (${ext || 'no extension'}) — confirm with the design team that this format is print-ready.`);
  }

  // Bleed can't be verified from the file alone without knowing the trim
  // size, so this is a standing reminder rather than a computed check.
  warnings.push('Reminder: include a minimum 3mm bleed and keep key text/logos inside a 3mm safe margin from the trim edge.');

  return { widthPx, heightPx, colorSpace, warnings };
}

module.exports = { runPreflight, MIN_LONG_EDGE_PX, TARGET_DPI };
