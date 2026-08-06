import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "나의 비서",
    short_name: "나의 비서",
    description: "메모, 업무, 일정과 날씨를 가볍게 관리하는 개인비서",
    start_url: "/",
    display: "standalone",
    background_color: "#c7d2cb",
    theme_color: "#216b4a",
    lang: "ko-KR",
    orientation: "portrait",
    icons: [
      { src: "/assistant-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/assistant-icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
