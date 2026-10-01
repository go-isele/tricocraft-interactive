'use client';

// React port of the original public/js/mockup-editor.js — a live interactive
// canvas mockup editor: drop a logo (PNG/SVG) onto a product silhouette (or
// real product photo), drag/resize it, and toggle a bleed/safe-margin
// overlay. Placement preview only, not a colour-accurate proof (canvas is
// sRGB, not the job's print CMYK) — same framing as the original.
//
// The silhouette-drawing functions below are ported near-verbatim from the
// vanilla JS version; each takes (ctx, w, h) and returns the printArea rect.

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

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
  ctx.fillStyle = '#0F1A2E';
  ctx.fillRect(bx - bw * 0.1, by + bh, bw * 1.2, h * 0.04);
  return { x: bx + bw * 0.1, y: by + bh * 0.08, w: bw * 0.8, h: bh * 0.5 };
}

function drawRollupSilhouette(ctx, w, h) {
  const bw = w * 0.3, bh = h * 0.72, bx = (w - bw) / 2, by = h * 0.08;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = 'rgba(15,26,46,.18)';
  ctx.lineWidth = 1.5;
  roundRect(ctx, bx, by, bw, bh, 10);
  ctx.fill(); ctx.stroke();
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

const SILHOUETTES = {
  apparel: drawApparelSilhouette,
  card: drawCardSilhouette,
  mug: drawMugSilhouette,
  banner: drawBannerSilhouette,
  rollup: drawRollupSilhouette,
  vehicle: drawVehicleSilhouette,
  notebook: drawNotebookSilhouette,
  generic: drawGenericSilhouette,
};

const SILHOUETTE_BY_PRODUCT = {
  'roll-up-banner': 'rollup',
  'vehicle-door-decals': 'vehicle',
  'executive-notebook-pen-set': 'notebook',
};
const SILHOUETTE_BY_CATEGORY = {
  'apparel-wearable-branding': 'apparel',
  'print-marketing-materials': 'card',
  'promotional-merchandise': 'mug',
  'large-format-environmental': 'banner',
  'vehicle-branding': 'vehicle',
};

export function silhouetteKindFor(product) {
  return SILHOUETTE_BY_PRODUCT[product.slug] || SILHOUETTE_BY_CATEGORY[product.category_slug] || 'generic';
}

function drawCover(ctx, img, w, h) {
  const ir = img.naturalWidth / img.naturalHeight, cr = w / h;
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ir > cr) { sw = sh * cr; sx = (img.naturalWidth - sw) / 2; }
  else { sh = sw / cr; sy = (img.naturalHeight - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

const MockupEditor = forwardRef(function MockupEditor({ product }, ref) {
  const canvasRef = useRef(null);
  const stateRef = useRef({
    logoImg: null,
    logo: { x: 0, y: 0, w: 0, h: 0 },
    printArea: { x: 0, y: 0, w: 0, h: 0 },
    photoImg: null,
    dragging: false,
    dragOffset: { x: 0, y: 0 },
  });
  const [hasLogo, setHasLogo] = useState(false);
  const [scalePct, setScalePct] = useState(100);
  const [showBleed, setShowBleed] = useState(true);
  const showBleedRef = useRef(true);
  showBleedRef.current = showBleed;

  const kind = silhouetteKindFor(product);
  const drawSilhouette = SILHOUETTES[kind] || SILHOUETTES.generic;

  function render() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const cssW = canvas.clientWidth || 360, cssH = canvas.clientHeight || 320;
    const s = stateRef.current;
    ctx.clearRect(0, 0, cssW, cssH);

    if (s.photoImg) {
      drawCover(ctx, s.photoImg, cssW, cssH);
      s.printArea = { x: cssW * 0.2, y: cssH * 0.2, w: cssW * 0.6, h: cssH * 0.6 };
    } else {
      s.printArea = drawSilhouette(ctx, cssW, cssH);
    }

    if (s.logoImg) {
      ctx.drawImage(s.logoImg, s.logo.x, s.logo.y, s.logo.w, s.logo.h);
    }

    if (showBleedRef.current) {
      const inset = Math.min(s.printArea.w, s.printArea.h) * 0.06;
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(196,69,26,.75)';
      ctx.lineWidth = 1.25;
      ctx.strokeRect(s.printArea.x + inset, s.printArea.y + inset, s.printArea.w - inset * 2, s.printArea.h - inset * 2);
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(15,26,46,.5)';
      ctx.strokeRect(s.printArea.x, s.printArea.y, s.printArea.w, s.printArea.h);
      ctx.restore();
    }
  }

  function placeLogoDefault() {
    const s = stateRef.current;
    const maxW = s.printArea.w * 0.8;
    const ratio = s.logoImg.naturalWidth / s.logoImg.naturalHeight || 1;
    let w = maxW, h = w / ratio;
    if (h > s.printArea.h * 0.8) { h = s.printArea.h * 0.8; w = h * ratio; }
    s.logo = { x: s.printArea.x + (s.printArea.w - w) / 2, y: s.printArea.y + (s.printArea.h - h) / 2, w, h };
    setScalePct(100);
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth || 360, cssH = canvas.clientHeight || 320;
    canvas.width = cssW * dpr;
    canvas.height = cssH * dpr;
    canvas.getContext('2d').scale(dpr, dpr);

    const photoUrl = product.image;
    if (photoUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { stateRef.current.photoImg = img; render(); };
      img.onerror = () => render();
      img.src = photoUrl;
    } else {
      render();
    }

    function pointerPos(e) {
      const rect = canvas.getBoundingClientRect();
      const p = e.touches ? e.touches[0] : e;
      return { x: p.clientX - rect.left, y: p.clientY - rect.top };
    }
    function withinLogo(p) {
      const s = stateRef.current;
      return s.logoImg && p.x >= s.logo.x && p.x <= s.logo.x + s.logo.w && p.y >= s.logo.y && p.y <= s.logo.y + s.logo.h;
    }
    function startDrag(e) {
      const p = pointerPos(e);
      if (!withinLogo(p)) return;
      const s = stateRef.current;
      s.dragging = true;
      s.dragOffset = { x: p.x - s.logo.x, y: p.y - s.logo.y };
      e.preventDefault();
    }
    function moveDrag(e) {
      const s = stateRef.current;
      if (!s.dragging) return;
      const p = pointerPos(e);
      s.logo.x = p.x - s.dragOffset.x;
      s.logo.y = p.y - s.dragOffset.y;
      render();
      e.preventDefault();
    }
    function endDrag() { stateRef.current.dragging = false; }

    canvas.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', moveDrag);
    window.addEventListener('mouseup', endDrag);
    canvas.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', moveDrag, { passive: false });
    window.addEventListener('touchend', endDrag);

    return () => {
      canvas.removeEventListener('mousedown', startDrag);
      window.removeEventListener('mousemove', moveDrag);
      window.removeEventListener('mouseup', endDrag);
      canvas.removeEventListener('touchstart', startDrag);
      window.removeEventListener('touchmove', moveDrag);
      window.removeEventListener('touchend', endDrag);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        stateRef.current.logoImg = img;
        placeLogoDefault();
        render();
        setHasLogo(true);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function onScaleChange(e) {
    const pct = Number(e.target.value);
    setScalePct(pct);
    const s = stateRef.current;
    if (!s.logoImg) return;
    const ratio = s.logoImg.naturalWidth / s.logoImg.naturalHeight || 1;
    const cx = s.logo.x + s.logo.w / 2, cy = s.logo.y + s.logo.h / 2;
    const baseW = s.printArea.w * 0.8 * (pct / 100);
    const w = baseW, h = w / ratio;
    s.logo = { x: cx - w / 2, y: cy - h / 2, w, h };
    render();
  }

  function onBleedToggle(e) {
    setShowBleed(e.target.checked);
    showBleedRef.current = e.target.checked;
    render();
  }

  function onReset() {
    stateRef.current.logoImg = null;
    setHasLogo(false);
    render();
  }

  useImperativeHandle(ref, () => ({
    exportDataUrl() {
      if (!stateRef.current.logoImg || !canvasRef.current) return null;
      return canvasRef.current.toDataURL('image/png');
    },
  }));

  return (
    <div>
      <div className="product-hero mockup-editor">
        {!hasLogo && (
          product.image
            ? <img src={product.image} alt={product.name} className="mockup-empty" />
            : <div className="mockup-empty" style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48, color: 'var(--slate-xs)' }}>▢</div>
        )}
        <canvas className="mockup-canvas" ref={canvasRef} style={{ display: 'block' }} />
      </div>
      <div className="mockup-controls">
        <label className="mockup-upload-btn">
          📤 Upload your logo to preview it on this product
          <input type="file" accept="image/png,image/svg+xml" onChange={onFileChange} />
        </label>
        <div className={`mockup-controls-row${hasLogo ? ' active' : ''}`}>
          <label>Size <input type="range" className="mockup-scale" min="30" max="150" value={scalePct} onChange={onScaleChange} /></label>
          <label><input type="checkbox" className="mockup-bleed-toggle" checked={showBleed} onChange={onBleedToggle} /> Bleed / safe margin</label>
          <button type="button" className="mockup-reset btn btn-outline btn-sm" onClick={onReset}>Remove</button>
        </div>
      </div>
      <p style={{ color: 'var(--slate-lt)', fontSize: 11.5, marginTop: 8 }}>
        Live placement preview only — not a colour-accurate proof (screen colours are sRGB, not the job&rsquo;s print CMYK). Uses the same 3mm bleed / safe-margin guidance as Brand Vault pre-flight checks.
      </p>
    </div>
  );
});

export default MockupEditor;
