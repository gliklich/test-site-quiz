// Генерация public/data.js из корневого FAQ.md
// Запуск: node scripts/extract.js

const fs = require('fs');
const path = require('path');

function readFaqMarkdown(faqPath) {
  const raw = fs.readFileSync(faqPath, 'utf8');
  const lines = raw.split(/\r?\n/);

  /**
   * Парсим формат:
   * "N. Вопрос:" на отдельной строке, далее 1+ строк(и) ответа до следующего вопроса или EOF
   */
  const result = [];
  let current = null;

  const questionRe = /^\s*(\d+)\.\s*(.+)$/;

  for (const line of lines) {
    const qMatch = line.match(questionRe);
    if (qMatch) {
      // Завершаем предыдущий блок
      if (current) {
        const answer = current.answerLines.join('\n').trim();
        result.push({ id: current.id, question: current.question.trim(), answer });
      }
      const id = Number(qMatch[1]);
      const question = qMatch[2] || '';
      current = { id, question, answerLines: [] };
      continue;
    }

    if (current) {
      // Копим ответ (сохраняем пустые строки как разделители абзацев)
      current.answerLines.push(line);
    }
  }

  if (current) {
    const answer = current.answerLines.join('\n').trim();
    result.push({ id: current.id, question: current.question.trim(), answer });
  }

  return result;
}

function writeDataJs(dataJsPath, records) {
  const header = '/* Автогенерировано из FAQ.md — не редактируйте вручную. */\n';
  const payload = `window.FAQ_DATA = ${JSON.stringify(records, null, 2)};\n`;
  fs.writeFileSync(dataJsPath, header + payload, 'utf8');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  const repoRoot = path.resolve(__dirname, '..');
  const faqPath = path.join(repoRoot, 'FAQ.md');
  const publicDir = path.join(repoRoot, 'public');
  const dataJsPath = path.join(publicDir, 'data.js');

  if (!fs.existsSync(faqPath)) {
    console.error('Не найден FAQ.md по пути:', faqPath);
    process.exit(1);
  }

  ensureDir(publicDir);

  const records = readFaqMarkdown(faqPath);
  // Фильтруем только валидные записи
  const cleaned = records.filter(r => Number.isFinite(r.id) && r.question && r.answer);

  writeDataJs(dataJsPath, cleaned);
  console.log(`Сгенерировано ${cleaned.length} записей → ${path.relative(repoRoot, dataJsPath)}`);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error('Ошибка генерации data.js:', err);
    process.exit(1);
  }
}
