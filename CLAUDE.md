# Task Master AI - Claude Code Integration Guide

## Essential Commands

### Core Workflow Commands

```bash
# Project Setup
task-master init                                    # Initialize Task Master in current project
task-master parse-prd .taskmaster/docs/prd.txt      # Generate tasks from PRD document
task-master models --setup                        # Configure AI models interactively

# Daily Development Workflow
task-master list                                   # Show all tasks with status
task-master next                                   # Get next available task to work on
task-master show <id>                             # View detailed task information (e.g., task-master show 1.2)
task-master set-status --id=<id> --status=done    # Mark task complete

# Task Management
task-master add-task --prompt="description" --research        # Add new task with AI assistance
task-master expand --id=<id> --research --force              # Break task into subtasks
task-master update-task --id=<id> --prompt="changes"         # Update specific task
task-master update --from=<id> --prompt="changes"            # Update multiple tasks from ID onwards
task-master update-subtask --id=<id> --prompt="notes"        # Add implementation notes to subtask

# Analysis & Planning
task-master analyze-complexity --research          # Analyze task complexity
task-master complexity-report                      # View complexity analysis
task-master expand --all --research               # Expand all eligible tasks

# Dependencies & Organization
task-master add-dependency --id=<id> --depends-on=<id>       # Add task dependency
task-master move --from=<id> --to=<id>                       # Reorganize task hierarchy
task-master validate-dependencies                            # Check for dependency issues
task-master generate                                         # Update task markdown files (usually auto-called)
```

## Key Files & Project Structure

### Core Files

- `.taskmaster/tasks/tasks.json` - Main task data file (auto-managed)
- `.taskmaster/config.json` - AI model configuration (use `task-master models` to modify)
- `.taskmaster/docs/prd.txt` - Product Requirements Document for parsing
- `.taskmaster/tasks/*.txt` - Individual task files (auto-generated from tasks.json)
- `.env` - API keys for CLI usage

### Claude Code Integration Files

- `CLAUDE.md` - Auto-loaded context for Claude Code (this file)
- `.claude/settings.json` - Claude Code tool allowlist and preferences
- `.claude/commands/` - Custom slash commands for repeated workflows
- `.mcp.json` - MCP server configuration (project-specific)

### Directory Structure

```
project/
├── .taskmaster/
│   ├── tasks/              # Task files directory
│   │   ├── tasks.json      # Main task database
│   │   ├── task-1.md      # Individual task files
│   │   └── task-2.md
│   ├── docs/              # Documentation directory
│   │   ├── prd.txt        # Product requirements
│   ├── reports/           # Analysis reports directory
│   │   └── task-complexity-report.json
│   ├── templates/         # Template files
│   │   └── example_prd.txt  # Example PRD template
│   └── config.json        # AI models & settings
├── .claude/
│   ├── settings.json      # Claude Code configuration
│   └── commands/         # Custom slash commands
├── .env                  # API keys
├── .mcp.json            # MCP configuration
└── CLAUDE.md            # This file - auto-loaded by Claude Code
```

## Testing Best Practices in TypeScript

### Unit and Integration Testing Guidelines

- **Test Location**: Always place tests in `__TESTS__` directory
- **Best Practices for TypeScript Testing**:
  - Focus on pure functions and isolate units
  - Use descriptive, behavior-based test names
  - Mock side effects like HTTP calls or database interactions
  - Write fast, deterministic tests
  - Organize tests close to implementation code
  - Use tools like Jest, Vitest, or Mocha + Chai

### Recommended Testing Stack

- **Test Runner**: Vitest or Jest
- **Assertions**: Built-in or Chai
- **Mocking**: `vi.mock()` (Vitest), `jest.mock()`
- **API Testing**: Supertest, Mock Service Worker
- **Database Mocking**: mongodb-memory-server, SQLite in-memory

### Test Structure Example

```
src/
  user/
    service.ts
    service.test.ts      # Unit tests
    service.int.test.ts  # Integration tests
tests/
  setup/
    db.ts
    server.ts
```

### Key Testing Principles

- Write tests that describe expected behavior
- Test edge cases and error scenarios
- Keep tests independent and idempotent
- Use setup and teardown hooks for consistent test environments
- Aim for high code coverage without sacrificing test readability

## Important Reminders

- **Workflow Management**:
  - MAKE SURE TO STRICTLY USE TASKMASTER FOR TASKS AND TODO

## Task Master CLI Commands

### Additional Command Examples

- Commands for generating tasks from a PRD
  - `task-master parse-prd --input=prd.txt`

- Commands for analyzing project complexity
  - `task-master analyze-complexity`

- Workflow commands for task management
  - `task-master next` - Show the next task to work on
  - `task-master show task-001` - View a specific task
  - `task-master set-status --id=task-001 --status=in-progress` - Update task status
