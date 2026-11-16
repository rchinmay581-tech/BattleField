import * as THREE from 'three';

export interface ProceduralTextureSet {
  sandstoneWall: THREE.CanvasTexture;
  sandstoneFloor: THREE.CanvasTexture;
  woodCrate: THREE.CanvasTexture;
  containerRed: THREE.CanvasTexture;
  containerBlue: THREE.CanvasTexture;
  containerAmber: THREE.CanvasTexture;
  asphalt: THREE.CanvasTexture;
  concretePlatform: THREE.CanvasTexture;
  hazardTrim: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(size = 256): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function finalizeTexture(
  canvas: HTMLCanvasElement,
  anisotropy: number,
  repeatX = 1,
  repeatY = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}

function createSandstoneWallTex(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = '#c8aa7e';
  ctx.fillRect(0, 0, 256, 256);

  // Subtle grain
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(95,70,40,0.08)' : 'rgba(255,245,220,0.08)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Block courses
  const rows = 4;
  const rowH = 256 / rows;
  ctx.strokeStyle = 'rgba(85, 62, 36, 0.35)';
  ctx.lineWidth = 3;
  for (let r = 0; r < rows; r++) {
    const y = r * rowH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();

    const cols = 2;
    const offset = (r % 2) * (256 / (cols * 2));
    for (let c = 0; c < cols + 1; c++) {
      const x = (c * (256 / cols) + offset) % 256;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowH);
      ctx.stroke();
    }
  }

  return finalizeTexture(canvas, anisotropy);
}

function createSandstoneFloorTex(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = '#d4ba92';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(110,85,50,0.09)' : 'rgba(255,250,235,0.09)';
    ctx.fillRect(x, y, 3, 3);
  }

  // Tile seams
  ctx.strokeStyle = 'rgba(100, 76, 45, 0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 256; i += 64) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(256, i);
    ctx.stroke();
  }

  return finalizeTexture(canvas, anisotropy, 16, 16);
}

function createWoodCrateTex(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = '#a47141';
  ctx.fillRect(0, 0, 256, 256);

  // Horizontal planks
  ctx.fillStyle = '#926133';
  for (let y = 0; y < 256; y += 42) {
    ctx.fillRect(0, y, 256, 3);
  }

  // Wood grain streaks
  for (let i = 0; i < 180; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(60,35,15,0.12)' : 'rgba(220,175,120,0.08)';
    ctx.fillRect(Math.random() * 220, Math.random() * 256, 20 + Math.random() * 40, 2);
  }

  // Outer frame + diagonal brace
  ctx.strokeStyle = '#6f4723';
  ctx.lineWidth = 22;
  ctx.strokeRect(11, 11, 234, 234);

  ctx.beginPath();
  ctx.moveTo(20, 20);
  ctx.lineTo(236, 236);
  ctx.stroke();

  // Inner bevel highlight
  ctx.strokeStyle = 'rgba(235, 195, 145, 0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, 212, 212);

  return finalizeTexture(canvas, anisotropy);
}

function createCorrugatedTex(baseHex: string, darkHex: string, anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  // Vertical corrugated ribs
  for (let x = 0; x < 256; x += 16) {
    ctx.fillStyle = darkHex;
    ctx.fillRect(x, 0, 6, 256);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(x + 6, 0, 3, 256);
  }

  // Structural top/bottom steel rails
  ctx.fillStyle = darkHex;
  ctx.fillRect(0, 0, 256, 16);
  ctx.fillRect(0, 240, 256, 16);

  // Subtle grime
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.07)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
  }

  return finalizeTexture(canvas, anisotropy);
}

function createAsphaltTex(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = '#31363f';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 4000; i++) {
    const shade = 38 + Math.floor(Math.random() * 28);
    ctx.fillStyle = `rgb(${shade},${shade + 3},${shade + 7})`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  // Subtle port slab grid
  ctx.strokeStyle = 'rgba(20, 24, 30, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 256, 256);

  return finalizeTexture(canvas, anisotropy, 16, 16);
}

function createConcretePlatformTex(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(256);
  ctx.fillStyle = '#737984';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)';
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }

  ctx.strokeStyle = 'rgba(40,45,52,0.38)';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 252, 252);
  ctx.beginPath();
  ctx.moveTo(128, 0);
  ctx.lineTo(128, 256);
  ctx.moveTo(0, 128);
  ctx.lineTo(256, 128);
  ctx.stroke();

  return finalizeTexture(canvas, anisotropy, 2, 2);
}

function createHazardTrimTex(anisotropy: number): THREE.CanvasTexture {
  const [canvas, ctx] = makeCanvas(128);
  ctx.fillStyle = '#e5a00d';
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#181a1f';
  for (let i = -128; i < 256; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + 16, 0);
    ctx.lineTo(i + 144, 128);
    ctx.lineTo(i + 128, 128);
    ctx.closePath();
    ctx.fill();
  }
  return finalizeTexture(canvas, anisotropy, 4, 1);
}

export function createProceduralTextures(renderer: THREE.WebGLRenderer): ProceduralTextureSet {
  const anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const sandstoneWall = createSandstoneWallTex(anisotropy);
  const sandstoneFloor = createSandstoneFloorTex(anisotropy);
  const woodCrate = createWoodCrateTex(anisotropy);
  const containerRed = createCorrugatedTex('#b53832', '#7a201c', anisotropy);
  const containerBlue = createCorrugatedTex('#295f98', '#193d64', anisotropy);
  const containerAmber = createCorrugatedTex('#c68324', '#865412', anisotropy);
  const asphalt = createAsphaltTex(anisotropy);
  const concretePlatform = createConcretePlatformTex(anisotropy);
  const hazardTrim = createHazardTrimTex(anisotropy);

  return {
    sandstoneWall,
    sandstoneFloor,
    woodCrate,
    containerRed,
    containerBlue,
    containerAmber,
    asphalt,
    concretePlatform,
    hazardTrim,
    dispose: () => {
      sandstoneWall.dispose();
      sandstoneFloor.dispose();
      woodCrate.dispose();
      containerRed.dispose();
      containerBlue.dispose();
      containerAmber.dispose();
      asphalt.dispose();
      concretePlatform.dispose();
      hazardTrim.dispose();
    },
  };
}
