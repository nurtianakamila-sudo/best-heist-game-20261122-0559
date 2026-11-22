// main.ts — the entrypoint for The Gilded Vault (Node 22, standard library only).
//
// What it does, in order:
//   1. Copies this repository's game/ (the playable heist game, plain static
//      files) and screenshots/ (four real renders of the game running) into
//      the output directory.
//   2. Writes output/dossier.json with the kit's vendored buildDossier, the
//      summary the judge reads: the screenshots plus an outline of the source.
//
// In the grader the output directory is /output. Anywhere else, set
// MAKEFUN_OUTPUT_DIR to point at a folder instead, e.g.:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// The run is deterministic: the same repository always writes the same bytes.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = dirname(fileURLToPath(import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The caps the competition's gate enforces, from competition.yaml:
// at most 4 screenshots of 256 KiB, at most 993 files and 48 MiB under
// game/, and a dossier text of at most 160 KiB. The dossier call refuses
// anything over them, so a bad hand-in fails loudly here instead of silently.
const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

mkdirSync(outputDir, { recursive: true });
mkdirSync(join(outputDir, 'game'), { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(repoRoot, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, dossierCaps));
