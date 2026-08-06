"use client";

import { useEffect, useRef, useState } from "react";
import KoreanLunarCalendar from "korean-lunar-calendar";

type Tab = "home" | "memo" | "work" | "calendar" | "more" | "weather";
type VoiceKind = "memo" | "work" | "calendar";

type SpeechRecognitionResultEventLike = Event & { results: { 0: { 0: { transcript: string } } } };
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
type GoogleTokenResponse = { access_token?: string; error?: string; error_description?: string };
type GoogleTokenClient = { requestAccessToken: (options?: { prompt?: string }) => void };

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    google?: { accounts: { oauth2: { initTokenClient: (config: { client_id: string; scope: string; callback: (response: GoogleTokenResponse) => void }) => GoogleTokenClient } } };
  }
}

type WeatherDaily = {
  time: string[];
  weather_code: number[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
  precipitation_probability_max?: number[];
};

type WeatherResponse = {
  current?: { temperature_2m: number; apparent_temperature: number; relative_humidity_2m: number; wind_speed_10m: number; weather_code: number };
  daily: WeatherDaily;
};

type WeatherLocation = { name: string; area: string; latitude: number; longitude: number; timezone: string };
type GeocodingResult = { name: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone: string };
const defaultWeatherLocation: WeatherLocation = { name: "서울", area: "대한민국", latitude: 37.5665, longitude: 126.978, timezone: "Asia/Seoul" };
const quickWeatherLocations: WeatherLocation[] = [
  defaultWeatherLocation,
  { name: "부산", area: "대한민국", latitude: 35.1796, longitude: 129.0756, timezone: "Asia/Seoul" },
  { name: "대구", area: "대한민국", latitude: 35.8714, longitude: 128.6014, timezone: "Asia/Seoul" },
  { name: "인천", area: "대한민국", latitude: 37.4563, longitude: 126.7052, timezone: "Asia/Seoul" },
  { name: "광주", area: "대한민국", latitude: 35.1595, longitude: 126.8526, timezone: "Asia/Seoul" },
  { name: "대전", area: "대한민국", latitude: 36.3504, longitude: 127.3845, timezone: "Asia/Seoul" },
  { name: "제주", area: "대한민국", latitude: 33.4996, longitude: 126.5312, timezone: "Asia/Seoul" },
];

type Memo = {
  id: number;
  title: string;
  content: string;
  category: "개인" | "아이디어" | "생활";
  pinned: boolean;
  deleted: boolean;
  createdAt: string;
};

const sampleMemos: Memo[] = [
  { id: 1, title: "주말 장보기 목록", content: "우유, 계란, 세제, 휴지 구입하기", category: "개인", pinned: true, deleted: false, createdAt: "오늘 오전 9:20" },
  { id: 2, title: "개인비서 앱에 추가할 기능", content: "자주 사용하는 명령을 홈에 바로가기 형태로 정리하기", category: "아이디어", pinned: false, deleted: false, createdAt: "어제 오후 8:10" },
];

type WorkItem = {
  id: number;
  title: string;
  details: string;
  project: string;
  completed: boolean;
  archived?: boolean;
  createdAt: string;
};

const sampleWorkItems: WorkItem[] = [
  { id: 1, title: "견적서 내용 확인하기", details: "최종 금액과 납기 일정을 다시 확인해야 함", project: "프로젝트", completed: false, createdAt: "오늘" },
  { id: 2, title: "장보기 목록 정리하기", details: "필요한 생활용품 확인", project: "생활", completed: false, createdAt: "오늘" },
  { id: 3, title: "거래처 담당자에게 전화", details: "수정된 일정 전달 완료", project: "연락", completed: true, createdAt: "어제" },
];

type CalendarEvent = {
  id: number;
  title: string;
  date: string;
  time: string;
  content: string;
  repeatYearly: boolean;
  calendarType: "solar" | "lunar";
  reminder3Days: boolean;
  reminder1Day: boolean;
  googleEventId?: string;
  googleEventUrl?: string;
  deleted?: boolean;
};

type BackupPayload = {
  app: "personal-assistant-app";
  version: 1;
  exportedAt: string;
  memos: Memo[];
  workItems: WorkItem[];
  events: Array<CalendarEvent & { duration?: string; category?: string }>;
  weatherLocation?: WeatherLocation;
};

const sampleEvents: CalendarEvent[] = [
  { id: 1, title: "프로젝트 진행 확인", date: "2026-08-06", time: "10:30", content: "진행 상황과 다음 작업 확인", repeatYearly: false, calendarType: "solar", reminder3Days: false, reminder1Day: true, deleted: false },
];

function normalizeCalendarEvent(event: CalendarEvent & { duration?: string; category?: string }): CalendarEvent {
  return {
    id: event.id,
    title: event.title,
    date: event.date,
    time: event.time,
    content: event.content ?? [event.duration, event.category].filter(Boolean).join(" · "),
    repeatYearly: Boolean(event.repeatYearly),
    calendarType: event.calendarType ?? "solar",
    reminder3Days: Boolean(event.reminder3Days),
    reminder1Day: Boolean(event.reminder1Day),
    googleEventId: event.googleEventId,
    googleEventUrl: event.googleEventUrl,
    deleted: Boolean(event.deleted),
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

function eventOccursOn(event: CalendarEvent, solarDate: string) {
  if (!event.repeatYearly) return event.date === solarDate;
  if (event.calendarType === "lunar") {
    const lunar = solarToLunar(solarDate);
    return Boolean(lunar && `${String(lunar.month).padStart(2, "0")}-${String(lunar.day).padStart(2, "0")}` === event.date.slice(5));
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
  { icon: "□", label: "일정", id: "calendar" },
  { icon: "•••", label: "더보기", id: "more" },
];

function analyzeVoiceText(text: string) {
  const now = new Date();
  let date = localDateKey(now);
  let time = "09:00";
  let kind: VoiceKind = "memo";
  if (/(업무|할\s?일|해야\s?할|작업)/.test(text)) kind = "work";
  if (/(일정|약속|회의|예약|생일|오늘|내일|모레|\d+월\s*\d+일|\d+시)/.test(text)) kind = "calendar";

  if (text.includes("모레")) { const target = new Date(now); target.setDate(target.getDate() + 2); date = localDateKey(target); }
  else if (text.includes("내일")) { const target = new Date(now); target.setDate(target.getDate() + 1); date = localDateKey(target); }

  const dateMatch = text.match(/(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일/);
  if (dateMatch) date = `${dateMatch[1] ?? now.getFullYear()}-${String(Number(dateMatch[2])).padStart(2, "0")}-${String(Number(dateMatch[3])).padStart(2, "0")}`;
  const timeMatch = text.match(/(?:(오전|오후)\s*)?(\d{1,2})시(?:\s*(\d{1,2})분)?/);
  if (timeMatch) {
    let hour = Number(timeMatch[2]);
    if (timeMatch[1] === "오후" && hour < 12) hour += 12;
    if (timeMatch[1] === "오전" && hour === 12) hour = 0;
    time = `${String(Math.min(hour, 23)).padStart(2, "0")}:${String(Number(timeMatch[3] ?? 0)).padStart(2, "0")}`;
  }
  return { kind, date, time };
}

function voiceTitle(text: string) {
  const cleaned = text.replace(/^(메모|업무|일정)\s*(해줘|추가|등록|작성)?\s*/g, "").replace(/\s*(메모해줘|기록해줘|추가해줘|등록해줘)\s*$/g, "").trim();
  return (cleaned || text.trim()).slice(0, 42);
}

function VoiceCapture({ close, save }: { close: () => void; save: (kind: VoiceKind, text: string, date: string, time: string) => void }) {
  const initial = analyzeVoiceText("");
  const [text, setText] = useState("");
  const [kind, setKind] = useState<VoiceKind>(initial.kind);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState("마이크를 누르고 편하게 말씀하세요.");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const applyAnalysis = (value: string) => { const analyzed = analyzeVoiceText(value); setKind(analyzed.kind); setDate(analyzed.date); setTime(analyzed.time); };
  const toggleListening = () => {
    if (listening) { recognitionRef.current?.stop(); return; }
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Recognition) { setMessage("이 브라우저는 음성인식을 지원하지 않아요. 아래 칸에 직접 입력해 주세요."); return; }
    const recognition = new Recognition();
    recognitionRef.current = recognition;
    recognition.lang = "ko-KR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => { setListening(true); setMessage("듣고 있어요… 말씀을 마치면 자동으로 글자로 바뀝니다."); };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognition.onerror = event => { setListening(false); setMessage(event.error === "not-allowed" ? "마이크 권한을 허용한 뒤 다시 눌러 주세요." : "잘 듣지 못했어요. 다시 말하거나 직접 입력해 주세요."); };
    recognition.onresult = event => { const transcript = event.results[0][0].transcript.trim(); setText(transcript); applyAnalysis(transcript); setMessage("말씀하신 내용을 확인하고 저장 종류를 선택해 주세요."); };
    recognition.start();
  };
  return <div className="voice-overlay" role="dialog" aria-modal="true" aria-label="음성 빠른 입력"><section className="voice-sheet"><header><div><p className="eyebrow">무료 음성 입력</p><h2>말로 기록하기</h2></div><button onClick={close} aria-label="닫기">×</button></header><button className={`listen-button ${listening ? "listening" : ""}`} onClick={toggleListening}><span>{listening ? "■" : "●"}</span>{listening ? "듣기 멈추기" : "마이크로 말하기"}</button><p className="voice-message">{message}</p><label>인식된 내용<textarea value={text} onChange={event => setText(event.target.value)} placeholder="예: 내일 오후 2시 치과 예약 일정 등록해줘" rows={4}/></label><button className="analyze-button" onClick={() => applyAnalysis(text)}>내용 다시 분석</button><div className="voice-kind"><button className={kind === "memo" ? "selected" : ""} onClick={() => setKind("memo")}>메모</button><button className={kind === "work" ? "selected" : ""} onClick={() => setKind("work")}>업무</button><button className={kind === "calendar" ? "selected" : ""} onClick={() => setKind("calendar")}>일정</button></div>{kind === "calendar" && <div className="voice-date"><label>날짜<input type="date" value={date} onChange={event => setDate(event.target.value)}/></label><label>시간<input type="time" value={time} onChange={event => setTime(event.target.value)}/></label></div>}<footer><button className="cancel" onClick={close}>취소</button><button disabled={!text.trim()} onClick={() => save(kind, text.trim(), date, time)}>확인 후 저장</button></footer></section></div>;
}

function HomeView({ go, memos, workItems, setWorkItems, events, weatherLocation, openVoice }: { go: (tab: Tab) => void; memos: Memo[]; workItems: WorkItem[]; setWorkItems: React.Dispatch<React.SetStateAction<WorkItem[]>>; events: CalendarEvent[]; weatherLocation: WeatherLocation; openVoice: () => void }) {
  const activeItems = workItems.filter(item => !item.completed && !item.archived);
  const recentMemos = memos.filter(memo => !memo.deleted).slice(0, 2);
  const today = localDateKey();
  const todayEvents = events.filter(event => !event.deleted && eventOccursOn(event, today)).sort((a, b) => a.time.localeCompare(b.time));
  const reminderMessages = events.flatMap(event => {
    if (event.deleted) return [];
    const occurrence = nextOccurrence(event);
    if (!occurrence) return [];
    const days = daysBetween(today, occurrence);
    if ((days === 3 && event.reminder3Days) || (days === 1 && event.reminder1Day)) return [{ event, days }];
    return [];
  });
  return <>
    <header className="topbar"><div><p className="eyebrow">8월 6일 목요일</p><h1>좋은 아침이에요 👋</h1></div><button className="profile-button" aria-label="내 정보">나</button></header>
    <button className="quick-input" onClick={openVoice}><span className="mic">●</span><span>메모나 일정을 말해보세요</span><strong>＋</strong></button>
    {reminderMessages.length > 0 && <section className="reminder-messages" aria-label="일정 알림">{reminderMessages.map(({ event, days }) => <button onClick={() => go("calendar")} key={event.id}><span>🔔</span><div><strong>{days}일 후 일정이 있어요</strong><p>{event.title} · {event.time}</p></div><b>›</b></button>)}</section>}
    <button className="weather-card" onClick={() => go("weather")}><div><p>{weatherLocation.name} 날씨</p><strong>예보</strong><span>여러 예보모델 비교 결과 보기</span></div><div className="sun" aria-hidden="true">☀</div></button>
    <section className="section-block"><div className="section-title"><h2>오늘 일정</h2><button onClick={() => go("calendar")}>전체보기</button></div>{todayEvents.length > 0 ? <article className="schedule-card"><div className="time"><strong>{todayEvents[0].time}</strong><span>{Number(todayEvents[0].time.slice(0, 2)) < 12 ? "오전" : "오후"}</span></div><div className="divider"/><div><strong>{todayEvents[0].title}</strong><p>{todayEvents[0].content || (todayEvents[0].repeatYearly ? "매년 반복 일정" : "내용 없음")}</p></div></article> : <button className="empty-schedule" onClick={() => go("calendar")}>오늘 예정된 일정이 없어요 · 일정 추가</button>}</section>
    <section className="section-block"><div className="section-title"><h2>할 일</h2><span className="count">{activeItems.length}개 남음</span></div><div className="todo-list">{activeItems.slice(0, 2).map(item => <label key={item.id}><input type="checkbox" checked={item.completed} onChange={() => setWorkItems(items => items.map(current => current.id === item.id ? { ...current, completed: true } : current))}/> {item.title}</label>)}{activeItems.length === 0 && <button className="all-done" onClick={() => go("work")}>오늘 할 일을 모두 마쳤어요 ✓</button>}</div></section>
    <section className="section-block"><div className="section-title"><h2>최근 메모</h2><button onClick={() => go("memo")}>전체보기</button></div><div className="recent-memo-list">{recentMemos.map(memo => <button onClick={() => go("memo")} key={memo.id}><div><strong>{memo.title}</strong><p>{memo.content || "내용 없음"}</p></div><span>›</span></button>)}{recentMemos.length === 0 && <button className="empty-recent" onClick={() => go("memo")}>아직 메모가 없어요 · 메모 작성</button>}</div></section>
    <section className="shortcut-grid"><button onClick={() => go("memo")}><span>📝</span><strong>빠른 메모</strong><small>바로 기록하기</small></button><button onClick={() => go("work")}><span>✅</span><strong>업무 메모</strong><small>진행할 업무 보기</small></button></section>
  </>;
}

function PageHeader({ title, action }: { title: string; action?: string }) {
  return <header className="page-header"><div><p className="eyebrow">나의 비서</p><h1>{title}</h1></div>{action && <button className="round-add" onClick={() => document.querySelector<HTMLButtonElement>(".floating-button")?.click()}>{action}</button>}</header>;
}

function ContactActions({ title, text }: { title: string; text: string }) {
  void title;
  const [copied, setCopied] = useState("");
  const pattern = /(?:\+82[-.\s]?)?(?:0?10|0?11|0?16|0?17|0?18|0?19|0?2|0?3[1-3]|0?4[1-4]|0?5[1-5]|0?6[1-4]|0?70|0?80)[-.\s]?\d{3,4}[-.\s]?\d{4}/g;
  const numbers = [...new Set(text.match(pattern) ?? [])];
  if (numbers.length === 0) return null;
  return <div className="contact-list">{numbers.map(number => { const cleanNumber = number.replace(/[^+\d]/g, ""); return <div className="contact-actions" key={number}><strong>☎ {number}</strong><div><a href={`tel:${cleanNumber}`}>전화</a><a href={`sms:${cleanNumber}`}>문자</a><button onClick={async () => { await navigator.clipboard.writeText(number); setCopied(number); }}>{copied === number ? "복사됨" : "복사"}</button></div></div>})}</div>;
}

function MemoView({ memos, setMemos }: { memos: Memo[]; setMemos: React.Dispatch<React.SetStateAction<Memo[]>> }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pinned" | "trash">("all");
  const [editing, setEditing] = useState<Memo | null>(null);
  const [writing, setWriting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Memo["category"]>("개인");

  const openNew = () => { setEditing(null); setTitle(""); setContent(""); setCategory("개인"); setWriting(true); };
  const openEdit = (memo: Memo) => { setEditing(memo); setTitle(memo.title); setContent(memo.content); setCategory(memo.category); setWriting(true); };
  const saveMemo = () => {
    if (!title.trim() && !content.trim()) return;
    if (editing) setMemos(items => items.map(item => item.id === editing.id ? { ...item, title: title.trim() || "제목 없는 메모", content: content.trim(), category } : item));
    else setMemos(items => [{ id: Date.now(), title: title.trim() || "제목 없는 메모", content: content.trim(), category, pinned: false, deleted: false, createdAt: "방금 전" }, ...items]);
    setWriting(false);
  };
  const visibleMemos = memos.filter(memo => filter === "trash" ? memo.deleted : !memo.deleted).filter(memo => filter !== "pinned" || memo.pinned).filter(memo => `${memo.title} ${memo.content}`.toLowerCase().includes(search.toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned));

  return <><PageHeader title={filter === "trash" ? "휴지통" : "메모"} action="＋"/><label className="memo-search">⌕<input value={search} onChange={event => setSearch(event.target.value)} placeholder="제목이나 내용 검색"/></label><div className="filter-row"><button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>전체</button><button className={filter === "pinned" ? "selected" : ""} onClick={() => setFilter("pinned")}>★ 중요</button><button className={filter === "trash" ? "selected" : ""} onClick={() => setFilter("trash")}>휴지통</button></div>{writing && <section className="memo-editor"><input value={title} onChange={event => setTitle(event.target.value)} placeholder="제목" autoFocus/><textarea value={content} onChange={event => setContent(event.target.value)} placeholder="내용을 입력하세요" rows={5}/><div className="editor-actions"><select value={category} onChange={event => setCategory(event.target.value as Memo["category"])}><option>개인</option><option>아이디어</option><option>생활</option></select><button className="cancel" onClick={() => setWriting(false)}>취소</button><button onClick={saveMemo}>저장</button></div></section>}<section className="card-list">{visibleMemos.map(memo => <article key={memo.id}><div className="card-top"><span className={`tag ${memo.category === "아이디어" ? "idea" : "personal"}`}>{memo.category}</span><small>{memo.pinned && "★ 중요 · "}{memo.createdAt}</small></div><h3>{memo.title}</h3><p>{memo.content || "내용 없음"}</p><ContactActions title={memo.title} text={memo.content}/><div className="memo-actions">{filter === "trash" ? <><button onClick={() => setMemos(items => items.map(item => item.id === memo.id ? { ...item, deleted: false } : item))}>복구</button><button className="danger" onClick={() => setMemos(items => items.filter(item => item.id !== memo.id))}>영구 삭제</button></> : <><button onClick={() => setMemos(items => items.map(item => item.id === memo.id ? { ...item, pinned: !item.pinned } : item))}>{memo.pinned ? "★ 고정 해제" : "☆ 중요"}</button><button onClick={() => openEdit(memo)}>수정</button><button onClick={() => setMemos(items => items.map(item => item.id === memo.id ? { ...item, deleted: true } : item))}>삭제</button></>}</div></article>)}{visibleMemos.length === 0 && <div className="empty-memos"><strong>표시할 메모가 없어요</strong><p>{search ? "다른 검색어를 입력해 보세요." : "새 메모를 작성해 보세요."}</p></div>}</section>{filter !== "trash" && !writing && <button className="floating-button" onClick={openNew}>＋ 새 메모</button>}</>;
}

function WorkView({ items, setItems }: { items: WorkItem[]; setItems: React.Dispatch<React.SetStateAction<WorkItem[]>> }) {
  const [filter, setFilter] = useState<"all" | "active" | "done" | "archive">("all");
  const [writing, setWriting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [project, setProject] = useState("업무");
  const keptItems = items.filter(item => !item.archived);
  const activeCount = keptItems.filter(item => !item.completed).length;
  const doneCount = keptItems.filter(item => item.completed).length;
  const visibleItems = items.filter(item => filter === "archive" ? item.archived : !item.archived && (filter === "all" || (filter === "done" ? item.completed : !item.completed)));
  const openNewItem = () => { setEditingId(null); setTitle(""); setDetails(""); setProject("업무"); setWriting(true); };
  const openEditItem = (item: WorkItem) => { setEditingId(item.id); setTitle(item.title); setDetails(item.details); setProject(item.project); setWriting(true); setOpenMenu(null); };
  const saveItem = () => { if (!title.trim()) return; if (editingId) setItems(current => current.map(item => item.id === editingId ? { ...item, title: title.trim(), details: details.trim(), project: project.trim() || "업무" } : item)); else setItems(current => [{ id: Date.now(), title: title.trim(), details: details.trim(), project: project.trim() || "업무", completed: false, archived: false, createdAt: "방금 전" }, ...current]); setTitle(""); setDetails(""); setProject("업무"); setEditingId(null); setWriting(false); };
  const archiveItem = (id: number) => { if (window.confirm("이 업무 메모를 보관함으로 이동할까요? 기록은 삭제되지 않습니다.")) { setItems(current => current.map(item => item.id === id ? { ...item, archived: true } : item)); setOpenMenu(null); } };
  const permanentlyDelete = (id: number) => { if (window.confirm("이 업무 기록을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.")) setItems(current => current.filter(item => item.id !== id)); };

  return <><PageHeader title={filter === "archive" ? "업무 보관함" : "업무 메모"} action={filter === "archive" ? undefined : "＋"}/><div className="summary-strip"><div><strong>{activeCount}</strong><span>진행 중</span></div><div><strong>{doneCount}</strong><span>완료</span></div><div><strong>{keptItems.length}</strong><span>전체 업무</span></div></div><div className="filter-row work-filters"><button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")}>전체</button><button className={filter === "active" ? "selected" : ""} onClick={() => setFilter("active")}>진행 중</button><button className={filter === "done" ? "selected" : ""} onClick={() => setFilter("done")}>완료</button><button className={filter === "archive" ? "selected" : ""} onClick={() => setFilter("archive")}>보관함</button></div>{writing && <section className="work-editor"><strong>{editingId ? "업무 메모 수정" : "새 업무 메모"}</strong><input value={title} onChange={event => setTitle(event.target.value)} placeholder="할 일 제목" autoFocus/><textarea value={details} onChange={event => setDetails(event.target.value)} placeholder="세부 내용을 적어주세요" rows={3}/><div><input value={project} onChange={event => setProject(event.target.value)} placeholder="분류"/><button className="cancel" onClick={() => { setWriting(false); setEditingId(null); }}>취소</button><button onClick={saveItem}>{editingId ? "수정 저장" : "저장"}</button></div></section>}<section className="work-feed">{visibleItems.map(item => <article className={item.completed ? "completed" : ""} key={item.id}><div className="feed-line"><span className={`status-dot ${item.completed ? "green" : "orange"}`}/><small>{item.createdAt} · {item.project}</small>{filter !== "archive" && <button className="more-button" aria-label={`${item.title} 더보기`} onClick={() => setOpenMenu(openMenu === item.id ? null : item.id)}>•••</button>}</div>{openMenu === item.id && <div className="work-menu"><strong>기록 관리</strong><p>내용을 수정하거나 안전하게 보관함으로 옮길 수 있어요.</p><div><button onClick={() => openEditItem(item)}>내용 수정</button><button onClick={() => archiveItem(item.id)}>보관함으로 이동</button></div></div>}<h3>{item.title}</h3><p>{item.details || "세부 내용 없음"}</p><ContactActions title={item.title} text={item.details}/>{filter === "archive" ? <div className="archive-actions"><button onClick={() => setItems(current => current.map(work => work.id === item.id ? { ...work, archived: false } : work))}>복구</button><button className="danger" onClick={() => permanentlyDelete(item.id)}>영구 삭제</button></div> : <div className="work-actions"><button onClick={() => setItems(current => current.map(work => work.id === item.id ? { ...work, completed: !work.completed } : work))}>{item.completed ? "↶ 다시 진행" : "✓ 완료하기"}</button></div>}</article>)}{visibleItems.length === 0 && <div className="empty-memos"><strong>{filter === "archive" ? "보관된 업무가 없어요" : "표시할 업무가 없어요"}</strong><p>{filter === "archive" ? "오래 보관할 업무 기록이 이곳에 표시됩니다." : "새 업무를 추가해 보세요."}</p></div>}</section>{filter !== "archive" && !writing && <button className="floating-button" onClick={openNewItem}>＋ 새 업무 메모</button>}</>;
}

function CalendarView({ events, setEvents, openVoice }: { events: CalendarEvent[]; setEvents: React.Dispatch<React.SetStateAction<CalendarEvent[]>>; openVoice: () => void }) {
  const [selectedDate, setSelectedDate] = useState(localDateKey());
  const [visibleMonth, setVisibleMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [trash, setTrash] = useState(false);
  const [writing, setWriting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState("09:00");
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
  const selectedEvents = events.filter(event => trash ? event.deleted : !event.deleted && eventOccursOn(event, selectedDate)).sort((a, b) => a.time.localeCompare(b.time));
  const openNewEvent = () => { setEditingId(null); setTitle(""); setDate(selectedDate); setTime("09:00"); setContent(""); setRepeatYearly(false); setCalendarType("solar"); setReminder3Days(true); setReminder1Day(true); setWriting(true); };
  const openEditEvent = (event: CalendarEvent) => { setEditingId(event.id); setTitle(event.title); setDate(event.date); setTime(event.time); setContent(event.content ?? ""); setRepeatYearly(Boolean(event.repeatYearly)); setCalendarType(event.calendarType ?? "solar"); setReminder3Days(Boolean(event.reminder3Days)); setReminder1Day(Boolean(event.reminder1Day)); setWriting(true); };
  const saveEvent = () => {
    if (!title.trim()) return;
    const savedEvent = { title: title.trim(), date, time, content: content.trim(), repeatYearly, calendarType, reminder3Days, reminder1Day };
    if (editingId) setEvents(current => current.map(event => event.id === editingId ? { ...event, ...savedEvent } : event));
    else setEvents(current => [...current, { id: Date.now(), ...savedEvent, deleted: false }]);
    const displayDate = repeatYearly && calendarType === "lunar" ? lunarToSolar(year, Number(date.slice(5, 7)), Number(date.slice(8, 10))) : date;
    if (displayDate) {
      setSelectedDate(displayDate);
      const savedDate = new Date(`${displayDate}T12:00:00`);
      setVisibleMonth(new Date(savedDate.getFullYear(), savedDate.getMonth(), 1));
    }
    setWriting(false);
    setEditingId(null);
  };
  const connectGoogleCalendar = async () => {
    if (!googleClientId) { setGoogleStatus("Google 연결을 사용하려면 앱 인증값 설정이 한 번 필요해요."); return; }
    try {
      await loadGoogleIdentity();
      const client = window.google?.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: "https://www.googleapis.com/auth/calendar.events",
        callback: response => {
          if (response.access_token) { setGoogleToken(response.access_token); setGoogleStatus("Google Calendar에 연결됐어요."); }
          else setGoogleStatus(response.error_description || "Google 연결을 완료하지 못했어요.");
        },
      });
      client?.requestAccessToken({ prompt: "consent" });
    } catch { setGoogleStatus("Google 연결 화면을 불러오지 못했어요. 인터넷 연결을 확인해 주세요."); }
  };
  const syncEventToGoogle = async (event: CalendarEvent) => {
    if (!googleToken) { setGoogleStatus("먼저 Google Calendar 연결을 눌러 주세요."); return; }
    setSyncingId(event.id);
    setGoogleStatus("");
    const occurrenceDate = event.repeatYearly ? nextOccurrence(event) : event.date;
    if (!occurrenceDate) { setGoogleStatus("지난 일정은 Google Calendar로 보낼 수 없어요."); setSyncingId(null); return; }
    const startDateTime = `${occurrenceDate}T${event.time}:00+09:00`;
    const end = new Date(startDateTime);
    end.setMinutes(end.getMinutes() + 30);
    const reminders = [{ enabled: event.reminder3Days, minutes: 3 * 24 * 60 }, { enabled: event.reminder1Day, minutes: 24 * 60 }].filter(item => item.enabled).map(item => ({ method: "popup", minutes: item.minutes }));
    const resource: Record<string, unknown> = {
      summary: event.title,
      description: `${event.content || ""}\n\n나의 비서 앱에서 등록`,
      start: { dateTime: startDateTime, timeZone: "Asia/Seoul" },
      end: { dateTime: end.toISOString(), timeZone: "Asia/Seoul" },
      reminders: { useDefault: false, overrides: reminders },
    };
    if (event.repeatYearly && event.calendarType === "solar") resource.recurrence = ["RRULE:FREQ=YEARLY"];
    try {
      const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", { method: "POST", headers: { Authorization: `Bearer ${googleToken}`, "Content-Type": "application/json" }, body: JSON.stringify(resource) });
      if (!response.ok) throw new Error(response.status === 401 ? "expired" : "failed");
      const created = await response.json() as { id: string; htmlLink?: string };
      setEvents(current => current.map(item => item.id === event.id ? { ...item, googleEventId: created.id, googleEventUrl: created.htmlLink } : item));
      setGoogleStatus(event.repeatYearly && event.calendarType === "lunar" ? "음력 반복은 올해 계산된 날짜를 Google Calendar에 추가했어요." : "Google Calendar에 일정을 추가했어요.");
    } catch (error) {
      if (error instanceof Error && error.message === "expired") { setGoogleToken(""); setGoogleStatus("Google 연결 시간이 끝났어요. 다시 연결해 주세요."); }
      else setGoogleStatus("Google Calendar에 보내지 못했어요. 잠시 후 다시 시도해 주세요.");
    } finally { setSyncingId(null); }
  };
  const moveToTrash = (id: number) => { if (window.confirm("이 일정을 휴지통으로 이동할까요? 휴지통에서 복구할 수 있습니다.")) setEvents(current => current.map(event => event.id === id ? { ...event, deleted: true } : event)); };
  const changeMonth = (amount: number) => setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + amount, 1));

  return <>
    <PageHeader title={trash ? "일정 휴지통" : "일정"} action={trash ? undefined : "＋"}/>
    <div className="filter-row"><button className={!trash ? "selected" : ""} onClick={() => setTrash(false)}>일정 보기</button><button className={trash ? "selected" : ""} onClick={() => setTrash(true)}>휴지통</button></div>
    {!trash && <section className="google-calendar-bar"><div><span>G</span><p><strong>Google Calendar</strong><small>{googleToken ? "연결됨 · 일정을 선택해서 전송" : "연결하면 휴대폰에서도 일정 메시지를 받을 수 있어요"}</small></p></div><button onClick={googleToken ? () => { setGoogleToken(""); setGoogleStatus("연결을 해제했어요."); } : connectGoogleCalendar}>{googleToken ? "연결 해제" : "연결"}</button>{googleStatus && <p className="google-status">{googleStatus}</p>}</section>}
    {!trash && <section className="month-card">
      <div className="month-title"><button onClick={() => changeMonth(-1)}>‹</button><strong>{year}년 {month + 1}월</strong><button onClick={() => changeMonth(1)}>›</button></div>
      <div className="weekdays">{["일","월","화","수","목","금","토"].map(day => <span key={day}>{day}</span>)}</div>
      <div className="days">{Array.from({ length: cellCount }, (_, index) => {
        const day = index - startDay + 1;
        if (day < 1 || day > daysInMonth) return <span key={index}/>;
        const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const hasEvent = events.some(event => !event.deleted && eventOccursOn(event, key));
        const lunar = solarToLunar(key);
        const showLunar = day === 1 || day % 5 === 0;
        return <button className={`${key === selectedDate ? "today" : ""} ${hasEvent ? "has-event" : ""}`} onClick={() => setSelectedDate(key)} key={key}><span>{day}</span>{showLunar && lunar && <small>음 {lunar.month}.{lunar.day}</small>}</button>;
      })}</div>
    </section>}
    {writing && <section className="calendar-editor">
      <strong>{editingId ? "일정 수정" : "새 일정"}</strong>
      <label>일정 제목<input value={title} onChange={event => setTitle(event.target.value)} placeholder="예: 어머니 생신" autoFocus/></label>
      <div className="calendar-fields"><label>{repeatYearly && calendarType === "lunar" ? "음력 날짜" : "날짜"}<input type="date" value={date} onChange={event => setDate(event.target.value)}/></label><label>시간<input type="time" value={time} onChange={event => setTime(event.target.value)}/></label></div>
      <label>내용<textarea value={content} onChange={event => setContent(event.target.value)} placeholder="주소, 준비물, 자세한 메모 등을 길게 적을 수 있어요" rows={4}/></label>
      <label className="check-option"><input type="checkbox" checked={repeatYearly} onChange={event => setRepeatYearly(event.target.checked)}/><span><strong>매년 반복</strong><small>생일·기념일처럼 매년 자동으로 표시</small></span></label>
      {repeatYearly && <div className="calendar-type"><button className={calendarType === "solar" ? "selected" : ""} onClick={() => setCalendarType("solar")}>양력</button><button className={calendarType === "lunar" ? "selected" : ""} onClick={() => setCalendarType("lunar")}>음력</button></div>}
      {repeatYearly && calendarType === "lunar" && <p className="field-help">입력한 월·일을 음력으로 계산해 매년 양력 달력에 표시해요.</p>}
      <div className="reminder-options"><strong>메시지 알림</strong><label><input type="checkbox" checked={reminder3Days} onChange={event => setReminder3Days(event.target.checked)}/>3일 전 메시지</label><label><input type="checkbox" checked={reminder1Day} onChange={event => setReminder1Day(event.target.checked)}/>1일 전 메시지</label><small>소리는 나지 않고 앱 홈에 메시지 카드가 떠요.</small></div>
      <footer><button className="cancel" onClick={() => setWriting(false)}>취소</button><button onClick={saveEvent}>{editingId ? "수정 저장" : "저장"}</button></footer>
    </section>}
    <section className="section-block calendar-list">
      <div className="section-title"><h2>{trash ? "삭제한 일정" : `${Number(selectedDate.slice(5, 7))}월 ${Number(selectedDate.slice(8, 10))}일 일정`}</h2><span className="count">{selectedEvents.length}개</span></div>
      {selectedEvents.map(event => <article className="schedule-card" key={event.id}><div className="time"><strong>{event.time}</strong><span>{Number(event.time.slice(0, 2)) < 12 ? "오전" : "오후"}</span></div><div className="divider"/><div className="event-info"><strong>{event.title}</strong><p>{event.content || "내용 없음"}</p><div className="event-badges">{event.repeatYearly && <span>매년 · {event.calendarType === "lunar" ? "음력" : "양력"}</span>}{event.reminder3Days && <span>3일 전 메시지</span>}{event.reminder1Day && <span>1일 전 메시지</span>}{event.googleEventId && <span>Google 저장됨</span>}</div><div>{trash ? <><button onClick={() => setEvents(current => current.map(item => item.id === event.id ? { ...item, deleted: false } : item))}>복구</button><button className="danger" onClick={() => { if (window.confirm("이 일정을 영구 삭제할까요?")) setEvents(current => current.filter(item => item.id !== event.id)); }}>영구 삭제</button></> : <>{googleToken && !event.googleEventId && <button className="google-send" disabled={syncingId === event.id} onClick={() => syncEventToGoogle(event)}>{syncingId === event.id ? "전송 중" : "Google로 보내기"}</button>}{event.googleEventUrl && <a className="google-open" href={event.googleEventUrl} target="_blank" rel="noreferrer">Google에서 보기</a>}<button onClick={() => openEditEvent(event)}>수정</button><button onClick={() => moveToTrash(event.id)}>삭제</button></>}</div></div></article>)}
      {selectedEvents.length === 0 && <div className="empty-memos"><strong>{trash ? "휴지통이 비어 있어요" : "이날은 일정이 없어요"}</strong><p>{trash ? "삭제한 일정이 이곳에 표시됩니다." : "새 일정을 추가해 보세요."}</p></div>}
    </section>
    {!trash && !writing && <button className="floating-button" onClick={openNewEvent}>＋ 새 일정</button>}
    <button className="voice-button" onClick={openVoice}>● 음성으로 일정 말하기</button>
  </>;

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

function WeatherView({ back, location, setLocation }: { back: () => void; location: WeatherLocation; setLocation: (location: WeatherLocation) => void }) {
  const [data, setData] = useState<{ best: WeatherResponse; models: WeatherResponse[] } | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<GeocodingResult[]>([]);

  const searchLocation = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    try {
      const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query.trim())}&count=5&language=ko&format=json`);
      if (!response.ok) throw new Error("location search failed");
      const value = await response.json() as { results?: GeocodingResult[] };
      setResults(value.results ?? []);
    } catch { setResults([]); }
    finally { setSearching(false); }
  };

  useEffect(() => {
    const locationQuery = `latitude=${location.latitude}&longitude=${location.longitude}&timezone=${encodeURIComponent(location.timezone)}&forecast_days=5`;
    const modelDaily = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max";
    const bestUrl = `https://api.open-meteo.com/v1/forecast?${locationQuery}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max`;
    const modelUrls = ["ecmwf", "gfs", "jma"].map(model => `https://api.open-meteo.com/v1/${model}?${locationQuery}&daily=${modelDaily}`);
    Promise.all([fetch(bestUrl), ...modelUrls.map(url => fetch(url))])
      .then(async responses => {
        if (responses.some(response => !response.ok)) throw new Error("weather request failed");
        const values = await Promise.all(responses.map(response => response.json())) as WeatherResponse[];
        setData({ best: values[0], models: values.slice(1) });
      })
      .catch(() => setError(true));
  }, [location]);

  return <><header className="weather-header"><button onClick={back}>‹</button><div><p className="eyebrow">무료 다중모델 예보</p><h1>{location.name} 날씨</h1></div><span>{location.area}</span></header><section className="location-search"><div><input value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter") searchLocation(); }} placeholder="동네나 도시 검색"/><button onClick={searchLocation}>{searching ? "검색 중" : "검색"}</button></div><div className="quick-locations">{quickWeatherLocations.map(item => <button className={item.name === location.name ? "selected" : ""} key={item.name} onClick={() => { setData(null); setError(false); setLocation(item); }}>{item.name}</button>)}</div>{results.length > 0 && <div className="location-results">{results.map(result => <button key={`${result.latitude}-${result.longitude}`} onClick={() => { setData(null); setError(false); setLocation({ name: result.name, area: [result.admin1, result.country].filter(Boolean).join(" · "), latitude: result.latitude, longitude: result.longitude, timezone: result.timezone }); setResults([]); setQuery(""); }}><strong>{result.name}</strong><span>{[result.admin1, result.country].filter(Boolean).join(" · ")}</span></button>)}</div>}</section>{error ? <div className="weather-state"><strong>날씨를 불러오지 못했어요</strong><p>인터넷 연결을 확인하고 새로고침해 주세요.</p></div> : !data ? <div className="weather-state"><strong>최신 예보를 비교하고 있어요</strong><p>ECMWF·GFS·JMA 자료를 불러오는 중입니다.</p></div> : <><section className="weather-now"><div><p>현재 · {weatherLabel(data.best.current?.weather_code ?? 3)}</p><strong>{Math.round(data.best.current?.temperature_2m ?? 0)}°</strong><span>체감 {Math.round(data.best.current?.apparent_temperature ?? 0)}° · 습도 {data.best.current?.relative_humidity_2m ?? 0}%</span></div><b>{weatherIcon(data.best.current?.weather_code ?? 3)}</b></section><div className="model-badge">3개 예보모델 비교 중 · ECMWF · GFS · JMA</div><section className="forecast-list">{data.best.daily.time.map((date, index) => { const rainVotes = data.models.filter(model => (model.daily.precipitation_sum[index] ?? 0) >= 0.2).length; const agreement = rainVotes === 0 || rainVotes === data.models.length ? "높음" : "보통"; const day = new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(new Date(`${date}T12:00:00`)); return <article key={date}><div className="forecast-day"><strong>{index === 0 ? "오늘" : day}</strong><small>{date.slice(5).replace("-", ".")}</small></div><span className="forecast-icon">{weatherIcon(data.best.daily.weather_code[index])}</span><div className="forecast-temp"><strong>{Math.round(data.best.daily.temperature_2m_max[index])}°</strong><span>{Math.round(data.best.daily.temperature_2m_min[index])}°</span></div><div className="forecast-rain"><strong>비 {data.best.daily.precipitation_probability_max?.[index] ?? 0}%</strong><small>모델 {rainVotes}/3 · 일치도 {agreement}</small></div></article>})}</section><div className="weather-source"><strong>예보를 읽는 방법</strong><p>세 모델이 같은 방향이면 일치도 높음으로 표시합니다. 공식 기상특보는 기상청 API 연결 후 별도로 최우선 표시합니다.</p></div></> }</>;
}

function MoreView({ go, exportData, importData }: { go: (tab: Tab) => void; exportData: () => void; importData: (file: File) => void }) {
  const fileInput = useRef<HTMLInputElement | null>(null);
  return <><PageHeader title="더보기"/><section className="feature-list"><button onClick={() => go("weather")}><span className="feature-icon weather">☀</span><div><strong>날씨</strong><small>여러 예보모델을 비교한 5일 날씨</small></div><b>›</b></button></section><h2 className="settings-title">데이터 관리</h2><section className="feature-list compact"><button onClick={exportData}><span>💾</span><div><strong>전체 데이터 백업</strong><small>메모·업무·일정을 파일로 안전하게 저장</small></div><b>↓</b></button><button onClick={() => fileInput.current?.click()}><span>↺</span><div><strong>백업 파일 복원</strong><small>이전에 저장한 파일에서 데이터 가져오기</small></div><b>›</b></button><input ref={fileInput} className="hidden-file" type="file" accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; if (file) importData(file); event.target.value = ""; }}/></section><h2 className="settings-title">설정</h2><section className="feature-list compact"><button><span>🔔</span><div><strong>알림 설정</strong><small>일정마다 3일 전·1일 전 메시지 선택</small></div><b>›</b></button><button><span>🎙</span><div><strong>음성 명령 안내</strong><small>홈과 일정 화면에서 말로 입력</small></div><b>›</b></button></section><div className="coming-note"><strong>데이터는 현재 이 브라우저에 저장돼요</strong><p>브라우저 데이터를 지우거나 컴퓨터를 바꾸기 전에 전체 데이터 백업을 받아두면 다시 복원할 수 있습니다.</p></div></>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [memos, setMemos] = useState<Memo[]>(sampleMemos);
  const [workItems, setWorkItems] = useState<WorkItem[]>(sampleWorkItems);
  const [events, setEvents] = useState<CalendarEvent[]>(sampleEvents);
  const [weatherLocation, setWeatherLocation] = useState<WeatherLocation>(defaultWeatherLocation);
  const [storageReady, setStorageReady] = useState(false);
  useEffect(() => {
    const loadSavedData = window.setTimeout(() => {
      const savedMemos = window.localStorage.getItem("my-assistant-memos");
      const savedWork = window.localStorage.getItem("my-assistant-work");
      const savedEvents = window.localStorage.getItem("my-assistant-events");
      const savedWeatherLocation = window.localStorage.getItem("my-assistant-weather-location");
      try { if (savedMemos) setMemos(JSON.parse(savedMemos)); } catch { /* 기본 메모 유지 */ }
      try { if (savedWork) setWorkItems(JSON.parse(savedWork)); } catch { /* 기본 업무 유지 */ }
      try { if (savedEvents) setEvents((JSON.parse(savedEvents) as Array<CalendarEvent & { duration?: string; category?: string }>).map(normalizeCalendarEvent)); } catch { /* 기본 일정 유지 */ }
      try { if (savedWeatherLocation) setWeatherLocation(JSON.parse(savedWeatherLocation)); } catch { /* 서울 유지 */ }
      setStorageReady(true);
    }, 0);
    return () => window.clearTimeout(loadSavedData);
  }, []);
  useEffect(() => { if (storageReady) window.localStorage.setItem("my-assistant-memos", JSON.stringify(memos)); }, [memos, storageReady]);
  useEffect(() => { if (storageReady) window.localStorage.setItem("my-assistant-work", JSON.stringify(workItems)); }, [workItems, storageReady]);
  useEffect(() => { if (storageReady) window.localStorage.setItem("my-assistant-events", JSON.stringify(events)); }, [events, storageReady]);
  useEffect(() => { if (storageReady) window.localStorage.setItem("my-assistant-weather-location", JSON.stringify(weatherLocation)); }, [weatherLocation, storageReady]);
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register(`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/sw.js`).catch(() => undefined);
  }, []);
  const saveVoiceEntry = (kind: VoiceKind, text: string, date: string, time: string) => {
    const title = voiceTitle(text);
    if (kind === "memo") { setMemos(current => [{ id: Date.now(), title, content: text, category: "개인", pinned: false, deleted: false, createdAt: "방금 전" }, ...current]); setTab("memo"); }
    if (kind === "work") { setWorkItems(current => [{ id: Date.now(), title, details: text, project: "음성 입력", completed: false, createdAt: "방금 전" }, ...current]); setTab("work"); }
    if (kind === "calendar") { setEvents(current => [...current, { id: Date.now(), title, date, time, content: text, repeatYearly: false, calendarType: "solar", reminder3Days: true, reminder1Day: true, deleted: false }]); setTab("calendar"); }
    setVoiceOpen(false);
  };
  const exportData = () => {
    const backup: BackupPayload = { app: "personal-assistant-app", version: 1, exportedAt: new Date().toISOString(), memos, workItems, events, weatherLocation };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `나의비서-백업-${localDateKey()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };
  const importData = async (file: File) => {
    try {
      const backup = JSON.parse(await file.text()) as BackupPayload;
      if (backup.app !== "personal-assistant-app" || backup.version !== 1 || !Array.isArray(backup.memos) || !Array.isArray(backup.workItems) || !Array.isArray(backup.events)) throw new Error("invalid backup");
      if (!window.confirm("현재 메모·업무·일정을 백업 파일 내용으로 바꿀까요? 먼저 현재 데이터를 백업해 두는 것을 권장합니다.")) return;
      setMemos(backup.memos);
      setWorkItems(backup.workItems);
      setEvents(backup.events.map(normalizeCalendarEvent));
      if (backup.weatherLocation) setWeatherLocation(backup.weatherLocation);
      window.alert("백업 파일에서 데이터를 복원했습니다.");
    } catch {
      window.alert("이 앱에서 만든 올바른 백업 파일이 아닙니다.");
    }
  };
  const views = { home: <HomeView go={setTab} memos={memos} workItems={workItems} setWorkItems={setWorkItems} events={events} weatherLocation={weatherLocation} openVoice={() => setVoiceOpen(true)}/>, memo: <MemoView memos={memos} setMemos={setMemos}/>, work: <WorkView items={workItems} setItems={setWorkItems}/>, calendar: <CalendarView events={events} setEvents={setEvents} openVoice={() => setVoiceOpen(true)}/>, more: <MoreView go={setTab} exportData={exportData} importData={importData}/>, weather: <WeatherView back={() => setTab("more")} location={weatherLocation} setLocation={setWeatherLocation}/> };
  return <main className="app-shell"><section className="phone-screen"><div className="view-content" key={tab}>{views[tab]}</div><nav className="bottom-nav" aria-label="주요 메뉴">{menuItems.map(item=><button className={tab===item.id?"active":""} onClick={()=>setTab(item.id)} key={item.id}><span>{item.icon}</span>{item.label}</button>)}</nav>{voiceOpen && <VoiceCapture close={() => setVoiceOpen(false)} save={saveVoiceEntry}/>}</section></main>;
}
