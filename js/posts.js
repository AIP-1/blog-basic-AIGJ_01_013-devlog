// 블로그 글 데이터
// 새 글을 쓰려면 이 배열에 객체를 하나 추가하면 됩니다. (id는 겹치지 않게)
const POSTS = [
  {
    id: 1,
    title: "Git과 GitHub, 뭐가 다를까?",
    category: "Git",
    date: "2026-10-01",
    tags: ["Git", "GitHub", "입문"],
    emoji: "🐙",
    color: "#e8f0ff",
    excerpt: "버전 관리 도구 Git과 코드 호스팅 서비스 GitHub의 차이, 그리고 꼭 알아야 할 핵심 용어를 정리했다.",
    content: `
      <p>개발 공부를 시작하면 가장 먼저 듣는 말이 "GitHub에 올려"다. 그런데 Git과 GitHub는 같은 게 아니다.</p>

      <h2>한 줄 정리</h2>
      <table>
        <tr><th>구분</th><th>Git</th><th>GitHub</th></tr>
        <tr><td>정체</td><td>버전 관리 <b>도구</b></td><td>Git 저장소를 올리는 <b>웹 서비스</b></td></tr>
        <tr><td>위치</td><td>내 컴퓨터</td><td>클라우드</td></tr>
        <tr><td>역할</td><td>변경 이력 추적</td><td>공유, 협업, 리뷰</td></tr>
      </table>
      <blockquote>Git이 카메라라면 GitHub는 사진을 올리고 공유하는 SNS 같은 것.</blockquote>

      <h2>핵심 용어</h2>
      <ul>
        <li><b>Repository</b> : 프로젝트 파일과 변경 이력을 모아 둔 공간</li>
        <li><b>Commit</b> : 변경 사항을 하나의 기록으로 저장한 것</li>
        <li><b>Branch</b> : 원본에 영향 없이 따로 작업하는 갈래</li>
        <li><b>Push / Pull</b> : GitHub에 올리기 / GitHub에서 받아오기</li>
        <li><b>Pull Request</b> : "내 변경 사항을 합쳐 주세요"라는 요청</li>
      </ul>

      <h2>처음 설정</h2>
      <pre><code>git config --global user.name "이진행"
git config --global user.email "내 GitHub 이메일"</code></pre>
      <p>커밋 이메일이 GitHub 계정 이메일과 같아야 프로필에 잔디가 심어진다는 것도 오늘 알았다.</p>
    `
  },
  {
    id: 2,
    title: "첫 저장소 만들고 GitHub에 올리기",
    category: "Git",
    date: "2026-10-01",
    tags: ["Git", "GitHub", "gh CLI"],
    emoji: "📦",
    color: "#e9f9ef",
    excerpt: "git init부터 gh repo create까지, 내 컴퓨터의 폴더를 GitHub 저장소로 올리는 전체 과정.",
    content: `
      <p>오늘 처음으로 내 저장소를 만들어서 GitHub에 올려봤다. 순서대로 기록해 둔다.</p>

      <h2>1. 로컬 저장소 만들기</h2>
      <pre><code>mkdir my-first-repo
cd my-first-repo
git init</code></pre>
      <p><code>git init</code>을 하면 폴더 안에 <code>.git</code> 디렉터리가 생기고, 이때부터 Git이 변경 사항을 추적한다.</p>

      <h2>2. 첫 커밋</h2>
      <pre><code>git status          # Untracked 파일 확인
git add README.md   # 스테이징
git commit -m "첫 커밋: README 추가"</code></pre>
      <p>add는 "이번에 기록할 파일 고르기", commit은 "실제로 기록하기"라고 이해하면 쉽다.</p>

      <h2>3. GitHub에 올리기</h2>
      <p>GitHub CLI(<code>gh</code>)를 쓰면 저장소 생성, 원격 연결, push를 한 줄로 끝낼 수 있다.</p>
      <pre><code>brew install gh
gh auth login --web
gh repo create my-first-repo --private --source=. --push</code></pre>

      <h3>삽질 기록</h3>
      <blockquote><code>fatal: could not read Username for 'https://github.com'</code> 에러가 났다.
      <code>gh auth setup-git</code>을 한 번 실행해서 Git이 gh 로그인 정보를 쓰도록 연결하니 해결됐다.</blockquote>
    `
  },
  {
    id: 3,
    title: "브랜치와 Pull Request로 협업하기",
    category: "Git",
    date: "2026-10-01",
    tags: ["Git", "Branch", "Pull Request"],
    emoji: "🌿",
    color: "#fff6e0",
    excerpt: "main을 건드리지 않고 브랜치에서 작업한 뒤, Pull Request로 리뷰받고 합치는 기본 흐름.",
    content: `
      <p>실무에서는 main 브랜치에 바로 커밋하지 않는다. 브랜치를 따로 만들어 작업하고, Pull Request(PR)로 합친다.</p>

      <h2>전체 흐름</h2>
      <pre><code>git switch -c add-hello        # 새 브랜치 만들고 이동
# ... 파일 수정 ...
git commit -am "README 내용 추가"
git push -u origin add-hello   # 브랜치를 GitHub에 올리기
gh pr create                   # PR 만들기</code></pre>

      <h2>Merge 후 정리</h2>
      <p>GitHub 웹에서 <b>Merge pull request</b>를 누른 다음, 로컬도 최신으로 맞춰야 한다.</p>
      <pre><code>git switch main
git pull
git branch -d add-hello</code></pre>

      <blockquote>웹에서 merge할 때 나오는 <b>Delete branch</b> 버튼을 누르지 않으면 GitHub에 브랜치가 남는다.</blockquote>
    `
  },
  {
    id: 4,
    title: "Merge 충돌, 무서워하지 말자",
    category: "Git",
    date: "2026-10-01",
    tags: ["Git", "Merge", "Conflict"],
    emoji: "💥",
    color: "#ffeceb",
    excerpt: "두 브랜치가 같은 줄을 다르게 고치면 충돌이 난다. 충돌 표시를 읽는 법과 해결 순서.",
    content: `
      <p>일부러 충돌을 만들어서 해결해 보는 실습을 했다. 막상 해보니 생각보다 단순했다.</p>

      <h2>충돌은 언제 생길까?</h2>
      <p><b>같은 파일의 같은 줄</b>을 두 브랜치에서 서로 다르게 고친 뒤 merge하면, Git이 어느 쪽을 고를지 몰라서 사람에게 묻는다.</p>

      <h2>충돌 표시 읽기</h2>
      <pre><code>&lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD
이진행의 GitHub 실습용 저장소입니다. 🚀
=======
이진행이 Git을 공부하는 저장소입니다. 📚
&gt;&gt;&gt;&gt;&gt;&gt;&gt; intro-update</code></pre>
      <ul>
        <li><code>HEAD</code> 쪽 : 지금 내가 있는 브랜치의 내용</li>
        <li><code>intro-update</code> 쪽 : 합치려는 브랜치의 내용</li>
      </ul>

      <h2>해결 순서</h2>
      <ol>
        <li>남길 내용을 정한다. 한쪽만 남겨도 되고 섞어도 된다.</li>
        <li>&lt;&lt;&lt;, ===, &gt;&gt;&gt; 표시 세 줄을 모두 지운다.</li>
        <li><code>git add 파일</code> → <code>git commit</code></li>
      </ol>
      <p>나는 두 문장을 섞어서 "이진행이 github를 공부하는 실습용 저장소입니다."로 정리했다.</p>
      <blockquote>꼬였을 때는 <code>git merge --abort</code>로 merge 전 상태로 돌아갈 수 있다.</blockquote>
    `
  },
  {
    id: 5,
    title: "HTML/CSS/JS만으로 블로그 만들기",
    category: "Web",
    date: "2026-10-01",
    tags: ["HTML", "CSS", "JavaScript", "프로젝트"],
    emoji: "🛠️",
    color: "#f1ebff",
    excerpt: "Tistory를 참고해서 프레임워크 없이 만든 이 블로그의 구조와 구현 포인트.",
    content: `
      <p>첫 수업 과제로 Tistory를 참고해서 블로그를 만들었다. 지금 보고 있는 이 블로그가 그 결과물이다.</p>

      <h2>폴더 구조</h2>
      <pre><code>index.html      # 뼈대 (헤더, 본문, 사이드바)
css/style.css   # 디자인, 다크 모드, 반응형
js/posts.js     # 글 데이터
js/app.js       # 화면 그리기, 라우팅, 댓글/공감</code></pre>

      <h2>구현한 기능</h2>
      <ul>
        <li>글 목록과 페이지 번호</li>
        <li>카테고리, 태그별 모아보기와 검색</li>
        <li>글 상세 페이지, 이전/다음 글 이동</li>
        <li>공감(♥)과 댓글 (브라우저 localStorage에 저장)</li>
        <li>다크 모드, 모바일 화면 대응</li>
      </ul>

      <h2>해시 라우팅</h2>
      <p>페이지가 하나(index.html)뿐이라서 주소의 <code>#</code> 뒷부분으로 화면을 바꾼다.
      예를 들어 <code>#/post/5</code>면 5번 글, <code>#/category/Git</code>이면 Git 카테고리 목록을 보여준다.</p>
      <pre><code>window.addEventListener("hashchange", render);</code></pre>

      <h2>다크 모드</h2>
      <p>CSS 변수로 색을 정해 두고, <code>html</code> 태그의 <code>data-theme</code> 값만 바꿔서 전체 색을 한 번에 바꿨다.</p>
    `
  },
  {
    id: 6,
    title: "개발 블로그를 시작하며",
    category: "일상",
    date: "2026-09-30",
    tags: ["회고", "다짐"],
    emoji: "✍️",
    color: "#e6f7f7",
    excerpt: "배운 걸 기록하지 않으면 금방 잊어버린다. 그래서 블로그를 시작한다.",
    content: `
      <p>부트캠프 첫날. 앞으로 배우는 내용을 이 블로그에 꾸준히 기록하려고 한다.</p>

      <h2>기록하는 이유</h2>
      <ul>
        <li>내 말로 다시 정리하면 진짜 이해했는지 알 수 있다.</li>
        <li>나중에 같은 문제를 만났을 때 찾아볼 수 있다.</li>
        <li>쌓이면 그 자체로 포트폴리오가 된다.</li>
      </ul>

      <h2>규칙</h2>
      <ol>
        <li>배운 날 바로 쓴다.</li>
        <li>에러 메시지와 해결 방법은 꼭 남긴다.</li>
        <li>완벽하지 않아도 일단 올린다.</li>
      </ol>
      <blockquote>매일 1%씩만 성장해도 1년이면 37배.</blockquote>
    `
  }
];
