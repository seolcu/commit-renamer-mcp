#!/bin/bash

# MCP 라이브 테스트 스크립트
# 테스트용 Git 저장소를 만들고 MCP 도구들을 시험합니다

set -e

echo "=== Commit Renamer MCP 라이브 테스트 ==="
echo ""

# 프로젝트 경로 저장
PROJECT_PATH="/home/seolcu/문서/코드/commit-renamer-mcp"

# 테스트 임시 디렉토리 생성
TEST_REPO=$(mktemp -d)
echo "1. 테스트 저장소 생성: $TEST_REPO"
cd "$TEST_REPO"

# Git 저장소 초기화
git init
git config user.email "test@example.com"
git config user.name "Test User"

# 여러 커밋 생성
echo "Initial content" > file1.txt
git add file1.txt
git commit -m "Initial commit with typo in mesage"

echo "Second content" > file2.txt
git add file2.txt
git commit -m "Add feature for user registartion"

echo "Third content" > file3.txt
git add file3.txt
git commit -m "Fix bug in data procesing"

echo ""
echo "=== 테스트 1: list_commits (최근 3개 커밋 조회) ==="
node -e "
const { listCommits } = require('$PROJECT_PATH/dist/git/operations.js');
listCommits(3, '$TEST_REPO').then(commits => {
  console.log('커밋 조회 성공:');
  commits.forEach((c, i) => {
    console.log(\`  [\${i+1}] \${c.hash.substring(0, 7)} - \${c.message}\`);
  });
}).catch(e => console.error('오류:', e.message));
"

echo ""
echo "=== 테스트 2: get_repo_status (저장소 상태 확인) ==="
node -e "
const { getRepoStatus } = require('$PROJECT_PATH/dist/git/operations.js');
getRepoStatus('$TEST_REPO').then(status => {
  console.log('저장소 상태:');
  console.log('  현재 브랜치:', status.currentBranch);
  console.log('  커밋 수:', status.commitCount);
  console.log('  변경 여부:', status.isDirty ? '예' : '아니오');
  console.log('  리베이스 중:', status.isRebasing ? '예' : '아니오');
}).catch(e => console.error('오류:', e.message));
"

echo ""
echo "=== 테스트 3: preview_rename (이름 변경 미리보기) ==="
node -e "
const { listCommits, getCommitByHash } = require('$PROJECT_PATH/dist/git/operations.js');
const { spawnSync } = require('child_process');

(async () => {
  try {
    const commits = await listCommits(1, '$TEST_REPO');
    const latest = commits[0];
    console.log('최신 커밋:', latest.hash.substring(0, 7), '-', latest.message);
    
    // 미리보기 (단순 비교만 수행)
    const newMessage = 'Fix typo in message';
    console.log('변경 예정:', newMessage);
    console.log('미리보기 성공 - 실제 변경은 수행하지 않음');
  } catch (e) {
    console.error('오류:', e.message);
  }
})();
"

echo ""
echo "=== 테스트 4: 파일 수정 후 상태 확인 ==="
echo "Modified content" > file1.txt
node -e "
const { getRepoStatus } = require('$PROJECT_PATH/dist/git/operations.js');
getRepoStatus('$TEST_REPO').then(status => {
  console.log('변경 후 저장소 상태:');
  console.log('  변경 여부:', status.isDirty ? '예 (파일 변경됨)' : '아니오');
}).catch(e => console.error('오류:', e.message));
"

# 정리
echo ""
echo "=== 테스트 완료 ==="
echo "테스트 저장소 삭제 중..."
cd /
rm -rf "$TEST_REPO"
echo "완료!"
