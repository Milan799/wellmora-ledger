import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '..');
const androidResDir = path.join(frontendDir, 'android', 'app', 'src', 'main', 'res');
const assetsDir = path.join(frontendDir, 'assets');

if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// 1. SVG Definitions
const defsGradients = `
  <defs>
    <linearGradient id="wm-facet-1" x1="40" y1="80" x2="160" y2="440" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#8b5cf6" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
    <linearGradient id="wm-facet-2" x1="160" y1="440" x2="256" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#3b82f6" />
    </linearGradient>
    <linearGradient id="wm-facet-3" x1="256" y1="200" x2="352" y2="440" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="100%" stop-color="#06b6d4" />
    </linearGradient>
    <linearGradient id="wm-facet-4" x1="352" y1="440" x2="480" y2="80" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#06b6d4" />
      <stop offset="50%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#f59e0b" />
    </linearGradient>
  </defs>
`;

const wings = `
  <path d="M 32 80 L 135 432 L 210 240 L 120 80 Z" fill="url(#wm-facet-1)" />
  <path d="M 210 240 L 135 432 L 256 300 Z" fill="url(#wm-facet-2)" opacity="0.95" />
  <path d="M 256 300 L 377 432 L 302 240 Z" fill="url(#wm-facet-3)" opacity="0.95" />
  <path d="M 302 240 L 377 432 L 480 80 L 392 80 Z" fill="url(#wm-facet-4)" />
`;

// Standard Square/Squircle Launcher Icon
const svgLauncherSquare = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${defsGradients}
  <rect width="512" height="512" rx="108" fill="#0b0f19" />
  <rect x="8" y="8" width="496" height="496" rx="100" fill="none" stroke="#334155" stroke-width="4" />
  <g transform="translate(256, 256) scale(0.72) translate(-256, -256)">
    ${wings}
  </g>
</svg>
`;

// Round Launcher Icon
const svgLauncherRound = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${defsGradients}
  <circle cx="256" cy="256" r="256" fill="#0b0f19" />
  <circle cx="256" cy="256" r="252" fill="none" stroke="#334155" stroke-width="4" />
  <g transform="translate(256, 256) scale(0.68) translate(-256, -256)">
    ${wings}
  </g>
</svg>
`;

// Adaptive Foreground (Inner 66% safe zone, transparent background)
const svgLauncherForeground = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  ${defsGradients}
  <g transform="translate(256, 256) scale(0.55) translate(-256, -256)">
    ${wings}
  </g>
</svg>
`;

// Splash Generator
function getSplashSvg(w, h) {
  const minDim = Math.min(w, h);
  const scale = (minDim * 0.38) / 512;
  const cx = w / 2;
  const cy = h / 2;
  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">
  ${defsGradients}
  <rect width="${w}" height="${h}" fill="#0b0f19" />
  <g transform="translate(${cx}, ${cy}) scale(${scale}) translate(-256, -256)">
    ${wings}
  </g>
</svg>
  `;
}

async function run() {
  console.log('Generating Wellmora assets...');

  // 1. Generate master assets for Capacitor
  await sharp(Buffer.from(svgLauncherSquare)).resize(1024, 1024).png().toFile(path.join(assetsDir, 'icon-only.png'));
  await sharp(Buffer.from(svgLauncherForeground)).resize(1024, 1024).png().toFile(path.join(assetsDir, 'icon-foreground.png'));
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: '#0b0f19'
    }
  }).png().toFile(path.join(assetsDir, 'icon-background.png'));
  await sharp(Buffer.from(getSplashSvg(2732, 2732))).png().toFile(path.join(assetsDir, 'splash.png'));
  await sharp(Buffer.from(getSplashSvg(2732, 2732))).png().toFile(path.join(assetsDir, 'splash-dark.png'));
  console.log('✅ Master assets generated in frontend/assets/');

  // 2. Generate Mipmap Icons
  const mipmaps = [
    { dir: 'mipmap-mdpi', iconSize: 48, fgSize: 108 },
    { dir: 'mipmap-hdpi', iconSize: 72, fgSize: 162 },
    { dir: 'mipmap-xhdpi', iconSize: 96, fgSize: 216 },
    { dir: 'mipmap-xxhdpi', iconSize: 144, fgSize: 324 },
    { dir: 'mipmap-xxxhdpi', iconSize: 192, fgSize: 432 }
  ];

  for (const m of mipmaps) {
    const targetDir = path.join(androidResDir, m.dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    // ic_launcher.png
    await sharp(Buffer.from(svgLauncherSquare))
      .resize(m.iconSize, m.iconSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // ic_launcher_round.png
    await sharp(Buffer.from(svgLauncherRound))
      .resize(m.iconSize, m.iconSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // ic_launcher_foreground.png
    await sharp(Buffer.from(svgLauncherForeground))
      .resize(m.fgSize, m.fgSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`✅ Updated ${m.dir} icons (launcher: ${m.iconSize}px, fg: ${m.fgSize}px)`);
  }

  // 3. Generate Splash screens for all drawables
  const splashTargets = [
    { dir: 'drawable', w: 480, h: 320 },
    { dir: 'drawable-land-hdpi', w: 800, h: 480 },
    { dir: 'drawable-land-mdpi', w: 480, h: 320 },
    { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
    { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
    { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1280 },
    { dir: 'drawable-port-hdpi', w: 480, h: 800 },
    { dir: 'drawable-port-mdpi', w: 320, h: 480 },
    { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
    { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
    { dir: 'drawable-port-xxxhdpi', w: 1280, h: 1920 }
  ];

  for (const s of splashTargets) {
    const targetDir = path.join(androidResDir, s.dir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    await sharp(Buffer.from(getSplashSvg(s.w, s.h)))
      .png()
      .toFile(path.join(targetDir, 'splash.png'));
    console.log(`✅ Updated ${s.dir}/splash.png (${s.w}x${s.h})`);
  }

  // 4. Update ic_launcher_background.xml
  const bgXmlPath = path.join(androidResDir, 'values', 'ic_launcher_background.xml');
  const bgXmlContent = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0b0f19</color>\n</resources>\n`;
  fs.writeFileSync(bgXmlPath, bgXmlContent, 'utf-8');
  console.log('✅ Updated ic_launcher_background.xml to #0b0f19');

  // 5. Remove outdated drawable-v24/ic_launcher_foreground.xml if present
  const oldV24Fg = path.join(androidResDir, 'drawable-v24', 'ic_launcher_foreground.xml');
  if (fs.existsSync(oldV24Fg)) {
    fs.unlinkSync(oldV24Fg);
    console.log('✅ Removed obsolete drawable-v24/ic_launcher_foreground.xml');
  }

  console.log('🎉 All Android app icons and splash screens successfully restored with Wellmora Logo!');
}

run().catch(console.error);
