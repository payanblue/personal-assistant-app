const menuItems = [
  { icon: "⌂", label: "홈", active: true },
  { icon: "✎", label: "메모" },
  { icon: "✓", label: "업무" },
  { icon: "□", label: "일정" },
  { icon: "•••", label: "더보기" },
];

export default function Home() {
  return (
    <main className="app-shell">
      <section className="phone-screen">
        <header className="topbar">
          <div>
            <p className="eyebrow">8월 6일 목요일</p>
            <h1>좋은 아침이에요 👋</h1>
          </div>
          <button className="profile-button" aria-label="내 정보">나</button>
        </header>

        <button className="quick-input">
          <span className="mic">●</span>
          <span>메모나 일정을 말해보세요</span>
          <strong>＋</strong>
        </button>

        <section className="weather-card">
          <div>
            <p>서울 · 맑음</p>
            <strong>28°</strong>
            <span>체감 30° · 비 올 확률 10%</span>
          </div>
          <div className="sun" aria-hidden="true">☀</div>
        </section>

        <section className="section-block">
          <div className="section-title">
            <h2>오늘 일정</h2>
            <button>전체보기</button>
          </div>
          <article className="schedule-card">
            <div className="time"><strong>10:30</strong><span>오전</span></div>
            <div className="divider" />
            <div><strong>프로젝트 진행 확인</strong><p>30분 · 업무</p></div>
          </article>
        </section>

        <section className="section-block">
          <div className="section-title">
            <h2>할 일</h2>
            <span className="count">2개 남음</span>
          </div>
          <div className="todo-list">
            <label><input type="checkbox" /> 견적서 내용 확인하기</label>
            <label><input type="checkbox" /> 장보기 목록 정리하기</label>
          </div>
        </section>

        <section className="shortcut-grid">
          <button><span>📝</span><strong>빠른 메모</strong><small>바로 기록하기</small></button>
          <button><span>🛍️</span><strong>쇼핑 검색</strong><small>배송비 포함 최저가</small></button>
        </section>

        <nav className="bottom-nav" aria-label="주요 메뉴">
          {menuItems.map((item) => (
            <button className={item.active ? "active" : ""} key={item.label}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}
