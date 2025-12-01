# Contributing

## 개발 환경 설정

```bash
npm install
```

## 코드 품질 도구

### 포매팅
```bash
npm run format        # 코드 포매팅
npm run format:check  # 포매팅 확인
```

### 린팅
```bash
npm run lint          # 린트 체크
npm run lint:fix      # 자동 수정
```

### 타입 체크
```bash
npm run typecheck     # TypeScript 타입 체크
```

### 테스트
```bash
npm test              # 테스트 실행
npm run test:watch    # 테스트 watch 모드
npm run test:coverage # 커버리지 리포트
```

### 전체 품질 체크
```bash
npm run quality       # 타입체크 + 린트 + 포매팅 + 테스트
```

## 빌드
```bash
npm run build         # TypeScript 컴파일
npm run dev           # 개발 모드로 실행
```

## 코드 스타일

- Prettier를 사용하여 코드 포매팅
- ESLint로 코드 품질 유지
- TypeScript strict mode 활성화
- 모든 PR은 `npm run quality` 통과 필수

## 테스트 작성 가이드

테스트는 `src/__tests__/` 디렉토리에 작성합니다.
- 파일명: `*.test.ts`
- Vitest 사용
- 실제 Git 저장소를 임시로 생성하여 테스트

## 커밋 메시지

Conventional Commits 스타일을 권장합니다:
- `feat: 새로운 기능`
- `fix: 버그 수정`
- `docs: 문서 수정`
- `refactor: 리팩토링`
- `test: 테스트 추가/수정`
- `chore: 기타 변경사항`
