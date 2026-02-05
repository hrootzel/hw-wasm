---
inclusion: always
---

# WSL to Windows Command Execution

The user is running Kiro CLI in WSL (Windows Subsystem for Linux), but the main build/debug environment is set up on the Windows side.

## Command Execution Rules

When executing commands that interact with the build system, development tools, or Windows-based applications:

- **Always prefix commands with cmd.exe /c** to execute them in the Windows environment
- Example: cmd.exe /c mvn clean install instead of mvn clean install
- Example: cmd.exe /c npm run build instead of npm run build

## Path Considerations

- Windows paths may need to be used instead of WSL paths for certain operations
- Be aware that file paths in WSL (/mnt/c/Users/...) differ from Windows paths (C:\Users\...)

## When to Use Windows Commands

Use cmd.exe /c for:
- Maven builds (mvn)
- Gradle builds (gradle)
- NPM/Node commands (npm, node)
- Java execution (java, javac)
- Any IDE or Windows-specific tooling
- Build scripts and automation

## When NOT to Use Windows Commands

Standard file operations and git commands can typically run directly in WSL without the prefix.