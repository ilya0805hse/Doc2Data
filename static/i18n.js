// English source messages double as the fallback for untranslated diagnostics.
const russianMessages = new Map(Object.entries({
  "DocToData — Workspace": "DocToData — Рабочая область",
  "Document workspace": "Работа с документами",
  "Local workspace": "Локальная рабочая область",
  "Help": "Справка",
  "Collapse explorer panel": "Свернуть панель навигации",
  "Toggle evidence panel": "Показать или скрыть панель источников",
  "EXPLORER": "НАВИГАЦИЯ",
  "Workspace": "Рабочая область",
  "Choose workspace": "Выбрать рабочую область",
  "Create workspace": "Создать рабочую область",
  "Create a workspace": "Создайте рабочую область",
  "Sessions": "Сессии",
  "New session": "Новая сессия",
  "Documents": "Документы",
  "Add documents": "Добавить документы",
  "Shared across sessions in this workspace": "Доступны во всех сессиях этой рабочей области",
  "Add or drop documents": "Добавьте или перетащите документы",
  "PDF · DOCX · Excel · Images": "PDF · DOCX · Excel · изображения",
  "Model providers": "Провайдеры моделей",
  "Agent tools": "Инструменты агента",
  "Resize explorer panel": "Изменить ширину панели навигации",
  "Personal workspace": "Личная рабочая область",
  "Extraction instructions": "Инструкции по извлечению данных",
  "Ask your documents. Describe the data you want to extract…": "Опишите, какие данные нужно извлечь из документов…",
  "Attach documents": "Прикрепить документы",
  "Choose a model": "Выбрать модель",
  "Output mode": "Режим формирования таблицы",
  "Vibing": "Свободный",
  "Mixed": "Смешанный",
  "Strict": "Строгий",
  "Edit table": "Изменить таблицу",
  "Document processing mode": "Режим обработки документов",
  "Auto": "Авто",
  "Text only": "Только текст",
  "Manual visuals": "Ручной выбор изображений",
  "Select visuals": "Выбрать изображения",
  "Run extraction": "Запустить извлечение",
  "0 documents selected": "Документы не выбраны",
  "Local RAG": "Локальный RAG",
  "⌘ / Ctrl + Enter to send": "⌘ / Ctrl + Enter для отправки",
  "Evidence viewer": "Просмотр источников",
  "Collapse evidence panel": "Свернуть панель источников",
  "Clear evidence": "Очистить просмотр источника",
  "Every answer has a source.": "У каждого ответа есть источник",
  "Click a cell in the output table to inspect the supporting document here.": "Нажмите на ячейку в таблице результатов, чтобы увидеть фрагмент документа.",
  "Select an extracted value": "Выберите значение в таблице",
  "Review its highlighted source": "Посмотрите выделенный фрагмент",
  "Keep your conversation in view": "Продолжайте работу в той же сессии",
  "Original documents. Traceable answers.": "Оригиналы документов и ссылки на источники",
  "Resize evidence panel": "Изменить ширину панели источников",
  "Workspaces": "Рабочие области",
  "Item actions": "Действия с элементом",
  "Session actions": "Действия с сессией",
  "Close dialog": "Закрыть окно",
  "Language": "Язык интерфейса",
  "Export": "Экспорт",
  "Expand explorer panel": "Развернуть панель навигации",
  "Expand evidence panel": "Развернуть панель источников",
  "Drag to resize; use arrow keys when focused. Double-click to reset.": "Перетащите границу панели или выберите её и нажимайте клавиши со стрелками. Двойной щелчок сбрасывает ширину.",
  "{0} pixels": "{0} пкс",
  "Pinned": "Закреплено",
  "Options for {0}": "Действия с сессией «{0}»",
  "Session options": "Действия с сессией",
  "Start a session to work with your documents.": "Создайте сессию, чтобы начать работу с документами.",
  "⚠ Processing warnings": "⚠ Предупреждения при обработке",
  "Select {0}": "Выбрать «{0}»",
  "{0} · {1} KB{2}": "{0} · {1} КБ{2}",
  "Options for document {0}": "Действия с документом «{0}»",
  "Add documents to this workspace to give the agent context.": "Добавьте документы в рабочую область, чтобы агент мог с ними работать.",
  "Added": "Добавлено",
  "Provided": "Задано",
  "Not found in selected sources": "В выбранных источниках не найдено",
  "{0} · no source": "{0} · без источника",
  "View evidence ↗": "Открыть источник ↗",
  "Earlier extraction · citations are row-level. Run again to generate precise citations for each cell.": "В этом результате источники указаны для строк. Запустите извлечение снова, чтобы получить источники для каждой ячейки.",
  "{0} rows · {1} columns": "Строк: {0} · столбцов: {1}",
  "Click a value to inspect its source ↗": "Нажмите на значение, чтобы открыть его источник ↗",
  "Extraction agent": "Агент извлечения данных",
  "Your documents. A conversation.": "Работайте с документами в диалоге",
  "Ask a question, extract a table, or compare your sources.": "Задайте вопрос, извлеките данные в таблицу или сравните документы.",
  "The agent does the work. You can inspect every answer.": "Агент найдёт данные, а вы сможете проверить их по источникам.",
  "Extract the key financial metrics from the selected documents. Cite each value separately.": "Извлеки ключевые финансовые показатели из выбранных документов. Укажи источник для каждого значения.",
  "Extract financial data": "Извлечь финансовые данные",
  "Compare the selected documents and show differences in a table, with a source for each cell.": "Сравни выбранные документы и покажи различия в таблице. Укажи источник для каждой ячейки.",
  "Compare documents": "Сравнить документы",
  "Extract key parties, dates, and obligations from these contracts, with citations for each cell.": "Извлеки из этих договоров сведения о сторонах, датах и обязательствах. Укажи источник для каждой ячейки.",
  "Find contract terms": "Найти условия договоров",
  "Keep documents and sessions together in a separate workspace.": "Храните связанные документы и сессии в одной рабочей области.",
  "Workspace name": "Название рабочей области",
  "e.g. Financial reports": "Например, «Финансовые отчёты»",
  "Restore": "Восстановить",
  "No deleted workspaces.": "Удалённых рабочих областей нет.",
  "Restore a workspace with its documents and sessions.": "Восстановите рабочую область вместе с документами и сессиями.",
  "Options for workspace {0}": "Действия с рабочей областью «{0}»",
  "No workspaces yet.": "Рабочих областей пока нет.",
  "Recently deleted workspaces": "Недавно удалённые рабочие области",
  "Name": "Название",
  "Cancel": "Отмена",
  "Save name": "Сохранить название",
  "Rename": "Переименовать",
  "Delete": "Удалить",
  "Session name": "Название сессии",
  "Enter fixed values such as years or labels, and leave cells blank for the model to fill. With headers only, the model creates rows for matching records.": "Укажите фиксированные значения, например годы или метки. Оставьте пустыми ячейки, которые должна заполнить модель. Если заданы только заголовки, модель добавит строки для найденных записей.",
  "Add row": "Добавить строку",
  "Add column": "Добавить столбец",
  "Import CSV or XLSX": "Импортировать CSV или XLSX",
  "Use table": "Применить таблицу",
  "Column {0} name": "Название столбца {0}",
  "Column name": "Название столбца",
  "Remove column {0}": "Удалить столбец {0}",
  "Row {0}, column {1}": "Строка {0}, столбец {1}",
  "Fill from sources": "Заполнить из источников",
  "Remove row {0}": "Удалить строку {0}",
  "Row": "Строка",
  "Header row": "Строка заголовков",
  "Keep populated cells as fixed values": "Сохранить заполненные ячейки как фиксированные значения",
  "Replace table with import": "Заменить таблицу данными из файла",
  "Confirm sending information to cloud or remote providers": "Подтвердите отправку данных облачным или удалённым провайдерам",
  "Selected document text or images may leave this device. {0}": "Текст или изображения из выбранных документов могут быть переданы за пределы этого устройства. {0}",
  "Confirm and run": "Подтвердить и запустить",
  "Source {0}": "Источник {0}",
  "Legacy row citation. This source may support another cell in the same row.": "Источник указан для всей строки и может относиться к другой ячейке.",
  "Opening source document…": "Открываем документ…",
  "View original image": "Посмотреть оригинал изображения",
  "Indexed document view · original paragraph or spreadsheet row": "Просмотр индексированного документа · исходный абзац или строка таблицы",
  "Download {0} rows. Each CSV field includes its source in an adjacent column.": "Строк для скачивания: {0}. В CSV источники указаны в соседних столбцах.",
  "Create or choose a workspace on the left. Documents belong to that workspace and are shared with its sessions.": "Создайте или выберите рабочую область слева. Её документы доступны во всех сессиях этой области.",
  "Start a session, select documents, choose a tool-capable model, and ask for the data you need. Follow-up requests keep recent session context.": "Создайте сессию, выберите документы и модель с поддержкой инструментов, затем опишите нужные данные. Следующие запросы учитывают недавний контекст сессии.",
  "Click any populated output cell to open its evidence on the right. PDF sources show original pages and highlight matches; DOCX and Excel show the indexed paragraph or row. Older extractions retain clearly labeled row-level citations.": "Нажмите на заполненную ячейку с источником, чтобы открыть его справа. Для PDF приложение показывает исходную страницу с выделенными совпадениями. Для DOCX и Excel оно показывает индексированный абзац или строку. В старых результатах ссылки на источники отмечены для всей строки.",
  "Documents and settings are stored locally. When you start a cloud-provider run, selected source passages are sent to that provider. Scans and embedded pictures are indexed locally with OCR when Tesseract is installed. Configure an image-capable vision model to inspect charts and diagrams during extraction. Selected images and nearby text are sent to that vision provider.": "Документы и настройки хранятся локально. При запуске облачной модели выбранные фрагменты отправляются её провайдеру. Если установлен Tesseract, сканы и встроенные изображения индексируются локально с помощью OCR. Чтобы анализировать графики и диаграммы при извлечении, настройте модель с поддержкой изображений. Выбранные изображения и окружающий текст отправляются провайдеру этой модели.",
  "Search selected workspace documents with local keyword retrieval.": "Искать по ключевым словам в выбранных документах рабочей области.",
  "Read source passages with page, paragraph, and spreadsheet row locations.": "Читать фрагменты с указанием страниц, абзацев и строк таблиц.",
  "Find document images and ask the configured vision model targeted questions. Results include original-image evidence and distinguish estimates.": "Находить изображения в документах и задавать уточняющие вопросы модели с поддержкой изображений. В результатах указываются исходные изображения и отмечаются приблизительные значения.",
  "Submit a table with a validated source list for every populated cell.": "Вернуть таблицу с проверенным списком источников для каждой заполненной моделью ячейки.",
  "Green checks show completed steps. Blue circles show work in progress. Red crosses show failures or tool corrections.": "Зелёные галочки отмечают завершённые шаги, синие круги — текущие, красные крестики — ошибки и исправления.",
  "Choose a model…": "Выберите модель…",
  "+ Add new model": "+ Добавить модель",
  "Fetch models": "Загрузить список моделей",
  "Use the base URL for your Qwen workspace and region.": "Укажите базовый URL для вашей рабочей области и региона Qwen.",
  "Remove stored API key": "Удалить сохранённый ключ API",
  "Choose a provider or add your own connection.": "Выберите провайдера или добавьте собственное подключение.",
  "Providers": "Провайдеры",
  "+ Add custom provider": "+ Добавить провайдера",
  "Provider name": "Название провайдера",
  "API format": "Формат API",
  "API base URL": "Базовый URL API",
  "API key {0}": "Ключ API {0}",
  "OCR and visual understanding": "OCR и анализ изображений",
  "Read scanned text locally with OCR": "Распознавать текст на сканах локально с помощью OCR",
  "OCR languages": "Языки OCR",
  "Checking local OCR…": "Проверяем локальный OCR…",
  "Installed OCR languages": "Установленные языки OCR",
  "Vision provider": "Провайдер модели для изображений",
  "Disabled": "Отключено",
  "The vision model is independent of your extraction model and uses the selected provider’s connection and key. Images and nearby text are sent only during extraction. OCR language changes apply to new uploads; re-upload older files to index their visuals.": "Модель для изображений работает отдельно от модели извлечения и использует подключение и ключ своего провайдера. Изображения и окружающий текст отправляются только при извлечении. Изменения языков OCR применяются к новым загрузкам. Чтобы заново проиндексировать изображения в старых файлах, загрузите их повторно.",
  "Sessions, documents, and provider settings are saved on this PC. API keys are stored in the local database and are never returned to the browser. Selected source passages are sent to your chosen provider during extraction.": "Сессии, документы и настройки провайдеров сохраняются на этом компьютере. Ключи API хранятся в локальной базе данных и не передаются в браузер. При извлечении выбранные фрагменты отправляются указанному провайдеру.",
  "Save and use provider": "Сохранить и выбрать провайдера",
  "Loading original PDF page…": "Загружаем исходную страницу PDF…",
  "Attach the original PDF once": "Прикрепите оригинал PDF",
  "This document was uploaded before original files were saved. Attach the same PDF to view its actual pages with source highlights. Your existing extraction and references will be kept.": "Этот документ был загружен, когда приложение ещё не сохраняло оригиналы. Прикрепите тот же PDF, чтобы открыть исходные страницы с выделенными фрагментами. Сохранённые результаты и ссылки на источники будут доступны.",
  "Attach original PDF": "Прикрепить оригинал PDF",
  "Go to cited page": "К странице источника",
  "Previous page": "Предыдущая страница",
  "Page {0} of {1}": "Страница {0} из {1}",
  "Next page": "Следующая страница",
  "Zoom out": "Уменьшить масштаб",
  "Zoom in": "Увеличить масштаб",
  "Open PDF ↗": "Открыть PDF ↗",
  "Original PDF page {0}": "Страница {0} исходного PDF",
  "Source text": "Текст источника",
  "Unable to open PDF": "Не удалось открыть PDF",
  "Opening visual evidence…": "Открываем изображение источника…",
  "Review selection": "Просмотреть выбранный фрагмент",
  "Remove {0}": "Убрать «{0}»",
  "Scroll to browse. Select whole pages or use Select region to draw around a chart. Include titles, legends, and units.": "Прокрутите документ. Выбирайте целые страницы или нажмите «Выделить область» и обведите нужный график вместе с заголовком, легендой и единицами измерения.",
  "Selection tool": "Инструмент выбора",
  "Scroll": "Прокрутка",
  "Select region": "Выделить область",
  "Page": "Страница",
  "Jump to page": "Перейти к странице",
  "Scrollable document preview": "Прокручиваемый предпросмотр документа",
  "Selected visuals": "Выбранные изображения",
  "Done": "Готово",
  "Remove selection {0}": "Убрать выбранный фрагмент {0}",
  "Preview loads as you scroll": "Предпросмотр загружается при прокрутке",
  "Request failed": "Не удалось выполнить запрос",
  "Failed to fetch": "Не удалось связаться с сервером.",
  "NetworkError when attempting to fetch resource.": "Не удалось связаться с сервером.",
  "Load failed": "Не удалось связаться с сервером.",
  "{0} pages": "Страниц: {0}",
  "{0} passages": "Фрагментов: {0}",
  "Stop extraction": "Остановить извлечение",
  "{0} of {1} documents selected": "Выбрано документов: {0} из {1}",
  "Elapsed time": "Прошедшее время",
  "Run duration": "Время выполнения",
  "Agent is working": "Агент работает",
  "Run failed": "Не удалось завершить извлечение",
  "{0} steps completed": "Выполнено шагов: {0}",
  "Run ended": "Извлечение остановлено",
  "View cell evidence": "Открыть источник для ячейки",
  "View legacy row evidence": "Открыть источник для строки",
  "Table": "Таблица",
  "Sources": "Источники",
  "This extraction could not finish.": "Не удалось завершить извлечение.",
  "Connection interrupted. Retrying session status…": "Связь прервалась. Повторно проверяем состояние сессии…",
  "Rename workspace": "Переименовать рабочую область",
  "Rename document": "Переименовать документ",
  "Unpin": "Открепить",
  "Pin": "Закрепить",
  "Workspace actions": "Действия с рабочей областью",
  "Document actions": "Действия с документом",
  "Rename session": "Переименовать сессию",
  "{0}: maximum size is 25 MB.": "{0}: максимальный размер — 25 МБ.",
  "Uploading {0}…": "Загружаем «{0}»…",
  "{0} added with processing warnings. Open its preview to review them.": "Файл «{0}» добавлен с предупреждениями. Откройте предпросмотр, чтобы прочитать их.",
  "{0} added to the workspace.": "Файл «{0}» добавлен в рабочую область.",
  "Document removed from this workspace. Saved evidence is retained.": "Документ удалён из рабочей области. Сохранённые ссылки на источники доступны.",
  "Edit output table": "Изменить таблицу результатов",
  "The result uses these exact columns and any rows you add.": "Результат будет содержать заданные столбцы и добавленные вами строки.",
  "The result starts with this table and may append relevant rows or columns.": "Модель использует эту таблицу как основу и при необходимости добавляет строки или столбцы.",
  "Choose a file up to 2 MB.": "Выберите файл размером до 2 МБ.",
  "Reading table…": "Читаем таблицу…",
  " · First worksheet": " · Первый лист",
  "Could not read the table.": "Не удалось прочитать таблицу.",
  "Enter a name for every column.": "Укажите название каждого столбца.",
  "Use a different name for every column.": "Названия столбцов должны различаться.",
  "Fill the output table from the selected documents.": "Заполни таблицу данными из выбранных документов.",
  "Text": "Текст",
  "Vision": "Изображения",
  "Confirm that the selected documents, your request, and your output table contain no sensitive or confidential information.": "Подтвердите, что выбранные документы, запрос и таблица не содержат чувствительных или конфиденциальных данных.",
  "Confirm that the selected documents and your request contain no sensitive or confidential information.": "Подтвердите, что выбранные документы и запрос не содержат чувствительных или конфиденциальных данных.",
  "Describe what you want to extract.": "Опишите, какие данные нужно извлечь.",
  "Add and select documents in the left panel first.": "Сначала добавьте и выберите документы в левой панели.",
  "Starting extraction": "Запуск извлечения",
  "Retrieving selected source passages…": "Ищем фрагменты в выбранных документах…",
  "Stopping after the current provider request returns…": "Извлечение остановится после ответа на текущий запрос к провайдеру…",
  "No source available for this cell.": "Для этой ячейки нет источника.",
  "Source passage": "Фрагмент источника",
  " · row {0}": " · строка {0}",
  "Document image preview": "Просмотр изображения из документа",
  "Document preview": "Предпросмотр документа",
  "Export extraction": "Экспорт результатов",
  " · sources": " · источники",
  " (legacy row citation)": " (источник для всей строки)",
  "Your document workspace": "Работа с документами",
  "Could not load workspace: {0}": "Не удалось загрузить рабочую область: {0}",
  "New custom provider": "Новый провайдер",
  "Active · ": "Выбран · ",
  "Local model": "Локальная модель",
  "Cloud / custom API": "Облачная модель / собственный API",
  "OpenAI compatible": "Совместимый с OpenAI",
  "· saved": "· сохранён",
  "Leave blank to keep saved key": "Оставьте пустым, чтобы сохранить текущий ключ",
  "Optional for servers without authentication": "Необязательно для серверов без аутентификации",
  "Available models": "Доступные модели",
  "Vision model": "Модель для изображений",
  "Provider saved on this PC.": "Настройки провайдера сохранены на этом компьютере.",
  "Enter an image-capable model name": "Введите название модели с поддержкой изображений",
  "Enter a tool-capable model name": "Введите название модели с поддержкой инструментов",
  "Loading models…": "Загружаем список моделей…",
  "Connection changed. Fetch models again.": "Подключение изменилось. Загрузите список моделей снова.",
  "{0} models found.": "Найдено моделей: {0}.",
  "No models returned. You can add a model manually.": "Провайдер не вернул список моделей. Модель можно добавить вручную.",
  "Maximum PDF size is 25 MB.": "Максимальный размер PDF — 25 МБ.",
  "Checking original…": "Проверяем оригинал…",
  "Boxes mark exact extracted values found inside the cited passage.": "Рамками отмечены точные совпадения с извлечёнными значениями.",
  "Boxes mark the supporting source passage; an exact extracted value could not be located.": "Точного совпадения нет, поэтому рамкой отмечен фрагмент источника.",
  "Browsing the original document. Return to the cited page to see source highlights.": "Вы просматриваете исходный документ. Чтобы увидеть выделенные фрагменты, вернитесь на страницу источника.",
  "No reliable text coordinates found. The original page is shown without a highlight.": "Не удалось определить положение текста. Страница показана без выделения.",
  "Matched extracted value": "Совпадение с извлечённым значением",
  "Supporting source passage": "Подтверждающий фрагмент источника",
  "OCR transcription · boxes mark recognized words": "Распознавание OCR · рамками отмечены распознанные слова",
  "Visual interpretation · review the image; estimated values are approximate": "Анализ изображения · проверьте приблизительные значения по оригиналу",
  "Original visual source · use extraction to inspect this image": "Исходное изображение · запустите извлечение для анализа",
  " · Region": " · Область",
  "Select documents first.": "Сначала выберите документы.",
  "These documents have no visual sources. Older uploads may need to be uploaded again.": "В этих документах нет доступных изображений. Файлы, добавленные ранее, может потребоваться загрузить повторно.",
  "Select pages or regions": "Выбрать страницы или области",
  "{0} of 30 selections · selections are saved as you go": "Выбрано: {0} из 30 · изменения сохраняются автоматически",
  "Select at most 30 pages or regions per request.": "За один запрос можно выбрать до 30 страниц или областей.",
  "Retry": "Повторить",
  "of {0}": "из {0}",
  "Select whole page": "Выбрать всю страницу",
  "Select whole image": "Выбрать всё изображение",
  "running": "Выполняется",
  "complete": "Завершено",
  "error": "Ошибка",
  "{0}h {1}m {2}s": "{0} ч {1} мин {2} с",
  "{0}m {1}s": "{0} мин {1} с",
  "{0}s": "{0} с",
  "The extraction reached its 10-minute limit. Try a narrower request or a faster model.": "Превышен лимит времени на извлечение (10 минут). Уточните запрос или выберите более быструю модель.",
  "The expanded document exceeds 100 MB.": "Размер распакованного документа превышает 100 МБ.",
  "Workbook exceeds 30,000 populated rows.": "В книге больше 30 000 заполненных строк.",
  "Supported formats: PDF, DOCX, XLSX, XLS, CSV, TXT, PNG, JPEG.": "Поддерживаемые форматы: PDF, DOCX, XLSX, XLS, CSV, TXT, PNG, JPEG.",
  "No readable text found. Scanned PDFs need OCR before uploading.": "Не найдено читаемого текста. Перед загрузкой отсканированного PDF распознайте текст с помощью OCR.",
  "Add your Claude API key in provider settings.": "Добавьте ключ API для Claude в настройках провайдера.",
  "Visual source not found.": "Изображение источника не найдено.",
  "Original document is unavailable. Upload it again.": "Оригинал документа недоступен. Загрузите его снова.",
  "Unknown processing mode.": "Неизвестный режим обработки.",
  "Select at most 30 visual pages or regions per request.": "За один запрос можно выбрать до 30 страниц или областей.",
  "Select pages or regions for manual visual inspection.": "Выберите страницы или области для ручного анализа.",
  "Visual selection must belong to a selected document.": "Страница или область должна принадлежать выбранному документу.",
  "Invalid visual region.": "Недопустимая область изображения.",
  "Invalid visual coordinates.": "Недопустимые координаты области.",
  "Visual region is outside the image.": "Область выходит за границы изображения.",
  "Provide a visual question between 1 and 4,000 characters.": "Введите вопрос об изображении длиной от 1 до 4 000 символов.",
  "Configure a vision provider and image-capable model in Model providers first.": "Сначала выберите провайдера и модель с поддержкой изображений в разделе «Провайдеры моделей».",
  "Vision returned an invalid or oversized response. Try a narrower question.": "Модель вернула некорректный или слишком длинный ответ. Задайте более конкретный вопрос.",
  "Vision did not return valid structured observations. Try again or choose another image-capable model.": "Модель вернула данные об изображении в неверном формате. Повторите запрос или выберите другую модель с поддержкой изображений.",
  "Upload and select at least one document first.": "Сначала загрузите и выберите хотя бы один документ.",
  "Run stopped by you.": "Вы остановили извлечение.",
  "Document not selected.": "Документ не выбран.",
  "Visual discovery is disabled in this mode.": "Поиск изображений отключён в этом режиме.",
  "Additional visual inspection is disabled in this mode.": "В этом режиме нельзя анализировать дополнительные изображения.",
  "Visual inspection limit reached (30 per run). Narrow the request.": "Достигнут лимит анализа изображений (30 за один запуск). Уточните запрос.",
  "Unknown tool.": "Неизвестный инструмент.",
  "Run not found": "Извлечение не найдено",
  "Original PDF is not available.": "Оригинал PDF недоступен.",
  "Use an HTTP or HTTPS server URL.": "Укажите URL сервера с протоколом HTTP или HTTPS.",
  "Not found": "Не найдено",
  "Cross-origin request rejected": "Запрос из другого источника отклонён",
  "JSON required": "Требуется JSON",
  "Upload limit is 25 MB per document.": "Максимальный размер одного документа — 25 МБ.",
  "Could not read the table file. Check the file format and contents.": "Не удалось прочитать таблицу. Проверьте формат и содержимое файла.",
  "Enter a workspace name.": "Введите название рабочей области.",
  "Stop active extractions in this workspace first.": "Сначала остановите запущенные извлечения в этой рабочей области.",
  "Enter a session title.": "Введите название сессии.",
  "Stop this session’s extraction first.": "Сначала остановите извлечение в этой сессии.",
  "PDF document not found.": "Документ PDF не найден.",
  "Source passage not found.": "Фрагмент источника не найден.",
  "Unlock this PDF before uploading it.": "Снимите защиту с PDF перед загрузкой.",
  "Upload limit is 25 MB.": "Максимальный размер файла — 25 МБ.",
  "This PDF does not match the indexed document. Choose the original file used for this extraction.": "Этот PDF отличается от индексированного документа. Выберите исходный файл, который использовался для извлечения.",
  "Two documents are already processing. Wait for one to finish.": "Два документа уже обрабатываются. Дождитесь завершения одного из них.",
  "Describe the data to extract.": "Опишите данные, которые нужно извлечь.",
  "This session already has a running extraction.": "В этой сессии уже запущено извлечение.",
  "Configure a vision provider in Model providers before manual inspection.": "Для ручного анализа выберите провайдера модели для изображений в разделе «Провайдеры моделей».",
  "Confirm sending document information to remote providers.": "Подтвердите отправку данных удалённым провайдерам.",
  "Workspace not found.": "Рабочая область не найдена.",
  "Session not found.": "Сессия не найдена.",
  "Select at least one document.": "Выберите хотя бы один документ.",
  "All selected documents must belong to this workspace.": "Все выбранные документы должны принадлежать этой рабочей области.",
  "Columns must be a nonempty list of strings.": "Укажите хотя бы один столбец. Названия должны быть строками.",
  "Rows must be a list.": "Строки таблицы должны быть переданы списком.",
  "Each row must be an object.": "Каждая строка таблицы должна быть объектом.",
  "Each row must match the columns.": "Количество значений в строке должно совпадать с количеством столбцов.",
  "Cell values must be scalar values or null.": "В ячейках допустимы только скалярные значения или null.",
  "Provide one cell_references array for each cell, in column order.": "Укажите массив cell_references для каждой ячейки в порядке столбцов.",
  "Cell citations must refer to passages you have read.": "Ссылки в ячейках должны указывать на прочитанные фрагменты.",
  "Every non-null cell must cite its own supporting source references.": "Для каждой ячейки со значением укажите подтверждающие источники.",
  "The server restarted before this run finished.": "Сервер перезапустился до завершения извлечения.",
  "Pinned must be true or false.": "Для pinned допустимы только true и false.",
  "Document not found in this workspace.": "Документ не найден в этой рабочей области.",
  "Unknown item type.": "Неизвестный тип элемента.",
  "Enter a name.": "Введите название.",
  "Unknown action.": "Неизвестное действие.",
  "Unknown provider.": "Неизвестный провайдер.",
  "Provider fields must be text.": "Поля провайдера должны содержать текст.",
  "API key must be text.": "Ключ API должен быть текстом.",
  "Unknown API format.": "Неизвестный формат API.",
  "Provider name and model are required.": "Укажите название провайдера и модель.",
  "Use an http:// or https:// base URL without credentials, query, or fragment.": "Укажите базовый URL с http:// или https:// без учётных данных, параметров запроса и фрагмента.",
  "OCR enabled must be true or false.": "Для параметра включения OCR допустимы только true и false.",
  "Use OCR language codes separated by +, for example eng+rus.": "Укажите коды языков OCR через +, например eng+rus.",
  "Unknown vision provider.": "Неизвестный провайдер модели для изображений.",
  "Vision model must be text.": "Название модели для изображений должно быть текстом.",
  "Enter an image-capable vision model name.": "Введите название модели с поддержкой изображений.",
  "Enter an API key again to fetch models from a changed base URL.": "Чтобы загрузить список моделей после смены базового URL, введите ключ API заново.",
  "The provider returned an invalid model list.": "Провайдер вернул некорректный список моделей.",
  "The provider returned an invalid model-list page.": "Провайдер вернул некорректную страницу списка моделей.",
  "The provider model list is too large. Enter a model name manually.": "Список моделей провайдера слишком велик. Введите название модели вручную.",
  "Cannot fetch models: check your API key and account access.": "Не удалось загрузить список моделей. Проверьте ключ API и права доступа.",
  "This endpoint does not support model discovery. Check the base URL or enter a model manually.": "По этому адресу нельзя получить список моделей. Проверьте базовый URL или введите модель вручную.",
  "Cannot reach the provider. Check the base URL and connection, or enter a model manually.": "Не удалось подключиться к провайдеру. Проверьте базовый URL и подключение или введите модель вручную.",
  "The provider returned an invalid model list. Enter a model manually.": "Провайдер вернул некорректный список моделей. Введите модель вручную.",
  "Tesseract is not installed. Install Tesseract and language packs, then restart the server.": "Установите Tesseract и языковые пакеты, затем перезапустите сервер.",
  "Local Tesseract OCR is ready.": "Локальный OCR через Tesseract готов к работе.",
  "Tesseract could not start. Check its installation and language packs.": "Не удалось запустить Tesseract. Проверьте установку и языковые пакеты.",
  "OCR languages must be language codes separated by + (for example eng+rus).": "Укажите коды языков OCR через +, например eng+rus.",
  "OCR timed out on this image (90 seconds).": "Превышено время OCR для этого изображения (90 секунд).",
  "OCR failed. Check Tesseract and the selected language packs.": "Ошибка OCR. Проверьте установку Tesseract и выбранные языковые пакеты.",
  "OCR is disabled in document settings.": "OCR отключён в настройках обработки документов.",
  "OCR found no text; visual inspection is available.": "OCR не нашёл текст. Изображение можно проанализировать отдельно.",
  "unsupported embedded image; export this DOCX as PDF to inspect it.": "формат встроенного изображения не поддерживается. Для просмотра экспортируйте DOCX в PDF.",
  "An externally linked image was not fetched. Embed it in the DOCX first.": "Внешнее изображение по ссылке не загружено. Сначала вставьте его в DOCX.",
  "Native Word charts/SmartArt may not include a readable preview. Export as PDF to inspect their complete appearance.": "Диаграммы Word и SmartArt могут не иметь доступного предпросмотра. Экспортируйте документ в PDF, чтобы увидеть их целиком.",
  "No readable content found. For unsupported Word drawings, export as PDF.": "Не найдено читаемого содержимого. Если рисунки Word не поддерживаются, экспортируйте документ в PDF.",
  "Page is outside this PDF.": "В PDF нет такой страницы.",
  "Image exceeds 25 megapixels.": "Размер изображения превышает 25 мегапикселей.",
  "Image has no color space.": "У изображения отсутствует цветовое пространство.",
  "Unknown output mode.": "Неизвестный режим формирования таблицы.",
  "Set up an output table first.": "Сначала настройте таблицу результатов.",
  "Each template row must match the columns.": "Количество ячеек в каждой строке шаблона должно совпадать с количеством столбцов.",
  "Keep the template column names and order exactly as provided.": "Сохраните названия и порядок столбцов шаблона.",
  "Strict mode allows only the template columns.": "В строгом режиме разрешены только столбцы шаблона.",
  "Every output column needs a name.": "Укажите название каждого столбца результата.",
  "Every output column needs a distinct name.": "Названия столбцов результата должны различаться.",
  "Keep all predefined template rows in their original order.": "Сохраните исходный порядок заданных строк шаблона.",
  "Strict mode requires exactly the predefined template rows.": "В строгом режиме разрешены только заданные строки шаблона.",
  "Table imports are limited to 2 MB.": "Таблица для импорта должна быть размером до 2 МБ.",
  "Choose a CSV or XLSX file.": "Выберите файл CSV или XLSX.",
  "The expanded workbook exceeds 20 MB.": "Размер распакованной книги превышает 20 МБ.",
  "The workbook has no worksheets.": "В книге нет листов.",
  "The file does not contain a table.": "В файле нет таблицы.",
  "Processing mode": "Режим обработки",
  "Auto · OCR and model-directed visual inspection": "Авто · OCR и анализ изображений по запросу модели",
  "Text only · native text and OCR; no visual interpretations": "Только текст · исходный текст и OCR",
  "Inspecting selected visual": "Анализ выбранного изображения",
  "Retrieved source passages": "Фрагменты источников найдены",
  "Agent working": "Агент выполняет запрос",
  "Searched documents": "Поиск по документам",
  "Read source document": "Чтение документа",
  "Inspecting visual source": "Анализ изображения источника",
  "Visual evidence ready": "Изображение источника проанализировано",
  "Extraction complete": "Извлечение завершено",
  "Tool needs correction": "Ошибка инструмента",
  "Queued for local processing": "В очереди на локальную обработку",
  "Extracting native text and locating visual sources": "Извлекаем исходный текст и ищем изображения",
  "Visual source available for inspection. ": "Изображение доступно для анализа. "
}));

const languagePreference = 'doctodata:language';

function savedLanguage() {
    try { return localStorage.getItem(languagePreference) === 'en' ? 'en' : 'ru'; }
    catch { return 'ru'; }
}

let language = savedLanguage();

function t(message, ...values) {
    const translation = language === 'ru' ? russianMessages.get(message) ?? message : message;
    return values.length ? translation.replace(/\{(\d+)\}/g, (match, index) => values[index] ?? match) : translation;
}

// Only bind the original HTML. Dynamic content is translated where it is rendered.
const staticTranslations = [];
{
    const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        const node = walker.currentNode, original = node.nodeValue, key = original.trim();
        if (russianMessages.has(key)) {
            staticTranslations.push(() => { node.nodeValue = original.replace(key, () => t(key)); });
        }
    }
    for (const element of document.querySelectorAll('[aria-label], [title], [placeholder]')) {
        for (const attribute of ['aria-label', 'title', 'placeholder']) {
            const key = element.getAttribute(attribute);
            if (russianMessages.has(key)) {
                staticTranslations.push(() => element.setAttribute(attribute, t(key)));
            }
        }
    }
}

function applyLanguage() {
    document.documentElement.lang = language;
    document.querySelector('#language-select').value = language;
    staticTranslations.forEach(translate => translate());
}

document.querySelector('#language-select').onchange = event => {
    language = event.target.value === 'en' ? 'en' : 'ru';
    try { localStorage.setItem(languagePreference, language); } catch {}
    applyLanguage();
    document.dispatchEvent(new Event('app-language-change'));
};

applyLanguage();

function sourceLocation(location) {
    if (language !== 'ru' || !location) return location;
    const worksheet = location.match(/^(.*) · row (\d+)$/);
    if (worksheet) return worksheet[1] + ' · строка ' + worksheet[2];
    const parts = location.split(' · ');
    const labels = {Page: 'Страница', Paragraph: 'Абзац', Image: 'Изображение'};
    return parts.map((part, index) => {
        // Preserve Excel sheet names and DOCX part names.
        if (index === 0 && /^Paragraph \d+$/.test(parts[1] || '')) return part;
        if (part === 'Text') return 'Текст';
        if (part === 'selected region') return 'выбранная область';
        if (part === 'visual interpretation') return 'анализ изображения';
        return part.replace(/^(Page|Paragraph|Image) (\d+)$/, (_, label, number) =>
            labels[label] + ' ' + number
        ).replace(/^Table (\d+), row (\d+)$/, 'Таблица $1, строка $2');
    }).join(' · ');
}

const diagnosticPatterns = [
    [/^(.+) returned HTTP (\d+)\. Check your model, API key, and account access\.$/, '$1 вернул HTTP $2. Проверьте модель, ключ API и права доступа.'],
    [/^Cannot connect to (.+)\. Check that the provider is running and reachable\.$/, 'Не удалось подключиться к $1. Проверьте, что провайдер запущен и доступен.'],
    [/^(.+) must be a positive number of seconds\.$/, '$1 должен содержать положительное число секунд.'],
    [/^Cannot fetch models \(HTTP (\d+)\)\. Try again or enter a model manually\.$/, 'Не удалось загрузить список моделей (HTTP $1). Повторите попытку или введите модель вручную.'],
    [/^Document exceeds (\d+) visual sources\.$/, 'В документе больше $1 изображений.'],
    [/^PDF exceeds (\d+) pages\. Split it into smaller files\.$/, 'В PDF больше $1 страниц. Разделите его на несколько файлов.'],
    [/^The extraction reached its (\d+)-iteration limit\. Install and select a stronger tool-capable model, such as qwen2\.5:7b \(ollama pull qwen2\.5:7b\), or try a narrower request\.$/, 'Достигнут лимит итераций извлечения ($1). Уточните запрос или выберите более мощную модель с поддержкой инструментов, например qwen2.5:7b (ollama pull qwen2.5:7b).'],
    [/^Enter between 1 and (\d+) column headers\.$/, 'Укажите от 1 до $1 заголовков столбцов.'],
    [/^Enter a name of up to (\d+) characters for every column\.$/, 'Укажите названия столбцов длиной до $1 символов.'],
    [/^Use up to (\d+) predefined rows\.$/, 'Число заранее заданных строк не должно превышать $1.'],
    [/^Fixed cells must contain text up to (\d+) characters\.$/, 'Фиксированные значения должны быть текстом длиной до $1 символов.'],
    [/^Import up to (\d+) rows and (\d+) columns\.$/, 'Ограничение импорта: до $1 строк и $2 столбцов.'],
    [/^Imported cells may contain up to (\d+) characters\.$/, 'В импортируемой ячейке может быть до $1 символов.'],
    [/^Copy the fixed template value at row (\d+), column (\d+) exactly and use an empty citation list\.$/, 'Скопируйте фиксированное значение из строки $1, столбца $2 без изменений и оставьте список источников пустым.'],
    [/^Missing OCR language packs: (.+)$/, 'Отсутствуют языковые пакеты OCR: $1'],
];

function diagnosticText(message) {
    if (language !== 'ru' || !message) return message;
    if (russianMessages.has(message)) return t(message);
    for (const [pattern, replacement] of diagnosticPatterns) {
        if (pattern.test(message)) return message.replace(pattern, replacement);
    }
    return message;
}

function processingWarning(message) {
    const separator = message.indexOf(': ');
    if (separator < 0 || language !== 'ru') return diagnosticText(message);
    const location = message.slice(0, separator);
    const detail = message.slice(separator + 2);
    const translated = diagnosticText(detail);
    return translated === detail ? diagnosticText(message) : sourceLocation(location) + ': ' + translated;
}

function uploadProgress(detail) {
    if (language !== 'ru') return detail;
    return t(detail)
        .replace(/^Reading Page (\d+) of (\d+)$/, 'Читаем страницу $1 из $2')
        .replace(/^Reading (.+)$/, (_, location) => 'Читаем: ' + sourceLocation(location))
        .replace(/^OCR · (.+)$/, (_, location) => 'OCR · ' + sourceLocation(location))
        .replace(/^(\d+) passages · (\d+) visual sources$/, 'Фрагментов: $1 · изображений: $2');
}

function activityDetail({title, detail}) {
    if (language !== 'ru') return detail;
    switch (title) {
        case 'Processing mode':
            return t(detail).replace(/^Manual visuals · (\d+) selected pages or regions$/, 'Ручной выбор изображений · выбрано страниц или областей: $1');
        case 'Agent working':
            return detail.replace(/^Iteration (\d+) · /, 'Итерация $1 · ');
        case 'Retrieved source passages':
            return detail.replace(/^(\d+) passages across (\d+) selected documents · local lexical RAG$/, 'Фрагментов: $1 · документов: $2 · локальный лексический RAG');
        case 'Read source document':
            return detail.replace(/ · chunks (\d+–\d+)$/, ' · фрагменты $1');
        case 'Extraction complete':
            return detail.replace(/^(\d+) rows · (\d+) source references$/, 'Строк: $1 · ссылок на источники: $2');
        case 'Visual evidence ready':
            return sourceLocation(detail);
        case 'Tool needs correction':
        case 'Run ended':
            return diagnosticText(detail);
        case 'Starting extraction':
            return t(detail);
        default:
            return detail;
    }
}
