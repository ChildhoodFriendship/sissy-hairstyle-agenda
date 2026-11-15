import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const wikiRoot = path.join(root, 'docs', 'wiki');
const errors = [];

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await markdownFiles(target));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(target);
  }
  return files;
}

function report(file, message) {
  errors.push(`${path.relative(root, file)}: ${message}`);
}

try {
  const files = await markdownFiles(wikiRoot);
  const knownStatus = new Set(['active', 'draft', 'commercial', 'archived']);
  const knownRoles = new Set(['functional_module', 'frontend', 'application', 'config-data', 'status-data']);

  for (const file of files) {
    const text = await readFile(file, 'utf8');
    const relative = path.relative(wikiRoot, file).toLowerCase();
    const isStructuralPage = relative === 'index.md' || relative === 'schema.md';
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    let metadata = '';
    if (!frontmatter && !isStructuralPage) report(file, 'missing YAML frontmatter');
    if (frontmatter) metadata = frontmatter[1];
    if (!isStructuralPage && frontmatter) {
      const title = metadata.match(/^title:\s*["']?([^"'\r\n]+)["']?\s*$/m)?.[1]?.trim();
      const status = metadata.match(/^status:\s*([a-z_-]+)\s*$/m)?.[1];
      const role = metadata.match(/^role:\s*([a-z_-]+)\s*$/m)?.[1];
      if (!title) report(file, 'frontmatter requires a non-empty title');
      if (!knownStatus.has(status)) report(file, `invalid or missing status: ${status ?? '(missing)'}`);
      if (!knownRoles.has(role)) report(file, `invalid or missing role: ${role ?? '(missing)'}`);
      if (!/^## Description\s*$/m.test(text)) report(file, 'missing required ## Description chapter');
    }

    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const destination = match[1].trim().split(/[?#]/, 1)[0];
      if (!destination || /^[a-z][a-z\d+.-]*:/i.test(destination) || destination.startsWith('//')) continue;
      const target = path.resolve(path.dirname(file), decodeURIComponent(destination));
      if (!target.startsWith(`${root}${path.sep}`) && target !== root) {
        report(file, `link escapes repository: ${destination}`);
        continue;
      }
      try {
        await stat(target);
      } catch {
        report(file, `broken local link: ${destination}`);
      }
    }

    for (const match of metadata.matchAll(/^\s+path:\s*["']?([^"'\r\n]+)["']?\s*$/gm)) {
      const source = path.resolve(root, match[1].trim());
      try {
        await stat(source);
      } catch {
        report(file, `missing source reference: ${match[1].trim()}`);
      }
    }
  }

  if (!files.some((file) => path.relative(wikiRoot, file).toLowerCase() === 'index.md')) {
    errors.push('docs/wiki/index.md: missing wiki index');
  }
} catch (error) {
  errors.push(`Unable to validate wiki: ${error.message}`);
}

if (errors.length) {
  console.error(`Wiki validation failed with ${errors.length} issue(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exitCode = 1;
} else {
  console.log('Wiki validation passed.');
}
