// v5 — Live Interactive Canvas Mockup Editor.
//
// A client-side <canvas> that lets a buyer drop their own logo (PNG/SVG)
// onto a simple product silhouette, drag it into position, resize it, and
// toggle a bleed / safe-margin overlay that mirrors the same "3mm bleed,
// 3mm safe margin from the trim edge" language used in the real pre-flight
// checker (lib/preflight.js) — so the same print-production concept shows
// up consistently whether a file is checked in Brand Vault or previewed
// here. This is a placement/positioning preview, not a colour-accurate
// proof — the on-screen canvas is sRGB, not the job's actual CMYK output.
//
// No canvas library is used; this is plain 2D canvas drawing + pointer
// events, kept dependency-free like the rest of the site's client-side JS.
(function () {
  'use strict';

  // Product silhouettes are drawn with plain canvas primitives rather than
  // shipping template art — keeps this working for every catalogue product
  // with zero extra assets, and the exact garment/card outline doesn't need
  // to be photoreal for a *placement* preview.
  const SILHOUETTES = {
    apparel: drawApparelSilhouette,
    card: drawCardSilhouette,
    mug: drawMugSilhouette,
    banner: drawBannerSilhouette,
    // v6 — added for the expanded 11-division catalogue: a retractable
    // roll-up stand (distinct from the freestanding fabric banner above),
    // a vehicle door/side panel, and a hardcover notebook — so "apparel,
    // banners, roll-ups, vehicle panels, and corporate merchandise sets"
    // (per the capability statement) each get a purpose-drawn preview
    // instead of falling back to the generic rectangle.
    rollup: drawRollupSilhouette,
    vehicle: drawVehicleSilhouette,
    notebook: drawNotebookSilhouette,
    generic: drawGenericSilhouette,
  };

  function drawApparelSilhouette(ctx, w, h) {
    ctx.fillStyle = '#EDE7DC';
    ctx.beginPath();
    ctx.moveTo(w * 0.32, h * 0.08);
    ctx.lineTo(w * 0.68, h * 0.08);
    ctx.lineTo(w * 0.78, h * 0.2);
    ctx.lineTo(w * 0.92, h * 0.3);
    ctx.lineTo(w * 0.82, h * 0.46);
    ctx.lineTo(w * 0.74, h * 0.4);
    ctx.lineTo(w * 0.74, h * 0.92);
    ctx.lineTo(w * 0.26, h * 0.92);
    ctx.lineTo(w * 0.26, h * 0.4);
    ctx.lineTo(w * 0.18, h * 0.46);
    ctx.lineTo(w * 0.08, h * 0.3);
    ctx.lineTo(w * 0.22, h * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(15,26,46,.15)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // print area guide (chest placement)
    return { x: w * 0.36, y: h * 0.3, w: w * 0.28, h: h * 0.28 };
  }

  function drawCardSilhouette(ctx, w, h) {
    const cw = w * 0.7, ch = cw * 0.57, cx = (w - cw) / 2, cy = (h - ch) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(15,26,46,.18)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 6;
    ctx.fillStyle = '#fff';
    roundRect(ctx, cx, cy, cw, ch, 8);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(15,26,46,.12)';
    ctx.lineWidth = 1;
    roundRect(ctx, cx, cy, cw, ch, 8);
    ctx.stroke();
    return { x: cx, y: cy, w: cw, h: ch };
  }

  function drawMugSilhouette(ctx, w, h) {
    const bw = w * 0.38, bh = h * 0.55, bx = (w - bw) / 2, by = h * 0.22;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(15,26,46,.18)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, bw, bh, 6);
    ctx.fill(); ctx.stroke();
    // handle
    ctx.beginPath();
    ctx.ellipse(bx + bw + bw * 0.16, by + bh * 0.5, bw * 0.18, bh * 0.28, 0, -1.1, 1.1);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#EDE7DC';
    ctx.stroke();
    return { x: bx + bw * 0.12, y: by + bh * 0.2, w: bw * 0.76, h: bh * 0.5 };
  }

  function drawBannerSilhouette(ctx, w, h) {
    const bw = w * 0.34, bh = h * 0.78, bx = (w - bw) / 2, by = h * 0.1;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(15,26,46,.18)';
    ctx.lineWidth = 1.5;
    ctx.fillRect(bx, by, bw, bh);
    ctx.strokeRect(bx, by, bw, bh);
    // stand base
    ctx.fillStyle = '#0F1A2E';
    ctx.fillRect(bx - bw * 0.1, by + bh, bw * 1.2, h * 0.04);
    return { x: bx + bw * 0.1, y: by + bh * 0.08, w: bw * 0.8, h: bh * 0.5 };
  }

  function drawRollupSilhouette(ctx, w, h) {
    // A tapered retractable stand (curved top corners, splayed feet) so it
    // reads distinctly from the flat teardrop/fabric banner above even
    // though both are "large format" prints.
    const bw = w * 0.3, bh = h * 0.72, bx = (w - bw) / 2, by = h * 0.08;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(15,26,46,.18)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, bw, bh, 10);
    ctx.fill(); ctx.stroke();
    // splayed stand feet
    ctx.beginPath();
    ctx.moveTo(bx - bw * 0.35, by + bh + h * 0.05);
    ctx.lineTo(bx + bw * 1.35, by + bh + h * 0.05);
    ctx.lineTo(bx + bw + bw * 0.08, by + bh);
    ctx.lineTo(bx - bw * 0.08, by + bh);
    ctx.closePath();
    ctx.fillStyle = '#0F1A2E';
    ctx.fill();
    return { x: bx + bw * 0.08, y: by + bh * 0.06, w: bw * 0.84, h: bh * 0.55 };
  }

  function drawVehicleSilhouette(ctx, w, h) {
    // A simple side-panel/door outline — a placement guide for vehicle
    // wraps/decals, not a to-scale technical drawing of any specific model.
    const bw = w * 0.82, bh = h * 0.42, bx = (w - bw) / 2, by = h * 0.32;
    ctx.fillStyle = '#EDE7DC';
    ctx.strokeStyle = 'rgba(15,26,46,.18)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(bx, by + bh);
    ctx.lineTo(bx, by + bh * 0.45);
    ctx.quadraticCurveTo(bx, by, bx + bw * 0.18, by);
    ctx.lineTo(bx + bw * 0.62, by);
    ctx.quadraticCurveTo(bx + bw * 0.78, by, bx + bw * 0.82, by + bh * 0.3);
    ctx.lineTo(bx + bw, by + bh * 0.5);
    ctx.lineTo(bx + bw, by + bh);
    ctx.closePath();
    ctx.fill(); ctx.stroke();
    // wheels (context only, outside the print area)
    ctx.fillStyle = '#0F1A2E';
    [bx + bw * 0.18, bx + bw * 0.78].forEach((cx) => {
      ctx.beginPath();
      ctx.arc(cx, by + bh, bh * 0.22, 0, Math.PI * 2);
      ctx.fill();
    });
    return { x: bx + bw * 0.08, y: by + bh * 0.35, w: bw * 0.55, h: bh * 0.45 };
  }

  function drawNotebookSilhouette(ctx, w, h) {
    const bw = w * 0.44, bh = h * 0.7, bx = (w - bw) / 2, by = (h - bh) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(15,26,46,.18)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = '#fff';
    roundRect(ctx, bx, by, bw, bh, 4);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(15,26,46,.12)';
    ctx.lineWidth = 1;
    roundRect(ctx, bx, by, bw, bh, 4);
    ctx.stroke();
    // page-edge lines down the right side (closed-book cue)
    ctx.strokeStyle = 'rgba(15,26,46,.1)';
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(bx + bw + i * 1.5, by + 4);
      ctx.lineTo(bx + bw + i * 1.5, by + bh - 4);
      ctx.stroke();
    }
    return { x: bx + bw * 0.14, y: by + bh * 0.14, w: bw * 0.72, h: bh * 0.72 };
  }

  function drawGenericSilhouette(ctx, w, h) {
    const bw = w * 0.6, bh = h * 0.6, bx = (w - bw) / 2, by = (h - bh) / 2;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(15,26,46,.18)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, bx, by, bw, bh, 6);
    ctx.fill(); ctx.stroke();
    return { x: bx + bw * 0.15, y: by + bh * 0.15, w: bw * 0.7, h: bh * 0.7 };
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function init(root) {
    // `root` is the .product-hero.mockup-editor canvas box; its upload/scale/
    // bleed/reset controls live in the sibling .mockup-controls block, so
    // control lookups are scoped to the shared parent, not root itself.
    const scope = root.parentElement || root;
    const canvas = root.querySelector('canvas.mockup-canvas');
    const fileInput = scope.querySelector('input[type=file]');
    const scaleInput = scope.querySelector('.mockup-scale');
    const bleedToggle = scope.querySelector('.mockup-bleed-toggle');
    const resetBtn = scope.querySelector('.mockup-reset');
    const emptyState = root.querySelector('.mockup-empty');
    const controlsRow = scope.querySelector('.mockup-controls-row');
    const hiddenField = document.getElementById(root.dataset.hiddenField || '');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 360, cssH = canvas.clientHeight || 320;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    ctx.scale(dpr, dpr);

    const kind = root.dataset.silhouette || 'generic';
    const drawSilhouette = SILHOUETTES[kind] || SILHOUETTES.generic;

    let logoImg = null;
    let logo = { x: 0, y: 0, w: 0, h: 0 }; // top-left + size, canvas CSS px
    let printArea = { x: 0, y: 0, w: 0, h: 0 };
    let showBleed = true;
    let dragging = false, dragOffset = { x: 0, y: 0 };
    let photoImg = null; // real product photo (task-2 catalogue images), used as the base layer when present

    // cover-fit draw, same behavior as CSS object-fit:cover
    function drawCover(img, w, h) {
      const ir = img.naturalWidth / img.naturalHeight, cr = w / h;
      let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
      if (ir > cr) { sw = sh * cr; sx = (img.naturalWidth - sw) / 2; }
      else { sh = sw / cr; sy = (img.naturalHeight - sh) / 2; }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
    }

    function render() {
      ctx.clearRect(0, 0, cssW, cssH);
      if (photoImg) {
        drawCover(photoImg, cssW, cssH);
        // A real photo has no silhouette-derived print area — use a centered
        // placement zone as a reasonable placement guide instead.
        printArea = { x: cssW * 0.2, y: cssH * 0.2, w: cssW * 0.6, h: cssH * 0.6 };
      } else {
        printArea = drawSilhouette(ctx, cssW, cssH);
      }

      if (logoImg) {
        ctx.drawImage(logoImg, logo.x, logo.y, logo.w, logo.h);
      }

      if (showBleed) {
        const inset = Math.min(printArea.w, printArea.h) * 0.06; // ~"3mm safe margin" illustrative inset
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = 'rgba(196,69,26,.75)';
        ctx.lineWidth = 1.25;
        ctx.strokeRect(printArea.x + inset, printArea.y + inset, printArea.w - inset * 2, printArea.h - inset * 2);
        ctx.setLineDash([]);
        ctx.strokeStyle = 'rgba(15,26,46,.5)';
        ctx.strokeRect(printArea.x, printArea.y, printArea.w, printArea.h);
        ctx.restore();
      }
    }

    function placeLogoDefault() {
      const maxW = printArea.w * 0.8;
      const ratio = logoImg.naturalWidth / logoImg.naturalHeight || 1;
      let w = maxW, h = w / ratio;
      if (h > printArea.h * 0.8) { h = printArea.h * 0.8; w = h * ratio; }
      logo = { x: printArea.x + (printArea.w - w) / 2, y: printArea.y + (printArea.h - h) / 2, w, h };
      if (scaleInput) scaleInput.value = 100;
    }

    function loadFile(file) {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        const img = new Image();
        img.onload = function () {
          logoImg = img;
          placeLogoDefault();
          render();
          if (controlsRow) controlsRow.classList.add('active');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    }

    if (fileInput) fileInput.addEventListener('change', function (e) { loadFile(e.target.files[0]); });

    if (scaleInput) {
      scaleInput.addEventListener('input', function () {
        if (!logoImg) return;
        const pct = Number(scaleInput.value) / 100;
        const ratio = logoImg.naturalWidth / logoImg.naturalHeight || 1;
        const cx = logo.x + logo.w / 2, cy = logo.y + logo.h / 2;
        const baseW = printArea.w * 0.8 * pct;
        const w = baseW, h = w / ratio;
        logo = { x: cx - w / 2, y: cy - h / 2, w, h };
        render();
      });
    }

    if (bleedToggle) {
      bleedToggle.addEventListener('change', function () { showBleed = bleedToggle.checked; render(); });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', function () {
        logoImg = null;
        if (fileInput) fileInput.value = '';
        render();
        if (controlsRow) controlsRow.classList.remove('active');
      });
    }

    function pointerPos(e) {
      const rect = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - rect.left, y: p.clientY - rect.top };
    }
    function withinLogo(p) {
      return logoImg && p.x >= logo.x && p.x <= logo.x + logo.w && p.y >= logo.y && p.y <= logo.y + logo.h;
    }
    function startDrag(e) {
      const p = pointerPos(e);
      if (!withinLogo(p)) return;
      dragging = true;
      dragOffset = { x: p.x - logo.x, y: p.y - logo.y };
      e.preventDefault();
    }
    function moveDrag(e) {
      if (!dragging) return;
      const p = pointerPos(e);
      logo.x = p.x - dragOffset.x;
      logo.y = p.y - dragOffset.y;
      render();
      e.preventDefault();
    }
    function endDrag() { dragging = false; }

    canvas.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', endDrag);
    canvas.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', moveDrag, { passive: false });
    window.addEventListener('touchend', endDrag);

    // Compose the current canvas into the hidden form field right before
    // submit, so "Add to Cart" carries the mockup along with it — the
    // server just persists whatever PNG the canvas already produced
    // (see routes/marketplace.js saveMockupDataUrl()).
    const form = canvas.closest('form') || document.getElementById(root.dataset.form || '');
    if (form) {
      form.addEventListener('submit', function () {
        if (hiddenField && logoImg) hiddenField.value = canvas.toDataURL('image/png');
      });
    }

    // The canvas is the live editor from the start (not gated behind an
    // upload) — it shows the product silhouette + bleed guide immediately,
    // or the real product photo as a base layer once loaded, if this
    // product has one (product.image, see routes/marketplace.js).
    if (emptyState) emptyState.style.display = 'none';
    canvas.style.display = 'block';
    const photoUrl = root.dataset.photo;
    if (photoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // needed so canvas.toDataURL() isn't tainted by a cross-origin photo host
      img.onload = function () { photoImg = img; render(); };
      img.onerror = function () { render(); }; // photo failed to load (e.g. blocked hotlink) — fall back to the silhouette
      img.src = photoUrl;
    } else {
      render();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.mockup-editor').forEach(init);
  });
})();
