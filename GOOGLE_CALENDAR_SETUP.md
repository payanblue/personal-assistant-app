# Google Calendar 연결 준비

앱은 Google 비밀번호나 비밀키를 저장하지 않습니다. 사용자가 `Google Calendar 연결` 버튼을 누르면 Google 공식 동의창에서 일정 추가 권한만 허용합니다.

## 한 번만 준비할 항목

1. [Google Cloud Console](https://console.cloud.google.com/)에서 새 프로젝트를 만듭니다.
2. `API 및 서비스` → `라이브러리`에서 **Google Calendar API**를 사용 설정합니다.
3. `Google Auth Platform`에서 앱 이름과 본인 이메일을 입력합니다.
4. 앱 공개 대상은 처음에는 **외부 / 테스트**로 두고, 본인 Google 계정을 테스트 사용자로 추가합니다.
5. `클라이언트` → `클라이언트 만들기` → **웹 애플리케이션**을 선택합니다.
6. 승인된 JavaScript 원본에 개발 주소 `http://localhost:3001`을 추가합니다. 실제 배포 후에는 배포 주소도 추가합니다.
7. 발급된 클라이언트 ID를 `.env.local` 파일의 다음 항목에 넣습니다.

```text
NEXT_PUBLIC_GOOGLE_CLIENT_ID=발급받은값.apps.googleusercontent.com
```

개발 서버를 껐다가 다시 실행하면 일정 화면의 Google 연결 버튼이 작동합니다.

## 연결 범위

- 앱은 사용자의 기본 Google Calendar에 일정만 추가합니다.
- 3일 전·1일 전 설정은 Google Calendar 팝업 알림으로 전달합니다.
- 양력 매년 반복은 Google Calendar의 매년 반복으로 보냅니다.
- 음력 반복은 해마다 날짜가 달라 현재 계산된 1회 일정으로 보냅니다.
