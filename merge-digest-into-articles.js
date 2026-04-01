#!/usr/bin/env node
/**
 * Merge a daily digest into the articles array.
 *
 * Reads articles JSON from stdin or file, adds/updates the digest by slug,
 * outputs the merged JSON. Digest is placed at the start of the array.
 *
 * Usage:
 *   cat automation-output.json | node scripts/merge-digest-into-articles.js digest.json
 *   node scripts/merge-digest-into-articles.js articles.json digest.json
 */

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const args = process.argv.slice(2);
  const digestPath = args[0];
  const articlesPath = args[1];

  if (!digestPath) {
    console.error('Usage: node merge-digest-into-articles.js <digest.json> [articles.json]');
    process.exit(1);
  }

  const fs = await import('fs');

  let articlesData;
  if (articlesPath) {
    articlesData = JSON.parse(fs.readFileSync(articlesPath, 'utf8'));
  } else {
    articlesData = JSON.parse(await readStdin());
  }

  const digest = JSON.parse(fs.readFileSync(digestPath, 'utf8'));

  if (digest.type !== 'daily-digest' || !digest.slug?.startsWith('daily-digest-')) {
    throw new Error('Invalid digest: must have type "daily-digest" and slug "daily-digest-YYYY-MM-DD"');
  }

  const list = Array.isArray(articlesData) ? articlesData : articlesData.articles || [];
  const withoutDigest = list.filter((a) => a.slug !== digest.slug);
  const merged = [digest, ...withoutDigest];

  const output = Array.isArray(articlesData)
    ? merged
    : { ...articlesData, articles: merged };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
