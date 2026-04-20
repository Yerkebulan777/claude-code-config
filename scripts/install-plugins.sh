#!/bin/bash
# Установка всех плагинов Claude Code
# Запуск: bash ~/.claude/scripts/install-plugins.sh

echo "Installing Claude Code plugins..."

claude plugin install context7@claude-plugins-official
claude plugin install code-simplifier@claude-plugins-official
claude plugin install agent-sdk-dev@claude-plugins-official
claude plugin install code-review@claude-plugins-official
claude plugin install csharp-lsp@claude-plugins-official
claude plugin install github@claude-plugins-official
claude plugin install skill-creator@claude-plugins-official
claude plugin install claude-md-management@claude-plugins-official

echo "Done! All plugins installed."
