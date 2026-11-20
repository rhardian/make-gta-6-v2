// Solaria Bay: Sun & Syndicate — open-world crime game entry for make.fun's gta6-01 bounty.
// Runs on Node 22 using the standard library only. Copies game/ and screenshots/ into the
// target output directory (/output in the grader container, or MAKEFUN_OUTPUT_DIR locally)
// and generates /output/dossier.json using the vendored makefun-game.ts buildDossier helper.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const rootDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function exportEntryBundle(sourceRoot: string, destinationRoot: string): void {
  const destGameDir = join(destinationRoot, 'game');
  const destShotsDir = join(destinationRoot, 'screenshots');

  mkdirSync(destinationRoot, { recursive: true });
  if (existsSync(destGameDir)) rmSync(destGameDir, { recursive: true, force: true });
  if (existsSync(destShotsDir)) rmSync(destShotsDir, { recursive: true, force: true });

  cpSync(join(sourceRoot, 'game'), destGameDir, { recursive: true });
  mkdirSync(destShotsDir, { recursive: true });

  const sourceShotsDir = join(sourceRoot, 'screenshots');
  if (existsSync(sourceShotsDir)) {
    cpSync(sourceShotsDir, destShotsDir, { recursive: true });
  }

  const dossierBytes = buildDossier(destinationRoot, DOSSIER_CAPS);
  if (dossierBytes.byteLength === 0 || dossierBytes.byteLength > 1572864) {
    throw new Error(`Invalid dossier.json size: ${dossierBytes.byteLength} bytes`);
  }
  writeFileSync(join(destinationRoot, 'dossier.json'), dossierBytes);
}

exportEntryBundle(rootDir, outputDir);
