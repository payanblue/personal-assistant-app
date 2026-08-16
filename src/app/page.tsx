"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import KoreanLunarCalendar from "korean-lunar-calendar";

type Tab = "home" | "memo" | "work" | "calendar" | "restaurants" | "more" | "weather" | "charge";
type VoiceKind = "memo" | "work" | "calendar";

type SpeechRecognitionResultEventLike = Event & {
  results: { 0: { 0: { transcript: string } } };
};
type SpeechRecognitionErrorEventLike = Event & { error: string };
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((event: SpeechRecognitionResultEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};
type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type LeafletMap = {
  setView: (center: [number, number], zoom: number) => LeafletMap;
  getBounds: () => { getWest: () => number; getSouth: () => number; getEast: () => number; getNorth: () => number };
  on: (event: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => LeafletMap;
  off: (event: string, handler: (event: { latlng: { lat: number; lng: number } }) => void) => LeafletMap;
  invalidateSize: () => LeafletMap;
  remove: () => void;
};
type LeafletLayer = { clearLayers: () => void; addTo: (map: LeafletMap) => LeafletLayer };
type LeafletMarker = {
  addTo: (layer: LeafletLayer) => LeafletMarker;
  on: (event: string, handler: () => void) => LeafletMarker;
};
type LeafletApi = {
  map: (element: HTMLElement, options?: Record<string, unknown>) => LeafletMap;
  tileLayer: (url: string, options?: Record<string, unknown>) => { addTo: (map: LeafletMap) => void };
  layerGroup: () => LeafletLayer;
  marker: (position: [number, number], options?: Record<string, unknown>) => LeafletMarker;
  circleMarker: (position: [number, number], options?: Record<string, unknown>) => LeafletMarker;
  divIcon: (options: Record<string, unknown>) => unknown;
};
type TesseractApi = {
  recognize: (
    image: File,
    language: string,
    options?: { logger?: (message: { status?: string; progress?: number }) => void },
  ) => Promise<{ data: { text: string } }>;
  createWorker?: (
    languages: string,
    engineMode?: number,
    options?: { logger?: (message: { status?: string; progress?: number }) => void },
  ) => Promise<{
    recognize: (image: File) => Promise<{ data: { text: string } }>;
    terminate: () => Promise<void>;
  }>;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    L?: LeafletApi;
    Tesseract?: TesseractApi;
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GoogleTokenResponse) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

type WeatherDaily = {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  sunrise?: string[];
  sunset?: string[];
  precipitation_probability_max?: number[];
};

type WeatherResponse = {
  current?: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    weather_code: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
  };
  daily: WeatherDaily;
};

type AirQualityResponse = {
  hourly: { time: string[]; pm10: number[]; pm2_5: number[] };
};

type WeatherLocation = {
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  timezone: string;
};
type GreetingWeather = { code: number; rainChance: number; temperature: number };
type GeocodingResult = {
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
  timezone: string;
};
type PlaceSearchResult = {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    quarter?: string;
    suburb?: string;
    neighbourhood?: string;
    village?: string;
    town?: string;
    city?: string;
    state?: string;
    country?: string;
  };
};
const defaultWeatherLocation: WeatherLocation = {
  name: "서울",
  area: "대한민국",
  latitude: 37.5665,
  longitude: 126.978,
  timezone: "Asia/Seoul",
};
const quickWeatherLocations: WeatherLocation[] = [
  {
    name: "성안동",
    area: "울산광역시 중구",
    latitude: 35.576,
    longitude: 129.326,
    timezone: "Asia/Seoul",
  },
  defaultWeatherLocation,
  {
    name: "부산",
    area: "대한민국",
    latitude: 35.1796,
    longitude: 129.0756,
    timezone: "Asia/Seoul",
  },
  {
    name: "대구",
    area: "대한민국",
    latitude: 35.8714,
    longitude: 128.6014,
    timezone: "Asia/Seoul",
  },
  {
    name: "인천",
    area: "대한민국",
    latitude: 37.4563,
    longitude: 126.7052,
    timezone: "Asia/Seoul",
  },
  {
    name: "광주",
    area: "대한민국",
    latitude: 35.1595,
    longitude: 126.8526,
    timezone: "Asia/Seoul",
  },
  {
    name: "대전",
    area: "대한민국",
    latitude: 36.3504,
    longitude: 127.3845,
    timezone: "Asia/Seoul",
  },
  {
    name: "제주",
    area: "대한민국",
    latitude: 33.4996,
    longitude: 126.5312,
    timezone: "Asia/Seoul",
  },
];

type Memo = {
  id: number;
  title: string;
  content: string;
  category: "개인" | "아이디어" | "생활";
  pinned: boolean;
  deleted: boolean;
  completed?: boolean;
  completedAt?: string;
  createdAt: string;
};

const sampleMemos: Memo[] = [];

type WorkItem = {
  id: number;
  title: string;
  details: string;
  project: string;
  completed: boolean;
  archived?: boolean;
  createdAt: string;
};

const sampleWorkItems: WorkItem[] = [];

type CalendarEvent = {
  id: number;
  title: string;
  date: string;
  time: string;
  allDay?: boolean;
  content: string;
  repeatYearly: boolean;
  calendarType: "solar" | "lunar";
  reminder3Days: boolean;
  reminder1Day: boolean;
  googleEventId?: string;
  googleEventUrl?: string;
  deleted?: boolean;
  completed?: boolean;
  completedAt?: string;
  archivedAt?: string;
};

type BackupPayload = {
  app: "personal-assistant-app";
  version: 1;
  exportedAt: string;
  memos: Memo[];
  workItems: WorkItem[];
  events: Array<CalendarEvent & { duration?: string; category?: string }>;
  weatherLocation?: WeatherLocation;
  savedWeatherLocations?: WeatherLocation[];
  chargers?: ChargerFavorite[];
  restaurants?: Restaurant[];
};

type RestaurantCategory =
  | "전체"
  | "한식"
  | "국밥·면"
  | "고기"
  | "회·해산물"
  | "일식"
  | "중식"
  | "양식"
  | "치킨·분식"
  | "카페·디저트"
  | "기타";

type Restaurant = {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: Exclude<RestaurantCategory, "전체">;
  tags: string[];
  memo: string;
  mapUrl?: string;
  visited: boolean;
  createdAt: string;
};

const restaurantCategories: Array<{ id: RestaurantCategory; icon: string }> = [
  { id: "전체", icon: "🍽️" },
  { id: "한식", icon: "🍚" },
  { id: "국밥·면", icon: "🍜" },
  { id: "고기", icon: "🥩" },
  { id: "회·해산물", icon: "🐟" },
  { id: "일식", icon: "🍣" },
  { id: "중식", icon: "🥟" },
  { id: "양식", icon: "🍝" },
  { id: "치킨·분식", icon: "🍗" },
  { id: "카페·디저트", icon: "☕" },
  { id: "기타", icon: "📍" },
];

const categoryIcon = (category: RestaurantCategory) =>
  restaurantCategories.find((item) => item.id === category)?.icon ?? "📍";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  })[character] ?? character);
}

type SharedRestaurantImage = {
  id?: number;
  blob: Blob;
  name: string;
  type: string;
  lastModified: number;
};

type SharedRestaurantPlace = {
  title: string;
  text: string;
  url: string;
};

type ResolvedMapPlace = {
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
};

function takeSharedRestaurantContent(): Promise<{ files: File[]; place: SharedRestaurantPlace | null }> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open("personal-assistant-share-target", 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("restaurant-images"))
        database.createObjectStore("restaurant-images", { keyPath: "id", autoIncrement: true });
      if (!database.objectStoreNames.contains("restaurant-places"))
        database.createObjectStore("restaurant-places", { keyPath: "id", autoIncrement: true });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const database = request.result;
      const transaction = database.transaction(["restaurant-images", "restaurant-places"], "readwrite");
      const imageStore = transaction.objectStore("restaurant-images");
      const placeStore = transaction.objectStore("restaurant-places");
      const getRequest = imageStore.getAll();
      const getPlaceRequest = placeStore.getAll();
      let records: SharedRestaurantImage[] = [];
      let places: SharedRestaurantPlace[] = [];
      getRequest.onsuccess = () => {
        records = getRequest.result as SharedRestaurantImage[];
        imageStore.clear();
      };
      getPlaceRequest.onsuccess = () => {
        places = getPlaceRequest.result as SharedRestaurantPlace[];
        placeStore.clear();
      };
      transaction.oncomplete = () => {
        database.close();
        resolve({
          files: records.map((record, index) => new File(
            [record.blob],
            record.name || `맛집-공유-${index + 1}.jpg`,
            { type: record.type || record.blob.type || "image/jpeg", lastModified: record.lastModified || Date.now() },
          )),
          place: places.at(-1) ?? null,
        });
      };
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    };
  });
}

const sampleEvents: CalendarEvent[] = [];
const COMPLETED_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

function retainRecentCompleted<T extends { completed?: boolean; completedAt?: string }>(
  items: T[],
): T[] {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  return items
    .map((item) =>
      item.completed && !item.completedAt ? { ...item, completedAt: nowIso } : item,
    )
    .filter(
      (item) =>
        !item.completed ||
        !item.completedAt ||
        now - Date.parse(item.completedAt) < COMPLETED_RETENTION_MS,
    );
}

function isPastCompletionMonth(event: CalendarEvent, now = new Date()) {
  if (!event.completed) return false;
  const completedDate = event.completedAt ? new Date(event.completedAt) : now;
  if (Number.isNaN(completedDate.getTime())) return false;
  return (
    completedDate.getFullYear() < now.getFullYear() ||
    (completedDate.getFullYear() === now.getFullYear() && completedDate.getMonth() < now.getMonth())
  );
}

function calendarEventIsVisible(event: CalendarEvent, now = new Date()) {
  return !event.deleted && (!event.completed || !isPastCompletionMonth(event, now));
}

function retainCompletedEvents(items: CalendarEvent[]): CalendarEvent[] {
  const now = new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  return items
    .map((item) => {
      if (!item.completed) return item;
      const withCompletedAt = item.completedAt ? item : { ...item, completedAt: nowIso };
      return isPastCompletionMonth(withCompletedAt, now) && !withCompletedAt.archivedAt
        ? { ...withCompletedAt, archivedAt: nowIso }
        : withCompletedAt;
    })
    .filter(
      (item) =>
        !item.completed ||
        !item.archivedAt ||
        nowMs - Date.parse(item.archivedAt) < COMPLETED_RETENTION_MS,
    );
}

function normalizeCalendarEvent(
  event: CalendarEvent & { duration?: string; category?: string },
): CalendarEvent {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    time: event.time,
    allDay: Boolean(event.allDay),
    content:
      event.content ??
      [event.duration, event.category].filter(Boolean).join(" · "),
    repeatYearly: Boolean(event.repeatYearly),
    calendarType: event.calendarType ?? "solar",
    reminder3Days: Boolean(event.reminder3Days),
    reminder1Day: Boolean(event.reminder1Day),
    googleEventId: event.googleEventId,
    googleEventUrl: event.googleEventUrl,
    deleted: Boolean(event.deleted),
    completed: Boolean(event.completed),
    completedAt: event.completedAt,
    archivedAt: event.archivedAt,
  };
}

let googleIdentityPromise: Promise<void> | null = null;
function loadGoogleIdentity() {
  if (window.google) return Promise.resolve();
  if (googleIdentityPromise) return googleIdentityPromise;
  googleIdentityPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Identity load failed"));
    document.head.appendChild(script);
  });
  return googleIdentityPromise;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function solarToLunar(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const calendar = new KoreanLunarCalendar();
  if (!calendar.setSolarDate(year, month, day)) return null;
  return calendar.getLunarCalendar();
}

function lunarToSolar(year: number, month: number, day: number) {
  const calendar = new KoreanLunarCalendar();
  if (!calendar.setLunarDate(year, month, day, false)) return null;
  const solar = calendar.getSolarCalendar();
  return `${solar.year}-${String(solar.month).padStart(2, "0")}-${String(solar.day).padStart(2, "0")}`;
}

function addDays(dateKey: string, amount: number) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

const holidayCache = new Map<number, Map<string, string>>();

function koreanHolidays(year: number) {
  const cached = holidayCache.get(year);
  if (cached) return cached;

  const base = new Map<string, string[]>();
  const substitutes = new Map<string, string>();
  const add = (date: string | null, name: string) => {
    if (!date) return;
    base.set(date, [...(base.get(date) ?? []), name]);
  };

  add(`${year}-01-01`, "신정");
  add(`${year}-03-01`, "삼일절");
  if (year >= 2026) add(`${year}-05-01`, "근로자의 날");
  add(`${year}-05-05`, "어린이날");
  add(`${year}-06-06`, "현충일");
  if (year >= 2026) add(`${year}-07-17`, "제헌절");
  add(`${year}-08-15`, "광복절");
  add(`${year}-10-03`, "개천절");
  add(`${year}-10-09`, "한글날");
  add(`${year}-12-25`, "성탄절");

  const seollal = lunarToSolar(year, 1, 1);
  const buddha = lunarToSolar(year, 4, 8);
  const chuseok = lunarToSolar(year, 8, 15);
  if (seollal) {
    add(addDays(seollal, -1), "설날 연휴");
    add(seollal, "설날");
    add(addDays(seollal, 1), "설날 연휴");
  }
  add(buddha, "부처님오신날");
  if (chuseok) {
    add(addDays(chuseok, -1), "추석 연휴");
    add(chuseok, "추석");
    add(addDays(chuseok, 1), "추석 연휴");
  }

  const isWeekend = (dateKey: string) => {
    const day = new Date(`${dateKey}T12:00:00`).getDay();
    return day === 0 || day === 6;
  };
  const addSubstitute = (after: string, name: string) => {
    let candidate = addDays(after, 1);
    while (base.has(candidate) || substitutes.has(candidate) || isWeekend(candidate)) {
      candidate = addDays(candidate, 1);
    }
    substitutes.set(candidate, `${name} 대체공휴일`);
  };

  const substituteEligible = new Set([
    "삼일절", "광복절", "개천절", "한글날", "부처님오신날", "어린이날", "성탄절",
    ...(year >= 2026 ? ["근로자의 날", "제헌절"] : []),
  ]);
  for (const [date, names] of base) {
    for (const name of names) {
      if (substituteEligible.has(name) && (isWeekend(date) || names.length > 1)) {
        addSubstitute(date, name);
      }
    }
  }
  for (const [center, name] of [[seollal, "설날"], [chuseok, "추석"]] as const) {
    if (!center) continue;
    const dates = [addDays(center, -1), center, addDays(center, 1)];
    const needsSubstitute = dates.some((date) =>
      new Date(`${date}T12:00:00`).getDay() === 0 || (base.get(date)?.length ?? 0) > 1,
    );
    if (needsSubstitute) addSubstitute(dates[2], name);
  }

  const holidays = new Map<string, string>();
  for (const [date, names] of base) holidays.set(date, names.join(" · "));
  for (const [date, name] of substitutes) holidays.set(date, name);
  holidayCache.set(year, holidays);
  return holidays;
}

function holidayName(dateKey: string) {
  return koreanHolidays(Number(dateKey.slice(0, 4))).get(dateKey) ?? "";
}

function isSunday(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).getDay() === 0;
}

function eventOccursOn(event: CalendarEvent, solarDate: string) {
  if (!event.repeatYearly) return event.date === solarDate;
  if (event.calendarType === "lunar") {
    const lunar = solarToLunar(solarDate);
    return Boolean(
      lunar &&
      `${String(lunar.month).padStart(2, "0")}-${String(lunar.day).padStart(2, "0")}` ===
        event.date.slice(5),
    );
  }
  return event.date.slice(5) === solarDate.slice(5);
}

function occurrenceInYear(event: CalendarEvent, year: number) {
  if (!event.repeatYearly) return event.date;
  const month = Number(event.date.slice(5, 7));
  const day = Number(event.date.slice(8, 10));
  if (event.calendarType === "lunar") return lunarToSolar(year, month, day);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function nextOccurrence(event: CalendarEvent, from = new Date()) {
  const today = localDateKey(from);
  if (!event.repeatYearly) return event.date >= today ? event.date : null;
  const thisYear = occurrenceInYear(event, from.getFullYear());
  if (thisYear && thisYear >= today) return thisYear;
  return occurrenceInYear(event, from.getFullYear() + 1);
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T00:00:00`).getTime();
  return Math.round((end - start) / 86400000);
}

const menuItems: { icon: string; label: string; id: Tab }[] = [
  { icon: "⌂", label: "홈", id: "home" },
  { icon: "✎", label: "메모", id: "memo" },
  { icon: "✓", label: "업무", id: "work" },
  { icon: "●", label: "맛집 지도", id: "restaurants" },
  { icon: "•••", label: "더보기", id: "more" },
];

const validTabs: Tab[] = [
  "home", "memo", "work", "calendar", "restaurants", "more", "weather", "charge",
];

type ChargerFavorite = {
  id: number;
  name: string;
  address: string;
  operator: string;
  speed: string;
  distance: string;
  memberPrice: string;
  guestPrice: string;
  ready: number;
  busy: number;
  down: number;
  slowCount: number;
  fastCount: number;
  latitude: number;
  longitude: number;
};

const defaultChargers: ChargerFavorite[] = [
  { id: 1, name: "성안동 공영주차장", address: "울산 중구 성안동 공영주차장", operator: "Turu Charger", speed: "완속 7kW", distance: "0.8km", memberPrice: "292원", guestPrice: "324원", ready: 2, busy: 1, down: 0, slowCount: 3, fastCount: 0, latitude: 35.5757, longitude: 129.3256 },
  { id: 2, name: "울산 중구청", address: "울산광역시 중구 중앙길 1", operator: "Turu Charger", speed: "급속 100kW", distance: "2.1km", memberPrice: "347원", guestPrice: "389원", ready: 3, busy: 2, down: 0, slowCount: 1, fastCount: 5, latitude: 35.5681, longitude: 129.3327 },
  { id: 3, name: "울산 종합운동장", address: "울산광역시 중구 염포로 55", operator: "Turu Charger", speed: "완속 7kW", distance: "4.7km", memberPrice: "292원", guestPrice: "324원", ready: 4, busy: 0, down: 1, slowCount: 5, fastCount: 0, latitude: 35.5615, longitude: 129.3499 },
  { id: 4, name: "부산 본가 주변", address: "부산광역시", operator: "현대 E-pit", speed: "급속 100kW", distance: "즐겨찾기", memberPrice: "확인 필요", guestPrice: "확인 필요", ready: 1, busy: 2, down: 0, slowCount: 0, fastCount: 3, latitude: 35.1796, longitude: 129.0756 },
  { id: 5, name: "자주 가는 업무 현장", address: "울산광역시", operator: "환경부", speed: "완속 7kW", distance: "즐겨찾기", memberPrice: "292원", guestPrice: "324원", ready: 1, busy: 0, down: 0, slowCount: 2, fastCount: 1, latitude: 35.576, longitude: 129.326 },
];

function greetingForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 6) return "늦은 시간이네요";
  if (hour < 12) return "좋은 아침이에요";
  if (hour < 18) return "좋은 오후예요";
  return "편안한 저녁이에요";
}

function weatherGreeting(weather: GreetingWeather | null) {
  const base = greetingForNow();
  if (!weather) return { title: base, detail: "오늘의 날씨를 확인하는 중이에요" };
  if (weather.code >= 95)
    return { title: "천둥번개 가능성이 있어요", detail: "외출 전 기상 정보를 한 번 더 확인하세요" };
  if (weather.code >= 51 || weather.rainChance >= 60)
    return { title: base, detail: "오늘 비 가능성이 있어요 · 우산을 챙기세요" };
  if (weather.code <= 1)
    return { title: "맑은 " + base.replace("좋은 ", ""), detail: `${Math.round(weather.temperature)}° · 가볍게 하루를 시작해 볼까요` };
  return { title: "구름 낀 " + base.replace("좋은 ", ""), detail: `${Math.round(weather.temperature)}° · 필요한 일부터 가볍게 정리해요` };
}

function todayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(date);
}

function openNaverMap(address: string) {
  window.open(
    `https://map.naver.com/p/search/${encodeURIComponent(address)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

function openRestaurantMap(restaurant: Restaurant) {
  if (/^https:\/\/(naver\.me|map\.naver\.com)\//i.test(restaurant.mapUrl ?? "")) {
    window.open(restaurant.mapUrl, "_blank", "noopener,noreferrer");
    return;
  }
  openNaverMap(restaurant.name);
}

function analyzeVoiceText(text: string) {
  const now = new Date();
  let date = localDateKey(now);
  let time = "09:00";
  let kind: VoiceKind = "memo";
  if (/(업무|할\s?일|해야\s?할|작업)/.test(text)) kind = "work";
  if (
    /(일정|약속|회의|예약|생일|오늘|내일|모레|\d+월\s*\d+일|\d+시)/.test(text)
  )
    kind = "calendar";

  if (text.includes("모레")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 2);
    date = localDateKey(target);
  } else if (text.includes("내일")) {
    const target = new Date(now);
    target.setDate(target.getDate() + 1);
    date = localDateKey(target);
  }

  const dateMatch = text.match(/(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일/);
  if (dateMatch)
    date = `${dateMatch[1] ?? now.getFullYear()}-${String(Number(dateMatch[2])).padStart(2, "0")}-${String(Number(dateMatch[3])).padStart(2, "0")}`;
  const timeMatch = text.match(
    /(?:(오전|오후)\s*)?(\d{1,2})시(?:\s*(\d{1,2})분)?/,
  );
  if (timeMatch) {
    let hour = Number(timeMatch[2]);
    if (timeMatch[1] === "오후" && hour < 12) hour += 12;
    if (timeMatch[1] === "오전" && hour === 12) hour = 0;
    time = `${String(Math.min(hour, 23)).padStart(2, "0")}:${String(Number(timeMatch[3] ?? 0)).padStart(2, "0")}`;
  }
  return { kind, date, time };
}

function voiceTitle(text: string) {
  const cleaned = text
    .replace(/^(메모|업무|일정)\s*(해줘|추가|등록|작성)?\s*/g, "")
    .replace(/\s*(메모해줘|기록해줘|추가해줘|등록해줘)\s*$/g, "")
    .trim();
  return (cleaned || text.trim()).slice(0, 42);
}

function HomeWeather({
  location,
  onCurrentWeather,
}: {
  location: WeatherLocation;
  onCurrentWeather?: (weather: GreetingWeather) => void;
}) {
  const [forecast, setForecast] = useState<WeatherResponse | null>(null);
  const [air, setAir] = useState<AirQualityResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const common = `latitude=${location.latitude}&longitude=${location.longitude}&timezone=${encodeURIComponent(location.timezone)}&forecast_days=16&wind_speed_unit=ms`;
    const forecastUrl = `https://api.open-meteo.com/v1/forecast?${common}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max,sunrise,sunset`;
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.latitude}&longitude=${location.longitude}&timezone=${encodeURIComponent(location.timezone)}&hourly=pm10,pm2_5`;
    fetch(forecastUrl)
      .then(async (weatherResponse) => {
        if (!weatherResponse.ok) throw new Error("home weather request failed");
        const weatherValue = (await weatherResponse.json()) as WeatherResponse;
        setFailed(false);
        setForecast(weatherValue);
      })
      .catch(() => setFailed(true));
    fetch(airUrl)
      .then(async (airResponse) => {
        if (airResponse.ok) setAir((await airResponse.json()) as AirQualityResponse);
      })
      .catch(() => setAir(null));
  }, [location]);

  useEffect(() => {
    if (!forecast?.current || !forecast.hourly) return;
    const now = new Date();
    const currentHour = `${localDateKey(now)}T${String(now.getHours()).padStart(2, "0")}:00`;
    const currentIndex = Math.max(
      0,
      forecast.hourly.time.findIndex((time) => time >= currentHour),
    );
    onCurrentWeather?.({
      code: forecast.current.weather_code,
      rainChance: forecast.hourly.precipitation_probability[currentIndex] ?? 0,
      temperature: forecast.current.temperature_2m,
    });
  }, [forecast, onCurrentWeather]);

  if (failed)
    return (
      <div className="home-weather-error">오늘 날씨를 불러오지 못했어요</div>
    );
  if (!forecast?.hourly)
    return (
      <div className="home-weather-loading">
        오늘 날씨를 불러오는 중이에요
      </div>
    );

  const now = new Date();
  const currentHour = `${localDateKey(now)}T${String(now.getHours()).padStart(2, "0")}:00`;
  const startIndex = Math.max(
    0,
    forecast.hourly.time.findIndex((time) => time >= currentHour),
  );
  const airIndex = air?.hourly
    ? Math.max(0, air.hourly.time.findIndex((time) => time >= currentHour))
    : -1;
  const pm10 = airIndex >= 0 ? Math.round(air?.hourly.pm10[airIndex] ?? 0) : null;
  const pm25 = airIndex >= 0 ? Math.round(air?.hourly.pm2_5[airIndex] ?? 0) : null;
  const rainChance = forecast.hourly.precipitation_probability[startIndex] ?? 0;
  const rainAmount = forecast.hourly.precipitation[startIndex] ?? 0;

  return (
    <section
      className="home-weather home-weather-compact"
      aria-label={`${location.name} 오늘 날씨`}
    >
      <div className="home-weather-current">
        <div>
          <p>
            {location.name} ·{" "}
            {weatherLabel(forecast.current?.weather_code ?? 3)}
          </p>
          <strong>{Math.round(forecast.current?.temperature_2m ?? 0)}°</strong>
          <span>
            최고 {Math.round(forecast.daily.temperature_2m_max[0] ?? 0)}° · 최저{" "}
            {Math.round(forecast.daily.temperature_2m_min[0] ?? 0)}°
          </span>
        </div>
        <b>{weatherIcon(forecast.current?.weather_code ?? 3)}</b>
      </div>
      <div className="compact-weather-facts">
        <span>습도 {Math.round(forecast.current?.relative_humidity_2m ?? 0)}%</span>
        <span>바람 {(forecast.current?.wind_speed_10m ?? 0).toFixed(1)}m/s</span>
        {rainChance > 10 && <span>비 {rainChance}%</span>}
        {rainAmount > 1 && <span>강수 {rainAmount.toFixed(1)}mm</span>}
        {pm10 !== null && <span>미세 {pm10}</span>}
        {pm25 !== null && <span>초미세 {pm25}</span>}
      </div>
    </section>
  );
}

function VoiceCapture({
  close,
  save,
}: {
  close: () => void;
  save: (kind: VoiceKind, text: string, date: string, time: string) => void;
}) {
  const initial = analyzeVoiceText("");
  const [text, setText] = useState("");
  const [kind, setKind] = useState<VoiceKind>(initial.kind);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("마이크를 누르고 편하게 말씀하세요.");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const applyAnalysis = (value: string) => {
    const analyzed = analyzeVoiceText(value);
    setKind(analyzed.kind);
    setDate(analyzed.date);
    setTime(analyzed.time);
  };
  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const Recognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) {
      setMessage(
        "이 브라우저는 음성인식을 지원하지 않아요. 아래 칸에 직접 입력해 주세요.",
      );
      return;
    }
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => {
      setListening(true);
      setMessage("듣고 있어요… 말씀을 마치면 자동으로 글자로 바뀝니다.");
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = (event) => {
      setListening(false);
      setMessage(
        event.error === "not-allowed"
          ? "마이크 권한을 허용한 뒤 다시 눌러 주세요."
          : "잘 듣지 못했어요. 다시 말하거나 직접 입력해 주세요.",
      );
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript.trim();
      setText(transcript);
      applyAnalysis(transcript);
      setMessage("말씀하신 내용을 확인하고 저장 종류를 선택해 주세요.");
    };
    recognition.start();
  };
  return (
    <div
      className="voice-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="음성 빠른 입력"
    >
      <section className="voice-sheet">
        <header>
          <div>
            <p className="eyebrow">무료 음성 입력</p>
            <h2>말로 기록하기</h2>
          </div>
          <button onClick={close} aria-label="닫기">
            ×
          </button>
        </header>
        <button
          className={`listen-button ${listening ? "listening" : ""}`}
          onClick={toggleListening}
        >
          <span>{listening ? "■" : "●"}</span>
          {listening ? "듣기 멈추기" : "마이크로 말하기"}
        </button>
        <p className="voice-message">{message}</p>
        <label>
          인식된 내용
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="예: 내일 오후 2시 치과 예약 일정 등록해줘"
            rows={4}
          />
        </label>
        <button className="analyze-button" onClick={() => applyAnalysis(text)}>
          내용 다시 분석
        </button>
        <div className="voice-kind">
          <button
            className={kind === "memo" ? "selected" : ""}
            onClick={() => setKind("memo")}
          >
            메모
          </button>
          <button
            className={kind === "work" ? "selected" : ""}
            onClick={() => setKind("work")}
          >
            업무
          </button>
          <button
            className={kind === "calendar" ? "selected" : ""}
            onClick={() => setKind("calendar")}
          >
            일정
          </button>
        </div>
        {kind === "calendar" && (
          <div className="voice-date">
            <label>
              날짜
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            <label>
              시간
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
              />
            </label>
          </div>
        )}
        <footer>
          <button className="cancel" onClick={close}>
            취소
          </button>
          <button
            disabled={!text.trim()}
            onClick={() => save(kind, text.trim(), date, time)}
          >
            확인 후 저장
          </button>
        </footer>
      </section>
    </div>
  );
}

function HomeCalendar({
  events,
  openCalendar,
}: {
  events: CalendarEvent[];
  openCalendar: () => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = localDateKey();
  const changeMonth = (amount: number) =>
    setVisibleMonth(new Date(year, month + amount, 1));

  return (
    <section className="home-calendar" aria-label="월간 캘린더">
      <header>
        <button onClick={() => changeMonth(-1)} aria-label="이전 달">‹</button>
        <strong>{year}년 {month + 1}월</strong>
        <button onClick={() => changeMonth(1)} aria-label="다음 달">›</button>
      </header>
      <div className="home-calendar-weekdays">
        {["일", "월", "화", "수", "목", "금", "토"].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="home-calendar-days">
        {Array.from({ length: 42 }, (_, index) => {
          const day = index - firstDay + 1;
          if (day < 1 || day > daysInMonth) return <span key={index} />;
          const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasEvent = events.some(
            (event) => calendarEventIsVisible(event) && eventOccursOn(event, dateKey),
          );
          const holiday = holidayName(dateKey);
          return (
            <button
              className={`${dateKey === today ? "today" : ""} ${hasEvent ? "has-event" : ""} ${holiday || isSunday(dateKey) ? "holiday" : ""}`}
              onClick={openCalendar}
              key={dateKey}
              title={holiday || undefined}
              aria-label={`${month + 1}월 ${day}일${holiday ? `, ${holiday}` : ""}${hasEvent ? ", 일정 있음" : ""}`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <button className="home-calendar-manage" onClick={openCalendar}>＋ 일정 추가·관리</button>
    </section>
  );
}

function HomeView({
  go,
  memos,
  events,
  weatherLocation,
  openVoice,
}: {
  go: (tab: Tab) => void;
  memos: Memo[];
  events: CalendarEvent[];
  weatherLocation: WeatherLocation;
  openVoice: () => void;
}) {
  const [currentWeather, setCurrentWeather] = useState<GreetingWeather | null>(null);
  const recentMemos = memos
    .filter((memo) => !memo.deleted && !memo.completed)
    .slice(0, 2);
  const greeting = weatherGreeting(currentWeather);
  const today = localDateKey();
  const todayEvents = events
    .filter(
      (event) => calendarEventIsVisible(event) && eventOccursOn(event, today),
    )
    .sort((a, b) => Number(Boolean(a.completed)) - Number(Boolean(b.completed)) || a.time.localeCompare(b.time));
  const weekEvents = events
    .flatMap((event) => {
      if (!calendarEventIsVisible(event)) return [];
      const occurrence = nextOccurrence(event);
      if (!occurrence) return [];
      const days = daysBetween(today, occurrence);
      return days >= 1 && days <= 7 ? [{ event, occurrence }] : [];
    })
    .sort((a, b) => `${a.occurrence}${a.event.time}`.localeCompare(`${b.occurrence}${b.event.time}`))
    .slice(0, 5);
  const reminderMessages = events.flatMap((event) => {
    if (event.deleted || event.completed) return [];
    const occurrence = nextOccurrence(event);
    if (!occurrence) return [];
    const days = daysBetween(today, occurrence);
    if (
      (days === 3 && event.reminder3Days) ||
      (days === 1 && event.reminder1Day)
    )
      return [{ event, days }];
    return [];
  });
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">{todayLabel()}</p>
          <h1>{greeting.title} 👋</h1>
          <p className="greeting-detail">{greeting.detail}</p>
        </div>
        <button className="profile-button" aria-label="내 정보">
          나
        </button>
      </header>
      <button className="quick-input" onClick={openVoice}>
        <span className="mic">●</span>
        <span>메모나 일정을 말해보세요</span>
        <strong>＋</strong>
      </button>
      <HomeWeather
        location={weatherLocation}
        onCurrentWeather={setCurrentWeather}
      />
      <HomeCalendar events={events} openCalendar={() => go("calendar")} />
      {reminderMessages.length > 0 && (
        <section className="reminder-messages" aria-label="일정 알림">
          {reminderMessages.map(({ event, days }) => (
            <button onClick={() => go("calendar")} key={event.id}>
              <span>🔔</span>
              <div>
                <strong>{days}일 후 일정이 있어요</strong>
                <p>
                  {event.title} · {event.allDay ? "종일" : event.time}
                </p>
              </div>
              <b>›</b>
            </button>
          ))}
        </section>
      )}
      <section className="section-block">
        <div className="section-title">
          <h2>오늘 일정</h2>
          <button onClick={() => go("calendar")}>전체보기</button>
        </div>
        {todayEvents.length > 0 ? (
          <article className={`schedule-card ${todayEvents[0].completed ? "completed-entry" : ""}`}>
            <div className="time">
              <strong>
                {todayEvents[0].allDay ? "종일" : todayEvents[0].time}
              </strong>
              {!todayEvents[0].allDay && (
                <span>
                  {Number(todayEvents[0].time.slice(0, 2)) < 12
                    ? "오전"
                    : "오후"}
                </span>
              )}
            </div>
            <div className="divider" />
            <div>
              <strong>{todayEvents[0].title}</strong>
              <p>
                {todayEvents[0].content ||
                  (todayEvents[0].repeatYearly
                    ? "매년 반복 일정"
                    : "내용 없음")}
              </p>
            </div>
          </article>
        ) : (
          <button className="empty-schedule" onClick={() => go("calendar")}>
            오늘 예정된 일정이 없어요 · 일정 추가
          </button>
        )}
      </section>
      <section className="section-block">
        <div className="section-title">
          <h2>이번 주 일정</h2>
          <button onClick={() => go("calendar")}>전체보기</button>
        </div>
        <div className="week-schedule-list">
          {weekEvents.map(({ event, occurrence }) => (
            <button onClick={() => go("calendar")} key={`${event.id}-${occurrence}`}>
              <time>{Number(occurrence.slice(5, 7))}/{Number(occurrence.slice(8, 10))}</time>
              <div><strong>{event.title}</strong><small>{event.allDay ? "종일" : event.time}</small></div>
              <span>›</span>
            </button>
          ))}
          {weekEvents.length === 0 && <p className="empty-week">앞으로 7일간 일정이 없어요.</p>}
        </div>
      </section>
      <section className="section-block">
        <div className="section-title">
          <h2>최근 메모</h2>
          <button onClick={() => go("memo")}>전체보기</button>
        </div>
        <div className="recent-memo-list">
          {recentMemos.map((memo) => (
            <button onClick={() => go("memo")} key={memo.id}>
              <div>
                <strong>{memo.title}</strong>
                <p>{memo.content || "내용 없음"}</p>
              </div>
              <span>›</span>
            </button>
          ))}
          {recentMemos.length === 0 && (
            <button className="empty-recent" onClick={() => go("memo")}>
              아직 메모가 없어요 · 메모 작성
            </button>
          )}
        </div>
      </section>
      <section className="shortcut-grid">
        <button onClick={() => go("memo")}>
          <span>📝</span>
          <strong>빠른 메모</strong>
          <small>바로 기록하기</small>
        </button>
      </section>
    </>
  );
}

function PageHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">나의 비서</p>
        <h1>{title}</h1>
      </div>
      {action && (
        <button
          className="round-add"
          onClick={
            onAction ??
            (() =>
              document
                .querySelector<HTMLButtonElement>(".floating-button")
                ?.click())
          }
        >
          {action}
        </button>
      )}
    </header>
  );
}

function ContactActions({ title, text }: { title: string; text: string }) {
  void title;
  const [copied, setCopied] = useState("");
  const pattern =
    /(?:\+82[-.\s]?)?(?:0?10|0?11|0?16|0?17|0?18|0?19|0?2|0?3[1-3]|0?4[1-4]|0?5[1-5]|0?6[1-4]|0?70|0?80)[-.\s]?\d{3,4}[-.\s]?\d{4}/g;
  const numbers = [...new Set(text.match(pattern) ?? [])];
  if (numbers.length === 0) return null;
  return (
    <div className="contact-list">
      {numbers.map((number) => {
        const cleanNumber = number.replace(/[^+\d]/g, "");
        return (
          <div className="contact-actions" key={number}>
            <strong>☎ {number}</strong>
            <div>
              <a href={`tel:${cleanNumber}`}>전화</a>
              <a href={`sms:${cleanNumber}`}>문자</a>
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(number);
                  setCopied(number);
                }}
              >
                {copied === number ? "복사됨" : "복사"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MemoView({
  memos,
  setMemos,
}: {
  memos: Memo[];
  setMemos: React.Dispatch<React.SetStateAction<Memo[]>>;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned" | "trash">("all");
  const [editing, setEditing] = useState<Memo | null>(null);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Memo["category"]>("개인");

  const openNew = () => {
    setEditing(null);
    setTitle("");
    setContent("");
    setCategory("개인");
    setWriting(true);
  };
  const openEdit = (memo: Memo) => {
    setEditing(memo);
    setTitle(memo.title);
    setContent(memo.content);
    setCategory(memo.category);
    setWriting(true);
  };
  const saveMemo = () => {
    if (!title.trim() && !content.trim()) return;
    if (editing)
      setMemos((items) =>
        items.map((item) =>
          item.id === editing.id
            ? {
                ...item,
                title: title.trim() || "제목 없는 메모",
                content: content.trim(),
                category,
              }
            : item,
        ),
      );
    else
      setMemos((items) => [
        {
          id: Date.now(),
          title: title.trim() || "제목 없는 메모",
          content: content.trim(),
          category,
          pinned: false,
          deleted: false,
          completed: false,
          createdAt: "방금 전",
        },
        ...items,
      ]);
    setWriting(false);
  };
  const visibleMemos = memos
    .filter((memo) =>
      filter === "trash" ? memo.deleted : !memo.deleted && !memo.completed,
    )
    .filter((memo) => filter !== "pinned" || memo.pinned)
    .filter((memo) =>
      `${memo.title} ${memo.content}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return (
    <>
      <PageHeader title={filter === "trash" ? "휴지통" : "메모"} action="＋" />
      <label className="memo-search">
        ⌕
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="제목이나 내용 검색"
        />
      </label>
      <div className="filter-row">
        <button
          className={filter === "all" ? "selected" : ""}
          onClick={() => setFilter("all")}
        >
          전체
        </button>
        <button
          className={filter === "pinned" ? "selected" : ""}
          onClick={() => setFilter("pinned")}
        >
          ★ 중요
        </button>
        <button
          className={filter === "trash" ? "selected" : ""}
          onClick={() => setFilter("trash")}
        >
          휴지통
        </button>
      </div>
      {writing && (
        <section className="memo-editor">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="제목"
            autoFocus
          />
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="내용을 입력하세요"
            rows={5}
          />
          <div className="editor-actions">
            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value as Memo["category"])
              }
            >
              <option>개인</option>
              <option>아이디어</option>
              <option>생활</option>
            </select>
            <button className="cancel" onClick={() => setWriting(false)}>
              취소
            </button>
            <button onClick={saveMemo}>저장</button>
          </div>
        </section>
      )}
      <section className="card-list">
        {visibleMemos.map((memo) => (
          <article
            className={memo.completed ? "completed-entry" : ""}
            key={memo.id}
          >
            <div className="card-top">
              <span
                className={`tag ${memo.category === "아이디어" ? "idea" : "personal"}`}
              >
                {memo.category}
              </span>
              <small>
                {memo.pinned && "★ 중요 · "}
                {memo.createdAt}
              </small>
            </div>
            <h3>{memo.title}</h3>
            <p>{memo.content || "내용 없음"}</p>
            <ContactActions title={memo.title} text={memo.content} />
            <div className="memo-actions">
              {filter === "trash" ? (
                <>
                  <button
                    onClick={() =>
                      setMemos((items) =>
                        items.map((item) =>
                          item.id === memo.id
                            ? { ...item, deleted: false }
                            : item,
                        ),
                      )
                    }
                  >
                    복구
                  </button>
                  <button
                    className="danger"
                    onClick={() =>
                      setMemos((items) =>
                        items.filter((item) => item.id !== memo.id),
                      )
                    }
                  >
                    영구 삭제
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() =>
                      setMemos((items) =>
                        items.map((item) =>
                          item.id === memo.id
                            ? { ...item, pinned: !item.pinned }
                            : item,
                        ),
                      )
                    }
                  >
                    {memo.pinned ? "★ 고정 해제" : "☆ 중요"}
                  </button>
                  <button
                    className={memo.completed ? "complete-toggle active" : "complete-toggle"}
                    onClick={() =>
                      setMemos((items) =>
                        items.map((item) =>
                          item.id === memo.id
                            ? {
                                ...item,
                                completed: !item.completed,
                                completedAt: item.completed
                                  ? undefined
                                  : new Date().toISOString(),
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    {memo.completed ? "완료 해제" : "✓ 완료"}
                  </button>
                  <button onClick={() => openEdit(memo)}>수정</button>
                  <button
                    onClick={() =>
                      setMemos((items) =>
                        items.map((item) =>
                          item.id === memo.id
                            ? { ...item, deleted: true }
                            : item,
                        ),
                      )
                    }
                  >
                    삭제
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
        {visibleMemos.length === 0 && (
          <div className="empty-memos">
            <strong>표시할 메모가 없어요</strong>
            <p>
              {search
                ? "다른 검색어를 입력해 보세요."
                : "새 메모를 작성해 보세요."}
            </p>
          </div>
        )}
      </section>
      {filter !== "trash" && !writing && (
        <button className="floating-button" onClick={openNew}>
          ＋ 새 메모
        </button>
      )}
    </>
  );
}

function WorkView({
  items,
  setItems,
}: {
  items: WorkItem[];
  setItems: React.Dispatch<React.SetStateAction<WorkItem[]>>;
}) {
  const [filter, setFilter] = useState<"all" | "trash">("all");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const dragSourceId = useRef<number | null>(null);
  const dragTargetId = useRef<number | null>(null);
  const dragAfterTarget = useRef(false);
  const [title, setTitle] = useState("");
  const quickInputRef = useRef<HTMLInputElement | null>(null);
  const visibleItems = items.filter((item) =>
    filter === "trash" ? item.archived : !item.archived,
  );
  const visibleItemsRef = useRef<WorkItem[]>(visibleItems);
  useEffect(() => { visibleItemsRef.current = visibleItems; }, [visibleItems]);
  const addItem = () => {
    if (!title.trim()) return;
    setItems((current) => [
      {
        id: Date.now(),
        title: title.trim(),
        details: "",
        project: "업무",
        completed: false,
        archived: false,
        createdAt: "방금 전",
      },
      ...current,
    ]);
    setTitle("");
  };
  const openEditItem = (item: WorkItem) => {
    setEditingId(item.id);
    setTitle(item.title);
  };
  const saveEdit = () => {
    if (!title.trim() || editingId === null) return;
    setItems((current) =>
      current.map((item) =>
        item.id === editingId ? { ...item, title: title.trim() } : item,
      ),
    );
    setEditingId(null);
    setTitle("");
  };
  const moveItem = (id: number, direction: -1 | 1) => {
    setItems((current) => {
      const currentIndex = current.findIndex((item) => item.id === id);
      const visibleIndex = visibleItems.findIndex((item) => item.id === id);
      const targetId = visibleItems[visibleIndex + direction]?.id;
      const targetIndex = current.findIndex((item) => item.id === targetId);
      if (currentIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      [next[currentIndex], next[targetIndex]] = [
        next[targetIndex],
        next[currentIndex],
      ];
      return next;
    });
  };
  const trashItem = (id: number) => {
    if (
      window.confirm(
        "이 업무 메모를 휴지통으로 옮길까요? 휴지통에서 복구할 수 있어요.",
      )
    )
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, archived: true } : item,
        ),
      );
  };
  const permanentlyDelete = (id: number) => {
    if (
      window.confirm(
        "이 업무 기록을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.",
      )
    )
      setItems((current) => current.filter((item) => item.id !== id));
  };
  useEffect(() => {
    let activeRow: HTMLElement | null = null;
    let startY = 0;
    const stop = () => {
      if (activeRow) { activeRow.style.transform = ""; activeRow.style.visibility = ""; }
      activeRow = null;
      const sourceId = dragSourceId.current;
      const targetId = dragTargetId.current;
      if (sourceId !== null && targetId !== null && sourceId !== targetId) setItems((current) => {
        const from = current.findIndex((item) => item.id === sourceId);
        const to = current.findIndex((item) => item.id === targetId);
        if (from < 0 || to < 0) return current;
        const next = [...current];
        const [moved] = next.splice(from, 1);
        let insertAt = to;
        if (from < to) insertAt -= 1;
        if (dragAfterTarget.current) insertAt += 1;
        next.splice(insertAt, 0, moved);
        return next;
      });
      dragSourceId.current = null;
      dragTargetId.current = null;
      setDraggingId(null);
    };
    const move = (event: PointerEvent) => {
      if (dragSourceId.current === null) return;
      if (activeRow) activeRow.style.transform = `translateY(${event.clientY - startY}px) scale(1.035)`;
      if (activeRow) activeRow.style.visibility = "hidden";
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>(".work-line");
      if (activeRow) activeRow.style.visibility = "";
      const list = target?.parentElement;
      if (!target || !list) return;
      const targetIndex = Array.from(list.querySelectorAll(":scope > .work-line")).indexOf(target);
      if (targetIndex < 0 || !visibleItemsRef.current[targetIndex]) return;
      dragTargetId.current = visibleItemsRef.current[targetIndex].id;
      dragAfterTarget.current = event.clientY > target.getBoundingClientRect().top + target.getBoundingClientRect().height / 2;
    };
    const start = (event: PointerEvent) => {
      const handle = (event.target as HTMLElement).closest(".drag-handle");
      const row = handle?.closest<HTMLElement>(".work-line");
      const list = row?.parentElement;
      if (!row || !list || filter !== "all") return;
      const sourceIndex = Array.from(
        list.querySelectorAll(":scope > .work-line"),
      ).indexOf(row);
      if (sourceIndex >= 0) {
        activeRow = row;
        startY = event.clientY;
        row.setPointerCapture?.(event.pointerId);
        dragSourceId.current = visibleItemsRef.current[sourceIndex].id;
        dragTargetId.current = visibleItemsRef.current[sourceIndex].id;
        setDraggingId(dragSourceId.current);
        event.preventDefault();
        document.addEventListener("pointermove", move);
        document.addEventListener("pointerup", stop, { once: true });
        document.addEventListener("pointercancel", stop, { once: true });
      }
    };
    document.addEventListener("pointerdown", start, true);
    return () => {
      document.removeEventListener("pointerdown", start, true);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
      document.removeEventListener("pointercancel", stop);
    };
  }, [filter, setItems]);

  return (
    <>
      <PageHeader
        title={filter === "trash" ? "업무 메모 휴지통" : "업무 메모"}
        action={filter === "all" ? "＋" : undefined}
        onAction={() => quickInputRef.current?.focus()}
      />
      <div className="filter-row work-filters">
        <button
          className={filter === "all" ? "selected" : ""}
          onClick={() => setFilter("all")}
        >
          업무 메모
        </button>
        <button
          className={filter === "trash" ? "selected" : ""}
          onClick={() => setFilter("trash")}
        >
          휴지통
        </button>
      </div>
      {filter === "all" && (
        <section className="work-quick-entry">
          <input
            ref={quickInputRef}
            value={editingId === null ? title : ""}
            onChange={(event) => {
              setEditingId(null);
              setTitle(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") addItem();
            }}
            placeholder="업무 메모를 한 줄로 입력하세요"
          />
          <button type="button" onClick={addItem}>
            추가
          </button>
        </section>
      )}
      <section className="work-line-list">
        {visibleItems.map((item, index) =>
          editingId === item.id ? (
            <article className="work-line editing" key={item.id}>
              <span className="drag-handle">⠿</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveEdit();
                  if (event.key === "Escape") {
                    setEditingId(null);
                    setTitle("");
                  }
                }}
                autoFocus
              />
              <button onClick={saveEdit}>저장</button>
              <button
                className="cancel"
                onClick={() => {
                  setEditingId(null);
                  setTitle("");
                }}
              >
                취소
              </button>
            </article>
          ) : (
            <article
              className={`work-line ${item.completed ? "completed" : ""} ${draggingId === item.id ? "dragging" : ""}`}
              key={item.id}
            >
              <span className="drag-handle" aria-hidden="true">
                ⠿
              </span>
              <input
                aria-label={`${item.title} 완료`}
                type="checkbox"
                checked={item.completed}
                onChange={() =>
                  setItems((current) =>
                    current.map((work) =>
                      work.id === item.id
                        ? { ...work, completed: !work.completed }
                        : work,
                    ),
                  )
                }
              />
              <button
                className="work-line-title"
                onClick={() => openEditItem(item)}
              >
                {item.title}
              </button>
              {filter === "all" ? (
                <div className="line-actions">
                  <button
                    disabled={index === 0}
                    onClick={() => moveItem(item.id, -1)}
                    aria-label="위로 이동"
                  >
                    ↑
                  </button>
                  <button
                    disabled={index === visibleItems.length - 1}
                    onClick={() => moveItem(item.id, 1)}
                    aria-label="아래로 이동"
                  >
                    ↓
                  </button>
                  <button className="danger" onClick={() => trashItem(item.id)}>
                    삭제
                  </button>
                </div>
              ) : (
                <div className="line-actions">
                  <button
                    onClick={() =>
                      setItems((current) =>
                        current.map((work) =>
                          work.id === item.id
                            ? { ...work, archived: false }
                            : work,
                        ),
                      )
                    }
                  >
                    복구
                  </button>
                  <button
                    className="danger"
                    onClick={() => permanentlyDelete(item.id)}
                  >
                    영구 삭제
                  </button>
                </div>
              )}
            </article>
          ),
        )}
        {visibleItems.length === 0 && (
          <div className="empty-memos">
            <strong>
              {filter === "trash"
                ? "휴지통이 비어 있어요"
                : "업무 메모가 없어요"}
            </strong>
            <p>
              {filter === "trash"
                ? "삭제한 업무 메모가 여기 표시됩니다."
                : "위 입력칸에 한 줄씩 바로 추가해 보세요."}
            </p>
          </div>
        )}
      </section>
    </>
  );
}

function CalendarView({
  events,
  setEvents,
  openVoice,
}: {
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
  openVoice: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState(localDateKey());
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [trash, setTrash] = useState(false);
  const [writing, setWriting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState("09:00");
  const [allDay, setAllDay] = useState(false);
  const [content, setContent] = useState("");
  const [repeatYearly, setRepeatYearly] = useState(false);
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [reminder3Days, setReminder3Days] = useState(true);
  const [reminder1Day, setReminder1Day] = useState(true);
  const [googleToken, setGoogleToken] = useState("");
  const [googleStatus, setGoogleStatus] = useState("");
  const [syncingId, setSyncingId] = useState<number | null>(null);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const startDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cellCount = Math.ceil((startDay + daysInMonth) / 7) * 7;
  const selectedEvents = events
    .filter((event) =>
      trash
        ? event.deleted
        : calendarEventIsVisible(event) && eventOccursOn(event, selectedDate),
    )
    .sort(
      (a, b) =>
        Number(Boolean(a.completed)) - Number(Boolean(b.completed)) ||
        Number(Boolean(b.allDay)) - Number(Boolean(a.allDay)) ||
        a.time.localeCompare(b.time),
    );
  const monthEvents = events.filter(event => {
    if (!calendarEventIsVisible(event)) return false;
    const occurrence = event.repeatYearly ? occurrenceInYear(event, year) : event.date;
    return occurrence?.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`);
  }).sort((a, b) => (a.repeatYearly ? occurrenceInYear(a, year) ?? "" : a.date).localeCompare(b.repeatYearly ? occurrenceInYear(b, year) ?? "" : b.date) || a.time.localeCompare(b.time));
  const openNewEvent = () => {
    setEditingId(null);
    setTitle("");
    setDate(selectedDate);
    setTime("09:00");
    setAllDay(false);
    setContent("");
    setRepeatYearly(false);
    setCalendarType("solar");
    setReminder3Days(true);
    setReminder1Day(true);
    setWriting(true);
  };
  const openEditEvent = (event: CalendarEvent) => {
    setEditingId(event.id);
    setTitle(event.title);
    setDate(event.date);
    setTime(event.time);
    setAllDay(Boolean(event.allDay));
    setContent(event.content ?? "");
    setRepeatYearly(Boolean(event.repeatYearly));
    setCalendarType(event.calendarType ?? "solar");
    setReminder3Days(Boolean(event.reminder3Days));
    setReminder1Day(Boolean(event.reminder1Day));
    setWriting(true);
  };
  const setPeriod = (period: "am" | "pm") => {
    const [hour, minute] = time.split(":").map(Number);
    const nextHour = period === "am" ? hour % 12 : (hour % 12) + 12;
    setTime(
      `${String(nextHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    );
  };
  const saveEvent = () => {
    if (!title.trim()) return;
    const savedEvent = {
      title: title.trim(),
      date,
      time,
      allDay,
      content: content.trim(),
      repeatYearly,
      calendarType,
      reminder3Days,
      reminder1Day,
    };
    if (editingId)
      setEvents((current) =>
        current.map((event) =>
          event.id === editingId ? { ...event, ...savedEvent } : event,
        ),
      );
    else
      setEvents((current) => [
        ...current,
        { id: Date.now(), ...savedEvent, deleted: false, completed: false },
      ]);
    const displayDate =
      repeatYearly && calendarType === "lunar"
        ? lunarToSolar(
            year,
            Number(date.slice(5, 7)),
            Number(date.slice(8, 10)),
          )
        : date;
    if (displayDate) {
      setSelectedDate(displayDate);
      const savedDate = new Date(`${displayDate}T12:00:00`);
      setVisibleMonth(
        new Date(savedDate.getFullYear(), savedDate.getMonth(), 1),
      );
    }
    setWriting(false);
    setEditingId(null);
  };
  const connectGoogleCalendar = async () => {
    if (!googleClientId) {
      setGoogleStatus(
        "Google 연결을 사용하려면 앱 인증값 설정이 한 번 필요해요.",
      );
      return;
    }
    try {
      await loadGoogleIdentity();
      const client = window.google?.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "https://www.googleapis.com/auth/calendar.events",
        callback: (response) => {
          if (response.access_token) {
            setGoogleToken(response.access_token);
            setGoogleStatus("Google Calendar에 연결됐어요.");
          } else
            setGoogleStatus(
              response.error_description || "Google 연결을 완료하지 못했어요.",
            );
        },
      });
      client?.requestAccessToken({ prompt: "consent" });
    } catch {
      setGoogleStatus(
        "Google 연결 화면을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.",
      );
    }
  };
  const syncEventToGoogle = async (event: CalendarEvent) => {
    if (!googleToken) {
      setGoogleStatus("먼저 Google Calendar 연결을 눌러 주세요.");
      return;
    }
    setSyncingId(event.id);
    setGoogleStatus("");
    const occurrenceDate = event.repeatYearly
      ? nextOccurrence(event)
      : event.date;
    if (!occurrenceDate) {
      setGoogleStatus("지난 일정은 Google Calendar로 보낼 수 없어요.");
      setSyncingId(null);
      return;
    }
    const startDateTime = `${occurrenceDate}T${event.time}:00+09:00`;
    const end = new Date(startDateTime);
    end.setMinutes(end.getMinutes() + 30);
    const reminders = [
      { enabled: event.reminder3Days, minutes: 3 * 24 * 60 },
      { enabled: event.reminder1Day, minutes: 24 * 60 },
    ]
      .filter((item) => item.enabled)
      .map((item) => ({ method: "popup", minutes: item.minutes }));
    const resource: Record<string, unknown> = {
      summary: event.title,
      description: `${event.content || ""}\n\n나의 비서 앱에서 등록`,
      start: event.allDay
        ? { date: occurrenceDate }
        : { dateTime: startDateTime, timeZone: "Asia/Seoul" },
      end: event.allDay
        ? {
            date: localDateKey(
              new Date(
                new Date(`${occurrenceDate}T12:00:00`).getTime() + 86400000,
              ),
            ),
          }
        : { dateTime: end.toISOString(), timeZone: "Asia/Seoul" },
      reminders: { useDefault: false, overrides: reminders },
    };
    if (event.repeatYearly && event.calendarType === "solar")
      resource.recurrence = ["RRULE:FREQ=YEARLY"];
    try {
      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${googleToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(resource),
        },
      );
      if (!response.ok)
        throw new Error(response.status === 401 ? "expired" : "failed");
      const created = (await response.json()) as {
        id: string;
        htmlLink?: string;
      };
      setEvents((current) =>
        current.map((item) =>
          item.id === event.id
            ? {
                ...item,
                googleEventId: created.id,
                googleEventUrl: created.htmlLink,
              }
            : item,
        ),
      );
      setGoogleStatus(
        event.repeatYearly && event.calendarType === "lunar"
          ? "음력 반복은 올해 계산된 날짜를 Google Calendar에 추가했어요."
          : "Google Calendar에 일정을 추가했어요.",
      );
    } catch (error) {
      if (error instanceof Error && error.message === "expired") {
        setGoogleToken("");
        setGoogleStatus("Google 연결 시간이 끝났어요. 다시 연결해 주세요.");
      } else
        setGoogleStatus(
          "Google Calendar에 보내지 못했어요. 잠시 후 다시 시도해 주세요.",
        );
    } finally {
      setSyncingId(null);
    }
  };
  const moveToTrash = (id: number) => {
    if (
      window.confirm(
        "이 일정을 휴지통으로 이동할까요? 휴지통에서 복구할 수 있습니다.",
      )
    )
      setEvents((current) =>
        current.map((event) =>
          event.id === id ? { ...event, deleted: true } : event,
        ),
      );
  };
  const changeMonth = (amount: number) =>
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );

  return (
    <>
      <PageHeader
        title={trash ? "일정 휴지통" : "일정"}
        action={trash ? undefined : "＋"}
      />
      <div className="filter-row">
        <button
          className={!trash ? "selected" : ""}
          onClick={() => setTrash(false)}
        >
          일정 보기
        </button>
        <button
          className={trash ? "selected" : ""}
          onClick={() => setTrash(true)}
        >
          휴지통
        </button>
      </div>
      {!trash && (
        <section className="google-calendar-bar">
          <div>
            <span>G</span>
            <p>
              <strong>Google Calendar</strong>
              <small>
                {googleToken
                  ? "연결됨 · 일정을 선택해서 전송"
                  : "연결하면 휴대폰에서도 일정 메시지를 받을 수 있어요"}
              </small>
            </p>
          </div>
          <button
            onClick={
              googleToken
                ? () => {
                    setGoogleToken("");
                    setGoogleStatus("연결을 해제했어요.");
                  }
                : connectGoogleCalendar
            }
          >
            {googleToken ? "연결 해제" : "연결"}
          </button>
          {googleStatus && <p className="google-status">{googleStatus}</p>}
        </section>
      )}
      {!trash && (
        <section className="month-card">
          <div className="month-title">
            <button onClick={() => changeMonth(-1)}>‹</button>
            <strong>
              {year}년 {month + 1}월
            </strong>
            <button onClick={() => changeMonth(1)}>›</button>
          </div>
          <div className="weekdays">
            {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="days">
            {Array.from({ length: cellCount }, (_, index) => {
              const day = index - startDay + 1;
              if (day < 1 || day > daysInMonth) return <span key={index} />;
              const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const hasEvent = events.some(
                (event) =>
                  calendarEventIsVisible(event) && eventOccursOn(event, key),
              );
              const lunar = solarToLunar(key);
              const showLunar = day === 1 || day % 5 === 0;
              const holiday = holidayName(key);
              return (
                <button
                  className={`${key === selectedDate ? "today" : ""} ${hasEvent ? "has-event" : ""} ${holiday || isSunday(key) ? "holiday" : ""}`}
                  onClick={() => setSelectedDate(key)}
                  key={key}
                  title={holiday || undefined}
                  aria-label={`${month + 1}월 ${day}일${holiday ? `, ${holiday}` : ""}${hasEvent ? ", 일정 있음" : ""}`}
                >
                  <span>{day}</span>
                  {holiday ? (
                    <small className="holiday-name">{holiday}</small>
                  ) : showLunar && lunar && (
                    <small>
                      음 {lunar.month}.{lunar.day}
                    </small>
                  )}
                </button>
              );
            })}
          </div>
        </section>
      )}
      {writing && (
        <section className="calendar-editor">
          <strong>{editingId ? "일정 수정" : "새 일정"}</strong>
          <label>
            일정 제목
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 어머니 생신"
              autoFocus
            />
          </label>
          <div className="calendar-fields">
            <label>
              {repeatYearly && calendarType === "lunar" ? "음력 날짜" : "날짜"}
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </label>
            {!allDay && (
              <label>
                시간
                <input
                  type="time"
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                />
              </label>
            )}
          </div>
          <div className="time-mode-row">
            <button
              type="button"
              className={allDay ? "selected" : ""}
              onClick={() => setAllDay(true)}
            >
              종일
            </button>
            <button
              type="button"
              className={
                !allDay && Number(time.slice(0, 2)) < 12 ? "selected" : ""
              }
              onClick={() => {
                setAllDay(false);
                setPeriod("am");
              }}
            >
              오전
            </button>
            <button
              type="button"
              className={
                !allDay && Number(time.slice(0, 2)) >= 12 ? "selected" : ""
              }
              onClick={() => {
                setAllDay(false);
                setPeriod("pm");
              }}
            >
              오후
            </button>
          </div>
          <label>
            내용
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="주소, 준비물, 자세한 메모 등을 길게 적을 수 있어요"
              rows={4}
            />
          </label>
          <label className="check-option">
            <input
              type="checkbox"
              checked={repeatYearly}
              onChange={(event) => setRepeatYearly(event.target.checked)}
            />
            <span>
              <strong>매년 반복</strong>
              <small>생일·기념일처럼 매년 자동으로 표시</small>
            </span>
          </label>
          {repeatYearly && (
            <div className="calendar-type">
              <button
                className={calendarType === "solar" ? "selected" : ""}
                onClick={() => setCalendarType("solar")}
              >
                양력
              </button>
              <button
                className={calendarType === "lunar" ? "selected" : ""}
                onClick={() => setCalendarType("lunar")}
              >
                음력
              </button>
            </div>
          )}
          {repeatYearly && calendarType === "lunar" && (
            <p className="field-help">
              입력한 월·일을 음력으로 계산해 매년 양력 달력에 표시해요.
            </p>
          )}
          <div className="reminder-options">
            <strong>메시지 알림</strong>
            <label>
              <input
                type="checkbox"
                checked={reminder3Days}
                onChange={(event) => setReminder3Days(event.target.checked)}
              />
              3일 전 메시지
            </label>
            <label>
              <input
                type="checkbox"
                checked={reminder1Day}
                onChange={(event) => setReminder1Day(event.target.checked)}
              />
              1일 전 메시지
            </label>
            <small>소리는 나지 않고 앱 홈에 메시지 카드가 떠요.</small>
          </div>
          <footer>
            <button className="cancel" onClick={() => setWriting(false)}>
              취소
            </button>
            <button onClick={saveEvent}>
              {editingId ? "수정 저장" : "저장"}
            </button>
          </footer>
        </section>
      )}
      {!trash && <section className="section-block month-event-list"><div className="section-title"><h2>이 달의 일정</h2><span className="count">{monthEvents.length}개</span></div>{monthEvents.length ? monthEvents.map(event => { const occurrence = event.repeatYearly ? occurrenceInYear(event, year) : event.date; return <button className={event.completed ? "completed-entry" : ""} key={event.id} onClick={() => { if (occurrence) setSelectedDate(occurrence); }}><span>{occurrence?.slice(5).replace("-", ".")}</span><div><strong>{event.title}</strong><small>{event.allDay ? "종일" : event.time}{event.repeatYearly ? " · 매년" : ""}</small></div><b>›</b></button>; }) : <p>이 달에 등록된 일정이 없어요.</p>}</section>}
      <section className="section-block calendar-list">
        <div className="section-title">
          <h2>
            {trash
              ? "삭제한 일정"
              : `${Number(selectedDate.slice(5, 7))}월 ${Number(selectedDate.slice(8, 10))}일 일정`}
          </h2>
          <span className="count">{selectedEvents.length}개</span>
        </div>
        {selectedEvents.map((event) => (
          <article
            className={`schedule-card ${event.completed ? "completed-entry" : ""}`}
            key={event.id}
          >
            <div className="time">
              <strong>{event.allDay ? "종일" : event.time}</strong>
              {!event.allDay && (
                <span>
                  {Number(event.time.slice(0, 2)) < 12 ? "오전" : "오후"}
                </span>
              )}
            </div>
            <div className="divider" />
            <div className="event-info">
              <strong>{event.title}</strong>
              <p>{event.content || "내용 없음"}</p>
              <div className="event-badges">
                {event.allDay && <span>종일</span>}
                {event.repeatYearly && (
                  <span>
                    매년 · {event.calendarType === "lunar" ? "음력" : "양력"}
                  </span>
                )}
                {event.reminder3Days && <span>3일 전 메시지</span>}
                {event.reminder1Day && <span>1일 전 메시지</span>}
                {event.googleEventId && <span>Google 저장됨</span>}
              </div>
              <div>
                {trash ? (
                  <>
                    <button
                      onClick={() =>
                        setEvents((current) =>
                          current.map((item) =>
                            item.id === event.id
                              ? { ...item, deleted: false }
                              : item,
                          ),
                        )
                      }
                    >
                      복구
                    </button>
                    <button
                      className="danger"
                      onClick={() => {
                        if (window.confirm("이 일정을 영구 삭제할까요?"))
                          setEvents((current) =>
                            current.filter((item) => item.id !== event.id),
                          );
                      }}
                    >
                      영구 삭제
                    </button>
                  </>
                ) : (
                  <>
                    {googleToken && !event.googleEventId && (
                      <button
                        className="google-send"
                        disabled={syncingId === event.id}
                        onClick={() => syncEventToGoogle(event)}
                      >
                        {syncingId === event.id ? "전송 중" : "Google로 보내기"}
                      </button>
                    )}
                    {event.googleEventUrl && (
                      <a
                        className="google-open"
                        href={event.googleEventUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Google에서 보기
                      </a>
                    )}
                    <button
                      className={event.completed ? "complete-toggle active" : "complete-toggle"}
                      onClick={() =>
                        setEvents((current) =>
                          current.map((item) =>
                            item.id === event.id
                              ? {
                                  ...item,
                                  completed: !item.completed,
                                  completedAt: item.completed
                                    ? undefined
                                    : new Date().toISOString(),
                                  archivedAt: undefined,
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      {event.completed ? "완료 해제" : "✓ 완료"}
                    </button>
                    <button onClick={() => openEditEvent(event)}>수정</button>
                    <button onClick={() => moveToTrash(event.id)}>삭제</button>
                  </>
                )}
              </div>
            </div>
          </article>
        ))}
        {selectedEvents.length === 0 && (
          <div className="empty-memos">
            <strong>
              {trash ? "휴지통이 비어 있어요" : "이날은 일정이 없어요"}
            </strong>
            <p>
              {trash
                ? "삭제한 일정이 이곳에 표시됩니다."
                : "새 일정을 추가해 보세요."}
            </p>
          </div>
        )}
      </section>
      {!trash && !writing && (
        <button className="floating-button" onClick={openNewEvent}>
          ＋ 새 일정
        </button>
      )}
      <button className="voice-button" onClick={openVoice}>
        ● 음성으로 일정 말하기
      </button>
    </>
  );

  /* Previous calendar layout kept temporarily for migration reference.
  return <><PageHeader title={trash ? "일정 휴지통" : "일정"} action={trash ? undefined : "＋"}/><div className="filter-row"><button className={!trash ? "selected" : ""} onClick={() => setTrash(false)}>일정 보기</button><button className={trash ? "selected" : ""} onClick={() => setTrash(true)}>휴지통</button></div>{!trash && <section className="month-card"><div className="month-title"><button onClick={() => changeMonth(-1)}>‹</button><strong>{year}년 {month + 1}월</strong><button onClick={() => changeMonth(1)}>›</button></div><div className="weekdays">{["일","월","화","수","목","금","토"].map(day => <span key={day}>{day}</span>)}</div><div className="days">{Array.from({ length: cellCount }, (_, index) => { const day = index - startDay + 1; if (day < 1 || day > daysInMonth) return <span key={index}/>; const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`; const hasEvent = events.some(event => !event.deleted && event.date === key); return <button className={`${key === selectedDate ? "today" : ""} ${hasEvent ? "has-event" : ""}`} onClick={() => setSelectedDate(key)} key={key}>{day}</button>; })}</div></section>}{writing && <section className="calendar-editor"><strong>{editingId ? "일정 수정" : "새 일정"}</strong><input value={title} onChange={event => setTitle(event.target.value)} placeholder="일정 제목" autoFocus/><div><input type="date" value={date} onChange={event => setDate(event.target.value)}/><input type="time" value={time} onChange={event => setTime(event.target.value)}/></div><div><input value={duration} onChange={event => setDuration(event.target.value)} placeholder="소요시간"/><input value={category} onChange={event => setCategory(event.target.value)} placeholder="분류"/></div><footer><button className="cancel" onClick={() => setWriting(false)}>취소</button><button onClick={saveEvent}>{editingId ? "수정 저장" : "저장"}</button></footer></section>}<section className="section-block calendar-list"><div className="section-title"><h2>{trash ? "삭제한 일정" : `${Number(selectedDate.slice(5, 7))}월 ${Number(selectedDate.slice(8, 10))}일 일정`}</h2><span className="count">{selectedEvents.length}개</span></div>{selectedEvents.map(event => <article className="schedule-card" key={event.id}><div className="time"><strong>{event.time}</strong><span>{Number(event.time.slice(0, 2)) < 12 ? "오전" : "오후"}</span></div><div className="divider"/><div className="event-info"><strong>{event.title}</strong><p>{event.duration} · {event.category}</p><div>{trash ? <><button onClick={() => setEvents(current => current.map(item => item.id === event.id ? { ...item, deleted: false } : item))}>복구</button><button className="danger" onClick={() => { if (window.confirm("이 일정을 영구 삭제할까요?")) setEvents(current => current.filter(item => item.id !== event.id)); }}>영구 삭제</button></> : <><button onClick={() => openEditEvent(event)}>수정</button><button onClick={() => moveToTrash(event.id)}>삭제</button></>}</div></div></article>)}{selectedEvents.length === 0 && <div className="empty-memos"><strong>{trash ? "휴지통이 비어 있어요" : "이날은 일정이 없어요"}</strong><p>{trash ? "삭제한 일정이 이곳에 표시됩니다." : "새 일정을 추가해 보세요."}</p></div>}</section>{!trash && !writing && <button className="floating-button" onClick={openNewEvent}>＋ 새 일정</button>}<button className="voice-button" disabled>● 음성 일정은 다음 단계에서 연결</button></>;
  */
}

function weatherLabel(code: number) {
  if (code === 0) return "맑음";
  if (code <= 3) return "구름";
  if (code === 45 || code === 48) return "안개";
  if (code >= 51 && code <= 67) return "비";
  if (code >= 71 && code <= 77) return "눈";
  if (code >= 80 && code <= 82) return "소나기";
  if (code >= 95) return "뇌우";
  return "흐림";
}

function weatherIcon(code: number) {
  if (code === 0) return "☀";
  if (code <= 3) return "⛅";
  if (code >= 71 && code <= 77) return "❄";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "☂";
  if (code >= 95) return "⚡";
  return "☁";
}

function locationShortName(location: WeatherLocation) {
  const region = location.area.includes("부산") ? "부산" : location.area.includes("울산") ? "울산" : location.area.includes("서울") ? "서울" : location.area.includes("대구") ? "대구" : location.area.includes("인천") ? "인천" : location.area.includes("광주") ? "광주" : location.area.includes("대전") ? "대전" : location.area.includes("제주") ? "제주" : location.area.split(" ")[0];
  return `${location.name}(${region || "저장"})`;
}

function WeatherView({
  back,
  location,
  setLocation,
  savedLocations,
  setSavedLocations,
}: {
  back: () => void;
  location: WeatherLocation;
  setLocation: (location: WeatherLocation) => void;
  savedLocations: WeatherLocation[];
  setSavedLocations: React.Dispatch<React.SetStateAction<WeatherLocation[]>>;
}) {
  const [data, setData] = useState<{
    best: WeatherResponse;
    models: WeatherResponse[];
  } | null>(null);
  const [air, setAir] = useState<AirQualityResponse | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [noResults, setNoResults] = useState(false);
  const [candidate, setCandidate] = useState<WeatherLocation | null>(null);

  const searchLocation = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    setNoResults(false);
    try {
      const keyword = query.trim();
      const [weatherResponse, placeResponse] = await Promise.all([
        fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(keyword)}&count=8&language=ko&format=json`,
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/place-search?q=${encodeURIComponent(`${keyword} 대한민국`)}&limit=8`,
        ),
      ]);
      const weatherValue = weatherResponse.ok
        ? ((await weatherResponse.json()) as { results?: GeocodingResult[] })
        : { results: [] };
      const placeValue = placeResponse.ok
        ? ((await placeResponse.json()) as PlaceSearchResult[])
        : [];
      const placeResults: GeocodingResult[] = placeValue
        .map((place) => ({
          name:
            place.address?.quarter ??
            place.address?.suburb ??
            place.address?.neighbourhood ??
            place.address?.village ??
            place.address?.town ??
            place.address?.city ??
            place.display_name.split(",")[0],
          admin1: place.display_name,
          country: place.address?.country ?? "대한민국",
          latitude: Number(place.lat),
          longitude: Number(place.lon),
          timezone: "Asia/Seoul",
        }))
        .filter(
          (place) =>
            Number.isFinite(place.latitude) && Number.isFinite(place.longitude),
        );
      const koreanPlaces = placeResults.filter((place) => /대한민국|Republic of Korea|South Korea/.test(place.country ?? ""));
      const merged = [...koreanPlaces, ...(weatherValue.results ?? [])].filter(
        (place, index, all) =>
          all.findIndex(
            (other) =>
              Math.abs(other.latitude - place.latitude) < 0.005 &&
              Math.abs(other.longitude - place.longitude) < 0.005,
          ) === index,
      );
      setResults(merged.sort((a, b) => Number(!a.name.includes(keyword)) - Number(!b.name.includes(keyword))));
      setNoResults(merged.length === 0);
    } catch {
      setResults([]);
      setNoResults(true);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    const locationQuery = `latitude=${location.latitude}&longitude=${location.longitude}&timezone=${encodeURIComponent(location.timezone)}&forecast_days=16&wind_speed_unit=ms`;
    const modelLocationQuery = `latitude=${location.latitude}&longitude=${location.longitude}&timezone=${encodeURIComponent(location.timezone)}&forecast_days=5&wind_speed_unit=ms`;
    const modelDaily =
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max";
    const bestUrl = `https://api.open-meteo.com/v1/forecast?${locationQuery}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max`;
    const airUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.latitude}&longitude=${location.longitude}&timezone=${encodeURIComponent(location.timezone)}&hourly=pm10,pm2_5`;
    const modelUrls = ["ecmwf", "gfs", "jma"].map(
      (model) =>
        `https://api.open-meteo.com/v1/${model}?${modelLocationQuery}&daily=${modelDaily}`,
    );
    Promise.all([fetch(bestUrl), ...modelUrls.map((url) => fetch(url)), fetch(airUrl)])
      .then(async (responses) => {
        if (responses.some((response) => !response.ok))
          throw new Error("weather request failed");
        const forecastValues = (await Promise.all(
          responses.slice(0, 1 + modelUrls.length).map((response) => response.json()),
        )) as WeatherResponse[];
        const airValue = (await responses.at(-1)?.json()) as AirQualityResponse;
        setData({ best: forecastValues[0], models: forecastValues.slice(1) });
        setAir(airValue);
      })
      .catch(() => setError(true));
  }, [location]);

  const useGpsLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/place-search?lat=${latitude}&lon=${longitude}`);
          const place = await response.json() as PlaceSearchResult;
          const address = place.address ?? {};
          const inSeonganDong = latitude > 35.56 && latitude < 35.59 && longitude > 129.30 && longitude < 129.35;
          const name = inSeonganDong ? "성안동" : address.suburb ?? address.neighbourhood ?? address.village ?? address.town ?? address.city ?? "현재 위치";
          const area = place.display_name || "현재 위치";
          setCandidate({ name, area, latitude, longitude, timezone: "Asia/Seoul" });
        } catch {
          setCandidate({ name: "현재 위치", area: "GPS 위치", latitude, longitude, timezone: "Asia/Seoul" });
        }
      },
      () => window.alert("현재 위치를 가져오지 못했어요. 위치 권한을 허용해 주세요."),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  };
  const saveCandidate = () => {
    if (!candidate) return;
    setLocation(candidate);
    setSavedLocations((current) => [candidate, ...current.filter((item) => Math.abs(item.latitude - candidate.latitude) > 0.005 || Math.abs(item.longitude - candidate.longitude) > 0.005)].slice(0, 5));
    setCandidate(null);
    setResults([]);
  };
  const hourlyStartIndex = data?.best.hourly?.time
    ? Math.max(0, data.best.hourly.time.findIndex((time) => time >= `${localDateKey()}T${String(new Date().getHours()).padStart(2, "0")}:00`))
    : 0;
  const hourlyForecast = data?.best.hourly?.time
    .slice(hourlyStartIndex, hourlyStartIndex + 72)
    .map((time, offset) => {
      const index = hourlyStartIndex + offset;
      return (
      <article key={time}>
        <time>
          {offset === 0
            ? "지금"
            : `${new Date(time).getMonth() + 1}/${new Date(time).getDate()} ${new Date(time).getHours()}시`}
        </time>
        <b>{weatherIcon(data.best.hourly?.weather_code[index] ?? 3)}</b>
        <strong>
          {Math.round(data.best.hourly?.temperature_2m[index] ?? 0)}°
        </strong>
        {(data.best.hourly?.precipitation_probability[index] ?? 0) > 10 && <span className="hourly-rain">비 {data.best.hourly?.precipitation_probability[index] ?? 0}%</span>}
        {(data.best.hourly?.precipitation[index] ?? 0) > 1 && <span>강수 {(data.best.hourly?.precipitation[index] ?? 0).toFixed(1)}mm</span>}
        <span>
          바람 {Math.round(data.best.hourly?.wind_speed_10m[index] ?? 0)}m/s
        </span>
        <span>습도 {data.best.hourly?.relative_humidity_2m[index] ?? 0}%</span>
        {air && (() => {
          const airIndex = air.hourly.time.indexOf(time);
          return <><span>미세 {Math.round(air.hourly.pm10[airIndex] ?? 0)}</span><span>초미세 {Math.round(air.hourly.pm2_5[airIndex] ?? 0)}</span></>;
        })()}
      </article>
    );
    });

  return (
    <>
      <header className="weather-header">
        <button onClick={back}>‹</button>
        <div>
          <p className="eyebrow">무료 다중모델 예보</p>
          <h1><em className="location-name">{location.name}</em> 날씨</h1>
        </div>
        <span>{locationShortName(location)}</span>
      </header>
      <section className="location-search">
        <div>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") searchLocation();
            }}
            placeholder="동·읍·면 또는 도시 검색 (예: 성안동)"
          />
          <button onClick={searchLocation}>
            {searching ? "검색 중" : "검색"}
          </button>
        </div>
        <p className="location-hint">
          전국 동·읍·면, 시·군·구를 검색해 날씨 위치로 저장할 수 있어요.
        </p>
        <button className="gps-location-button" onClick={useGpsLocation}>⌖ 현재 위치(GPS) 찾기</button>
        {candidate && <div className="location-candidate"><strong>{locationShortName(candidate)}</strong><span>{candidate.area}</span><button onClick={saveCandidate}>이 위치 저장</button></div>}
        <p className="location-hint">저장한 위치 ({savedLocations.length}/5)</p>
        <div className="quick-locations">
          {savedLocations.map((item) => <span className="saved-location" key={`${item.latitude}-${item.longitude}`}><button className={item.name === location.name ? "selected" : ""} onClick={() => { setData(null); setError(false); setLocation(item); }}>{locationShortName(item)}</button><button className="remove-saved-location" aria-label={`${locationShortName(item)} 삭제`} onClick={() => setSavedLocations(current => current.filter(saved => saved.latitude !== item.latitude || saved.longitude !== item.longitude))}>×</button></span>)}
        </div>
        <div className="quick-locations">
          {quickWeatherLocations.map((item) => (
            <button
              className={item.name === location.name ? "selected" : ""}
              key={item.name}
              onClick={() => {
                setData(null);
                setError(false);
                setLocation(item);
              }}
            >
              {item.name}
            </button>
          ))}
        </div>
        {results.length > 0 && (
          <div className="location-results">
            {results.map((result) => (
              <button
                key={`${result.latitude}-${result.longitude}`}
                onClick={() => {
                  const searchedDong = query.trim().split(/\s+/).at(-1);
                  setCandidate({
                    name: searchedDong?.endsWith("동") ? searchedDong : result.name,
                    area: [result.admin1, result.country]
                      .filter(Boolean)
                      .join(" · "),
                    latitude: result.latitude,
                    longitude: result.longitude,
                    timezone: result.timezone,
                  });
                }}
              >
                <strong>{result.name}</strong>
                <span>
                  {[result.admin1, result.country].filter(Boolean).join(" · ")} · {result.latitude.toFixed(4)}, {result.longitude.toFixed(4)}
                </span>
              </button>
            ))}
          </div>
        )}
        {noResults && (
          <p className="location-empty">
            검색 결과가 없어요. `울산 중구 성안동`처럼 시·군·구를 함께 입력해
            보세요.
          </p>
        )}
      </section>
      {error ? (
        <div className="weather-state">
          <strong>날씨를 불러오지 못했어요</strong>
          <p>인터넷 연결을 확인하고 새로고침해 주세요.</p>
        </div>
      ) : !data ? (
        <div className="weather-state">
          <strong>최신 예보를 비교하고 있어요</strong>
          <p>ECMWF·GFS·JMA 자료를 불러오는 중입니다.</p>
        </div>
      ) : (
        <>
          <section className="weather-now">
            <div>
              <p>현재 · {weatherLabel(data.best.current?.weather_code ?? 3)}</p>
              <strong>
                {Math.round(data.best.current?.temperature_2m ?? 0)}°
              </strong>
              <span>
                체감 {Math.round(data.best.current?.apparent_temperature ?? 0)}°
                · 습도 {data.best.current?.relative_humidity_2m ?? 0}%
              </span>
            </div>
            <b>{weatherIcon(data.best.current?.weather_code ?? 3)}</b>
          </section>
          <div className="model-badge">
            3개 예보모델 비교 중 · ECMWF · GFS · JMA
          </div>
          <section className="hourly-detail">
            <div className="section-title">
              <h2>시간별 예보</h2>
              <span className="count">최대 16일</span>
            </div>
            <div className="hourly-detail-list">{hourlyForecast}</div>
          </section>
          <section className="forecast-list">
            {data.best.daily.time.map((date, index) => {
              const rainChance = data.best.daily.precipitation_probability_max?.[index] ?? 0;
              const rainAmount = data.best.daily.precipitation_sum[index] ?? 0;
              const rainVotes = data.models.filter(
                (model) => (model.daily.precipitation_sum[index] ?? 0) >= 1,
              ).length;
              const hasModelDay = data.models.some((model) => model.daily.time[index]);
              const confirmedRain = hasModelDay
                ? rainVotes === data.models.length && rainChance >= 70 && rainAmount >= 2
                : rainChance >= 70 && rainAmount >= 2;
              const dayIcon = confirmedRain
                ? weatherIcon(data.best.daily.weather_code[index])
                : weatherIcon(Math.min(data.best.daily.weather_code[index], 3));
              const agreement =
                rainVotes === 0 || rainVotes === data.models.length
                  ? "높음"
                  : "보통";
              const day = new Intl.DateTimeFormat("ko-KR", {
                weekday: "short",
              }).format(new Date(`${date}T12:00:00`));
              return (
                <article key={date}>
                  <div className="forecast-day">
                    <strong>{index === 0 ? "오늘" : day}</strong>
                    <small>{date.slice(5).replace("-", ".")}</small>
                  </div>
                  <span className="forecast-icon">
                    {dayIcon}
                  </span>
                  <div className="forecast-temp">
                    <strong>
                      {Math.round(data.best.daily.temperature_2m_max[index])}°
                    </strong>
                    <span>
                      {Math.round(data.best.daily.temperature_2m_min[index])}°
                    </span>
                  </div>
                  <div className="forecast-rain">
                    <strong>
                      {rainChance > 10 ? `비 ${rainChance}%` : "강수 가능성 낮음"}
                    </strong>
                    <small>{rainAmount > 1 ? `예상 ${rainAmount.toFixed(1)}mm · ` : ""}모델 {rainVotes}/3 · 일치도 {agreement}</small>
                  </div>
                </article>
              );
            })}
          </section>
          <div className="weather-source">
            <strong>예보를 읽는 방법</strong>
            <p>
              세 모델이 같은 방향이면 일치도 높음으로 표시합니다. 공식
              기상특보는 기상청 API 연결 후 별도로 최우선 표시합니다.
            </p>
          </div>
        </>
      )}
    </>
  );
}

function ChargerView({
  chargers,
  setChargers,
}: {
  chargers: ChargerFavorite[];
  setChargers: (chargers: ChargerFavorite[]) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<ChargerFavorite | null>(null);
  const beginEdit = (charger: ChargerFavorite) => {
    setDraft({ ...charger });
    setEditingId(charger.id);
  };
  const saveEdit = () => {
    if (!draft || !draft.name.trim()) return;
    setChargers(chargers.map((charger) => charger.id === draft.id ? draft : charger));
    setEditingId(null);
    setDraft(null);
  };
  return (
    <>
      <PageHeader title="충전" />
      <button className="charger-intro charger-nearby-button" onClick={() => openNaverMap("전기차 충전소")}>
        <div>
          <p>캐스퍼 일렉트릭</p>
          <h2>즐겨찾기 충전소</h2>
          <span>누르면 현재 위치 주변 충전소를 네이버지도에서 찾아요</span>
        </div>
        <b>⚡</b>
      </button>
      <section className="section-block charger-section">
        <div className="section-title">
          <h2>내 즐겨찾기</h2>
          <span className="count">{chargers.length}곳</span>
        </div>
        <div className="charger-list">
          {chargers.map((charger) => editingId === charger.id && draft ? (
            <article className="charger-card charger-edit" key={charger.id}>
              <label>충전소 이름<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
              <div className="charger-edit-actions"><button onClick={() => { setEditingId(null); setDraft(null); }}>취소</button><button className="save" onClick={saveEdit}>저장</button></div>
            </article>
          ) : (
            <article className="charger-card" key={charger.id}>
              <div className="charger-card-head">
                <span>⚡</span>
                <div>
                  <strong>{charger.name}</strong>
                </div>
                <button className="charger-edit-button" onClick={() => beginEdit(charger)}>수정</button>
              </div>
              <button className="charger-route" onClick={() => openNaverMap(charger.name)}>네이버지도에서 확인하기 <b>›</b></button>
            </article>
          ))}
        </div>
      </section>
      <p className="charger-note">충전 가능 여부와 최신 정보는 네이버지도에서 확인하세요. 수정한 즐겨찾기는 이 기기에 저장됩니다.</p>
    </>
  );
}

let leafletPromise: Promise<void> | null = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet="true"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.dataset.leaflet = "true";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("map load failed"));
    document.head.appendChild(script);
  });
  return leafletPromise;
}

let tesseractPromise: Promise<void> | null = null;
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  if (tesseractPromise) return tesseractPromise;
  tesseractPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("ocr load failed"));
    document.head.appendChild(script);
  });
  return tesseractPromise;
}

type RestaurantImportItem = {
  id: number;
  fileName: string;
  name: string;
  address?: string;
  status: "processing" | "ready" | "needs-review";
};

function likelyRestaurantAddress(text: string) {
  const matches = text
    .split(/\n+/)
    .flatMap((line) => {
      const cleaned = line.replace(/[^0-9가-힣·\- ]/g, " ").replace(/\s+/g, " ").trim();
      return [...cleaned.matchAll(/([가-힣0-9·]+(?:로|길)\s*\d+(?:-\d+)?)/g)].map((match) => match[1].trim());
    })
    .filter((value) => value.length >= 5);
  return [...new Set(matches)].sort((a, b) => a.length - b.length)[0] ?? "";
}

function likelyRestaurantLocationQuery(text: string) {
  return likelyRestaurantAddress(text) ||
    text.match(/[가-힣0-9·]+(?:동|읍|면|리)\s*\d+(?:-\d+)?/)?.[0]?.trim() ||
    "";
}

function parseSharedRestaurantPlace(place: SharedRestaurantPlace) {
  const combined = [place.title, place.text].filter(Boolean).join("\n");
  const url = (place.url || combined.match(/https?:\/\/\S+/)?.[0] || "").replace(/[),.]+$/, "");
  const lines = combined
    .split(/\n+/)
    .map((line) => line
      .replace(/https?:\/\/\S+/g, "")
      .replace(/^\s*(장소명|상호명|주소)\s*[:：]\s*/i, "")
      .replace(/\s*[:|\-]?\s*(네이버\s*지도|네이버맵|카카오맵|KakaoMap)\s*$/i, "")
      .replace(/\s+/g, " ")
      .trim())
    .filter(Boolean);
  const addressLine = lines.find((line) => /[가-힣0-9·]+(?:로|길)\s*\d+(?:-\d+)?/.test(line)) ?? "";
  const name = lines.find((line) =>
    line.length >= 2 &&
    line.length <= 50 &&
    !/^(\[|【)?\s*(네이버\s*지도|네이버맵|카카오맵|KakaoMap|장소 공유)\s*(\]|】)?$/i.test(line) &&
    line !== addressLine &&
    !/^(도로명|지번|주소)\s*/.test(line)
  ) ?? "";
  return { name, address: addressLine || likelyRestaurantAddress(combined), url };
}

async function resolveSharedMapPlace(url: string): Promise<ResolvedMapPlace | null> {
  if (!/^https:\/\/(naver\.me|map\.naver\.com)\//i.test(url)) return null;
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/resolve-map-share`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) return null;
    return await response.json() as ResolvedMapPlace;
  } catch {
    return null;
  }
}

function likelyRestaurantName(text: string) {
  const foodWords = /(식당|식탁|국밥|짬뽕|버거|마루|카페|커피|횟집|고기|냉면|치킨|분식|초밥|수제|한우|국수|우동|돈까스|돈가스|갈비|곱창|족발|보쌈|김밥|떡볶이|제과|베이커리)/;
  const hardIgnored = /(도로명|지번|리뷰\s*\d*|영업\s*(중|종료)?|라스트\s*오더|복사|\d+(?:\.\d+)?\s*km|지도|검색|SKT|LTE|광역시|남구|중구|진구)/i;
  const genericCategory = /^(한식|한식당|중식|중식당|일식|일식당|양식|양식당|음식점|카페|베이커리)$/;
  const mapBackground = /(대학교|대학원|과학관|공학관|교육관|문화회관|학생회관|아파트|주차장|은행|호텔|어린이집|학교|초등|중등|고등|GS25|CU|세븐일레븐)/i;
  const lines = text
    .split(/\n+/)
    .map((line) => line.replace(/[^0-9A-Za-z가-힣·&' ]/g, " ").replace(/\s+/g, " ").trim())
    .map((line) => foodWords.test(line) ? line.replace(/(\S{3,})\s+[가-힣A-Za-z]$/, "$1") : line)
    .filter((line) => line.length >= 2 && line.length <= 28 && !hardIgnored.test(line) && !genericCategory.test(line));
  const frequency = new Map<string, number>();
  lines.forEach((line) => frequency.set(line, (frequency.get(line) ?? 0) + 1));
  return lines
    .map((line, index) => {
      const hangul = (line.match(/[가-힣]/g) ?? []).length;
      const latin = (line.match(/[A-Za-z]/g) ?? []).length;
      const foodBonus = foodWords.test(line) ? 100 : 0;
      const repeatBonus = ((frequency.get(line) ?? 1) - 1) * 30;
      const titleBonus = index < 7 ? 28 : 0;
      const backgroundPenalty = mapBackground.test(line) ? 100 : 0;
      const longLinePenalty = Math.max(0, line.length - 16) * 3;
      return {
        line,
        score: Math.min(hangul, 12) * 3 - latin * 2 + foodBonus + repeatBonus + titleBonus - backgroundPenalty - longLinePenalty,
      };
    })
    .filter((item) => (item.line.match(/[가-힣]/g) ?? []).length >= 2)
    .sort((a, b) => b.score - a.score || a.line.length - b.line.length)[0]?.line ?? "";
}

function RestaurantMapView({
  restaurants,
  setRestaurants,
  sharedFiles,
  sharedPlace,
  clearSharedFiles,
  clearSharedPlace,
}: {
  restaurants: Restaurant[];
  setRestaurants: React.Dispatch<React.SetStateAction<Restaurant[]>>;
  sharedFiles: File[];
  sharedPlace: SharedRestaurantPlace | null;
  clearSharedFiles: () => void;
  clearSharedPlace: () => void;
}) {
  const mapElement = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerLayerRef = useRef<LeafletLayer | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const handledSharedFiles = useRef<File[] | null>(null);
  const mapPickHandlerRef = useRef<((event: { latlng: { lat: number; lng: number } }) => void) | null>(null);
  const [filter, setFilter] = useState<RestaurantCategory>("전체");
  const [mapReady, setMapReady] = useState(false);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [mapPicking, setMapPicking] = useState(false);
  const [mapSearchQuery, setMapSearchQuery] = useState("");
  const [mapSearchResults, setMapSearchResults] = useState<PlaceSearchResult[]>([]);
  const [mapSearching, setMapSearching] = useState(false);
  const [mapSearchMessage, setMapSearchMessage] = useState("");
  const [ocrStatus, setOcrStatus] = useState("");
  const [bulkItems, setBulkItems] = useState<RestaurantImportItem[]>([]);
  const [activeBulkId, setActiveBulkId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [category, setCategory] = useState<Exclude<RestaurantCategory, "전체">>("한식");
  const [tags, setTags] = useState("");
  const [memo, setMemo] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [visited, setVisited] = useState(false);
  const visibleRestaurants = filter === "전체"
    ? restaurants
    : restaurants.filter((restaurant) => restaurant.category === filter || restaurant.tags.includes(filter));

  useEffect(() => {
    let cancelled = false;
    loadLeaflet()
      .then(() => {
        if (cancelled || !mapElement.current || !window.L || mapRef.current) return;
        const map = window.L.map(mapElement.current, { zoomControl: true }).setView([35.576, 129.326], 13);
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);
        const layer = window.L.layerGroup().addTo(map);
        mapRef.current = map;
        markerLayerRef.current = layer;
        setMapReady(true);
        navigator.geolocation?.getCurrentPosition(
          ({ coords }) => {
            map.setView([coords.latitude, coords.longitude], 14);
            setCurrentPosition([coords.latitude, coords.longitude]);
          },
          () => undefined,
          { enableHighAccuracy: true, timeout: 8000 },
        );
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const leaflet = window.L;
    const layer = markerLayerRef.current;
    if (!leaflet || !layer) return;
    layer.clearLayers();
    if (currentPosition)
      leaflet.circleMarker(currentPosition, {
        radius: 7, color: "#ffffff", fillColor: "#237d68", fillOpacity: 1, weight: 3,
      }).addTo(layer);
    const markerRestaurants = filter === "전체"
      ? restaurants
      : restaurants.filter((restaurant) => restaurant.category === filter || restaurant.tags.includes(filter));
    markerRestaurants.forEach((restaurant) => {
      const icon = leaflet.divIcon({
        className: "restaurant-pin-wrap",
        html: `<span class="restaurant-pin">${categoryIcon(restaurant.category)}</span><b>${escapeHtml(restaurant.name)}</b>`,
        iconSize: [108, 46],
        iconAnchor: [24, 42],
      });
      leaflet.marker([restaurant.latitude, restaurant.longitude], { icon })
        .addTo(layer)
        .on("click", () => setSelected(restaurant));
    });
  }, [mapReady, restaurants, filter, currentPosition]);

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const position: [number, number] = [coords.latitude, coords.longitude];
        setCurrentPosition(position);
        mapRef.current?.setView(position, 15);
      },
      () => window.alert("위치 권한을 허용하면 현재 위치로 이동할 수 있어요."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  };
  const searchPlace = async (value = query, fallbackAddress = "") => {
    if (!value.trim()) return;
    setSearching(true);
    setSearchMessage("장소를 검색하고 있어요…");
    try {
      const requestPlaces = async (keyword: string) => {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/place-search?q=${encodeURIComponent(keyword.trim())}&limit=8`,
        );
        if (!response.ok) throw new Error("search failed");
        return (await response.json()) as PlaceSearchResult[];
      };
      const searchValues = [value, fallbackAddress]
        .flatMap((keyword) => {
          const cleaned = keyword
            .replace(/^\s*(도로명|지번|주소)\s*/i, "")
            .replace(/\s+/g, " ")
            .trim();
          const addressOnly = likelyRestaurantLocationQuery(cleaned);
          return [cleaned, addressOnly];
        })
        .filter((keyword, index, all) => keyword && all.indexOf(keyword) === index);
      let places: PlaceSearchResult[] = [];
      let matchedSearchValue = "";
      for (const searchValue of searchValues) {
        places = await requestPlaces(searchValue);
        if (places.length) {
          matchedSearchValue = searchValue;
          break;
        }
      }
      setResults(places);
      if (places.length) setSearchMessage(matchedSearchValue !== value.trim()
        ? `주소에서 상호명을 빼고 '${matchedSearchValue}'로 다시 찾아 ${places.length}개의 결과가 나왔어요.`
        : `${places.length}개의 검색 결과가 있어요. 정확한 장소를 선택하세요.`);
      else {
        setSearchMessage("검색 결과가 없어요. 주소를 입력하거나 지도에서 직접 찾아보세요.");
        setOcrStatus("검색 결과가 없어요. 상호명 뒤에 동네나 주소를 함께 적어 다시 검색해 주세요.");
      }
    } catch {
      setSearchMessage("검색 연결에 실패했어요. 잠시 후 다시 검색하거나 지도에서 직접 찾아보세요.");
    } finally {
      setSearching(false);
    }
  };
  const chooseResult = (result: PlaceSearchResult) => {
    const resultName = result.display_name.split(",")[0].trim();
    const searchedByAddress = Boolean(likelyRestaurantLocationQuery(query));
    const chosenName = name.trim() || (!searchedByAddress ? resultName || query.trim() : "");
    setName(chosenName);
    setAddress(result.display_name);
    setLatitude(Number(result.lat));
    setLongitude(Number(result.lon));
    setResults([]);
    setSearchMessage("장소를 선택했어요.");
    mapRef.current?.setView([Number(result.lat), Number(result.lon)], 16);
  };
  const detachMapPickHandler = () => {
    const map = mapRef.current;
    if (map && mapPickHandlerRef.current) map.off("click", mapPickHandlerRef.current);
    mapPickHandlerRef.current = null;
  };
  const finishMapPick = (pickedLatitude: number, pickedLongitude: number, pickedAddress = "지도에서 직접 지정한 위치") => {
    detachMapPickHandler();
    setLatitude(pickedLatitude);
    setLongitude(pickedLongitude);
    setName((current) => current.trim() || query.trim());
    setAddress(pickedAddress);
    setResults([]);
    setMapPicking(false);
    setEditorOpen(true);
    setOcrStatus("지도에서 위치를 지정했어요. 상호명과 음식 종류를 확인한 뒤 저장하세요.");
    if (pickedAddress !== "지도에서 직접 지정한 위치") return;
    void fetch(
      `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/place-search?lat=${pickedLatitude}&lon=${pickedLongitude}`,
    )
      .then((response) => response.ok ? response.json() : null)
      .then((place: { display_name?: string } | null) => {
        if (place?.display_name) setAddress(place.display_name);
      })
      .catch(() => undefined);
  };
  const pickPlaceOnMap = () => {
    const map = mapRef.current;
    if (!map) {
      window.alert("지도를 불러오는 중이에요. 잠시 후 다시 눌러 주세요.");
      return;
    }
    detachMapPickHandler();
    setMapSearchQuery(query.trim());
    setMapSearchResults([]);
    setMapSearchMessage("상호명이나 주소로 검색하거나 지도를 움직여 위치를 누르세요.");
    setEditorOpen(false);
    setMapPicking(true);
    const handler = ({ latlng }: { latlng: { lat: number; lng: number } }) => finishMapPick(latlng.lat, latlng.lng);
    mapPickHandlerRef.current = handler;
    map.on("click", handler);
    window.setTimeout(() => map.invalidateSize(), 50);
  };
  const searchInsideMap = async () => {
    const keyword = mapSearchQuery.trim();
    if (!keyword) return;
    setMapSearching(true);
    setMapSearchMessage("지도에서 검색하고 있어요…");
    try {
      const bounds = mapRef.current?.getBounds();
      const viewbox = bounds
        ? `${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()},${bounds.getSouth()}`
        : "";
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/place-search?q=${encodeURIComponent(keyword)}&limit=20&bounded=1&viewbox=${encodeURIComponent(viewbox)}`,
      );
      if (!response.ok) throw new Error("map search failed");
      const places = (await response.json()) as PlaceSearchResult[];
      setMapSearchResults(places);
      setMapSearchMessage(places.length
        ? `현재 지도 화면 안에서 ${places.length}개의 결과를 찾았어요.`
        : "현재 지도 화면 안에는 결과가 없어요. 지도를 해당 지역으로 옮긴 뒤 다시 검색하거나 도로명 주소를 입력하세요.");
      if (places[0]) mapRef.current?.setView([Number(places[0].lat), Number(places[0].lon)], 16);
    } catch {
      setMapSearchMessage("검색 연결에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setMapSearching(false);
    }
  };
  const resetFields = () => {
    setEditingId(null); setQuery(""); setResults([]); setSearchMessage(""); setName(""); setAddress("");
    setLatitude(null); setLongitude(null); setCategory("한식"); setTags(""); setMemo(""); setMapUrl(""); setVisited(false); setOcrStatus("");
  };
  const openNew = () => { resetFields(); setActiveBulkId(null); setEditorOpen(true); };
  const openEdit = (restaurant: Restaurant) => {
    const oldLinkMemo = restaurant.memo.match(/^지도 공유 링크:\s*(https:\/\/\S+)\s*$/);
    setEditingId(restaurant.id); setQuery(restaurant.name); setName(restaurant.name);
    setAddress(restaurant.address); setLatitude(restaurant.latitude); setLongitude(restaurant.longitude);
    setCategory(restaurant.category); setTags(restaurant.tags.join(", "));
    setMemo(oldLinkMemo ? "" : restaurant.memo); setMapUrl(restaurant.mapUrl || oldLinkMemo?.[1] || "");
    setVisited(restaurant.visited); setResults([]); setOcrStatus(""); setEditorOpen(true);
  };
  const saveRestaurant = () => {
    if (!name.trim() || latitude === null || longitude === null) {
      window.alert("상호명을 검색한 뒤 정확한 장소를 선택해 주세요.");
      return;
    }
    const value = {
      name: name.trim(), address, latitude, longitude, category,
      tags: tags.split(/[,#]/).map((tag) => tag.trim()).filter(Boolean),
      memo: memo.trim(), mapUrl: mapUrl || undefined, visited,
    };
    setRestaurants((current) => editingId === null
      ? [{ id: Date.now(), ...value, createdAt: new Date().toISOString() }, ...current]
      : current.map((item) => item.id === editingId ? { ...item, ...value } : item));
    if (activeBulkId !== null) {
      const remaining = bulkItems.filter((item) => item.id !== activeBulkId);
      setBulkItems(remaining);
      setActiveBulkId(null);
      if (remaining.length) {
        resetFields();
        setOcrStatus(`등록했어요. 확인할 캡처가 ${remaining.length}장 남았어요.`);
      } else setEditorOpen(false);
    } else setEditorOpen(false);
  };
  const readScreenshots = useCallback(async (files: File[]) => {
    if (!files.length) return;
    const startedAt = Date.now();
    const queued = files.map((file, index) => ({
      id: startedAt + index,
      fileName: file.name,
      name: "",
      status: "processing" as const,
    }));
    setBulkItems((current) => [...current, ...queued]);
    setOcrStatus(`${files.length}장의 상호명을 차례로 읽고 있어요. 화면을 닫지 마세요.`);
    try {
      await loadTesseract();
      let processingIndex = 0;
      const worker = window.Tesseract?.createWorker
        ? await window.Tesseract.createWorker("kor+eng", 1, {
            logger: (message) => {
              if (message.status === "recognizing text")
                setOcrStatus(`${processingIndex + 1}/${files.length}장 인식 중 · ${Math.round((message.progress ?? 0) * 100)}%`);
            },
          })
        : null;
      for (let index = 0; index < files.length; index += 1) {
        processingIndex = index;
        const file = files[index];
        const item = queued[index];
        try {
          const result = worker
            ? await worker.recognize(file)
            : await window.Tesseract?.recognize(file, "kor+eng", {
                logger: (message) => {
                  if (message.status === "recognizing text")
                    setOcrStatus(`${index + 1}/${files.length}장 인식 중 · ${Math.round((message.progress ?? 0) * 100)}%`);
                },
              });
          const recognizedText = result?.data.text ?? "";
          const candidate = likelyRestaurantName(recognizedText);
          const addressCandidate = likelyRestaurantAddress(recognizedText);
          setBulkItems((current) => current.map((entry) => entry.id === item.id
            ? { ...entry, name: candidate, address: addressCandidate, status: candidate ? "ready" : "needs-review" }
            : entry));
        } catch {
          setBulkItems((current) => current.map((entry) => entry.id === item.id
            ? { ...entry, status: "needs-review" }
            : entry));
        }
      }
      await worker?.terminate();
      setOcrStatus("인식이 끝났어요. 이름을 확인한 뒤 ‘장소 확인’을 눌러 주세요.");
    } catch {
      setBulkItems((current) => current.map((entry) => queued.some((item) => item.id === entry.id)
        ? { ...entry, status: "needs-review" }
        : entry));
      setOcrStatus("자동 인식을 불러오지 못했어요. 각 칸에 상호명을 직접 입력할 수 있어요.");
    }
  }, []);
  const checkBulkItem = (item: RestaurantImportItem) => {
    if (!item.name.trim()) return;
    resetFields();
    setActiveBulkId(item.id);
    setQuery(item.name.trim());
    setName(item.name.trim());
    setOcrStatus("검색 결과에서 정확한 장소를 선택한 뒤 저장하세요.");
    void searchPlace(item.name.trim(), item.address ?? "");
  };

  useEffect(() => {
    if (!sharedFiles.length || handledSharedFiles.current === sharedFiles) return;
    handledSharedFiles.current = sharedFiles;
    resetFields();
    setActiveBulkId(null);
    setEditorOpen(true);
    void readScreenshots(sharedFiles).finally(clearSharedFiles);
  }, [sharedFiles, clearSharedFiles, readScreenshots]);

  useEffect(() => {
    if (!sharedPlace) return;
    const parsed = parseSharedRestaurantPlace(sharedPlace);
    let cancelled = false;
    resetFields();
    setActiveBulkId(null);
    setEditorOpen(true);
    setName(parsed.name);
    setQuery(parsed.name || parsed.address);
    setAddress(parsed.address);
    setMapUrl(parsed.url);
    setOcrStatus("지도 공유 링크에서 상호명과 정확한 위치를 확인하고 있어요…");
    void resolveSharedMapPlace(parsed.url).then((resolved) => {
      if (cancelled) return;
      const resolvedName = resolved?.name || parsed.name;
      const resolvedAddress = resolved?.address || parsed.address;
      setName(resolvedName);
      setQuery(resolvedAddress || resolvedName);
      setAddress(resolvedAddress);
      if (resolved?.latitude !== null && resolved?.latitude !== undefined &&
          resolved.longitude !== null && resolved.longitude !== undefined) {
        setLatitude(resolved.latitude);
        setLongitude(resolved.longitude);
        mapRef.current?.setView([resolved.latitude, resolved.longitude], 17);
        setSearchMessage("네이버지도에서 정확한 장소를 가져왔어요.");
        setOcrStatus("상호명·주소·정확한 위치를 가져왔어요. 음식 종류를 확인하고 저장하세요.");
      } else {
        setOcrStatus(resolvedName
          ? "지도에서 공유한 장소예요. 검색 결과에서 위치를 선택해 주세요."
          : "공유된 장소 이름을 확인하고 위치를 선택해 주세요.");
        if (resolvedAddress) void searchPlace(resolvedAddress);
        else if (resolvedName) void searchPlace(resolvedName);
      }
      clearSharedPlace();
    });
    return () => { cancelled = true; };
  }, [sharedPlace, clearSharedPlace]);

  return (
    <>
      <PageHeader title="맛집 지도" action="＋" onAction={openNew} />
      <section className="restaurant-toolbar">
        <div className="restaurant-filter" aria-label="음식 종류 필터">
          {restaurantCategories.map((item) => (
            <button className={filter === item.id ? "selected" : ""} onClick={() => setFilter(item.id)} key={item.id}>
              <span>{item.icon}</span><small>{item.id}</small>
            </button>
          ))}
        </div>
      </section>
      <section className={`restaurant-map-card ${mapPicking ? "map-picking" : ""}`}>
        <div className="restaurant-map" ref={mapElement} />
        {mapPicking ? (
          <section className="map-pick-panel">
            <header><strong>가게 위치 찾기</strong><button onClick={() => { detachMapPickHandler(); setMapPicking(false); setEditorOpen(true); }}>×</button></header>
            <div className="map-pick-search"><input value={mapSearchQuery} onChange={(event) => setMapSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchInsideMap(); }} placeholder="상호명 또는 도로명 주소" autoFocus /><button onClick={() => void searchInsideMap()} disabled={mapSearching}>{mapSearching ? "검색 중" : "검색"}</button></div>
            <p>{mapSearchMessage}</p>
            {mapSearchResults.length > 0 && <div className="map-pick-results">{mapSearchResults.map((result) => <button key={`${result.lat}-${result.lon}`} onClick={() => finishMapPick(Number(result.lat), Number(result.lon), result.display_name)}><strong>{result.display_name.split(",")[0]}</strong><small>{result.display_name}</small></button>)}</div>}
          </section>
        ) : (
          <><button className="locate-me" onClick={locateMe}>◎ 내 위치</button><button className="restaurant-add-map" onClick={openNew}>＋ 맛집 등록</button></>
        )}
      </section>
      {selected && (
        <section className="restaurant-selected-card">
          <div className="restaurant-selected-icon">{categoryIcon(selected.category)}</div>
          <div><strong>{selected.name}</strong><p>{selected.category}{selected.tags.length ? ` · ${selected.tags.join(" · ")}` : ""}</p><small>{selected.address}</small></div>
          <button onClick={() => openRestaurantMap(selected)}>지도 열기</button>
          <button className="plain" onClick={() => openEdit(selected)}>수정</button>
        </section>
      )}
      <section className="restaurant-list section-block">
        <div className="section-title"><h2>{filter === "전체" ? "저장한 맛집" : `${filter} 맛집`}</h2><span className="count">{visibleRestaurants.length}곳</span></div>
        {visibleRestaurants.length ? visibleRestaurants.map((restaurant) => (
          <article key={restaurant.id}>
            <button className="restaurant-list-main" onClick={() => { setSelected(restaurant); mapRef.current?.setView([restaurant.latitude, restaurant.longitude], 16); }}>
              <span>{categoryIcon(restaurant.category)}</span>
              <div><strong>{restaurant.name}</strong><small>{restaurant.visited ? "가본 곳" : "가볼 곳"} · {restaurant.category}</small></div><b>›</b>
            </button>
            <button className="restaurant-naver" onClick={() => openRestaurantMap(restaurant)}>네이버지도</button>
          </article>
        )) : <div className="empty-memos"><strong>이 종류로 저장한 맛집이 없어요</strong><p>상호명이나 지도 캡처로 추가해 보세요.</p></div>}
      </section>
      {editorOpen && (
        <div className="restaurant-editor-overlay" role="dialog" aria-modal="true" aria-label="맛집 등록">
          <section className="restaurant-editor">
            <header><div><p className="eyebrow">내 맛집 지도</p><h2>{editingId === null ? "맛집 등록" : "맛집 수정"}</h2></div><button onClick={() => setEditorOpen(false)}>×</button></header>
            <div className="restaurant-import-actions">
              <button onClick={() => fileInput.current?.click()}>▣ 지도 캡처 여러 장 가져오기</button>
              <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length) void readScreenshots(files); event.target.value = ""; }} />
            </div>
            <p className="share-target-guide">
              네이버지도·카카오맵에서 장소를 연 뒤 <strong>공유 → 나의 비서</strong>를
              누르면 상호명·주소·링크를 가져와요. 갤러리 사진 여러 장도 같은 방법으로 가져올 수 있어요.
            </p>
            {ocrStatus && <p className="ocr-status">{ocrStatus}</p>}
            {bulkItems.length > 0 && (
              <section className="restaurant-import-queue">
                <div><strong>캡처 임시 보관함</strong><span>{bulkItems.length}장</span></div>
                {bulkItems.map((item, index) => (
                  <article className={activeBulkId === item.id ? "active" : ""} key={item.id}>
                    <span>{index + 1}</span>
                    <div>
                      <input
                        value={item.name}
                        onChange={(event) => setBulkItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, name: event.target.value, status: "ready" } : entry))}
                        placeholder={item.status === "processing" ? "상호명 인식 중…" : "상호명을 직접 입력"}
                        disabled={item.status === "processing"}
                      />
                      <small>{item.fileName}{item.address ? ` · ${item.address}` : ""}{item.status === "needs-review" ? " · 이름 확인 필요" : ""}</small>
                    </div>
                    <button onClick={() => checkBulkItem(item)} disabled={item.status === "processing" || !item.name.trim()}>장소 확인</button>
                    <button className="queue-remove" aria-label="목록에서 제거" onClick={() => setBulkItems((current) => current.filter((entry) => entry.id !== item.id))}>×</button>
                  </article>
                ))}
              </section>
            )}
            <label>저장할 상호명<input value={name} onChange={(event) => setName(event.target.value)} placeholder="예: 모도리식탁" autoFocus /></label>
            <label>주소 또는 위치 검색<div className="restaurant-search-row"><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void searchPlace(); }} placeholder="예: 옥현로46번길 9-12" /><button onClick={() => void searchPlace()} disabled={searching}>{searching ? "검색 중" : "검색"}</button></div></label>
            {searchMessage && <p className="restaurant-search-message">{searchMessage}</p>}
            {results.length > 0 && <div className="restaurant-search-results">{results.map((result) => <button onClick={() => chooseResult(result)} key={`${result.lat}-${result.lon}`}><strong>{result.display_name.split(",")[0]}</strong><small>{result.display_name}</small></button>)}</div>}
            {results.length === 0 && query.trim() && <button className="restaurant-map-pick" onClick={() => openNaverMap(query)}>네이버지도에서 이 이름 검색</button>}
            {results.length === 0 && query.trim() && <button className="restaurant-map-pick" onClick={pickPlaceOnMap}>📍 검색이 안 되면 지도에서 위치 직접 선택</button>}
            {latitude !== null && longitude !== null && <div className="chosen-place-label"><strong>선택한 위치</strong><small>{address}</small></div>}
            <label>음식 종류<select value={category} onChange={(event) => setCategory(event.target.value as Exclude<RestaurantCategory, "전체">)}>{restaurantCategories.filter((item) => item.id !== "전체").map((item) => <option key={item.id} value={item.id}>{item.icon} {item.id}</option>)}</select></label>
            <label>상세 태그<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="국밥, 짬뽕, 수제버거처럼 쉼표로 구분" /></label>
            <label>내 메모<textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={3} placeholder="먹고 싶은 메뉴, 주차 등" /></label>
            <label className="restaurant-visited"><input type="checkbox" checked={visited} onChange={(event) => setVisited(event.target.checked)} /><span>이미 가본 곳</span></label>
            <footer>
              {editingId !== null && <button className="danger" onClick={() => { if (window.confirm("이 맛집을 삭제할까요?")) { setRestaurants((current) => current.filter((item) => item.id !== editingId)); setSelected(null); setEditorOpen(false); } }}>삭제</button>}
              <button className="cancel" onClick={() => setEditorOpen(false)}>취소</button><button onClick={saveRestaurant}>저장</button>
            </footer>
          </section>
        </div>
      )}
    </>
  );
}

function MoreView({
  exportData,
  exportText,
  importData,
  memos,
  setMemos,
  events,
  setEvents,
}: {
  exportData: () => void;
  exportText: () => void;
  importData: (file: File) => void;
  memos: Memo[];
  setMemos: React.Dispatch<React.SetStateAction<Memo[]>>;
  events: CalendarEvent[];
  setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>;
}) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  const [anniversaryOpen, setAnniversaryOpen] = useState(false);
  const [completedTrashOpen, setCompletedTrashOpen] = useState(false);
  const [anniversaryEditor, setAnniversaryEditor] = useState(false);
  const [editingAnniversaryId, setEditingAnniversaryId] = useState<number | null>(null);
  const [anniversaryTitle, setAnniversaryTitle] = useState("");
  const [anniversaryDate, setAnniversaryDate] = useState(localDateKey());
  const [anniversaryType, setAnniversaryType] = useState<"solar" | "lunar">("solar");
  const [anniversaryContent, setAnniversaryContent] = useState("");
  const [completedNow] = useState(() => Date.now());
  const completedMemos = memos.filter(
    (memo) => memo.completed && !memo.deleted,
  );
  const completedEvents = events.filter(
    (event) => event.completed && !event.deleted && isPastCompletionMonth(event),
  );
  const daysRemaining = (completedAt?: string) => {
    if (!completedAt) return 30;
    return Math.max(
      0,
      Math.ceil(
        (COMPLETED_RETENTION_MS - (completedNow - Date.parse(completedAt))) /
          (24 * 60 * 60 * 1000),
      ),
    );
  };
  const anniversaries = events
    .filter(
      (event) => !event.deleted && !event.completed && event.repeatYearly,
    )
    .sort((a, b) =>
      (nextOccurrence(a) ?? "9999-12-31").localeCompare(
        nextOccurrence(b) ?? "9999-12-31",
      ),
    );
  const openNewAnniversary = () => {
    setEditingAnniversaryId(null);
    setAnniversaryTitle("");
    setAnniversaryDate(localDateKey());
    setAnniversaryType("solar");
    setAnniversaryContent("");
    setAnniversaryEditor(true);
  };
  const openEditAnniversary = (event: CalendarEvent) => {
    setEditingAnniversaryId(event.id);
    setAnniversaryTitle(event.title);
    setAnniversaryDate(event.date);
    setAnniversaryType(event.calendarType ?? "solar");
    setAnniversaryContent(event.content ?? "");
    setAnniversaryEditor(true);
  };
  const saveAnniversary = () => {
    if (!anniversaryTitle.trim()) return;
    const value = {
      title: anniversaryTitle.trim(),
      date: anniversaryDate,
      time: "00:00",
      allDay: true,
      content: anniversaryContent.trim(),
      repeatYearly: true,
      calendarType: anniversaryType,
      reminder3Days: true,
      reminder1Day: true,
    };
    if (editingAnniversaryId !== null)
      setEvents((current) =>
        current.map((event) =>
          event.id === editingAnniversaryId ? { ...event, ...value } : event,
        ),
      );
    else
      setEvents((current) => [
        ...current,
        { id: Date.now(), ...value, deleted: false },
      ]);
    setAnniversaryEditor(false);
    setEditingAnniversaryId(null);
  };
  return (
    <>
      <PageHeader title="더보기" />
      <h2 className="settings-title">데이터 관리</h2>
      <section className="feature-list compact">
        <button onClick={exportData}>
          <span>💾</span>
          <div>
            <strong>전체 데이터 백업·저장</strong>
            <small>저장 위치나 Google Drive를 직접 선택</small>
          </div>
          <b>↓</b>
        </button>
        <button onClick={exportText}>
          <span>📄</span>
          <div><strong>텍스트 파일로 내보내기</strong><small>메모·업무·일정·맛집을 읽기 쉬운 글로 저장</small></div>
          <b>↓</b>
        </button>
        <button onClick={() => fileInput.current?.click()}>
          <span>↺</span>
          <div>
            <strong>백업 파일 복원</strong>
            <small>이전에 저장한 파일에서 데이터 가져오기</small>
          </div>
          <b>›</b>
        </button>
        <input
          ref={fileInput}
          className="hidden-file"
          type="file"
          accept="application/json,.json"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) importData(file);
            event.target.value = "";
          }}
        />
      </section>
      <h2 className="settings-title">설정</h2>
      <section className="feature-list compact">
        <button onClick={() => setAnniversaryOpen((open) => !open)}>
          <span>✦</span>
          <div>
            <strong>기념일 · 생일 관리</strong>
            <small>등록 · 수정 · 삭제</small>
          </div>
          <b>›</b>
        </button>
        <button onClick={() => setCompletedTrashOpen((open) => !open)}>
          <span>✓</span>
          <div>
            <strong>완료 휴지통</strong>
            <small>메모는 바로 · 일정은 다음 달부터 30일 보관</small>
          </div>
          <b>›</b>
        </button>
      </section>
      {anniversaryOpen && (
        <section className="calendar-editor anniversary-settings">
          <div className="section-title">
            <h2>기념일 · 생일 관리</h2>
            <button className="cancel" onClick={() => setAnniversaryOpen(false)}>
              닫기
            </button>
          </div>
          {!anniversaryEditor ? (
            <>
              <button className="anniversary-add-button" onClick={openNewAnniversary}>
                ＋ 기념일 등록
              </button>
              {anniversaries.length ? (
                <div className="anniversary-cards">
                  {anniversaries.map((event) => (
                    <article className="anniversary-card" key={event.id}>
                      <button onClick={() => openEditAnniversary(event)}>
                        <span className="anniversary-icon">
                          {event.calendarType === "lunar" ? "☾" : "✦"}
                        </span>
                        <div>
                          <strong>{event.title}</strong>
                          <small>
                            {nextOccurrence(event)?.replaceAll("-", ".")} · 매년{" "}
                            {event.calendarType === "lunar" ? "음력" : "양력"}
                          </small>
                        </div>
                      </button>
                      <button
                        className="danger"
                        onClick={() => {
                          if (window.confirm("이 기념일을 삭제할까요? 휴지통에서 복구할 수 있어요."))
                            setEvents((current) =>
                              current.map((item) =>
                                item.id === event.id ? { ...item, deleted: true } : item,
                              ),
                            );
                        }}
                      >
                        삭제
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <p>등록한 기념일이나 생일이 없어요.</p>
              )}
            </>
          ) : (
            <>
              <label>
                이름
                <input
                  value={anniversaryTitle}
                  onChange={(event) => setAnniversaryTitle(event.target.value)}
                  placeholder="예: 어머니 생신"
                  autoFocus
                />
              </label>
              <label>
                {anniversaryType === "lunar" ? "음력 날짜" : "날짜"}
                <input
                  type="date"
                  value={anniversaryDate}
                  onChange={(event) => setAnniversaryDate(event.target.value)}
                />
              </label>
              <div className="calendar-type">
                <button
                  className={anniversaryType === "solar" ? "selected" : ""}
                  onClick={() => setAnniversaryType("solar")}
                >
                  양력
                </button>
                <button
                  className={anniversaryType === "lunar" ? "selected" : ""}
                  onClick={() => setAnniversaryType("lunar")}
                >
                  음력
                </button>
              </div>
              <label>
                메모
                <textarea
                  value={anniversaryContent}
                  onChange={(event) => setAnniversaryContent(event.target.value)}
                  placeholder="선물, 장소 등 메모"
                  rows={3}
                />
              </label>
              <footer>
                <button className="cancel" onClick={() => setAnniversaryEditor(false)}>
                  취소
                </button>
                <button onClick={saveAnniversary}>
                  {editingAnniversaryId === null ? "등록" : "수정 저장"}
                </button>
              </footer>
            </>
          )}
        </section>
      )}
      {completedTrashOpen && (
        <section className="section-block completed-trash">
          <div className="section-title">
            <div>
              <h2>완료 휴지통</h2>
              <small>일정은 완료한 달까지 캘린더에 남고 다음 달부터 30일 보관돼요.</small>
            </div>
            <button onClick={() => setCompletedTrashOpen(false)}>닫기</button>
          </div>
          {completedMemos.length === 0 && completedEvents.length === 0 ? (
            <div className="empty-memos">
              <strong>완료한 항목이 없어요</strong>
              <p>완료 메모와 지난달까지 완료한 일정이 이곳에 표시됩니다.</p>
            </div>
          ) : (
            <div className="completed-trash-list">
              {completedMemos.map((memo) => (
                <article key={`memo-${memo.id}`}>
                  <span>메모</span>
                  <div>
                    <strong>{memo.title}</strong>
                    <small>자동 삭제까지 {daysRemaining(memo.completedAt)}일</small>
                  </div>
                  <button
                    onClick={() =>
                      setMemos((current) =>
                        current.map((item) =>
                          item.id === memo.id
                            ? { ...item, completed: false, completedAt: undefined }
                            : item,
                        ),
                      )
                    }
                  >
                    복구
                  </button>
                </article>
              ))}
              {completedEvents.map((event) => (
                <article key={`event-${event.id}`}>
                  <span>일정</span>
                  <div>
                    <strong>{event.title}</strong>
                    <small>
                      {event.date} · 자동 삭제까지 {daysRemaining(event.archivedAt)}일
                    </small>
                  </div>
                  <button
                    onClick={() =>
                      setEvents((current) =>
                        current.map((item) =>
                          item.id === event.id
                            ? { ...item, completed: false, completedAt: undefined, archivedAt: undefined }
                            : item,
                        ),
                      )
                    }
                  >
                    복구
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      <div className="coming-note">
        <strong>데이터는 현재 이 브라우저에 저장돼요</strong>
        <p>
          브라우저 데이터를 지우거나 컴퓨터를 바꾸기 전에 전체 데이터 백업을
          받아두면 다시 복원할 수 있습니다.
        </p>
      </div>
    </>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "home";
    const saved = window.sessionStorage.getItem("my-assistant-active-tab") as Tab | null;
    return saved && validTabs.includes(saved) ? saved : "home";
  });
  const tabRef = useRef<Tab>(tab);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const voiceOpenRef = useRef(false);
  const [memos, setMemos] = useState<Memo[]>(sampleMemos);
  const [workItems, setWorkItems] = useState<WorkItem[]>(sampleWorkItems);
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);
  const [weatherLocation, setWeatherLocation] = useState<WeatherLocation>(
    defaultWeatherLocation,
  );
  const [savedWeatherLocations, setSavedWeatherLocations] = useState<
    WeatherLocation[]
  >([defaultWeatherLocation]);
  const [chargers, setChargers] = useState<ChargerFavorite[]>(defaultChargers);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [sharedRestaurantFiles, setSharedRestaurantFiles] = useState<File[]>([]);
  const [sharedRestaurantPlace, setSharedRestaurantPlace] = useState<SharedRestaurantPlace | null>(null);
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    tabRef.current = tab;
    window.sessionStorage.setItem("my-assistant-active-tab", tab);
  }, [tab]);
  useEffect(() => {
    voiceOpenRef.current = voiceOpen;
  }, [voiceOpen]);
  useEffect(() => {
    window.history.replaceState({ personalAssistantRoot: true }, "");
    if (tabRef.current !== "home")
      window.history.pushState({ personalAssistantTab: tabRef.current }, "");
    const handleBack = (event: PopStateEvent) => {
      if (voiceOpenRef.current) {
        voiceOpenRef.current = false;
        setVoiceOpen(false);
        return;
      }
      if (!event.state?.personalAssistantRoot) return;
      setVoiceOpen(false);
      setTab("home");
      tabRef.current = "home";
      window.sessionStorage.setItem("my-assistant-active-tab", "home");
    };
    window.addEventListener("popstate", handleBack);
    return () => window.removeEventListener("popstate", handleBack);
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareTarget = params.get("share-target");
    if (!shareTarget) return;
    const cleanUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({ personalAssistantRoot: true }, "", cleanUrl);
    if (shareTarget === "error") {
      window.alert("공유한 사진이나 장소 정보를 가져오지 못했어요. 다시 공유해 주세요.");
      return;
    }
    takeSharedRestaurantContent()
      .then(({ files, place }) => {
        if (!files.length && !place) {
          window.alert("공유된 내용이 없어요. 지도 앱의 장소나 갤러리 사진을 다시 공유해 주세요.");
          return;
        }
        tabRef.current = "restaurants";
        setTab("restaurants");
        if (files.length) setSharedRestaurantFiles(files);
        if (place) setSharedRestaurantPlace(place);
        window.sessionStorage.setItem("my-assistant-active-tab", "restaurants");
        window.history.pushState({ personalAssistantTab: "restaurants" }, "", cleanUrl);
        window.requestAnimationFrame(() => window.scrollTo(0, 0));
      })
      .catch(() => window.alert("공유한 사진이나 장소 정보를 읽지 못했어요. 다시 시도해 주세요."));
  }, []);
  const navigateTab = (nextTab: Tab) => {
    const currentTab = tabRef.current;
    if (nextTab === currentTab) return;
    if (nextTab === "home" && currentTab !== "home") {
      window.history.back();
      return;
    }
    if (currentTab === "home")
      window.history.pushState({ personalAssistantTab: nextTab }, "");
    else window.history.replaceState({ personalAssistantTab: nextTab }, "");
    tabRef.current = nextTab;
    setTab(nextTab);
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  };
  const openVoiceSheet = () => {
    window.history.pushState({ personalAssistantVoice: true }, "");
    voiceOpenRef.current = true;
    setVoiceOpen(true);
  };
  useEffect(() => {
    const loadSavedData = window.setTimeout(() => {
      const savedMemos = window.localStorage.getItem("my-assistant-memos");
      const savedWork = window.localStorage.getItem("my-assistant-work");
      const savedEvents = window.localStorage.getItem("my-assistant-events");
      const savedWeatherLocation = window.localStorage.getItem(
        "my-assistant-weather-location",
      );
      const savedWeatherLocationsValue = window.localStorage.getItem(
        "my-assistant-saved-weather-locations",
      );
      const savedChargers = window.localStorage.getItem("my-assistant-chargers");
      const savedRestaurants = window.localStorage.getItem("my-assistant-restaurants");
      try {
        if (savedMemos)
          setMemos(
            retainRecentCompleted(JSON.parse(savedMemos) as Memo[]),
          );
      } catch {
        /* 기본 메모 유지 */
      }
      try {
        if (savedWork) setWorkItems(JSON.parse(savedWork));
      } catch {
        /* 기본 업무 유지 */
      }
      try {
        if (savedEvents)
          setEvents(
            retainCompletedEvents(
              (
                JSON.parse(savedEvents) as Array<
                  CalendarEvent & { duration?: string; category?: string }
                >
              ).map(normalizeCalendarEvent),
            ),
          );
      } catch {
        /* 기본 일정 유지 */
      }
      try {
        if (savedWeatherLocation)
          setWeatherLocation(JSON.parse(savedWeatherLocation));
      } catch {
        /* 서울 유지 */
      }
      try {
        if (savedWeatherLocationsValue)
          setSavedWeatherLocations(JSON.parse(savedWeatherLocationsValue));
      } catch {
        /* 기본 위치 유지 */
      }
      try {
        if (savedChargers) {
          const saved = JSON.parse(savedChargers) as ChargerFavorite[];
          setChargers(defaultChargers.map((base) => ({ ...base, ...(saved.find((item) => item.id === base.id) ?? {}) })));
        }
      } catch {
        /* 기본 충전소 유지 */
      }
      try {
        if (savedRestaurants) setRestaurants(JSON.parse(savedRestaurants) as Restaurant[]);
      } catch {
        /* 빈 맛집 목록 유지 */
      }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(loadSavedData);
  }, []);
  useEffect(() => {
    if (storageReady)
      window.localStorage.setItem("my-assistant-memos", JSON.stringify(memos));
  }, [memos, storageReady]);
  useEffect(() => {
    if (storageReady)
      window.localStorage.setItem(
        "my-assistant-work",
        JSON.stringify(workItems),
      );
  }, [workItems, storageReady]);
  useEffect(() => {
    if (storageReady)
      window.localStorage.setItem(
        "my-assistant-events",
        JSON.stringify(events),
      );
  }, [events, storageReady]);
  useEffect(() => {
    if (storageReady)
      window.localStorage.setItem(
        "my-assistant-weather-location",
        JSON.stringify(weatherLocation),
      );
  }, [weatherLocation, storageReady]);
  useEffect(() => {
    if (storageReady)
      window.localStorage.setItem(
        "my-assistant-saved-weather-locations",
        JSON.stringify(savedWeatherLocations),
      );
  }, [savedWeatherLocations, storageReady]);
  useEffect(() => {
    if (storageReady)
      window.localStorage.setItem("my-assistant-chargers", JSON.stringify(chargers));
  }, [chargers, storageReady]);
  useEffect(() => {
    if (storageReady)
      window.localStorage.setItem("my-assistant-restaurants", JSON.stringify(restaurants));
  }, [restaurants, storageReady]);
  useEffect(() => {
    if (!storageReady) return;
    const purgeExpiredCompleted = () => {
      setMemos((current) => {
        const next = retainRecentCompleted(current);
        return next;
      });
      setEvents((current) => {
        const next = retainCompletedEvents(current);
        return next;
      });
    };
    const timer = window.setInterval(purgeExpiredCompleted, 60 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, [storageReady]);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker
        .register(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/sw.js`, { updateViaCache: "none" })
        .then((registration) => registration.update())
        .catch(() => undefined);
  }, []);
  const saveVoiceEntry = (
    kind: VoiceKind,
    text: string,
    date: string,
    time: string,
  ) => {
    const title = voiceTitle(text);
    if (kind === "memo") {
      setMemos((current) => [
        {
          id: Date.now(),
          title,
          content: text,
          category: "개인",
          pinned: false,
          deleted: false,
          createdAt: "방금 전",
        },
        ...current,
      ]);
      navigateTab("memo");
    }
    if (kind === "work") {
      setWorkItems((current) => [
        {
          id: Date.now(),
          title,
          details: text,
          project: "음성 입력",
          completed: false,
          createdAt: "방금 전",
        },
        ...current,
      ]);
      navigateTab("work");
    }
    if (kind === "calendar") {
      setEvents((current) => [
        ...current,
        {
          id: Date.now(),
          title,
          date,
          time,
          allDay: false,
          content: text,
          repeatYearly: false,
          calendarType: "solar",
          reminder3Days: true,
          reminder1Day: true,
          deleted: false,
        },
      ]);
      navigateTab("calendar");
    }
    voiceOpenRef.current = false;
    setVoiceOpen(false);
  };
  const exportData = async () => {
    const backup: BackupPayload = {
      app: "personal-assistant-app",
      version: 1,
      exportedAt: new Date().toISOString(),
      memos,
      workItems,
      events,
      weatherLocation,
      chargers,
      restaurants,
    };
    const fileName = `나의비서-백업-${localDateKey()}.json`;
    const file = new File(
      [JSON.stringify(backup, null, 2)],
      fileName,
      { type: "application/json" },
    );
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "나의 비서 전체 데이터 백업",
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    window.alert(`백업 파일을 휴대폰의 다운로드 폴더에 저장했어요.\n파일명: ${fileName}`);
  };
  const exportText = () => {
    const text = ["나의 비서 기록", "", "[메모]", ...memos.filter(item => !item.deleted).map(item => `- ${item.title}${item.content ? `: ${item.content}` : ""}`), "", "[업무 메모]", ...workItems.filter(item => !item.archived).map(item => `- ${item.completed ? "[완료] " : ""}${item.title}`), "", "[일정]", ...events.filter(item => !item.deleted).map(item => `- ${item.date} ${item.allDay ? "종일" : item.time} | ${item.title}${item.repeatYearly ? " (매년)" : ""}`), "", "[맛집]", ...restaurants.map(item => `- ${item.name} | ${item.category} | ${item.address}`)].join("\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `나의비서-기록-${localDateKey()}.txt`; link.click(); URL.revokeObjectURL(url);
  };
  const importData = async (file: File) => {
    try {
      const backup = JSON.parse(await file.text()) as BackupPayload;
      if (
        backup.app !== "personal-assistant-app" ||
        backup.version !== 1 ||
        !Array.isArray(backup.memos) ||
        !Array.isArray(backup.workItems) ||
        !Array.isArray(backup.events)
      )
        throw new Error("invalid backup");
      if (
        !window.confirm(
          "현재 메모·업무·일정·맛집을 백업 파일 내용으로 바꿀까요? 먼저 현재 데이터를 백업해 두는 것을 권장합니다.",
        )
      )
        return;
      setMemos(retainRecentCompleted(backup.memos));
      setWorkItems(backup.workItems);
      setEvents(retainCompletedEvents(backup.events.map(normalizeCalendarEvent)));
      if (backup.weatherLocation) setWeatherLocation(backup.weatherLocation);
      if (backup.chargers) setChargers(backup.chargers);
      if (backup.restaurants) setRestaurants(backup.restaurants);
      window.alert("백업 파일에서 데이터를 복원했습니다.");
    } catch {
      window.alert("이 앱에서 만든 올바른 백업 파일이 아닙니다.");
    }
  };
  const views = {
    home: (
      <HomeView
        go={navigateTab}
        memos={memos}
        events={events}
        weatherLocation={weatherLocation}
        openVoice={openVoiceSheet}
      />
    ),
    memo: <MemoView memos={memos} setMemos={setMemos} />,
    work: <WorkView items={workItems} setItems={setWorkItems} />,
    calendar: (
      <CalendarView
        events={events}
        setEvents={setEvents}
        openVoice={openVoiceSheet}
      />
    ),
    charge: <ChargerView chargers={chargers} setChargers={setChargers} />,
    restaurants: (
      <RestaurantMapView
        restaurants={restaurants}
        setRestaurants={setRestaurants}
        sharedFiles={sharedRestaurantFiles}
        sharedPlace={sharedRestaurantPlace}
        clearSharedFiles={() => setSharedRestaurantFiles([])}
        clearSharedPlace={() => setSharedRestaurantPlace(null)}
      />
    ),
    more: (
      <MoreView
        exportData={exportData}
        exportText={exportText}
        importData={importData}
        memos={memos}
        setMemos={setMemos}
        events={events}
        setEvents={setEvents}
      />
    ),
    weather: (
      <WeatherView
        back={() => navigateTab("more")}
        location={weatherLocation}
        setLocation={setWeatherLocation}
        savedLocations={savedWeatherLocations}
        setSavedLocations={setSavedWeatherLocations}
      />
    ),
  };
  return (
    <main className="app-shell">
      <section className="phone-screen">
        <div className="view-content" key={tab}>
          {views[tab]}
        </div>
        <nav className="bottom-nav" aria-label="주요 메뉴">
          {menuItems.map((item) => (
            <button
              className={tab === item.id ? "active" : ""}
              onClick={() => navigateTab(item.id)}
              key={item.id}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        {voiceOpen && (
          <VoiceCapture
            close={() => window.history.back()}
            save={saveVoiceEntry}
          />
        )}
      </section>
    </main>
  );
}
