---
description: Test GSD dialog modals with all question types
---

# Test GSD Dialog Modals

This workflow launches the browser-based dialog system with sample data to test all modal types.

## Steps

// turbo-all

1. Write test data to temp file:
```bash
cat > "$TEMP/gsd-test-modal.json" << 'JSONEOF'
{"title":"GSD: Test All Modal Types","questions":[{"id":"project_type","label":"Select+Desc","type":"select_with_desc","description":"This tab demonstrates the split-panel selection with markdown description preview. Click each option to see its rendered description on the right.","message":"Select a project type:","options":["Web App","API Server","CLI Tool","Mobile App"],"descriptions":["**Full-stack web application**\n\nBuilt with React frontend + Node.js backend.\n\n- Server-side rendering (SSR)\n- TypeScript throughout\n- State management with `Redux` or `Zustand`\n- Hot module replacement","**RESTful API Server**\n\nBuilt with Express.js framework.\n\n- JWT authentication & RBAC authorization\n- Database ORM with `Prisma`\n- OpenAPI/Swagger documentation\n- Rate limiting & caching","**Command-line Tool**\n\nCross-platform CLI utility.\n\n- Argument parsing with `commander`\n- Colored terminal output\n- Interactive prompts\n- Configuration file support","**React Native Mobile App**\n\nCross-platform mobile application.\n\n- iOS + Android from single codebase\n- Navigation stack with `React Navigation`\n- Native module bridges\n- Push notifications"]},{"id":"framework","label":"Single+Text","type":"select_with_text","description":"This tab demonstrates single selection with a custom text alternative. Selecting an option clears the text field, and typing in the text field deselects the option. They are mutually exclusive.","message":"Choose a framework or type your own:","options":["React","Vue","Svelte","Angular","Next.js","Nuxt"],"placeholder":"Or type a custom framework name:"},{"id":"features","label":"Multi+Text","type":"multi_select_with_text","description":"This tab demonstrates multi-selection with an additional text field for notes. You can select multiple items AND add text — they are not mutually exclusive.","message":"Select features to include:","options":["Authentication","Database ORM","REST API","GraphQL","WebSocket","Redis Cache","Unit Tests","E2E Tests","CI/CD Pipeline","Docker","Kubernetes","Monitoring"],"placeholder":"Additional requirements or notes:"},{"id":"single_choice","label":"Single","type":"single_select","description":"Simple single selection — choose exactly one option from the list.","message":"Choose your primary database:","options":["PostgreSQL","MySQL","MongoDB","SQLite","Redis","DynamoDB"]},{"id":"multi_choice","label":"Multi","type":"multi_select","description":"Simple multi-selection — click to toggle multiple options.","message":"Select target platforms:","options":["Web Browser","iOS","Android","Windows Desktop","macOS Desktop","Linux Desktop"]},{"id":"project_name","label":"Text","type":"text_input","description":"Simple text input — type freely in the text area below.","message":"Enter your project name:","placeholder":"my-awesome-project"}]}
JSONEOF
```

2. Launch the dialog in Chrome app window:
```bash
# Find dialog-server.js from installed GSD location
GSD_DIALOG=""
for dir in "$HOME/.antigravity/get-shit-done/dialog" "$HOME/.claude/get-shit-done/dialog" "$HOME/.kiro/get-shit-done/dialog"; do
  if [ -f "$dir/gsd-dialog/dialog-server.js" ]; then GSD_DIALOG="$dir/gsd-dialog/dialog-server.js"; break; fi
done
# Fallback: check repo root
if [ -z "$GSD_DIALOG" ]; then
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  for dir in "." "$SCRIPT_DIR" "$SCRIPT_DIR/.."; do
    if [ -f "$dir/dialog/gsd-dialog/dialog-server.js" ]; then GSD_DIALOG="$dir/dialog/gsd-dialog/dialog-server.js"; break; fi
  done
fi
node "$GSD_DIALOG" --data "$TEMP/gsd-test-modal.json"
```

The command will block until you interact with the dialog and click Submit or Cancel. The JSON result will be printed to stdout.

3. After the dialog closes, read the output from the command. The result is a JSON object with:
```json
{
  "cancelled": false,
  "answers": [
    { "id": "project_type", "type": "select_with_desc", "selected": "Web App", "description": "..." },
    { "id": "framework", "type": "select_with_text", "selected": null, "text": "custom text" },
    { "id": "features", "type": "multi_select_with_text", "selected": ["Auth", "DB"], "text": "notes" },
    { "id": "single_choice", "type": "single_select", "selected": "PostgreSQL" },
    { "id": "multi_choice", "type": "multi_select", "selected": ["Web", "iOS"] },
    { "id": "project_name", "type": "text_input", "value": "my-project" }
  ]
}
```
