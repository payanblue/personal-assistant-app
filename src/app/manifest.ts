import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return {
    name: "나의 비서",
    short_name: "나의 비서",
    description: "메모, 업무, 일정과 날씨를 가볍게 관리하는 개인비서",
    start_url: `${basePath}/`,
    display: "standalone",
    background_color: "#c7d2cb",
    theme_color: "#216b4a",
    lang: "ko-KR",
    orientation: "portrait",
    share_target: {
      action: `${basePath}/share-target`,
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        title: "title",
        text: "text",
        url: "url",
        files: [
          {
            name: "photos",
            accept: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
          },
        ],
      },
    },
    icons: [
      { src: `${basePath}/assistant-icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${basePath}/assistant-icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `${basePath}/assistant-icon-maskable-512.png`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: `${basePath}/assistant-icon.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
