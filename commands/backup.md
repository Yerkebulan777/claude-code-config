Сохрани текущие настройки Claude Code в GitHub репозиторий.

## Что сделать

1. Перейди в директорию `C:/Users/y.zhumabayev/.claude`

2. Проверь статус git:
```bash
cd C:/Users/y.zhumabayev/.claude && git status
```

3. Добавь файлы для коммита (только нужные, .gitignore исключит секреты):
```bash
git add settings.json commands/ agents/ scripts/ memory/ .gitignore
```

4. Создай коммит с датой:
```bash
git commit -m "backup: $(date '+%Y-%m-%d %H:%M')"
```

5. Запушь:
```bash
git push origin main
```

6. Сообщи пользователю:
- Какие файлы были сохранены
- Ссылку на репозиторий
- Напомни что settings.local.json НЕ сохраняется (там могут быть токены)
