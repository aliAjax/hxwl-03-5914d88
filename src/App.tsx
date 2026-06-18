import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import "./styles.css";
import type {
  StratumLayer,
  BoreholeLayers,
  SPTRecord,
  BoreholeSPTRecords,
  SamplingRecord,
  BoreholeSamplingRecords,
  WaterLevelRecord,
  BoreholeWaterLevelRecords,
  DrillingRecord,
  Role,
  ImportPreviewResult,
  ImportResult,
  ArchiveData,
  BoreholeImportItem,
  ConflictCategory,
  ConflictResolution,
  CategoryDiff,
  RecordDiff,
  FieldDiff,
  BoreholeConflictDetails,
} from "./types";
import { rolePermissions, roleDescriptions, CATEGORY_LABELS } from "./types";
import { saveProjectData, loadProjectData, clearProjectData, type ProjectData } from "./db";
import {
  createArchive,
  downloadArchive,
  parseArchiveFile,
  previewImport,
  applyImport,
  getImportProgress,
  clearImportProgress,
} from "./archive";
import BoreholeChart from "./components/BoreholeChart";
import MultiBoreholeChart from "./components/MultiBoreholeChart";
import ReviewWorkbench from "./components/ReviewWorkbench";
import PrintReport from "./components/PrintReport";
import QualityCheckPanel from "./components/QualityCheckPanel";

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
  const [currentRole, setCurrentRole] = useState<Role>("现场编录员");
  const permissions = useMemo(() => rolePermissions[currentRole], [currentRole]);
  const isCheckMode = useMemo(() => currentRole === "岩土工程师", [currentRole]);

  const [formData, setFormData] = useState<DrillingRecord>(emptyForm);
  const [records, setRecords] = useState<DrillingRecord[]>([]);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [filters, setFilters] = useState<{
    lithology: string | null;
    hasGap: boolean | null;
    hasAbnormalSPT: boolean | null;
    missingStableWaterLevel: boolean | null;
  }>({
    lithology: null,
    hasGap: null,
    hasAbnormalSPT: null,
    missingStableWaterLevel: null,
  });
  const [showPreview, setShowPreview] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);

  const [boreholeLayers, setBoreholeLayers] = useState<BoreholeLayers>({});
  const [selectedBorehole, setSelectedBorehole] = useState<string | null>(null);
  const [layerForm, setLayerForm] = useState<Omit<StratumLayer, "id">>(emptyLayerForm);
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [layerErrors, setLayerErrors] = useState<Partial<Record<keyof StratumLayer, string>>>({});
  const [layerValidationMessage, setLayerValidationMessage] = useState<string>("");
  const [gapMessage, setGapMessage] = useState<string>("");
  const [adjacentLayerHint, setAdjacentLayerHint] = useState<string>("");
  const [autoFilledStartDepth, setAutoFilledStartDepth] = useState<boolean>(false);

  const [sptRecords, setSPTRecords] = useState<BoreholeSPTRecords>({});
  const [sptForm, setSPTForm] = useState<Omit<SPTRecord, "id" | "layerId">>(emptySPTForm);
  const [editingSPTId, setEditingSPTId] = useState<string | null>(null);
  const [sptErrors, setSPTErrors] = useState<Partial<Record<keyof SPTRecord, string>>>({});
  const [sptValidationMessage, setSPTValidationMessage] = useState<string>("");

  const [samplingRecords, setSamplingRecords] = useState<BoreholeSamplingRecords>({});
  const [samplingForm, setSamplingForm] = useState<Omit<SamplingRecord, "id" | "layerId">>(emptySamplingForm);
  const [editingSamplingId, setEditingSamplingId] = useState<string | null>(null);
  const [samplingErrors, setSamplingErrors] = useState<Partial<Record<keyof SamplingRecord, string>>>({});
  const [samplingValidationMessage, setSamplingValidationMessage] = useState<string>("");

  const [waterLevelRecords, setWaterLevelRecords] = useState<BoreholeWaterLevelRecords>({});
  const [waterLevelForm, setWaterLevelForm] = useState<Omit<WaterLevelRecord, "id">>(emptyWaterLevelForm);
  const [editingWaterLevelId, setEditingWaterLevelId] = useState<string | null>(null);
  const [waterLevelErrors, setWaterLevelErrors] = useState<Partial<Record<keyof WaterLevelRecord, string>>>({});
  const [waterLevelValidationMessage, setWaterLevelValidationMessage] = useState<string>("");
  const [activeMainView, setActiveMainView] = useState<"borehole" | "review" | "quality">("borehole");
  const [activeEditorTab, setActiveEditorTab] = useState<"editor" | "chart">("editor");
  const [chartViewMode, setChartViewMode] = useState<"single" | "compare">("single");
  const [selectedBoreholesForCompare, setSelectedBoreholesForCompare] = useState<string[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [lastSavedText, setLastSavedText] = useState<string>("");
  const isFirstLoadRef = useRef(true);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [showArchiveExport, setShowArchiveExport] = useState(false);
  const [showArchiveImport, setShowArchiveImport] = useState(false);
  const [importPreview, setImportPreview] = useState<ImportPreviewResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState<string>("");
  const [importLoading, setImportLoading] = useState(false);
  const [importOptions, setImportOptions] = useState({
    includeNew: true,
    includeOverwrite: true,
    includeConflict: false,
    preserveChecked: true,
  });
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showImportRecovery, setShowImportRecovery] = useState(false);
  const [interruptedImportInfo, setInterruptedImportInfo] = useState<{ total: number; current: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedConflictBoreholes, setExpandedConflictBoreholes] = useState<Set<string>>(new Set());

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
    return sortedWaterLevelRecords[0];
  }, [sortedWaterLevelRecords]);

  const latestStableWaterLevel = useMemo(() => {
    for (const record of sortedWaterLevelRecords) {
      if (record.stableLevel && record.stableLevel.trim()) {
        return record;
      }
    }
    return null;
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
        return record.stableLevel + "m";
      }
    }
    if (sorted[0].firstSeenLevel && sorted[0].firstSeenLevel.trim()) {
      return `初见${sorted[0].firstSeenLevel}m`;
    }
    return "未观测";
  }, [waterLevelRecords]);

  const hasLayerGap = useCallback((boreholeId: string): boolean => {
    const layers = boreholeLayers[boreholeId] || [];
    if (layers.length === 0) return false;
    const record = records.find(r => r["钻孔编号"] === boreholeId);
    if (!record) return false;
    const holeDepth = parseFloat(record["孔深"]) || 0;
    if (holeDepth === 0) return false;
    const sorted = [...layers].sort((a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth));
    let prevEnd = 0;
    for (const layer of sorted) {
      const ls = parseFloat(layer.startDepth);
      if (ls > prevEnd + 0.001) return true;
      prevEnd = Math.max(prevEnd, parseFloat(layer.endDepth));
    }
    if (prevEnd < holeDepth - 0.001) return true;
    return false;
  }, [boreholeLayers, records]);

  const hasAbnormalSPT = useCallback((boreholeId: string): boolean => {
    const bhSPT = sptRecords[boreholeId] || [];
    return bhSPT.some(spt => spt.isAbnormal);
  }, [sptRecords]);

  const isMissingStableWaterLevel = useCallback((boreholeId: string): boolean => {
    const bhWL = waterLevelRecords[boreholeId] || [];
    if (bhWL.length === 0) return true;
    return !bhWL.some(wl => wl.stableLevel && wl.stableLevel.trim());
  }, [waterLevelRecords]);

  const getLatestWaterLevelObservationText = useCallback((boreholeId: string): string => {
    const records = waterLevelRecords[boreholeId] || [];
    if (records.length === 0) return "未观测";
    const [latest] = [...records].sort((a, b) => {
      const timeA = a.observationTime ? new Date(a.observationTime).getTime() : 0;
      const timeB = b.observationTime ? new Date(b.observationTime).getTime() : 0;
      return timeB - timeA;
    });
    if (!latest) return "未观测";
    if (latest.stableLevel && latest.stableLevel.trim()) {
      return `稳定${latest.stableLevel}m`;
    }
    if (latest.firstSeenLevel && latest.firstSeenLevel.trim()) {
      return `初见${latest.firstSeenLevel}m·待稳定`;
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

  const getAdjacentLayers = useCallback((layerId: string | null, startDepth: string, endDepth: string): { prevLayer: StratumLayer | null; nextLayer: StratumLayer | null } => {
    const sorted = sortedLayers;
    if (layerId) {
      const currentIndex = sorted.findIndex(layer => layer.id === layerId);
      if (currentIndex !== -1) {
        return {
          prevLayer: currentIndex > 0 ? sorted[currentIndex - 1] : null,
          nextLayer: currentIndex < sorted.length - 1 ? sorted[currentIndex + 1] : null,
        };
      }
    }
    const start = parseFloat(startDepth);
    const end = parseFloat(endDepth);
    let prevLayer: StratumLayer | null = null;
    let nextLayer: StratumLayer | null = null;
    for (const layer of sorted) {
      if (layerId && layer.id === layerId) continue;
      const ls = parseFloat(layer.startDepth);
      const le = parseFloat(layer.endDepth);
      if (le <= start + 0.001) {
        if (!prevLayer || ls > parseFloat(prevLayer.startDepth)) {
          prevLayer = layer;
        }
      }
      if (ls >= end - 0.001) {
        if (!nextLayer || ls < parseFloat(nextLayer.startDepth)) {
          nextLayer = layer;
        }
      }
    }
    return { prevLayer, nextLayer };
  }, [sortedLayers]);

  const checkAdjacentLayerImpact = useCallback((formSnapshot: Omit<StratumLayer, "id"> = layerForm) => {
    const { prevLayer, nextLayer } = getAdjacentLayers(editingLayerId, formSnapshot.startDepth, formSnapshot.endDepth);
    const start = parseFloat(formSnapshot.startDepth);
    const end = parseFloat(formSnapshot.endDepth);
    const hints: string[] = [];
    if (isNaN(start) || isNaN(end)) {
      setAdjacentLayerHint("");
      return;
    }
    if (!editingLayerId) {
      if (prevLayer) {
        const prevEnd = parseFloat(prevLayer.endDepth);
        if (Math.abs(prevEnd - start) < 0.001) {
          hints.push(`✅ 与上一层（${prevLayer.lithology} ${prevLayer.startDepth}~${prevLayer.endDepth}m）完美接续`);
        } else if (start < prevEnd - 0.001) {
          hints.push(`⚠️ 与上一层（${prevLayer.lithology} ${prevLayer.startDepth}~${prevLayer.endDepth}m）重叠 ${(prevEnd - start).toFixed(2)}m`);
        } else {
          hints.push(`💡 与上一层（${prevLayer.lithology} ${prevLayer.startDepth}~${prevLayer.endDepth}m）存在 ${(start - prevEnd).toFixed(2)}m 间隙`);
        }
      } else if (Math.abs(start) < 0.001) {
        hints.push(`✅ 起始于地表 0m，接续正确`);
      } else if (start > 0) {
        hints.push(`💡 与地表存在 ${start.toFixed(2)}m 间隙`);
      }
    } else {
      if (prevLayer) {
        const prevEnd = parseFloat(prevLayer.endDepth);
        if (Math.abs(prevEnd - start) > 0.001) {
          if (start < prevEnd - 0.001) {
            hints.push(`⚠️ 与上一层（${prevLayer.lithology} ${prevLayer.startDepth}~${prevLayer.endDepth}m）重叠 ${(prevEnd - start).toFixed(2)}m`);
          } else {
            hints.push(`💡 与上一层（${prevLayer.lithology} ${prevLayer.startDepth}~${prevLayer.endDepth}m）存在 ${(start - prevEnd).toFixed(2)}m 间隙`);
          }
        } else {
          hints.push(`✅ 与上一层（${prevLayer.lithology}）完美接续`);
        }
      } else if (Math.abs(start) < 0.001) {
        hints.push(`✅ 起始于地表 0m，接续正确`);
      } else if (start > 0) {
        hints.push(`💡 与地表存在 ${start.toFixed(2)}m 间隙`);
      }
      if (nextLayer) {
        const nextStart = parseFloat(nextLayer.startDepth);
        if (Math.abs(nextStart - end) > 0.001) {
          if (end > nextStart + 0.001) {
            hints.push(`⚠️ 与下一层（${nextLayer.lithology} ${nextLayer.startDepth}~${nextLayer.endDepth}m）重叠 ${(end - nextStart).toFixed(2)}m`);
          } else {
            hints.push(`💡 与下一层（${nextLayer.lithology} ${nextLayer.startDepth}~${nextLayer.endDepth}m）存在 ${(nextStart - end).toFixed(2)}m 间隙`);
          }
        } else {
          hints.push(`✅ 与下一层（${nextLayer.lithology}）完美接续`);
        }
      }
    }
    setAdjacentLayerHint(hints.join("；"));
  }, [editingLayerId, layerForm, getAdjacentLayers]);

  const handleLayerInputChange = (field: keyof Omit<StratumLayer, "id">, value: string) => {
    const nextForm = { ...layerForm, [field]: value };
    setLayerForm(nextForm);
    if (layerErrors[field]) setLayerErrors(prev => ({ ...prev, [field]: undefined }));
    if (layerValidationMessage) setLayerValidationMessage("");
    if (field === "startDepth" || field === "endDepth") {
      if (field === "startDepth") setAutoFilledStartDepth(false);
      checkAdjacentLayerImpact(nextForm);
    }
  };

  const prepareNewLayerForm = useCallback((boreholeId?: string) => {
    const targetId = boreholeId || selectedBorehole;
    const layers = targetId ? (boreholeLayers[targetId] || []) : [];
    const sorted = [...layers].sort((a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth));
    if (sorted.length > 0) {
      const lastLayer = sorted[sorted.length - 1];
      setLayerForm({
        ...emptyLayerForm,
        startDepth: lastLayer.endDepth,
      });
      setAutoFilledStartDepth(true);
    } else {
      setLayerForm({ ...emptyLayerForm, startDepth: "0" });
      setAutoFilledStartDepth(true);
    }
    setLayerErrors({});
    setLayerValidationMessage("");
    setAdjacentLayerHint("");
  }, [selectedBorehole, boreholeLayers]);

  const handleAddLayer = () => {
    setLayerValidationMessage("");
    const { valid, errors: formErrors } = validateLayerForm();
    setLayerErrors(formErrors);
    if (!valid) return;
    const { hasOverlap } = checkOverlapAndGaps();
    if (hasOverlap) { setLayerValidationMessage("该层与现有分层深度重叠，请调整深度范围"); return; }
    if (!selectedBorehole) return;
    const newLayer: StratumLayer = { ...layerForm, id: generateId() };
    setBoreholeLayers(prev => {
      const updated = { ...prev, [selectedBorehole]: [...(prev[selectedBorehole] || []), newLayer] };
      setTimeout(() => {
        prepareNewLayerForm(selectedBorehole);
      }, 0);
      return updated;
    });
  };

  const handleUpdateLayer = () => {
    setLayerValidationMessage("");
    const { valid, errors: formErrors } = validateLayerForm();
    setLayerErrors(formErrors);
    if (!valid || !editingLayerId || !selectedBorehole) return;
    const { hasOverlap } = checkOverlapAndGaps();
    if (hasOverlap) { setLayerValidationMessage("该层与现有分层深度重叠，请调整深度范围"); return; }
    setBoreholeLayers(prev => ({
      ...prev,
      [selectedBorehole]: prev[selectedBorehole].map(l => {
        if (l.id !== editingLayerId) return l;
        if (isCheckMode) {
          return {
            ...l,
            description: layerForm.description,
            isChecked: true,
            checkedBy: currentRole,
            checkedAt: new Date().toISOString(),
            checkRemark: layerForm.description,
          };
        }
        return { ...l, ...layerForm, id: editingLayerId };
      })
    }));
    setLayerForm(emptyLayerForm); setEditingLayerId(null); setLayerErrors({}); setLayerValidationMessage(""); setAdjacentLayerHint(""); setAutoFilledStartDepth(false);
  };

  const handleEditLayer = (layer: StratumLayer) => {
    setLayerForm({
      startDepth: layer.startDepth,
      endDepth: layer.endDepth,
      lithology: layer.lithology,
      soilColor: layer.soilColor,
      density: layer.density,
      description: layer.description,
      isChecked: layer.isChecked,
      checkedBy: layer.checkedBy,
      checkedAt: layer.checkedAt,
      checkRemark: layer.checkRemark,
    });
    setEditingLayerId(layer.id); setLayerErrors({}); setLayerValidationMessage(""); setAdjacentLayerHint(""); setAutoFilledStartDepth(false);
  };

  const handleDeleteLayer = (layerId: string) => {
    if (!selectedBorehole) return;
    setBoreholeLayers(prev => {
      const updated = {
        ...prev,
        [selectedBorehole]: prev[selectedBorehole].filter(l => l.id !== layerId),
      };
      if (editingLayerId === layerId) {
        setTimeout(() => {
          prepareNewLayerForm(selectedBorehole);
        }, 0);
      }
      return updated;
    });
    if (editingLayerId === layerId) {
      setEditingLayerId(null);
      setAdjacentLayerHint("");
      setAutoFilledStartDepth(false);
    } else if (!editingLayerId) {
      setTimeout(() => {
        prepareNewLayerForm(selectedBorehole);
      }, 0);
    }
  };

  const handleCancelEdit = () => {
    setEditingLayerId(null);
    setLayerErrors({});
    setLayerValidationMessage("");
    setAdjacentLayerHint("");
    setTimeout(() => {
      prepareNewLayerForm();
    }, 0);
  };

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
    setSPTRecords(prev => ({
      ...prev,
      [selectedBorehole]: prev[selectedBorehole].map(r => {
        if (r.id !== editingSPTId) return r;
        if (isCheckMode) {
          return {
            ...r,
            isAbnormal: sptForm.isAbnormal,
            remark: sptForm.remark,
            isChecked: true,
            checkedBy: currentRole,
            checkedAt: new Date().toISOString(),
            checkRemark: sptForm.remark,
          };
        }
        return { ...r, ...sptForm, id: editingSPTId, layerId: layer.id };
      })
    }));
    setSPTForm(emptySPTForm); setEditingSPTId(null); setSPTErrors({}); setSPTValidationMessage("");
  };

  const handleEditSPTRecord = (record: SPTRecord) => {
    setSPTForm({
      depth: record.depth,
      blowCount: record.blowCount,
      isAbnormal: record.isAbnormal,
      remark: record.remark,
      isChecked: record.isChecked,
      checkedBy: record.checkedBy,
      checkedAt: record.checkedAt,
      checkRemark: record.checkRemark,
    });
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
    setTimeout(() => {
      prepareNewLayerForm(boreholeId);
    }, 0);
    setEditingLayerId(null); setLayerErrors({}); setLayerValidationMessage("");
    setSPTForm(emptySPTForm); setEditingSPTId(null); setSPTErrors({}); setSPTValidationMessage("");
    setSamplingForm(emptySamplingForm); setEditingSamplingId(null); setSamplingErrors({}); setSamplingValidationMessage("");
    setWaterLevelForm(emptyWaterLevelForm); setEditingWaterLevelId(null); setWaterLevelErrors({}); setWaterLevelValidationMessage("");
  };

  const handleToggleBoreholeForCompare = (boreholeId: string) => {
    setSelectedBoreholesForCompare(prev => {
      if (prev.includes(boreholeId)) {
        return prev.filter(id => id !== boreholeId);
      } else {
        return [...prev, boreholeId];
      }
    });
  };

  const handleSelectAllForCompare = () => {
    const allIds = filteredRecords.map(r => r["钻孔编号"]);
    setSelectedBoreholesForCompare(allIds);
  };

  const handleClearCompareSelection = () => {
    setSelectedBoreholesForCompare([]);
  };

  const handleNavigateToBorehole = useCallback((boreholeId: string, focusType?: "basicInfo" | "layer" | "spt" | "sampling" | "waterLevel", focusId?: string) => {
    setActiveMainView("borehole");
    setChartViewMode("single");
    setActiveEditorTab("editor");
    handleSelectBorehole(boreholeId);
    if (focusType === "basicInfo") {
      const record = records.find(r => r["钻孔编号"] === boreholeId);
      if (record) {
        handleEditRecord(record);
      }
    } else if (focusType === "layer" && focusId) {
      setTimeout(() => {
      const layers = boreholeLayers[boreholeId] || [];
      const layer = layers.find(l => l.id === focusId);
      if (layer) {
        handleEditLayer(layer);
      }
    }, 50);
    } else if (focusType === "spt" && focusId) {
      setTimeout(() => {
      const spts = sptRecords[boreholeId] || [];
      const spt = spts.find(s => s.id === focusId);
      if (spt) {
        handleEditSPTRecord(spt);
      }
    }, 50);
    } else if (focusType === "sampling" && focusId) {
      setTimeout(() => {
      const samplings = samplingRecords[boreholeId] || [];
      const sampling = samplings.find(s => s.id === focusId);
      if (sampling) {
        handleEditSamplingRecord(sampling);
      }
    }, 50);
    } else if (focusType === "waterLevel" && focusId) {
      setTimeout(() => {
      const wls = waterLevelRecords[boreholeId] || [];
      const wl = wls.find(w => w.id === focusId);
      if (wl) {
        handleEditWaterLevelRecord(wl);
      }
    }, 50);
    }
  }, [records, boreholeLayers, sptRecords, samplingRecords, waterLevelRecords]);

  const handleUpdateLayerCheck = useCallback((boreholeId: string, layerId: string, checkRemark: string) => {
    setBoreholeLayers(prev => ({
      ...prev,
      [boreholeId]: (prev[boreholeId] || []).map(l => {
        if (l.id !== layerId) return l;
        return {
          ...l,
          isChecked: true,
          checkedBy: currentRole,
          checkedAt: new Date().toISOString(),
          checkRemark: checkRemark,
          description: l.description || checkRemark,
        };
      })
    }));
  }, [currentRole]);

  const handleUpdateSPTCheck = useCallback((boreholeId: string, sptId: string, isAbnormal: boolean, checkRemark: string) => {
    setSPTRecords(prev => ({
      ...prev,
      [boreholeId]: (prev[boreholeId] || []).map(r => {
        if (r.id !== sptId) return r;
        return {
          ...r,
          isAbnormal: isAbnormal,
          isChecked: true,
          checkedBy: currentRole,
          checkedAt: new Date().toISOString(),
          checkRemark: checkRemark,
          remark: r.remark || checkRemark,
        };
      })
    }));
  }, [currentRole]);

  const compareBoreholeData = useMemo(() => {
    return selectedBoreholesForCompare
      .map(id => {
        const record = records.find(r => r["钻孔编号"] === id);
        if (!record) return null;
        const holeDepth = parseFloat(record["孔深"]) || 0;
        const layers = boreholeLayers[id] || [];
        const sptRecordsList = sptRecords[id] || [];
        const waterLevelRecordsList = waterLevelRecords[id] || [];
        return {
          boreholeId: id,
          holeDepth,
          layers,
          sptRecords: sptRecordsList,
          waterLevelRecords: waterLevelRecordsList,
        };
      })
      .filter(Boolean) as {
      boreholeId: string;
      holeDepth: number;
      layers: StratumLayer[];
      sptRecords: SPTRecord[];
      waterLevelRecords: WaterLevelRecord[];
    }[];
  }, [selectedBoreholesForCompare, records, boreholeLayers, sptRecords, waterLevelRecords]);

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

  useEffect(() => {
    if (!selectedBorehole || isLoading) return;
    if (editingLayerId) return;
    if (layerForm.startDepth && !autoFilledStartDepth) return;
    const timer = setTimeout(() => {
      prepareNewLayerForm(selectedBorehole);
      setTimeout(() => checkAdjacentLayerImpact(), 0);
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedBorehole, isLoading, editingLayerId]);

  useEffect(() => {
    if (!selectedBorehole || isLoading || editingLayerId) return;
    const timer = setTimeout(() => {
      checkAdjacentLayerImpact();
    }, 10);
    return () => clearTimeout(timer);
  }, [sortedLayers, selectedBorehole, isLoading, editingLayerId, checkAdjacentLayerImpact]);

  const hasActiveFilters = useMemo(() => {
    return filters.lithology !== null || filters.hasGap !== null || filters.hasAbnormalSPT !== null || filters.missingStableWaterLevel !== null;
  }, [filters]);

  const filteredRecords = useMemo(() => {
    if (!hasActiveFilters) return records;
    return records.filter(r => {
      const boreholeId = r["钻孔编号"];
      if (filters.lithology !== null && r["岩性分类"] !== filters.lithology) {
        return false;
      }
      if (filters.hasGap !== null) {
        const hasGap = hasLayerGap(boreholeId);
        if (filters.hasGap !== hasGap) return false;
      }
      if (filters.hasAbnormalSPT !== null) {
        const hasAbnormal = hasAbnormalSPT(boreholeId);
        if (filters.hasAbnormalSPT !== hasAbnormal) return false;
      }
      if (filters.missingStableWaterLevel !== null) {
        const missing = isMissingStableWaterLevel(boreholeId);
        if (filters.missingStableWaterLevel !== missing) return false;
      }
      return true;
    });
  }, [records, filters, hasActiveFilters, hasLayerGap, hasAbnormalSPT, isMissingStableWaterLevel]);

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
    const targetRecords = filteredRecords;
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
  }, [filteredRecords, sptRecords, samplingRecords, getLatestStableWaterLevel]);

  const getBoreholeMaxSPT = useCallback((boreholeId: string): string => {
    const bhSPT = sptRecords[boreholeId] || [];
    if (bhSPT.length === 0) return "-";
    let max = 0;
    bhSPT.forEach(s => { const b = parseFloat(s.blowCount); if (!isNaN(b) && b > max) max = b; });
    return String(max);
  }, [sptRecords]);

  const generateTextSummary = useCallback(() => {
    const { projectId, recordCount, totalDepth, maxSPT, minWaterLevel, totalSPTCount, totalSamplingCount } = summaryStats;
    const targetRecords = filteredRecords;
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
      const latestObservation = getLatestWaterLevelObservationText(r["钻孔编号"]);
      text += `${String(i + 1).padStart(2, "0")}. ${r["钻孔编号"]} | 孔深${r["孔深"]}m | ${r["岩性分类"]} | ${r["岩性描述"]} | 水位${wlDisplay}m | 最近观测：${latestObservation} | 标贯${bhSPT.length}次 | 取样${bhSampling.length}组\n`;
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
  }, [summaryStats, filteredRecords, sptRecords, samplingRecords, boreholeLayers, waterLevelRecords, getWaterLevelDisplayText]);

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

  const handleEditRecord = (record: DrillingRecord) => {
    if (!permissions.canEditRecord) return;
    setFormData({ ...record });
    setEditingRecordId(record["钻孔编号"]);
    setErrors({});
  };

  const handleCancelEditRecord = () => {
    setFormData(emptyForm);
    setEditingRecordId(null);
    setErrors({});
  };

  const validateUpdate = (): boolean => {
    const newErrors: Partial<Record<FieldName, string>> = {};
    project.fields.forEach(field => {
      if (!formData[field].trim()) newErrors[field] = `${field}不能为空`;
    });
    const hd = parseFloat(formData["孔深"]);
    if (formData["孔深"].trim() && (isNaN(hd) || hd < 0)) newErrors["孔深"] = "孔深不能为负数";
    const wl = parseFloat(formData["地下水位"]);
    if (formData["地下水位"].trim() && !isNaN(wl) && wl < 0) newErrors["地下水位"] = "地下水位不能为负数";
    if (formData["钻孔编号"].trim() && editingRecordId && formData["钻孔编号"].trim() !== editingRecordId && records.some(r => r["钻孔编号"] === formData["钻孔编号"].trim())) {
      newErrors["钻孔编号"] = "钻孔编号已存在";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdateRecord = () => {
    if (!permissions.canEditRecord) return;
    if (!validateUpdate() || !editingRecordId) return;
    const oldBoreholeId = editingRecordId;
    const newBoreholeId = formData["钻孔编号"].trim();
    const trimmedRecord: DrillingRecord = {
      "钻孔编号": newBoreholeId, "孔深": formData["孔深"].trim(), "岩性分类": formData["岩性分类"].trim(),
      "岩性描述": formData["岩性描述"].trim(), "土色": formData["土色"].trim(), "地下水位": formData["地下水位"].trim()
    };

    if (oldBoreholeId !== newBoreholeId) {
      setBoreholeLayers(prev => {
        const next = { ...prev };
        next[newBoreholeId] = prev[oldBoreholeId] || [];
        delete next[oldBoreholeId];
        return next;
      });
      setSPTRecords(prev => {
        const next = { ...prev };
        next[newBoreholeId] = prev[oldBoreholeId] || [];
        delete next[oldBoreholeId];
        return next;
      });
      setSamplingRecords(prev => {
        const next = { ...prev };
        next[newBoreholeId] = prev[oldBoreholeId] || [];
        delete next[oldBoreholeId];
        return next;
      });
      setWaterLevelRecords(prev => {
        const next = { ...prev };
        next[newBoreholeId] = prev[oldBoreholeId] || [];
        delete next[oldBoreholeId];
        return next;
      });
      if (selectedBorehole === oldBoreholeId) {
        setSelectedBorehole(newBoreholeId);
      }
    }

    setRecords(prev => prev.map(r => r["钻孔编号"] === oldBoreholeId ? trimmedRecord : r));
    setFormData(emptyForm);
    setEditingRecordId(null);
    setErrors({});
  };

  const handleDeleteRecord = (boreholeId: string) => {
    if (!permissions.canDeleteRecord) return;
    if (!confirm(`确定要删除钻孔 ${boreholeId} 吗？\n删除后该钻孔的所有分层、标贯、取样、水位数据都将丢失。`)) return;
    setRecords(prev => prev.filter(r => r["钻孔编号"] !== boreholeId));
    setBoreholeLayers(prev => {
      const next = { ...prev };
      delete next[boreholeId];
      return next;
    });
    setSPTRecords(prev => {
      const next = { ...prev };
      delete next[boreholeId];
      return next;
    });
    setSamplingRecords(prev => {
      const next = { ...prev };
      delete next[boreholeId];
      return next;
    });
    setWaterLevelRecords(prev => {
      const next = { ...prev };
      delete next[boreholeId];
      return next;
    });
    if (selectedBorehole === boreholeId) {
      const remaining = records.filter(r => r["钻孔编号"] !== boreholeId);
      setSelectedBorehole(remaining.length > 0 ? remaining[0]["钻孔编号"] : null);
    }
    if (editingRecordId === boreholeId) {
      setFormData(emptyForm);
      setEditingRecordId(null);
    }
  };

  useEffect(() => {
    if (!permissions.canEditRecord && editingRecordId) {
      setFormData(emptyForm);
      setEditingRecordId(null);
      setErrors({});
    }
  }, [permissions.canEditRecord, editingRecordId]);

  const allSPTForSummary = useMemo(() => {
    const targetRecords = filteredRecords;
    const result: { boreholeId: string; depth: string; blowCount: string; isAbnormal: boolean; lithology: string; remark: string }[] = [];
    targetRecords.forEach(r => {
      const bhSPT = sptRecords[r["钻孔编号"]] || [];
      bhSPT.forEach(s => {
        const lithology = getLayerLithology(s.layerId);
        result.push({ boreholeId: r["钻孔编号"], depth: s.depth, blowCount: s.blowCount, isAbnormal: s.isAbnormal, lithology, remark: s.remark });
      });
    });
    return result.sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth));
  }, [filteredRecords, sptRecords, getLayerLithology]);

  const allSamplingForSummary = useMemo(() => {
    const targetRecords = filteredRecords;
    const result: { boreholeId: string; depth: string; sampleType: string; sampleNumber: string; lithology: string; remark: string }[] = [];
    targetRecords.forEach(r => {
      const bhSampling = samplingRecords[r["钻孔编号"]] || [];
      bhSampling.forEach(s => {
        const lithology = getLayerLithology(s.layerId);
        result.push({ boreholeId: r["钻孔编号"], depth: s.depth, sampleType: s.sampleType, sampleNumber: s.sampleNumber, lithology, remark: s.remark });
      });
    });
    return result.sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth));
  }, [filteredRecords, samplingRecords, getLayerLithology]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = await loadProjectData();
        if (saved && saved.initialized) {
          setRecords(saved.records);
          setBoreholeLayers(saved.boreholeLayers);
          setSPTRecords(saved.sptRecords);
          setSamplingRecords(saved.samplingRecords);
          setWaterLevelRecords(saved.waterLevelRecords);
          if (saved.records.length > 0) {
            setSelectedBorehole(saved.records[0]["钻孔编号"]);
          }
          if (saved.lastSaved) {
            const d = new Date(saved.lastSaved);
            setLastSavedText(`上次保存：${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
          }
        } else {
          setRecords(initialRecords);
          setBoreholeLayers(initialLayers);
          setSPTRecords(initialSPTRecords);
          setSamplingRecords(initialSamplingRecords);
          setWaterLevelRecords(initialWaterLevelRecords);
          setSelectedBorehole("ZK-18");
          try {
            await saveProjectData({
              records: initialRecords,
              boreholeLayers: initialLayers,
              sptRecords: initialSPTRecords,
              samplingRecords: initialSamplingRecords,
              waterLevelRecords: initialWaterLevelRecords,
              initialized: true,
            });
            const d = new Date();
            setLastSavedText(`上次保存：${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
          } catch (saveErr) {
            console.error("首次保存种子数据失败:", saveErr);
            setSaveError(saveErr instanceof Error ? saveErr.message : "未知错误");
          }
        }
      } catch (err) {
        console.error("加载数据失败:", err);
        setLoadError(err instanceof Error ? err.message : "未知错误");
        setRecords(initialRecords);
        setBoreholeLayers(initialLayers);
        setSPTRecords(initialSPTRecords);
        setSamplingRecords(initialSamplingRecords);
        setWaterLevelRecords(initialWaterLevelRecords);
        setSelectedBorehole("ZK-18");
      } finally {
        setIsLoading(false);
        setTimeout(() => { isFirstLoadRef.current = false; }, 100);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (isFirstLoadRef.current) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setSaveError(null);
        await saveProjectData({
          records,
          boreholeLayers,
          sptRecords,
          samplingRecords,
          waterLevelRecords,
          initialized: true,
        });
        const d = new Date();
        setLastSavedText(`上次保存：${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
      } catch (err) {
        console.error("保存数据失败:", err);
        setSaveError(err instanceof Error ? err.message : "未知错误");
      }
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [records, boreholeLayers, sptRecords, samplingRecords, waterLevelRecords]);

  const handleClearData = useCallback(async () => {
    try {
      await clearProjectData();
      setRecords(initialRecords);
      setBoreholeLayers(initialLayers);
      setSPTRecords(initialSPTRecords);
      setSamplingRecords(initialSamplingRecords);
      setWaterLevelRecords(initialWaterLevelRecords);
      setSelectedBorehole("ZK-18");
      setSaveError(null);
      setLoadError(null);
      setLastSavedText("");
      setShowClearConfirm(false);
      isFirstLoadRef.current = false;
    } catch (err) {
      console.error("清空数据失败:", err);
      setSaveError(err instanceof Error ? err.message : "未知错误");
    }
  }, []);

  const handleExportArchive = useCallback(() => {
    const archive = createArchive(
      project.id,
      records,
      boreholeLayers,
      sptRecords,
      samplingRecords,
      waterLevelRecords,
      currentRole
    );
    downloadArchive(archive);
    setShowArchiveExport(false);
  }, [records, boreholeLayers, sptRecords, samplingRecords, waterLevelRecords, currentRole]);

  const handleImportFileSelect = useCallback(async (file: File) => {
    setImportError("");
    setImportPreview(null);
    setImportLoading(true);
    setImportFile(file);
    setExpandedConflictBoreholes(new Set());

    try {
      const archiveData = await parseArchiveFile(file);
      const preview = await previewImport(archiveData);
      setImportPreview(preview);
      setImportOptions({
        includeNew: preview.newCount > 0,
        includeOverwrite: preview.overwriteCount > 0,
        includeConflict: false,
        preserveChecked: true,
      });
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "文件解析失败");
    } finally {
      setImportLoading(false);
    }
  }, []);

  const handleConfirmImport = useCallback(async () => {
    if (!importPreview) return;

    setImportLoading(true);
    setImportError("");

    try {
      const progress = getImportProgress();
      const result = await applyImport(importPreview, importOptions, progress);
      setImportResult(result);

      if (result.success) {
        const updatedData = await loadProjectData();
        if (updatedData) {
          setRecords(updatedData.records);
          setBoreholeLayers(updatedData.boreholeLayers);
          setSPTRecords(updatedData.sptRecords);
          setSamplingRecords(updatedData.samplingRecords);
          setWaterLevelRecords(updatedData.waterLevelRecords);
          if (updatedData.records.length > 0 && !selectedBorehole) {
            setSelectedBorehole(updatedData.records[0]["钻孔编号"]);
          }
        }
        setShowImportRecovery(false);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "导入失败");
    } finally {
      setImportLoading(false);
    }
  }, [importPreview, importOptions, selectedBorehole]);

  const handleCloseImport = useCallback(() => {
    setShowArchiveImport(false);
    setImportPreview(null);
    setImportFile(null);
    setImportError("");
    setImportResult(null);
    setIsDragOver(false);
    setExpandedConflictBoreholes(new Set());
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const toggleConflictBoreholeExpanded = useCallback((boreholeId: string) => {
    setExpandedConflictBoreholes((prev) => {
      const next = new Set(prev);
      if (next.has(boreholeId)) {
        next.delete(boreholeId);
      } else {
        next.add(boreholeId);
      }
      return next;
    });
  }, []);

  const handleCategoryResolutionChange = useCallback((
    boreholeIndex: number,
    category: ConflictCategory,
    resolution: ConflictResolution
  ) => {
    setImportPreview((prev) => {
      if (!prev) return prev;
      const newBoreholes = [...prev.boreholes];
      const item = newBoreholes[boreholeIndex];
      if (item) {
        newBoreholes[boreholeIndex] = {
          ...item,
          resolutions: {
            ...(item.resolutions || {}),
            [category]: resolution,
          },
        };
      }
      return { ...prev, boreholes: newBoreholes };
    });
  }, []);

  const handleBulkCategoryResolution = useCallback((
    category: ConflictCategory,
    resolution: ConflictResolution
  ) => {
    setImportPreview((prev) => {
      if (!prev) return prev;
      const newBoreholes = prev.boreholes.map((item) => {
        if (item.status === "conflict" && item.conflictDetails?.categories[category]?.hasConflict) {
          return {
            ...item,
            resolutions: {
              ...(item.resolutions || {}),
              [category]: resolution,
            },
          };
        }
        return item;
      });
      return { ...prev, boreholes: newBoreholes };
    });
  }, []);

  const handleBulkAllConflictResolution = useCallback((resolution: ConflictResolution) => {
    setImportPreview((prev) => {
      if (!prev) return prev;
      const newBoreholes = prev.boreholes.map((item) => {
        if (item.status === "conflict" && item.conflictDetails) {
          const newResolutions: Partial<Record<ConflictCategory, ConflictResolution>> = {};
          (Object.keys(item.conflictDetails.categories) as ConflictCategory[]).forEach((cat) => {
            if (item.conflictDetails!.categories[cat].hasConflict) {
              newResolutions[cat] = resolution;
            }
          });
          return {
            ...item,
            resolutions: newResolutions,
          };
        }
        return item;
      });
      return { ...prev, boreholes: newBoreholes };
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "application/json" || file.name.endsWith(".json")) {
        handleImportFileSelect(file);
      } else {
        setImportError("请选择 .json 格式的归档文件");
      }
    }
  }, [handleImportFileSelect]);

  const handleDismissRecovery = useCallback(() => {
    setShowImportRecovery(false);
    clearImportProgress();
  }, []);

  const handleResumeImport = useCallback(() => {
    setShowArchiveImport(true);
  }, []);

  useEffect(() => {
    const progress = getImportProgress();
    if (progress && progress.status === "interrupted") {
      setInterruptedImportInfo({ total: progress.total, current: progress.current });
      setShowImportRecovery(true);
    }
  }, []);

  const formatArchiveDate = (isoString: string): string => {
    const d = new Date(isoString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  return (
    <main className="app-shell">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner"></div>
            <p>正在加载项目数据...</p>
          </div>
        </div>
      )}

      {loadError && (
        <div className="global-alert alert-error">
          <div>
            <strong>读取本地数据失败：</strong>
            <span>{loadError}</span>
          </div>
          <button onClick={() => setLoadError(null)}>关闭</button>
        </div>
      )}

      {saveError && (
        <div className="global-alert alert-error">
          <div>
            <strong>保存本地数据失败：</strong>
            <span>{saveError}</span>
          </div>
          <button onClick={() => setSaveError(null)}>关闭</button>
        </div>
      )}

      {showImportRecovery && interruptedImportInfo && (
        <div className="global-alert alert-warning">
          <div>
            <strong>⚠️ 检测到上次导入中断</strong>
            <span>上次导入在处理 {interruptedImportInfo.current}/{interruptedImportInfo.total} 个钻孔时中断，已导入的数据已保存。点击「继续导入」从未完成处继续，或「清除记录」重新开始。</span>
          </div>
          <div className="alert-actions">
            <button onClick={handleResumeImport}>继续导入</button>
            <button onClick={handleDismissRecovery}>清除记录</button>
          </div>
        </div>
      )}

      <section className="hero">
        <div>
          <p className="eyebrow">{project.id} · port {project.port}</p>
          <h1>{project.title}</h1>
          <p className="subtitle">{project.subtitle}</p>
          <div className="hero-meta-row">
            {lastSavedText && <span className="save-status">{lastSavedText}</span>}
            <span className="current-role-badge">当前角色：<strong>{currentRole}</strong></span>
            <button
              className={`link-btn ${!permissions.canExportArchive ? "btn-disabled" : ""}`}
              onClick={permissions.canExportArchive ? () => setShowArchiveExport(true) : undefined}
              disabled={!permissions.canExportArchive}
              title={!permissions.canExportArchive ? "当前角色无导出归档权限" : ""}
            >
              📤 导出项目归档
            </button>
            <button
              className={`link-btn ${!permissions.canImportArchive ? "btn-disabled" : ""}`}
              onClick={permissions.canImportArchive ? () => setShowArchiveImport(true) : undefined}
              disabled={!permissions.canImportArchive}
              title={!permissions.canImportArchive ? "当前角色无导入归档权限" : ""}
            >
              📥 导入项目归档
            </button>
            <button
              className={`danger-link-btn ${!permissions.canClearData ? "btn-disabled" : ""}`}
              onClick={permissions.canClearData ? () => setShowClearConfirm(true) : undefined}
              disabled={!permissions.canClearData}
              title={!permissions.canClearData ? "当前角色无清空数据权限" : ""}
            >
              {permissions.canClearData ? "清空本地项目数据" : "无权限清空"}
            </button>
          </div>
        </div>
        <div className="stack-card">
          <span>技术栈</span>
          <strong>{project.stack}</strong>
          <div className="storage-info">
            <span className="storage-badge">数据已自动保存至本地</span>
          </div>
        </div>
      </section>

      <section className="metrics-grid">
        {project.metrics.map((metric: string, index: number) => (
          <MetricCard key={metric} label={metric} value={metrics[index]} index={index} />
        ))}
      </section>

      <section className="workspace">
        <aside className="panel narrow">
          <h2>角色切换</h2>
          <div className="chips role-chips">
            {(project.users as Role[]).map((user: Role) => (
              <button
                key={user}
                className={currentRole === user ? "role-active" : ""}
                onClick={() => setCurrentRole(user)}
                title={roleDescriptions[user]}
              >
                {user}
              </button>
            ))}
          </div>
          <div className="role-description">
            <span className="role-icon">🔒</span>
            <p>{roleDescriptions[currentRole]}</p>
          </div>
          <h2>组合筛选</h2>
          
          <div className="filter-section">
            <h3 className="filter-section-title">岩性分类</h3>
            <div className="chips filter-chips">
              <button 
                className={filters.lithology === null ? "filter-active" : ""} 
                onClick={() => setFilters(prev => ({ ...prev, lithology: null }))}
              >
                全部
              </button>
              {project.filters.map((filter: string) => (
                <button 
                  key={filter} 
                  className={filters.lithology === filter ? "filter-active" : ""} 
                  onClick={() => setFilters(prev => ({ ...prev, lithology: prev.lithology === filter ? null : filter }))}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section">
            <h3 className="filter-section-title">分层缺口</h3>
            <div className="chips filter-chips">
              <button 
                className={filters.hasGap === null ? "filter-active" : ""} 
                onClick={() => setFilters(prev => ({ ...prev, hasGap: null }))}
              >
                全部
              </button>
              <button 
                className={filters.hasGap === true ? "filter-active" : ""} 
                onClick={() => setFilters(prev => ({ ...prev, hasGap: prev.hasGap === true ? null : true }))}
              >
                有缺口
              </button>
              <button 
                className={filters.hasGap === false ? "filter-active" : ""} 
                onClick={() => setFilters(prev => ({ ...prev, hasGap: prev.hasGap === false ? null : false }))}
              >
                无缺口
              </button>
            </div>
          </div>

          <div className="filter-section">
            <h3 className="filter-section-title">异常标贯</h3>
            <div className="chips filter-chips">
              <button 
                className={filters.hasAbnormalSPT === null ? "filter-active" : ""} 
                onClick={() => setFilters(prev => ({ ...prev, hasAbnormalSPT: null }))}
              >
                全部
              </button>
              <button 
                className={filters.hasAbnormalSPT === true ? "filter-active" : ""} 
                onClick={() => setFilters(prev => ({ ...prev, hasAbnormalSPT: prev.hasAbnormalSPT === true ? null : true }))}
              >
                有异常
              </button>
              <button 
                className={filters.hasAbnormalSPT === false ? "filter-active" : ""} 
                onClick={() => setFilters(prev => ({ ...prev, hasAbnormalSPT: prev.hasAbnormalSPT === false ? null : false }))}
              >
                无异常
              </button>
            </div>
          </div>

          <div className="filter-section">
            <h3 className="filter-section-title">稳定水位</h3>
            <div className="chips filter-chips">
              <button 
                className={filters.missingStableWaterLevel === null ? "filter-active" : ""} 
                onClick={() => setFilters(prev => ({ ...prev, missingStableWaterLevel: null }))}
              >
                全部
              </button>
              <button 
                className={filters.missingStableWaterLevel === true ? "filter-active" : ""} 
                onClick={() => setFilters(prev => ({ ...prev, missingStableWaterLevel: prev.missingStableWaterLevel === true ? null : true }))}
              >
                缺稳定水位
              </button>
              <button 
                className={filters.missingStableWaterLevel === false ? "filter-active" : ""} 
                onClick={() => setFilters(prev => ({ ...prev, missingStableWaterLevel: prev.missingStableWaterLevel === false ? null : false }))}
              >
                有稳定水位
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <button 
              className="clear-filters-btn"
              onClick={() => setFilters({
                lithology: null,
                hasGap: null,
                hasAbnormalSPT: null,
                missingStableWaterLevel: null,
              })}
            >
              清除所有筛选
            </button>
          )}

          <div className="filter-result-count">
            筛选结果：<strong>{filteredRecords.length}</strong> / {records.length} 条
          </div>
        </aside>

        <section className="panel">
          <div className="section-heading">
            <div>
              <p>{project.domain}</p>
              <h2>{editingRecordId ? "编辑钻孔" : "新增钻孔"} {editingRecordId && <span className="check-badge">编辑中</span>}</h2>
            </div>
            {editingRecordId ? (
              <>
                <button
                  className="secondary-action"
                  onClick={handleCancelEditRecord}
                >
                  取消
                </button>
                <button
                  className="primary-action"
                  onClick={handleUpdateRecord}
                >
                  保存修改
                </button>
              </>
            ) : (
              <button
                className={`primary-action ${!permissions.canAddRecord ? "btn-disabled" : ""}`}
                onClick={permissions.canAddRecord ? handleAddRecord : undefined}
                disabled={!permissions.canAddRecord}
                title={!permissions.canAddRecord ? "当前角色无新增钻孔权限" : ""}
              >
                {permissions.canAddRecord ? "新增记录" : "无权限新增"}
              </button>
            )}
          </div>
          {!permissions.canAddRecord && !editingRecordId ? (
            <div className="permission-empty-state">
              <span className="empty-lock-icon">🔐</span>
              <h4>新增钻孔功能受限</h4>
              <p>当前角色为「{currentRole}」，仅「现场编录员」可新增和编辑钻孔记录</p>
            </div>
          ) : (
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
          )}

          {selectedBorehole && selectedRecord && (
            <div className="quick-overview">
              <div className="quick-overview-header">
                <h3>当前钻孔 · {selectedBorehole}</h3>
                <span className="quick-overview-sub">孔深 {selectedRecord["孔深"]}m · 水位 {getWaterLevelDisplayText(selectedBorehole)}</span>
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

              {sortedWaterLevelRecords.length > 0 && (
                <div className="quick-spt-list">
                  <h4>最新水位观测</h4>
                  <div className="water-level-latest-card">
                    <div className="wl-latest-row">
                      <div className="wl-latest-item">
                        <span className="wl-label">初见水位</span>
                        <strong className="wl-value">{latestWaterLevel?.firstSeenLevel || "-"}m</strong>
                      </div>
                      <div className="wl-latest-item">
                        <span className="wl-label">稳定水位</span>
                        <strong className={`wl-value ${!latestWaterLevel?.stableLevel ? "wl-pending" : ""}`}>
                          {latestWaterLevel?.stableLevel ? `${latestWaterLevel.stableLevel}m` : "待稳定"}
                        </strong>
                      </div>
                    </div>
                    <div className="wl-latest-meta">
                      <span className="wl-time">{latestWaterLevel?.observationTime || "时间未记录"}</span>
                      {latestWaterLevel?.weatherRemark && (
                        <span className="wl-weather">{latestWaterLevel.weatherRemark}</span>
                      )}
                    </div>
                  </div>

                  <h4 className="wl-timeline-title">水位变化时间线</h4>
                  <div className="wl-timeline">
                    {sortedWaterLevelRecords.map((record, idx) => {
                      const isStable = record.stableLevel && record.stableLevel.trim();
                      return (
                        <div key={record.id} className={`wl-timeline-item ${idx === sortedWaterLevelRecords.length - 1 ? "is-last" : ""}`}>
                          <div className="wl-timeline-dot-wrapper">
                            <div className={`wl-timeline-dot ${isStable ? "dot-stable" : "dot-pending"}`}></div>
                            {idx < sortedWaterLevelRecords.length - 1 && <div className="wl-timeline-line"></div>}
                          </div>
                          <div className="wl-timeline-content">
                            <div className="wl-timeline-header">
                              <span className="wl-timeline-time">{record.observationTime || "时间未记录"}</span>
                              <span className={`status-badge ${isStable ? "status-normal" : "status-watch"}`}>
                                {isStable ? "已稳定" : "待稳定"}
                              </span>
                            </div>
                            <div className="wl-timeline-levels">
                              <div className="wl-timeline-level">
                                <span className="wl-timeline-level-label">初见</span>
                                <strong className="wl-timeline-level-value">{record.firstSeenLevel || "-"}m</strong>
                              </div>
                              <div className="wl-timeline-level">
                                <span className="wl-timeline-level-label">稳定</span>
                                <strong className={`wl-timeline-level-value ${!isStable ? "wl-pending" : ""}`}>
                                  {isStable ? `${record.stableLevel}m` : "待稳定"}
                                </strong>
                              </div>
                            </div>
                            {record.weatherRemark && (
                              <div className="wl-timeline-remark">
                                <span className="wl-timeline-weather">{record.weatherRemark}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
        <div className="main-view-tabs">
          <button
            className={`main-view-tab ${activeMainView === "borehole" ? "active" : ""}`}
            onClick={() => setActiveMainView("borehole")}
          >
            📝 钻孔编辑
          </button>
          <button
            className={`main-view-tab ${activeMainView === "review" ? "active" : ""} ${!permissions.canViewReviewWorkbench ? "btn-disabled" : ""}`}
            onClick={() => permissions.canViewReviewWorkbench && setActiveMainView("review")}
            disabled={!permissions.canViewReviewWorkbench}
            title={!permissions.canViewReviewWorkbench ? "当前角色无查看校核工作台权限" : ""}
          >
            🔍 校核工作台
          </button>
          <button
            className={`main-view-tab ${activeMainView === "quality" ? "active" : ""}`}
            onClick={() => setActiveMainView("quality")}
            title="全项目数据质量检查"
          >
            ✅ 质量检查
          </button>
        </div>

        {activeMainView === "quality" ? (
          <QualityCheckPanel
            records={records}
            boreholeLayers={boreholeLayers}
            sptRecords={sptRecords}
            samplingRecords={samplingRecords}
            waterLevelRecords={waterLevelRecords}
            onNavigateToBorehole={handleNavigateToBorehole}
          />
        ) : activeMainView === "review" ? (
          <ReviewWorkbench
            records={records}
            boreholeLayers={boreholeLayers}
            sptRecords={sptRecords}
            permissions={permissions}
            currentRole={currentRole}
            onNavigateToBorehole={handleNavigateToBorehole}
            onUpdateLayerCheck={handleUpdateLayerCheck}
            onUpdateSPTCheck={handleUpdateSPTCheck}
          />
        ) : (
          <>
        <div className="panel borehole-list-panel">
          <div className="section-heading">
            <div>
              <p>钻孔数据</p>
              <h2>选择钻孔</h2>
            </div>
            <div className="section-header-actions">
              <button
                className={`compare-toggle-btn ${chartViewMode === "compare" ? "active" : ""} ${!permissions.canViewChart ? "btn-disabled" : ""}`}
                onClick={() => {
                  if (!permissions.canViewChart) return;
                  const nextMode = chartViewMode === "single" ? "compare" : "single";
                  setChartViewMode(nextMode);
                  if (nextMode === "compare" && selectedBorehole && !selectedBoreholesForCompare.includes(selectedBorehole)) {
                    setSelectedBoreholesForCompare(prev => [...prev, selectedBorehole]);
                  }
                  if (nextMode === "compare") {
                    setActiveEditorTab("chart");
                  }
                }}
                disabled={!permissions.canViewChart}
                title={!permissions.canViewChart ? "当前角色无查看柱状图权限" : "切换多钻孔对比模式"}
              >
                {chartViewMode === "compare" ? "🔄 单孔模式" : "📊 对比模式"}
              </button>
              <button
                className={`${!permissions.canExportSummary ? "btn-disabled" : ""}`}
                onClick={permissions.canExportSummary ? () => setShowPreview(true) : undefined}
                disabled={!permissions.canExportSummary}
                title={!permissions.canExportSummary ? "当前角色无导出权限" : ""}
              >
                {permissions.canExportSummary ? "导出摘要" : "无权限导出"}
              </button>
              <button
                className={`primary-action ${!permissions.canExportSummary ? "btn-disabled" : ""}`}
                onClick={permissions.canExportSummary ? () => setShowPrintReport(true) : undefined}
                disabled={!permissions.canExportSummary}
                title={!permissions.canExportSummary ? "当前角色无打印权限" : "生成面向项目负责人的打印报告"}
              >
                📋 打印报告
              </button>
            </div>
          </div>

          {chartViewMode === "compare" && (
            <div className="compare-selection-bar">
              <span className="compare-selection-info">
                已选择 <strong>{selectedBoreholesForCompare.length}</strong> / {filteredRecords.length} 个钻孔
              </span>
              <div className="compare-selection-actions">
                <button className="link-btn" onClick={handleSelectAllForCompare}>全选</button>
                <button className="link-btn" onClick={handleClearCompareSelection}>清空</button>
              </div>
            </div>
          )}

          <div className="borehole-list">
            {filteredRecords.map((record, index: number) => {
              const bhSPT = sptRecords[record["钻孔编号"]] || [];
              const bhSampling = samplingRecords[record["钻孔编号"]] || [];
              const latestObservationText = getLatestWaterLevelObservationText(record["钻孔编号"]);
              const isEditingThis = editingRecordId === record["钻孔编号"];
              const isSelectedForCompare = selectedBoreholesForCompare.includes(record["钻孔编号"]);
              const isSelected = chartViewMode === "compare" ? isSelectedForCompare : selectedBorehole === record["钻孔编号"];

              const handleItemClick = () => {
                if (chartViewMode === "compare") {
                  handleToggleBoreholeForCompare(record["钻孔编号"]);
                } else {
                  handleSelectBorehole(record["钻孔编号"]);
                }
              };

              return (
                <article
                  key={record["钻孔编号"] + "-" + index}
                  className={`borehole-item ${isSelected ? "borehole-selected" : ""} ${isEditingThis ? "borehole-editing" : ""} ${chartViewMode === "compare" ? "compare-mode" : ""}`}
                  onClick={handleItemClick}
                >
                  {chartViewMode === "compare" && (
                    <div className="borehole-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelectedForCompare}
                        onChange={() => handleToggleBoreholeForCompare(record["钻孔编号"])}
                      />
                    </div>
                  )}
                  <div className="borehole-index">{String(index + 1).padStart(2, "0")}</div>
                  <div className="borehole-info">
                    <h3>
                      {record["钻孔编号"]} <span className="tag">{record["岩性分类"]}</span>
                      {isEditingThis && <span className="check-badge">编辑中</span>}
                    </h3>
                    <p>孔深{record["孔深"]}m · 水位{latestObservationText} · 标贯{bhSPT.length}次 · 取样{bhSampling.length}组</p>
                  </div>
                  {permissions.canEditRecord && (
                    <div className="borehole-actions" onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`action-btn ${isEditingThis ? "btn-disabled" : ""}`}
                        onClick={() => handleEditRecord(record)}
                        disabled={isEditingThis}
                        title={isEditingThis ? "该钻孔正在编辑" : "编辑钻孔"}
                      >
                        编辑
                      </button>
                      <button
                        className="action-btn action-delete"
                        onClick={() => handleDeleteRecord(record["钻孔编号"])}
                        title="删除钻孔"
                      >
                        删除
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        <div className="panel layer-editor-panel borehole-chart-section">
          <div className="section-heading">
            <div>
              <p>{chartViewMode === "compare" ? "多钻孔对比" : "地层分层"}</p>
              <h2>
                {chartViewMode === "compare"
                  ? `对比视图 · ${selectedBoreholesForCompare.length} 个钻孔`
                  : selectedBorehole
                  ? `${selectedBorehole} · ${activeEditorTab === "editor" ? "分层编辑器" : "柱状图"}`
                  : "请选择钻孔"}
                {chartViewMode === "single" && selectedRecord && <span className="hole-depth-tag">孔深 {selectedRecord["孔深"]}m</span>}
              </h2>
            </div>
          </div>

          {chartViewMode === "compare" ? (
            <MultiBoreholeChart boreholes={compareBoreholeData} />
          ) : selectedBorehole ? (
            <>
              <div className="editor-tabs">
                <button
                  className={`editor-tab ${activeEditorTab === "editor" ? "active" : ""}`}
                  onClick={() => setActiveEditorTab("editor")}
                >
                  📝 数据编辑
                </button>
                <button
                  className={`editor-tab ${activeEditorTab === "chart" ? "active" : ""} ${!permissions.canViewChart ? "btn-disabled" : ""}`}
                  onClick={() => permissions.canViewChart && setActiveEditorTab("chart")}
                  disabled={!permissions.canViewChart}
                  title={!permissions.canViewChart ? "当前角色无查看柱状图权限" : ""}
                >
                  📊 钻孔柱状图
                </button>
              </div>

              {activeEditorTab === "chart" ? (
                <BoreholeChart
                  boreholeId={selectedBorehole}
                  holeDepth={holeDepth}
                  layers={sortedLayers}
                  sptRecords={sortedSPTRecords}
                  waterLevelRecords={sortedWaterLevelRecords}
                />
              ) : (
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
                        <div
                          key={layer.id}
                          className={`stratum-layer litho-${idx % 6} ${!permissions.canEditLayer || isCheckMode ? "layer-readonly" : ""}`}
                          style={{ top: `${topPercent}%`, height: `${heightPercent}%` }}
                          onClick={permissions.canEditLayer && !isCheckMode ? () => handleEditLayer(layer) : undefined}
                          title={isCheckMode ? "校核模式，点击查看详情" : !permissions.canEditLayer ? "当前角色无分层编辑权限" : "点击编辑该层"}
                        >
                          <span className="layer-depth-top">{layer.startDepth}</span>
                          <span className="layer-name">{layer.lithology}</span>
                          <span className="layer-depth-bottom">{layer.endDepth}</span>
                        </div>
                      );
                    })
                  ) : (<div className="column-empty">{permissions.canEditLayer ? "暂无分层数据" : "暂无分层数据（仅查看）"}</div>)}
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
                  {(latestStableWaterLevel || latestWaterLevel) && (() => {
                    const targetRecord = latestStableWaterLevel || latestWaterLevel;
                    if (!targetRecord) return null;
                    const level = targetRecord.stableLevel || targetRecord.firstSeenLevel;
                    if (!level) return null;
                    const depth = parseFloat(level);
                    const topPercent = holeDepth > 0 ? (depth / holeDepth) * 100 : 0;
                    const isStable = targetRecord.stableLevel && targetRecord.stableLevel.trim();
                    return (
                      <div
                        key="water-level-marker"
                        className={`water-level-marker ${isStable ? "wl-stable" : "wl-first-seen"}`}
                        style={{ top: `${topPercent}%` }}
                        title={`${isStable ? "稳定水位" : "初见水位"} ${level}m${targetRecord.observationTime ? " · " + targetRecord.observationTime : ""}${targetRecord.weatherRemark ? " · " + targetRecord.weatherRemark : ""}`}
                      >
                        <span>水</span>
                        <span className="wl-marker-level">{level}m</span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="layer-form-section">
                <h3>
                  {editingLayerId ? (isCheckMode ? "校核分层" : "编辑分层") : "新增分层"}
                  {isCheckMode && <span className="check-badge">校核模式</span>}
                  {isCheckMode && <span className="check-hint">（仅可修改备注）</span>}
                </h3>
                {!permissions.canEditLayer ? (
                  <div className="permission-empty-state">
                    <span className="empty-lock-icon">🔐</span>
                    <h4>分层编辑功能受限</h4>
                    <p>当前角色为「{currentRole}」，仅「现场编录员」可新增和编辑分层数据</p>
                  </div>
                ) : (
                  <>
                    <div className="layer-form-grid">
                      <label><span>起始深度 (m)</span><input type="number" step="0.1" className={`${layerErrors.startDepth ? "input-error" : ""} ${isCheckMode ? "input-readonly" : ""} ${autoFilledStartDepth && !editingLayerId ? "input-auto-filled" : ""}`} placeholder="起始深度" value={layerForm.startDepth} onChange={(e) => handleLayerInputChange("startDepth", e.target.value)} disabled={isCheckMode} readOnly={isCheckMode} />{layerErrors.startDepth && <em className="error-tip">{layerErrors.startDepth}</em>}{isCheckMode && <em className="check-tip">校核模式，不可修改</em>}{autoFilledStartDepth && !editingLayerId && !layerErrors.startDepth && <em className="auto-fill-tip">💡 接续上一层终止深度，可手动修改</em>}</label>
                      <label><span>终止深度 (m)</span><input type="number" step="0.1" className={`${layerErrors.endDepth ? "input-error" : ""} ${isCheckMode ? "input-readonly" : ""}`} placeholder="终止深度" value={layerForm.endDepth} onChange={(e) => handleLayerInputChange("endDepth", e.target.value)} disabled={isCheckMode} readOnly={isCheckMode} />{layerErrors.endDepth && <em className="error-tip">{layerErrors.endDepth}</em>}{isCheckMode && <em className="check-tip">校核模式，不可修改</em>}</label>
                      <label><span>岩性</span><select className={`${layerErrors.lithology ? "input-error" : ""} ${isCheckMode ? "input-readonly" : ""}`} value={layerForm.lithology} onChange={(e) => handleLayerInputChange("lithology", e.target.value)} disabled={isCheckMode}><option value="">选择岩性</option>{lithologyOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select>{layerErrors.lithology && <em className="error-tip">{layerErrors.lithology}</em>}{isCheckMode && <em className="check-tip">校核模式，不可修改</em>}</label>
                      <label><span>土色</span><select className={`${layerErrors.soilColor ? "input-error" : ""} ${isCheckMode ? "input-readonly" : ""}`} value={layerForm.soilColor} onChange={(e) => handleLayerInputChange("soilColor", e.target.value)} disabled={isCheckMode}><option value="">选择土色</option>{soilColorOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select>{layerErrors.soilColor && <em className="error-tip">{layerErrors.soilColor}</em>}{isCheckMode && <em className="check-tip">校核模式，不可修改</em>}</label>
                      <label><span>密实度/状态</span><select className={`${layerErrors.density ? "input-error" : ""} ${isCheckMode ? "input-readonly" : ""}`} value={layerForm.density} onChange={(e) => handleLayerInputChange("density", e.target.value)} disabled={isCheckMode}><option value="">选择密实度/状态</option>{densityOptions.map(opt => (<option key={opt} value={opt}>{opt}</option>))}</select>{layerErrors.density && <em className="error-tip">{layerErrors.density}</em>}{isCheckMode && <em className="check-tip">校核模式，不可修改</em>}</label>
                      <label className="full-width"><span>描述{isCheckMode && <em className="inline-check-tip">(校核说明)</em>}</span><input placeholder={isCheckMode ? "请填写校核说明或备注" : "分层描述"} value={layerForm.description} onChange={(e) => handleLayerInputChange("description", e.target.value)} /></label>
                    </div>
                    {layerValidationMessage && (<div className="layer-validation-error">{layerValidationMessage}</div>)}
                    {adjacentLayerHint && (<div className={`layer-adjacent-hint ${adjacentLayerHint.includes("⚠️") ? "hint-warning" : adjacentLayerHint.includes("✅") ? "hint-success" : "hint-info"}`}>
                        {adjacentLayerHint}
                        {editingLayerId && <><br /><small>（仅提示，不会自动修改相邻层数据）</small></>}
                        {!editingLayerId && !autoFilledStartDepth && sortedLayers.length > 0 && <><br /><small>点击「接续上一层」可快速填入上一层终止深度</small></>}
                      </div>)}
                    {gapMessage && sortedLayers.length > 0 && (<div className="layer-gap-warning">{gapMessage}</div>)}
                    <div className="layer-form-actions">
                      {editingLayerId ? (
                        <>
                          <button className="secondary-btn" onClick={handleCancelEdit}>取消</button>
                          <button className="primary-action" onClick={handleUpdateLayer}>
                            {isCheckMode ? "确认校核" : "更新分层"}
                          </button>
                        </>
                      ) : (
                        <>
                          {sortedLayers.length > 0 && (
                            <button 
                              className="secondary-btn" 
                              onClick={() => prepareNewLayerForm()}
                              title="将起始深度设为上一层的终止深度"
                            >
                              ↓ 接续上一层
                            </button>
                          )}
                          <button className={`primary-action ${isCheckMode ? "btn-disabled" : ""}`} onClick={!isCheckMode ? handleAddLayer : undefined} disabled={isCheckMode} title={isCheckMode ? "校核模式，不可新增分层" : ""}>
                          {isCheckMode ? "无权限新增" : "添加分层"}
                        </button>
                        </>
                      )}
                    </div>
                  </>
                )}
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
                            <td>
                              <button
                                className={`small-btn ${!permissions.canEditLayer ? "btn-disabled" : ""}`}
                                onClick={permissions.canEditLayer ? () => handleEditLayer(layer) : undefined}
                                disabled={!permissions.canEditLayer}
                                title={!permissions.canEditLayer ? "当前角色无编辑权限" : ""}
                              >
                                {permissions.canCheckLayer && currentRole === "岩土工程师" ? "校核" : "编辑"}
                              </button>
                              <button
                                className={`small-btn danger-btn ${!permissions.canEditLayer || isCheckMode ? "btn-disabled" : ""}`}
                                onClick={permissions.canEditLayer && !isCheckMode ? () => handleDeleteLayer(layer.id) : undefined}
                                disabled={!permissions.canEditLayer || isCheckMode}
                                title={isCheckMode ? "校核模式，不可删除" : !permissions.canEditLayer ? "当前角色无删除权限" : ""}
                              >
                                删除
                              </button>
                            </td>
                          </tr>
                        ))}
                        {sortedLayers.length === 0 && (<tr><td colSpan={7} className="empty-row">{permissions.canEditLayer ? "暂无分层数据，请添加" : "暂无分层数据（仅查看）"}</td></tr>)}
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
                    <h4>
                      {editingSPTId ? (isCheckMode ? "校核标贯记录" : "编辑标贯记录") : "新增标贯记录"}
                      {isCheckMode && <span className="check-badge">校核模式</span>}
                      {isCheckMode && <span className="check-hint">（仅可标记异常和修改备注）</span>}
                    </h4>
                    {!permissions.canEditSPT ? (
                      <div className="permission-empty-state">
                        <span className="empty-lock-icon">🔐</span>
                        <h4>标贯编辑功能受限</h4>
                        <p>当前角色为「{currentRole}」，仅「现场编录员」可新增标贯记录，「岩土工程师」可校核数据</p>
                      </div>
                    ) : (
                      <>
                        <div className="spt-form-grid">
                          <label><span>试验深度 (m)</span><input type="number" step="0.1" className={`${sptErrors.depth ? "input-error" : ""} ${isCheckMode ? "input-readonly" : ""}`} placeholder="标贯试验深度" value={sptForm.depth} onChange={(e) => handleSPTInputChange("depth", e.target.value)} disabled={isCheckMode} readOnly={isCheckMode} />{sptErrors.depth && <em className="error-tip">{sptErrors.depth}</em>}{isCheckMode && <em className="check-tip">校核模式，不可修改</em>}</label>
                          <label><span>标贯击数</span><input type="number" step="1" className={`${sptErrors.blowCount ? "input-error" : ""} ${isCheckMode ? "input-readonly" : ""}`} placeholder="击数" value={sptForm.blowCount} onChange={(e) => handleSPTInputChange("blowCount", e.target.value)} disabled={isCheckMode} readOnly={isCheckMode} />{sptErrors.blowCount && <em className="error-tip">{sptErrors.blowCount}</em>}{isCheckMode && <em className="check-tip">校核模式，不可修改</em>}</label>
                          <label className="checkbox-label"><span>是否异常{isCheckMode && <em className="inline-check-tip">(校核标记)</em>}</span><div className="checkbox-wrapper"><input type="checkbox" checked={sptForm.isAbnormal} onChange={(e) => handleSPTInputChange("isAbnormal", e.target.checked)} /><span className="checkbox-text">{sptForm.isAbnormal ? "是（需复核）" : "否（正常）"}</span></div></label>
                          <label className="full-width"><span>备注{isCheckMode && <em className="inline-check-tip">(校核说明)</em>}</span><input placeholder={isCheckMode ? "请填写校核说明或备注" : "异常原因或其他说明"} value={sptForm.remark} onChange={(e) => handleSPTInputChange("remark", e.target.value)} /></label>
                        </div>
                        {sptValidationMessage && (<div className="spt-validation-error">{sptValidationMessage}</div>)}
                        <div className="spt-form-actions">
                          {editingSPTId ? (
                            <>
                              <button className="secondary-btn" onClick={handleCancelSPTEdit}>取消</button>
                              <button className="primary-action" onClick={handleUpdateSPTRecord}>
                                {isCheckMode ? "确认校核" : "更新记录"}
                              </button>
                            </>
                          ) : (<button className={`primary-action ${isCheckMode ? "btn-disabled" : ""}`} onClick={!isCheckMode ? handleAddSPTRecord : undefined} disabled={isCheckMode} title={isCheckMode ? "校核模式，不可新增标贯记录" : ""}>
                            {isCheckMode ? "无权限新增" : "添加标贯记录"}
                          </button>)}
                        </div>
                      </>
                    )}
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
                              <td>
                                <button
                                  className={`small-btn ${!permissions.canEditSPT ? "btn-disabled" : ""}`}
                                  onClick={permissions.canEditSPT ? () => handleEditSPTRecord(record) : undefined}
                                  disabled={!permissions.canEditSPT}
                                  title={!permissions.canEditSPT ? "当前角色无编辑权限" : ""}
                                >
                                  {permissions.canCheckSPT && currentRole === "岩土工程师" ? "校核" : "编辑"}
                                </button>
                                <button
                                  className={`small-btn danger-btn ${!permissions.canEditSPT || isCheckMode ? "btn-disabled" : ""}`}
                                  onClick={permissions.canEditSPT && !isCheckMode ? () => handleDeleteSPTRecord(record.id) : undefined}
                                  disabled={!permissions.canEditSPT || isCheckMode}
                                  title={isCheckMode ? "校核模式，不可删除" : !permissions.canEditSPT ? "当前角色无删除权限" : ""}
                                >
                                  删除
                                </button>
                              </td>
                            </tr>
                          ))}
                          {sortedSPTRecords.length === 0 && (<tr><td colSpan={7} className="empty-row">{permissions.canEditSPT ? "暂无标贯记录，请添加" : "暂无标贯记录（仅查看）"}</td></tr>)}
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
                    {!permissions.canEditSampling ? (
                      <div className="permission-empty-state">
                        <span className="empty-lock-icon">🔐</span>
                        <h4>取样编辑功能受限</h4>
                        <p>当前角色为「{currentRole}」，仅「现场编录员」可编辑取样记录</p>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
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
                              <td>
                                <button
                                  className={`small-btn ${!permissions.canEditSampling ? "btn-disabled" : ""}`}
                                  onClick={permissions.canEditSampling ? () => handleEditSamplingRecord(record) : undefined}
                                  disabled={!permissions.canEditSampling}
                                  title={!permissions.canEditSampling ? "当前角色无编辑权限" : ""}
                                >
                                  编辑
                                </button>
                                <button
                                  className={`small-btn danger-btn ${!permissions.canEditSampling ? "btn-disabled" : ""}`}
                                  onClick={permissions.canEditSampling ? () => handleDeleteSamplingRecord(record.id) : undefined}
                                  disabled={!permissions.canEditSampling}
                                  title={!permissions.canEditSampling ? "当前角色无删除权限" : ""}
                                >
                                  删除
                                </button>
                              </td>
                            </tr>
                          ))}
                          {sortedSamplingRecords.length === 0 && (<tr><td colSpan={7} className="empty-row">{permissions.canEditSampling ? "暂无取样记录，请添加" : "暂无取样记录（仅查看）"}</td></tr>)}
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
                      <strong className={!latestStableWaterLevel ? "wl-pending" : ""}>
                        {latestWaterLevel?.firstSeenLevel || "-"}m
                      </strong>
                      <em>{sortedWaterLevelRecords.length === 0 ? "未观测" : "最新观测"}</em>
                    </div>
                    <div className="spt-stat-card">
                      <span>稳定水位</span>
                      <strong className={!latestStableWaterLevel ? "wl-pending" : ""}>
                        {latestStableWaterLevel?.stableLevel || "-"}m
                      </strong>
                      <em>{latestStableWaterLevel ? "已稳定" : sortedWaterLevelRecords.length === 0 ? "未观测" : "待稳定"}</em>
                    </div>
                  </div>
                  <div className="spt-form-section">
                    <h4>{editingWaterLevelId ? "编辑水位观测" : "新增水位观测"}</h4>
                    {!permissions.canEditWaterLevel ? (
                      <div className="permission-empty-state">
                        <span className="empty-lock-icon">🔐</span>
                        <h4>水位观测编辑功能受限</h4>
                        <p>当前角色为「{currentRole}」，仅「现场编录员」可编辑水位观测记录</p>
                      </div>
                    ) : (
                      <>
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
                      </>
                    )}
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
                                <button
                                  className={`small-btn ${!permissions.canEditWaterLevel ? "btn-disabled" : ""}`}
                                  onClick={permissions.canEditWaterLevel ? () => handleEditWaterLevelRecord(record) : undefined}
                                  disabled={!permissions.canEditWaterLevel}
                                  title={!permissions.canEditWaterLevel ? "当前角色无编辑权限" : ""}
                                >
                                  编辑
                                </button>
                                <button
                                  className={`small-btn danger-btn ${!permissions.canEditWaterLevel ? "btn-disabled" : ""}`}
                                  onClick={permissions.canEditWaterLevel ? () => handleDeleteWaterLevelRecord(record.id) : undefined}
                                  disabled={!permissions.canEditWaterLevel}
                                  title={!permissions.canEditWaterLevel ? "当前角色无删除权限" : ""}
                                >
                                  删除
                                </button>
                              </td>
                            </tr>
                          ))}
                          {sortedWaterLevelRecords.length === 0 && (
                            <tr><td colSpan={7} className="empty-row">{permissions.canEditWaterLevel ? "暂无水位观测记录，请添加" : "暂无水位观测记录（仅查看）"}</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
              )}
            </>
          ) : (
            <div className="layer-editor-empty">
              <p>请从左侧选择一个钻孔以查看和编辑地层分层</p>
            </div>
          )}
        </div>
          </>
        )}
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
                      <tr><th>序号</th><th>钻孔编号</th><th>孔深</th><th>岩性分类</th><th>地下水位</th><th>最近观测</th><th>标贯</th><th>取样</th><th>地层</th></tr>
                    </thead>
                    <tbody>
                      {filteredRecords.map((r, i) => {
                        const bhSPT = sptRecords[r["钻孔编号"]] || [];
                        const bhSampling = samplingRecords[r["钻孔编号"]] || [];
                        const bhLayers = boreholeLayers[r["钻孔编号"]] || [];
                        const wlDisplay = getWaterLevelDisplayText(r["钻孔编号"]);
                        const latestObservation = getLatestWaterLevelObservationText(r["钻孔编号"]);
                        return (
                          <tr key={r["钻孔编号"]}>
                            <td>{i + 1}</td>
                            <td><strong>{r["钻孔编号"]}</strong></td>
                            <td>{r["孔深"]}m</td>
                            <td><span className="tag">{r["岩性分类"]}</span></td>
                            <td>{wlDisplay}</td>
                            <td>{latestObservation}</td>
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
                  {filteredRecords.map(r => {
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
                  {filteredRecords.map(r => {
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
                  {filteredRecords.map(r => {
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
              <button
                className="secondary-btn"
                onClick={() => {
                  setShowPreview(false);
                  setShowPrintReport(true);
                }}
              >
                📋 生成打印报告
              </button>
              <button className="primary-action" onClick={handleCopySummary}>
                {copySuccess ? "✓ 已复制" : "复制文本"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className="modal-overlay" onClick={() => setShowClearConfirm(false)}>
          <div className="modal-content confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>确认清空本地数据</h3>
              <button className="modal-close" onClick={() => setShowClearConfirm(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="confirm-warning">
                <p><strong>⚠️ 此操作不可撤销</strong></p>
                <p>清空后将删除所有本地保存的：</p>
                <ul>
                  <li>钻孔记录（{records.length}条）</li>
                  <li>地层分层数据</li>
                  <li>标贯试验记录</li>
                  <li>取样记录</li>
                  <li>地下水位观测</li>
                </ul>
                <p>系统将自动恢复为示例种子数据。</p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setShowClearConfirm(false)}>取消</button>
              <button className="danger-btn danger-btn-large" onClick={handleClearData}>确认清空</button>
            </div>
          </div>
        </div>
      )}

      {showArchiveExport && (
        <div className="modal-overlay" onClick={() => setShowArchiveExport(false)}>
          <div className="modal-content archive-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>导出项目归档</h3>
              <button className="modal-close" onClick={() => setShowArchiveExport(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="archive-info">
                <div className="archive-info-item">
                  <span>项目编号</span>
                  <strong>{project.id}</strong>
                </div>
                <div className="archive-info-item">
                  <span>钻孔数量</span>
                  <strong>{records.length} 条</strong>
                </div>
                <div className="archive-info-item">
                  <span>累计孔深</span>
                  <strong>{records.reduce((s, r) => s + (parseFloat(r["孔深"]) || 0), 0).toFixed(1)} m</strong>
                </div>
                <div className="archive-info-item">
                  <span>导出角色</span>
                  <strong>{currentRole}</strong>
                </div>
              </div>
              <div className="archive-desc">
                <p>归档文件将包含以下数据：</p>
                <ul>
                  <li>✓ 钻孔记录（{records.length}条）</li>
                  <li>✓ 地层分层数据</li>
                  <li>✓ 标贯试验记录及校核状态</li>
                  <li>✓ 取样记录</li>
                  <li>✓ 地下水位观测</li>
                  <li>✓ 数据版本号 v1.0.0</li>
                </ul>
              </div>
            </div>
            <div className="modal-footer">
              <button className="secondary-btn" onClick={() => setShowArchiveExport(false)}>取消</button>
              <button className="primary-action" onClick={handleExportArchive}>
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}

      {showArchiveImport && (
        <div className="modal-overlay" onClick={handleCloseImport}>
          <div className="modal-content archive-modal import-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>导入项目归档</h3>
              <button className="modal-close" onClick={handleCloseImport}>×</button>
            </div>
            <div className="modal-body">
              {!importFile && !importLoading && (
                <div
                  className={`import-dropzone ${isDragOver ? "dragover" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    className="import-file-input"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImportFileSelect(file);
                    }}
                  />
                  <div className="dropzone-icon">📁</div>
                  <p className="dropzone-title">点击或拖拽选择归档文件</p>
                  <p className="dropzone-hint">支持 .json 格式的项目归档文件</p>
                </div>
              )}

              {importLoading && (
                <div className="import-loading">
                  <div className="loading-spinner"></div>
                  <p>正在解析归档文件...</p>
                </div>
              )}

              {importError && !importLoading && (
                <div className="import-error">
                  <p className="error-title">❌ 导入失败</p>
                  <p className="error-message">{importError}</p>
                  <button className="secondary-btn" onClick={() => {
                    setImportError("");
                    setImportFile(null);
                    setImportPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}>
                    重新选择文件
                  </button>
                </div>
              )}

              {importPreview && !importLoading && !importResult && (
                <div className="import-preview">
                  <div className="preview-meta">
                    <div className="preview-meta-item">
                      <span>项目编号</span>
                      <strong>{importPreview.archiveMeta.projectId}</strong>
                    </div>
                    <div className="preview-meta-item">
                      <span>归档版本</span>
                      <strong>v{importPreview.archiveMeta.version}</strong>
                    </div>
                    <div className="preview-meta-item">
                      <span>导出时间</span>
                      <strong>{formatArchiveDate(importPreview.archiveMeta.exportedAt)}</strong>
                    </div>
                    <div className="preview-meta-item">
                      <span>导出人</span>
                      <strong>{importPreview.archiveMeta.exportedBy}</strong>
                    </div>
                  </div>

                  <div className="preview-stats">
                    <div className="preview-stat stat-new">
                      <strong>{importPreview.newCount}</strong>
                      <span>新增钻孔</span>
                    </div>
                    <div className="preview-stat stat-overwrite">
                      <strong>{importPreview.overwriteCount}</strong>
                      <span>覆盖更新</span>
                    </div>
                    <div className="preview-stat stat-conflict">
                      <strong>{importPreview.conflictCount}</strong>
                      <span>存在冲突</span>
                    </div>
                    <div className="preview-stat stat-unrecognized">
                      <strong>{importPreview.unrecognizedCount}</strong>
                      <span>无法识别</span>
                    </div>
                    {importPreview.duplicateInArchiveCount > 0 && (
                      <div className="preview-stat stat-duplicate">
                        <strong>{importPreview.duplicateInArchiveCount}</strong>
                        <span>归档内重复</span>
                      </div>
                    )}
                  </div>

                  {(importPreview.normalizationStats.totalChanges > 0 || importPreview.checkedBoreholeCount > 0) && (
                    <div className="preview-info-panel">
                      {importPreview.normalizationStats.totalChanges > 0 && (
                        <div className="info-block">
                          <h4>📐 深度单位归一化</h4>
                          <div className="info-stats-row">
                            <span>共 <strong>{importPreview.normalizationStats.totalChanges}</strong> 处调整</span>
                            {importPreview.normalizationStats.unitConvertedCount > 0 && (
                              <span>单位换算 <strong>{importPreview.normalizationStats.unitConvertedCount}</strong> 处</span>
                            )}
                          </div>
                          <div className="info-stats-row minor">
                            {importPreview.normalizationStats.boreholeDepthCount > 0 && <span>钻孔孔深 {importPreview.normalizationStats.boreholeDepthCount}</span>}
                            {importPreview.normalizationStats.waterLevelCount > 0 && <span>地下水位 {importPreview.normalizationStats.waterLevelCount}</span>}
                            {importPreview.normalizationStats.layerDepthCount > 0 && <span>分层深度 {importPreview.normalizationStats.layerDepthCount}</span>}
                            {importPreview.normalizationStats.sptDepthCount > 0 && <span>标贯深度 {importPreview.normalizationStats.sptDepthCount}</span>}
                          </div>
                        </div>
                      )}
                      {importPreview.checkedBoreholeCount > 0 && (
                        <div className="info-block">
                          <h4>✓ 校核状态</h4>
                          <div className="info-stats-row">
                            <span><strong>{importPreview.checkedBoreholeCount}</strong> / {importPreview.totalBoreholeCount} 个钻孔含校核数据</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {importPreview.warnings.length > 0 && (
                    <div className="preview-warnings">
                      <h4>⚠️ 处理警告</h4>
                      <ul>
                        {importPreview.warnings.slice(0, 5).map((w, i) => (
                          <li key={i}>{w}</li>
                        ))}
                        {importPreview.warnings.length > 5 && (
                          <li>...还有 {importPreview.warnings.length - 5} 条警告</li>
                        )}
                      </ul>
                    </div>
                  )}

                  <div className="import-options">
                    <h4>导入选项</h4>
                    <label className="option-checkbox">
                      <input
                        type="checkbox"
                        checked={importOptions.includeNew}
                        onChange={(e) => setImportOptions(prev => ({ ...prev, includeNew: e.target.checked }))}
                      />
                      <span>导入新增钻孔（{importPreview.newCount}个）</span>
                    </label>
                    <label className="option-checkbox">
                      <input
                        type="checkbox"
                        checked={importOptions.includeOverwrite}
                        onChange={(e) => setImportOptions(prev => ({ ...prev, includeOverwrite: e.target.checked }))}
                      />
                      <span>覆盖更新相同钻孔（{importPreview.overwriteCount}个）</span>
                    </label>
                    <label className="option-checkbox">
                      <input
                        type="checkbox"
                        checked={importOptions.includeConflict}
                        onChange={(e) => setImportOptions(prev => ({ ...prev, includeConflict: e.target.checked }))}
                      />
                      <span>处理冲突钻孔（{importPreview.conflictCount}个，可展开逐项选择保留本地或采用归档）</span>
                    </label>
                    <label className="option-checkbox">
                      <input
                        type="checkbox"
                        checked={importOptions.preserveChecked}
                        onChange={(e) => setImportOptions(prev => ({ ...prev, preserveChecked: e.target.checked }))}
                      />
                      <span>保留本地已校核数据（冲突时优先保留本地已校核的记录）</span>
                    </label>
                  </div>

                  {importOptions.includeConflict && importPreview.conflictCount > 0 && (
                    <div className="conflict-bulk-actions">
                      <h4>批量处理冲突</h4>
                      <div className="bulk-action-row">
                        <div className="bulk-action-group">
                          <span>所有冲突类别：</span>
                          <button className="bulk-btn" onClick={() => handleBulkAllConflictResolution("archive")}>全部采用归档</button>
                          <button className="bulk-btn" onClick={() => handleBulkAllConflictResolution("local")}>全部保留本地</button>
                        </div>
                      </div>
                      <div className="bulk-action-row">
                        <div className="bulk-action-group">
                          <span>按类别批量：</span>
                          {(["basicInfo", "layers", "spt", "sampling", "waterLevel"] as ConflictCategory[]).map((cat) => {
                            const hasConflictInCategory = importPreview.boreholes.some(
                              (item) => item.status === "conflict" && item.conflictDetails?.categories[cat]?.hasConflict
                            );
                            if (!hasConflictInCategory) return null;
                            return (
                              <div key={cat} className="bulk-category-group">
                                <span className="bulk-category-label">{CATEGORY_LABELS[cat]}</span>
                                <button
                                  className="bulk-btn-small"
                                  onClick={() => handleBulkCategoryResolution(cat, "archive")}
                                >归档</button>
                                <button
                                  className="bulk-btn-small"
                                  onClick={() => handleBulkCategoryResolution(cat, "local")}
                                >本地</button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="preview-list">
                    <h4>钻孔明细（点击冲突钻孔可展开查看差异）</h4>
                    <div className="borehole-preview-list">
                      {importPreview.boreholes.map((item, i) => {
                        const isExpanded = expandedConflictBoreholes.has(item.boreholeId);
                        const hasConflictDetails = item.status === "conflict" && item.conflictDetails?.hasConflict;
                        return (
                          <div
                            key={i}
                            className={`borehole-preview-item status-${item.status}${item.isDuplicateInArchive ? ' is-duplicate' : ''}${hasConflictDetails ? ' is-expandable' : ''}${isExpanded ? ' is-expanded' : ''}`}
                          >
                            <div
                              className="borehole-preview-header"
                              onClick={() => hasConflictDetails && toggleConflictBoreholeExpanded(item.boreholeId)}
                              style={{ cursor: hasConflictDetails ? 'pointer' : 'default' }}
                            >
                              <div className="borehole-preview-id">
                                {hasConflictDetails && (
                                  <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>▶</span>
                                )}
                                <span className={`status-dot dot-${item.status}`}></span>
                                <strong>{item.boreholeId}</strong>
                                {item.checkInfo?.hasAnyChecked && <span className="check-badge" title="含校核数据">✓</span>}
                                {item.isDuplicateInArchive && <span className="duplicate-badge">重复#{item.duplicateIndex !== undefined ? item.duplicateIndex + 1 : ''}</span>}
                              </div>
                              <span className="borehole-preview-detail">{item.details}</span>
                              {item.normalizationChanges && item.normalizationChanges.length > 0 && (
                                <div className="norm-changes">
                                  {item.normalizationChanges.slice(0, 3).map((c, ci) => (
                                    <span key={ci} className="norm-change-tag">{c.field}: {c.original} → {c.normalized}</span>
                                  ))}
                                  {item.normalizationChanges.length > 3 && <span className="norm-change-tag">+{item.normalizationChanges.length - 3}</span>}
                                </div>
                              )}
                            </div>

                            {isExpanded && hasConflictDetails && (
                              <div className="conflict-details-panel">
                                {(["basicInfo", "layers", "spt", "sampling", "waterLevel"] as ConflictCategory[]).map((cat) => {
                                  const catDiff = item.conflictDetails!.categories[cat];
                                  if (!catDiff.hasConflict) return null;
                                  const resolution = item.resolutions?.[cat] || "archive";
                                  return (
                                    <div key={cat} className="category-conflict-block">
                                      <div className="category-conflict-header">
                                        <div className="category-title-row">
                                          <span className="category-conflict-title">
                                            <strong>{CATEGORY_LABELS[cat]}</strong>
                                          </span>
                                          <span className="category-conflict-stats">
                                            {catDiff.modifiedCount > 0 && <span className="stat-tag stat-modified">修改{catDiff.modifiedCount}</span>}
                                            {catDiff.addedCount > 0 && <span className="stat-tag stat-added">新增{catDiff.addedCount}</span>}
                                            {catDiff.removedCount > 0 && <span className="stat-tag stat-removed">删除{catDiff.removedCount}</span>}
                                          </span>
                                        </div>
                                        <div className="category-resolution-row">
                                          <span className="resolution-label">处理方式：</span>
                                          <label className={`resolution-option ${resolution === "archive" ? "selected" : ""}`}>
                                            <input
                                              type="radio"
                                              name={`resolution-${item.boreholeId}-${cat}`}
                                              checked={resolution === "archive"}
                                              onChange={() => handleCategoryResolutionChange(i, cat, "archive")}
                                            />
                                            <span>采用归档</span>
                                          </label>
                                          <label className={`resolution-option ${resolution === "local" ? "selected" : ""}`}>
                                            <input
                                              type="radio"
                                              name={`resolution-${item.boreholeId}-${cat}`}
                                              checked={resolution === "local"}
                                              onChange={() => handleCategoryResolutionChange(i, cat, "local")}
                                            />
                                            <span>保留本地</span>
                                          </label>
                                        </div>
                                      </div>

                                      <div className="diff-table-wrapper">
                                        {cat === "basicInfo" ? (
                                          <table className="diff-table">
                                            <thead>
                                              <tr>
                                                <th>字段</th>
                                                <th className="col-local">本地值</th>
                                                <th className="col-arrow"></th>
                                                <th className="col-archive">归档值</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {catDiff.fieldDiffs.map((fd, fi) => (
                                                <tr key={fi} className="diff-row diff-modified">
                                                  <td className="diff-field-name">{fd.fieldLabel}</td>
                                                  <td className={`diff-value col-local ${resolution === "local" ? "value-selected" : ""}`}>{fd.localValue || "—"}</td>
                                                  <td className="col-arrow">→</td>
                                                  <td className={`diff-value col-archive ${resolution === "archive" ? "value-selected" : ""}`}>{fd.archiveValue || "—"}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        ) : (
                                          <table className="diff-table">
                                            <thead>
                                              <tr>
                                                <th>类型</th>
                                                <th>匹配键</th>
                                                <th>字段</th>
                                                <th className="col-local">本地值</th>
                                                <th className="col-arrow"></th>
                                                <th className="col-archive">归档值</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {catDiff.recordDiffs.map((rd, ri) => (
                                                rd.fields.map((fd, fi) => (
                                                  <tr key={`${ri}-${fi}`} className={`diff-row diff-${rd.diffType}`}>
                                                    {fi === 0 && (
                                                      <>
                                                        <td rowSpan={rd.fields.length} className={`diff-type-cell diff-type-${rd.diffType}`}>
                                                          {rd.diffType === "added" ? "新增" : rd.diffType === "removed" ? "删除" : "修改"}
                                                        </td>
                                                        <td rowSpan={rd.fields.length} className="diff-match-key">{rd.matchValue}</td>
                                                      </>
                                                    )}
                                                    <td className="diff-field-name">{fd.fieldLabel}</td>
                                                    <td className={`diff-value col-local ${rd.diffType === "removed" ? "value-strikethrough" : ""} ${resolution === "local" ? "value-selected" : ""}`}>{fd.localValue || "—"}</td>
                                                    <td className="col-arrow">→</td>
                                                    <td className={`diff-value col-archive ${rd.diffType === "added" ? "value-highlight" : ""} ${resolution === "archive" ? "value-selected" : ""}`}>{fd.archiveValue || "—"}</td>
                                                  </tr>
                                                ))
                                              ))}
                                            </tbody>
                                          </table>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="import-result">
                  {importResult.success ? (
                    <>
                      <div className="result-icon success">✓</div>
                      <h4>导入成功</h4>
                      <p>
                        {importResult.resumedFromProgress && <span className="resume-hint">（从中断点恢复） </span>}
                        成功导入 <strong>{importResult.importedCount}</strong> 个钻孔，跳过 <strong>{importResult.skippedCount}</strong> 个
                      </p>
                      {importResult.warnings.length > 0 && (
                        <div className="result-warnings">
                          <p>警告信息：</p>
                          <ul>
                            {importResult.warnings.slice(0, 3).map((w, i) => (
                              <li key={i}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="result-icon error">✗</div>
                      <h4>导入失败</h4>
                      <p>{importResult.error || "未知错误"}</p>
                      <p className="result-hint">已导入的数据已保存，可重新选择文件后点击「继续导入」从中断处恢复。</p>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              {importResult ? (
                <button className="primary-action" onClick={handleCloseImport}>
                  完成
                </button>
              ) : importPreview && !importLoading ? (
                <>
                  <button className="secondary-btn" onClick={handleCloseImport}>取消</button>
                  <button
                    className="primary-action"
                    onClick={handleConfirmImport}
                    disabled={!importOptions.includeNew && !importOptions.includeOverwrite && !importOptions.includeConflict}
                  >
                    确认导入
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {showPrintReport && (
        <PrintReport
          projectId={project.id}
          projectTitle={project.title}
          filteredRecords={filteredRecords}
          boreholeLayers={boreholeLayers}
          sptRecords={sptRecords}
          samplingRecords={samplingRecords}
          waterLevelRecords={waterLevelRecords}
          selectedBoreholesForCharts={selectedBoreholesForCompare}
          getWaterLevelDisplayText={getWaterLevelDisplayText}
          getLatestWaterLevelObservationText={getLatestWaterLevelObservationText}
          getLatestStableWaterLevel={getLatestStableWaterLevel}
          getLayerLithology={getLayerLithology}
          onClose={() => setShowPrintReport(false)}
        />
      )}
    </main>
  );
}

export default App;
