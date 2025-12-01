# Commit Renamer MCP

AI 에이전트가 Git 커밋 메시지를 안전하게 수정할 수 있도록 도와주는 MCP (Model Context Protocol) 서버입니다.

## 기능

이 MCP 서버는 다음 도구들을 제공합니다:

### `list_commits`
최근 커밋 목록을 조회합니다.

**파라미터:**
- `count` (number, optional): 조회할 커밋 개수 (1-100, 기본값: 10)
- `cwd` (string, optional): 작업 디렉토리 (기본값: 현재 디렉토리)

**반환값:**
```json
{
  "commits": [
    {
      "hash": "전체 커밋 해시",
      "shortHash": "짧은 커밋 해시",
      "message": "커밋 메시지",
      "author": "작성자",
      "date": "작성 날짜"
    }
  ]
}
```

### `get_repo_status`
현재 저장소의 상태를 확인합니다.

**파라미터:**
- `cwd` (string, optional): 작업 디렉토리

**반환값:**
```json
{
  "branch": "현재 브랜치명",
  "isClean": true,
  "hasUncommittedChanges": false,
  "isRebaseInProgress": false
}
```

### `preview_rename`
커밋 메시지 변경 사항을 실제로 적용하지 않고 미리 확인합니다.

**파라미터:**
- `commit_hash` (string, required): 변경할 커밋 해시 (전체 또는 짧은 해시)
- `new_message` (string, required): 새로운 커밋 메시지
- `cwd` (string, optional): 작업 디렉토리

**반환값:**
```json
{
  "commit": {
    "hash": "커밋 해시",
    "shortHash": "짧은 해시",
    "currentMessage": "현재 메시지",
    "newMessage": "새 메시지",
    "author": "작성자",
    "date": "날짜"
  },
  "canProceed": true,
  "warnings": ["경고 메시지들"]
}
```

### `rename_commit`
커밋 메시지를 실제로 변경합니다. **경고: Git 히스토리를 재작성합니다!**

**파라미터:**
- `commit_hash` (string, required): 변경할 커밋 해시
- `new_message` (string, required): 새로운 커밋 메시지
- `force` (boolean, optional): 안전 검사 우회 (기본값: false)
- `cwd` (string, optional): 작업 디렉토리

**반환값:**
```json
{
  "success": true,
  "oldHash": "이전 해시",
  "newHash": "새 해시",
  "newMessage": "새 메시지",
  "warnings": ["경고 메시지들"]
}
```

### `undo_rename`
마지막 커밋 메시지 변경을 취소합니다 (git reflog 사용).

**파라미터:**
- `cwd` (string, optional): 작업 디렉토리

**반환값:**
```json
{
  "success": true,
  "message": "Successfully reverted to previous state using reflog"
}
```

## 설치

```bash
npm install
npm run build
```

## 사용법

### Claude Desktop에서 사용

`claude_desktop_config.json`에 다음 내용을 추가하세요:

```json
{
  "mcpServers": {
    "commit-renamer": {
      "command": "node",
      "args": ["/path/to/commit-renamer-mcp/dist/index.js"]
    }
  }
}
```

### 다른 MCP 클라이언트에서 사용

이 서버는 stdio transport를 사용하므로, 표준 입출력을 통해 통신하는 모든 MCP 클라이언트와 호환됩니다.

```bash
node dist/index.js
```

## 안전 장치

이 도구는 다음과 같은 안전 장치를 제공합니다:

1. **Working Directory 확인**: 커밋되지 않은 변경사항이 있으면 작업을 거부합니다.
2. **Rebase 상태 확인**: 이미 rebase가 진행 중이면 작업을 거부합니다.
3. **원격 푸시 확인**: 원격에 푸시된 커밋은 기본적으로 변경을 막습니다 (`force=true`로 우회 가능).
4. **미리보기 기능**: 실제 변경 전에 어떤 일이 일어날지 확인할 수 있습니다.
5. **Undo 기능**: 실수로 변경한 경우 reflog를 통해 되돌릴 수 있습니다.

## 주의사항

**커밋 메시지 변경은 Git 히스토리를 재작성합니다!**

- 혼자 사용하는 브랜치에서만 사용하세요.
- 다른 사람과 공유하는 브랜치에서 히스토리를 재작성하면 심각한 문제가 발생할 수 있습니다.
- 원격에 푸시된 커밋을 변경한 후에는 `git push --force`가 필요합니다.
- 가능하면 `preview_rename`으로 먼저 확인한 후 변경하세요.

## 개발

### 빌드 및 실행
```bash
# 개발 모드로 실행
npm run dev

# 빌드
npm run build

# 배포
npm start
```

### 코드 품질 관리
```bash
# 전체 품질 체크 (타입체크 + 린트 + 포매팅 + 테스트)
npm run quality

# 개별 실행
npm run typecheck     # TypeScript 타입 체크
npm run lint          # ESLint 체크
npm run format        # Prettier 포매팅
npm test              # 테스트 실행
```

자세한 내용은 [CONTRIBUTING.md](CONTRIBUTING.md)를 참고하세요.

## 품질 보증

- **TypeScript Strict Mode**: 타입 안전성 보장
- **ESLint**: 코드 품질 자동 검사
- **Prettier**: 일관된 코드 스타일
- **Vitest**: 13개 단위 테스트 (100% 통과)
- **프로덕션 준비 완료**: 모든 품질 체크 통과

## 라이선스

MIT

## 기여

이슈나 PR은 언제든 환영합니다! [기여 가이드](CONTRIBUTING.md)를 참고해주세요.
