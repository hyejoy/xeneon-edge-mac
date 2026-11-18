# xeneon-edge-mac

Corsair Xeneon Edge(2560×720) 전용 개인 대시보드. 날씨 | 이번 달 달력 + 공부 계획 | 메모 3단 구성.

```
npm install
npm start      # 제논 엣지가 연결돼 있으면 그 화면에 전체화면, 없으면 주 모니터에 미리보기 창
npm test
```

- **Admin**: 메뉴 → `Admin 열기` (⌘,) 또는 Dock 아이콘 클릭. 탭으로 공부계획관리 / 메모관리(드래그로 순서 변경), 날씨 위치 설정.
- **데이터**: `~/Library/Application Support/xeneon-edge-mac/data.json`
- **날씨**: [Open-Meteo](https://open-meteo.com) (API 키 불필요). 위치를 지정하지 않으면 IP로 추정(ipapi.co).
