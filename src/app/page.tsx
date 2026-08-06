"use client";

import { useEffect, useState } from "react";

type Tab = "home" | "memo" | "work" | "calendar" | "more" | "weather";

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

const menuItems: { icon: string; label: string; id: Tab }[] = [
  { icon: "⌂", label: "홈", id: "home" },
  { icon: "✎", label: "메모", id: "memo" },
  { icon: "✓", label: "업무", id: "work" },
  { icon: "□", label: "일정", id: "calendar" },
  { icon: "•••", label: "더보기", id: "more" },
];

function HomeView({ go, workItems, setWorkItems }: { go: (tab: Tab) => void; workItems: WorkItem[]; setWorkItems: React.Dispatch<React.SetStateAction<WorkItem[]>> }) {
  const activeItems = workItems.filter(item => !item.completed && !item.archived);
  return <>
    <header className="topbar"><div><p className="eyebrow">8월 6일 목요일</p><h1>좋은 아침이에요 👋</h1></div><button className="profile-button" aria-label="내 정보">나</button></header>
    <button className="quick-input" onClick={() => go("memo")}><span className="mic">●</span><span>메모나 일정을 말해보세요</span><strong>＋</strong></button>
    <button className="weather-card" onClick={() => go("weather")}><div><p>서울 · 맑음</p><strong>28°</strong><span>체감 30° · 자세한 예보 보기</span></div><div className="sun" aria-hidden="true">☀</div></button>
    <section className="section-block"><div className="section-title"><h2>오늘 일정</h2><button onClick={() => go("calendar")}>전체보기</button></div><article className="schedule-card"><div className="time"><strong>10:30</strong><span>오전</span></div><div className="divider"/><div><strong>프로젝트 진행 확인</strong><p>30분 · 업무</p></div></article></section>
    <section className="section-block"><div className="section-title"><h2>할 일</h2><span className="count">{activeItems.length}개 남음</span></div><div className="todo-list">{activeItems.slice(0, 2).map(item => <label key={item.id}><input type="checkbox" checked={item.completed} onChange={() => setWorkItems(items => items.map(current => current.id === item.id ? { ...current, completed: true } : current))}/> {item.title}</label>)}{activeItems.length === 0 && <button className="all-done" onClick={() => go("work")}>오늘 할 일을 모두 마쳤어요 ✓</button>}</div></section>
    <section className="shortcut-grid"><button onClick={() => go("memo")}><span>📝</span><strong>빠른 메모</strong><small>바로 기록하기</small></button><button onClick={() => go("work")}><span>✅</span><strong>업무 메모</strong><small>진행할 업무 보기</small></button></section>
  </>;
}

function PageHeader({ title, action }: { title: string; action?: string }) {
  return <header className="page-header"><div><p className="eyebrow">나의 비서</p><h1>{title}</h1></div>{action && <button className="round-add" onClick={() => document.querySelector<HTMLButtonElement>(".floating-button")?.click()}>{action}</button>}</header>;
}

function ContactActions({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState("");
  const pattern = /(?:\+82[-.\s]?)?(?:0?10|0?11|0?16|0?17|0?18|0?19|0?2|0?3[1-3]|0?4[1-4]|0?5[1-5]|0?6[1-4]|0?70|0?80)[-.\s]?\d{3,4}[-.\s]?\d{4}/g;
  const numbers = [...new Set(text.match(pattern) ?? [])];
  if (numbers.length === 0) return null;
  const saveContact = (number: string) => {
    const safeTitle = title.replace(/[\r\n:;]/g, " ");
    const cleanNumber = number.replace(/[^+\d]/g, "");
    const card = `BEGIN:VCARD\r\nVERSION:3.0\r\nFN:${safeTitle}\r\nTEL;TYPE=CELL:${cleanNumber}\r\nEND:VCARD\r\n`;
    const url = URL.createObjectURL(new Blob([card], { type: "text/vcard;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url; link.download = `${safeTitle || "연락처"}.vcf`; link.click(); URL.revokeObjectURL(url);
  };
  return <div className="contact-list">{numbers.map(number => { const cleanNumber = number.replace(/[^+\d]/g, ""); return <div className="contact-actions" key={number}><strong>☎ {number}</strong><div><a href={`tel:${cleanNumber}`}>전화</a><a href={`sms:${cleanNumber}`}>문자</a><button onClick={async () => { await navigator.clipboard.writeText(number); setCopied(number); }}>{copied === number ? "복사됨" : "복사"}</button><button onClick={() => saveContact(number)}>연락처 저장</button></div></div>})}</div>;
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

function CalendarView() {
  return <><PageHeader title="일정" action="＋"/><section className="month-card"><div className="month-title"><button>‹</button><strong>2026년 8월</strong><button>›</button></div><div className="weekdays">{["일","월","화","수","목","금","토"].map(d=><span key={d}>{d}</span>)}</div><div className="days">{Array.from({length:35},(_,i)=>{const n=i-4; return <button className={n===6?"today":n<1||n>31?"empty":""} key={i}>{n>0&&n<32?n:""}</button>})}</div></section><section className="section-block"><div className="section-title"><h2>8월 6일 일정</h2><span className="count">1개</span></div><article className="schedule-card"><div className="time"><strong>10:30</strong><span>오전</span></div><div className="divider"/><div><strong>프로젝트 진행 확인</strong><p>알림 10분 전 · 업무</p></div></article></section><button className="voice-button">● 음성으로 일정 추가</button></>;
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

function WeatherView({ back }: { back: () => void }) {
  const [data, setData] = useState<{ best: WeatherResponse; models: WeatherResponse[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const location = "latitude=37.5665&longitude=126.978&timezone=Asia%2FSeoul&forecast_days=5";
    const modelDaily = "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max";
    const bestUrl = `https://api.open-meteo.com/v1/forecast?${location}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max`;
    const modelUrls = ["ecmwf", "gfs", "jma"].map(model => `https://api.open-meteo.com/v1/${model}?${location}&daily=${modelDaily}`);
    Promise.all([fetch(bestUrl), ...modelUrls.map(url => fetch(url))])
      .then(async responses => {
        if (responses.some(response => !response.ok)) throw new Error("weather request failed");
        const values = await Promise.all(responses.map(response => response.json())) as WeatherResponse[];
        setData({ best: values[0], models: values.slice(1) });
      })
      .catch(() => setError(true));
  }, []);

  return <><header className="weather-header"><button onClick={back}>‹</button><div><p className="eyebrow">무료 다중모델 예보</p><h1>서울 날씨</h1></div><span>업데이트</span></header>{error ? <div className="weather-state"><strong>날씨를 불러오지 못했어요</strong><p>인터넷 연결을 확인하고 새로고침해 주세요.</p></div> : !data ? <div className="weather-state"><strong>최신 예보를 비교하고 있어요</strong><p>ECMWF·GFS·JMA 자료를 불러오는 중입니다.</p></div> : <><section className="weather-now"><div><p>현재 · {weatherLabel(data.best.current?.weather_code ?? 3)}</p><strong>{Math.round(data.best.current?.temperature_2m ?? 0)}°</strong><span>체감 {Math.round(data.best.current?.apparent_temperature ?? 0)}° · 습도 {data.best.current?.relative_humidity_2m ?? 0}%</span></div><b>{weatherIcon(data.best.current?.weather_code ?? 3)}</b></section><div className="model-badge">3개 예보모델 비교 중 · ECMWF · GFS · JMA</div><section className="forecast-list">{data.best.daily.time.map((date, index) => { const rainVotes = data.models.filter(model => (model.daily.precipitation_sum[index] ?? 0) >= 0.2).length; const agreement = rainVotes === 0 || rainVotes === data.models.length ? "높음" : "보통"; const day = new Intl.DateTimeFormat("ko-KR", { weekday: "short" }).format(new Date(`${date}T12:00:00`)); return <article key={date}><div className="forecast-day"><strong>{index === 0 ? "오늘" : day}</strong><small>{date.slice(5).replace("-", ".")}</small></div><span className="forecast-icon">{weatherIcon(data.best.daily.weather_code[index])}</span><div className="forecast-temp"><strong>{Math.round(data.best.daily.temperature_2m_max[index])}°</strong><span>{Math.round(data.best.daily.temperature_2m_min[index])}°</span></div><div className="forecast-rain"><strong>비 {data.best.daily.precipitation_probability_max?.[index] ?? 0}%</strong><small>모델 {rainVotes}/3 · 일치도 {agreement}</small></div></article>})}</section><div className="weather-source"><strong>예보를 읽는 방법</strong><p>세 모델이 같은 방향이면 일치도 높음으로 표시합니다. 공식 기상특보는 기상청 API 연결 후 별도로 최우선 표시합니다.</p></div></> }</>;
}

function MoreView({ go }: { go: (tab: Tab) => void }) {
  return <><PageHeader title="더보기"/><section className="feature-list"><button onClick={() => go("weather")}><span className="feature-icon weather">☀</span><div><strong>날씨</strong><small>여러 예보모델을 비교한 5일 날씨</small></div><b>›</b></button></section><h2 className="settings-title">설정</h2><section className="feature-list compact"><button><span>🔔</span><div><strong>알림 설정</strong></div><b>›</b></button><button><span>🎙</span><div><strong>음성 명령 설정</strong></div><b>›</b></button><button><span>⚙</span><div><strong>앱 설정</strong></div><b>›</b></button></section><div className="coming-note"><strong>현재는 화면 설계 단계예요</strong><p>메모 저장과 일정 연결은 다음 단계에서 하나씩 연결합니다.</p></div></>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const [memos, setMemos] = useState<Memo[]>(() => { if (typeof window === "undefined") return sampleMemos; const saved = window.localStorage.getItem("my-assistant-memos"); if (!saved) return sampleMemos; try { return JSON.parse(saved); } catch { return sampleMemos; } });
  const [workItems, setWorkItems] = useState<WorkItem[]>(() => { if (typeof window === "undefined") return sampleWorkItems; const saved = window.localStorage.getItem("my-assistant-work"); if (!saved) return sampleWorkItems; try { return JSON.parse(saved); } catch { return sampleWorkItems; } });
  useEffect(() => { window.localStorage.setItem("my-assistant-memos", JSON.stringify(memos)); }, [memos]);
  useEffect(() => { window.localStorage.setItem("my-assistant-work", JSON.stringify(workItems)); }, [workItems]);
  const views = { home: <HomeView go={setTab} workItems={workItems} setWorkItems={setWorkItems}/>, memo: <MemoView memos={memos} setMemos={setMemos}/>, work: <WorkView items={workItems} setItems={setWorkItems}/>, calendar: <CalendarView/>, more: <MoreView go={setTab}/>, weather: <WeatherView back={() => setTab("more")}/> };
  return <main className="app-shell"><section className="phone-screen"><div className="view-content" key={tab}>{views[tab]}</div><nav className="bottom-nav" aria-label="주요 메뉴">{menuItems.map(item=><button className={tab===item.id?"active":""} onClick={()=>setTab(item.id)} key={item.id}><span>{item.icon}</span>{item.label}</button>)}</nav></section></main>;
}
