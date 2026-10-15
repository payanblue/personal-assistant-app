export type NoteRevision = {
  capturedAt: string;
  title: string;
  content?: string;
  details?: string;
  category?: string;
};
type NoteText = { title: string; content?: string; details?: string; category?: string; revisions?: NoteRevision[] };
export function rememberRevision<T extends NoteText>(item: T, patch: Partial<T>): T {
  const next = { ...item, ...patch };
  if (["title", "content", "details", "category"].every((key) => item[key as keyof NoteText] === next[key as keyof NoteText])) return next;
  const revision: NoteRevision = { capturedAt: new Date().toISOString(), title: item.title };
  if (item.content !== undefined) revision.content = item.content;
  if (item.details !== undefined) revision.details = item.details;
  if (item.category !== undefined) revision.category = item.category;
  return { ...next, revisions: [revision, ...(item.revisions ?? [])].slice(0, 10) };
}
export function noteActions(text: string) {
  const urls = [...new Set((text.match(/https?:\/\/[^\s<>"']+/gi) ?? []).map((url) => url.replace(/[.,!?;:)\]}>]+$/, "")))];
  const phones = [...new Set([...text.matchAll(/(?:^|[^\dA-Za-z])((?:\+82[-.\s]?)?(?:0?10|0?11|0?16|0?17|0?18|0?19|0?2|0?3[1-3]|0?4[1-4]|0?5[1-5]|0?6[1-4]|0?70|0?80)[-.\s]?\d{3,4}[-.\s]?\d{4})(?!\d|[A-Za-z])/g)].map((match) => match[1]))];
  const addresses = [...new Set(text.split(/[\n;|]/).flatMap((line) => {
    const match = line.match(/(?:(?:서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)\s+)?(?:[가-힣]+(?:특별자치도|특별자치시|특별시|광역시|도|시|군|구)\s+){0,3}[가-힣0-9·]+(?:로|길)\s*\d+(?:-\d+)?(?:\s+\d+층)?/);
    return match ? [match[0]] : [];
  }))];
  return { phones, urls, addresses };
}
