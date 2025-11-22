/**
 * GradeFlow OpenAPI schema extractor (all buckets self-contained with local refs)
 *
 * Implements:
 * 1) Download http://127.0.0.1:8000/openapi.json
 * 2) Normalise component schema names:
 *    - Remove suffix "-Input" (rename to base)
 *    - Remove/exclude all items with suffix "-Output"
 *    - Maintain nameMap for rewriting refs: original -> normalised
 * 3) Extract into buckets, EACH INCLUDING all transitive $ref dependencies and rewriting refs:
 *    - *Question   -> src/schemas/questions.json
 *    - *Rule       -> src/schemas/rules.json
 *    - *Submission -> src/schemas/submissions.json
 *    - *Request    -> src/schemas/requests.json
 *    - *Response   -> src/schemas/responses.json
 *    - everything else -> src/schemas/others.json (no dependency pull/rewrite required)
 *
 * For the five primary buckets (questions, rules, submissions, requests, responses):
 *    - Include all transitive $ref dependencies into the same file (via $ref, discriminator.mapping,
 *      and any string that looks like "#/components/schemas/<Name>")
 *    - Rewrite $refs and discriminator.mapping values to local "#/<Name>" where possible
 *
 * Usage:
 *   - Node.js v18+ (global fetch)
 *   - Save as scripts/extract-schemas.js
 *   - Run: node scripts/extract-schemas.js
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const OPENAPI_URL = 'http://127.0.0.1:8000/openapi.json';

const OUT_DIR = path.join(process.cwd(), 'src', 'schemas');
const OUT_FILES = {
  questions: path.join(OUT_DIR, 'questions.json'),
  rules: path.join(OUT_DIR, 'rules.json'),
  submissions: path.join(OUT_DIR, 'submissions.json'),
  requests: path.join(OUT_DIR, 'requests.json'),
  responses: path.join(OUT_DIR, 'responses.json'),
  others: path.join(OUT_DIR, 'others.json'),
};

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

// Extract schema name from "#/components/schemas/<Name>"
function refToSchemaName(ref) {
  const match = ref.match(/#\/components\/schemas\/([^"']+)$/);
  return match ? match[1] : null;
}

function looksLikeComponentsRef(str) {
  return typeof str === 'string' && str.startsWith('#/components/schemas/');
}

function getCategory(name) {
  if (name.includes('Rule') || name.includes('QuestionRule')) return 'rules';
  if (name.includes('Question')) return 'questions';
  if (name.includes('Submission')) return 'submissions';
  if (name.includes('Request')) return 'requests';
  if (name.includes('Response')) return 'responses';
  return 'others';
}

function deepClone(obj) {
  return obj === undefined ? undefined : JSON.parse(JSON.stringify(obj));
}

// Normalise: drop -Output, strip -Input, build nameMap for rewrites
function normaliseSchemas(rawSchemas) {
  const schemas = {};
  const nameMap = new Map(); // originalName -> normalisedName

  for (const [name, schema] of Object.entries(rawSchemas)) {
    if (name.endsWith('-Output')) {
      // Exclude, but map to base for ref rewrites
      nameMap.set(name, name.replace(/-Output$/, ''));
      continue;
    }
    if (name.endsWith('-Input')) {
      const base = name.replace(/-Input$/, '');
      nameMap.set(name, base);
      if (!(base in schemas)) {
        schemas[base] = schema;
      }
    } else {
      nameMap.set(name, name);
      schemas[name] = schema;
    }
  }
  return { schemas, nameMap };
}

// Gather transitive dependency names for a given starting name.
// Traverses:
// - $ref fields
// - discriminator.mapping values
// - any string that looks like a components ref
function gatherTransitiveNames(startNames, schemas, nameMap) {
  const result = new Set();
  const stack = [...startNames];

  while (stack.length) {
    const name = stack.pop();
    if (!name || result.has(name)) continue;
    const schema = schemas[name];
    if (!schema) continue;

    result.add(name);

    // Walk schema to find refs
    const pushIfKnown = (refStr) => {
      const orig = refToSchemaName(refStr);
      if (!orig) return;
      const norm = nameMap.get(orig) || orig;
      if (schemas[norm] && !result.has(norm)) stack.push(norm);
    };

    const walker = (node) => {
      if (node && typeof node === 'object') {
        // discriminator.mapping
        if (node.discriminator && typeof node.discriminator === 'object') {
          const mapping = node.discriminator.mapping;
          if (mapping && typeof mapping === 'object') {
            for (const val of Object.values(mapping)) {
              if (typeof val === 'string' && looksLikeComponentsRef(val)) {
                pushIfKnown(val);
              }
            }
          }
        }
        for (const [k, v] of Object.entries(node)) {
          if (k === '$ref' && typeof v === 'string') {
            pushIfKnown(v);
          } else if (typeof v === 'string' && looksLikeComponentsRef(v)) {
            pushIfKnown(v);
          } else if (v && typeof v === 'object') {
            walker(v);
          }
        }
      }
    };

    walker(schema);
  }

  return result;
}

// Rewrite all refs to local pointers when possible.
// Handles:
// - "$ref": "#/components/schemas/<Name>" -> "#/definitions/<Name>" if <Name> is in localNames
// - discriminator.mapping values like "#/components/schemas/<Name>" -> "#/definitions/<Name>" when local
// - defensively rewrites any string that looks like a components ref
function rewriteRefsToLocal(schemaObj, nameMap, localNames) {
  function rewriteStringRef(str) {
    const origName = refToSchemaName(str);
    if (!origName) return str;
    const normalised = nameMap.get(origName) || origName;
    if (localNames.has(normalised)) {
      return `#/definitions/${normalised}`;
    }
    return `#/components/schemas/${normalised}`;
  }

  function walker(node) {
    if (node && typeof node === 'object') {
      // discriminator.mapping
      if (node.discriminator && typeof node.discriminator === 'object') {
        const mapping = node.discriminator.mapping;
        if (mapping && typeof mapping === 'object') {
          for (const [discKey, discVal] of Object.entries(mapping)) {
            if (typeof discVal === 'string') {
              mapping[discKey] = rewriteStringRef(discVal);
            }
          }
        }
      }

      for (const [k, v] of Object.entries(node)) {
        if (k === '$ref' && typeof v === 'string') {
          node[k] = rewriteStringRef(v);
        } else if (typeof v === 'string' && looksLikeComponentsRef(v)) {
          node[k] = rewriteStringRef(v);
        } else if (v && typeof v === 'object') {
          walker(v);
        }
      }
    }
  }

  walker(schemaObj);
}

// Build a self-contained bucket: include all transitive deps and rewrite refs to local
function buildSelfContainedBucket(seedNames, schemas, nameMap) {
  const allNames = gatherTransitiveNames(seedNames, schemas, nameMap);
  const bucket = {};
  const localNames = new Set(allNames);

  for (const name of allNames) {
    const cloned = deepClone(schemas[name]);
    rewriteRefsToLocal(cloned, nameMap, localNames);
    bucket[name] = cloned;
  }
  return bucket;
}

async function run() {
  console.log(`Fetching OpenAPI spec from ${OPENAPI_URL} ...`);
  const res = await fetch(OPENAPI_URL);
  if (!res.ok) {
    throw new Error(`Failed to download OpenAPI JSON: ${res.status} ${res.statusText}`);
  }
  const openapi = await res.json();

  const rawSchemas = openapi?.components?.schemas;
  if (!rawSchemas || typeof rawSchemas !== 'object') {
    throw new Error('No components.schemas found in OpenAPI document.');
  }

  const { schemas, nameMap } = normaliseSchemas(rawSchemas);

  await ensureDir(OUT_DIR);

  // Partition names into categories by post-normalised name
  const categories = {
    questions: new Set(),
    rules: new Set(),
    submissions: new Set(),
    requests: new Set(),
    responses: new Set(),
    others: new Set(),
  };

  for (const name of Object.keys(schemas)) {
    const cat = getCategory(name);
    categories[cat].add(name);
  }

  // Build self-contained buckets for the five primary categories
  const questionsBucket = buildSelfContainedBucket(categories.questions, schemas, nameMap);
  const rulesBucket = buildSelfContainedBucket(categories.rules, schemas, nameMap);
  const submissionsBucket = buildSelfContainedBucket(categories.submissions, schemas, nameMap);
  const requestsBucket = buildSelfContainedBucket(categories.requests, schemas, nameMap);
  const responsesBucket = buildSelfContainedBucket(categories.responses, schemas, nameMap);

  // Others: everything not already included in any of the above buckets
  const included = new Set([
    ...Object.keys(questionsBucket),
    ...Object.keys(rulesBucket),
    ...Object.keys(submissionsBucket),
    ...Object.keys(requestsBucket),
    ...Object.keys(responsesBucket),
  ]);

  const othersBucket = {};
  for (const [name, schema] of Object.entries(schemas)) {
    if (!included.has(name)) {
      othersBucket[name] = schema; // no rewrite requested for "others"
    }
  }

  // Write output files
  const bucketsToWrite = {
    questions: questionsBucket,
    rules: rulesBucket,
    submissions: submissionsBucket,
    requests: requestsBucket,
    responses: responsesBucket,
    others: othersBucket,
  };

  for (const [key, filePath] of Object.entries(OUT_FILES)) {
    const content = JSON.stringify(bucketsToWrite[key], null, 2);
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`Wrote ${filePath} (${Object.keys(bucketsToWrite[key]).length} schemas)`);
  }

  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});