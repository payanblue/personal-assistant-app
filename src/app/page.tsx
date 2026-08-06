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

const menuItems: { icon: string; label: string; id: Tab }[] = [
  { icon: "⌂", label: "홈", id: "home" },
  { icon: "✎", label: "메모", id: "memo" },
  { icon: "✓", label: "업무", id: "work" },
  { icon: "□", label: "일정", id: "calendar" },
  { icon: "•••", label: "더보기", id: "more" },
];

function HomeView({ go }: { go: (tab: Tab) => void }) {
  return <>
    <header className="topbar"><div><p className="eyebrow">8월 6일 목요일</p><h1>좋은 아침이에요 👋</h1></div><button className="profile-button" aria-label="내 정보">나</button></header>
    <button className="quick-input" onClick={() => go("memo")}><span className="mic">●</span><span>메모나 일정을 말해보세요</span><strong>＋</strong></button>
    <button className="weather-card" onClick={() => go("weather")}><div><p>서울 · 맑음</p><strong>28°</strong><span>체감 30° · 자세한 예보 보기</span></div><div className="sun" aria-hidden="true">☀</div></button>
    <section className="section-block"><div className="section-title"><h2>오늘 일정</h2><button onClick={() => go("calendar")}>전체보기</button></div><article className="schedule-card"><div className="time"><strong>10:30</strong><span>오전</span></div><div className="divider"/><div><strong>프로젝트 진행 확인</strong><p>30분 · 업무</p></div></article></section>
    <section className="section-block"><div className="section-title"><h2>할 일</h2><span className="count">2개 남음</span></div><div className="todo-list"><label><input type="checkbox"/> 견적서 내용 확인하기</label><label><input type="checkbox"/> 장보기 목록 정리하기</label></div></section>
    <section className="shortcut-grid"><button onClick={() => go("memo")}><span>📝</span><strong>빠른 메모</strong><small>바로 기록하기</small></button><button onClick={() => go("work")}><span>✅</span><strong>업무 메모</strong><small>진행할 업무 보기</small></button></section>
  </>;
}

function PageHeader({ title, action }: { title: string; action?: string }) {
  return <header className="page-header"><div><p className="eyebrow">나의 비서</p><h1>{title}</h1></div>{action && <button className="round-add">{action}</button>}</header>;
}

function MemoView() {
  return <><PageHeader title="메모" action="＋"/><div className="search-box">⌕ <span>메모 검색</span></div><div className="filter-row"><button className="selected">전체</button><button>중요</button><button>미완료</button></div><section className="card-list"><article><div className="card-top"><span className="tag personal">개인</span><small>오늘 오전 9:20</small></div><h3>주말 장보기 목록</h3><p>우유, 계란, 세제, 휴지 구입하기</p></article><article><div className="card-top"><span className="tag idea">아이디어</span><small>어제 오후 8:10</small></div><h3>개인비서 앱에 추가할 기능</h3><p>자주 사용하는 명령을 홈에 바로가기 형태로...</p></article></section><button className="floating-button">＋ 새 메모</button></>;
}

function WorkView() {
  return <><PageHeader title="업무 메모" action="＋"/><div className="summary-strip"><div><strong>2</strong><span>진행 중</span></div><div><strong>1</strong><span>오늘 완료</span></div><div><strong>3</strong><span>전체 업무</span></div></div><div className="filter-row"><button className="selected">전체</button><button>진행 중</button><button>완료</button></div><section className="work-feed"><article><div className="feed-line"><span className="status-dot orange"/><small>오늘 · 프로젝트</small></div><h3>견적서 내용 확인하기</h3><p>최종 금액과 납기 일정을 다시 확인해야 함</p><button>완료하기</button></article><article><div className="feed-line"><span className="status-dot green"/><small>어제 · 연락</small></div><h3>거래처 담당자에게 전화</h3><p>수정된 일정 전달 완료</p><span className="done-label">✓ 완료</span></article></section></>;
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
  const views = { home: <HomeView go={setTab}/>, memo: <MemoView/>, work: <WorkView/>, calendar: <CalendarView/>, more: <MoreView go={setTab}/>, weather: <WeatherView back={() => setTab("more")}/> };
  return <main className="app-shell"><section className="phone-screen"><div className="view-content" key={tab}>{views[tab]}</div><nav className="bottom-nav" aria-label="주요 메뉴">{menuItems.map(item=><button className={tab===item.id?"active":""} onClick={()=>setTab(item.id)} key={item.id}><span>{item.icon}</span>{item.label}</button>)}</nav></section></main>;
}
