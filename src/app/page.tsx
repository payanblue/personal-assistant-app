"use client";

import { useState } from "react";

type Tab = "home" | "memo" | "work" | "shopping" | "calendar" | "more";

const menuItems: { icon: string; label: string; id: Tab }[] = [
  { icon: "⌂", label: "홈", id: "home" },
  { icon: "✎", label: "메모", id: "memo" },
  { icon: "✓", label: "업무", id: "work" },
  { icon: "♛", label: "쇼핑", id: "shopping" },
  { icon: "□", label: "일정", id: "calendar" },
  { icon: "•••", label: "더보기", id: "more" },
];

function HomeView({ go }: { go: (tab: Tab) => void }) {
  return <>
    <header className="topbar"><div><p className="eyebrow">8월 6일 목요일</p><h1>좋은 아침이에요 👋</h1></div><button className="profile-button" aria-label="내 정보">나</button></header>
    <button className="quick-input" onClick={() => go("memo")}><span className="mic">●</span><span>메모나 일정을 말해보세요</span><strong>＋</strong></button>
    <button className="weather-card" onClick={() => go("more")}><div><p>서울 · 맑음</p><strong>28°</strong><span>체감 30° · 비 올 확률 10%</span></div><div className="sun" aria-hidden="true">☀</div></button>
    <section className="section-block"><div className="section-title"><h2>오늘 일정</h2><button onClick={() => go("calendar")}>전체보기</button></div><article className="schedule-card"><div className="time"><strong>10:30</strong><span>오전</span></div><div className="divider"/><div><strong>프로젝트 진행 확인</strong><p>30분 · 업무</p></div></article></section>
    <section className="section-block"><div className="section-title"><h2>할 일</h2><span className="count">2개 남음</span></div><div className="todo-list"><label><input type="checkbox"/> 견적서 내용 확인하기</label><label><input type="checkbox"/> 장보기 목록 정리하기</label></div></section>
    <section className="shortcut-grid"><button onClick={() => go("memo")}><span>📝</span><strong>빠른 메모</strong><small>바로 기록하기</small></button><button onClick={() => go("shopping")}><span>🛍️</span><strong>쇼핑 검색</strong><small>배송비 포함 최저가</small></button></section>
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

function ShoppingView() {
  return <><PageHeader title="쇼핑 검색"/><div className="shopping-search"><span>⌕</span><input aria-label="상품 검색" placeholder="상품명이나 모델명을 입력하세요"/><button>검색</button></div><div className="shopping-guide"><strong>배송비까지 더한 가격으로 비교해요</strong><p>쿠폰·카드·멤버십 조건은 따로 표시합니다.</p></div><section className="section-block"><div className="section-title"><h2>최근 검색</h2><button>전체 삭제</button></div><div className="recent-searches"><button>삼성 990 PRO 2TB <span>›</span></button><button>무선 청소기 <span>›</span></button></div></section><section className="shopping-preview"><p>검색 결과는 이렇게 보여드려요</p><article><span className="rank">1</span><div><strong>A 판매처</strong><small>상품 184,000원 · 무료배송</small></div><b>184,000원</b></article><article><span className="rank second">2</span><div><strong>B 판매처</strong><small>상품 181,500원 + 배송 3,000원</small></div><b>184,500원</b></article><small className="preview-note">예시 화면이며 실제 가격은 기능 연결 후 표시됩니다.</small></section></>;
}

function MoreView() {
  return <><PageHeader title="더보기"/><section className="feature-list"><button><span className="feature-icon weather">☀</span><div><strong>날씨</strong><small>시간별·주간 예보와 기상특보</small></div><b>›</b></button></section><h2 className="settings-title">설정</h2><section className="feature-list compact"><button><span>🔔</span><div><strong>알림 설정</strong></div><b>›</b></button><button><span>🎙</span><div><strong>음성 명령 설정</strong></div><b>›</b></button><button><span>⚙</span><div><strong>앱 설정</strong></div><b>›</b></button></section><div className="coming-note"><strong>현재는 화면 설계 단계예요</strong><p>메모 저장, 일정 연결, 날씨와 쇼핑 정보는 다음 단계에서 하나씩 연결합니다.</p></div></>;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("home");
  const views = { home: <HomeView go={setTab}/>, memo: <MemoView/>, work: <WorkView/>, shopping: <ShoppingView/>, calendar: <CalendarView/>, more: <MoreView/> };
  return <main className="app-shell"><section className="phone-screen"><div className="view-content" key={tab}>{views[tab]}</div><nav className="bottom-nav" aria-label="주요 메뉴">{menuItems.map(item=><button className={tab===item.id?"active":""} onClick={()=>setTab(item.id)} key={item.id}><span>{item.icon}</span>{item.label}</button>)}</nav></section></main>;
}
