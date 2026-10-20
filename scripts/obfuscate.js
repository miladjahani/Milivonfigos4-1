// ============================================================================
// MiliconfigOS v4.0 - موتور مبهم‌سازی پیشرفته (Advanced Worker-Safe AST Obfuscator)
// طراحی‌شده اختصاصی برای Cloudflare Workers & Pages بدون بروز خطای Error 1101
// (مبهم‌سازی مبتنی بر AST Acorn + Terser + جدول رشته‌های رمزنگاری‌شده XOR/Base64 با کش O(1))
// ============================================================================

import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

function loadTerser() {
  const candidates = [
    'terser',
    '/usr/share/nodejs/terser/dist/bundle.min.cjs',
    '/usr/share/nodejs/terser'
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch (_e) {}
  }
  return null;
}

function loadAcorn() {
  const candidates = ['acorn', '/usr/share/nodejs/acorn'];
  for (const c of candidates) {
    try {
      return require(c);
    } catch (_e) {}
  }
  return null;
}

function loadJsObfuscator() {
  try {
    return require('javascript-obfuscator');
  } catch (_e) {
    return null;
  }
}

function xorEncodeToBase64(str, key) {
  const bytes = Buffer.from(str, 'utf8');
  const out = Buffer.allocUnsafe(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ ((key + i * 31) & 0xff);
  }
  return out.toString('base64');
}

// پیمایش AST برای استخراج امن تمام رشته‌های جاوااسکریپت بدون دست زدن به کلیدهای آبجکت یا Template Literalها
function astEncryptStrings(code, xorKey = 0x5a) {
  const acorn = loadAcorn();
  if (!acorn) return { code, vault: [] };

  let ast;
  try {
    ast = acorn.parse(code, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (_e) {
    return { code, vault: [] };
  }

  const vault = [];
  const vaultMap = new Map();
  const replacements = [];

  function registerString(str) {
    if (vaultMap.has(str)) return vaultMap.get(str);
    const idx = vault.length;
    vault.push(xorEncodeToBase64(str, xorKey));
    vaultMap.set(str, idx);
    return idx;
  }

  function walk(node, parent) {
    if (!node || typeof node !== 'object') return;

    if (
      node.type === 'Literal' &&
      typeof node.value === 'string' &&
      node.value.length >= 3 &&
      node.value.length <= 160
    ) {
      const isPropKey =
        parent &&
        (parent.type === 'Property' || parent.type === 'MethodDefinition') &&
        parent.key === node &&
        !parent.computed;
      const isImportOrExport =
        parent &&
        (parent.type === 'ImportDeclaration' ||
          parent.type === 'ExportNamedDeclaration' ||
          parent.type === 'ExportAllDeclaration');
      const isSwitchCaseTest = parent && parent.type === 'SwitchCase' && parent.test === node;
      const isDefaultParam = parent && parent.type === 'AssignmentPattern' && parent.right === node;

      if (!isPropKey && !isImportOrExport && !isSwitchCaseTest && !isDefaultParam) {
        const idx = registerString(node.value);
        replacements.push({
          start: node.start,
          end: node.end,
          replacement: `_0xMiliDec(${idx})`
        });
      }
    }

    for (const key of Object.keys(node)) {
      if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue;
      const child = node[key];
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item.type === 'string') walk(item, node);
        }
      } else if (child && typeof child.type === 'string') {
        walk(child, node);
      }
    }
  }

  walk(ast, null);

  if (replacements.length === 0) {
    return { code, vault: [] };
  }

  replacements.sort((a, b) => b.start - a.start);
  let outCode = code;
  for (const r of replacements) {
    outCode = outCode.slice(0, r.start) + r.replacement + outCode.slice(r.end);
  }

  return { code: outCode, vault };
}

export async function obfuscateWorkerBundle(rawEsmCode) {
  const lines = rawEsmCode.split('\n');
  const importLines = [];
  const bodyLines = [];

  for (const line of lines) {
    if (/^\s*import\s+.*from\s+['"]cloudflare:sockets['"]\s*;?\s*$/.test(line)) {
      importLines.push(line.trim());
    } else {
      bodyLines.push(line);
    }
  }

  const headerImport =
    importLines.length > 0
      ? importLines[0]
      : `import { connect as cfConnect } from 'cloudflare:sockets';`;

  let bodyCode = bodyLines.join('\n');
  bodyCode = bodyCode.replace(/export\s+default\s+\{/, 'const __MILI_WORKER_EXPORT__ = {');

  const JavaScriptObfuscator = loadJsObfuscator();
  if (JavaScriptObfuscator) {
    const obfResult = JavaScriptObfuscator.obfuscate(bodyCode, {
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: false,
      stringArray: true,
      stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75,
      stringArrayRotate: true,
      stringArrayShuffle: true,
      stringArrayWrappersCount: 2,
      stringArrayWrappersChainedCalls: false,
      renameGlobals: false,
      identifierNamesGenerator: 'hexadecimal',
      renameProperties: false,
      target: 'node',
      numbersToExpressions: true,
      simplify: true,
      splitStrings: false,
      transformObjectKeys: false,
      unicodeEscapeSequence: false,
      selfDefending: false,
      debugProtection: false,
      disableConsoleOutput: false,
      reservedNames: ['__MILI_WORKER_EXPORT__', 'cfConnect', 'fetch']
    });
    return `${headerImport}\n${obfResult.getObfuscatedCode()}\nexport default __MILI_WORKER_EXPORT__;\n`;
  }

  const xorKey = 0x5a;
  const { code: astEncryptedCode, vault } = astEncryptStrings(bodyCode, xorKey);

  const vaultRuntime =
    vault.length > 0
      ? `const _0xMiliVault = ${JSON.stringify(vault)};
const _0xMiliCache = Object.create(null);
function _0xMiliDec(_0xIdx) {
  if (_0xMiliCache[_0xIdx] !== undefined) return _0xMiliCache[_0xIdx];
  const _0xRaw = atob(_0xMiliVault[_0xIdx]);
  const _0xBytes = new Uint8Array(_0xRaw.length);
  for (let _0xI = 0; _0xI < _0xRaw.length; _0xI++) {
    _0xBytes[_0xI] = _0xRaw.charCodeAt(_0xI) ^ ((${xorKey} + (_0xI * 31)) & 0xff);
  }
  const _0xStr = new TextDecoder().decode(_0xBytes);
  _0xMiliCache[_0xIdx] = _0xStr;
  return _0xStr;
}\n`
      : '';

  // قرار دادن export default داخل کد ورودی Terser تا از حذف درختی (Tree-Shaking) جلوگیری شود
  const combined = `${vaultRuntime}${astEncryptedCode}\nexport default __MILI_WORKER_EXPORT__;\n`;
  const terser = loadTerser();

  if (terser && typeof terser.minify === 'function') {
    const minified = await terser.minify(combined, {
      ecma: 2022,
      module: true,
      compress: {
        passes: 2,
        dead_code: true,
        drop_debugger: true,
        conditionals: true,
        evaluate: false,
        booleans: true,
        loops: true,
        unused: true
      },
      mangle: {
        toplevel: true,
        reserved: ['__MILI_WORKER_EXPORT__', 'cfConnect', 'fetch', 'WebSocketPair']
      },
      format: {
        comments: false,
        ascii_only: false
      }
    });
    if (minified && minified.code) {
      return `${headerImport}\n${minified.code}\n`;
    }
  }

  return `${headerImport}\n${combined}`;
}
