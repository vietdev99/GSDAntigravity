# BMAD Workflow Guide — Khi nào dùng gì?

> Hướng dẫn sử dụng các workflow BMAD theo ngữ cảnh thực tế.
> Mỗi workflow chạy trong **context window mới** để đảm bảo chất lượng.

---

## Mục lục

1. [Tổng quan hệ thống](#tổng-quan-hệ-thống)
2. [5 Module của BMAD](#5-module-của-bmad)
3. [Luồng chính: Dự án mới từ đầu](#luồng-chính-dự-án-mới-từ-đầu)
4. [Luồng nhanh: Việc nhỏ, fix nhanh](#luồng-nhanh-việc-nhỏ-fix-nhanh)
5. [Luồng brownfield: Dự án đã có code](#luồng-brownfield-dự-án-đã-có-code)
6. [Bridge BMAD sang GSD](#bridge-bmad-sang-gsd)
7. [GSD Execution](#gsd-execution)
8. [Ngữ cảnh cụ thể: 24 tình huống](#ngữ-cảnh-cụ-thể)
9. [Party Mode và Multi-Agent](#party-mode-và-multi-agent)
10. [Review và Quality Assurance](#review-và-quality-assurance)
11. [Tài liệu với Tech Writer](#tài-liệu-với-tech-writer)
12. [Testing với TEA Module](#testing-với-tea-module)
13. [Mở rộng BMAD với BMB Module](#mở-rộng-bmad-với-bmb-module)
14. [Anti-patterns: Những lỗi thường gặp](#anti-patterns)
15. [Decision Tree](#decision-tree)
16. [Quick Reference Card](#quick-reference-card)

---

## Tổng quan hệ thống

BMAD gồm **5 module**, **18 agents**, **66 workflows**. Mỗi workflow có:

- **Phase**: giai đoạn trong vòng đời dự án (1-analysis → 2-planning → 3-solutioning → 4-implementation, anytime)
- **Required**: bắt buộc hay tuỳ chọn — required=true PHẢI hoàn thành trước khi sang phase tiếp
- **Agent**: ai sẽ hướng dẫn bạn qua workflow đó
- **Command**: lệnh slash để gọi (vd: `/bmad-bmm-create-prd`)

### 3 Quy tắc vàng

1. Mỗi workflow chạy trong **context window riêng** (fresh session)
2. Workflow **required=true** PHẢI hoàn thành trước khi sang phase tiếp
3. Dùng LLM khác để **Validate** (cross-validation) nếu có thể

---

## 5 Module của BMAD

| Module | Tên | Mục đích | Khi nào dùng |
|--------|-----|---------|--------------|
| **BMM** | Business Management Method | Quản lý toàn bộ vòng đời dự án | Từ ý tưởng → ship code |
| **CIS** | Creative Innovation System | Sáng tạo, giải quyết vấn đề | Khi cần ý tưởng, bị kẹt, cần góc nhìn mới |
| **TEA** | Test Architecture | Chiến lược → triển khai test | Khi cần test plan, framework, automation |
| **BMB** | Building Blocks | Tạo/sửa agents, modules, workflows | Khi muốn customize BMAD |
| **Core** | Global Utilities | Brainstorm, review, utilities | Bất kỳ lúc nào |

---

## Luồng chính: Dự án mới từ đầu

Đây là luồng đầy đủ cho dự án phức tạp (medium-high complexity trở lên).

### Phase 1: Analysis — "Hiểu bài toán"

```
Brainstorm (BP) → Market Research (MR) → Domain Research (DR) → Technical Research (TR) → Create Brief (CB)
```

| Bước | Command | Agent | Bắt buộc | Mô tả |
|------|---------|-------|----------|-------|
| Brainstorm | `/bmad-brainstorming` | Mary (Analyst) | Không | Có ý tưởng mơ hồ, cần khám phá các hướng |
| Market Research | `/bmad-bmm-market-research` | Mary | Không | Hiểu đối thủ, thị trường, nhu cầu khách hàng |
| Domain Research | `/bmad-bmm-domain-research` | Mary | Không | Hiểu sâu về ngành/lĩnh vực của dự án |
| Technical Research | `/bmad-bmm-technical-research` | Mary | Không | Khảo sát công nghệ, kiến trúc, feasibility |
| Create Brief | `/bmad-bmm-create-product-brief` | Mary | Không | Tổng hợp research thành 1 product brief |

**Khi nào SKIP Phase 1:**
- Dự án nhỏ, bạn đã hiểu rõ bài toán → nhảy Phase 2
- Dự án brownfield, chỉ thêm feature → dùng Quick Flow
- Đã có brief/research từ nguồn khác

**Khi nào LÀM ĐẦY ĐỦ Phase 1:**
- Dự án hoàn toàn mới, chưa biết build gì
- Dự án phức tạp, nhiều stakeholder
- Cần thuyết phục team/boss về ý tưởng

---

### Phase 2: Planning — "Định nghĩa yêu cầu"

```
Create PRD (CP) → [Validate PRD (VP)] → [Edit PRD (EP)] → [Create UX (CU)]
```

| Bước | Command | Agent | Bắt buộc | Mô tả |
|------|---------|-------|----------|-------|
| Create PRD | `/bmad-bmm-create-prd` | John (PM) | **CÓ** | Tạo tài liệu yêu cầu sản phẩm đầy đủ |
| Validate PRD | `/bmad-bmm-validate-prd` | John | Không | Kiểm tra PRD có đủ, có logic, có thiếu gì |
| Edit PRD | `/bmad-bmm-edit-prd` | John | Không | Sửa PRD sau khi validate hoặc nhận feedback |
| Create UX | `/bmad-bmm-create-ux-design` | Sally (UX) | Không | Thiết kế UX/UI — **nên làm** nếu dự án có UI |

**Tips:**
- Validate PRD bằng LLM khác (vd: Gemini validate PRD do Claude tạo) → tránh confirmation bias
- Create UX nên làm nếu dự án có UI là thành phần chính
- Skip UX nếu là CLI tool, API-only, hoặc infrastructure

---

### Phase 3: Solutioning — "Thiết kế giải pháp"

```
Create Architecture (CA) → Create Epics & Stories (CE) → Check Implementation Readiness (IR)
```

| Bước | Command | Agent | Bắt buộc | Mô tả |
|------|---------|-------|----------|-------|
| Create Architecture | `/bmad-bmm-create-architecture` | Winston (Architect) | **CÓ** | Thiết kế kiến trúc kỹ thuật, tech stack, patterns |
| Create Epics & Stories | `/bmad-bmm-create-epics-and-stories` | John (PM) | **CÓ** | Chia PRD thành epics → stories có thể implement |
| Implementation Readiness | `/bmad-bmm-check-implementation-readiness` | Winston | **CÓ** | Kiểm tra tất cả artifacts aligned trước khi code |

**Implementation Readiness Check (IR) rất quan trọng:**
- Phát hiện gap giữa PRD và Architecture
- Phát hiện stories thiếu context hoặc conflict
- Phát hiện UX design không match với tech constraints
- Nếu fail → quay lại sửa trước khi code — tiết kiệm hàng ngày làm lại

---

### Phase 4: Implementation — "Viết code"

```
Sprint Planning (SP) → Create Story (CS) → [Validate Story (VS)] → Dev Story (DS) → [QA Test (QA)] → [Code Review (CR)] → [Verify (GSD/BMAD)] → [Retrospective (ER)]
```

| Bước | Command | Agent | Bắt buộc | Mô tả |
|------|---------|-------|----------|-------|
| Sprint Planning | `/bmad-bmm-sprint-planning` | Bob (SM) | **CÓ** | Tạo sprint plan từ epics — xác định thứ tự stories |
| Sprint Status | `/bmad-bmm-sprint-status` | Bob | Không | Xem tiến độ sprint, tìm risk |
| Create Story | `/bmad-bmm-create-story` | Bob | **CÓ** | Chuẩn bị story đầy đủ context cho dev |
| Validate Story | `/bmad-bmm-create-story` (Validate) | Bob | Không | Kiểm tra story đủ context, đủ acceptance criteria |
| Dev Story | `/bmad-bmm-dev-story` | Amelia (Dev) | **CÓ** | Agent viết code + test theo story |
| QA Automation | `/bmad-bmm-qa-generate-e2e-tests` | Quinn (QA) | Không | Tạo test tự động (E2E + API) cho code vừa implement |
| Code Review | `/bmad-bmm-code-review` | Amelia | Không | Review code — nếu issue → quay lại Dev Story |
| Verify Work | `/gsd:verify-work` | GSD Verifier | Không | Verify UAT: chạy test, kiểm tra acceptance criteria |
| Retrospective | `/bmad-bmm-retrospective` | Bob | Không | Đánh giá epic — lessons learned |

**Vòng lặp implementation (bao gồm Test & Verify):**
```
Sprint Planning
  └→ Create Story #1
       └→ (Validate Story)        ← kiểm tra story đủ context chưa
       └→ Dev Story                ← Amelia viết code + unit test
       └→ (QA Automation)         ← Quinn tạo E2E/API test cho feature vừa code
       └→ (Code Review)           ← Amelia review code
       │    ├→ Có issue → quay lại Dev Story
       │    └→ OK ↓
       └→ (Verify Work)           ← chạy test suite, kiểm tra acceptance criteria
            ├→ FAIL → quay lại Dev Story (fix) hoặc QA (sửa test)
            └→ PASS → next story
  └→ Create Story #2
       └→ ...
  └→ Hết stories trong epic
       └→ (Test Review)           ← Murat đánh giá chất lượng test (0-100)
       └→ (Retrospective)         ← Bob review: gì tốt, gì chưa
       └→ Next epic → Sprint Planning lại
```

### Luồng Test & Verify chi tiết sau mỗi Dev Story

Sau khi Dev Story hoàn thành, có 3 cấp độ kiểm tra:

**Cấp 1 — QA tạo test (tuỳ chọn nhưng khuyến nghị):**
```
/bmad-bmm-qa-generate-e2e-tests
```
Quinn (QA) phân tích code vừa viết và tạo:
- E2E tests (Playwright/Cypress) cho user flows
- API tests cho endpoints mới/sửa
- Edge case tests dựa trên acceptance criteria

**Cấp 2 — Code Review:**
```
/bmad-bmm-code-review
```
Amelia review code tìm:
- Logic bugs, security issues
- Performance concerns
- Code quality, patterns consistency

**Cấp 3 — Verify (chạy test + kiểm tra acceptance criteria):**
```
/gsd:verify-work          ← nếu dùng GSD
/bmad-bmm-sprint-status   ← nếu dùng BMAD thuần (Bob kiểm tra story done criteria)
```

Hoặc dùng TEA cho verify sâu hơn:
```
/bmad-tea-testarch-test-review   ← Murat đánh giá chất lượng test suite (0-100 scoring)
/bmad-tea-testarch-trace         ← Traceability: requirement → test → result đã cover hết chưa
```

### Khi nào dùng cấp nào?

| Tình huống | Cấp 1 (QA) | Cấp 2 (Review) | Cấp 3 (Verify) |
|------------|------------|-----------------|-----------------|
| Story nhỏ, low risk | Bỏ qua | Nên làm | Bỏ qua |
| Story trung bình | Nên làm | Nên làm | Bỏ qua |
| Story phức tạp, high risk | **Bắt buộc** | **Bắt buộc** | **Bắt buộc** |
| Story ảnh hưởng security | **Bắt buộc** | **Bắt buộc** | **Bắt buộc** |
| Cuối epic, trước ship | **Bắt buộc** | **Bắt buộc** | **Bắt buộc** + TEA |

---

## Luồng nhanh: Việc nhỏ, fix nhanh

### Quick Spec → Quick Dev

```
/bmad-bmm-quick-spec  →  /bmad-bmm-quick-dev
```

Agent: **Barry** (Quick Flow Solo Dev) — một agent làm tất cả, không cần ceremony.

**Dùng khi:**
- Thêm 1 feature nhỏ vào dự án đã có
- Fix bug không phức tạp
- Utility/script đơn giản
- Bạn thấy full flow quá nặng cho task này
- Dự án brownfield, patterns đã rõ ràng

**KHÔNG dùng khi:**
- Feature phức tạp, ảnh hưởng nhiều module
- Cần thiết kế architecture mới
- Nhiều người cùng làm

### Ví dụ cụ thể

| Tình huống | Quick Flow? | Lý do |
|------------|-------------|-------|
| "Thêm dark mode toggle" | Có | 1 component, pattern đã có |
| "Thêm export PDF cho report" | Tuỳ | Đã có lib → Quick. Cần research → Full |
| "Thêm multi-tenant support" | Không | Ảnh hưởng toàn bộ architecture |
| "Fix button không click được" | Có | Debug đơn giản |
| "Thêm AI orchestration engine" | Không | Feature core phức tạp |
| "Thêm tooltip cho 5 buttons" | Có | Repetitive, rõ ràng |
| "Refactor auth sang OAuth2" | Không | Ảnh hưởng security, nhiều endpoints |
| "Thêm loading skeleton cho 1 page" | Có | Pattern đã có sẵn |
| "Thêm real-time notifications" | Không | Cần WebSocket, new infrastructure |

---

## Luồng brownfield: Dự án đã có code

Khi có dự án đang chạy, muốn BMAD hiểu codebase trước:

### Bước 1: Document Project

```
/bmad-bmm-document-project
```

Mary (Analyst) scan codebase, tạo tài liệu tự động vào `docs/`.

### Bước 2: Generate Project Context

```
/bmad-bmm-generate-project-context
```

Mary tạo `project-context.md` tối ưu cho LLM — giúp các agent sau hiểu code nhanh.

### Bước 3: Chọn luồng tiếp

| Tình huống | Làm gì |
|------------|--------|
| Thêm feature lớn | Phase 2 (Create PRD) → full flow |
| Thêm feature nhỏ | Quick Spec → Quick Dev |
| Cần refactor | Create Architecture → plan |
| Cần fix bugs | Quick Dev |
| Cần thêm test | TEA module |
| Cần mô tả dự án cho người mới | Write Document (Tech Writer) |

---

## Bridge BMAD sang GSD

> BMAD lo planning, GSD lo execution. Đây là cách nối 2 hệ thống.

### Khi nào bridge

Sau khi BMAD Phase 3 (Solutioning) hoàn thành và Implementation Readiness **PASS**.

### Cách bridge

```
/gsd-import-bmad
```

**Mapping:**

| BMAD Output | GSD Input |
|-------------|-----------|
| Product Brief + PRD | `PROJECT.md` + `REQUIREMENTS.md` |
| Architecture | Referenced trong `PROJECT.md` |
| Epics | Section headers trong `ROADMAP.md` |
| Stories | Phases trong `ROADMAP.md` |

**Sau khi bridge:**
```
.planning/
├── PROJECT.md          ← từ PRD
├── REQUIREMENTS.md     ← từ PRD requirements
├── ROADMAP.md          ← từ Epics → Phases
├── STATE.md            ← tracking state
└── phases/
    ├── 1-xxx/
    ├── 2-yyy/
    └── 3-zzz/
```

### Khi nào KHÔNG cần bridge

- Dùng BMAD Phase 4 (Sprint Planning → Create Story → Dev Story) trực tiếp
- Dùng Quick Flow cho việc nhỏ
- Hai luồng đều dùng được — chọn 1

---

## GSD Execution

> Nếu chọn GSD để implement (thay vì BMAD Phase 4)

### Luồng cơ bản

```
/gsd:plan-phase N      ← AI nghiên cứu + tạo PLAN.md
/gsd:execute-phase     ← AI code theo plan, atomic commits
/gsd:verify-work       ← UAT testing
```

### Các lệnh GSD hữu ích

| Lệnh | Khi nào dùng |
|------|-------------|
| `/gsd:progress` | Xem tiến độ tổng thể |
| `/gsd:debug` | Debug issue phức tạp |
| `/gsd:pause-work` | Tạm dừng, lưu context |
| `/gsd:resume-work` | Resume session trước |
| `/gsd:add-phase` | Thêm phase mới vào cuối roadmap |
| `/gsd:insert-phase` | Chèn phase urgent giữa các phase |
| `/gsd:quick "mô tả"` | Làm nhanh 1 task nhỏ |
| `/gsd:add-tests` | Thêm test cho phase đã xong |

### BMAD Phase 4 vs GSD Execution: chọn cái nào?

| Tiêu chí | BMAD Phase 4 | GSD Execution |
|----------|--------------|---------------|
| Agent driven | Có (Bob, Amelia, Quinn) | Có (gsd agents) |
| Story-based | Có (Create Story → Dev Story) | Phase-based (plan → execute) |
| Code review built-in | Có (`/bmad-bmm-code-review`) | Manual hoặc dùng BMAD review |
| Atomic commits | Không tự động | Có |
| Wave parallelization | Không | Có |
| Sprint tracking | Có (Sprint Status) | Có (progress) |
| Phù hợp khi | Muốn quy trình Scrum, có QA | Muốn tốc độ, auto commits |

**Gợi ý:** Dự án lớn, nhiều người → BMAD Phase 4. Dự án 1 người, cần tốc độ → GSD.

---

## Ngữ cảnh cụ thể

### 1. "Tôi có ý tưởng nhưng chưa biết bắt đầu từ đâu"

```
/bmad-brainstorming              ← Mary hướng dẫn khám phá ý tưởng
/bmad-bmm-create-product-brief   ← Tổng hợp thành brief
```

Nếu muốn sáng tạo hơn, dùng CIS module:
```
/bmad-cis-brainstorming          ← Carson — kỹ thuật đa dạng (SCAMPER, Six Hats, v.v.)
/bmad-cis-design-thinking        ← Maya — human-centered approach
/bmad-cis-innovation-strategy    ← Victor — tìm disruption, Blue Ocean
```

---

### 2. "PRD đã xong nhưng không chắc có đủ tốt"

```
/bmad-bmm-validate-prd                ← John kiểm tra comprehensive, lean, cohesive
/bmad-review-adversarial-general      ← Review phản biện tổng quát
/bmad-editorial-review-structure      ← Kiểm tra cấu trúc tài liệu
```

**Tip:** Chạy Validate PRD bằng LLM khác để có góc nhìn độc lập.

---

### 3. "Architecture đã xong, muốn ai đó challenge"

```
/bmad-review-adversarial-general      ← Tìm điểm yếu, logic hole
/bmad-review-edge-case-hunter         ← Tìm mọi edge case chưa xử lý
/bmad-party-mode                      ← Nhiều agents tranh luận
```

---

### 4. "Đang code giữa chừng thì phát hiện PRD sai"

```
/bmad-bmm-correct-course              ← Bob đánh giá mức độ ảnh hưởng
```

Correct Course sẽ gợi ý:
- Nhỏ: sửa PRD rồi tiếp tục sprint
- Lớn: redo architecture, replan sprint
- Rất lớn: quay lại Phase 2

**ĐỪNG** tự ý code tiếp khi biết PRD sai.

---

### 5. "Sprint đang chạy, muốn biết tiến độ"

```
/bmad-bmm-sprint-status               ← Bob tóm tắt, tìm risk, gợi ý bước tiếp
```

---

### 6. "Xong 1 epic, muốn review trước khi tiếp"

```
/bmad-bmm-retrospective               ← Review: gì tốt, gì chưa, lessons learned
/bmad-bmm-code-review                 ← Amelia review code của epic
```

---

### 7. "Vừa xong Epics & Stories, cảm thấy thiếu gì đó"

```
/bmad-bmm-check-implementation-readiness   ← Đây chính là bước cần thiết tiếp theo!
```

Winston kiểm tra:
- PRD ↔ Architecture có match không
- Stories có đủ context để implement không
- UX ↔ tech constraints có conflict không
- Dependency giữa stories có logic không

---

### 8. "Muốn nhiều agent thảo luận về 1 quyết định"

```
/bmad-party-mode
```

Ví dụ: "Nên dùng GraphQL hay REST?" → PM, Architect, Developer tranh luận.

---

### 9. "Bị kẹt với 1 vấn đề kỹ thuật phức tạp"

```
/bmad-cis-problem-solving              ← Dr. Quinn — TRIZ, Theory of Constraints
```

Hoặc nếu vấn đề là business: `/bmad-cis-innovation-strategy`
Hoặc nếu vấn đề là UX/user: `/bmad-cis-design-thinking`

---

### 10. "Cần storytelling cho pitch/demo"

```
/bmad-cis-storytelling                 ← Sophia — Hero's Journey, Problem-Solution-Impact
```

---

### 11. "Cần viết tài liệu cho developer mới"

```
Load /bmad-agent-bmm-tech-writer, rồi hỏi:
"WD — Viết onboarding guide cho developer mới join dự án"
```

Paige (Tech Writer) sẽ:
- Đọc codebase
- Tạo tài liệu theo DITA best practices
- Output vào `docs/`

---

### 12. "Cần tạo diagram mô tả hệ thống"

```
Load /bmad-agent-bmm-tech-writer, rồi hỏi:
"MG — Tạo sequence diagram cho auth flow"
```

Paige tạo Mermaid diagram.

---

### 13. "Tài liệu đã viết xong, muốn review văn phong"

```
/bmad-editorial-review-prose           ← Kiểm tra clarity, tone, communication
/bmad-editorial-review-structure       ← Đề xuất cắt, sắp xếp lại, đơn giản hoá
```

---

### 14. "Tài liệu quá dài, cần chia nhỏ"

```
/bmad-shard-doc                        ← Chia file > 500 dòng thành các file nhỏ theo section
```

---

### 15. "Cần LLM hiểu nhanh các docs trong dự án"

```
/bmad-index-docs                       ← Tạo index.md lightweight cho LLM scan nhanh
```

---

### 16. "Muốn tạo test strategy trước khi code"

```
/bmad-tea-testarch-test-design         ← Murat tạo risk-based test plan
/bmad-tea-testarch-framework           ← Setup Playwright/Cypress/Jest
/bmad-tea-testarch-ci                  ← Config CI/CD pipeline
```

---

### 17. "Dev Story xong, cần test và verify trước khi chuyển story tiếp"

Đây là luồng đầy đủ sau khi Dev Story hoàn thành:

```
# Bước 1: Tạo test tự động
/bmad-bmm-qa-generate-e2e-tests                  ← Quinn tạo E2E + API tests cho feature vừa code

# Bước 2: Code review
/bmad-bmm-code-review                  ← Amelia review code, tìm bugs/security/quality issues

# Bước 3: Verify — chọn 1 trong 2 luồng:
/gsd:verify-work                       ← GSD: chạy test suite + kiểm tra acceptance criteria
# HOẶC
/bmad-bmm-sprint-status                ← BMAD: Bob kiểm tra story done criteria
```

Nếu **FAIL** ở bất kỳ bước nào → quay lại `/bmad-bmm-dev-story` để fix.
Nếu **PASS** tất cả → chuyển story tiếp (`/bmad-bmm-create-story`).

---

### 18. "Code xong feature, chỉ cần thêm test nhanh"

```
/bmad-bmm-qa-generate-e2e-tests                  ← Quinn tạo E2E + API tests
```

Hoặc dùng TEA nếu muốn coverage sâu hơn: `/bmad-tea-testarch-automate`

---

### 19. "Xong epic, muốn đánh giá chất lượng test toàn bộ"

```
/bmad-tea-testarch-test-review         ← Murat đánh giá test quality (0-100 scoring)
/bmad-tea-testarch-trace               ← Traceability matrix: requirement → test → result
/bmad-tea-testarch-nfr                 ← Đánh giá performance, security, reliability
```

Luồng này nên chạy **cuối mỗi epic** hoặc **trước khi ship**, không cần chạy sau từng story.

---

### 20. "Muốn học về testing"

```
/bmad-tea-teach-me-testing             ← Murat dạy qua 7 sessions tương tác (TEA Academy)
```

---

### 21. "Muốn kiểm tra test coverage"

```
/bmad-tea-testarch-trace               ← Murat tạo traceability matrix: requirement → test → result
```

---

### 22. "Muốn tạo agent BMAD mới cho domain riêng"

```
/bmad-bmb-create-agent                 ← Bond tạo agent mới theo chuẩn BMAD
```

Ví dụ: tạo "Security Expert" agent, "DevOps Engineer" agent.

---

### 23. "Đang làm sprint, có task 1-off không nằm trong plan"

```
/bmad-bmm-quick-dev                    ← Barry làm nhanh, không ảnh hưởng sprint
```

Hoặc: `/gsd:quick "mô tả task"`

---

### 24. "Dự án đã xong, cần báo cáo tổng kết"

```
/bmad-bmm-retrospective               ← Bob review toàn bộ: gì tốt, gì chưa, metrics
```

---

## Party Mode và Multi-Agent

```
/bmad-party-mode
```

Party Mode cho phép nhiều agents thảo luận về 1 topic. Mỗi agent giữ vai trò riêng.

### Khi nào dùng

| Tình huống | Ví dụ |
|------------|-------|
| Quyết định kỹ thuật lớn | "GraphQL vs REST cho API layer?" |
| Scope feature | "Feature X nên có những gì trong MVP?" |
| Risk assessment | "Rủi ro gì khi dùng SQLite cho multi-user?" |
| Architecture review | "Kiến trúc này có scale được không?" |
| Trade-off analysis | "Speed vs quality cho deadline gần?" |

### Các agents có thể tham gia

- John (PM) — business value, user impact
- Winston (Architect) — tech feasibility, scalability
- Amelia (Dev) — implementation effort, complexity
- Bob (SM) — timeline, sprint impact
- Sally (UX) — user experience impact
- Quinn (QA) — testability, risk
- Mary (Analyst) — market context, data

---

## Review và Quality Assurance

### Bảng tổng hợp review

| Review | Command | Dùng khi |
|--------|---------|----------|
| Adversarial Review | `/bmad-review-adversarial-general` | Muốn ai "đánh" tài liệu/code, tìm điểm yếu |
| Edge Case Hunter | `/bmad-review-edge-case-hunter` | Tìm mọi edge case, boundary condition chưa xử lý |
| Editorial - Prose | `/bmad-editorial-review-prose` | Kiểm tra văn phong, tone, clarity |
| Editorial - Structure | `/bmad-editorial-review-structure` | Đề xuất cắt/sắp xếp lại/đơn giản hoá |
| Validate PRD | `/bmad-bmm-validate-prd` | PRD comprehensive, lean, cohesive? |
| Code Review | `/bmad-bmm-code-review` | Review code sau Dev Story |
| Implementation Readiness | `/bmad-bmm-check-implementation-readiness` | Tất cả artifacts aligned trước khi code? |

### Nên review vào lúc nào?

```
Sau Create PRD        → Validate PRD + Adversarial Review
Sau Architecture      → Adversarial Review + Edge Case Hunter
Sau Epics/Stories     → Implementation Readiness Check
Sau mỗi Dev Story     → QA Automation + Code Review + Verify Work
Sau mỗi Epic          → Test Review (TEA) + Retrospective
Trước khi ship        → Edge Case Hunter + NFR Assessment + Traceability
Sau viết tài liệu    → Editorial Review (Prose + Structure)
```

---

## Tài liệu với Tech Writer

Agent **Paige** (Tech Writer) không có slash command riêng — bạn load agent rồi gọi bằng code.

### Cách sử dụng

```
Load: /bmad-agent-bmm-tech-writer
```

Sau đó gọi các lệnh:

| Code | Tên | Mô tả |
|------|-----|-------|
| WD | Write Document | Viết tài liệu chi tiết từ mô tả của bạn |
| VD | Validate Document | Kiểm tra tài liệu theo best practices |
| MG | Mermaid Generate | Tạo diagram Mermaid |
| EC | Explain Concept | Giải thích concept kỹ thuật đơn giản |
| US | Update Standards | Cập nhật documentation conventions |

### Ví dụ

```
# Sau khi load tech-writer agent:
"WD — Viết API documentation cho REST API v1"
"MG — Tạo flowchart cho user registration flow"
"EC — Giải thích CRDT conflict resolution"
"VD — Review file docs/architecture.md"
```

---

## Testing với TEA Module

Agent: **Murat** (Master Test Architect)

### Luồng test đầy đủ

```
Phase 3 (song song với Architecture):
  Test Design (TD) → Test Framework (TF) → CI Setup (CI)

Phase 4 (song song với Implementation):
  ATDD (AT) → Test Automation (TA) → Test Review (RV) → NFR Assessment (NR) → Traceability (TR)
```

### Khi nào dùng TEA

| Tình huống | Workflow | Command |
|------------|----------|---------|
| Cần test strategy | Test Design | `/bmad-tea-testarch-test-design` |
| Chưa có test framework | Test Framework | `/bmad-tea-testarch-framework` |
| Cần CI/CD pipeline | CI Setup | `/bmad-tea-testarch-ci` |
| Trước khi code (TDD) | ATDD | `/bmad-tea-testarch-atdd` |
| Sau khi code, mở rộng coverage | Test Automation | `/bmad-tea-testarch-automate` |
| Đánh giá chất lượng test | Test Review | `/bmad-tea-testarch-test-review` |
| Kiểm tra performance/security | NFR Assessment | `/bmad-tea-testarch-nfr` |
| Báo cáo coverage | Traceability | `/bmad-tea-testarch-trace` |
| Muốn học testing | Teach Me | `/bmad-tea-teach-me-testing` |

### BMM QA vs TEA: chọn cái nào?

| | BMM QA (Quinn) | TEA (Murat) |
|---|---|---|
| Scope | Tạo test cho feature vừa code | Toàn bộ test strategy |
| Khi dùng | Sau Dev Story | Từ đầu dự án |
| Output | Test files cụ thể | Test plan, framework, CI, matrix |
| Phù hợp | Quick testing | Enterprise-grade testing |

---

## Mở rộng BMAD với BMB Module

BMB cho phép bạn tạo agents, workflows, modules mới.

### Khi nào dùng BMB

| Tình huống | Workflow | Agent |
|------------|----------|-------|
| Tạo agent mới (vd: Security Expert) | `/bmad-bmb-create-agent` | Bond |
| Agent thiếu tính năng | `/bmad-bmb-edit-agent` | Bond |
| Kiểm tra agent đúng chuẩn | `/bmad-bmb-validate-agent` | Bond |
| Tạo workflow mới | `/bmad-bmb-create-workflow` | Wendy |
| Sửa workflow | `/bmad-bmb-edit-workflow` | Wendy |
| Validate workflow | `/bmad-bmb-validate-workflow` | Wendy |
| Tạo module hoàn chỉnh | `/bmad-bmb-create-module` | Morgan |
| Chuyển workflow cũ sang v6 | `/bmad-bmb-rework-workflow` | Wendy |

**Chỉ dùng khi** đã quen BMAD và muốn customize cho domain riêng.

---

## Anti-patterns

### Những lỗi thường gặp

| Lỗi | Hậu quả | Nên làm |
|-----|---------|---------|
| Skip PRD, nhảy thẳng code | Code sai hướng, làm lại | Tối thiểu Quick Spec trước khi code |
| Không Validate PRD | Requirements bị thiếu | Validate PRD + Adversarial Review |
| Không Check Implementation Readiness | Stories conflict với architecture | Luôn chạy IR trước Sprint Planning |
| Nhiều workflow trong 1 context | Context bị nhiễm, output kém | 1 workflow = 1 context window mới |
| Full Flow cho việc nhỏ | Mất thời gian | Quick Spec → Quick Dev |
| Quick Flow cho việc lớn | Thiếu planning, code lại nhiều | Full Flow từ Phase 2 |
| Tự ý code khi PRD sai | Tech debt chồng chất | Correct Course trước |
| Không Retrospective | Lặp lại lỗi cũ | Retrospective sau mỗi epic |
| Validate bằng cùng LLM tạo | Confirmation bias | Dùng LLM khác để validate |
| Skip Architecture | Stories không có tech foundation | Luôn Create Architecture |
| Không dùng Sprint Planning | Stories làm lung tung, sai thứ tự | Sprint Planning xác định dependency |

---

## Decision Tree

```
Bạn muốn làm gì?
│
├── Dự án MỚI từ đầu
│   ├── Phức tạp (multi-module, team) → Full Flow: Phase 1 → 2 → 3 → 4
│   └── Đơn giản (1 feature, 1 người) → Quick Spec → Quick Dev
│
├── Dự án ĐÃ CÓ code
│   ├── Chưa có tài liệu → /bmad-bmm-document-project trước
│   ├── Thêm feature lớn → Create PRD → full flow
│   ├── Thêm feature nhỏ → Quick Spec → Quick Dev
│   ├── Fix bugs → Quick Dev
│   └── Refactor → Create Architecture → plan
│
├── Đang GIỮA SPRINT
│   ├── Muốn biết tiến độ → /bmad-bmm-sprint-status
│   ├── PRD sai → /bmad-bmm-correct-course
│   ├── Task 1-off → /bmad-bmm-quick-dev
│   └── Xong epic → /bmad-bmm-retrospective
│
├── Cần REVIEW/QUALITY
│   ├── Review tài liệu → /bmad-review-adversarial-general
│   ├── Tìm edge cases → /bmad-review-edge-case-hunter
│   ├── Review văn phong → /bmad-editorial-review-prose
│   ├── Review code → /bmad-bmm-code-review
│   └── Kiểm tra alignment → /bmad-bmm-check-implementation-readiness
│
├── Cần SÁNG TẠO
│   ├── Brainstorm ý tưởng → /bmad-brainstorming hoặc /bmad-cis-brainstorming
│   ├── Giải quyết vấn đề → /bmad-cis-problem-solving
│   ├── UX/design thinking → /bmad-cis-design-thinking
│   ├── Business strategy → /bmad-cis-innovation-strategy
│   └── Pitch/story → /bmad-cis-storytelling
│
├── Cần TÀI LIỆU
│   ├── Viết doc → Load /bmad-agent-bmm-tech-writer → "WD ..."
│   ├── Tạo diagram → Load /bmad-agent-bmm-tech-writer → "MG ..."
│   └── Index docs → /bmad-index-docs
│
├── Cần TESTING
│   ├── Test strategy → /bmad-tea-testarch-test-design
│   ├── Setup framework → /bmad-tea-testarch-framework
│   ├── Thêm test nhanh → /bmad-bmm-qa-generate-e2e-tests
│   └── Học testing → /bmad-tea-teach-me-testing
│
├── Bị KẸT
│   ├── Không biết bước tiếp → /bmad-help
│   ├── Vấn đề kỹ thuật → /bmad-cis-problem-solving
│   ├── Cần nhiều góc nhìn → /bmad-party-mode
│   └── Vấn đề giữa sprint → /bmad-bmm-correct-course
│
└── Muốn CUSTOMIZE BMAD
    ├── Tạo agent mới → /bmad-bmb-create-agent
    ├── Tạo workflow mới → /bmad-bmb-create-workflow
    └── Tạo module mới → /bmad-bmb-create-module
```

---

## Quick Reference Card

### Lệnh hay dùng nhất

```
# === DỰ ÁN MỚI ===
/bmad-brainstorming                       # khám phá ý tưởng
/bmad-bmm-create-product-brief            # tạo brief
/bmad-bmm-create-prd                      # tạo PRD (BẮT BUỘC)
/bmad-bmm-create-ux-design                # thiết kế UX
/bmad-bmm-create-architecture             # thiết kế kiến trúc (BẮT BUỘC)
/bmad-bmm-create-epics-and-stories        # chia thành stories (BẮT BUỘC)
/bmad-bmm-check-implementation-readiness  # kiểm tra sẵn sàng (BẮT BUỘC)

# === IMPLEMENTATION (BMAD) ===
/bmad-bmm-sprint-planning                 # lập kế hoạch sprint (BẮT BUỘC)
/bmad-bmm-create-story                    # chuẩn bị story (BẮT BUỘC)
/bmad-bmm-dev-story                       # code story (BẮT BUỘC)
/bmad-bmm-code-review                     # review code

# === IMPLEMENTATION (GSD) ===
/gsd:plan-phase N                         # plan phase
/gsd:execute-phase                        # code phase
/gsd:verify-work                          # verify

# === BRIDGE ===
/gsd-import-bmad                          # chuyển BMAD output sang GSD

# === NHANH ===
/bmad-bmm-quick-spec                      # spec nhanh
/bmad-bmm-quick-dev                       # code nhanh
/gsd:quick "mô tả"                        # làm nhanh qua GSD

# === TEST & VERIFY (sau Dev Story) ===
/bmad-bmm-qa-generate-e2e-tests                    # Quinn tạo E2E + API tests
/bmad-bmm-code-review                    # Amelia review code
/gsd:verify-work                          # verify UAT + acceptance criteria
/bmad-tea-testarch-test-review            # Murat đánh giá test quality (0-100)
/bmad-tea-testarch-trace                  # traceability matrix
/bmad-tea-testarch-nfr                    # kiểm tra performance/security

# === REVIEW ===
/bmad-review-adversarial-general          # phản biện
/bmad-review-edge-case-hunter             # tìm edge cases
/bmad-bmm-validate-prd                    # validate PRD
/bmad-editorial-review-prose              # review văn phong
/bmad-editorial-review-structure          # review cấu trúc

# === SÁNG TẠO ===
/bmad-cis-brainstorming                   # brainstorm
/bmad-cis-problem-solving                 # giải quyết vấn đề
/bmad-cis-design-thinking                 # design thinking
/bmad-cis-innovation-strategy             # innovation

# === TIỆN ÍCH ===
/bmad-help                                # không biết làm gì → hỏi đây
/bmad-bmm-sprint-status                   # xem tiến độ
/bmad-bmm-correct-course                  # gặp vấn đề giữa sprint
/bmad-party-mode                          # nhiều agents thảo luận
/bmad-index-docs                          # tạo index cho docs
/bmad-shard-doc                           # chia doc lớn thành nhỏ
```

### Agents — Ai là ai?

| Agent | Module | Vai trò | Gặp ở đâu |
|-------|--------|---------|-----------|
| Mary | BMM | Analyst — research, brief, document | Phase 1, brownfield |
| John | BMM | PM — PRD, epics, stories | Phase 2-3 |
| Sally | BMM | UX Designer — wireframe, flow | Phase 2 |
| Winston | BMM | Architect — tech design, readiness | Phase 3 |
| Bob | BMM | Scrum Master — sprint, story prep | Phase 4 |
| Amelia | BMM | Developer — code, test, review | Phase 4 |
| Quinn | BMM | QA — test automation | Phase 4 |
| Barry | BMM | Quick Flow — làm nhanh | Anytime |
| Paige | BMM | Tech Writer — tài liệu, diagram | Anytime |
| Carson | CIS | Brainstorming Coach | Anytime |
| Dr. Quinn | CIS | Problem Solver | Anytime |
| Maya | CIS | Design Thinking Coach | Anytime |
| Victor | CIS | Innovation Strategist | Anytime |
| Sophia | CIS | Storyteller | Anytime |
| Murat | TEA | Test Architect | Phase 3-4 |
| Bond | BMB | Agent Builder | Anytime |
| Morgan | BMB | Module Builder | Anytime |
| Wendy | BMB | Workflow Builder | Anytime |
