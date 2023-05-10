## Features

`locales/ko.js`에 있는 단어를 바로 불러올 수 있는 확장프로그램입니다.

[확장프로그램 다운로드](https://github.com/gJhlee/gt-vscode-locale-finder/releases/tag/0.0.1)

![example](https://i.ibb.co/njkKRFP/ezgif-3-57443f3178.gif)

## How to Install

VSCode 확장(`Ctrl+Shift+X`) 탭 우상단 [...] 버튼을 클릭하고, `VSIX에서 설치`를 눌러 받은 .vsix 파일을 선택하여 설치합니다.

## 기능

### 단어 -> i18n key
에디터에서 단어를 선택 후 `Ctrl+Shift+P`를 눌러 명령어 팔레트를 열고, `i18n` 혹은 `GTOne tools: i18n`을 검색하여 실행합니다.
선택된 단어와 가장 비슷한 항목을 추천해줍니다.

(베타버전이므로 몇가지 이슈가 있을 수 있으니 피드백 주세요!)

### i18n key 검색
에디터에서 검색할 i18n 키를 선택 후 `Ctrl+Shift+P` -> `GTOne tools: find i18n labels`를 실행합니다.

![example](https://i.ibb.co/PmTCFLg/2023-05-10-130226.png)

### 누락된 i18n 소스 검출

저장 시 `category:label.key` 형태의 리소스를 찾아 locale 파일에 등록되어있는 확인하고, 비슷한 키가 있는 경우 추천해줍니다.

![example](https://i.ibb.co/0jZw9PP/2023-05-10-105013.png);


## 만든사람

GTOne DG&AG 이정훈 :)
