const { useState, useMemo, useRef, createElement: h, Fragment } = React;

const CASES = [
  {
    id: "c1",
    title: "Поставщик vs Заказчик — недопоставка по госконтракту",
    jurisdiction: "Арбитражный суд РФ",
    type: "Договорный спор",
    date: "2023-04-12",
    facts: "Заказчик отказался принимать товар из-за просрочки поставки на 9 дней, ссылаясь на существенное нарушение условий контракта. Поставщик утверждал, что просрочка вызвана действиями самого заказчика, задержавшего согласование спецификации.",
    norms: "ст. 506, 521 ГК РФ; Закон №44-ФЗ",
    position: "Суд признал просрочку несущественной, так как заказчик сам способствовал задержке.",
    outcome: "В пользу поставщика, договор не подлежит расторжению",
    tags: ["поставка", "госконтракт", "просрочка"],
  },
  {
    id: "c2",
    title: "Спор о качестве строительных работ по подряду",
    jurisdiction: "Арбитражный суд РФ",
    type: "Договорный спор",
    date: "2022-11-03",
    facts: "Заказчик предъявил претензии к качеству выполненных строительных работ, выявленные в течение гарантийного срока. Подрядчик ссылался на нарушение заказчиком правил эксплуатации объекта.",
    norms: "ст. 723, 755 ГК РФ",
    position: "Суд назначил судебную экспертизу для определения причины дефектов.",
    outcome: "Частично в пользу заказчика, взыскана стоимость устранения дефектов",
    tags: ["подряд", "качество", "гарантия"],
  },
  {
    id: "c3",
    title: "ICC Case — нарушение поставки оборудования между сторонами из разных юрисдикций",
    jurisdiction: "ICC (Международный арбитраж)",
    type: "Международный коммерческий спор",
    date: "2021-09-20",
    facts: "Покупатель оборудования из ЕС заявил о существенной задержке поставки и дефектах партии товара от продавца из Азии. Стороны ссылались на положения CISG относительно соответствия товара условиям договора.",
    norms: "CISG ст. 35, 49",
    position: "Трибунал установил, что несоответствие товара являлось существенным нарушением.",
    outcome: "В пользу покупателя, контракт расторгнут, убытки взысканы",
    tags: ["международный", "CISG", "поставка оборудования"],
  },
  {
    id: "c4",
    title: "Корпоративный спор об оспаривании решения общего собрания",
    jurisdiction: "Арбитражный суд РФ",
    type: "Корпоративный спор",
    date: "2023-01-17",
    facts: "Миноритарный акционер оспорил решение общего собрания об увеличении уставного капитала, утверждая, что был нарушен порядок уведомления о собрании.",
    norms: "ст. 181.4 ГК РФ; ФЗ «Об АО»",
    position: "Суд установил формальное нарушение порядка уведомления, но признал его несущественным для исхода голосования.",
    outcome: "Иск отклонён",
    tags: ["корпоративный спор", "акционеры", "собрание"],
  },
  {
    id: "c5",
    title: "ICSID Case — экспроприация иностранных инвестиций",
    jurisdiction: "ICSID (Международный арбитраж)",
    type: "Инвестиционный спор",
    date: "2020-06-05",
    facts: "Иностранный инвестор заявил о косвенной экспроприации актива в результате регуляторных мер государства, существенно снизивших стоимость инвестиции.",
    norms: "Двусторонний инвестиционный договор (BIT), ст. о справедливом и равноправном режиме",
    position: "Трибунал признал меры государства непропорциональными и нарушающими обязательства по BIT.",
    outcome: "В пользу инвестора, присуждена компенсация",
    tags: ["инвестиции", "экспроприация", "BIT"],
  },
  {
    id: "c6",
    title: "Спор о недопоставке комплектующих между российскими юрлицами",
    jurisdiction: "Арбитражный суд РФ",
    type: "Договорный спор",
    date: "2024-02-28",
    facts: "Поставщик комплектующих частично не исполнил обязательства по поставке, ссылаясь на форс-мажор из-за санкционных ограничений на закупку сырья у иностранного контрагента.",
    norms: "ст. 401, 506 ГК РФ",
    position: "Суд оценивал, относятся ли санкционные ограничения к обстоятельствам непреодолимой силы для данного поставщика.",
    outcome: "Частично в пользу поставщика, ответственность снижена",
    tags: ["поставка", "форс-мажор", "санкции"],
  },
];

const JURISDICTIONS = ["Все", "Арбитражный суд РФ", "ICC (Международный арбитраж)", "ICSID (Международный арбитраж)"];
const TYPES = ["Все", "Договорный спор", "Корпоративный спор", "Международный коммерческий спор", "Инвестиционный спор"];

function tokenize(text) {
  return text.toLowerCase().match(/[а-яёa-z0-9]+/gi) || [];
}

function scoreCase(queryTokens, caseItem) {
  const haystack = tokenize(caseItem.facts + " " + caseItem.title + " " + caseItem.tags.join(" "));
  const haystackSet = new Set(haystack);
  const matched = queryTokens.filter((t) => haystackSet.has(t));
  const uniqueMatched = [...new Set(matched)];
  const score = queryTokens.length ? uniqueMatched.length / new Set(queryTokens).size : 0;
  return { score, matchedTokens: uniqueMatched };
}

function highlightNodes(text, tokens) {
  if (!tokens || !tokens.length) return text;
  const pattern = new RegExp("(" + tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|") + ")", "gi");
  const parts = text.split(pattern);
  return parts.map((part, i) =>
    tokens.some((t) => t.toLowerCase() === part.toLowerCase())
      ? h("mark", { key: i }, part)
      : part
  );
}

function UploadBox({ onUploaded }) {
  const [progress, setProgress] = useState(null);
  const fileInputRef = useRef(null);

  function simulateUpload(fileName) {
    setProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 20 + Math.random() * 20;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        setTimeout(() => {
          setProgress(null);
          onUploaded(fileName);
        }, 400);
      }
      setProgress(Math.min(p, 100));
    }, 250);
  }

  return h("div", { className: "upload-box" },
    h("div", null, "Загрузите файлы кейсов (PDF, DOCX, TXT) — в этом прототипе обработка имитируется"),
    h("div", { className: "actions", style: { justifyContent: "center" } },
      h("button", {
        className: "secondary",
        onClick: () => fileInputRef.current.click(),
        disabled: progress !== null,
      }, "Выбрать файл")
    ),
    h("input", {
      type: "file",
      ref: fileInputRef,
      style: { display: "none" },
      onChange: (e) => {
        const file = e.target.files[0];
        if (file) simulateUpload(file.name);
        e.target.value = "";
      },
    }),
    progress !== null && h("div", null,
      h("div", { className: "progress" }, h("div", { style: { width: progress + "%" } })),
      h("div", { style: { fontSize: 12, marginTop: 6 } },
        progress < 100 ? "Извлечение текста и структурированных полей…" : "Готово"
      )
    )
  );
}

function CaseDetailModal({ caseItem, matchedTokens, onClose }) {
  if (!caseItem) return null;
  return h("div", { className: "modal-overlay", onClick: onClose },
    h("div", { className: "modal", onClick: (e) => e.stopPropagation() },
      h("span", { className: "close-x", onClick: onClose }, "×"),
      h("h3", null, caseItem.title),
      h("div", null, caseItem.tags.map((t) => h("span", { className: "tag", key: t }, t))),
      h("div", { className: "field", style: { marginTop: 12 } },
        h("div", { className: "k" }, "Юрисдикция / орган рассмотрения"),
        h("div", { className: "v" }, caseItem.jurisdiction)
      ),
      h("div", { className: "field" },
        h("div", { className: "k" }, "Тип спора · Дата решения"),
        h("div", { className: "v" }, caseItem.type + " · " + caseItem.date)
      ),
      h("div", { className: "field" },
        h("div", { className: "k" }, "Фактические обстоятельства"),
        h("div", { className: "v" }, highlightNodes(caseItem.facts, matchedTokens || []))
      ),
      h("div", { className: "field" },
        h("div", { className: "k" }, "Применённые нормы"),
        h("div", { className: "v" }, caseItem.norms)
      ),
      h("div", { className: "field" },
        h("div", { className: "k" }, "Правовая позиция"),
        h("div", { className: "v" }, caseItem.position)
      ),
      h("div", { className: "field" },
        h("div", { className: "k" }, "Исход дела"),
        h("div", { className: "v" }, caseItem.outcome)
      )
    )
  );
}

function CompareModal({ cases, onClose }) {
  if (!cases.length) return null;
  const rows = [
    ["Юрисдикция", (c) => c.jurisdiction],
    ["Тип спора", (c) => c.type],
    ["Дата", (c) => c.date],
    ["Факты", (c) => c.facts],
    ["Нормы", (c) => c.norms],
    ["Позиция", (c) => c.position],
    ["Исход", (c) => c.outcome],
  ];
  return h("div", { className: "modal-overlay", onClick: onClose },
    h("div", { className: "modal", style: { maxWidth: 900 }, onClick: (e) => e.stopPropagation() },
      h("span", { className: "close-x", onClick: onClose }, "×"),
      h("h3", null, "Сравнение кейсов"),
      h("table", { className: "compare" },
        h("thead", null,
          h("tr", null,
            h("th", null),
            cases.map((c) => h("th", { key: c.id }, c.title))
          )
        ),
        h("tbody", null,
          rows.map(([label, getter]) =>
            h("tr", { key: label },
              h("th", null, label),
              cases.map((c) => h("td", { key: c.id }, getter(c)))
            )
          )
        )
      )
    )
  );
}

function App() {
  const [query, setQuery] = useState("");
  const [jurisdiction, setJurisdiction] = useState("Все");
  const [type, setType] = useState("Все");
  const [searched, setSearched] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [openCaseId, setOpenCaseId] = useState(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [extraCases, setExtraCases] = useState([]);
  const [history, setHistory] = useState([]);

  const allCases = useMemo(() => [...CASES, ...extraCases], [extraCases]);
  const queryTokens = useMemo(() => tokenize(query), [query]);

  const results = useMemo(() => {
    if (!searched) return [];
    return allCases
      .filter((c) => jurisdiction === "Все" || c.jurisdiction === jurisdiction)
      .filter((c) => type === "Все" || c.type === type)
      .map((c) => Object.assign({}, c, scoreCase(queryTokens, c)))
      .filter((c) => queryTokens.length === 0 || c.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [searched, allCases, jurisdiction, type, queryTokens]);

  function runSearch() {
    setSearched(true);
    if (query.trim()) {
      setHistory((hist) => [{ query, jurisdiction, type, time: new Date().toLocaleString() }, ...hist].slice(0, 10));
    }
  }

  function toggleSelect(id) {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < 3 ? [...ids, id] : ids
    );
  }

  const openCase = allCases.find((c) => c.id === openCaseId);
  const openCaseMatched = (results.find((r) => r.id === openCaseId) || {}).matchedTokens;
  const selectedCases = allCases.filter((c) => selectedIds.includes(c.id));

  function handleUploaded(fileName) {
    const newCase = {
      id: "u" + Date.now(),
      title: "Новый кейс из файла «" + fileName + "»",
      jurisdiction: "Арбитражный суд РФ",
      type: "Договорный спор",
      date: new Date().toISOString().slice(0, 10),
      facts: "Метаданные извлечены автоматически из загруженного файла (демонстрационные данные). Требуется ручная проверка перед использованием.",
      norms: "—",
      position: "—",
      outcome: "—",
      tags: ["новый", "требует проверки"],
    };
    setExtraCases((cs) => [newCase, ...cs]);
  }

  return h(Fragment, null,
    h("header", null,
      h("h1", null, "LexCaseAdvisor"),
      h("p", null, "Поиск похожих судебных и арбитражных кейсов по фактическим обстоятельствам")
    ),
    h("div", { className: "container" },
      h("div", { className: "panel" },
        h("h2", null, "Поиск по фабуле спора"),
        h("textarea", {
          rows: 4,
          placeholder: "Опишите фактические обстоятельства вашей ситуации…",
          value: query,
          onChange: (e) => setQuery(e.target.value),
        }),
        h("div", { className: "filters" },
          h("div", null,
            h("label", null, "Юрисдикция"),
            h("select", { value: jurisdiction, onChange: (e) => setJurisdiction(e.target.value) },
              JURISDICTIONS.map((j) => h("option", { key: j, value: j }, j))
            )
          ),
          h("div", null,
            h("label", null, "Тип спора"),
            h("select", { value: type, onChange: (e) => setType(e.target.value) },
              TYPES.map((t) => h("option", { key: t, value: t }, t))
            )
          )
        ),
        h("div", { className: "actions" },
          h("button", { onClick: runSearch }, "Найти похожие кейсы"),
          h("button", { className: "secondary", onClick: () => { setQuery(""); setSearched(false); } }, "Очистить")
        )
      ),

      h("div", { className: "panel" },
        h("h2", null,
          "Результаты " + (searched ? "(" + results.length + ")" : ""),
          selectedIds.length >= 2 && h("button", { style: { float: "right" }, onClick: () => setCompareOpen(true) },
            "Сравнить выбранные (" + selectedIds.length + ")"
          )
        ),
        !searched && h("div", { className: "empty" }, "Введите описание ситуации и нажмите «Найти похожие кейсы»."),
        searched && results.length === 0 && h("div", { className: "empty" }, "Кейсы по заданным критериям не найдены."),
        h("div", { className: "results" },
          results.map((c) =>
            h("div", {
              key: c.id,
              className: "case-card" + (selectedIds.includes(c.id) ? " selected" : ""),
              onClick: () => setOpenCaseId(c.id),
            },
              h("div", { className: "top" },
                h("div", { className: "title" }, c.title),
                h("div", { className: "score" }, Math.round(c.score * 100) + "% релевантность")
              ),
              h("div", { className: "meta" }, c.jurisdiction + " · " + c.type + " · " + c.date),
              h("div", null, highlightNodes(c.facts, c.matchedTokens)),
              c.matchedTokens.length > 0 && h("div", { className: "why" }, "Совпадение по фактам: " + c.matchedTokens.join(", ")),
              h("div", { style: { marginTop: 8 }, onClick: (e) => e.stopPropagation() },
                h("label", { style: { fontSize: 12 } },
                  h("input", {
                    type: "checkbox",
                    checked: selectedIds.includes(c.id),
                    onChange: () => toggleSelect(c.id),
                  }),
                  " выбрать для сравнения"
                )
              )
            )
          )
        )
      ),

      h("div", { className: "panel" },
        h("h2", null, "Загрузка нового кейса"),
        h(UploadBox, { onUploaded: handleUploaded })
      ),

      history.length > 0 && h("div", { className: "panel" },
        h("h2", null, "История запросов"),
        history.map((hItem, i) =>
          h("div", { key: i, className: "empty", style: { padding: "4px 0" } },
            hItem.time + " — «" + hItem.query + "» (" + hItem.jurisdiction + ", " + hItem.type + ")"
          )
        )
      )
    ),

    h(CaseDetailModal, { caseItem: openCase, matchedTokens: openCaseMatched, onClose: () => setOpenCaseId(null) }),
    h(CompareModal, { cases: compareOpen ? selectedCases : [], onClose: () => setCompareOpen(false) })
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(h(App));
