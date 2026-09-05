<p align="center">
  <a href="https://trendshift.io/repositories/22585?utm_source=trendshift-badge&amp;utm_medium=badge&amp;utm_campaign=badge-trendshift-22585" target="_blank" rel="noopener noreferrer">
    <img src="https://trendshift.io/api/badge/trendshift/repositories/22585/daily" alt="waooAI%2Fwaoowaoo | Trendshift" width="250" height="55"/>
  </a>
</p>

<p align="center">오른쪽 Assistant와 대화하고 캔버스에 참고 자료를 업로드하고 정리하면서 이미지와 동영상을 만들고 개선하는 AI 창작 공간입니다.</p>

<p align="center"><a href="https://www.waoowaoo.com/">대기 목록 참여</a> · <a href="https://github.com/waooAI/waoowaoo/issues">문제 신고</a></p>

[English](README.md) · [简体中文](README_zh.md) · [日本語](README_ja.md) · [한국어](README_ko.md)

> [!IMPORTANT]
> **베타 버전**: 오류와 미완성 기능이 남아 있습니다. 빠르게 개선하고 있으니 커뮤니티에서 의견을 공유해 주세요.

WeChat / 커뮤니티

<img src="https://github.com/user-attachments/assets/0f4ff766-f059-4554-9193-caf34b081c7b" width="30%">

---

## ✨ 주요 기능

waoowaoo는 대화, 소재, 생성 결과를 하나의 프로젝트에서 다루는 창작 도구입니다. 하나의 아이디어에서 시작해 캐릭터 설정화, 브랜드 비주얼, 애니메이션 단편 등을 차근차근 만들 수 있습니다. 완성된 소설이나 대본을 먼저 준비할 필요는 없습니다.

- **캔버스에서 작업 정리**: 소재를 업로드하고 이미지와 영상을 확인하며 프로젝트 안에서 재사용합니다.
- **Assistant와 이어서 작업**: 목표를 설명하고 기존 소재를 참조하며 생성과 수정을 진행합니다.
- **생성 설정 직접 선택**: 초안 카드에서 모델이 지원하는 화면 비율, 영상 길이 등의 값을 선택합니다.
- **참고 이미지로 방향 유지**: 모델의 지원 범위에 따라 참고 이미지, 시작 프레임, 시작·끝 프레임을 사용합니다.
- **결과 다듬기**: 생성물을 미리 보고 새 버전을 만들거나 영상 클립을 합칠 수 있습니다.

사용할 수 있는 설정과 참고 소재의 종류는 모델마다 다릅니다. 모든 모델이 모든 기능을 지원하지는 않습니다.

---

## 🚀 시작하기

로컬 터미널을 사용할 수 있는 AI 코딩 도우미에게 아래 요청을 복사해서 전달하세요. 사용 중인 시스템과 선택한 릴리스에 맞춰 설치를 진행할 수 있습니다.

```text
이 컴퓨터에 waoowaoo를 설치해 주세요. 공개 저장소 주소는 다음과 같습니다.
https://github.com/waooAI/waoowaoo

먼저 운영체제, Docker 환경, 기존 waoowaoo 설치 및 데이터 유무를 확인해 주세요.
저장소의 docs/INSTALL.md와 설치할 Release의 설명을 읽고,
같은 릴리스에 해당하는 설치 파일을 사용해 주세요.
문서에 따라 사전 빌드된 Docker 이미지로 앱과 호환되는 Codex runtime을 설치하고,
필요한 의존 서비스를 준비해 주세요. 이미지 주소, 태그, digest, 시작 순서를 추측하지 마세요.
해당 버전의 배포 파일이 없다면 무엇이 없는지 설명하고, 출처가 불명확한 이미지로 대체하지 마세요.

필요한 비밀 키와 비밀번호는 각각 안전한 난수로 생성하고,
서로 연결된 설정값은 문서에 따라 일치시켜 주세요.
비밀값은 필요한 로컬 설정에만 저장하고, 대화나 로그에 출력하거나 Git에 커밋하지 마세요.
기존 설정과 데이터를 보존하고, 기존 설치 덮어쓰기, 볼륨 초기화, 파일 삭제를 하지 마세요.
기존 설치가 있다면 데이터를 보존하는 업데이트 방법을 설명한 뒤,
확인이 필요한 작업에 대한 동의를 받아 진행해 주세요.
운영체제 권한이나 수동 작업이 필요하면 목적과 방법을 안내해 주세요.
같은 Release의 docker/caddy/Caddyfile을 사용하고 Compose에서 Caddy를 시작해 주세요.
기본값은 SELF_HOSTED_HOST=localhost, SELF_HOSTED_HTTPS_PORT=1443입니다.
APP_HOST_PORT=13000은 HTTP 리디렉션 전용이며 NEXTAUTH_URL은 overlay에서 결정합니다.
Caddy의 /data와 /config 명명된 볼륨을 보존해 주세요.
root.crt만 내보내고 인증서를 신뢰한다는 의미를 설명한 뒤, 제 명시적 승인을 받아
브라우저가 실행되는 호스트 OS의 신뢰 저장소에 등록해 주세요. Windows와 WSL의 저장소는 다릅니다.
root.key를 내보내거나 TLS 검증을 우회하지 마세요. https://localhost:1443에서 인증서 경고가 없고,
여러 탭의 이벤트 스트림을 포함해 브라우저 통신이 실제 h2를 사용하는지 확인해 주세요.
SSE 탭 연결 수와 AI 작업 동시 실행 한도는 서로 다릅니다.

완료 후 서비스 상태와 웹페이지 접속을 확인하고, 접속 주소와 처음 사용하는 방법을 알려 주세요.
웹 화면에서 제 OpenRouter API Key를 설정하는 방법을 안내해 주세요.
키를 채팅으로 보내 달라고 요청하지 말고, 유료 생성 API를 자동으로 호출하지 마세요.
설치가 막히면 구체적인 원인과 다음 단계를 설명해 주세요.
```

릴리스용 Compose는 Caddy를 자동으로 시작합니다. 로컬 인증서 신뢰를 승인한 뒤 **https://localhost:1443**에 접속하세요. `13000` 포트는 HTTP 리디렉션만 제공합니다. 소스 개발용 `npm run dev`는 계속 `http://localhost:3001`을 사용합니다.

자세한 설치 및 업데이트 절차는 [설치 문서](docs/INSTALL.md)를 참고하세요. 업데이트할 때도 해당 Release의 안내를 따르고 기존 데이터를 보존하세요.

---

## 🔧 API 설정

현재 화면에서 선택할 수 있는 API 서비스는 **OpenRouter**입니다. 대화, 이미지, 영상 API 호출에는 비용이 발생할 수 있으며, 사용자의 서비스 계정에서 부담합니다. 앱을 로컬에서 실행해도 모델 사용이 무료가 되는 것은 아닙니다.

시험 제작에서는 짧은 영상과 낮은 지원 해상도를 선택하면 비용을 줄일 수 있습니다. 제출 전에 모델, 설정, 비용 안내를 확인하고 OpenRouter 계정 잔액도 살펴보세요.

앱 화면은 현재 **중국어와 영어**를 지원합니다. README는 영어·중국어·일본어·한국어로 제공하지만, 문서 언어와 화면 지원 언어는 다릅니다.

---

## 📦 기술 구성

- **Framework**: Next.js 16 + React 19
- **Database**: MySQL + Prisma ORM
- **Durable execution**: Temporal
- **Transport & cache**: Redis
- **Media storage**: Private MinIO (S3)
- **Styling**: Tailwind CSS v4
- **Auth**: NextAuth.js

---

## 📦 미리보기



---

## 🤝 참여 방법

핵심 팀이 프로젝트를 유지보수합니다. [Issues](https://github.com/waooAI/waoowaoo/issues)에서 오류와 기능을 제안해 주세요. Pull Request의 아이디어도 검토하지만 외부 PR을 직접 병합하지 않고 팀에서 변경 사항을 구현합니다.

---

## 라이선스

v0.5.0-beta.1부터 이 배포판에는 [Elastic License 2.0](LICENSE)이 적용됩니다. 약관을 준수하는 개인 사용, 기업 내부 상업적 사용, 수정 및 재배포가 허용됩니다. 소프트웨어의 주요 기능을 제삼자에게 호스팅 또는 관리형 서비스로 제공하려면 별도 허가가 필요합니다. 이전 버전과 제삼자 구성 요소에는 각자의 기존 라이선스가 유지됩니다. 소스 공개형 소프트웨어이며 OSI 승인 오픈 소스는 아닙니다.

---

**Made with ❤️ by waoowaoo team**

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=saturndec/waoowaoo&type=date&legend=top-left)](https://www.star-history.com/#saturndec/waoowaoo&type=date&legend=top-left)
