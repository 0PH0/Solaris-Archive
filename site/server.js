import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBrotliCompress, createGzip, constants } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const port = Number(process.env.PORT || 4173);
const characterSourceUrl = "https://anzfactory.github.io/wuwaaan/characters.json";
const characterAssetsUrl = "https://api.github.com/repos/ryanbenson/wuthering-waves-assets/contents/images?ref=master";
const characterCacheTtlMs = 6 * 60 * 60 * 1000;
let characterCache = null;
const encoreCharacterUrl = "https://api-v2.encore.moe/api/en/character";
const characterDetails = new Map();
const characterDetailRequests = new Map();
const characterWeaponCache = new Map();
const characterWeaponRequests = new Map();
const officialChannelId = "UC0Bi5KMcECRVYis5Gb_ZYZQ";
let characterMediaCache = null;
let characterMediaRequest = null;
// Only verified associations: the API's InitWeaponItemId is a starter weapon.
const verifiedCharacterReleases = [{
  id: "Hsin", name: "Hsin", encoreId: 1311, version: "3.7", rarity: 5,
  element: "Electro", weapon: "Rectifier", releaseAt: "2026-09-30T03:00:00Z",
  signatureWeapon: { id: 21050116, name: "Blooming Jadehaven", slug: "blooming-jadehaven" },
  useApiDetails: true,
  videoId: "a3zMk49qpwI"
}];
const verifiedConveneAdditions = [
  { id: "convene-5529-hsin", title: "[As Full as Tonight, Forever] Featured Resonator Convene", type: "resonator", featuredName: "Hsin", featuredDetail: "Electro", imageUrl: "/assets/banners/hsin-3.7.webp", highlights: ["5-Star Resonator: Hsin; 4-Star Resonators: Buling, Taoqi, Youhu"] },
  { id: "convene-5529-bloomingjadehaven", title: "[Blooming Jadehaven] Featured Weapon Convene", type: "weapon", featuredName: "Blooming Jadehaven", featuredDetail: "Rectifier", imageUrl: "/assets/banners/blooming-jadehaven-3.7.webp", highlights: ["5-Star Weapon: Blooming Jadehaven; 4-Star Weapons: Fusion Accretion, Commando of Conviction, Dauntless Evernight"] }
].map(record => ({ ...record, startAt: "2026-09-30T03:00:00Z", endAt: "2026-10-22T01:59:00Z", startLabel: "Version 3.7 update", estimatedStart: true, serverTimezone: "UTC+8", sourceUrl: "https://wutheringwaves.kurogames.com/en/main/news/detail/5529" }));
const eventFeedUrl = "https://raw.githubusercontent.com/TheLovinator1/wutheringwaves/master/articles_latest.xml";
const eventArchiveUrl = "https://raw.githubusercontent.com/TheLovinator1/wutheringwaves/master/articles_all.xml";
const eventCacheTtlMs = 30 * 60 * 1000;
let eventCache = null;
let eventRequest = null;
const codeSourceUrls = ["https://www.pockettactics.com/wuthering-waves/codes", "https://beebom.com/wuthering-waves-redeem-codes/"];
const codeCacheTtlMs = 60 * 60 * 1000;
let codeCache = null, codeRequest = null;
const conveneFeedUrl = eventFeedUrl;
const conveneCacheTtlMs = 5 * 60 * 1000;
let conveneCache = null;
let conveneFeedRequest = null;
const jsonRequests = new Map();
const textRequests = new Map();
const textCache = new Map();

const mimeTypes = {
  ".webm": "video/webm",
  ".webp": "image/webp",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".xml": "application/xml; charset=utf-8"
};

function daysFromNow(days, hours = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  date.setUTCHours(date.getUTCHours() + hours, 0, 0, 0);
  return date.toISOString();
}

function getStatus(startAt, endAt, now = new Date()) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  if (now < start) return "em_breve";
  if (now > end) return "encerrado";
  return "ao_vivo";
}

const displayNameOverrides = {
  jinshi: "Jinhsi",
  shorekeeper: "The Shorekeeper",
  taogi: "Taoqi",
  xiangli_yao: "Xiangli Yao",
  yangyang_xuanling: "Yangyang Xuanling",
  luuk_herssen: "Luuk Herssen",
  sui_sui: "Suisui",
  suisui: "Suisui"
};

const elementLabels = {
  aero: "Aero",
  electro: "Electro",
  fusion: "Fusion",
  glacio: "Glacio",
  havoc: "Havoc",
  spectro: "Spectro"
};

const weaponLabels = {
  broadblade: "Broadblade",
  sword: "Sword",
  pistols: "Pistols",
  gauntlets: "Gauntlets",
  rectifier: "Rectifier"
};

function normalizeKey(value = "") {
  return String(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function titleFromId(id = "") {
  return String(id)
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

async function fetchJson(url) {
  if (jsonRequests.has(url)) return jsonRequests.get(url);
  const pending = (async () => {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "Accept": "application/json",
        ...(url.startsWith('https://guide-server.aki-game.net/') ? {"x-language": "en"} : {}),
        "User-Agent": "Solaris-Archive-WuWa-Wiki"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    return response.json();
  })();
  jsonRequests.set(url, pending);
  try { return await pending; } finally { jsonRequests.delete(url); }
}

async function fetchText(url, ttl = eventCacheTtlMs) {
  const cached = textCache.get(url);
  if (cached?.expiresAt > Date.now()) return cached.text;
  if (textRequests.has(url)) return textRequests.get(url);
  const pending = (async () => {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "Accept": "application/atom+xml,text/xml,text/plain",
        "User-Agent": "Solaris-Archive-WuWa-Wiki"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status}`);
    }

    const text = await response.text();
    if (!/<feed[\s>]/i.test(text)) throw new Error("Invalid article feed");
    textCache.set(url, { text, expiresAt: Date.now() + ttl });
    return text;
  })();
  textRequests.set(url, pending);
  try { return await pending; } finally { textRequests.delete(url); }
}

function decodeXml(value = "") {
  return String(value)
    .replace(/&#(x[0-9a-f]+|\d+);/gi, (entity, code) => {
      const value = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
      return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : entity;
    })
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripTags(value = "") {
  return decodeXml(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXml(match[1].replace(/^<!\[CDATA\[|\]\]>$/g, "").trim()) : "";
}

function extractAttr(block, attr) {
  const match = block.match(new RegExp(`${attr}=["']([^"']+)["']`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function parseServerTime(value = "") {
  const match = value.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
  if (!match) return "";

  const [, year, month, day, hour, minute] = match.map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour - 8, minute)).toISOString();
}

function extractEventDates(content = "") {
  const text = stripTags(content);
  const match = text.match(/(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*-\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*\((?:server time|UTC\+8)\)/i);
  if (!match) return null;

  return {
    startAt: parseServerTime(match[1]),
    endAt: parseServerTime(match[2])
  };
}

function extractConveneDates(content = "", fallbackStartAt = "") {
  const exactDates = extractEventDates(content);
  if (exactDates) return exactDates;

  const text = stripTags(content);
  const versionMatch = text.match(/(Version\s+[\d.]+\s+update)\s*-\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*\((?:server time|UTC\+8)\)/i);
  if (!versionMatch) return null;

  return {
    startAt: fallbackStartAt,
    endAt: parseServerTime(versionMatch[2]),
    startLabel: versionMatch[1],
    startTimeLabel: "",
    estimatedStart: true
  };
}

function extractOfficialImage(content = "") {
  const urls = [...content.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)]
    .map((match) => decodeXml(match[1]))
    .filter((url) => {
      try {
        const parsed = new URL(url);
        return parsed.protocol === "https:" && /(^|\.)kurogame\.com$/i.test(parsed.hostname);
      } catch { return false; }
    });
  const staticImage = urls.find((url) => !/\.gif(?:\?|$)/i.test(url));
  return staticImage || urls[0] || "";
}

function extractRewards(content = "") {
  const text = stripTags(content);
  const match = text.match(/Rewards(?:✦)?\s*(.+?)(?:Eligibility|Convene Rules|Event Details|Notes|$)/i);
  const rewards = match ? match[1].split(/,\s*/).slice(0, 4) : [];
  return rewards.map((reward) => reward.trim()).filter(Boolean);
}

function categorizeOfficialEvent(title = "") {
  const lower = title.toLowerCase();
  if(/fan creation|battle rush|photo challenge|photography/i.test(title))return 'comunidade';
  if (lower.includes("convene") || lower.includes("resonator") || lower.includes("weapon")) return "banner";
  if (lower.includes("web")) return "evento_web";
  if (lower.includes("tower") || lower.includes("endstate") || lower.includes("adversity")) return "torre_adversidade";
  if (lower.includes("code")) return "codigo";
  return "evento_in_game";
}

function isConveneArticle(title = "", content = "") {
  return /Featured\s+(Resonator|Weapon)\s+Convene/i.test(`${title} ${content}`);
}

function isStandaloneConveneArticle(title = "") {
  return /^\[[^\]]+\]\s+Featured\s+(Resonator|Weapon)\s+Convene$/i.test(stripTags(title));
}

function extractFeaturedConveneItem(title = "", content = "") {
  const text = stripTags(content);
  const typeFromTitle = title.match(/Featured\s+(Resonator|Weapon)\s+Convene/i)?.[1] || "";
  const featuredMatch = text.match(/5-Star\s+(Resonator|Weapon):\s*([^,(]+)(?:\s*\(([^)]+)\))?/i);
  const type = featuredMatch?.[1] || typeFromTitle || "Convene";

  return {
    type,
    name: featuredMatch?.[2]?.trim() || title.replace(/\s*Featured\s+(Resonator|Weapon)\s+Convene/i, "").replace(/^\[|\]$/g, ""),
    detail: featuredMatch?.[3]?.trim() || ""
  };
}

function extractConveneHighlights(content = "") {
  const text = stripTags(content);
  const match = text.match(/During the event,\s*(.+?receive boosted drop rates!)/i);
  return match ? [match[1].trim()] : [];
}

function eventName(title) {
  const brackets = [...title.matchAll(/\[([^\]]+)\]/g)];
  return brackets.at(-1)?.[1] || title;
}

function compareEventVersions(a,b) {const left=a.split('.').map(Number),right=b.split('.').map(Number);return left[0]-right[0] || left[1]-right[1];}

function eventSchedule(content, releases, releasedVersion='0.0') {
  const exact = extractEventDates(content);
  if (exact) return exact;
  const text = stripTags(content);
  const calendar=text.match(/(\d{4})\/(\d{2})\/(\d{2})\s*-\s*(\d{4})\/(\d{2})\/(\d{2})\s*\((PT|UTC\+8|server time)\)/i);
  if(calendar)return {startAt:null,endAt:null,startDate:calendar.slice(1,4).join('-'),endDate:calendar.slice(4,7).join('-'),dateOnly:true,dateTimezone:calendar[7]==='PT'?'America/Los_Angeles':'Asia/Shanghai',sourceTimezone:calendar[7]};
  const range=text.match(/Start of Version\s+(\d+\.\d+)\s*-\s*End of Version\s+(\d+\.\d+)/i);
  if(range)return {startAt:releases.get(range[1]) || null,endAt:null,startLabel:`Version ${range[1]} update`,estimatedStart:true,endVersion:range[2],
    endedByVersion:compareEventVersions(releasedVersion,range[2])>0,
    ongoingByVersion:compareEventVersions(releasedVersion,range[1])>=0 && compareEventVersions(releasedVersion,range[2])<=0};
  const version = text.match(/Version\s+(\d+\.\d+)\s+update/i)?.[1];
  const end = text.match(/Version\s+\d+\.\d+\s+update\s*[-–~]\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*\((?:server time|UTC\+8)\)/i);
  if (version && (end || /permanently available after|Duration:\s*After the Version\s+\d+\.\d+\s+update/i.test(text)))return {
    startAt: releases.get(version) || null, endAt: end ? parseServerTime(end[1]) : null,
    startLabel: `Version ${version} update`, estimatedStart: true,
    permanent: !end, schedulePending: !releases.has(version)
  };
  // Publication time is not an event's start time.
  return {startAt:null,endAt:null,schedulePending:true};
}

function eventDescription(content) {
  return [...content.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)]
    .filter(([, paragraph])=>!/<strong/i.test(paragraph))
    .map(([, paragraph])=>stripTags(paragraph.replace(/<img\b[^>]*>/gi,'')))
    .filter(text=>text && !/^(?:✦|Duration:|Eligibility|Rewards|Notes|Dear Rovers|\d{4}-\d{2}-\d{2})/i.test(text))
    .slice(0,2).join(' ').slice(0,700);
}

function eventRewards(content) {
  // Only extract named, quantified rewards from this event's own section.
  const text=stripTags(content);
  const rewards=[...new Set([...text.matchAll(/(?:Astrites?|Shell Credits?|Radiant Tide|Lustrous Tide|Premium Tuners?|Advanced Sealed Tubes?|Crystal Solvent)\s*[x×]\s*[\d,]+/gi)].map(match=>match[0]))];
  return rewards.length?rewards:extractRewards(content);
}

function parseOfficialEventFeed(xml) {
  const entries=[...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(([,block])=>({
    id:extractTag(block,'id').replace('urn:article:',''), title:extractTag(block,'title'), content:extractTag(block,'content'),
    publishedAt:extractTag(block,'published'), sourceUrl:extractAttr(block,'href')
  }));
  const releases=new Map(), artwork=new Map();
  const latestVersion=entries.map(entry=>entry.title.match(/Version\s+(\d+\.\d+)/i)?.[1]).filter(Boolean).sort((a,b)=>compareEventVersions(b,a))[0];
  for(const entry of entries){
    const version=entry.title.match(/Version\s+(\d+\.\d+)/i)?.[1];
    const maintenance=stripTags(entry.content).match(/Maintenance Time:\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})\s*-\s*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/i);
    if(version && maintenance)releases.set(version,parseServerTime(maintenance[2]));
    if(/Event Preview|Event Notice|\]\s+.*Event/i.test(entry.title) && !isConveneArticle(entry.title,'')){
      const image=extractOfficialImage(entry.content);
      if(image)artwork.set(normalizeKey(eventName(entry.title)),image);
    }
  }
  const records=[];
  const releasedVersion=[...releases.keys()].filter(version=>Date.parse(releases.get(version))<=Date.now()).sort((a,b)=>compareEventVersions(b,a))[0] || '0.0';
  for(const entry of entries){
    if(isStandaloneConveneArticle(entry.title) || /Featured.*Convene|Resonator\/Weapon Convene/i.test(entry.title))continue;
    const headings=[...entry.content.matchAll(/<p>\s*<strong>([^<]+)<\/strong>\s*<\/p>/gi)].map(match=>({index:match.index,end:match.index+match[0].length,text:stripTags(match[1])}));
    const candidates=headings.filter((heading,index)=>/\]\s+[^\[\]]*Event$/i.test(heading.text) || headings[index-1]?.text==='[New Permanent Event]' && !/^\[/.test(heading.text));
    const build=(title,content,id,kind='',section=false)=>{
      const schedule=eventSchedule(content,releases,releasedVersion), name=eventName(title);
      const ownImage=extractOfficialImage(content), previewImage=artwork.get(normalizeKey(name));
      const imageUrl=ownImage || previewImage || (section?extractOfficialImage(entry.content):'');
      const category=categorizeOfficialEvent(title);
      // A combat event mentioning weapons is not a Convene.
      records.push({id,category:category==='banner'?'evento_in_game':category,title:section?name:title,eventName:name,
        ...schedule,imageUrl,imageScope:ownImage || previewImage?'event':imageUrl?'notice':'none',
        description:eventDescription(content),eventKind:kind,
        rewards:eventRewards(content),sourceUrl:entry.sourceUrl,publishedAt:entry.publishedAt,serverTimezone:'UTC+8'});
    };
    if(candidates.length){
      for(const heading of candidates){
        const next=headings.find(other=>other.index>heading.index && (candidates.includes(other) || /^\[(?:Web Events|New Permanent Event|Version Special Login Event|Special Events)\]$/.test(other.text)));
        const nextSection=entry.content.slice(heading.end).search(/<h1>\s*(?:New Merch|Other New Content|Features|Adjustments)/i);
        const end=Math.min(next?.index ?? entry.content.length,nextSection<0?entry.content.length:heading.end+nextSection);
        const section=entry.content.slice(heading.end,end);
        if(!/Duration:/i.test(stripTags(section)))continue;
        const kind=heading.text.match(/\]\s+(.*Event)$/i)?.[1] || 'Permanent Event';
        build(heading.text,section,`official-${entry.id}-${normalizeKey(eventName(heading.text))}`,kind,true);
      }
      continue;
    }
    if(isConveneArticle(entry.title,entry.content))continue;
    const announcedName=stripTags(entry.content).match(/limited-time event ["“]([^"”]+)["”]/i)?.[1];
    const announcedVersion=entry.title.match(/Version\s+(\d+\.\d+)/i)?.[1];
    if(announcedName && announcedVersion===latestVersion){build(announcedName,entry.content,`official-${entry.id}`, 'Limited-Time Event');continue;}
    if(!/event|challenge|battle rush|campaign/i.test(entry.title) || /winners|results|concluded/i.test(entry.title))continue;
    const dates=eventSchedule(entry.content,releases,releasedVersion);
    // Art-only previews enrich announced events, but don't create duplicate cards.
    if(!dates.startAt && !dates.dateOnly)continue;
    build(entry.title,entry.content,`official-${entry.id}`);
  }
  return mergeEventRecords([],records);
}

function mergeEventRecords(previous, incoming) {
  const records=new Map(previous.filter(record=>record.id?.startsWith('official-') && record.category!=='banner').map(record=>[record.id,record]));
  for(const record of incoming){
    const duplicate=[...records.values()].find(old=>normalizeKey(old.eventName || eventName(old.title))===normalizeKey(record.eventName || eventName(record.title)) && (old.permanent && record.permanent || old.endAt===record.endAt && old.startAt===record.startAt && old.startDate===record.startDate && old.endDate===record.endDate && old.endVersion===record.endVersion));
    const id=duplicate?.id || record.id;
    const existing=records.get(id);
    const merged={...existing,...record,id};
    if(existing?.permanent && record.permanent && Date.parse(existing.publishedAt)>Date.parse(record.publishedAt))Object.assign(merged,existing,{id});
    for(const field of ['imageUrl','description'])if(!record[field] && existing?.[field])merged[field]=existing[field];
    if(!record.imageUrl && existing?.imageUrl)merged.imageScope=existing.imageScope;
    if(!record.rewards?.length && existing?.rewards?.length)merged.rewards=existing.rewards;
    records.set(id,merged);
  }
  return [...records.values()];
}

function currentEventStatus(event, now=Date.now()) {
  if(event.dateOnly){const day=new Intl.DateTimeFormat('sv-SE',{timeZone:event.dateTimezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));return day<event.startDate?'em_breve':day>event.endDate?'encerrado':'ao_vivo';}
  if(event.endedByVersion || event.endAt && Date.parse(event.endAt)<now)return 'encerrado';
  if(event.ongoingByVersion)return 'ao_vivo';
  if(event.schedulePending || !event.startAt)return 'a_confirmar';
  if(now<Date.parse(event.startAt))return 'em_breve';
  if(event.permanent)return 'ao_vivo';
  if(!event.endAt)return 'a_confirmar';
  return getStatus(event.startAt,event.endAt,new Date(now));
}

function parseOfficialConveneFeed(xml) {
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)]
    .flatMap((entry) => {
      const block = entry[1];
      if (isStandaloneConveneArticle(extractTag(block, "title"))) return [entry];
      const content = extractTag(block, "content");
      // Current official notices contain several banners. Keep each section's
      // image and dates together; never borrow art from another banner.
      const headings = [...content.matchAll(/<p>\s*<strong>(\[[^<]+\]\s+Featured\s+(?:Resonator|Weapon)\s+Convene)<\/strong>\s*<\/p>/gi)];
      return headings.map((heading, index) => {
        const section = content.slice(heading.index, headings[index + 1]?.index ?? content.length);
        const sectionBlock = block
          .replace(/<title[^>]*>[\s\S]*?<\/title>/i, () => `<title>${heading[1]}</title>`)
          .replace(/<content[^>]*>[\s\S]*?<\/content>/i, () => `<content><![CDATA[${section}]]></content>`)
          .replace(/<id>([\s\S]*?)<\/id>/i, (_, id) => `<id>${id}-${normalizeKey(heading[1])}</id>`);
        return ["", sectionBlock];
      });
    })
    .map(([, block]) => {
      const title = extractTag(block, "title");
      const content = extractTag(block, "content");
      if (!isStandaloneConveneArticle(title) || !isConveneArticle(title, content)) return null;

      const publishedAt = extractTag(block, "published") || extractTag(block, "updated");
      const dates = extractConveneDates(content, publishedAt);
      const imageUrl = extractOfficialImage(content);
      if (!title || !dates || !dates.endAt || !imageUrl) return null;

      const id = extractTag(block, "id").replace("urn:article:", "") || normalizeKey(title);
      const featured = extractFeaturedConveneItem(title, content);

      return {
        id: `convene-${id}`,
        title,
        type: featured.type.toLowerCase(),
        featuredName: featured.name,
        featuredDetail: featured.detail,
        imageUrl,
        startAt: dates.startAt,
        endAt: dates.endAt,
        startLabel: dates.startLabel || "",
        startTimeLabel: dates.startTimeLabel || "",
        estimatedStart: Boolean(dates.estimatedStart),
        serverTimezone: "UTC+8",
        highlights: extractConveneHighlights(content),
        sourceUrl: extractAttr(block, "href")
      };
    })
    .filter(Boolean);
}

function buildAssetMap(files) {
  const map = new Map();

  for (const file of Array.isArray(files) ? files : []) {
    if (file.type !== "file" || !file.download_url || !/\.(png|webp|jpg|jpeg)$/i.test(file.name)) {
      continue;
    }

    const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
    map.set(normalizeKey(nameWithoutExt), file.download_url);
  }

  return map;
}

function findCharacterImage(character, assetMap) {
  const id = character.id || "";
  const displayName = displayNameOverrides[id] || displayNameOverrides[id.toLowerCase()] || titleFromId(id);
  const candidates = [
    displayName,
    id,
    id.replace(/_/g, " "),
    id.replace(/_/g, ""),
    displayName.replace(/^The /i, "")
  ];

  for (const candidate of candidates) {
    const imageUrl = assetMap.get(normalizeKey(candidate));
    if (imageUrl) return imageUrl;
  }

  return "";
}

function normalizeCharacter(character, assetMap) {
  const id = character.id || normalizeKey(character.name);
  const name = displayNameOverrides[id] || displayNameOverrides[id.toLowerCase()] || titleFromId(id);
  const imageUrl = findCharacterImage(character, assetMap);

  return {
    id,
    slug: normalizeKey(id),
    name,
    originalName: character.name || "",
    yomi: character.yomi || "",
    rarity: Number(character.rarity) || 0,
    element: elementLabels[character.attribute] || character.attribute || "Unknown",
    weapon: weaponLabels[character.weapon] || character.weapon || "Unknown",
    version: character.version || "",
    imageUrl,
    portraitUrl: imageUrl,
    iconUrl: imageUrl,
    sourceUrl: characterSourceUrl,
    imageSourceUrl: characterAssetsUrl
  };
}

async function createCharactersPayload() {
  const now = Date.now();

  if (characterCache && characterCache.expiresAt > now) {
    return {
      ...characterCache.payload,
      cached: true
    };
  }

  let characters, assets;
  // Optional enrichment must not make the established primary source fail.
  const extraSources = Promise.allSettled([fetchJson(encoreCharacterUrl), fetchText(eventFeedUrl)]);
  try {
    [characters, assets] = await Promise.all([
      fetchJson(characterSourceUrl),
      fetchJson(characterAssetsUrl).catch(() => [])
    ]);
    if (!Array.isArray(characters) || !Array.isArray(assets)) throw new Error("Invalid characters response");
  } catch (error) {
    if (characterCache?.payload) return { ...characterCache.payload, cached: true, stale: true, externalError: true };
    throw error;
  }
  const assetMap = buildAssetMap(assets);
  const [encoreResult, feedResult] = await extraSources;
  const roles = encoreResult.status === "fulfilled" && Array.isArray(encoreResult.value?.roleList) ? encoreResult.value.roleList : [];
  const releases = verifiedCharacterReleases.filter(record => Date.parse(record.releaseAt) <= now);
  const releaseNames = new Set(releases.map(record => normalizeKey(record.name)));
  if (feedResult.status === "fulfilled") {
    for (const record of parseOfficialConveneFeed(feedResult.value)) {
      if (record.type === "resonator" && Date.parse(record.startAt) <= now) releaseNames.add(normalizeKey(record.featuredName));
    }
  }
  const normalized = characters
    .map((character) => normalizeCharacter(character, assetMap))
    .map(character => {
      const release = releases.find(record => normalizeKey(record.name) === normalizeKey(character.name));
      const role = roles.find(record => normalizeKey(record.Name.replace(/^The /i, "")) === normalizeKey(character.name.replace(/^The /i, "")) && (!character.rarity || record.Element?.Name === character.element))
        || (release && roles.find(record => record.Id === release.encoreId));
      if (role) {
        character.encoreId = Number(role.Id);
        character.iconUrl = safeEncoreAsset(role.RoleHeadIconLarge) || safeEncoreAsset(role.RoleHeadIcon) || character.iconUrl;
        if (!character.rarity && releaseNames.has(normalizeKey(character.name))) {
          character.rarity = Number(role.QualityId); character.element = role.Element?.Name || "Unknown"; character.weapon = role.WeaponType?.Name || "Unknown";
        }
      }
      if (release) Object.assign(character, { rarity: release.rarity, element: release.element, weapon: release.weapon, encoreId: release.encoreId, signatureWeapon: release.signatureWeapon, videoId: release.videoId, useApiDetails: true });
      return character;
    }).filter(character => character.rarity > 0);
  // Include officially released newcomers even while the primary list is catching up.
  for (const role of roles) {
    if (!releaseNames.has(normalizeKey(role.Name)) || normalized.some(record => normalizeKey(record.name) === normalizeKey(role.Name))) continue;
    const release = releases.find(record => record.encoreId === role.Id);
    normalized.push({ id: role.Name, slug: normalizeKey(role.Name), name: role.Name, rarity: Number(role.QualityId), element: role.Element?.Name || "Unknown", weapon: role.WeaponType?.Name || "Unknown", encoreId: Number(role.Id), version: release?.version || "", imageUrl: safeEncoreAsset(role.RoleHeadIconLarge) || safeEncoreAsset(role.RoleHeadIcon), iconUrl: safeEncoreAsset(role.RoleHeadIconLarge) || safeEncoreAsset(role.RoleHeadIcon), sourceUrl: encoreCharacterUrl, newRelease: !release, useApiDetails: true, ...(release ? {signatureWeapon: release.signatureWeapon, videoId: release.videoId} : {}) });
  }
  for (const release of releases) {
    if (!normalized.some(record => normalizeKey(record.name) === normalizeKey(release.name))) normalized.push({ ...release, slug: normalizeKey(release.id), sourceUrl: encoreCharacterUrl });
  }
  normalized.sort((a, b) => a.name.localeCompare(b.name, "en"));

  const payload = {
    updatedAt: new Date(now).toISOString(),
    syncIntervalMinutes: Math.round(characterCacheTtlMs / 60000),
    source: characterSourceUrl,
    imageSource: "https://github.com/ryanbenson/wuthering-waves-assets",
    detailSource: encoreCharacterUrl,
    characters: normalized
  };

  characterCache = {
    expiresAt: now + characterCacheTtlMs,
    payload
  };

  return {
    ...payload,
    cached: false
  };
}

function safeEncoreAsset(value) {
  return typeof value === "string" && /^https:\/\/api\.encore\.moe\/resource\//.test(value) ? value : "";
}

async function createCharacterDetailPayload(id) {
  if (!/^\d{4}$/.test(String(id))) throw new Error("Invalid character ID");
  const saved = characterDetails.get(id);
  if (saved?.expiresAt > Date.now()) return saved.payload;
  if (characterDetailRequests.has(id)) return characterDetailRequests.get(id);
  const request = (async () => {
    try {
      const data = await fetchJson(`${encoreCharacterUrl}/${id}`);
      if (!data.Name?.Content || !data.QualityId) throw new Error("Invalid character details");
      const stats = Object.fromEntries((data.Properties || []).map(property => {
        const value = [...(property.GrowthValues || [])].reverse().find(record => Number(record.level) === Number(data.MaxLevel))?.value ?? property.BaseValue;
        return [stripTags(property.Name), typeof value === "number" ? Math.round(value * 100) / 100 : stripTags(value)];
      }));
      const payload = {
        id: Number(id), name: stripTags(data.Name.Content), maxLevel: Number(data.MaxLevel),
        introduction: stripTags(data.Introduction?.Content), stats,
        imageUrl: safeEncoreAsset(data.FormationRoleCard) || safeEncoreAsset(data.RolePortrait), portraitUrl: safeEncoreAsset(data.RolePortrait) || safeEncoreAsset(data.FormationRoleCard),
        iconUrl: safeEncoreAsset(data.RoleHeadIconLarge || data.RoleHeadIcon),
        skills: (data.Skills || []).map(skill => ({name: stripTags(skill.SkillName), type: stripTags(skill.SkillType), description: stripTags(skill.SkillDescribe)})),
        sourceUrl: `${encoreCharacterUrl}/${id}`
      };
      characterDetails.set(id, {payload, expiresAt: Date.now() + characterCacheTtlMs});
      return payload;
    } catch (error) { if (saved?.payload) return {...saved.payload, stale: true}; throw error; }
  })();
  characterDetailRequests.set(id, request);
  try {return await request;} finally {characterDetailRequests.delete(id);}
}

function parseOfficialCharacterVideos(html) {
  const marker = "var ytInitialData = ";
  const start = html.indexOf(marker);
  if (start < 0) throw new Error("Official channel data unavailable");
  const end = html.indexOf(";</script>", start);
  const data = JSON.parse(html.slice(start + marker.length, end));
  if (data.metadata?.channelMetadataRenderer?.externalId !== officialChannelId) throw new Error("Unexpected video channel");
  const videos = {};
  function visit(node) {
    if (!node || typeof node !== "object") return;
    const video = node.lockupViewModel;
    const title = video?.metadata?.lockupMetadataViewModel?.title?.content || "";
    const name = title.match(/Resonator Showcase\s*\|\s*(.+?)\s*(?:—|–| - )/i)?.[1];
    if (name && /^[\w-]{11}$/.test(video.contentId)) videos[normalizeKey(name)] ||= video.contentId;
    for (const value of Object.values(node)) visit(value);
  }
  visit(data); return videos;
}

function extractExplicitSignatureWeapon(guide) {
  const characterName = guide?.role?.texts?.find(text => text.language === 'en')?.name;
  const description = stripTags(guide?.weaponTexts?.find(text => text.language === 'en')?.recommendDescription).replace(/[’‘]/g, "'").toLowerCase();
  if (!characterName) return null;
  for (const item of guide?.weapon?.items || []) {
    const name = item.texts?.find(text => text.language === 'en')?.name;
    if (!name || !/^\d{8}$/.test(String(item.gbId))) continue;
    const weapon = name.toLowerCase(), character = characterName.toLowerCase();
    if ([`${weapon} is ${character}'s signature weapon`, `${character}'s signature weapon is ${weapon}`, `${weapon} is the signature weapon of ${character}`].some(phrase => description.includes(phrase))) {
      return {id: Number(item.gbId), name: stripTags(name), slug: name.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')};
    }
  }
  return null;
}

async function createCharacterWeaponPayload(id) {
  if (!/^\d{4}$/.test(String(id))) throw new Error('Invalid character ID');
  const saved = characterWeaponCache.get(id);
  if (saved?.expiresAt > Date.now()) return saved.payload;
  if (characterWeaponRequests.has(id)) return characterWeaponRequests.get(id);
  const task = (async () => {
    const sourceUrl = `https://wuwaguide.kurogames.com/?role_id=${id}`;
    let payload = {signatureWeapon: null, sourceUrl};
    try {
      const list = await fetchJson(`https://guide-server.aki-game.net/introduction/list?roleGbId=${id}`);
      const entry = list.code === 200 && Array.isArray(list.data) ? list.data.find(record => String(record.role?.roleGbId) === String(id) && record.texts?.some(text => text.language === 'en' && text.introductionName)) : null;
      if (entry && Number.isSafeInteger(Number(entry.id))) {
        const result = await fetchJson(`https://guide-server.aki-game.net/introduction/info?roleGbId=${id}&id=${Number(entry.id)}`);
        if (result.code === 200 && String(result.data?.role?.roleGbId) === String(id)) {
          payload = {signatureWeapon: extractExplicitSignatureWeapon(result.data), sourceUrl, author: stripTags(result.data.baseTexts?.find(text => text.language === 'en')?.introductionSource)};
        }
      }
      characterWeaponCache.set(id, {payload, expiresAt: Date.now() + characterCacheTtlMs});
    } catch {payload = saved?.payload || payload; characterWeaponCache.set(id, {payload, expiresAt: Date.now() + 5 * 60000});}
    return payload;
  })();
  characterWeaponRequests.set(id,task);
  try {return await task;} finally {characterWeaponRequests.delete(id);}
}

async function createCharacterMediaPayload() {
  if (characterMediaCache?.expiresAt > Date.now()) return characterMediaCache.payload;
  if (characterMediaRequest) return characterMediaRequest;
  characterMediaRequest = (async () => {
    const verified = Object.fromEntries(verifiedCharacterReleases.map(record => [normalizeKey(record.name), record.videoId]));
    try {
      const response = await fetch("https://www.youtube.com/@WutheringWaves/videos?hl=en", {signal: AbortSignal.timeout(15000), headers: {"Accept-Language": "en-US,en;q=0.9"}});
      if (!response.ok) throw new Error("Official channel unavailable");
      const videos = parseOfficialCharacterVideos(await response.text());
      const payload = {videos: {...videos, ...verified}, channelId: officialChannelId};
      characterMediaCache = {payload, expiresAt: Date.now() + characterCacheTtlMs}; return payload;
    } catch {const payload = characterMediaCache?.payload || {videos: verified, channelId: officialChannelId}; characterMediaCache = {payload, expiresAt: Date.now() + 5 * 60000}; return payload;}
  })();
  try {return await characterMediaRequest;} finally {characterMediaRequest = null;}
}

function createDemoEventsPayload(error) {
  const now = new Date();
  const events = [
    {
      id: "evento-forja-do-eco",
      category: "evento_in_game",
      title: "Forja do Eco: Desafio de Sonatas",
      imageUrl: "/assets/event-forge.png",
      startAt: daysFromNow(-2, -4),
      endAt: daysFromNow(5, 6),
      serverTimezone: "UTC+8",
      rewards: ["Astrites", "Tuneadores", "Tubos de EXP de Eco"],
      sourceUrl: "https://wutheringwaves.kurogames.com/"
    },
    {
      id: "evento-web-arquivo-solaris",
      category: "evento_web",
      title: "Evento Web: Arquivo Solaris",
      imageUrl: "/assets/event-web.png",
      startAt: daysFromNow(1, 2),
      endAt: daysFromNow(13, 2),
      serverTimezone: "UTC+8",
      rewards: ["Creditos Shell", "Materiais de ascensao", "Astrites"],
      sourceUrl: "https://wutheringwaves.kurogames.com/"
    },
    {
      id: "torre-adversidade-ciclo",
      category: "torre_adversidade",
      title: "Torre da Adversidade: Ciclo Resonante",
      imageUrl: "/assets/event-tower.png",
      startAt: daysFromNow(-1),
      endAt: daysFromNow(12),
      serverTimezone: "UTC+8",
      rewards: ["Hazard Record", "Astrites", "Tuners avancados"],
      sourceUrl: "https://wutheringwaves.kurogames.com/"
    },
    {
      id: "codigo-wave-builder",
      category: "codigo",
      title: "Codigo ativo: WAVEBUILDER",
      imageUrl: "/assets/event-code.png",
      startAt: daysFromNow(-10),
      endAt: daysFromNow(3, 5),
      serverTimezone: "UTC+8",
      rewards: ["Astrites x60", "Potion x5", "Creditos Shell"],
      sourceUrl: "https://wutheringwaves.kurogames.com/"
    }
  ].map((event) => ({
    ...event,
    status: getStatus(event.startAt, event.endAt, now)
  }));

  return {
    updatedAt: now.toISOString(),
    syncIntervalMinutes: 10,
    source: error ? `fallback-local: ${error.message}` : "fallback-local",
    externalError: Boolean(error),
    events
  };
}

async function fetchConveneFeed() {
  if (conveneFeedRequest) return conveneFeedRequest;
  // Same source, but independent from the events feed's raw-text cache.
  conveneFeedRequest = (async () => {
    const response = await fetch(conveneFeedUrl, {
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
      headers: {
        Accept: "application/atom+xml,text/xml,text/plain",
        "Cache-Control": "no-cache",
        "User-Agent": "Solaris-Archive-WuWa-Wiki"
      }
    });
    if (!response.ok) throw new Error(`Convene feed unavailable: ${response.status}`);
    const xml = await response.text();
    if (!/<feed[\s>]/i.test(xml)) throw new Error("Invalid convene feed");
    return xml;
  })();
  try { return await conveneFeedRequest; } finally { conveneFeedRequest = null; }
}

async function createEventsPayload() {
  if(eventRequest)return eventRequest;
  eventRequest=buildEventsPayload();
  try{return await eventRequest;}finally{eventRequest=null;}
}

async function buildEventsPayload() {
  const now = Date.now();

  if (eventCache && eventCache.expiresAt > now) {
    return {
      ...eventCache.payload,
      events:eventCache.payload.events.map(event=>({...event,status:currentEventStatus(event,now)})),
      cached: true
    };
  }

  try {
    const feeds=await Promise.allSettled([fetchText(eventFeedUrl),fetchText(eventArchiveUrl,6*60*60*1000)]);
    if(feeds.every(result=>result.status==='rejected'))throw Error('Event sources unavailable');
    const incoming=mergeEventRecords([],feeds.toReversed().flatMap(result=>result.status==='fulfilled'?parseOfficialEventFeed(result.value):[]));
    const events=mergeEventRecords(eventCache?.payload.events || [],incoming).map(event=>({...event,status:currentEventStatus(event,now)}));

    const payload = {
      updatedAt: new Date(now).toISOString(),
      syncIntervalMinutes: Math.round(eventCacheTtlMs / 60000),
      source: eventFeedUrl,
      imageSource: "Kuro Games CDN via TheLovinator1/wutheringwaves",
      partial: feeds.some(result=>result.status==='rejected'),
      events
    };

    eventCache = {
      expiresAt: now + eventCacheTtlMs,
      payload
    };

    return {
      ...payload,
      cached: false
    };
  } catch (error) {
    if (eventCache?.payload && !eventCache.payload.externalError) {
      return { ...eventCache.payload, events:eventCache.payload.events.map(event=>({...event,status:currentEventStatus(event,now)})),cached: true, stale: true, externalError: true, message: error.message };
    }
    // Never advertise demo events or generated codes as current game content.
    const payload = {updatedAt:new Date(now).toISOString(),syncIntervalMinutes:2,source:eventFeedUrl,externalError:true,events:[]};
    eventCache = { payload, expiresAt: now + 2 * 60 * 1000 };
    return payload;
  }
}

function parseCodeSource(html, sourceUrl) {
  const pocket=sourceUrl.includes('pockettactics');
  const expiredMarkup=html.replace(/<\/?(?:strong|b|i|span)\b[^>]*>/gi,'');
  const activeSection=pocket?html.match(/Here are all the active WuWa codes:[\s\S]*?<ul\b[^>]*>([\s\S]*?)<\/ul>/i)?.[1]:html.match(/id="h-all-new-wuthering-waves-codes"[\s\S]*?<ul\b[^>]*>([\s\S]*?)<\/ul>/i)?.[1];
  const expiredSection=pocket?expiredMarkup.match(/Expired codes:[\s\S]*?<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1]:html.match(/id="h-all-expired-wuthering-waves-codes"[\s\S]*?<ul\b[^>]*>([\s\S]*?)<\/ul>/i)?.[1];
  if(activeSection===undefined || expiredSection===undefined)throw Error('Code source format unavailable');
  const expired=new Set(stripTags(expiredSection).split(/[|\s,]+/).filter(code=>/^[A-Z0-9]{5,32}$/.test(code)));
  const codes=[...activeSection.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].flatMap(([,row])=>{
    const code=row.match(/<strong>\s*([A-Z0-9]{5,32})\s*<\/strong>/)?.[1];
    if(!code || expired.has(code))return [];
    const text=stripTags(row.replace(/<button\b[\s\S]*?<\/button>/gi,''));
    const words={one:1,two:2,three:3,four:4,five:5};
    const normalized=text.replace(/\b(one|two|three|four|five)\b/gi,word=>words[word.toLowerCase()]).replace(/(\d+)k\b/gi,(_,number)=>Number(number)*1000);
    const rewards=[...normalized.matchAll(/(\d[\d,]*)\s+(Astrites?|(?:Premium|Advanced|Medium|Basic) Resonance Potions?|(?:Medium|Advanced|Basic) Revival Inhalers?|(?:Medium|Advanced|Basic) Energy Bags?|Shell Credits?|(?:Advanced|Medium|Basic) Energy Cores?|(?:Medium|Advanced) Nutrient Blocks?|Advanced Enclosure Tank II)/gi)].map(match=>match[2].replace(/s$/i,'').replace(/\b[a-z]/g,char=>char.toUpperCase())+' x'+match[1].replaceAll(',',''));
    const expiry=normalized.match(/(?:expires?|valid until|ends?)\s*(?:on|at|:)?\s*(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2})?(?:Z|[+-]\d{2}:\d{2}))/i)?.[1];
    return [{code,status:'active',rewards,expiresAt:expiry && Number.isFinite(Date.parse(expiry))?new Date(expiry).toISOString():null,sourceUrl}];
  });
  return {codes,expired:[...expired]};
}

async function createCodesPayload() {
  const now=Date.now();
  if(codeCache?.expiresAt>now)return {...codeCache.payload,cached:true};
  if(codeRequest)return codeRequest;
  codeRequest=(async()=>{
    const results=await Promise.allSettled(codeSourceUrls.map(async url=>{
      const response=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Solaris-Archive-WuWa-Wiki',Accept:'text/html'}});
      if(!response.ok)throw Error('Code source unavailable');
      return {...parseCodeSource(await response.text(),url),url};
    }));
    const successful=results.filter(result=>result.status==='fulfilled').map(result=>result.value);
    const expired=new Set(successful.flatMap(source=>source.expired));
    const records=new Map();
    for(const source of successful)for(const code of source.codes){
      if(expired.has(code.code) || code.expiresAt && Date.parse(code.expiresAt)<=now)continue;
      const previous=records.get(code.code);
      records.set(code.code,{...code,rewards:previous?.rewards.length?previous.rewards:code.rewards,sources:[...(previous?.sources || []),source.url]});
    }
    const payload={codes:[...records.values()],updatedAt:new Date(now).toISOString(),syncIntervalMinutes:60,
      sources:successful.map(source=>source.url),partial:successful.length>0 && successful.length<codeSourceUrls.length,externalError:!successful.length};
    codeCache={payload,expiresAt:now+(payload.externalError?2*60000:codeCacheTtlMs)};
    return payload;
  })();
  try{return await codeRequest;}finally{codeRequest=null;}
}

async function createConvenesPayload() {
  const now = Date.now();

  if (conveneCache && conveneCache.expiresAt > now) {
    return {
      ...conveneCache.payload,
      cached: true
    };
  }

  try {
    const xml = await fetchConveneFeed();
    const records = parseOfficialConveneFeed(xml);
    for (const addition of verifiedConveneAdditions) {
      if (!records.some(record => record.type === addition.type && normalizeKey(record.featuredName) === normalizeKey(addition.featuredName) && record.startAt === addition.startAt && record.endAt === addition.endAt)
          && !records.some(record => record.type === addition.type && normalizeKey(record.featuredName) === normalizeKey(addition.featuredName) && Date.parse(record.startAt) <= now && Date.parse(record.endAt) > now)) records.push(addition);
    }
    const convenes = records
      .filter((convene) => new Date(convene.startAt).getTime() <= now && new Date(convene.endAt).getTime() > now)
      .slice(0, 8)
      .map((convene) => ({
        ...convene,
        status: "ao_vivo"
      }));

    const payload = {
      updatedAt: new Date(now).toISOString(),
      syncIntervalMinutes: Math.round(conveneCacheTtlMs / 60000),
      source: conveneFeedUrl,
      imageSource: "Kuro Games CDN via TheLovinator1/wutheringwaves",
      convenes
    };

    conveneCache = {
      // Recheck at a phase transition, even if the normal TTL has not elapsed.
      expiresAt: Math.min(now + conveneCacheTtlMs, ...records.flatMap((record) => [Date.parse(record.startAt), Date.parse(record.endAt)]).filter((time) => time > now)),
      payload
    };

    return {
      ...payload,
      cached: false
    };
  } catch (error) {
    // An unavailable source must never turn an old or demo banner into a live one.
    const fallback = {
      updatedAt: new Date(now).toISOString(),
      syncIntervalMinutes: 1,
      source: conveneFeedUrl,
      externalError: true,
      message: error.message,
      convenes: []
    };
    conveneCache = {
      expiresAt: now + 60 * 1000,
      payload: fallback
    };
    return fallback;
  }
}

function responseEncoding(request) {
  const accepted = new Map(String(request.headers['accept-encoding'] || '').toLowerCase().split(',').map(part => {
    const [name, ...parameters] = part.trim().split(';');
    const quality = parameters.find(value => value.trim().startsWith('q='));
    return [name, quality ? Number(quality.trim().slice(2)) : 1];
  }));
  const quality = name => accepted.get(name) ?? accepted.get('*') ?? 0;
  const identity = accepted.get('identity') ?? (accepted.get('*') === 0 ? 0 : 1);
  const preferred = quality('br') >= quality('gzip') ? 'br' : 'gzip';
  return quality(preferred) > 0 && quality(preferred) >= identity ? preferred : '';
}

function compressor(encoding) {
  return encoding === 'br' ? createBrotliCompress({ params: { [constants.BROTLI_PARAM_QUALITY]: 4 } }) : createGzip();
}

async function serveFile(response, filePath, request) {
  const ext = path.extname(filePath);
  const type = mimeTypes[ext] || "application/octet-stream";
  const cacheControl = [".html", ".js", ".css"].includes(ext)
    ? "no-cache"
    : "public, max-age=3600";

  const fileStat = await stat(filePath);
  const compressible = ['.html', '.css', '.js', '.json', '.svg', '.xml'].includes(ext);
  const encoding = compressible && fileStat.size >= 1024 ? responseEncoding(request) : '';
  if (ext === '.webm' && request.headers.range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range);
    const start = match ? Number(match[1]) : NaN;
    const end = match && match[2] ? Math.min(Number(match[2]),fileStat.size-1) : fileStat.size-1;
    if (!Number.isSafeInteger(start) || start < 0 || start > end || start >= fileStat.size) {
      response.writeHead(416, {'Content-Range': `bytes */${fileStat.size}`}); response.end(); return;
    }
    response.writeHead(206, {'Content-Type':type,'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${fileStat.size}`,'Content-Length':end-start+1,'Cache-Control':cacheControl});
    if(request.method==='HEAD'){response.end();return;}
    createReadStream(filePath,{start,end}).pipe(response); return;
  }
  const etag = `W/"${fileStat.size}-${fileStat.mtimeMs}"`;
  if (request.headers["if-none-match"] === etag) {
    response.writeHead(304, { "ETag": etag, "Cache-Control": cacheControl, ...(compressible ? { Vary: 'Accept-Encoding' } : {}) });
    response.end();
    return;
  }
  response.writeHead(200, {
    "Content-Type": type,
    "Cache-Control": cacheControl,
    "ETag": etag,
    ...(encoding ? { 'Content-Encoding': encoding } : { 'Content-Length': fileStat.size }),
    ...(compressible ? { Vary: 'Accept-Encoding' } : {}),
    ...(ext === '.webm' ? { 'Accept-Ranges': 'bytes' } : {})
  });
  if (request.method === "HEAD") { response.end(); return; }
  if (encoding) await pipeline(createReadStream(filePath), compressor(encoding), response);
  else await pipeline(createReadStream(filePath), response);
}

async function serveIndex(response, request) {
  await serveFile(response, path.join(publicDir, "index.html"), request);
}

async function sendJson(request, response, status, payload, cacheControl) {
  const body = JSON.stringify(payload);
  const encoding = Buffer.byteLength(body) >= 1024 ? responseEncoding(request) : '';
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheControl,
    Vary: 'Accept-Encoding',
    ...(encoding ? { 'Content-Encoding': encoding } : { 'Content-Length': Buffer.byteLength(body) })
  });
  if (encoding) await pipeline(Readable.from([body]), compressor(encoding), response);
  else response.end(body);
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (request.method === "GET" && /^\/api\/character-weapons\/\d{4}$/.test(url.pathname)) {
      await sendJson(request, response, 200, await createCharacterWeaponPayload(url.pathname.split('/').pop()), 'public, max-age=300'); return;
    }

    if (request.method === "GET" && /^\/api\/characters\/\d{4}$/.test(url.pathname)) {
      try { await sendJson(request, response, 200, await createCharacterDetailPayload(url.pathname.split('/').pop()), 'public, max-age=300'); }
      catch { await sendJson(request, response, 502, {error: "character_details_unavailable"}, 'no-store'); }
      return;
    }
    if (request.method === "GET" && url.pathname === "/api/character-media") {
      await sendJson(request, response, 200, await createCharacterMediaPayload(), 'public, max-age=300'); return;
    }

    if (request.method === "GET" && url.pathname === "/api/characters") {
      try {
        const payload = await createCharactersPayload();
        await sendJson(request, response, 200, payload, 'public, max-age=300');
      } catch (error) {
        if (response.headersSent) { response.destroy(); return; }
        await sendJson(request, response, 502, {
          error: "characters_source_unavailable",
          message: error.message,
          source: characterSourceUrl,
          imageSource: "https://github.com/ryanbenson/wuthering-waves-assets",
          characters: []
        }, 'no-store');
      }
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/events") {
      const payload = await createEventsPayload();
      await sendJson(request, response, 200, payload, 'public, max-age=120');
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/codes") {
      await sendJson(request,response,200,await createCodesPayload(),'public, max-age=120');
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/convenes") {
      const payload = await createConvenesPayload();
      await sendJson(request, response, 200, payload, 'no-store');
      return;
    }

    if (request.method !== "GET" && request.method !== "HEAD") {
      response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Method not allowed");
      return;
    }

    const requestedPath = decodeURIComponent(url.pathname);
    const staticPath = requestedPath === "/"
      ? path.join(publicDir, "index.html")
      : path.join(publicDir, requestedPath);
    const resolvedPath = path.resolve(staticPath);
    const resolvedPublic = path.resolve(publicDir);

    if (resolvedPath !== resolvedPublic && !resolvedPath.startsWith(resolvedPublic + path.sep)) {
      response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Forbidden");
      return;
    }

    try {
      const fileStat = await stat(resolvedPath);
      if (fileStat.isFile()) {
        await serveFile(response, resolvedPath, request);
        return;
      }
    } catch (error) {
      if (response.headersSent) { response.destroy(); return; }
      if (!['ENOENT', 'ENOTDIR'].includes(error.code)) throw error;
      // Fall through to SPA routing.
    }

    await serveIndex(response, request);
  } catch (error) {
    if (response.headersSent) { response.destroy(); return; }
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(`Server error: ${error.message}`);
  }
});

server.listen(port, () => {
  console.log(`Solaris Archive running at http://localhost:${port}`);
});
