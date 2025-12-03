#!/bin/bash

# MCP 서버 통신 테스트 스크립트
# MCP 서버에 직접 요청을 보내고 응답을 확인합니다

set -e

echo "=== MCP 서버 통신 테스트 ==="
echo ""

# 테스트 임시 디렉토리 생성
TEST_REPO=$(mktemp -d)
echo "1. 테스트 저장소 준비: $TEST_REPO"

# Git 저장소 초기화
cd "$TEST_REPO"
git init > /dev/null 2>&1
git config user.email "test@example.com"
git config user.name "Test User"

# 여러 커밋 생성
echo "Content 1" > file.txt
git add file.txt
git commit -m "First commit with a smal typo" > /dev/null

echo "Content 2" > file.txt
git add file.txt
git commit -m "Add new feature for databse backup" > /dev/null

echo "Content 3" > file.txt
git add file.txt
git commit -m "Update documantation and examples" > /dev/null

echo ""
echo "=== 테스트 1: list_commits 도구 테스트 ==="
echo ""

cd "$TEST_REPO" && node << 'EOF'
const { listCommits } = require('/home/seolcu/문서/코드/commit-renamer-mcp/dist/git/operations.js');

async function test() {
  try {
    const commits = await listCommits(3, '.');
    console.log('조회된 커밋:');
    commits.forEach((c, i) => {
      console.log(`  [${i+1}] ${c.hash.substring(0, 7)} - ${c.message}`);
    });
  } catch (e) {
    console.error('오류:', e.message);
  }
}

test();
EOF

echo ""
echo "=== 테스트 2: 실제 커밋 메시지 변경 테스트 ==="
echo ""

# 최신 커밋 해시 가져오기
cd "$TEST_REPO"
LATEST_HASH=$(git rev-parse HEAD)
echo "최신 커밋 해시: ${LATEST_HASH:0:7}"
echo "원본 메시지: Update documantation and examples"
echo ""

cd "$TEST_REPO" && node << EOF
const { renameCommitMessage, listCommits } = require('/home/seolcu/문서/코드/commit-renamer-mcp/dist/git/operations.js');

async function test() {
  try {
    await renameCommitMessage('$LATEST_HASH', 'Update documentation and examples', '.', true);
    console.log('커밋 메시지 변경 성공!');
    
    const commits = await listCommits(1, '.');
    console.log('변경 후 메시지: ' + commits[0].message);
  } catch (e) {
    console.error('오류:', e.message);
  }
}

test();
EOF

echo ""
echo "=== 테스트 3: 에러 처리 테스트 (잘못된 해시) ==="
echo ""

cd "$TEST_REPO" && node << 'EOF'
const { renameCommitMessage } = require('/home/seolcu/문서/코드/commit-renamer-mcp/dist/git/operations.js');

async function test() {
  try {
    await renameCommitMessage('invalid_hash_12345', 'New message', '.', false);
    console.log('예상하지 못한 성공');
  } catch (e) {
    console.log('예상된 오류 처리:');
    console.log('  에러 타입:', e.constructor.name);
    console.log('  에러 메시지:', e.message);
  }
}

test();
EOF

echo ""
echo "=== 테스트 4: 저장소 상태 확인 ==="
cd "$TEST_REPO" && git log --oneline -5 | sed 's/^/  /'

echo ""
echo "=== 테스트 5: 더티 워킹 디렉토리 테스트 ==="
echo ""
cd "$TEST_REPO"
echo "변경 사항" >> file.txt
node << 'EOF'
const { getRepoStatus } = require('/home/seolcu/문서/코드/commit-renamer-mcp/dist/git/operations.js');

async function test() {
  try {
    const status = await getRepoStatus('.');
    console.log('저장소 상태:');
    console.log('  isDirty:', status.isDirty);
    console.log('  isRebasing:', status.isRebasing);
  } catch (e) {
    console.error('오류:', e.message);
  }
}

test();
EOF

# 정리
echo ""
echo "=== 테스트 완료 ==="
rm -rf "$TEST_REPO"
echo "테스트 저장소 삭제 완료"
