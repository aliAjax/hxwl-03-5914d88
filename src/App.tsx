import { useState, useMemo, useCallback, useEffect } from "react";
import "./styles.css";

interface StratumLayer {
  id: string;
  startDepth: string;
  endDepth: string;
  lithology: string;
  soilColor: string;
  density: string;
  description: string;
}

interface BoreholeLayers {
  [boreholeId: string]: StratumLayer[];
}

interface SPTRecord {
  id: string;
  depth: string;
  blowCount: string;
  isAbnormal: boolean;
  remark: string;
  layerId: string;
}

interface BoreholeSPTRecords {
  [boreholeId: string]: SPTRecord[];
}

interface SamplingRecord {
  id: string;
  depth: string;
  sampleType: string;
  sampleNumber: string;
  remark: string;
  layerId: string;
}

interface BoreholeSamplingRecords {
  [boreholeId: string]: SamplingRecord[];
}

interface WaterLevelRecord {
  id: string;
  firstSeenLevel: string;
  stableLevel: string;
  observationTime: string;
  weatherRemark: string;
}

interface BoreholeWaterLevelRecords {
  [boreholeId: string]: WaterLevelRecord[];
}

const lithologyOptions = ["黏土", "粉质黏土", "粉土", "粉砂", "细砂", "中砂", "粗砂", "卵石", "圆砾", "强风化岩", "中风化岩", "微风化岩"];
const soilColorOptions = ["褐黄色", "黄褐色", "灰黄色", "灰白色", "灰色", "灰褐色", "紫红色", "杂色"];
const densityOptions = ["松散", "稍密", "中密", "密实", "可塑", "硬塑", "坚硬", "流塑"];
const sampleTypeOptions = ["原状样", "扰动样", "岩芯样", "水样"];

const generateId = () => Math.random().toString(36).slice(2, 11);

const initialLayers: BoreholeLayers = {
  "ZK-18": [
    { id: "layer-zk18-1", startDepth: "0", endDepth: "3.2", lithology: "粉质黏土", soilColor: "褐黄色", density: "可塑", description: "含少量铁锰氧化物斑点，稍有光泽" },
    { id: "layer-zk18-2", startDepth: "3.2", endDepth: "8.5", lithology: "粉土", soilColor: "灰黄色", density: "中密", description: "夹薄层粉砂，摇振反应中等" },
    { id: "layer-zk18-3", startDepth: "8.5", endDepth: "15.8", lithology: "粉砂", soilColor: "灰白色", density: "密实", description: "矿物成分以石英、长石为主" },
    { id: "layer-zk18-4", startDepth: "15.8", endDepth: "22.6", lithology: "卵石", soilColor: "杂色", density: "中密", description: "磨圆度较好，充填中粗砂" },
  ],
  "ZK-21": [
    { id: "layer-zk21-1", startDepth: "0", endDepth: "2.5", lithology: "粉质黏土", soilColor: "褐黄色", density: "硬塑", description: "表层为耕植土，含植物根系" },
    { id: "layer-zk21-2", startDepth: "2.5", endDepth: "12.0", lithology: "圆砾", soilColor: "灰白色", density: "稍密", description: "颗粒级配一般，充填砂粒" },
    { id: "layer-zk21-3", startDepth: "12.0", endDepth: "25.5", lithology: "卵石", soilColor: "杂色", density: "中密", description: "岩性以砂岩、灰岩为主" },
    { id: "layer-zk21-4", startDepth: "25.5", endDepth: "31.2", lithology: "强风化岩", soilColor: "紫红色", density: "坚硬", description: "岩芯破碎，呈碎块状" },
  ],
  "ZK-24": [
    { id: "layer-zk24-1", startDepth: "0", endDepth: "4.8", lithology: "黏土", soilColor: "褐黄色", density: "可塑", description: "含铁锰结核，干强度高" },
    { id: "layer-zk24-2", startDepth: "4.8", endDepth: "10.2", lithology: "粉砂", soilColor: "灰黄色", density: "中密", description: "饱和状态，矿物成分石英为主" },
    { id: "layer-zk24-3", startDepth: "10.2", endDepth: "18.4", lithology: "强风化岩", soilColor: "紫红色", density: "坚硬", description: "泥岩，岩芯较破碎" },
  ],
  "ZK-27": [
    { id: "layer-zk27-1", startDepth: "0", endDepth: "1.8", lithology: "粉质黏土", soilColor: "褐黄色", density: "可塑", description: "含少量粉砂，稍有光泽" },
    { id: "layer-zk27-2", startDepth: "1.8", endDepth: "7.5", lithology: "粉砂", soilColor: "灰白色", density: "稍密", description: "颗粒均匀，级配不良" },
    { id: "layer-zk27-3", startDepth: "7.5", endDepth: "15.8", lithology: "细砂", soilColor: "灰黄色", density: "中密", description: "夹粉土薄层，饱和" },
  ],
};

const initialSPTRecords: BoreholeSPTRecords = {
  "ZK-18": [
    { id: "spt-zk18-1", depth: "1.5", blowCount: "8", isAbnormal: false, remark: "", layerId: "layer-zk18-1" },
    { id: "spt-zk18-2", depth: "2.5", blowCount: "12", isAbnormal: false, remark: "", layerId: "layer-zk18-1" },
    { id: "spt-zk18-3", depth: "5.0", blowCount: "18", isAbnormal: false, remark: "", layerId: "layer-zk18-2" },
    { id: "spt-zk18-4", depth: "7.0", blowCount: "15", isAbnormal: true, remark: "遇孤石", layerId: "layer-zk18-2" },
    { id: "spt-zk18-5", depth: "10.0", blowCount: "32", isAbnormal: false, remark: "", layerId: "layer-zk18-3" },
    { id: "spt-zk18-6", depth: "13.0", blowCount: "45", isAbnormal: false, remark: "", layerId: "layer-zk18-3" },
    { id: "spt-zk18-7", depth: "18.0", blowCount: "50", isAbnormal: false, remark: "", layerId: "layer-zk18-4" },
  ],
  "ZK-21": [
    { id: "spt-zk21-1", depth: "1.0", blowCount: "14", isAbnormal: false, remark: "", layerId: "layer-zk21-1" },
    { id: "spt-zk21-2", depth: "5.0", blowCount: "22", isAbnormal: false, remark: "", layerId: "layer-zk21-2" },
    { id: "spt-zk21-3", depth: "8.0", blowCount: "28", isAbnormal: false, remark: "", layerId: "layer-zk21-2" },
    { id: "spt-zk21-4", depth: "15.0", blowCount: "42", isAbnormal: false, remark: "", layerId: "layer-zk21-3" },
    { id: "spt-zk21-5", depth: "20.0", blowCount: "50", isAbnormal: false, remark: "击数超限", layerId: "layer-zk21-3" },
  ],
  "ZK-24": [
    { id: "spt-zk24-1", depth: "2.0", blowCount: "10", isAbnormal: false, remark: "", layerId: "layer-zk24-1" },
    { id: "spt-zk24-2", depth: "4.0", blowCount: "9", isAbnormal: false, remark: "", layerId: "layer-zk24-1" },
    { id: "spt-zk24-3", depth: "7.0", blowCount: "25", isAbnormal: false, remark: "", layerId: "layer-zk24-2" },
    { id: "spt-zk24-4", depth: "12.0", blowCount: "50", isAbnormal: false, remark: "", layerId: "layer-zk24-3" },
    { id: "spt-zk24-5", depth: "15.0", blowCount: "50", isAbnormal: true, remark: "岩芯破碎", layerId: "layer-zk24-3" },
  ],
  "ZK-27": [
    { id: "spt-zk27-1", depth: "1.0", blowCount: "6", isAbnormal: false, remark: "", layerId: "layer-zk27-1" },
    { id: "spt-zk27-2", depth: "3.5", blowCount: "12", isAbnormal: false, remark: "", layerId: "layer-zk27-2" },
    { id: "spt-zk27-3", depth: "5.5", blowCount: "15", isAbnormal: false, remark: "", layerId: "layer-zk27-2" },
    { id: "spt-zk27-4", depth: "10.0", blowCount: "22", isAbnormal: false, remark: "", layerId: "layer-zk27-3" },
    { id: "spt-zk27-5", depth: "13.0", blowCount: "28", isAbnormal: false, remark: "", layerId: "layer-zk27-3" },
  ],
};

const initialSamplingRecords: BoreholeSamplingRecords = {
  "ZK-18": [
    { id: "spl-zk18-1", depth: "1.5", sampleType: "原状样", sampleNumber: "ZK18-1", remark: "", layerId: "layer-zk18-1" },
    { id: "spl-zk18-2", depth: "5.0", sampleType: "扰动样", sampleNumber: "ZK18-2", remark: "", layerId: "layer-zk18-2" },
    { id: "spl-zk18-3", depth: "10.0", sampleType: "原状样", sampleNumber: "ZK18-3", remark: "", layerId: "layer-zk18-3" },
    { id: "spl-zk18-4", depth: "18.0", sampleType: "岩芯样", sampleNumber: "ZK18-4", remark: "RQD=35%", layerId: "layer-zk18-4" },
  ],
  "ZK-21": [
    { id: "spl-zk21-1", depth: "1.0", sampleType: "原状样", sampleNumber: "ZK21-1", remark: "", layerId: "layer-zk21-1" },
    { id: "spl-zk21-2", depth: "5.0", sampleType: "扰动样", sampleNumber: "ZK21-2", remark: "", layerId: "layer-zk21-2" },
    { id: "spl-zk21-3", depth: "15.0", sampleType: "岩芯样", sampleNumber: "ZK21-3", remark: "RQD=28%", layerId: "layer-zk21-3" },
    { id: "spl-zk21-4", depth: "28.0", sampleType: "岩芯样", sampleNumber: "ZK21-4", remark: "RQD=52%", layerId: "layer-zk21-4" },
  ],
  "ZK-24": [
    { id: "spl-zk24-1", depth: "2.0", sampleType: "原状样", sampleNumber: "ZK24-1", remark: "", layerId: "layer-zk24-1" },
    { id: "spl-zk24-2", depth: "7.0", sampleType: "扰动样", sampleNumber: "ZK24-2", remark: "", layerId: "layer-zk24-2" },
    { id: "spl-zk24-3", depth: "12.0", sampleType: "岩芯样", sampleNumber: "ZK24-3", remark: "RQD=62%", layerId: "layer-zk24-3" },
  ],
  "ZK-27": [
    { id: "spl-zk27-1", depth: "1.0", sampleType: "原状样", sampleNumber: "ZK27-1", remark: "", layerId: "layer-zk27-1" },
    { id: "spl-zk27-2", depth: "3.5", sampleType: "扰动样", sampleNumber: "ZK27-2", remark: "", layerId: "layer-zk27-2" },
    { id: "spl-zk27-3", depth: "10.0", sampleType: "原状样", sampleNumber: "ZK27-3", remark: "", layerId: "layer-zk27-3" },
  ],
};

const initialWaterLevelRecords: BoreholeWaterLevelRecords = {
  "ZK-18": [
    { id: "wl-zk18-1", firstSeenLevel: "3.2", stableLevel: "3.4", observationTime: "2024-06-15 08:30", weatherRemark: "晴，气温26℃" },
    { id: "wl-zk18-2", firstSeenLevel: "3.3", stableLevel: "3.5", observationTime: "2024-06-16 14:20", weatherRemark: "多云，有微风" },
  ],
  "ZK-21": [
    { id: "wl-zk21-1", firstSeenLevel: "2.6", stableLevel: "2.8", observationTime: "2024-06-15 10:00", weatherRemark: "晴" },
  ],
  "ZK-24": [
    { id: "wl-zk24-1", firstSeenLevel: "5.0", stableLevel: "", observationTime: "2024-06-15 16:45", weatherRemark: "阴，预计有雨" },
  ],
  "ZK-27": [],
};

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
    "标贯总数",
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
    "岩性分类",
    "岩性描述",
    "土色",
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
  "岩性分类": string;
  "岩性描述": string;
  "土色": string;
  "地下水位": string;
}

const initialRecords: DrillingRecord[] = [
  { "钻孔编号": "ZK-18", "孔深": "22.6", "岩性分类": "黏土", "岩性描述": "粉质黏土", "土色": "褐黄色", "地下水位": "3.4" },
  { "钻孔编号": "ZK-21", "孔深": "31.2", "岩性分类": "卵石", "岩性描述": "卵石层", "土色": "杂色", "地下水位": "2.8" },
  { "钻孔编号": "ZK-24", "孔深": "18.4", "岩性分类": "强风化", "岩性描述": "强风化泥岩", "土色": "紫红色", "地下水位": "5.2" },
  { "钻孔编号": "ZK-27", "孔深": "15.8", "岩性分类": "粉砂", "岩性描述": "粉砂层", "土色": "灰白色", "地下水位": "4.1" }
];

const emptyForm: DrillingRecord = {
  "钻孔编号": "",
  "孔深": "",
  "岩性分类": "",
  "岩性描述": "",
  "土色": "",
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

const emptyLayerForm: Omit<StratumLayer, "id"> = {
  startDepth: "",
  endDepth: "",
  lithology: "",
  soilColor: "",
  density: "",
  description: ""
};

const emptySPTForm: Omit<SPTRecord, "id" | "layerId"> = {
  depth: "",
  blowCount: "",
  isAbnormal: false,
  remark: ""
};

const emptySamplingForm: Omit<SamplingRecord, "id" | "layerId"> = {
  depth: "",
  sampleType: "",
  sampleNumber: "",
  remark: ""
};

const emptyWaterLevelForm: Omit<WaterLevelRecord, "id"> = {
  firstSeenLevel: "",
  stableLevel: "",
  observationTime: "",
  weatherRemark: ""
};

function App() {
  const [formData, setFormData] = useState<DrillingRecord>(emptyForm);
  const [records, setRecords] = useState<DrillingRecord[]>(initialRecords);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const [boreholeLayers, setBoreholeLayers] = useState<BoreholeLayers>(initialLayers);
  const [selectedBorehole, setSelectedBorehole] = useState<string | null>("ZK-18");
  const [layerForm, setLayerForm] = useState<Omit<StratumLayer, "id">>(emptyLayerForm);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [layerErrors, setLayerErrors] = useState<Partial<Record<keyof StratumLayer, string>>>({});
  const [layerValidationMessage, setLayerValidationMessage] = useState<string>("");
  const [gapMessage, setGapMessage] = useState<string>("");

  const [sptRecords, setSPTRecords] = useState<BoreholeSPTRecords>(initialSPTRecords);
  const [sptForm, setSPTForm] = useState<Omit<SPTRecord, "id" | "layerId">>(emptySPTForm);
  const [editingSPTId, setEditingSPTId] = useState<string | null>(null);
  const [sptErrors, setSPTErrors] = useState<Partial<Record<keyof SPTRecord, string>>>({});
  const [sptValidationMessage, setSPTValidationMessage] = useState<string>("");

  const [samplingRecords, setSamplingRecords] = useState<BoreholeSamplingRecords>(initialSamplingRecords);
  const [samplingForm, setSamplingForm] = useState<Omit<SamplingRecord, "id" | "layerId">>(emptySamplingForm);
  const [editingSamplingId, setEditingSamplingId] = useState<string | null>(null);
  const [samplingErrors, setSamplingErrors] = useState<Partial<Record<keyof SamplingRecord, string>>>({});
  const [samplingValidationMessage, setSamplingValidationMessage] = useState<string>("");

  const [waterLevelRecords, setWaterLevelRecords] = useState<BoreholeWaterLevelRecords>(initialWaterLevelRecords);
  const [waterLevelForm, setWaterLevelForm] = useState<Omit<WaterLevelRecord, "id">>(emptyWaterLevelForm);
  const [editingWaterLevelId, setEditingWaterLevelId] = useState<string | null>(null);
  const [waterLevelErrors, setWaterLevelErrors] = useState<Partial<Record<keyof WaterLevelRecord, string>>>({});
  const [waterLevelValidationMessage, setWaterLevelValidationMessage] = useState<string>("");

  const currentLayers = useMemo(() => {
    if (!selectedBorehole) return [];
    return boreholeLayers[selectedBorehole] || [];
  }, [boreholeLayers, selectedBorehole]);

  const selectedRecord = useMemo(() => {
    if (!selectedBorehole) return null;
    return records.find(r => r["钻孔编号"] === selectedBorehole) || null;
  }, [records, selectedBorehole]);

  const holeDepth = useMemo(() => {
    if (!selectedRecord) return 0;
    return parseFloat(selectedRecord["孔深"]) || 0;
  }, [selectedRecord]);

  const sortedLayers = useMemo(() => {
    return [...currentLayers].sort((a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth));
  }, [currentLayers]);

  const currentSPTRecords = useMemo(() => {
    if (!selectedBorehole) return [];
    return sptRecords[selectedBorehole] || [];
  }, [sptRecords, selectedBorehole]);

  const sortedSPTRecords = useMemo(() => {
    return [...currentSPTRecords].sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth));
  }, [currentSPTRecords]);

  const currentSamplingRecords = useMemo(() => {
    if (!selectedBorehole) return [];
    return samplingRecords[selectedBorehole] || [];
  }, [samplingRecords, selectedBorehole]);

  const sortedSamplingRecords = useMemo(() => {
    return [...currentSamplingRecords].sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth));
  }, [currentSamplingRecords]);

  const currentWaterLevelRecords = useMemo(() => {
    if (!selectedBorehole) return [];
    return waterLevelRecords[selectedBorehole] || [];
  }, [waterLevelRecords, selectedBorehole]);

  const sortedWaterLevelRecords = useMemo(() => {
    return [...currentWaterLevelRecords].sort((a, b) => {
      const timeA = a.observationTime ? new Date(a.observationTime).getTime() : 0;
      const timeB = b.observationTime ? new Date(b.observationTime).getTime() : 0;
      return timeB - timeA;
    });
  }, [currentWaterLevelRecords]);

  const latestWaterLevel = useMemo(() => {
    if (sortedWaterLevelRecords.length === 0) return null;
    for (const record of sortedWaterLevelRecords) {
      if (record.stableLevel && record.stableLevel.trim()) {
        return record;
      }
    }
    return sortedWaterLevelRecords[0];
  }, [sortedWaterLevelRecords]);

  const getLatestStableWaterLevel = useCallback((boreholeId: string): string => {
    const records = waterLevelRecords[boreholeId] || [];
    const sorted = [...records].sort((a, b) => {
      const timeA = a.observationTime ? new Date(a.observationTime).getTime() : 0;
      const timeB = b.observationTime ? new Date(b.observationTime).getTime() : 0;
      return timeB - timeA;
    });
    for (const record of sorted) {
      if (record.stableLevel && record.stableLevel.trim()) {
        return record.stableLevel;
      }
    }
    if (sorted.length > 0 && sorted[0].firstSeenLevel && sorted[0].firstSeenLevel.trim()) {
      return sorted[0].firstSeenLevel;
    }
    return "";
  }, [waterLevelRecords]);

  const getWaterLevelDisplayText = useCallback((boreholeId: string): string => {
    const records = waterLevelRecords[boreholeId] || [];
    if (records.length === 0) return "未观测";
    const sorted = [...records].sort((a, b) => {
      const timeA = a.observationTime ? new Date(a.observationTime).getTime() : 0;
      const timeB = b.observationTime ? new Date(b.observationTime).getTime() : 0;
      return timeB - timeA;
    });
    for (const record of sorted) {
      if (record.stableLevel && record.stableLevel.trim()) {
        return record.stableLevel;
      }
    }
    if (sorted[0].firstSeenLevel && sorted[0].firstSeenLevel.trim()) {
      return `初见${sorted[0].firstSeenLevel}`;
    }
    return "未观测";
  }, [waterLevelRecords]);

  const findLayerByDepth = useCallback((depth: number): StratumLayer | null => {
    for (const layer of sortedLayers) {
      const start = parseFloat(layer.startDepth);
      const end = parseFloat(layer.endDepth);
      if (depth >= start && depth <= end) {
        return layer;
      }
    }
    return null;
  }, [sortedLayers]);

  const getLayerLithology = useCallback((layerId: string): string => {
    const layer = sortedLayers.find(l => l.id === layerId);
    return layer ? layer.lithology : "-";
  }, [sortedLayers]);

  const sptStats = useMemo(() => {
    const recs = sortedSPTRecords;
    if (recs.length === 0) {
      return { maxBlow: 0, abnormalCount: 0, totalCount: 0, maxBlowLithology: "-" };
    }
    let maxBlow = 0;
    let maxBlowLayerId = "";
    let abnormalCount = 0;
    for (const record of recs) {
      const blow = parseFloat(record.blowCount);
      if (!isNaN(blow) && blow > maxBlow) {
        maxBlow = blow;
        maxBlowLayerId = record.layerId;
      }
      if (record.isAbnormal) abnormalCount++;
    }
    const maxBlowLayer = sortedLayers.find(l => l.id === maxBlowLayerId);
    return { maxBlow, abnormalCount, totalCount: recs.length, maxBlowLithology: maxBlowLayer ? maxBlowLayer.lithology : "-" };
  }, [sortedSPTRecords, sortedLayers]);

  const samplingStats = useMemo(() => {
    const recs = sortedSamplingRecords;
    if (recs.length === 0) {
      return { totalCount: 0, typeBreakdown: {} as Record<string, number> };
    }
    const typeBreakdown: Record<string, number> = {};
    for (const r of recs) {
      typeBreakdown[r.sampleType] = (typeBreakdown[r.sampleType] || 0) + 1;
    }
    return { totalCount: recs.length, typeBreakdown };
  }, [sortedSamplingRecords]);

  const checkDepthInLayers = useCallback((depth: number): { valid: boolean; message: string; layer: StratumLayer | null } => {
    if (sortedLayers.length === 0) {
      return { valid: false, message: "当前钻孔暂无地层分层数据，请先添加分层", layer: null };
    }
    const layer = findLayerByDepth(depth);
    if (!layer) {
      const minDepth = parseFloat(sortedLayers[0].startDepth);
      const maxDepth = parseFloat(sortedLayers[sortedLayers.length - 1].endDepth);
      if (depth < minDepth) {
        return { valid: false, message: `深度 ${depth}m 位于地层之上（最浅分层起始于 ${minDepth}m），请检查深度`, layer: null };
      } else if (depth > maxDepth) {
        return { valid: false, message: `深度 ${depth}m 超出最深分层（最深分层终止于 ${maxDepth}m），请检查深度`, layer: null };
      } else {
        return { valid: false, message: `深度 ${depth}m 落在分层缺口处，请先补全该深度范围的分层`, layer: null };
      }
    }
    return { valid: true, message: "", layer };
  }, [sortedLayers, findLayerByDepth]);

  const validateLayerForm = useCallback((): { valid: boolean; errors: Partial<Record<keyof StratumLayer, string>> } => {
    const errs: Partial<Record<keyof StratumLayer, string>> = {};
    if (!layerForm.startDepth.trim()) { errs.startDepth = "起始深度不能为空"; }
    else if (isNaN(parseFloat(layerForm.startDepth)) || parseFloat(layerForm.startDepth) < 0) { errs.startDepth = "起始深度必须为非负数"; }
    if (!layerForm.endDepth.trim()) { errs.endDepth = "终止深度不能为空"; }
    else if (isNaN(parseFloat(layerForm.endDepth)) || parseFloat(layerForm.endDepth) < 0) { errs.endDepth = "终止深度必须为非负数"; }
    if (!layerForm.lithology.trim()) { errs.lithology = "岩性不能为空"; }
    if (!layerForm.soilColor.trim()) { errs.soilColor = "土色不能为空"; }
    if (!layerForm.density.trim()) { errs.density = "密实度/状态不能为空"; }
    const start = parseFloat(layerForm.startDepth);
    const end = parseFloat(layerForm.endDepth);
    if (!isNaN(start) && !isNaN(end) && start >= end) { errs.endDepth = "终止深度必须大于起始深度"; }
    if (!isNaN(end) && holeDepth > 0 && end > holeDepth) { errs.endDepth = `终止深度不能超过钻孔深度(${holeDepth}m)`; }
    return { valid: Object.keys(errs).length === 0, errors: errs };
  }, [layerForm, holeDepth]);

  const checkOverlapAndGaps = useCallback(() => {
    const layers = [...currentLayers];
    if (editingLayerId) {
      const idx = layers.findIndex(l => l.id === editingLayerId);
      if (idx !== -1) layers.splice(idx, 1);
    }
    const start = parseFloat(layerForm.startDepth);
    const end = parseFloat(layerForm.endDepth);
    if (isNaN(start) || isNaN(end)) return { hasOverlap: false, gaps: [] as string[] };
    let hasOverlap = false;
    for (const layer of layers) {
      const ls = parseFloat(layer.startDepth);
      const le = parseFloat(layer.endDepth);
      if (start < le && end > ls) { hasOverlap = true; break; }
    }
    const allLayers = [...layers, { ...layerForm, id: "temp" } as StratumLayer].sort((a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth));
    const gaps: string[] = [];
    let prevEnd = 0;
    for (const layer of allLayers) {
      const ls = parseFloat(layer.startDepth);
      if (ls > prevEnd + 0.001) { gaps.push(`${prevEnd.toFixed(2)}m ~ ${ls.toFixed(2)}m`); }
      prevEnd = Math.max(prevEnd, parseFloat(layer.endDepth));
    }
    if (holeDepth > 0 && prevEnd < holeDepth - 0.001) { gaps.push(`${prevEnd.toFixed(2)}m ~ ${holeDepth.toFixed(2)}m`); }
    return { hasOverlap, gaps };
  }, [currentLayers, editingLayerId, layerForm, holeDepth]);

  const handleLayerInputChange = (field: keyof Omit<StratumLayer, "id">, value: string) => {
    setLayerForm(prev => ({ ...prev, [field]: value }));
    if (layerErrors[field]) setLayerErrors(prev => ({ ...prev, [field]: undefined }));
    if (layerValidationMessage) setLayerValidationMessage("");
  };

  const handleAddLayer = () => {
    setLayerValidationMessage("");
    const { valid, errors: formErrors } = validateLayerForm();
    setLayerErrors(formErrors);
    if (!valid) return;
    const { hasOverlap } = checkOverlapAndGaps();
    if (hasOverlap) { setLayerValidationMessage("该层与现有分层深度重叠，请调整深度范围"); return; }
    if (!selectedBorehole) return;
    const newLayer: StratumLayer = { ...layerForm, id: generateId() };
    setBoreholeLayers(prev => ({ ...prev, [selectedBorehole]: [...(prev[selectedBorehole] || []), newLayer] }));
    setLayerForm(emptyLayerForm); setLayerErrors({}); setLayerValidationMessage("");
  };

  const handleUpdateLayer = () => {
    setLayerValidationMessage("");
    const { valid, errors: formErrors } = validateLayerForm();
    setLayerErrors(formErrors);
    if (!valid || !editingLayerId || !selectedBorehole) return;
    const { hasOverlap } = checkOverlapAndGaps();
    if (hasOverlap) { setLayerValidationMessage("该层与现有分层深度重叠，请调整深度范围"); return; }
    setBoreholeLayers(prev => ({ ...prev, [selectedBorehole]: prev[selectedBorehole].map(l => l.id === editingLayerId ? { ...layerForm, id: editingLayerId } : l) }));
    setLayerForm(emptyLayerForm); setEditingLayerId(null); setLayerErrors({}); setLayerValidationMessage("");
  };

  const handleEditLayer = (layer: StratumLayer) => {
    setLayerForm({ startDepth: layer.startDepth, endDepth: layer.endDepth, lithology: layer.lithology, soilColor: layer.soilColor, density: layer.density, description: layer.description });
    setEditingLayerId(layer.id); setLayerErrors({}); setLayerValidationMessage("");
  };

  const handleDeleteLayer = (layerId: string) => {
    if (!selectedBorehole) return;
    setBoreholeLayers(prev => ({ ...prev, [selectedBorehole]: prev[selectedBorehole].filter(l => l.id !== layerId) }));
    if (editingLayerId === layerId) { setLayerForm(emptyLayerForm); setEditingLayerId(null); }
  };

  const handleCancelEdit = () => { setLayerForm(emptyLayerForm); setEditingLayerId(null); setLayerErrors({}); setLayerValidationMessage(""); };

  const validateSPTForm = useCallback((): { valid: boolean; errors: Partial<Record<keyof SPTRecord, string>> } => {
    const errs: Partial<Record<keyof SPTRecord, string>> = {};
    if (!sptForm.depth.trim()) { errs.depth = "深度不能为空"; }
    else if (isNaN(parseFloat(sptForm.depth)) || parseFloat(sptForm.depth) < 0) { errs.depth = "深度必须为非负数"; }
    if (!sptForm.blowCount.trim()) { errs.blowCount = "击数不能为空"; }
    else if (isNaN(parseFloat(sptForm.blowCount)) || parseFloat(sptForm.blowCount) < 0) { errs.blowCount = "击数必须为非负数"; }
    return { valid: Object.keys(errs).length === 0, errors: errs };
  }, [sptForm]);

  const handleSPTInputChange = (field: keyof Omit<SPTRecord, "id" | "layerId">, value: string | boolean) => {
    setSPTForm(prev => ({ ...prev, [field]: value }));
    if (sptErrors[field]) setSPTErrors(prev => ({ ...prev, [field]: undefined }));
    if (sptValidationMessage) setSPTValidationMessage("");
  };

  const handleAddSPTRecord = () => {
    setSPTValidationMessage("");
    const { valid, errors: formErrors } = validateSPTForm();
    setSPTErrors(formErrors);
    if (!valid) return;
    const depth = parseFloat(sptForm.depth);
    const { valid: depthValid, message, layer } = checkDepthInLayers(depth);
    if (!depthValid) { setSPTValidationMessage(message); return; }
    if (!selectedBorehole || !layer) return;
    setSPTRecords(prev => ({ ...prev, [selectedBorehole]: [...(prev[selectedBorehole] || []), { ...sptForm, id: generateId(), layerId: layer.id }] }));
    setSPTForm(emptySPTForm); setSPTErrors({}); setSPTValidationMessage("");
  };

  const handleUpdateSPTRecord = () => {
    setSPTValidationMessage("");
    const { valid, errors: formErrors } = validateSPTForm();
    setSPTErrors(formErrors);
    if (!valid || !editingSPTId || !selectedBorehole) return;
    const depth = parseFloat(sptForm.depth);
    const { valid: depthValid, message, layer } = checkDepthInLayers(depth);
    if (!depthValid) { setSPTValidationMessage(message); return; }
    if (!layer) return;
    setSPTRecords(prev => ({ ...prev, [selectedBorehole]: prev[selectedBorehole].map(r => r.id === editingSPTId ? { ...sptForm, id: editingSPTId, layerId: layer.id } : r) }));
    setSPTForm(emptySPTForm); setEditingSPTId(null); setSPTErrors({}); setSPTValidationMessage("");
  };

  const handleEditSPTRecord = (record: SPTRecord) => {
    setSPTForm({ depth: record.depth, blowCount: record.blowCount, isAbnormal: record.isAbnormal, remark: record.remark });
    setEditingSPTId(record.id); setSPTErrors({}); setSPTValidationMessage("");
  };

  const handleDeleteSPTRecord = (recordId: string) => {
    if (!selectedBorehole) return;
    setSPTRecords(prev => ({ ...prev, [selectedBorehole]: prev[selectedBorehole].filter(r => r.id !== recordId) }));
    if (editingSPTId === recordId) { setSPTForm(emptySPTForm); setEditingSPTId(null); }
  };

  const handleCancelSPTEdit = () => { setSPTForm(emptySPTForm); setEditingSPTId(null); setSPTErrors({}); setSPTValidationMessage(""); };

  const validateSamplingForm = useCallback((): { valid: boolean; errors: Partial<Record<keyof SamplingRecord, string>> } => {
    const errs: Partial<Record<keyof SamplingRecord, string>> = {};
    if (!samplingForm.depth.trim()) { errs.depth = "深度不能为空"; }
    else if (isNaN(parseFloat(samplingForm.depth)) || parseFloat(samplingForm.depth) < 0) { errs.depth = "深度必须为非负数"; }
    if (!samplingForm.sampleType.trim()) { errs.sampleType = "取样类型不能为空"; }
    if (!samplingForm.sampleNumber.trim()) { errs.sampleNumber = "样号不能为空"; }
    return { valid: Object.keys(errs).length === 0, errors: errs };
  }, [samplingForm]);

  const handleSamplingInputChange = (field: keyof Omit<SamplingRecord, "id" | "layerId">, value: string) => {
    setSamplingForm(prev => ({ ...prev, [field]: value }));
    if (samplingErrors[field]) setSamplingErrors(prev => ({ ...prev, [field]: undefined }));
    if (samplingValidationMessage) setSamplingValidationMessage("");
  };

  const handleAddSamplingRecord = () => {
    setSamplingValidationMessage("");
    const { valid, errors: formErrors } = validateSamplingForm();
    setSamplingErrors(formErrors);
    if (!valid) return;
    const depth = parseFloat(samplingForm.depth);
    const { valid: depthValid, message, layer } = checkDepthInLayers(depth);
    if (!depthValid) { setSamplingValidationMessage(message); return; }
    if (!selectedBorehole || !layer) return;
    setSamplingRecords(prev => ({ ...prev, [selectedBorehole]: [...(prev[selectedBorehole] || []), { ...samplingForm, id: generateId(), layerId: layer.id }] }));
    setSamplingForm(emptySamplingForm); setSamplingErrors({}); setSamplingValidationMessage("");
  };

  const handleUpdateSamplingRecord = () => {
    setSamplingValidationMessage("");
    const { valid, errors: formErrors } = validateSamplingForm();
    setSamplingErrors(formErrors);
    if (!valid || !editingSamplingId || !selectedBorehole) return;
    const depth = parseFloat(samplingForm.depth);
    const { valid: depthValid, message, layer } = checkDepthInLayers(depth);
    if (!depthValid) { setSamplingValidationMessage(message); return; }
    if (!layer) return;
    setSamplingRecords(prev => ({ ...prev, [selectedBorehole]: prev[selectedBorehole].map(r => r.id === editingSamplingId ? { ...samplingForm, id: editingSamplingId, layerId: layer.id } : r) }));
    setSamplingForm(emptySamplingForm); setEditingSamplingId(null); setSamplingErrors({}); setSamplingValidationMessage("");
  };

  const handleEditSamplingRecord = (record: SamplingRecord) => {
    setSamplingForm({ depth: record.depth, sampleType: record.sampleType, sampleNumber: record.sampleNumber, remark: record.remark });
    setEditingSamplingId(record.id); setSamplingErrors({}); setSamplingValidationMessage("");
  };

  const handleDeleteSamplingRecord = (recordId: string) => {
    if (!selectedBorehole) return;
    setSamplingRecords(prev => ({ ...prev, [selectedBorehole]: prev[selectedBorehole].filter(r => r.id !== recordId) }));
    if (editingSamplingId === recordId) { setSamplingForm(emptySamplingForm); setEditingSamplingId(null); }
  };

  const handleCancelSamplingEdit = () => { setSamplingForm(emptySamplingForm); setEditingSamplingId(null); setSamplingErrors({}); setSamplingValidationMessage(""); };

  const validateWaterLevelForm = useCallback((): { valid: boolean; errors: Partial<Record<keyof WaterLevelRecord, string>> } => {
    const errs: Partial<Record<keyof WaterLevelRecord, string>> = {};
    if (!waterLevelForm.firstSeenLevel.trim()) { errs.firstSeenLevel = "初见水位不能为空"; }
    else if (isNaN(parseFloat(waterLevelForm.firstSeenLevel)) || parseFloat(waterLevelForm.firstSeenLevel) < 0) { errs.firstSeenLevel = "初见水位必须为非负数"; }
    if (waterLevelForm.stableLevel.trim()) {
      if (isNaN(parseFloat(waterLevelForm.stableLevel)) || parseFloat(waterLevelForm.stableLevel) < 0) { errs.stableLevel = "稳定水位必须为非负数"; }
    }
    if (!waterLevelForm.observationTime.trim()) { errs.observationTime = "观测时间不能为空"; }
    return { valid: Object.keys(errs).length === 0, errors: errs };
  }, [waterLevelForm]);

  const handleWaterLevelInputChange = (field: keyof Omit<WaterLevelRecord, "id">, value: string) => {
    setWaterLevelForm(prev => ({ ...prev, [field]: value }));
    if (waterLevelErrors[field]) setWaterLevelErrors(prev => ({ ...prev, [field]: undefined }));
    if (waterLevelValidationMessage) setWaterLevelValidationMessage("");
  };

  const handleAddWaterLevelRecord = () => {
    setWaterLevelValidationMessage("");
    const { valid, errors: formErrors } = validateWaterLevelForm();
    setWaterLevelErrors(formErrors);
    if (!valid) return;
    if (!selectedBorehole) return;
    const newRecord: WaterLevelRecord = { ...waterLevelForm, id: generateId() };
    setWaterLevelRecords(prev => ({ ...prev, [selectedBorehole]: [...(prev[selectedBorehole] || []), newRecord] }));
    setWaterLevelForm(emptyWaterLevelForm); setWaterLevelErrors({}); setWaterLevelValidationMessage("");
  };

  const handleUpdateWaterLevelRecord = () => {
    setWaterLevelValidationMessage("");
    const { valid, errors: formErrors } = validateWaterLevelForm();
    setWaterLevelErrors(formErrors);
    if (!valid || !editingWaterLevelId || !selectedBorehole) return;
    setWaterLevelRecords(prev => ({ ...prev, [selectedBorehole]: prev[selectedBorehole].map(r => r.id === editingWaterLevelId ? { ...waterLevelForm, id: editingWaterLevelId } : r) }));
    setWaterLevelForm(emptyWaterLevelForm); setEditingWaterLevelId(null); setWaterLevelErrors({}); setWaterLevelValidationMessage("");
  };

  const handleEditWaterLevelRecord = (record: WaterLevelRecord) => {
    setWaterLevelForm({ firstSeenLevel: record.firstSeenLevel, stableLevel: record.stableLevel, observationTime: record.observationTime, weatherRemark: record.weatherRemark });
    setEditingWaterLevelId(record.id); setWaterLevelErrors({}); setWaterLevelValidationMessage("");
  };

  const handleDeleteWaterLevelRecord = (recordId: string) => {
    if (!selectedBorehole) return;
    setWaterLevelRecords(prev => ({ ...prev, [selectedBorehole]: prev[selectedBorehole].filter(r => r.id !== recordId) }));
    if (editingWaterLevelId === recordId) { setWaterLevelForm(emptyWaterLevelForm); setEditingWaterLevelId(null); }
  };

  const handleCancelWaterLevelEdit = () => { setWaterLevelForm(emptyWaterLevelForm); setEditingWaterLevelId(null); setWaterLevelErrors({}); setWaterLevelValidationMessage(""); };

  const handleSelectBorehole = (boreholeId: string) => {
    setSelectedBorehole(boreholeId);
    setLayerForm(emptyLayerForm); setEditingLayerId(null); setLayerErrors({}); setLayerValidationMessage("");
    setSPTForm(emptySPTForm); setEditingSPTId(null); setSPTErrors({}); setSPTValidationMessage("");
    setSamplingForm(emptySamplingForm); setEditingSamplingId(null); setSamplingErrors({}); setSamplingValidationMessage("");
    setWaterLevelForm(emptyWaterLevelForm); setEditingWaterLevelId(null); setWaterLevelErrors({}); setWaterLevelValidationMessage("");
  };

  useEffect(() => {
    if (sortedLayers.length === 0 || holeDepth === 0) { setGapMessage(""); return; }
    const gaps: string[] = [];
    let prevEnd = 0;
    for (const layer of sortedLayers) {
      const ls = parseFloat(layer.startDepth);
      if (ls > prevEnd + 0.001) gaps.push(`${prevEnd.toFixed(2)}m ~ ${ls.toFixed(2)}m`);
      prevEnd = Math.max(prevEnd, parseFloat(layer.endDepth));
    }
    if (prevEnd < holeDepth - 0.001) gaps.push(`${prevEnd.toFixed(2)}m ~ ${holeDepth.toFixed(2)}m`);
    setGapMessage(gaps.length > 0 ? `存在缺口区间：${gaps.join("、")}` : "");
  }, [sortedLayers, holeDepth]);

  const filteredRecords = useMemo(() => {
    if (!activeFilter) return records;
    return records.filter(r => r["岩性分类"] === activeFilter);
  }, [records, activeFilter]);

  const metrics = useMemo(() => {
    const totalDepth = filteredRecords.reduce((sum, r) => sum + (parseFloat(r["孔深"]) || 0), 0);
    let totalSPT = 0;
    let maxSPT = 0;
    let minStableLevel = Infinity;
    let hasWaterLevelData = false;
    filteredRecords.forEach(r => {
      const bhSPT = sptRecords[r["钻孔编号"]] || [];
      totalSPT += bhSPT.length;
      bhSPT.forEach(spt => { const blow = parseFloat(spt.blowCount); if (!isNaN(blow) && blow > maxSPT) maxSPT = blow; });
      const stableLevel = getLatestStableWaterLevel(r["钻孔编号"]);
      if (stableLevel) {
        const level = parseFloat(stableLevel);
        if (!isNaN(level) && level < minStableLevel) {
          minStableLevel = level;
          hasWaterLevelData = true;
        }
      }
    });
    return [
      totalDepth.toFixed(1) + "m",
      String(totalSPT) + "次",
      String(maxSPT) + "击",
      hasWaterLevelData ? minStableLevel.toFixed(1) + "m" : "-"
    ];
  }, [filteredRecords, sptRecords, getLatestStableWaterLevel]);

  const summaryStats = useMemo(() => {
    const targetRecords = activeFilter ? filteredRecords : records;
    const totalDepth = targetRecords.reduce((sum, r) => sum + (parseFloat(r["孔深"]) || 0), 0);
    const recordCount = targetRecords.length;
    let maxSPT = 0;
    let totalSPTCount = 0;
    let totalSamplingCount = 0;
    targetRecords.forEach(r => {
      const bhSPT = sptRecords[r["钻孔编号"]] || [];
      totalSPTCount += bhSPT.length;
      bhSPT.forEach(spt => { const blow = parseFloat(spt.blowCount); if (!isNaN(blow) && blow > maxSPT) maxSPT = blow; });
      const bhSampling = samplingRecords[r["钻孔编号"]] || [];
      totalSamplingCount += bhSampling.length;
    });
    let minWaterLevel = Infinity;
    let hasWaterLevelData = false;
    targetRecords.forEach(r => {
      const stableLevel = getLatestStableWaterLevel(r["钻孔编号"]);
      if (stableLevel) {
        const level = parseFloat(stableLevel);
        if (!isNaN(level) && level < minWaterLevel) {
          minWaterLevel = level;
          hasWaterLevelData = true;
        }
      }
    });
    return { projectId: project.id, recordCount, totalDepth: totalDepth.toFixed(1) + "m", maxSPT: String(maxSPT) + "击", minWaterLevel: hasWaterLevelData ? minWaterLevel.toFixed(1) + "m" : "-", totalSPTCount, totalSamplingCount };
  }, [records, filteredRecords, activeFilter, sptRecords, samplingRecords, getLatestStableWaterLevel]);

  const getBoreholeMaxSPT = useCallback((boreholeId: string): string => {
    const bhSPT = sptRecords[boreholeId] || [];
    if (bhSPT.length === 0) return "-";
    let max = 0;
    bhSPT.forEach(s => { const b = parseFloat(s.blowCount); if (!isNaN(b) && b > max) max = b; });
    return String(max);
  }, [sptRecords]);

  const generateTextSummary = useCallback(() => {
    const { projectId, recordCount, totalDepth, maxSPT, minWaterLevel, totalSPTCount, totalSamplingCount } = summaryStats;
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
    text += `标贯试验：${totalSPTCount}次（最高${maxSPT}）\n`;
    text += `取样数量：${totalSamplingCount}组\n`;
    text += `地下水位：${minWaterLevel}\n\n`;
    text += `【钻孔概况】\n`;
    text += `────────────────────────────\n`;
    targetRecords.forEach((r, i) => {
      const bhSPT = sptRecords[r["钻孔编号"]] || [];
      const bhSampling = samplingRecords[r["钻孔编号"]] || [];
      const wlDisplay = getWaterLevelDisplayText(r["钻孔编号"]);
      text += `${String(i + 1).padStart(2, "0")}. ${r["钻孔编号"]} | 孔深${r["孔深"]}m | ${r["岩性分类"]} | ${r["岩性描述"]} | 水位${wlDisplay}m | 标贯${bhSPT.length}次 | 取样${bhSampling.length}组\n`;
    });
    text += `\n【地层分层】\n`;
    text += `────────────────────────────\n`;
    targetRecords.forEach(r => {
      const bhLayers = boreholeLayers[r["钻孔编号"]] || [];
      if (bhLayers.length === 0) return;
      const sorted = [...bhLayers].sort((a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth));
      const bhSPT = sptRecords[r["钻孔编号"]] || [];
      const bhSampling = samplingRecords[r["钻孔编号"]] || [];
      text += `\n${r["钻孔编号"]}（共${sorted.length}层）：\n`;
      sorted.forEach((l, i) => {
        const thickness = (parseFloat(l.endDepth) - parseFloat(l.startDepth)).toFixed(2);
        const layerSPT = bhSPT.filter(s => s.layerId === l.id).length;
        const layerSampling = bhSampling.filter(s => s.layerId === l.id).length;
        text += `  ${String(i + 1).padStart(2, "0")}. ${l.lithology} | ${l.startDepth}~${l.endDepth}m | 厚度${thickness}m | ${l.description || "无描述"} | 标贯${layerSPT}次 | 取样${layerSampling}组\n`;
      });
    });
    text += `\n【标贯明细】\n`;
    text += `────────────────────────────\n`;
    targetRecords.forEach(r => {
      const bhSPT = sptRecords[r["钻孔编号"]] || [];
      if (bhSPT.length === 0) return;
      const sortedSPT = [...bhSPT].sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth));
      const maxBlow = Math.max(...sortedSPT.map(s => parseInt(s.blowCount) || 0));
      const abnormalCount = sortedSPT.filter(s => s.isAbnormal).length;
      text += `\n${r["钻孔编号"]}（共${sortedSPT.length}次，最高${maxBlow}击，异常${abnormalCount}点）：\n`;
      sortedSPT.forEach((s, i) => {
        const litho = (boreholeLayers[r["钻孔编号"]] || []).find(l => l.id === s.layerId);
        text += `  ${String(i + 1).padStart(2, "0")}. 深度 ${s.depth}m | 击数 ${s.blowCount}${s.isAbnormal ? "（异常）" : ""} | 岩性：${litho ? litho.lithology : "-"}${s.remark ? " | 备注：" + s.remark : ""}\n`;
      });
    });
    text += `\n【取样明细】\n`;
    text += `────────────────────────────\n`;
    targetRecords.forEach(r => {
      const bhSampling = samplingRecords[r["钻孔编号"]] || [];
      if (bhSampling.length === 0) return;
      const sortedSampling = [...bhSampling].sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth));
      const typeMap = sortedSampling.reduce((acc, s) => { acc[s.sampleType] = (acc[s.sampleType] || 0) + 1; return acc; }, {} as Record<string, number>);
      const typeSummary = Object.entries(typeMap).map(([k, v]) => `${k}${v}组`).join("、");
      text += `\n${r["钻孔编号"]}（共${sortedSampling.length}组，${typeSummary}）：\n`;
      sortedSampling.forEach((s, i) => {
        const litho = (boreholeLayers[r["钻孔编号"]] || []).find(l => l.id === s.layerId);
        text += `  ${String(i + 1).padStart(2, "0")}. 深度 ${s.depth}m | ${s.sampleType} | 编号：${s.sampleNumber} | 岩性：${litho ? litho.lithology : "-"}${s.remark ? " | 备注：" + s.remark : ""}\n`;
      });
    });
    text += `\n【水位观测明细】\n`;
    text += `────────────────────────────\n`;
    targetRecords.forEach(r => {
      const bhWL = waterLevelRecords[r["钻孔编号"]] || [];
      if (bhWL.length === 0) {
        text += `\n${r["钻孔编号"]}：暂无水位观测记录\n`;
        return;
      }
      const sortedWL = [...bhWL].sort((a, b) => {
        const timeA = a.observationTime ? new Date(a.observationTime).getTime() : 0;
        const timeB = b.observationTime ? new Date(b.observationTime).getTime() : 0;
        return timeA - timeB;
      });
      const stableCount = sortedWL.filter(w => w.stableLevel && w.stableLevel.trim()).length;
      text += `\n${r["钻孔编号"]}（共${sortedWL.length}次观测，稳定水位${stableCount}次）：\n`;
      sortedWL.forEach((w, i) => {
        const status = w.stableLevel && w.stableLevel.trim() ? "稳定" : "初见";
        const level = w.stableLevel && w.stableLevel.trim() ? w.stableLevel : w.firstSeenLevel;
        text += `  ${String(i + 1).padStart(2, "0")}. ${w.observationTime || "时间未记录"} | 初见${w.firstSeenLevel || "-"}m | 稳定${w.stableLevel || "-"}m | ${status}${w.weatherRemark ? " | " + w.weatherRemark : ""}\n`;
      });
    });
    text += `────────────────────────────\n`;
    return text;
  }, [summaryStats, activeFilter, filteredRecords, records, sptRecords, samplingRecords, boreholeLayers, waterLevelRecords, getWaterLevelDisplayText]);

  const handleCopySummary = useCallback(async () => {
    const text = generateTextSummary();
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text; document.body.appendChild(textarea); textarea.select(); document.execCommand("copy"); document.body.removeChild(textarea);
      setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [generateTextSummary]);

  const handleInputChange = (field: FieldName, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<FieldName, string>> = {};
    project.fields.forEach(field => {
      if (!formData[field].trim()) newErrors[field] = `${field}不能为空`;
    });
    const hd = parseFloat(formData["孔深"]);
    if (formData["孔深"].trim() && (isNaN(hd) || hd < 0)) newErrors["孔深"] = "孔深不能为负数";
    const wl = parseFloat(formData["地下水位"]);
    if (formData["地下水位"].trim() && !isNaN(wl) && wl < 0) newErrors["地下水位"] = "地下水位不能为负数";
    if (formData["钻孔编号"].trim() && records.some(r => r["钻孔编号"] === formData["钻孔编号"].trim())) newErrors["钻孔编号"] = "钻孔编号已存在";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddRecord = () => {
    if (!validate()) return;
    const boreholeId = formData["钻孔编号"].trim();
    const trimmedRecord: DrillingRecord = {
      "钻孔编号": boreholeId, "孔深": formData["孔深"].trim(), "岩性分类": formData["岩性分类"].trim(),
      "岩性描述": formData["岩性描述"].trim(), "土色": formData["土色"].trim(), "地下水位": formData["地下水位"].trim()
    };
    setRecords(prev => [trimmedRecord, ...prev]);
    setBoreholeLayers(prev => ({ ...prev, [boreholeId]: [] }));
    setSPTRecords(prev => ({ ...prev, [boreholeId]: [] }));
    setSamplingRecords(prev => ({ ...prev, [boreholeId]: [] }));
    setWaterLevelRecords(prev => ({ ...prev, [boreholeId]: [] }));
    setFormData(emptyForm); setErrors({});
  };

  const allSPTForSummary = useMemo(() => {
    const targetRecords = activeFilter ? filteredRecords : records;
    const result: { boreholeId: string; depth: string; blowCount: string; isAbnormal: boolean; lithology: string; remark: string }[] = [];
    targetRecords.forEach(r => {
      const bhSPT = sptRecords[r["钻孔编号"]] || [];
      bhSPT.forEach(s => {
        const lithology = getLayerLithology(s.layerId);
        result.push({ boreholeId: r["钻孔编号"], depth: s.depth, blowCount: s.blowCount, isAbnormal: s.isAbnormal, lithology, remark: s.remark });
      });
    });
    return result.sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth));
  }, [records, filteredRecords, activeFilter, sptRecords, getLayerLithology]);

  const allSamplingForSummary = useMemo(() => {
    const targetRecords = activeFilter ? filteredRecords : records;
    const result: { boreholeId: string; depth: string; sampleType: string; sampleNumber: string; lithology: string; remark: string }[] = [];
    targetRecords.forEach(r => {
      const bhSampling = samplingRecords[r["钻孔编号"]] || [];
      bhSampling.forEach(s => {
        const lithology = getLayerLithology(s.layerId);
        result.push({ boreholeId: r["钻孔编号"], depth: s.depth, sampleType: s.sampleType, sampleNumber: s.sampleNumber, lithology, remark: s.remark });
      });
    });
    return result.sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth));
  }, [records, filteredRecords, activeFilter, samplingRecords, getLayerLithology]);

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
              <button key={filter} className={activeFilter === filter ? "filter-active" : ""} onClick={() => setActiveFilter(prev => prev === filter ? null : filter)}>
                {filter}
              </button>
            ))}
          </div>
        </aside>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>{project.domain}</p>
              <h2>新增钻孔</h2>
            </div>
            <button className="primary-action" onClick={handleAddRecord}>新增记录</button>
          </div>
          <div className="field-grid">
            {project.fields.map((field: FieldName) => (
              <label key={field}>
                <span>{field}</span>
                {field === "岩性分类" ? (
                  <select className={errors[field] ? "input-error" : ""} value={formData[field]} onChange={(e) => handleInputChange(field, e.target.value)}>
                    <option value="">选择岩性分类</option>
                    {project.filters.map((f: string) => (<option key={f} value={f}>{f}</option>))}
                  </select>
                ) : (
                  <input className={errors[field] ? "input-error" : ""} placeholder={"填写" + field} value={formData[field]} onChange={(e) => handleInputChange(field, e.target.value)} />
                )}
                {errors[field] && <em className="error-tip">{errors[field]}</em>}
              </label>
            ))}
          </div>

          {selectedBorehole && selectedRecord && (
            <div className="quick-overview">
              <div className="quick-overview-header">
                <h3>当前钻孔 · {selectedBorehole}</h3>
                <span className="quick-overview-sub">孔深 {selectedRecord["孔深"]}m · 水位 {getWaterLevelDisplayText(selectedBorehole)}m</span>
              </div>

              <div className="quick-stats">
                <div className="quick-stat-item">
                  <span className="quick-stat-label">标贯试验</span>
                  <strong className="quick-stat-value">{sortedSPTRecords.length}次</strong>
                  <span className="quick-stat-hint">最高 {sptStats.maxBlow}击</span>
                </div>
                <div className="quick-stat-item">
                  <span className="quick-stat-label">取样数量</span>
                  <strong className="quick-stat-value">{samplingStats.totalCount}组</strong>
                  <span className="quick-stat-hint">共 {Object.keys(samplingStats.typeBreakdown).length}类</span>
                </div>
                <div className="quick-stat-item">
                  <span className="quick-stat-label">地层分层</span>
                  <strong className="quick-stat-value">{sortedLayers.length}层</strong>
                  <span className="quick-stat-hint">最厚 {sortedLayers.length > 0 ? (parseFloat(sortedLayers.reduce((max, l) => parseFloat(l.endDepth) - parseFloat(l.startDepth) > parseFloat(max.endDepth) - parseFloat(max.startDepth) ? l : max, sortedLayers[0]).endDepth) - parseFloat(sortedLayers.reduce((max, l) => parseFloat(l.endDepth) - parseFloat(l.startDepth) > parseFloat(max.endDepth) - parseFloat(max.startDepth) ? l : max, sortedLayers[0]).startDepth)).toFixed(1) : 0}m</span>
                </div>
              </div>

              {sortedSPTRecords.length > 0 && (
                <div className="quick-spt-list">
                  <h4>标贯点位</h4>
                  <div className="quick-spt-items">
                    {sortedSPTRecords.slice(0, 5).map(s => (
                      <div key={s.id} className={`quick-spt-item ${s.isAbnormal ? "is-abnormal" : ""}`}>
                        <span className="qs-depth">{s.depth}m</span>
                        <span className="qs-blow">{s.blowCount}击</span>
                        <span className="qs-litho">{getLayerLithology(s.layerId)}</span>
                        {s.isAbnormal && <span className="qs-badge">异常</span>}
                      </div>
                    ))}
                    {sortedSPTRecords.length > 5 && (
                      <div className="quick-more">还有 {sortedSPTRecords.length - 5} 条记录 →</div>
                    )}
                  </div>
                </div>
              )}

              {sortedSamplingRecords.length > 0 && (
                <div className="quick-spt-list">
                  <h4>取样记录</h4>
                  <div className="quick-spt-items">
                    {sortedSamplingRecords.slice(0, 4).map(s => (
                      <div key={s.id} className="quick-sampling-item">
                        <span className="qs-depth">{s.depth}m</span>
                        <span className="sample-type-badge">{s.sampleType}</span>
                        <span className="qs-no">{s.sampleNumber}</span>
                      </div>
                    ))}
                    {sortedSamplingRecords.length > 4 && (
                      <div className="quick-more">还有 {sortedSamplingRecords.length - 4} 条记录 →</div>
                    )}
                  </div>
                </div>
              )}

              {latestWaterLevel && (
                <div className="quick-spt-list">
                  <h4>最新水位观测</h4>
                  <div className="water-level-latest-card">
                    <div className="wl-latest-row">
                      <div className="wl-latest-item">
                        <span className="wl-label">初见水位</span>
                        <strong className="wl-value">{latestWaterLevel.firstSeenLevel || "-"}m</strong>
                      </div>
                      <div className="wl-latest-item">
                        <span className="wl-label">稳定水位</span>
                        <strong className={`wl-value ${!latestWaterLevel.stableLevel ? "wl-pending" : ""}`}>
                          {latestWaterLevel.stableLevel || "待稳定"}m
                        </strong>
                      </div>
                    </div>
                    <div className="wl-latest-meta">
                      <span className="wl-time">{latestWaterLevel.observationTime || "时间未记录"}</span>
                      {latestWaterLevel.weatherRemark && (
                        <span className="wl-weather">{latestWaterLevel.weatherRemark}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {sortedWaterLevelRecords.length === 0 && (
                <div className="quick-spt-list">
                  <h4>水位观测</h4>
                  <div className="water-level-empty">暂无水位观测记录</div>
                </div>
              )}
            </div>
          )}
        </section>
      </section>

      <section className="records-section">
        <div className="panel borehole-list-panel">
          <div className="section-heading">
            <div>
              <p>钻孔数据</p>
              <h2>选择钻孔</h2>
            </div>
            <button onClick={() => setShowPreview(true)}>导出摘要</button>
          </div>
          <div className="borehole-list">
            {filteredRecords.map((record, index: number) => {
              const bhSPT = sptRecords[record["钻孔编号"]] || [];
              const bhSampling = samplingRecords[record["钻孔编号"]] || [];
              return (
                <article key={record["钻孔编号"] + "-" + index} className={`borehole-item ${selectedBorehole === record["钻孔编号"] ? "borehole-selected" : ""}`} onClick={() => handleSelectBorehole(record["钻孔编号"])}>
                  <div className="borehole-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="borehole-info">
                    <h3>{record["钻孔编号"]} <span className="tag">{record["岩性分类"]}</span></h3>
                    <p>孔深{record["孔深"]}m · 标贯{bhSPT.length}次 · 取样{bhSampling.length}组</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <div className="panel layer-editor-panel">
          <div className="section-heading">
            <div>
              <p>地层分层</p>
              <h2>
                {selectedBorehole ? `${selectedBorehole} · 分层编辑器` : "请选择钻孔"}
                {selectedRecord && <span className="hole-depth-tag">孔深 {selectedRecord["孔深"]}m</span>}
              </h2>
            </div>
          </div>

          {selectedBorehole ? (
            <div className="layer-editor-container">
              <div className="stratum-column">
                <div className="column-header"><span>深度(m)</span></div>
                <div className="column-body">
                  {sortedLayers.length > 0 ? (
                    sortedLayers.map((layer, idx) => {
                      const start = parseFloat(layer.startDepth);
                      const end = parseFloat(layer.endDepth);
                      const thickness = end - start;
                      const topPercent = (start / holeDepth) * 100;
                      const heightPercent = (thickness / holeDepth) * 100;
                      return (
                        <div key={layer.id} className={`stratum-layer litho-${idx % 6}`} style={{ top: `${topPercent}%`, height: `${heightPercent}%` }} onClick={() => handleEditLayer(layer)}>
                          <span className="layer-depth-top">{layer.startDepth}</span>
                          <span className="layer-name">{layer.lithology}</span>
                          <span className="layer-depth-bottom">{layer.endDepth}</span>
                        </div>
                      );
                    })
                  ) : (<div className="column-empty">暂无分层数据</div>)}
                  <div className="column-scale">
                    {[0, 25, 50, 75, 100].map(pct => (<span key={pct} style={{ top: `${pct}%` }}>{((holeDepth * pct) / 100).toFixed(1)}</span>))}
                  </div>
                  {sortedSPTRecords.map(record => {
                    const depth = parseFloat(record.depth);
                    const topPercent = holeDepth > 0 ? (depth / holeDepth) * 100 : 0;
                    return (
                      <div key={record.id} className={`spt-marker ${record.isAbnormal ? "spt-abnormal" : ""}`} style={{ top: `${topPercent}%` }} title={`标贯 深度${record.depth}m · ${record.blowCount}击${record.isAbnormal ? " · 异常" : ""}${record.remark ? " · " + record.remark : ""}`}>
                        <span>{record.blowCount}</span>
                      </div>
                    );
                  })}
                  {sortedSamplingRecords.map(record => {
                    const depth = parseFloat(record.depth);
                    const topPercent = holeDepth > 0 ? (depth / holeDepth) * 100 : 0;
                    return (
                      <div key={record.id} className="sampling-marker" style={{ top: `${topPercent}%` }} title={`取样 深度${record.depth}m · ${record.sampleType} · ${record.sampleNumber}${record.remark ? " · " + record.remark : ""}`}>
                        <span>取</span>
                      </div>
                    );
                  })}
                  {latestWaterLevel && (latestWaterLevel.stableLevel || latestWaterLevel.firstSeenLevel) && (() => {
                    const level = latestWaterLevel.stableLevel || latestWaterLevel.firstSeenLevel;
                    const depth = parseFloat(level);
                    const topPercent = holeDepth > 0 ? (depth / holeDepth) * 100 : 0;
                    const isStable = latestWaterLevel.stableLevel && latestWaterLevel.stableLevel.trim();
                    return (
                      <div
                        key="water-level-marker"
                        className={`water-level-marker ${isStable ? "wl-stable" : "wl-first-seen"}`}
                        style={{ top: `${topPercent}%` }}
                        title={`${isStable ? "稳定水位" : "初见水位"} ${level}m${latestWaterLevel.observationTime ? " · " + latestWaterLevel.observationTime : ""}${latestWaterLevel.weatherRemark ? " · " + latestWaterLevel.weatherRemark : ""}`}
                      >
                        <span>水</span>
                        <span className="wl-marker-level">{level}m</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="layer-form-section">
                <h3>{editingLayerId ? "编辑分层" : "新增分层"}</h3>
                <div className="layer-form-grid">
                  <label><span>起始深度 (m)</span><input type="number" step="0.1" className={layerErrors.startDepth ? "input-error" : ""} placeholder="起始深度" value={layerForm.startDepth} onChange={(e) => handleLayerInputChange("startDepth", e.target.value)} />{layerErrors.startDepth && <em className="error-tip">{layerErrors.startDepth}</em>}</label>
                  <label><span>终止深度 (m)</span><input type="number" step="0.1" className={layerErrors.endDepth ? "input-error" : ""} placeholder="终止深度" value={layerForm.endDepth} onChange={(e) => handleLayerInputChange("endDepth", e.target.value)} />{layerErrors.endDepth && <em className="error-tip">{layerErrors.endDepth}</em>}</label>
                  <label><span>岩性</span><select className={layerErrors.lithology ? "input-error" : ""} value={layerForm.lithology} onChange={(e) => handleLayerInputChange("lithology", e.target.value)}><option value="">选择岩性</option>{lithologyOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select>{layerErrors.lithology && <em className="error-tip">{layerErrors.lithology}</em>}</label>
                  <label><span>土色</span><select className={layerErrors.soilColor ? "input-error" : ""} value={layerForm.soilColor} onChange={(e) => handleLayerInputChange("soilColor", e.target.value)}><option value="">选择土色</option>{soilColorOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select>{layerErrors.soilColor && <em className="error-tip">{layerErrors.soilColor}</em>}</label>
                  <label><span>密实度/状态</span><select className={layerErrors.density ? "input-error" : ""} value={layerForm.density} onChange={(e) => handleLayerInputChange("density", e.target.value)}><option value="">选择密实度/状态</option>{densityOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select>{layerErrors.density && <em className="error-tip">{layerErrors.density}</em>}</label>
                  <label className="full-width"><span>描述</span><input placeholder="分层描述" value={layerForm.description} onChange={(e) => handleLayerInputChange("description", e.target.value)} /></label>
                </div>
                {layerValidationMessage && (<div className="layer-validation-error">{layerValidationMessage}</div>)}
                {gapMessage && sortedLayers.length > 0 && (<div className="layer-gap-warning">{gapMessage}</div>)}
                <div className="layer-form-actions">
                  {editingLayerId ? (<><button className="secondary-btn" onClick={handleCancelEdit}>取消</button><button className="primary-action" onClick={handleUpdateLayer}>更新分层</button></>) : (<button className="primary-action" onClick={handleAddLayer}>添加分层</button>)}
                </div>

                <div className="layer-list-section">
                  <h4>分层列表</h4>
                  <div className="layer-table-wrapper">
                    <table className="layer-table">
                      <thead><tr><th>序号</th><th>深度范围(m)</th><th>岩性</th><th>土色</th><th>密实度</th><th>描述</th><th>操作</th></tr></thead>
                      <tbody>
                        {sortedLayers.map((layer, idx) => (
                          <tr key={layer.id} className={editingLayerId === layer.id ? "editing-row" : ""}>
                            <td>{idx + 1}</td>
                            <td><strong>{layer.startDepth} ~ {layer.endDepth}</strong></td>
                            <td><span className="tag">{layer.lithology}</span></td>
                            <td>{layer.soilColor}</td>
                            <td>{layer.density}</td>
                            <td className="layer-desc-cell">{layer.description}</td>
                            <td><button className="small-btn" onClick={() => handleEditLayer(layer)}>编辑</button><button className="small-btn danger-btn" onClick={() => handleDeleteLayer(layer.id)}>删除</button></td>
                          </tr>
                        ))}
                        {sortedLayers.length === 0 && (<tr><td colSpan={7} className="empty-row">暂无分层数据，请添加</td></tr>)}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="spt-section">
                  <div className="spt-stats">
                    <div className="spt-stat-card"><span>最高标贯</span><strong>{sptStats.maxBlow}击</strong><em>{sptStats.maxBlowLithology}</em></div>
                    <div className="spt-stat-card"><span>记录总数</span><strong>{sptStats.totalCount}次</strong><em>有效试验</em></div>
                    <div className="spt-stat-card"><span>异常点数</span><strong className={sptStats.abnormalCount > 0 ? "abnormal-count" : ""}>{sptStats.abnormalCount}个</strong><em>需复核</em></div>
                  </div>
                  <div className="spt-form-section">
                    <h4>{editingSPTId ? "编辑标贯记录" : "新增标贯记录"}</h4>
                    <div className="spt-form-grid">
                      <label><span>试验深度 (m)</span><input type="number" step="0.1" className={sptErrors.depth ? "input-error" : ""} placeholder="标贯试验深度" value={sptForm.depth} onChange={(e) => handleSPTInputChange("depth", e.target.value)} />{sptErrors.depth && <em className="error-tip">{sptErrors.depth}</em>}</label>
                      <label><span>标贯击数</span><input type="number" step="1" className={sptErrors.blowCount ? "input-error" : ""} placeholder="击数" value={sptForm.blowCount} onChange={(e) => handleSPTInputChange("blowCount", e.target.value)} />{sptErrors.blowCount && <em className="error-tip">{sptErrors.blowCount}</em>}</label>
                      <label className="checkbox-label"><span>是否异常</span><div className="checkbox-wrapper"><input type="checkbox" checked={sptForm.isAbnormal} onChange={(e) => handleSPTInputChange("isAbnormal", e.target.checked)} /><span className="checkbox-text">{sptForm.isAbnormal ? "是（需复核）" : "否（正常）"}</span></div></label>
                      <label className="full-width"><span>备注</span><input placeholder="异常原因或其他说明" value={sptForm.remark} onChange={(e) => handleSPTInputChange("remark", e.target.value)} /></label>
                    </div>
                    {sptValidationMessage && (<div className="spt-validation-error">{sptValidationMessage}</div>)}
                    <div className="spt-form-actions">
                      {editingSPTId ? (<><button className="secondary-btn" onClick={handleCancelSPTEdit}>取消</button><button className="primary-action" onClick={handleUpdateSPTRecord}>更新记录</button></>) : (<button className="primary-action" onClick={handleAddSPTRecord}>添加标贯记录</button>)}
                    </div>
                  </div>
                  <div className="spt-list-section">
                    <h4>标贯记录列表</h4>
                    <div className="spt-table-wrapper">
                      <table className="spt-table">
                        <thead><tr><th>序号</th><th>深度(m)</th><th>击数</th><th>岩性</th><th>状态</th><th>备注</th><th>操作</th></tr></thead>
                        <tbody>
                          {sortedSPTRecords.map((record, idx) => (
                            <tr key={record.id} className={editingSPTId === record.id ? "editing-row" : ""}>
                              <td>{idx + 1}</td>
                              <td><strong>{record.depth}</strong></td>
                              <td><span className={`blow-count ${record.isAbnormal ? "blow-abnormal" : ""}`}>{record.blowCount}</span></td>
                              <td><span className="tag">{getLayerLithology(record.layerId)}</span></td>
                              <td>{record.isAbnormal ? <span className="status-badge status-abnormal">异常</span> : <span className="status-badge status-normal">正常</span>}</td>
                              <td className="spt-remark-cell">{record.remark || "-"}</td>
                              <td><button className="small-btn" onClick={() => handleEditSPTRecord(record)}>编辑</button><button className="small-btn danger-btn" onClick={() => handleDeleteSPTRecord(record.id)}>删除</button></td>
                            </tr>
                          ))}
                          {sortedSPTRecords.length === 0 && (<tr><td colSpan={7} className="empty-row">暂无标贯记录，请添加</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="sampling-section">
                  <div className="spt-stats">
                    <div className="spt-stat-card"><span>取样总数</span><strong>{samplingStats.totalCount}组</strong><em>现场取样</em></div>
                    {Object.entries(samplingStats.typeBreakdown).map(([type, count]) => (
                      <div key={type} className="spt-stat-card"><span>{type}</span><strong>{count}组</strong><em>占比{samplingStats.totalCount > 0 ? Math.round(count / samplingStats.totalCount * 100) : 0}%</em></div>
                    ))}
                  </div>
                  <div className="spt-form-section">
                    <h4>{editingSamplingId ? "编辑取样记录" : "新增取样记录"}</h4>
                    <div className="spt-form-grid">
                      <label><span>取样深度 (m)</span><input type="number" step="0.1" className={samplingErrors.depth ? "input-error" : ""} placeholder="取样深度" value={samplingForm.depth} onChange={(e) => handleSamplingInputChange("depth", e.target.value)} />{samplingErrors.depth && <em className="error-tip">{samplingErrors.depth}</em>}</label>
                      <label><span>取样类型</span><select className={samplingErrors.sampleType ? "input-error" : ""} value={samplingForm.sampleType} onChange={(e) => handleSamplingInputChange("sampleType", e.target.value)}><option value="">选择取样类型</option>{sampleTypeOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select>{samplingErrors.sampleType && <em className="error-tip">{samplingErrors.sampleType}</em>}</label>
                      <label><span>样号</span><input className={samplingErrors.sampleNumber ? "input-error" : ""} placeholder="如 ZK18-1" value={samplingForm.sampleNumber} onChange={(e) => handleSamplingInputChange("sampleNumber", e.target.value)} />{samplingErrors.sampleNumber && <em className="error-tip">{samplingErrors.sampleNumber}</em>}</label>
                      <label className="full-width"><span>备注</span><input placeholder="RQD或其他说明" value={samplingForm.remark} onChange={(e) => handleSamplingInputChange("remark", e.target.value)} /></label>
                    </div>
                    {samplingValidationMessage && (<div className="spt-validation-error">{samplingValidationMessage}</div>)}
                    <div className="spt-form-actions">
                      {editingSamplingId ? (<><button className="secondary-btn" onClick={handleCancelSamplingEdit}>取消</button><button className="primary-action" onClick={handleUpdateSamplingRecord}>更新取样</button></>) : (<button className="primary-action" onClick={handleAddSamplingRecord}>添加取样记录</button>)}
                    </div>
                  </div>
                  <div className="spt-list-section">
                    <h4>取样记录列表</h4>
                    <div className="spt-table-wrapper">
                      <table className="spt-table">
                        <thead><tr><th>序号</th><th>深度(m)</th><th>类型</th><th>样号</th><th>岩性</th><th>备注</th><th>操作</th></tr></thead>
                        <tbody>
                          {sortedSamplingRecords.map((record, idx) => (
                            <tr key={record.id} className={editingSamplingId === record.id ? "editing-row" : ""}>
                              <td>{idx + 1}</td>
                              <td><strong>{record.depth}</strong></td>
                              <td><span className="sample-type-badge">{record.sampleType}</span></td>
                              <td>{record.sampleNumber}</td>
                              <td><span className="tag">{getLayerLithology(record.layerId)}</span></td>
                              <td className="spt-remark-cell">{record.remark || "-"}</td>
                              <td><button className="small-btn" onClick={() => handleEditSamplingRecord(record)}>编辑</button><button className="small-btn danger-btn" onClick={() => handleDeleteSamplingRecord(record.id)}>删除</button></td>
                            </tr>
                          ))}
                          {sortedSamplingRecords.length === 0 && (<tr><td colSpan={7} className="empty-row">暂无取样记录，请添加</td></tr>)}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="water-level-section">
                  <div className="spt-stats">
                    <div className="spt-stat-card">
                      <span>观测次数</span>
                      <strong>{sortedWaterLevelRecords.length}次</strong>
                      <em>水位观测</em>
                    </div>
                    <div className="spt-stat-card">
                      <span>初见水位</span>
                      <strong className={latestWaterLevel && !latestWaterLevel.stableLevel ? "wl-pending" : ""}>
                        {latestWaterLevel?.firstSeenLevel || "-"}m
                      </strong>
                      <em>{latestWaterLevel?.stableLevel ? "已稳定" : latestWaterLevel ? "待稳定" : "未观测"}</em>
                    </div>
                    <div className="spt-stat-card">
                      <span>稳定水位</span>
                      <strong className={!latestWaterLevel?.stableLevel ? "wl-pending" : ""}>
                        {latestWaterLevel?.stableLevel || "-"}m
                      </strong>
                      <em>最新数据</em>
                    </div>
                  </div>
                  <div className="spt-form-section">
                    <h4>{editingWaterLevelId ? "编辑水位观测" : "新增水位观测"}</h4>
                    <div className="spt-form-grid">
                      <label>
                        <span>初见水位 (m)</span>
                        <input
                          type="number"
                          step="0.1"
                          className={waterLevelErrors.firstSeenLevel ? "input-error" : ""}
                          placeholder="初见水位埋深"
                          value={waterLevelForm.firstSeenLevel}
                          onChange={(e) => handleWaterLevelInputChange("firstSeenLevel", e.target.value)}
                        />
                        {waterLevelErrors.firstSeenLevel && <em className="error-tip">{waterLevelErrors.firstSeenLevel}</em>}
                      </label>
                      <label>
                        <span>稳定水位 (m)</span>
                        <input
                          type="number"
                          step="0.1"
                          className={waterLevelErrors.stableLevel ? "input-error" : ""}
                          placeholder="稳定后水位（可选）"
                          value={waterLevelForm.stableLevel}
                          onChange={(e) => handleWaterLevelInputChange("stableLevel", e.target.value)}
                        />
                        {waterLevelErrors.stableLevel && <em className="error-tip">{waterLevelErrors.stableLevel}</em>}
                      </label>
                      <label>
                        <span>观测时间</span>
                        <input
                          type="datetime-local"
                          className={waterLevelErrors.observationTime ? "input-error" : ""}
                          value={waterLevelForm.observationTime.replace(" ", "T").slice(0, 16)}
                          onChange={(e) => handleWaterLevelInputChange("observationTime", e.target.value.replace("T", " "))}
                        />
                        {waterLevelErrors.observationTime && <em className="error-tip">{waterLevelErrors.observationTime}</em>}
                      </label>
                      <label className="full-width">
                        <span>天气/备注</span>
                        <input
                          placeholder="天气情况或其他备注"
                          value={waterLevelForm.weatherRemark}
                          onChange={(e) => handleWaterLevelInputChange("weatherRemark", e.target.value)}
                        />
                      </label>
                    </div>
                    {waterLevelValidationMessage && (<div className="spt-validation-error">{waterLevelValidationMessage}</div>)}
                    <div className="spt-form-actions">
                      {editingWaterLevelId ? (
                        <>
                          <button className="secondary-btn" onClick={handleCancelWaterLevelEdit}>取消</button>
                          <button className="primary-action" onClick={handleUpdateWaterLevelRecord}>更新记录</button>
                        </>
                      ) : (
                        <button className="primary-action" onClick={handleAddWaterLevelRecord}>添加水位观测</button>
                      )}
                    </div>
                  </div>
                  <div className="spt-list-section">
                    <h4>水位观测记录列表</h4>
                    <div className="spt-table-wrapper">
                      <table className="spt-table">
                        <thead>
                          <tr>
                            <th>序号</th>
                            <th>观测时间</th>
                            <th>初见水位</th>
                            <th>稳定水位</th>
                            <th>状态</th>
                            <th>天气/备注</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedWaterLevelRecords.map((record, idx) => (
                            <tr key={record.id} className={editingWaterLevelId === record.id ? "editing-row" : ""}>
                              <td>{idx + 1}</td>
                              <td><strong>{record.observationTime || "-"}</strong></td>
                              <td>{record.firstSeenLevel || "-"}m</td>
                              <td>
                                <span className={record.stableLevel ? "wl-value" : "wl-pending"}>
                                  {record.stableLevel || "-"}m
                                </span>
                              </td>
                              <td>
                                {record.stableLevel && record.stableLevel.trim() ? (
                                  <span className="status-badge status-normal">已稳定</span>
                                ) : (
                                  <span className="status-badge status-watch">待稳定</span>
                                )}
                              </td>
                              <td className="spt-remark-cell">{record.weatherRemark || "-"}</td>
                              <td>
                                <button className="small-btn" onClick={() => handleEditWaterLevelRecord(record)}>编辑</button>
                                <button className="small-btn danger-btn" onClick={() => handleDeleteWaterLevelRecord(record.id)}>删除</button>
                              </td>
                            </tr>
                          ))}
                          {sortedWaterLevelRecords.length === 0 && (
                            <tr><td colSpan={7} className="empty-row">暂无水位观测记录，请添加</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="layer-editor-empty">
              <p>请从左侧选择一个钻孔以查看和编辑地层分层</p>
            </div>
          )}
        </div>
      </section>

      {showPreview && (
        <div className="modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>摘要预览</h3>
              <button className="modal-close" onClick={() => setShowPreview(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="summary-metrics">
                <div className="summary-metric-card">
                  <span>项目编号</span>
                  <strong>{summaryStats.projectId}</strong>
                </div>
                <div className="summary-metric-card">
                  <span>记录数量</span>
                  <strong>{summaryStats.recordCount}条</strong>
                </div>
                <div className="summary-metric-card">
                  <span>累计孔深</span>
                  <strong>{summaryStats.totalDepth}</strong>
                </div>
                <div className="summary-metric-card">
                  <span>标贯总数</span>
                  <strong>{summaryStats.totalSPTCount}次</strong>
                </div>
                <div className="summary-metric-card">
                  <span>最高标贯</span>
                  <strong>{summaryStats.maxSPT}</strong>
                </div>
                <div className="summary-metric-card">
                  <span>取样数量</span>
                  <strong>{summaryStats.totalSamplingCount}组</strong>
                </div>
                <div className="summary-metric-card">
                  <span>最低水位</span>
                  <strong>{summaryStats.minWaterLevel}</strong>
                </div>
              </div>

              <div className="summary-section">
                <h4>钻孔列表</h4>
                <div className="summary-table-wrapper">
                  <table className="summary-table">
                    <thead>
                      <tr><th>序号</th><th>钻孔编号</th><th>孔深</th><th>岩性分类</th><th>地下水位</th><th>标贯</th><th>取样</th><th>地层</th></tr>
                    </thead>
                    <tbody>
                      {(activeFilter ? filteredRecords : records).map((r, i) => {
                        const bhSPT = sptRecords[r["钻孔编号"]] || [];
                        const bhSampling = samplingRecords[r["钻孔编号"]] || [];
                        const bhLayers = boreholeLayers[r["钻孔编号"]] || [];
                        const wlDisplay = getWaterLevelDisplayText(r["钻孔编号"]);
                        return (
                          <tr key={r["钻孔编号"]}>
                            <td>{i + 1}</td>
                            <td><strong>{r["钻孔编号"]}</strong></td>
                            <td>{r["孔深"]}m</td>
                            <td><span className="tag">{r["岩性分类"]}</span></td>
                            <td>{wlDisplay}m</td>
                            <td>{bhSPT.length}次</td>
                            <td>{bhSampling.length}组</td>
                            <td className="layer-count">共{bhLayers.length}层</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="summary-section">
                <h4>标贯试验明细</h4>
                <div className="summary-spt-list">
                  {(activeFilter ? filteredRecords : records).map(r => {
                    const bhSPT = sptRecords[r["钻孔编号"]] || [];
                    if (bhSPT.length === 0) return null;
                    return (
                      <div key={r["钻孔编号"]} className="summary-borehole-block">
                        <h5>{r["钻孔编号"]} <span className="tag">{bhSPT.length}次</span></h5>
                        <div className="summary-spt-items">
                          {[...bhSPT].sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth)).map(s => {
                            const litho = (boreholeLayers[r["钻孔编号"]] || []).find(l => l.id === s.layerId);
                            return (
                              <div key={s.id} className={`summary-spt-item ${s.isAbnormal ? "is-abnormal" : ""}`}>
                                <span className="spt-depth">{s.depth}m</span>
                                <span className="spt-blow">{s.blowCount}击</span>
                                <span className="spt-litho">{litho ? litho.lithology : "-"}</span>
                                {s.isAbnormal && <span className="spt-status">异常</span>}
                                {s.remark && <span className="spt-remark">{s.remark}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="summary-section">
                <h4>取样记录明细</h4>
                <div className="summary-sampling-list">
                  {(activeFilter ? filteredRecords : records).map(r => {
                    const bhSampling = samplingRecords[r["钻孔编号"]] || [];
                    if (bhSampling.length === 0) return null;
                    return (
                      <div key={r["钻孔编号"]} className="summary-borehole-block">
                        <h5>{r["钻孔编号"]} <span className="tag">{bhSampling.length}组</span></h5>
                        <div className="summary-sampling-items">
                          {[...bhSampling].sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth)).map(s => {
                            const litho = (boreholeLayers[r["钻孔编号"]] || []).find(l => l.id === s.layerId);
                            return (
                              <div key={s.id} className="summary-sampling-item">
                                <span className="spt-depth">{s.depth}m</span>
                                <span className="sample-type-badge">{s.sampleType}</span>
                                <span className="spt-remark">{s.sampleNumber}</span>
                                <span className="spt-litho">{litho ? litho.lithology : "-"}</span>
                                {s.remark && <span className="spt-remark">{s.remark}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="summary-section">
                <h4>水位观测明细</h4>
                <div className="summary-sampling-list">
                  {(activeFilter ? filteredRecords : records).map(r => {
                    const bhWL = waterLevelRecords[r["钻孔编号"]] || [];
                    if (bhWL.length === 0) {
                      return (
                        <div key={r["钻孔编号"]} className="summary-borehole-block">
                          <h5>{r["钻孔编号"]} <span className="tag">未观测</span></h5>
                          <div className="summary-sampling-items">
                            <div className="summary-sampling-item">
                              <span className="spt-remark">暂无水位观测记录</span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    const sortedWL = [...bhWL].sort((a, b) => {
                      const timeA = a.observationTime ? new Date(a.observationTime).getTime() : 0;
                      const timeB = b.observationTime ? new Date(b.observationTime).getTime() : 0;
                      return timeA - timeB;
                    });
                    const stableCount = sortedWL.filter(w => w.stableLevel && w.stableLevel.trim()).length;
                    return (
                      <div key={r["钻孔编号"]} className="summary-borehole-block">
                        <h5>{r["钻孔编号"]} <span className="tag">{sortedWL.length}次</span></h5>
                        <div className="summary-sampling-items">
                          {sortedWL.map((w, i) => {
                            const isStable = w.stableLevel && w.stableLevel.trim();
                            return (
                              <div key={w.id} className={`summary-sampling-item ${!isStable ? "is-abnormal" : ""}`}>
                                <span className="spt-depth">{w.observationTime || "时间未记录"}</span>
                                <span className="sample-type-badge">初见{w.firstSeenLevel || "-"}m</span>
                                <span className={`sample-type-badge ${isStable ? "" : "wl-pending-badge"}`}>
                                  稳定{w.stableLevel || "-"}m
                                </span>
                                <span className="spt-litho">{isStable ? "已稳定" : "待稳定"}</span>
                                {w.weatherRemark && <span className="spt-remark">{w.weatherRemark}</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setShowPreview(false)}>关闭</button>
              <button className="primary-action" onClick={handleCopySummary}>
                {copySuccess ? "✓ 已复制" : "复制文本"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default App;