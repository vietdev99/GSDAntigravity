# BMAD → GSD: Hướng dẫn Full Workflow

> Từ Document Project → Planning → Bridge → Execution → Delivery

## Mục lục
1. [Cài đặt](#1-cài-đặt)
2. [Phase 1: Document & Analyze](#2-phase-1-document--analyze)
3. [Phase 2: Planning](#3-phase-2-planning)
4. [Phase 3: Solutioning](#4-phase-3-solutioning)
5. [Phase 4: Bridge BMAD → GSD](#5-phase-4-bridge-bmad--gsd)
6. [Phase 5: GSD Execution](#6-phase-5-gsd-execution)
7. [Sync & Maintenance](#7-sync--maintenance)
8. [Quick Flow (Shortcut)](#8-quick-flow-shortcut)
9. [Cheat Sheet](#9-cheat-sheet)

---

## 1. Cài đặt

> ⚠️ Chỉ làm 1 lần cho mỗi project

### 1.1 — Cài BMAD

```bash
# Mở CMD/Terminal, cd vào thư mục project
cd D:\Workspace\PW\ERP

# Cài BMAD
npx bmad-method install
# Chọn: BMad Method + Creative Intelligence Suite
# Chọn: Google Antigravity
```

```
# Antigravity Chat — fix visibility (bắt buộc sau khi cài BMAD)
/bmad-fix-antigravity
```

**Kiểm tra:** Gõ `/bmad` trong chat → phải thấy 60+ workflows.

### 1.2 — Cài GSD

```bash
# Cài GSD (cùng thư mục project)
npm cache clean --force && npx --yes github:vietdev99/GSDAntigravity --antigravity --local
```

**Kiểm tra:** Gõ `/gsd` trong chat → phải thấy các GSD workflows.

---

## 📊 Xem tiến độ

> **BMAD:** Mở chat mới → `/bmad-help` — AI sẽ scan `_bmad-output/` và cho biết đã hoàn thành gì, thiếu gì, nên làm bước nào tiếp theo.
>
> **GSD:** `/gsd-progress`

---

## 2. Phase 1: Document & Analyze

> 🎯 Mục tiêu: AI hiểu project + tạo product brief
> 📌 Mỗi bước = **1 chat mới**

### Bước 1.1 — Document Project (bắt buộc cho brownfield)

```
/bmad-bmm-document-project
```

- AI scan toàn bộ codebase
- Phân tích tech stack, folder structure, patterns
- **Output:** `_bmad-output/project-docs/`

### Bước 1.2 — Generate Project Context (khuyến nghị)

```
/bmad-bmm-generate-project-context
```

- Tạo rules & conventions cho AI
- **Output:** `_bmad-output/project-context.md`

### Bước 1.3 — Brainstorm (tùy chọn)

```
/bmad-brainstorming
```
hoặc thảo luận nhóm:
```
/bmad-party-mode
```

- Brainstorm ý tưởng feature mới
- Party Mode: 20+ agents thảo luận đa góc nhìn

### Bước 1.4 — Create Product Brief

```
/bmad-bmm-create-product-brief
```

- Agent Mary (Analyst) dẫn dắt
- Hỏi về target users, pain points, vision
- **Output:** `_bmad-output/product-brief.md`

### Bước 1.5 — Research (tùy chọn)

```
/bmad-bmm-domain-research        # nghiên cứu domain
/bmad-bmm-market-research         # nghiên cứu thị trường
/bmad-bmm-technical-research      # nghiên cứu công nghệ
```

---

## 3. Phase 2: Planning

> 🎯 Mục tiêu: PRD + UX Design hoàn chỉnh
> 📌 Mỗi bước = **1 chat mới**

### Bước 2.1 — Create PRD

```
/bmad-bmm-create-prd
```

- Agent John (PM) dẫn dắt
- Tạo PRD chi tiết: requirements, user journeys, success metrics
- **Output:** `_bmad-output/prd.md`

### Bước 2.2 — Validate PRD

```
/bmad-bmm-validate-prd
```

- Kiểm tra PRD có đầy đủ, nhất quán không
- Suggest improvements nếu thiếu

### Bước 2.3 — UX Design (tùy chọn)

```
/bmad-bmm-create-ux-design
```

- Agent Sally (UX Designer) tạo UX specs
- **Output:** `_bmad-output/ux-design.md`

---

## 4. Phase 3: Solutioning

> 🎯 Mục tiêu: Architecture + Epics & Stories sẵn sàng implement
> 📌 Mỗi bước = **1 chat mới**

### Bước 3.1 — Create Architecture

```
/bmad-bmm-create-architecture
```

- Agent Winston (Architect) thiết kế
- Tech stack decisions, system design, API contracts
- **Output:** `_bmad-output/architecture.md`

### Bước 3.2 — Create Epics & Stories

```
/bmad-bmm-create-epics-and-stories
```

- Tách PRD thành Epics → Stories
- Mỗi story có acceptance criteria
- **Output:** `_bmad-output/epics/`

### Bước 3.3 — Check Implementation Readiness

```
/bmad-bmm-check-implementation-readiness
```

- Kiểm tra: PRD ✓ Architecture ✓ Epics ✓ UX ✓
- Nếu thiếu → quay lại bước tương ứng

---

## 5. Phase 4: Bridge BMAD → GSD

> 🎯 Mục tiêu: Chuyển BMAD output sang GSD format
> 📌 **1 chat mới**

### Bước 4.1 — Import BMAD to GSD

```
/gsd-import-bmad
```

**Mapping:**

| BMAD Output | → | GSD Input |
|-------------|---|-----------|
| Product Brief + PRD | → | `PROJECT.md` + `REQUIREMENTS.md` |
| Architecture | → | Referenced trong `PROJECT.md` |
| Epics | → | Comment headers trong `ROADMAP.md` |
| Stories | → | Phases trong `ROADMAP.md` |

**Sau khi chạy, cấu trúc GSD:**
```
.planning/
├── PROJECT.md          ← từ PRD
├── REQUIREMENTS.md     ← từ PRD requirements
├── ROADMAP.md          ← từ Epics → Phases
├── STATE.md            ← tracking state
└── phases/
    ├── 1-user-auth/
    ├── 2-dashboard/
    └── 3-order-mgmt/
```

---

## 6. Phase 5: GSD Execution

> 🎯 Mục tiêu: Code, test, deliver
> 📌 **1 chat mới cho mỗi phase**

### Bước 5.1 — Plan Phase

```
/gsd-plan-phase 1
```

- AI nghiên cứu codebase
- Tạo `PLAN.md` chi tiết với file changes
- Review plan trước khi execute

### Bước 5.2 — Execute Phase

```
/gsd-execute-phase
```

- AI code theo plan
- Wave parallelization (nhanh hơn sequential)
- Atomic commits

### Bước 5.3 — Verify

```
/gsd-verify-work
```

- UAT testing
- Kiểm tra acceptance criteria từ story

### Bước 5.4 — Lặp lại cho phase tiếp theo

```
/gsd-plan-phase 2
/gsd-execute-phase
/gsd-verify-work
# ...tiếp tục...
```

### Bước 5.5 — Code Review (tùy chọn, giữa các phase)

```
/bmad-bmm-code-review
```

### Bước 5.6 — Retrospective (sau khi xong epic)

```
/bmad-bmm-retrospective
```

### Tiện ích GSD hữu dụng

| Lệnh | Khi nào dùng |
|-------|-------------|
| `/gsd-progress` | Xem tiến độ tổng thể |
| `/gsd-debug` | Debug issue phức tạp |
| `/gsd-pause-work` | Tạm dừng, lưu context |
| `/gsd-resume-work` | Resume session trước |
| `/gsd-add-phase` | Thêm task mới |
| `/gsd-insert-phase` | Chèn task urgent |

---

## 7. Sync & Maintenance

### BMAD thay đổi → GSD sync

| Tình huống | Lệnh |
|-----------|-------|
| Thêm stories mới | `/gsd-import-bmad` lại |
| Thay đổi lớn giữa sprint | `/bmad-bmm-correct-course` → `/gsd-import-bmad` |
| Task nhỏ ngoài BMAD | `/gsd-add-phase "tên task"` |
| Xong milestone | `/gsd-complete-milestone` |
| Sprint status | `/bmad-bmm-sprint-status` hoặc `/gsd-progress` |

---

## 8. Quick Flow (Shortcut)

> Cho task nhỏ, đã biết rõ cần làm gì — **bỏ qua Phase 1-3**

```
# Chat 1: Tạo spec nhanh
/bmad-bmm-quick-spec

# Chat 2: Implement spec
/bmad-bmm-quick-dev
```

Hoặc dùng GSD trực tiếp:
```
/gsd-quick "mô tả task"
```

---

## 9. Cheat Sheet

```
┌─────────────────────────────────────────────────┐
│  BMAD (Nghĩ & Lên kế hoạch)                    │
│                                                 │
│  /bmad-bmm-document-project      ← hiểu project│
│  /bmad-bmm-create-product-brief  ← vision       │
│  /bmad-bmm-create-prd            ← requirements │
│  /bmad-bmm-create-architecture   ← tech design  │
│  /bmad-bmm-create-epics-and-stories ← stories   │
│                     │                            │
│                     ▼                            │
│  /gsd-import-bmad               ← BRIDGE        │
│                     │                            │
│                     ▼                            │
│  GSD (Làm & Ship)                               │
│                                                 │
│  /gsd-plan-phase N               ← plan         │
│  /gsd-execute-phase              ← code         │
│  /gsd-verify-work                ← test         │
│  ... lặp lại ...                                │
└─────────────────────────────────────────────────┘

Quick:  /bmad-bmm-quick-spec → /bmad-bmm-quick-dev
Faster: /gsd-quick "task"
Help:   /bmad-help  |  /gsd-help
```
