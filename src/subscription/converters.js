// ============================================================================
// MiliconfigOS v4.0 - مبدل‌های داخلی اشتراک (Clash, Sing-box, Surge, Loon, QuanX, Residential Chain)
// مبدل‌های سازگار با قابلیت‌های پیاده‌سازی‌شده و نام‌گذاری number+miliconfig
// ============================================================================

import { BRAND_NAME } from '../config/defaults.js';
import { decodeBase64Utf8 } from '../core/utils.js';

function quoteYaml(val) {
  if (val == null) return '""';
  const s = String(val);
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}

function normalizeHost(hostname) {
  if (!hostname) return hostname;
  const s = String(hostname);
  if (s.startsWith('[') && s.endsWith(']')) return s.slice(1, -1);
  return s;
}

function buildClashGroupProxies(names, opts = {}) {
  const { directFirst = false, extraGroups = [] } = opts;
  const nodeLines = names.length ? names.map(n => `      - ${quoteYaml(n)}`).join('\n') : '      - DIRECT';
  const lines = [];
  if (directFirst) {
    lines.push('      - "🎯 全球直连"', '      - "🚀 节点选择"');
  } else {
    lines.push('      - "🚀 节点选择"', '      - "🎯 全球直连"');
  }
  for (const g of extraGroups) lines.push(`      - ${quoteYaml(g)}`);
  lines.push(nodeLines);
  return lines.join('\n');
}

function buildIniGroupProxies(names, opts = {}) {
  const { directFirst = false, extraGroups = [], compact = false } = opts;
  const sep = compact ? ',' : ', ';
  const listStr = names.length ? names.join(sep) : 'DIRECT';
  const parts = [];
  if (directFirst) parts.push('🎯 全球直连', '🚀 节点选择');
  else parts.push('🚀 节点选择', '🎯 全球直连');
  parts.push(...extraGroups);
  if (names.length) parts.push(listStr);
  return parts.join(sep);
}

export function parseShareLink(link) {
  try {
    if (link.startsWith('vless://')) {
      const url = new URL(link);
      const params = new URLSearchParams(url.search);
      return {
        proto: 'vless',
        name: decodeURIComponent(url.hash.substring(1)) || `${url.hostname}:${url.port}`,
        uuid: url.username,
        server: normalizeHost(url.hostname),
        port: parseInt(url.port, 10) || 443,
        tls: params.get('security') === 'tls' || params.get('security') === 'reality',
        network: params.get('type') || 'ws',
        path: params.get('path') || '/?ed=2048',
        host: normalizeHost(params.get('host') || url.hostname),
        sni: normalizeHost(params.get('sni') || params.get('host') || url.hostname),
        alpn: (params.get('alpn') || '').split(',').map(s => s.trim()).filter(Boolean),
        fp: params.get('fp') || 'chrome',
        flow: params.get('flow') || '',
        encryption: params.get('encryption') || 'none',
        mode: params.get('mode') || '',
        ech: params.get('ech') || ''
      };
    }
    if (link.startsWith('trojan://')) {
      const url = new URL(link);
      const params = new URLSearchParams(url.search);
      return {
        proto: 'trojan',
        name: decodeURIComponent(url.hash.substring(1)) || `${url.hostname}:${url.port}`,
        password: decodeURIComponent(url.username),
        server: normalizeHost(url.hostname),
        port: parseInt(url.port, 10) || 443,
        tls: params.get('security') !== 'none',
        network: params.get('type') || 'ws',
        path: params.get('path') || '/?ed=2048',
        host: normalizeHost(params.get('host') || url.hostname),
        sni: normalizeHost(params.get('sni') || params.get('host') || url.hostname),
        alpn: (params.get('alpn') || '').split(',').map(s => s.trim()).filter(Boolean),
        fp: params.get('fp') || 'chrome',
        ech: params.get('ech') || ''
      };
    }
    if (link.startsWith('ss://')) {
      const rest = link.substring(5);
      const hashIdx = rest.indexOf('#');
      const mainPart = hashIdx > -1 ? rest.substring(0, hashIdx) : rest;
      const nodeName = hashIdx > -1 ? decodeURIComponent(rest.substring(hashIdx + 1)) : 'Shadowsocks';

      let cipher = 'chacha20-ietf-poly1305';
      let password = '';
      let server = '';
      let port = 443;
      let host = '';
      let path = '/';
      let isTls = true;
      let fp = 'chrome';

      const atIdx = mainPart.indexOf('@');
      if (atIdx > -1) {
        const credPart = mainPart.substring(0, atIdx);
        let credDecoded = credPart;
        try { credDecoded = atob(credPart); } catch (_e) {
          try { credDecoded = decodeURIComponent(credPart); } catch (_e2) {}
        }
        const colonIdx = credDecoded.indexOf(':');
        if (colonIdx > -1) {
          cipher = credDecoded.substring(0, colonIdx);
          password = credDecoded.substring(colonIdx + 1);
        } else {
          password = credDecoded;
        }

        const serverPart = mainPart.substring(atIdx + 1);
        const qIdx = serverPart.indexOf('?');
        const hp = qIdx > -1 ? serverPart.substring(0, qIdx).replace(/\/$/, '') : serverPart.replace(/\/$/, '');
        const query = qIdx > -1 ? serverPart.substring(qIdx + 1) : '';

        let addr = hp;
        let p = 443;
        if (hp.startsWith('[')) {
          const m = hp.match(/^(\[[^\]]+\])(?::(\d+))?$/);
          if (m) { addr = m[1]; p = parseInt(m[2] || '443', 10); }
        } else {
          const cIdx = hp.lastIndexOf(':');
          if (cIdx > -1) {
            addr = hp.substring(0, cIdx);
            p = parseInt(hp.substring(cIdx + 1) || '443', 10);
          }
        }
        server = addr;
        port = p;

        const sp = new URLSearchParams(query);
        host = sp.get('host') || sp.get('sni') || server;
        path = sp.get('path') || '/';
        isTls = sp.get('security') === 'tls' || (sp.get('plugin') || '').includes('tls');
        fp = sp.get('fp') || 'chrome';
      } else {
        try {
          const decoded = atob(mainPart);
          const atInDec = decoded.indexOf('@');
          if (atInDec > -1) {
            const cred = decoded.substring(0, atInDec);
            const srvP = decoded.substring(atInDec + 1);
            const colonIdx = cred.indexOf(':');
            cipher = colonIdx > -1 ? cred.substring(0, colonIdx) : cipher;
            password = colonIdx > -1 ? cred.substring(colonIdx + 1) : cred;
            const cIdx = srvP.lastIndexOf(':');
            if (cIdx > -1) {
              server = srvP.substring(0, cIdx);
              port = parseInt(srvP.substring(cIdx + 1) || '443', 10);
            } else {
              server = srvP;
            }
            host = server;
          }
        } catch (_e) {}
      }

      if (server) {
        return {
          proto: 'ss',
          name: nodeName,
          cipher,
          password,
          server: normalizeHost(server),
          port,
          tls: isTls,
          network: 'ws',
          path,
          host: normalizeHost(host),
          sni: normalizeHost(host),
          fp
        };
      }
    }
  } catch (_e) {}
  return null;
}

function buildClashNodeYaml(node, customECHDomain = 'cloudflare-ech.com') {
  const lines = [];
  const srv = normalizeHost(node.server);
  const host = normalizeHost(node.host) || srv;
  const sni = normalizeHost(node.sni) || host;
  lines.push(`  - name: ${quoteYaml(node.name)}`);
  lines.push(`    type: ${node.proto}`);
  lines.push(`    server: ${quoteYaml(srv)}`);
  lines.push(`    port: ${node.port}`);
  if (node.proto === 'vless') {
    lines.push(`    uuid: ${node.uuid}`);
    lines.push(`    udp: true`);
    lines.push(`    tls: ${node.tls ? 'true' : 'false'}`);
    if (node.flow) lines.push(`    flow: ${quoteYaml(node.flow)}`);
    lines.push(`    client-fingerprint: ${quoteYaml(node.fp || 'chrome')}`);
  } else if (node.proto === 'trojan') {
    lines.push(`    password: ${quoteYaml(node.password)}`);
    lines.push(`    udp: true`);
    lines.push(`    client-fingerprint: ${quoteYaml(node.fp || 'chrome')}`);
  } else if (node.proto === 'ss') {
    lines.push(`    cipher: ${quoteYaml(node.cipher || 'chacha20-ietf-poly1305')}`);
    lines.push(`    password: ${quoteYaml(node.password)}`);
    lines.push(`    udp: true`);
    lines.push(`    plugin: v2ray-plugin`);
    lines.push(`    plugin-opts:`);
    lines.push(`      mode: websocket`);
    lines.push(`      tls: ${node.tls ? 'true' : 'false'}`);
    lines.push(`      skip-cert-verify: false`);
    lines.push(`      host: ${quoteYaml(host)}`);
    lines.push(`      path: ${quoteYaml(node.path || '/')}`);
    if (node.fp) lines.push(`    client-fingerprint: ${quoteYaml(node.fp)}`);
  }
  if (node.tls) {
    lines.push(`    servername: ${quoteYaml(sni)}`);
    if (node.alpn && node.alpn.length) {
      lines.push(`    alpn: [${node.alpn.map(a => quoteYaml(a)).join(', ')}]`);
    }
    lines.push(`    skip-cert-verify: false`);
  }
  if (node.network === 'ws' || node.network === 'xhttp') {
    lines.push(`    network: ws`);
    lines.push(`    ws-opts:`);
    lines.push(`      path: ${quoteYaml(node.path)}`);
    lines.push(`      headers:`);
    lines.push(`        Host: ${quoteYaml(host)}`);
  } else if (node.network === 'grpc') {
    lines.push(`    network: grpc`);
    lines.push(`    grpc-opts:`);
    lines.push(`      grpc-service-name: ${quoteYaml(node.path)}`);
  }
  if (node.ech) {
    const echDomain = customECHDomain || 'cloudflare-ech.com';
    lines.push(`    ech-opts:`);
    lines.push(`      enable: true`);
    lines.push(`      query-server-name: ${quoteYaml(echDomain)}`);
  }
  return lines.join('\n');
}

export function generateClashConfig(links, options = {}) {
  const customDNS = options.customDNS || 'https://cloudflare-dns.com/dns-query';
  const customECHDomain = options.customECHDomain || 'cloudflare-ech.com';
  const nodes = links.map(parseShareLink).filter(n => n && (n.proto === 'vless' || n.proto === 'trojan' || n.proto === 'ss'));
  const names = nodes.map(n => n.name);

  const header = [
    '# MiliconfigOS v4.0 - Clash / Mihomo Subscription',
    'mixed-port: 7890',
    'allow-lan: true',
    'mode: rule',
    'log-level: info',
    'ipv6: true',
    'external-controller: 127.0.0.1:9090',
    'unified-delay: true',
    'tcp-concurrent: true',
    'geodata-mode: true',
    'geo-auto-update: true',
    'geo-update-interval: 24',
    'geox-url:',
    '  geoip: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat"',
    '  geosite: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat"',
    '  mmdb: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/country.mmdb"',
    '  asn: "https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/GeoLite2-ASN.mmdb"',
    'sniffer:',
    '  enable: true',
    '  force-dns-mapping: true',
    '  parse-pure-ip: true',
    '  sniff:',
    '    HTTP:',
    '      ports: [80, 8080-8880]',
    '      override-destination: true',
    '    TLS:',
    '      ports: [443, 8443]',
    '    QUIC:',
    '      ports: [443, 8443]',
    'dns:',
    '  enable: true',
    '  listen: 0.0.0.0:1053',
    '  ipv6: true',
    '  enhanced-mode: fake-ip',
    '  fake-ip-range: 198.18.0.1/16',
    '  fake-ip-filter:',
    '    - "*.lan"',
    '    - "+.local"',
    '    - "+.market.xiaomi.com"',
    '    - "+.msftconnecttest.com"',
    '    - "+.msftncsi.com"',
    '    - "localhost.ptlogin2.qq.com"',
    '    - "+.srv.nintendo.net"',
    '    - "+.stun.playstation.net"',
    '    - "+.xboxlive.com"',
    '  default-nameserver:',
    '    - 223.5.5.5',
    '    - 119.29.29.29',
    '  nameserver:',
    `    - ${customDNS}`,
    '    - https://119.29.29.29/dns-query',
    '  fallback:',
    '    - https://1.1.1.1/dns-query',
    '    - https://8.8.8.8/dns-query',
    '  fallback-filter:',
    '    geoip: true',
    '    geoip-code: CN',
    '    ipcidr:',
    '      - 240.0.0.0/4',
    ''
  ];

  const proxiesSection = ['proxies:'];
  for (const n of nodes) proxiesSection.push(buildClashNodeYaml(n, customECHDomain));

  const nodesOnly = names.length ? names.map(n => `      - ${quoteYaml(n)}`).join('\n') : '      - DIRECT';
  const groupsSection = [
    'proxy-groups:',
    '  - name: "🚀 节点选择"',
    '    type: select',
    '    proxies:',
    '      - "🎯 全球直连"',
    nodesOnly,
    '  - name: "🌍 国外媒体"',
    '    type: select',
    '    proxies:',
    buildClashGroupProxies(names),
    '  - name: "📺 哔哩哔哩"',
    '    type: select',
    '    proxies:',
    buildClashGroupProxies(names, { directFirst: true }),
    '  - name: "📹 油管视频"',
    '    type: select',
    '    proxies:',
    buildClashGroupProxies(names, { extraGroups: ['🌍 国外媒体'] }),
    '  - name: "🎬 奈飞视频"',
    '    type: select',
    '    proxies:',
    buildClashGroupProxies(names, { extraGroups: ['🌍 国外媒体'] }),
    '  - name: "📲 电报信息"',
    '    type: select',
    '    proxies:',
    buildClashGroupProxies(names),
    '  - name: "🌐 谷歌服务"',
    '    type: select',
    '    proxies:',
    buildClashGroupProxies(names),
    '  - name: "🤖 OpenAI"',
    '    type: select',
    '    proxies:',
    buildClashGroupProxies(names),
    '  - name: "Ⓜ️ 微软服务"',
    '    type: select',
    '    proxies:',
    buildClashGroupProxies(names, { directFirst: true }),
    '  - name: "🍎 苹果服务"',
    '    type: select',
    '    proxies:',
    buildClashGroupProxies(names, { directFirst: true }),
    '  - name: "🎯 全球直连"',
    '    type: select',
    '    proxies:',
    '      - DIRECT',
    '  - name: "🛑 全球拦截"',
    '    type: select',
    '    proxies:',
    '      - REJECT',
    '      - DIRECT',
    '  - name: "🍃 应用净化"',
    '    type: select',
    '    proxies:',
    '      - REJECT',
    '      - DIRECT',
    '  - name: "🐟 漏网之鱼"',
    '    type: select',
    '    proxies:',
    buildClashGroupProxies(names),
    ''
  ];

  const ruleBase = 'https://fastly.jsdelivr.net/gh/Loyalsoldier/clash-rules@release';
  const provider = (name, behavior) => [
    `  ${name}:`,
    `    type: http`,
    `    behavior: ${behavior}`,
    `    url: "${ruleBase}/${name}.txt"`,
    `    path: ./rulesets/loyalsoldier/${name}.txt`,
    `    interval: 86400`
  ].join('\n');

  const ruleProviders = [
    'rule-providers:',
    provider('reject', 'domain'),
    provider('icloud', 'domain'),
    provider('apple', 'domain'),
    provider('google', 'domain'),
    provider('proxy', 'domain'),
    provider('direct', 'domain'),
    provider('private', 'domain'),
    provider('gfw', 'domain'),
    provider('greatfire', 'domain'),
    provider('tld-not-cn', 'domain'),
    provider('telegramcidr', 'ipcidr'),
    provider('cncidr', 'ipcidr'),
    provider('lancidr', 'ipcidr'),
    provider('applications', 'classical'),
    ''
  ];

  const rules = [
    'rules:',
    '  - DOMAIN-SUFFIX,acl4.ssr,🎯 全球直连',
    '  - DOMAIN-SUFFIX,local,🎯 全球直连',
    '  - DOMAIN,clash.razord.top,🎯 全球直连',
    '  - DOMAIN,yacd.haishan.me,🎯 全球直连',
    '  - DOMAIN,yacd.metacubex.one,🎯 全球直连',
    '  - DOMAIN,d.metacubex.one,🎯 全球直连',
    '  - DOMAIN-SUFFIX,googleapis.cn,🌐 谷歌服务',
    '  - DOMAIN-SUFFIX,gstatic.com,🌐 谷歌服务',
    '  - DOMAIN-SUFFIX,xn--ngstr-lra8j.com,🌐 谷歌服务',
    '  - DOMAIN-SUFFIX,googlevideo.com,📹 油管视频',
    '  - DOMAIN-SUFFIX,googleusercontent.com,🌐 谷歌服务',
    '  - DOMAIN-KEYWORD,youtube,📹 油管视频',
    '  - DOMAIN-SUFFIX,youtube.com,📹 油管视频',
    '  - DOMAIN-SUFFIX,youtu.be,📹 油管视频',
    '  - DOMAIN-KEYWORD,netflix,🎬 奈飞视频',
    '  - DOMAIN-SUFFIX,nflxext.com,🎬 奈飞视频',
    '  - DOMAIN-SUFFIX,nflxso.net,🎬 奈飞视频',
    '  - DOMAIN-SUFFIX,nflxvideo.net,🎬 奈飞视频',
    '  - DOMAIN-SUFFIX,nflximg.com,🎬 奈飞视频',
    '  - DOMAIN-SUFFIX,nflximg.net,🎬 奈飞视频',
    '  - DOMAIN-SUFFIX,netflix.com,🎬 奈飞视频',
    '  - DOMAIN-SUFFIX,netflix.net,🎬 奈飞视频',
    '  - DOMAIN-SUFFIX,bilibili.com,📺 哔哩哔哩',
    '  - DOMAIN-SUFFIX,bilivideo.com,📺 哔哩哔哩',
    '  - DOMAIN-SUFFIX,hdslb.com,📺 哔哩哔哩',
    '  - DOMAIN-KEYWORD,openai,🤖 OpenAI',
    '  - DOMAIN-KEYWORD,chatgpt,🤖 OpenAI',
    '  - DOMAIN-SUFFIX,openai.com,🤖 OpenAI',
    '  - DOMAIN-SUFFIX,chatgpt.com,🤖 OpenAI',
    '  - DOMAIN-SUFFIX,oaistatic.com,🤖 OpenAI',
    '  - DOMAIN-SUFFIX,oaiusercontent.com,🤖 OpenAI',
    '  - DOMAIN-SUFFIX,anthropic.com,🤖 OpenAI',
    '  - DOMAIN-SUFFIX,claude.ai,🤖 OpenAI',
    '  - DOMAIN-SUFFIX,perplexity.ai,🤖 OpenAI',
    '  - DOMAIN-SUFFIX,gemini.google.com,🤖 OpenAI',
    '  - RULE-SET,applications,🎯 全球直连',
    '  - RULE-SET,private,🎯 全球直连',
    '  - RULE-SET,reject,🛑 全球拦截',
    '  - RULE-SET,icloud,🍎 苹果服务',
    '  - RULE-SET,apple,🍎 苹果服务',
    '  - RULE-SET,google,🌐 谷歌服务',
    '  - RULE-SET,proxy,🚀 节点选择',
    '  - RULE-SET,gfw,🚀 节点选择',
    '  - RULE-SET,greatfire,🚀 节点选择',
    '  - RULE-SET,tld-not-cn,🚀 节点选择',
    '  - RULE-SET,direct,🎯 全球直连',
    '  - RULE-SET,lancidr,🎯 全球直连,no-resolve',
    '  - RULE-SET,cncidr,🎯 全球直连,no-resolve',
    '  - RULE-SET,telegramcidr,📲 电报信息,no-resolve',
    '  - GEOIP,LAN,🎯 全球直连,no-resolve',
    '  - GEOIP,CN,🎯 全球直连,no-resolve',
    '  - MATCH,🐟 漏网之鱼'
  ];

  return [header.join('\n'), proxiesSection.join('\n'), '', groupsSection.join('\n'), ruleProviders.join('\n'), rules.join('\n'), ''].join('\n');
}

function splitDnsAddress(addr) {
  const text = String(addr || '').trim();
  try {
    const url = new URL(text);
    const proto = url.protocol.replace(':', '').toLowerCase();
    if (proto === 'https' || proto === 'http3' || proto === 'h3') {
      const out = { type: 'https', server: url.hostname };
      if (url.port) out.server_port = Number(url.port);
      if (url.pathname && url.pathname !== '/' && url.pathname !== '/dns-query') out.path = url.pathname;
      return out;
    }
    if (proto === 'tls') return { type: 'tls', server: url.hostname };
    if (proto === 'quic') return { type: 'quic', server: url.hostname };
    if (proto === 'udp' || proto === 'dns') return { type: 'udp', server: url.hostname };
  } catch (_e) {}
  return { type: 'udp', server: text.replace(/^[a-z0-9]+:\/\//i, '').split('/')[0] || '223.5.5.5' };
}

export function generateSingboxConfig(links, options = {}) {
  const customDNS = options.customDNS || 'https://cloudflare-dns.com/dns-query';
  const nodes = links.map(parseShareLink).filter(n => n && (n.proto === 'vless' || n.proto === 'trojan' || n.proto === 'ss'));
  const outboundTags = nodes.map(n => n.name);

  function buildOutbound(n) {
    const out = {
      type: n.proto,
      tag: n.name,
      server: normalizeHost(n.server),
      server_port: n.port
    };
    if (n.proto === 'vless') {
      out.uuid = n.uuid;
      if (n.flow) out.flow = n.flow;
    } else if (n.proto === 'trojan') {
      out.password = n.password;
    } else if (n.proto === 'ss') {
      out.type = 'shadowsocks';
      out.method = n.cipher || 'chacha20-ietf-poly1305';
      out.password = n.password;
    }
    if (n.tls) {
      out.tls = {
        enabled: true,
        server_name: n.sni,
        insecure: false,
        utls: {
          enabled: true,
          fingerprint: n.fp || 'chrome'
        }
      };
      if (n.alpn && n.alpn.length) out.tls.alpn = n.alpn;
      if (n.ech) {
        out.tls.ech = {
          enabled: true,
          pq_signature_schemes_enabled: false,
          dynamic_record_sizing_disabled: false
        };
      }
    }
    if (n.network === 'ws' || n.network === 'xhttp') {
      out.transport = {
        type: 'ws',
        path: n.path,
        headers: { Host: n.host },
        max_early_data: 2048,
        early_data_header_name: 'Sec-WebSocket-Protocol'
      };
    } else if (n.network === 'grpc') {
      out.transport = {
        type: 'grpc',
        service_name: n.path
      };
    }
    return out;
  }

  const geositeBase = 'https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geosite';
  const geoipBase = 'https://fastly.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@sing/geo/geoip';
  const geositeRule = name => ({
    tag: `geosite-${name}`,
    type: 'remote',
    format: 'binary',
    url: `${geositeBase}/${name}.srs`,
    download_detour: 'direct'
  });
  const geoipRule = name => ({
    tag: `geoip-${name}`,
    type: 'remote',
    format: 'binary',
    url: `${geoipBase}/${name}.srs`,
    download_detour: 'direct'
  });

  const config = {
    log: { level: 'info', timestamp: true },
    dns: {
      servers: [
        { ...splitDnsAddress(customDNS), tag: 'remote', detour: 'select' },
        { type: 'udp', tag: 'local', server: '223.5.5.5', detour: 'direct' },
        { type: 'fakeip', tag: 'fakeip', inet4_range: '198.18.0.0/15', inet6_range: 'fc00::/18' }
      ],
      rules: [
        { rule_set: 'geosite-category-ads-all', action: 'reject' },
        { rule_set: 'geosite-cn', server: 'local' },
        { query_type: ['A', 'AAAA'], server: 'fakeip' }
      ],
      strategy: 'ipv4_only'
    },
    inbounds: [
      { type: 'mixed', tag: 'mixed-in', listen: '127.0.0.1', listen_port: 2080 },
      {
        type: 'tun',
        tag: 'tun-in',
        interface_name: 'sing-box',
        address: ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'],
        mtu: 9000,
        auto_route: true,
        strict_route: true,
        stack: 'mixed'
      }
    ],
    outbounds: [
      { type: 'selector', tag: 'select', outbounds: ['direct', ...outboundTags], default: outboundTags[0] || 'direct' },
      { type: 'selector', tag: '🌍 国外媒体', outbounds: ['select', 'direct', ...outboundTags] },
      { type: 'selector', tag: '📲 电报信息', outbounds: ['select', 'direct', ...outboundTags] },
      { type: 'selector', tag: '🌐 谷歌服务', outbounds: ['select', 'direct', ...outboundTags] },
      { type: 'selector', tag: '🤖 OpenAI', outbounds: ['select', 'direct', ...outboundTags] },
      { type: 'selector', tag: 'Ⓜ️ 微软服务', outbounds: ['direct', 'select', ...outboundTags] },
      { type: 'selector', tag: '🍎 苹果服务', outbounds: ['direct', 'select', ...outboundTags] },
      { type: 'selector', tag: '📺 哔哩哔哩', outbounds: ['direct', 'select', ...outboundTags] },
      { type: 'selector', tag: '📹 油管视频', outbounds: ['select', '🌍 国外媒体', 'direct', ...outboundTags] },
      { type: 'selector', tag: '🎬 奈飞视频', outbounds: ['select', '🌍 国外媒体', 'direct', ...outboundTags] },
      { type: 'selector', tag: '🎯 全球直连', outbounds: ['direct'] },
      { type: 'selector', tag: '🐟 漏网之鱼', outbounds: ['select', 'direct', ...outboundTags] },
      ...nodes.map(buildOutbound),
      { type: 'direct', tag: 'direct' }
    ],
    route: {
      rule_set: [
        geositeRule('cn'), geositeRule('private'), geositeRule('apple'), geositeRule('apple-cn'),
        geositeRule('microsoft'), geositeRule('microsoft@cn'), geositeRule('google'), geositeRule('telegram'),
        geositeRule('openai'), geositeRule('anthropic'), geositeRule('youtube'), geositeRule('netflix'),
        geositeRule('disney'), geositeRule('spotify'), geositeRule('tiktok'), geositeRule('twitter'),
        geositeRule('facebook'), geositeRule('github'), geositeRule('geolocation-!cn'),
        geositeRule('category-ads-all'), geoipRule('cn'), geoipRule('private'), geoipRule('telegram')
      ],
      rules: [
        { action: 'sniff' },
        { protocol: 'dns', action: 'hijack-dns' },
        { ip_is_private: true, outbound: 'direct' },
        { rule_set: 'geosite-category-ads-all', action: 'reject' },
        { rule_set: 'geosite-private', outbound: 'direct' },
        { rule_set: 'geosite-apple-cn', outbound: 'direct' },
        { rule_set: 'geosite-microsoft@cn', outbound: 'direct' },
        { rule_set: 'geosite-apple', outbound: '🍎 苹果服务' },
        { rule_set: 'geosite-microsoft', outbound: 'Ⓜ️ 微软服务' },
        { rule_set: 'geosite-openai', outbound: '🤖 OpenAI' },
        { rule_set: 'geosite-anthropic', outbound: '🤖 OpenAI' },
        { rule_set: 'geosite-telegram', outbound: '📲 电报信息' },
        { rule_set: 'geoip-telegram', outbound: '📲 电报信息' },
        { rule_set: 'geosite-google', outbound: '🌐 谷歌服务' },
        { rule_set: 'geosite-youtube', outbound: '🌍 国外媒体' },
        { rule_set: 'geosite-netflix', outbound: '🌍 国外媒体' },
        { rule_set: 'geosite-disney', outbound: '🌍 国外媒体' },
        { rule_set: 'geosite-spotify', outbound: '🌍 国外媒体' },
        { rule_set: 'geosite-tiktok', outbound: '🌍 国外媒体' },
        { rule_set: 'geosite-twitter', outbound: '🌍 国外媒体' },
        { rule_set: 'geosite-facebook', outbound: '🌍 国外媒体' },
        { rule_set: 'geosite-github', outbound: 'select' },
        { rule_set: 'geosite-geolocation-!cn', outbound: 'select' },
        { rule_set: 'geosite-cn', outbound: 'direct' },
        { rule_set: 'geoip-cn', outbound: 'direct' },
        { ip_is_private: true, outbound: 'direct' }
      ],
      final: '🐟 漏网之鱼',
      default_domain_resolver: { server: 'local' },
      auto_detect_interface: true
    },
    experimental: {
      cache_file: { enabled: true, store_fakeip: true },
      clash_api: { external_controller: '127.0.0.1:9090' }
    }
  };

  return JSON.stringify(config, null, 2);
}

const aclRuleBase = 'https://fastly.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/Clash';
const aclRule = name => `${aclRuleBase}/${name}.list`;

export function generateSurgeConfig(links, options = {}) {
  const customDNS = options.customDNS || '223.5.5.5';
  const nodes = links.map(parseShareLink).filter(n => n && (n.proto === 'trojan' || n.proto === 'ss'));
  const names = nodes.map(n => n.name);
  const lines = [
    '[General]',
    'loglevel = notify',
    'internet-test-url = http://www.apple.com/library/test/success.html',
    'proxy-test-url = http://www.gstatic.com/generate_204',
    'test-timeout = 3',
    `dns-server = ${customDNS.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}, 119.29.29.29, system`,
    'encrypted-dns-server = https://cloudflare-dns.com/dns-query, https://dns.google/dns-query',
    'ipv6 = true',
    'allow-wifi-access = false',
    'wifi-access-http-port = 6152',
    'wifi-access-socks5-port = 6153',
    'skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, localhost, *.local, captive.apple.com',
    'exclude-simple-hostnames = true',
    'show-error-page-for-reject = true',
    '',
    '[Proxy]'
  ];
  for (const n of nodes) {
    if (n.proto === 'trojan') {
      lines.push(`${n.name} = trojan, ${n.server}, ${n.port}, password=${n.password}, sni=${n.sni}, ws=true, ws-path=${n.path}, ws-headers=Host:${n.host}, skip-cert-verify=false, tfo=true`);
    } else if (n.proto === 'ss') {
      lines.push(`${n.name} = ss, ${n.server}, ${n.port}, encrypt-method=${n.cipher || 'chacha20-ietf-poly1305'}, password=${n.password}, ws=true, ws-path=${n.path || '/'}, ws-headers=Host:${n.host}, tls=${n.tls ? 'true' : 'false'}, sni=${n.sni}`);
    }
  }
  if (!nodes.length) {
    lines.push('Direct = direct');
  }
  lines.push('', '[Proxy Group]');
  const listStr = names.length ? names.join(', ') : 'DIRECT';
  lines.push(`🚀 节点选择 = select, 🎯 全球直连, ${listStr}`);
  lines.push(`🌍 国外媒体 = select, ${buildIniGroupProxies(names)}`);
  lines.push(`📺 哔哩哔哩 = select, ${buildIniGroupProxies(names, { directFirst: true })}`);
  lines.push(`📹 油管视频 = select, ${buildIniGroupProxies(names, { extraGroups: ['🌍 国外媒体'] })}`);
  lines.push(`🎬 奈飞视频 = select, ${buildIniGroupProxies(names, { extraGroups: ['🌍 国外媒体'] })}`);
  lines.push(`📲 电报信息 = select, ${buildIniGroupProxies(names)}`);
  lines.push(`🌐 谷歌服务 = select, ${buildIniGroupProxies(names)}`);
  lines.push(`🤖 OpenAI = select, ${buildIniGroupProxies(names)}`);
  lines.push(`Ⓜ️ 微软服务 = select, ${buildIniGroupProxies(names, { directFirst: true })}`);
  lines.push(`🍎 苹果服务 = select, ${buildIniGroupProxies(names, { directFirst: true })}`);
  lines.push(`🎯 全球直连 = select, DIRECT`);
  lines.push(`🛑 全球拦截 = select, REJECT, DIRECT`);
  lines.push(`🐟 漏网之鱼 = select, ${buildIniGroupProxies(names)}`);
  lines.push('', '[Rule]');
  lines.push(`RULE-SET,${aclRule('LocalAreaNetwork')},🎯 全球直连`);
  lines.push(`RULE-SET,${aclRule('UnBan')},🎯 全球直连`);
  lines.push(`RULE-SET,${aclRule('BanAD')},🛑 全球拦截`);
  lines.push(`RULE-SET,${aclRule('BanProgramAD')},🛑 全球拦截`);
  lines.push(`RULE-SET,${aclRule('GoogleFCM')},🌐 谷歌服务`);
  lines.push(`RULE-SET,${aclRule('GoogleCN')},🎯 全球直连`);
  lines.push(`RULE-SET,${aclRule('SteamCN')},🎯 全球直连`);
  lines.push(`RULE-SET,${aclRule('Microsoft')},Ⓜ️ 微软服务`);
  lines.push(`RULE-SET,${aclRule('Apple')},🍎 苹果服务`);
  lines.push(`RULE-SET,${aclRule('Telegram')},📲 电报信息`);
  lines.push(`RULE-SET,${aclRule('OpenAi')},🤖 OpenAI`);
  lines.push(`RULE-SET,${aclRule('Claude')},🤖 OpenAI`);
  lines.push(`RULE-SET,${aclRule('Copilot')},🤖 OpenAI`);
  lines.push(`RULE-SET,${aclRule('Netflix')},🌍 国外媒体`);
  lines.push(`RULE-SET,${aclRule('YouTube')},🌍 国外媒体`);
  lines.push(`RULE-SET,${aclRule('Disney')},🌍 国外媒体`);
  lines.push(`RULE-SET,${aclRule('Spotify')},🌍 国外媒体`);
  lines.push(`RULE-SET,${aclRule('TikTok')},🌍 国外媒体`);
  lines.push(`RULE-SET,${aclRule('BiliBili')},📺 哔哩哔哩`);
  lines.push(`RULE-SET,${aclRule('ProxyMedia')},🌍 国外媒体`);
  lines.push(`RULE-SET,${aclRule('ProxyGFWlist')},🚀 节点选择`);
  lines.push(`RULE-SET,${aclRule('ChinaDomain')},🎯 全球直连`);
  lines.push(`RULE-SET,${aclRule('ChinaCompanyIp')},🎯 全球直连`);
  lines.push(`RULE-SET,${aclRule('ChinaIp')},🎯 全球直连`);
  lines.push('GEOIP,CN,🎯 全球直连');
  lines.push('FINAL,🐟 漏网之鱼,dns-failed');
  return lines.join('\n');
}

export function generateLoonConfig(links, options = {}) {
  const customDNS = options.customDNS || '223.5.5.5';
  const nodes = links.map(parseShareLink).filter(n => n && (n.proto === 'vless' || n.proto === 'trojan' || n.proto === 'ss'));
  const names = nodes.map(n => n.name);
  const lines = [
    '[General]',
    'ip-mode = dual',
    `dns-server = ${customDNS.replace(/^https?:\/\//, '').replace(/\/.*$/, '')},119.29.29.29,system`,
    'doh-server = https://cloudflare-dns.com/dns-query, https://dns.google/dns-query',
    'allow-udp-proxy = true',
    'allow-wifi-access = false',
    'sni-sniffing = true',
    'skip-proxy = 127.0.0.1,192.168.0.0/16,10.0.0.0/8,172.16.0.0/12,localhost,*.local,captive.apple.com',
    'bypass-tun = 10.0.0.0/8,100.64.0.0/10,127.0.0.0/8,169.254.0.0/16,172.16.0.0/12,192.0.0.0/24,192.0.2.0/24,192.88.99.0/24,192.168.0.0/16,198.51.100.0/24,203.0.113.0/24,224.0.0.0/4,255.255.255.255/32',
    '',
    '[Proxy]'
  ];
  for (const n of nodes) {
    if (n.proto === 'vless') {
      const parts = [`${n.server}`, `${n.port}`, `udp=true`, `username=${n.uuid}`, `transport=ws`, `path=${n.path}`, `host=${n.host}`, `over-tls=${n.tls ? 'true' : 'false'}`];
      if (n.tls) {
        parts.push(`tls-name=${n.sni}`);
        if (n.alpn && n.alpn.length) parts.push(`alpn=${n.alpn.join(':')}`);
        parts.push(`skip-cert-verify=false`);
      }
      lines.push(`${n.name} = vless,${parts.join(',')}`);
    } else if (n.proto === 'trojan') {
      const parts = [`${n.server}`, `${n.port}`, `password=${n.password}`, `transport=ws`, `path=${n.path}`, `host=${n.host}`, `over-tls=true`, `tls-name=${n.sni}`];
      if (n.alpn && n.alpn.length) parts.push(`alpn=${n.alpn.join(':')}`);
      parts.push(`skip-cert-verify=false`);
      lines.push(`${n.name} = trojan,${parts.join(',')}`);
    } else if (n.proto === 'ss') {
      lines.push(`${n.name} = Shadowsocks,${n.server},${n.port},${n.cipher || 'chacha20-ietf-poly1305'},"${n.password}",fast-open=false,udp=true,plugin=v2ray-plugin,plugin-opts=mode:websocket;host:${n.host};path:${n.path || '/'};tls:${n.tls ? 'true' : 'false'}`);
    }
  }
  lines.push('', '[Proxy Group]');
  const listStr = names.length ? names.join(',') : 'DIRECT';
  lines.push(`🚀 节点选择 = select,🎯 全球直连,${listStr}`);
  lines.push(`🌍 国外媒体 = select,${buildIniGroupProxies(names, { compact: true })}`);
  lines.push(`📺 哔哩哔哩 = select,${buildIniGroupProxies(names, { directFirst: true, compact: true })}`);
  lines.push(`📹 油管视频 = select,${buildIniGroupProxies(names, { extraGroups: ['🌍 国外媒体'], compact: true })}`);
  lines.push(`🎬 奈飞视频 = select,${buildIniGroupProxies(names, { extraGroups: ['🌍 国外媒体'], compact: true })}`);
  lines.push(`📲 电报信息 = select,${buildIniGroupProxies(names, { compact: true })}`);
  lines.push(`🌐 谷歌服务 = select,${buildIniGroupProxies(names, { compact: true })}`);
  lines.push(`🤖 OpenAI = select,${buildIniGroupProxies(names, { compact: true })}`);
  lines.push(`Ⓜ️ 微软服务 = select,${buildIniGroupProxies(names, { directFirst: true, compact: true })}`);
  lines.push(`🍎 苹果服务 = select,${buildIniGroupProxies(names, { directFirst: true, compact: true })}`);
  lines.push(`🎯 全球直连 = select,DIRECT`);
  lines.push(`🛑 全球拦截 = select,REJECT,DIRECT`);
  lines.push(`🐟 漏网之鱼 = select,${buildIniGroupProxies(names, { compact: true })}`);
  lines.push('', '[Remote Rule]');
  lines.push(`${aclRule('LocalAreaNetwork')}, policy=🎯 全球直连, tag=局域网, enabled=true`);
  lines.push(`${aclRule('BanAD')}, policy=🛑 全球拦截, tag=广告拦截, enabled=true`);
  lines.push(`${aclRule('BanProgramAD')}, policy=🛑 全球拦截, tag=应用广告, enabled=true`);
  lines.push(`${aclRule('GoogleCN')}, policy=🎯 全球直连, tag=GoogleCN, enabled=true`);
  lines.push(`${aclRule('SteamCN')}, policy=🎯 全球直连, tag=SteamCN, enabled=true`);
  lines.push(`${aclRule('Microsoft')}, policy=Ⓜ️ 微软服务, tag=微软, enabled=true`);
  lines.push(`${aclRule('Apple')}, policy=🍎 苹果服务, tag=苹果, enabled=true`);
  lines.push(`${aclRule('Telegram')}, policy=📲 电报信息, tag=电报, enabled=true`);
  lines.push(`${aclRule('OpenAi')}, policy=🤖 OpenAI, tag=OpenAI, enabled=true`);
  lines.push(`${aclRule('Netflix')}, policy=🌍 国外媒体, tag=Netflix, enabled=true`);
  lines.push(`${aclRule('YouTube')}, policy=🌍 国外媒体, tag=YouTube, enabled=true`);
  lines.push(`${aclRule('Disney')}, policy=🌍 国外媒体, tag=Disney, enabled=true`);
  lines.push(`${aclRule('Spotify')}, policy=🌍 国外媒体, tag=Spotify, enabled=true`);
  lines.push(`${aclRule('TikTok')}, policy=🌍 国外媒体, tag=TikTok, enabled=true`);
  lines.push(`${aclRule('BiliBili')}, policy=📺 哔哩哔哩, tag=哔哩哔哩, enabled=true`);
  lines.push(`${aclRule('ProxyMedia')}, policy=🌍 国外媒体, tag=代理媒体, enabled=true`);
  lines.push(`${aclRule('ProxyGFWlist')}, policy=🚀 节点选择, tag=代理列表, enabled=true`);
  lines.push(`${aclRule('ChinaDomain')}, policy=🎯 全球直连, tag=中国域名, enabled=true`);
  lines.push(`${aclRule('ChinaIp')}, policy=🎯 全球直连, tag=中国IP, enabled=true`);
  lines.push('', '[Rule]', 'GEOIP,CN,🎯 全球直连', 'FINAL,🐟 漏网之鱼');
  return lines.join('\n');
}

export function generateQuanxConfig(links, options = {}) {
  const customDNS = options.customDNS || '223.5.5.5';
  const nodes = links.map(parseShareLink).filter(n => n && (n.proto === 'vless' || n.proto === 'trojan' || n.proto === 'ss'));
  const names = nodes.map(n => n.name);
  const qxBase = 'https://fastly.jsdelivr.net/gh/blackmatrix7/ios_rule_script@master/rule/QuantumultX';
  const lines = [
    '[general]',
    'network_check_url=http://www.gstatic.com/generate_204',
    'server_check_url=http://www.gstatic.com/generate_204',
    'dns_exclusion_list=*.cmpassport.com, *.jegotrip.com.cn, *.icloud.com, *.icloud.com.cn, *.apple.com, *.weibo.com, *.qq.com',
    'running_mode_trigger=filter',
    '',
    '[dns]',
    `server=${customDNS.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}`,
    'server=119.29.29.29',
    'server=https://cloudflare-dns.com/dns-query',
    'server=https://dns.google/dns-query',
    '',
    '[server_local]'
  ];
  for (const n of nodes) {
    if (n.proto === 'vless') {
      const parts = [`${n.server}:${n.port}`, `method=none`, `password=${n.uuid}`, `obfs=${n.tls ? 'wss' : 'ws'}`, `obfs-host=${n.host}`, `obfs-uri=${n.path}`];
      if (n.tls) parts.push(`tls-verification=true`, `tls13=true`);
      parts.push(`tag=${n.name}`);
      lines.push(`vless=${parts.join(', ')}`);
    } else if (n.proto === 'trojan') {
      const parts = [`${n.server}:${n.port}`, `password=${n.password}`, `over-tls=true`, `tls-host=${n.sni}`, `obfs=wss`, `obfs-host=${n.host}`, `obfs-uri=${n.path}`, `tls-verification=true`, `tag=${n.name}`];
      lines.push(`trojan=${parts.join(', ')}`);
    } else if (n.proto === 'ss') {
      lines.push(`shadowsocks=${n.server}:${n.port}, method=${n.cipher || 'chacha20-ietf-poly1305'}, password=${n.password}, obfs=${n.tls ? 'wss' : 'ws'}, obfs-host=${n.host}, obfs-uri=${n.path || '/'}, tag=${n.name}`);
    }
  }
  lines.push('', '[policy]');
  const listStr = names.length ? names.join(', ') : 'direct';
  lines.push(`static=🚀 节点选择, ${listStr}, direct`);
  lines.push(`static=🌍 国外媒体, ${buildIniGroupProxies(names)}`);
  lines.push(`static=📺 哔哩哔哩, ${buildIniGroupProxies(names, { directFirst: true })}`);
  lines.push(`static=📹 油管视频, ${buildIniGroupProxies(names, { extraGroups: ['🌍 国外媒体'] })}`);
  lines.push(`static=🎬 奈飞视频, ${buildIniGroupProxies(names, { extraGroups: ['🌍 国外媒体'] })}`);
  lines.push(`static=📲 电报信息, ${buildIniGroupProxies(names)}`);
  lines.push(`static=🌐 谷歌服务, ${buildIniGroupProxies(names)}`);
  lines.push(`static=🤖 OpenAI, ${buildIniGroupProxies(names)}`);
  lines.push(`static=Ⓜ️ 微软服务, ${buildIniGroupProxies(names, { directFirst: true })}`);
  lines.push(`static=🍎 苹果服务, ${buildIniGroupProxies(names, { directFirst: true })}`);
  lines.push(`static=🎯 全球直连, direct`);
  lines.push(`static=🛑 全球拦截, reject, direct`);
  lines.push(`static=🐟 漏网之鱼, ${buildIniGroupProxies(names)}`);
  lines.push('', '[filter_remote]');
  lines.push(`${qxBase}/Lan/Lan.list, tag=局域网, force-policy=🎯 全球直连, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/Advertising/Advertising.list, tag=广告拦截, force-policy=🛑 全球拦截, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/Microsoft/Microsoft.list, tag=微软, force-policy=Ⓜ️ 微软服务, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/Apple/Apple.list, tag=苹果, force-policy=🍎 苹果服务, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/Telegram/Telegram.list, tag=电报, force-policy=📲 电报信息, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/Google/Google.list, tag=谷歌, force-policy=🌐 谷歌服务, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/OpenAI/OpenAI.list, tag=OpenAI, force-policy=🤖 OpenAI, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/Claude/Claude.list, tag=Claude, force-policy=🤖 OpenAI, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/YouTube/YouTube.list, tag=YouTube, force-policy=🌍 国外媒体, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/Netflix/Netflix.list, tag=Netflix, force-policy=🌍 国外媒体, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/Disney/Disney.list, tag=Disney, force-policy=🌍 国外媒体, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/Spotify/Spotify.list, tag=Spotify, force-policy=🌍 国外媒体, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/TikTok/TikTok.list, tag=TikTok, force-policy=🌍 国外媒体, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/BiliBili/BiliBili.list, tag=哔哩哔哩, force-policy=📺 哔哩哔哩, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/Global/Global.list, tag=全球加速, force-policy=🚀 节点选择, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push(`${qxBase}/ChinaMax/ChinaMax.list, tag=中国直连, force-policy=🎯 全球直连, update-interval=86400, opt-parser=false, enabled=true`);
  lines.push('', '[filter_local]', 'geoip, cn, 🎯 全球直连', 'final, 🐟 漏网之鱼');
  return lines.join('\n');
}

// ============================================================================
// زنجیره اینترنت خانگی (Residential Chain - ?target=vg / jk)
// ============================================================================
const JK_SOURCE = 'https://www.vpngate.net/api/iphone/';
const JK_CACHE_TTL = 30 * 60 * 1000;
let jkCache = null;
let jkCacheTime = 0;
const jkDirectiveRegex = {};

function getJkDirective(text, name) {
  if (!jkDirectiveRegex[name]) jkDirectiveRegex[name] = new RegExp('^[ \\t]*' + name + '[ \\t]+(.+?)[ \\t]*$', 'm');
  const m = text.match(jkDirectiveRegex[name]);
  return m ? m[1].trim() : '';
}

function getJkInlineBlock(text, tag) {
  const m = text.match(new RegExp('<' + tag + '>([\\s\\S]*?)<\\/' + tag + '>'));
  return m ? m[1].trim() : '';
}

function indentCert(text, pad) {
  return text.split('\n').map(l => l.trim()).filter(Boolean).map(l => pad + l).join('\n');
}

function decodeJkConfig(b64, full = false) {
  const clean = b64.replace(/\s/g, '');
  if (full || clean.length <= 6000) return decodeBase64Utf8(clean);
  return decodeBase64Utf8(clean.slice(0, 6000));
}

function parseJkList(raw) {
  const candidates = [];
  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.charAt(0) === '*' || line.charAt(0) === '#') continue;
    const fields = line.split(',');
    if (fields.length < 15) continue;
    if ((fields[0] || '').indexOf('public-vpn') === 0) continue;
    if ((fields[1] || '').indexOf('219.100.37.') === 0) continue;
    const b64 = fields[fields.length - 1];
    if (!b64 || b64.length < 100) continue;
    candidates.push({
      country: (fields[6] || '').toUpperCase() || 'XX',
      speed: parseInt(fields[4], 10) || 0,
      b64
    });
  }
  candidates.sort((a, b) => b.speed - a.speed);
  const nodes = [];
  let cert = null;
  for (const item of candidates) {
    let text = '';
    try {
      text = decodeJkConfig(item.b64);
      if (!getJkDirective(text, 'remote')) text = decodeJkConfig(item.b64, true);
    } catch (_e) {
      continue;
    }
    if ((getJkDirective(text, 'proto') || 'tcp').toLowerCase() !== 'tcp') continue;
    const remote = getJkDirective(text, 'remote').split(/\s+/);
    if (!remote[0]) continue;
    if (!cert) {
      try {
        const fullText = decodeJkConfig(item.b64, true);
        const c = {
          ca: getJkInlineBlock(fullText, 'ca'),
          cert: getJkInlineBlock(fullText, 'cert'),
          key: getJkInlineBlock(fullText, 'key')
        };
        if (c.ca && c.cert && c.key) cert = c;
      } catch (_e) {}
      if (!cert) continue;
    }
    nodes.push({
      country: item.country,
      address: remote[0],
      port: parseInt(remote[1], 10) || 443,
      cipher: getJkDirective(text, 'cipher') || 'AES-128-CBC',
      auth: getJkDirective(text, 'auth') || 'SHA1'
    });
  }
  return { nodes, cert };
}

async function fetchJkNodes() {
  const now = Date.now();
  if (jkCache && now - jkCacheTime < JK_CACHE_TTL) return jkCache;
  let raw = '';
  let lastErr = null;
  for (const src of [JK_SOURCE, JK_SOURCE.replace(/^https:/, 'http:')]) {
    try {
      const resp = await fetch(src, {
        headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'text/plain' }
      });
      if (!resp.ok) {
        lastErr = new Error('Status ' + resp.status);
        continue;
      }
      raw = await resp.text();
      break;
    } catch (e) {
      lastErr = e;
    }
  }
  if (!raw) throw lastErr || new Error('Empty JK response');
  const parsed = parseJkList(raw);
  if (!parsed.nodes.length || !parsed.cert) throw new Error('No valid JK residential nodes');
  jkCache = parsed;
  jkCacheTime = now;
  return parsed;
}

export async function generateResidentialChainConfig(links, options = {}) {
  const customDNS = options.customDNS || 'https://cloudflare-dns.com/dns-query';
  const customECHDomain = options.customECHDomain || 'cloudflare-ech.com';
  const subNodeCount = parseInt(options.subNodeCount ?? 50, 10) || 0;
  const frontGroupName = '⚡ CF前置';
  const jkAuto = '🏠 家宽自动';
  const jkSelect = '🏠 家宽节点';
  const mainSelect = '🚀 节点选择';

  const allFront = links
    .map(parseShareLink)
    .filter(n => n && (n.proto === 'vless' || n.proto === 'trojan'));
  const tlsFront = allFront.filter(n => n.tls);
  const frontNodes = (tlsFront.length ? tlsFront : allFront).map((n, idx) => ({
    ...n,
    name: `${idx + 1}+${BRAND_NAME}`
  }));
  const frontNames = frontNodes.map(n => n.name);

  const { nodes, cert } = await fetchJkNodes();
  const slicedJk = subNodeCount > 0 ? nodes.slice(0, subNodeCount) : nodes;
  const jkItems = slicedJk.map((n, idx) => ({
    ...n,
    name: `${frontNodes.length + idx + 1}+${BRAND_NAME}`
  }));

  const header = [
    '# miliconfig 家宽订阅：CF 节点带路，落地是住宅宽带',
    'mixed-port: 7890',
    'allow-lan: false',
    'mode: rule',
    'log-level: info',
    'ipv6: false',
    'unified-delay: true',
    'tcp-concurrent: true',
    'external-controller: 127.0.0.1:9090',
    'dns:',
    '  enable: true',
    '  ipv6: false',
    '  enhanced-mode: fake-ip',
    '  fake-ip-range: 198.18.0.1/16',
    '  nameserver:',
    '    - ' + customDNS,
    '    - https://1.1.1.1/dns-query',
    ''
  ];

  const proxySection = ['proxies:'];
  for (const n of frontNodes) proxySection.push(buildClashNodeYaml(n, customECHDomain));
  jkItems.forEach((n, idx) => {
    const row = [
      '  - name: "' + n.name + '"',
      '    type: openvpn',
      '    server: ' + n.address,
      '    port: ' + n.port,
      '    proto: tcp',
      '    username: vpn',
      '    password: vpn',
      '    cipher: ' + n.cipher,
      '    auth: ' + n.auth,
      '    udp: false',
      '    handshake-timeout: 30',
      '    remote-dns-resolve: true',
      '    dns: [ 8.8.8.8, 1.1.1.1 ]'
    ];
    if (frontNames.length) row.push('    dialer-proxy: "' + frontGroupName + '"');
    if (idx === 0) {
      row.push('    ca: &jkca |-', indentCert(cert.ca, '      '));
      row.push('    cert: &jkcert |-', indentCert(cert.cert, '      '));
      row.push('    key: &jkkey |-', indentCert(cert.key, '      '));
    } else {
      row.push('    ca: *jkca', '    cert: *jkcert', '    key: *jkkey');
    }
    proxySection.push(row.join('\n'));
  });

  const listFmt = arr => arr.map(x => '      - "' + x + '"').join('\n');
  const jkNames = jkItems.map(x => x.name);
  const groupSection = ['proxy-groups:'];
  if (frontNames.length) {
    groupSection.push(
      '  - name: "' + frontGroupName + '"',
      '    type: url-test',
      '    url: https://www.gstatic.com/generate_204',
      '    interval: 300',
      '    tolerance: 50',
      '    proxies:',
      listFmt(frontNames)
    );
  }
  groupSection.push(
    '  - name: "' + jkAuto + '"',
    '    type: fallback',
    '    url: https://www.gstatic.com/generate_204',
    '    interval: 1800',
    '    lazy: true',
    '    proxies:',
    listFmt(jkNames)
  );
  groupSection.push('  - name: "' + jkSelect + '"', '    type: select', '    proxies:', listFmt(jkNames));
  const mainList = ['      - "' + jkAuto + '"', '      - "' + jkSelect + '"'];
  if (frontNames.length) mainList.push('      - "' + frontGroupName + '"');
  mainList.push('      - DIRECT');
  groupSection.push('  - name: "' + mainSelect + '"', '    type: select', '    proxies:', mainList.join('\n'));

  const rules = [
    'rules:',
    '  - GEOIP,LAN,DIRECT,no-resolve',
    '  - GEOIP,CN,DIRECT,no-resolve',
    '  - MATCH,' + mainSelect
  ];

  return header.concat(proxySection, [''], groupSection, [''], rules, ['']).join('\n');
}
