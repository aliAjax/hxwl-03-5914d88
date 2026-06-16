import { useState, useMemo, useCallback } from "react";
import "./styles.css";

const project = {
  "id": "hxwl-03",
  "port": 5103,
  "title": "岩土钻孔编录",
  "subtitle": "钻孔分层、标贯与地下水位的现场记录面板",
  "stack": "React + Vite + TypeScript + CSS",
  "theme": [
    "#92400e",
    "#0f766e",
    "#2563eb"
  ],
  "domain": "岩土工程",
  "users": [
    "岩土工程师",
    "现场编录员",
    "项目负责人"
  ],
  "metrics": [
    "累计孔深",
    "地层数量",
    "最高标贯",
    "地下水位"
  ],
  "filters": [
    "黏土",
    "粉砂",
    "卵石",
    "强风化"
  ],
  "fields": [
    "钻孔编号",
    "孔深",
    "分层深度",
    "岩性分类",
    "岩性描述",
    "土色",
    "标贯击数",
    "地下水位"
  ] as const,
  "records": [
    [
      "ZK-18",
      "22.6m",
      "粉质黏土",
      "中密",
      "标贯12击，水位3.4m"
    ],
    [
      "ZK-21",
      "31.2m",
      "卵石层",
      "稍密",
      "夹中粗砂，取样困难"
    ],
    [
      "ZK-24",
      "18.4m",
      "强风化泥岩",
      "硬塑",
      "芯样完整率62%"
    ]
  ]
};

type FieldName = typeof project.fields[number];

interface DrillingRecord {
  "钻孔编号": string;
  "孔深": string;
  "分层深度": string;
  "岩性分类": string;
  "岩性描述": string;
  "土色": string;
  "标贯击数": string;
  "地下水位": string;
}

const initialRecords: DrillingRecord[] = [
  {
    "钻孔编号": "ZK-18",
    "孔深": "22.6",
    "分层深度": "0-22.6",
    "岩性分类": "黏土",
    "岩性描述": "粉质黏土",
    "土色": "褐黄色",
    "标贯击数": "12",
    "地下水位": "3.4"
  },
  {
    "钻孔编号": "ZK-21",
    "孔深": "31.2",
    "分层深度": "0-31.2",
    "岩性分类": "卵石",
    "岩性描述": "卵石层",
    "土色": "杂色",
    "标贯击数": "31",
    "地下水位": "2.8"
  },
  {
    "钻孔编号": "ZK-24",
    "孔深": "18.4",
    "分层深度": "0-18.4",
    "岩性分类": "强风化",
    "岩性描述": "强风化泥岩",
    "土色": "紫红色",
    "标贯击数": "50",
    "地下水位": "5.2"
  },
  {
    "钻孔编号": "ZK-27",
    "孔深": "15.8",
    "分层深度": "0-15.8",
    "岩性分类": "粉砂",
    "岩性描述": "粉砂层",
    "土色": "灰白色",
    "标贯击数": "8",
    "地下水位": "4.1"
  }
];

const emptyForm: DrillingRecord = {
  "钻孔编号": "",
  "孔深": "",
  "分层深度": "",
  "岩性分类": "",
  "岩性描述": "",
  "土色": "",
  "标贯击数": "",
  "地下水位": ""
};

const statusColors = ["status-ok", "status-watch", "status-danger"];

function MetricCard({ label, value, index }: { label: string; value: string; index: number }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={statusColors[index % statusColors.length]} />
    </article>
  );
}

function App() {
  const [formData, setFormData] = useState<DrillingRecord>(emptyForm);
  const [records, setRecords] = useState<DrillingRecord[]>(initialRecords);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const filteredRecords = useMemo(() => {
    if (!activeFilter) return records;
    return records.filter(r => r["岩性分类"] === activeFilter);
  }, [records, activeFilter]);

  const metrics = useMemo(() => {
    const totalDepth = filteredRecords.reduce((sum, r) => sum + (parseFloat(r["孔深"]) || 0), 0);
    const layerCount = filteredRecords.length;
    const maxSPT = filteredRecords.reduce((max, r) => {
      const spt = parseFloat(r["标贯击数"]);
      return isNaN(spt) ? max : Math.max(max, spt);
    }, 0);
    const avgWaterLevel = filteredRecords.length > 0
      ? filteredRecords.reduce((sum, r) => sum + (parseFloat(r["地下水位"]) || 0), 0) / filteredRecords.length
      : 0;

    return [
      totalDepth.toFixed(1) + "m",
      String(layerCount),
      String(maxSPT) + "击",
      avgWaterLevel.toFixed(1) + "m"
    ];
  }, [filteredRecords]);

  const summaryStats = useMemo(() => {
    const targetRecords = activeFilter ? filteredRecords : records;
    const totalDepth = targetRecords.reduce((sum, r) => sum + (parseFloat(r["孔深"]) || 0), 0);
    const recordCount = targetRecords.length;
    const maxSPT = targetRecords.reduce((max, r) => {
      const spt = parseFloat(r["标贯击数"]);
      return isNaN(spt) ? max : Math.max(max, spt);
    }, 0);
    const minWaterLevel = targetRecords.length > 0
      ? targetRecords.reduce((min, r) => {
          const wl = parseFloat(r["地下水位"]);
          return isNaN(wl) ? min : Math.min(min, wl);
        }, parseFloat(targetRecords[0]["地下水位"]) || 0)
      : 0;

    return {
      projectId: project.id,
      recordCount,
      totalDepth: totalDepth.toFixed(1) + "m",
      maxSPT: String(maxSPT) + "击",
      minWaterLevel: minWaterLevel.toFixed(1) + "m"
    };
  }, [records, filteredRecords, activeFilter]);

  const generateTextSummary = useCallback(() => {
    const { projectId, recordCount, totalDepth, maxSPT, minWaterLevel } = summaryStats;
    const targetRecords = activeFilter ? filteredRecords : records;
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    let text = `岩土钻孔摘要报告\n`;
    text += `生成时间：${dateStr}\n`;
    text += `────────────────────────────\n\n`;
    text += `【项目概况】\n`;
    text += `项目编号：${projectId}\n`;
    text += `记录数量：${recordCount}条\n`;
    text += `累计孔深：${totalDepth}\n`;
    text += `最高标贯：${maxSPT}\n`;
    text += `地下水位：${minWaterLevel}\n\n`;
    text += `【近期记录】\n`;
    text += `────────────────────────────\n`;
    targetRecords.forEach((r, i) => {
      text += `${String(i + 1).padStart(2, "0")}. ${r["钻孔编号"]} | 孔深${r["孔深"]}m | ${r["岩性分类"]} | ${r["岩性描述"]} | 标贯${r["标贯击数"]}击 | 水位${r["地下水位"]}m\n`;
    });
    text += `────────────────────────────\n`;

    return text;
  }, [summaryStats, activeFilter, filteredRecords, records]);

  const handleCopySummary = useCallback(async () => {
    const text = generateTextSummary();
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [generateTextSummary]);

  const handleInputChange = (field: FieldName, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<FieldName, string>> = {};

    project.fields.forEach(field => {
      if (!formData[field].trim()) {
        newErrors[field] = `${field}不能为空`;
      }
    });

    const holeDepth = parseFloat(formData["孔深"]);
    if (formData["孔深"].trim() && (isNaN(holeDepth) || holeDepth < 0)) {
      newErrors["孔深"] = "孔深不能为负数";
    }

    const spt = parseFloat(formData["标贯击数"]);
    if (formData["标贯击数"].trim() && !isNaN(spt) && spt < 0) {
      newErrors["标贯击数"] = "标贯击数不能为负数";
    }

    const waterLevel = parseFloat(formData["地下水位"]);
    if (formData["地下水位"].trim() && !isNaN(waterLevel) && waterLevel < 0) {
      newErrors["地下水位"] = "地下水位不能为负数";
    }

    if (formData["钻孔编号"].trim() && records.some(r => r["钻孔编号"] === formData["钻孔编号"].trim())) {
      newErrors["钻孔编号"] = "钻孔编号已存在";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddRecord = () => {
    if (!validate()) return;

    const trimmedRecord: DrillingRecord = {
      "钻孔编号": formData["钻孔编号"].trim(),
      "孔深": formData["孔深"].trim(),
      "分层深度": formData["分层深度"].trim(),
      "岩性分类": formData["岩性分类"].trim(),
      "岩性描述": formData["岩性描述"].trim(),
      "土色": formData["土色"].trim(),
      "标贯击数": formData["标贯击数"].trim(),
      "地下水位": formData["地下水位"].trim()
    };

    setRecords(prev => [trimmedRecord, ...prev]);
    setFormData(emptyForm);
    setErrors({});
  };

  return (
    <main className="app-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">{project.id} · port {project.port}</p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
        </div>
        <div className="stack-card">
          <span>技术栈</span>
          <strong>{project.stack}</strong>
        </div>
      </section>

      <section className="metrics-grid">
        {project.metrics.map((metric: string, index: number) => (
          <MetricCard key={metric} label={metric} value={metrics[index]} index={index} />
        ))}
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <h2>角色</h2>
          <div className="chips">
            {project.users.map((user: string) => (
              <span key={user}>{user}</span>
            ))}
          </div>
          <h2>现场筛选</h2>
          <div className="chips filter-chips">
            {project.filters.map((filter: string) => (
              <button
                key={filter}
                className={activeFilter === filter ? "filter-active" : ""}
                onClick={() => setActiveFilter(prev => prev === filter ? null : filter)}
              >
                {filter}
              </button>
            ))}
          </div>
        </aside>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>{project.domain}</p>
              <h2>记录字段</h2>
            </div>
            <button className="primary-action" onClick={handleAddRecord}>新增记录</button>
          </div>
          <div className="field-grid">
            {project.fields.map((field: FieldName) => (
              <label key={field}>
                <span>{field}</span>
                {field === "岩性分类" ? (
                  <select
                    className={errors[field] ? "input-error" : ""}
                    value={formData[field]}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                  >
                    <option value="">选择岩性分类</option>
                    {project.filters.map((f: string) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={errors[field] ? "input-error" : ""}
                    placeholder={"填写" + field}
                    value={formData[field]}
                    onChange={(e) => handleInputChange(field, e.target.value)}
                  />
                )}
                {errors[field] && <em className="error-tip">{errors[field]}</em>}
              </label>
            ))}
          </div>
        </section>
      </section>

      <section className="records panel">
        <div className="section-heading">
          <div>
            <p>钻孔数据</p>
            <h2>近期记录{activeFilter ? ` · ${activeFilter}` : ""}</h2>
          </div>
          <button onClick={() => setShowPreview(true)}>导出摘要</button>
        </div>
        <div className="record-list">
          {filteredRecords.map((record, index: number) => (
            <article key={record["钻孔编号"] + "-" + index} className="record-card">
              <div className="record-index">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <h3>{record["钻孔编号"]} <span className="tag">{record["岩性分类"]}</span></h3>
                <p>
                  孔深{record["孔深"]}m · {record["岩性描述"]} · {record["土色"]} ·
                  分层{record["分层深度"]}m · 标贯{record["标贯击数"]}击 · 水位{record["地下水位"]}m
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {showPreview && (
        <div className="preview-overlay" onClick={() => setShowPreview(false)}>
          <div className="preview-panel" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <div>
                <p className="eyebrow">钻孔摘要预览</p>
                <h2>项目摘要报告</h2>
              </div>
              <button className="close-btn" onClick={() => setShowPreview(false)}>×</button>
            </div>

            <div className="preview-content">
              <div className="summary-cards">
                <div className="summary-card">
                  <span>项目编号</span>
                  <strong>{summaryStats.projectId}</strong>
                </div>
                <div className="summary-card">
                  <span>记录数量</span>
                  <strong>{summaryStats.recordCount}条</strong>
                </div>
                <div className="summary-card">
                  <span>累计孔深</span>
                  <strong>{summaryStats.totalDepth}</strong>
                </div>
                <div className="summary-card">
                  <span>最高标贯</span>
                  <strong>{summaryStats.maxSPT}</strong>
                </div>
                <div className="summary-card">
                  <span>地下水位</span>
                  <strong>{summaryStats.minWaterLevel}</strong>
                </div>
              </div>

              <div className="preview-section">
                <h3>近期记录简表</h3>
                <div className="summary-table-wrapper">
                  <table className="summary-table">
                    <thead>
                      <tr>
                        <th>序号</th>
                        <th>钻孔编号</th>
                        <th>孔深(m)</th>
                        <th>岩性分类</th>
                        <th>岩性描述</th>
                        <th>标贯击数</th>
                        <th>地下水位(m)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activeFilter ? filteredRecords : records).map((record: DrillingRecord, index: number) => (
                        <tr key={record["钻孔编号"] + "-" + index}>
                          <td>{String(index + 1).padStart(2, "0")}</td>
                          <td><strong>{record["钻孔编号"]}</strong></td>
                          <td>{record["孔深"]}</td>
                          <td><span className="tag">{record["岩性分类"]}</span></td>
                          <td>{record["岩性描述"]}</td>
                          <td>{record["标贯击数"]}</td>
                          <td>{record["地下水位"]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="preview-section">
                <h3>文本摘要</h3>
                <div className="text-summary">
                  <pre>{generateTextSummary()}</pre>
                </div>
              </div>
            </div>

            <div className="preview-footer">
              <button className="secondary-btn" onClick={() => setShowPreview(false)}>关闭</button>
              <button className="primary-action" onClick={handleCopySummary}>
                {copySuccess ? "✓ 已复制到剪贴板" : "复制文本摘要"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;
