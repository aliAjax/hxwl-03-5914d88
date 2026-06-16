import { useState, useMemo } from "react";
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
    "岩性描述": "粉质黏土",
    "土色": "褐黄色",
    "标贯击数": "12",
    "地下水位": "3.4"
  },
  {
    "钻孔编号": "ZK-21",
    "孔深": "31.2",
    "分层深度": "0-31.2",
    "岩性描述": "卵石层",
    "土色": "杂色",
    "标贯击数": "31",
    "地下水位": "2.8"
  },
  {
    "钻孔编号": "ZK-24",
    "孔深": "18.4",
    "分层深度": "0-18.4",
    "岩性描述": "强风化泥岩",
    "土色": "紫红色",
    "标贯击数": "50",
    "地下水位": "5.2"
  }
];

const emptyForm: DrillingRecord = {
  "钻孔编号": "",
  "孔深": "",
  "分层深度": "",
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

  const metrics = useMemo(() => {
    const totalDepth = records.reduce((sum, r) => sum + (parseFloat(r["孔深"]) || 0), 0);
    const layerCount = records.length;
    const maxSPT = records.reduce((max, r) => {
      const spt = parseFloat(r["标贯击数"]);
      return isNaN(spt) ? max : Math.max(max, spt);
    }, 0);
    const avgWaterLevel = records.length > 0
      ? records.reduce((sum, r) => sum + (parseFloat(r["地下水位"]) || 0), 0) / records.length
      : 0;

    return [
      totalDepth.toFixed(1) + "m",
      String(layerCount),
      String(maxSPT) + "击",
      avgWaterLevel.toFixed(1) + "m"
    ];
  }, [records]);

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
          <h2>筛选</h2>
          <div className="chips muted">
            {project.filters.map((filter: string) => (
              <button key={filter}>{filter}</button>
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
                <input
                  className={errors[field] ? "input-error" : ""}
                  placeholder={"填写" + field}
                  value={formData[field]}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                />
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
            <h2>近期记录</h2>
          </div>
          <button>导出摘要</button>
        </div>
        <div className="record-list">
          {records.map((record, index: number) => (
            <article key={record["钻孔编号"] + "-" + index} className="record-card">
              <div className="record-index">{String(index + 1).padStart(2, "0")}</div>
              <div>
                <h3>{record["钻孔编号"]}</h3>
                <p>
                  孔深{record["孔深"]}m · {record["岩性描述"]} · {record["土色"]} ·
                  分层{record["分层深度"]}m · 标贯{record["标贯击数"]}击 · 水位{record["地下水位"]}m
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default App;
