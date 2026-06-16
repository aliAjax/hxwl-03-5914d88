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

const lithologyOptions = ["黏土", "粉质黏土", "粉土", "粉砂", "细砂", "中砂", "粗砂", "卵石", "圆砾", "强风化岩", "中风化岩", "微风化岩"];
const soilColorOptions = ["褐黄色", "黄褐色", "灰黄色", "灰白色", "灰色", "灰褐色", "紫红色", "杂色"];
const densityOptions = ["松散", "稍密", "中密", "密实", "可塑", "硬塑", "坚硬", "流塑"];

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

  const sptStats = useMemo(() => {
    const records = sortedSPTRecords;
    if (records.length === 0) {
      return { maxBlow: 0, abnormalCount: 0, totalCount: 0, maxBlowLithology: "-" };
    }

    let maxBlow = 0;
    let maxBlowLayerId = "";
    let abnormalCount = 0;

    for (const record of records) {
      const blow = parseFloat(record.blowCount);
      if (!isNaN(blow) && blow > maxBlow) {
        maxBlow = blow;
        maxBlowLayerId = record.layerId;
      }
      if (record.isAbnormal) {
        abnormalCount++;
      }
    }

    const maxBlowLayer = sortedLayers.find(l => l.id === maxBlowLayerId);
    const maxBlowLithology = maxBlowLayer ? maxBlowLayer.lithology : "-";

    return {
      maxBlow,
      abnormalCount,
      totalCount: records.length,
      maxBlowLithology
    };
  }, [sortedSPTRecords, sortedLayers]);

  const validateLayerForm = useCallback((): { valid: boolean; errors: Partial<Record<keyof StratumLayer, string>> } => {
    const errs: Partial<Record<keyof StratumLayer, string>> = {};

    if (!layerForm.startDepth.trim()) {
      errs.startDepth = "起始深度不能为空";
    } else if (isNaN(parseFloat(layerForm.startDepth)) || parseFloat(layerForm.startDepth) < 0) {
      errs.startDepth = "起始深度必须为非负数";
    }

    if (!layerForm.endDepth.trim()) {
      errs.endDepth = "终止深度不能为空";
    } else if (isNaN(parseFloat(layerForm.endDepth)) || parseFloat(layerForm.endDepth) < 0) {
      errs.endDepth = "终止深度必须为非负数";
    }

    if (!layerForm.lithology.trim()) {
      errs.lithology = "岩性不能为空";
    }

    if (!layerForm.soilColor.trim()) {
      errs.soilColor = "土色不能为空";
    }

    if (!layerForm.density.trim()) {
      errs.density = "密实度/状态不能为空";
    }

    const start = parseFloat(layerForm.startDepth);
    const end = parseFloat(layerForm.endDepth);

    if (!isNaN(start) && !isNaN(end) && start >= end) {
      errs.endDepth = "终止深度必须大于起始深度";
    }

    if (!isNaN(end) && holeDepth > 0 && end > holeDepth) {
      errs.endDepth = `终止深度不能超过钻孔深度(${holeDepth}m)`;
    }

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
      if (start < le && end > ls) {
        hasOverlap = true;
        break;
      }
    }

    const allLayers = [...layers, { ...layerForm, id: "temp" } as StratumLayer]
      .sort((a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth));

    const gaps: string[] = [];
    let prevEnd = 0;
    for (const layer of allLayers) {
      const ls = parseFloat(layer.startDepth);
      if (ls > prevEnd + 0.001) {
        gaps.push(`${prevEnd.toFixed(2)}m ~ ${ls.toFixed(2)}m`);
      }
      prevEnd = Math.max(prevEnd, parseFloat(layer.endDepth));
    }
    if (holeDepth > 0 && prevEnd < holeDepth - 0.001) {
      gaps.push(`${prevEnd.toFixed(2)}m ~ ${holeDepth.toFixed(2)}m`);
    }

    return { hasOverlap, gaps };
  }, [currentLayers, editingLayerId, layerForm, holeDepth]);

  const layerValidation = useMemo(() => {
    const { valid, errors: formErrors } = validateLayerForm();
    if (!valid) return { valid: false, message: "" };

    const { hasOverlap, gaps } = checkOverlapAndGaps();
    if (hasOverlap) {
      return { valid: false, message: "该层与现有分层深度重叠，请调整" };
    }

    return { valid: true, message: "", gaps };
  }, [validateLayerForm, checkOverlapAndGaps]);

  const handleLayerInputChange = (field: keyof Omit<StratumLayer, "id">, value: string) => {
    setLayerForm(prev => ({ ...prev, [field]: value }));
    if (layerErrors[field]) {
      setLayerErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (layerValidationMessage) {
      setLayerValidationMessage("");
    }
  };

  const handleAddLayer = () => {
    setLayerValidationMessage("");
    const { valid, errors: formErrors } = validateLayerForm();
    setLayerErrors(formErrors);

    if (!valid) return;

    const { hasOverlap, gaps } = checkOverlapAndGaps();
    if (hasOverlap) {
      setLayerValidationMessage("该层与现有分层深度重叠，请调整深度范围");
      return;
    }

    if (!selectedBorehole) return;

    const newLayer: StratumLayer = {
      ...layerForm,
      id: generateId()
    };

    setBoreholeLayers(prev => {
      const existing = prev[selectedBorehole] || [];
      return { ...prev, [selectedBorehole]: [...existing, newLayer] };
    });

    setLayerForm(emptyLayerForm);
    setLayerErrors({});
    setLayerValidationMessage("");
  };

  const handleUpdateLayer = () => {
    setLayerValidationMessage("");
    const { valid, errors: formErrors } = validateLayerForm();
    setLayerErrors(formErrors);

    if (!valid || !editingLayerId || !selectedBorehole) return;

    const { hasOverlap } = checkOverlapAndGaps();
    if (hasOverlap) {
      setLayerValidationMessage("该层与现有分层深度重叠，请调整深度范围");
      return;
    }

    setBoreholeLayers(prev => {
      const existing = prev[selectedBorehole] || [];
      return {
        ...prev,
        [selectedBorehole]: existing.map(l =>
          l.id === editingLayerId ? { ...layerForm, id: editingLayerId } : l
        )
      };
    });

    setLayerForm(emptyLayerForm);
    setEditingLayerId(null);
    setLayerErrors({});
    setLayerValidationMessage("");
  };

  const handleEditLayer = (layer: StratumLayer) => {
    setLayerForm({
      startDepth: layer.startDepth,
      endDepth: layer.endDepth,
      lithology: layer.lithology,
      soilColor: layer.soilColor,
      density: layer.density,
      description: layer.description
    });
    setEditingLayerId(layer.id);
    setLayerErrors({});
    setLayerValidationMessage("");
  };

  const handleDeleteLayer = (layerId: string) => {
    if (!selectedBorehole) return;
    setBoreholeLayers(prev => {
      const existing = prev[selectedBorehole] || [];
      return { ...prev, [selectedBorehole]: existing.filter(l => l.id !== layerId) };
    });
    if (editingLayerId === layerId) {
      setLayerForm(emptyLayerForm);
      setEditingLayerId(null);
    }
  };

  const handleCancelEdit = () => {
    setLayerForm(emptyLayerForm);
    setEditingLayerId(null);
    setLayerErrors({});
    setLayerValidationMessage("");
  };

  const validateSPTForm = useCallback((): { valid: boolean; errors: Partial<Record<keyof SPTRecord, string>> } => {
    const errs: Partial<Record<keyof SPTRecord, string>> = {};

    if (!sptForm.depth.trim()) {
      errs.depth = "深度不能为空";
    } else if (isNaN(parseFloat(sptForm.depth)) || parseFloat(sptForm.depth) < 0) {
      errs.depth = "深度必须为非负数";
    }

    if (!sptForm.blowCount.trim()) {
      errs.blowCount = "击数不能为空";
    } else if (isNaN(parseFloat(sptForm.blowCount)) || parseFloat(sptForm.blowCount) < 0) {
      errs.blowCount = "击数必须为非负数";
    }

    return { valid: Object.keys(errs).length === 0, errors: errs };
  }, [sptForm]);

  const checkDepthInLayers = useCallback((): { valid: boolean; message: string; layer: StratumLayer | null } => {
    const depth = parseFloat(sptForm.depth);
    if (isNaN(depth)) return { valid: false, message: "", layer: null };

    if (sortedLayers.length === 0) {
      return { valid: false, message: "当前钻孔暂无地层分层数据，请先添加分层", layer: null };
    }

    const layer = findLayerByDepth(depth);

    if (!layer) {
      const minDepth = parseFloat(sortedLayers[0].startDepth);
      const maxDepth = parseFloat(sortedLayers[sortedLayers.length - 1].endDepth);

      if (depth < minDepth) {
        return { valid: false, message: `深度 ${depth}m 位于地层之上（最浅分层起始于 ${minDepth}m），请检查深度是否正确`, layer: null };
      } else if (depth > maxDepth) {
        return { valid: false, message: `深度 ${depth}m 超出最深分层（最深分层终止于 ${maxDepth}m），请检查深度是否正确`, layer: null };
      } else {
        return { valid: false, message: `深度 ${depth}m 落在分层缺口处，请先补全该深度范围的分层`, layer: null };
      }
    }

    return { valid: true, message: "", layer };
  }, [sptForm.depth, sortedLayers, findLayerByDepth]);

  const handleSPTInputChange = (field: keyof Omit<SPTRecord, "id" | "layerId">, value: string | boolean) => {
    setSPTForm(prev => ({ ...prev, [field]: value }));
    if (sptErrors[field]) {
      setSPTErrors(prev => ({ ...prev, [field]: undefined }));
    }
    if (sptValidationMessage) {
      setSPTValidationMessage("");
    }
  };

  const handleAddSPTRecord = () => {
    setSPTValidationMessage("");
    const { valid, errors: formErrors } = validateSPTForm();
    setSPTErrors(formErrors);

    if (!valid) return;

    const { valid: depthValid, message, layer } = checkDepthInLayers();
    if (!depthValid) {
      setSPTValidationMessage(message);
      return;
    }

    if (!selectedBorehole || !layer) return;

    const newRecord: SPTRecord = {
      ...sptForm,
      id: generateId(),
      layerId: layer.id
    };

    setSPTRecords(prev => {
      const existing = prev[selectedBorehole] || [];
      return { ...prev, [selectedBorehole]: [...existing, newRecord] };
    });

    setSPTForm(emptySPTForm);
    setSPTErrors({});
    setSPTValidationMessage("");
  };

  const handleUpdateSPTRecord = () => {
    setSPTValidationMessage("");
    const { valid, errors: formErrors } = validateSPTForm();
    setSPTErrors(formErrors);

    if (!valid || !editingSPTId || !selectedBorehole) return;

    const { valid: depthValid, message, layer } = checkDepthInLayers();
    if (!depthValid) {
      setSPTValidationMessage(message);
      return;
    }

    if (!layer) return;

    setSPTRecords(prev => {
      const existing = prev[selectedBorehole] || [];
      return {
        ...prev,
        [selectedBorehole]: existing.map(r =>
          r.id === editingSPTId ? { ...sptForm, id: editingSPTId, layerId: layer.id } : r
        )
      };
    });

    setSPTForm(emptySPTForm);
    setEditingSPTId(null);
    setSPTErrors({});
    setSPTValidationMessage("");
  };

  const handleEditSPTRecord = (record: SPTRecord) => {
    setSPTForm({
      depth: record.depth,
      blowCount: record.blowCount,
      isAbnormal: record.isAbnormal,
      remark: record.remark
    });
    setEditingSPTId(record.id);
    setSPTErrors({});
    setSPTValidationMessage("");
  };

  const handleDeleteSPTRecord = (recordId: string) => {
    if (!selectedBorehole) return;
    setSPTRecords(prev => {
      const existing = prev[selectedBorehole] || [];
      return { ...prev, [selectedBorehole]: existing.filter(r => r.id !== recordId) };
    });
    if (editingSPTId === recordId) {
      setSPTForm(emptySPTForm);
      setEditingSPTId(null);
    }
  };

  const handleCancelSPTEdit = () => {
    setSPTForm(emptySPTForm);
    setEditingSPTId(null);
    setSPTErrors({});
    setSPTValidationMessage("");
  };

  const getLayerLithology = (layerId: string): string => {
    const layer = sortedLayers.find(l => l.id === layerId);
    return layer ? layer.lithology : "-";
  };

  const handleSelectBorehole = (boreholeId: string) => {
    setSelectedBorehole(boreholeId);
    setLayerForm(emptyLayerForm);
    setEditingLayerId(null);
    setLayerErrors({});
    setLayerValidationMessage("");
    setSPTForm(emptySPTForm);
    setEditingSPTId(null);
    setSPTErrors({});
    setSPTValidationMessage("");
  };

  useEffect(() => {
    if (sortedLayers.length === 0 || holeDepth === 0) {
      setGapMessage("");
      return;
    }

    const gaps: string[] = [];
    let prevEnd = 0;
    for (const layer of sortedLayers) {
      const ls = parseFloat(layer.startDepth);
      if (ls > prevEnd + 0.001) {
        gaps.push(`${prevEnd.toFixed(2)}m ~ ${ls.toFixed(2)}m`);
      }
      prevEnd = Math.max(prevEnd, parseFloat(layer.endDepth));
    }
    if (prevEnd < holeDepth - 0.001) {
      gaps.push(`${prevEnd.toFixed(2)}m ~ ${holeDepth.toFixed(2)}m`);
    }

    if (gaps.length > 0) {
      setGapMessage(`存在缺口区间：${gaps.join("、")}`);
    } else {
      setGapMessage("");
    }
  }, [sortedLayers, holeDepth]);

  const filteredRecords = useMemo(() => {
    if (!activeFilter) return records;
    return records.filter(r => r["岩性分类"] === activeFilter);
  }, [records, activeFilter]);

  const metrics = useMemo(() => {
    const totalDepth = filteredRecords.reduce((sum, r) => sum + (parseFloat(r["孔深"]) || 0), 0);
    const layerCount = filteredRecords.length;
    let maxSPT = 0;
    filteredRecords.forEach(r => {
      const boreholeSPT = sptRecords[r["钻孔编号"]] || [];
      boreholeSPT.forEach(spt => {
        const blow = parseFloat(spt.blowCount);
        if (!isNaN(blow) && blow > maxSPT) {
          maxSPT = blow;
        }
      });
    });
    const avgWaterLevel = filteredRecords.length > 0
      ? filteredRecords.reduce((sum, r) => sum + (parseFloat(r["地下水位"]) || 0), 0) / filteredRecords.length
      : 0;

    return [
      totalDepth.toFixed(1) + "m",
      String(layerCount),
      String(maxSPT) + "击",
      avgWaterLevel.toFixed(1) + "m"
    ];
  }, [filteredRecords, sptRecords]);

  const summaryStats = useMemo(() => {
    const targetRecords = activeFilter ? filteredRecords : records;
    const totalDepth = targetRecords.reduce((sum, r) => sum + (parseFloat(r["孔深"]) || 0), 0);
    const recordCount = targetRecords.length;
    let maxSPT = 0;
    targetRecords.forEach(r => {
      const boreholeSPT = sptRecords[r["钻孔编号"]] || [];
      boreholeSPT.forEach(spt => {
        const blow = parseFloat(spt.blowCount);
        if (!isNaN(blow) && blow > maxSPT) {
          maxSPT = blow;
        }
      });
    });
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
  }, [records, filteredRecords, activeFilter, sptRecords]);

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

    const boreholeId = formData["钻孔编号"].trim();
    const trimmedRecord: DrillingRecord = {
      "钻孔编号": boreholeId,
      "孔深": formData["孔深"].trim(),
      "分层深度": formData["分层深度"].trim(),
      "岩性分类": formData["岩性分类"].trim(),
      "岩性描述": formData["岩性描述"].trim(),
      "土色": formData["土色"].trim(),
      "标贯击数": formData["标贯击数"].trim(),
      "地下水位": formData["地下水位"].trim()
    };

    setRecords(prev => [trimmedRecord, ...prev]);
    setBoreholeLayers(prev => ({ ...prev, [boreholeId]: [] }));
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
            {filteredRecords.map((record, index: number) => (
              <article
                key={record["钻孔编号"] + "-" + index}
                className={`borehole-item ${selectedBorehole === record["钻孔编号"] ? "borehole-selected" : ""}`}
                onClick={() => handleSelectBorehole(record["钻孔编号"])}
              >
                <div className="borehole-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="borehole-info">
                  <h3>{record["钻孔编号"]} <span className="tag">{record["岩性分类"]}</span></h3>
                  <p>孔深{record["孔深"]}m · {record["岩性描述"]}</p>
                </div>
              </article>
            ))}
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
                <div className="column-header">
                  <span>深度(m)</span>
                </div>
                <div className="column-body">
                  {sortedLayers.length > 0 ? (
                    sortedLayers.map((layer, idx) => {
                      const start = parseFloat(layer.startDepth);
                      const end = parseFloat(layer.endDepth);
                      const thickness = end - start;
                      const topPercent = (start / holeDepth) * 100;
                      const heightPercent = (thickness / holeDepth) * 100;
                      const colorClass = `litho-${idx % 6}`;
                      return (
                        <div
                          key={layer.id}
                          className={`stratum-layer ${colorClass}`}
                          style={{ top: `${topPercent}%`, height: `${heightPercent}%` }}
                          onClick={() => handleEditLayer(layer)}
                        >
                          <span className="layer-depth-top">{layer.startDepth}</span>
                          <span className="layer-name">{layer.lithology}</span>
                          <span className="layer-depth-bottom">{layer.endDepth}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="column-empty">暂无分层数据</div>
                  )}
                  <div className="column-scale">
                    {[0, 25, 50, 75, 100].map(pct => (
                      <span key={pct} style={{ top: `${pct}%` }}>{((holeDepth * pct) / 100).toFixed(1)}</span>
                    ))}
                  </div>
                  {sortedSPTRecords.map(record => {
                    const depth = parseFloat(record.depth);
                    const topPercent = holeDepth > 0 ? (depth / holeDepth) * 100 : 0;
                    return (
                      <div
                        key={record.id}
                        className={`spt-marker ${record.isAbnormal ? "spt-abnormal" : ""}`}
                        style={{ top: `${topPercent}%` }}
                        title={`深度${record.depth}m · ${record.blowCount}击${record.isAbnormal ? " · 异常" : ""}${record.remark ? " · " + record.remark : ""}`}
                      >
                        <span>{record.blowCount}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="layer-form-section">
                <h3>{editingLayerId ? "编辑分层" : "新增分层"}</h3>
                <div className="layer-form-grid">
                  <label>
                    <span>起始深度 (m)</span>
                    <input
                      type="number"
                      step="0.1"
                      className={layerErrors.startDepth ? "input-error" : ""}
                      placeholder="起始深度"
                      value={layerForm.startDepth}
                      onChange={(e) => handleLayerInputChange("startDepth", e.target.value)}
                    />
                    {layerErrors.startDepth && <em className="error-tip">{layerErrors.startDepth}</em>}
                  </label>
                  <label>
                    <span>终止深度 (m)</span>
                    <input
                      type="number"
                      step="0.1"
                      className={layerErrors.endDepth ? "input-error" : ""}
                      placeholder="终止深度"
                      value={layerForm.endDepth}
                      onChange={(e) => handleLayerInputChange("endDepth", e.target.value)}
                    />
                    {layerErrors.endDepth && <em className="error-tip">{layerErrors.endDepth}</em>}
                  </label>
                  <label>
                    <span>岩性</span>
                    <select
                      className={layerErrors.lithology ? "input-error" : ""}
                      value={layerForm.lithology}
                      onChange={(e) => handleLayerInputChange("lithology", e.target.value)}
                    >
                      <option value="">选择岩性</option>
                      {lithologyOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {layerErrors.lithology && <em className="error-tip">{layerErrors.lithology}</em>}
                  </label>
                  <label>
                    <span>土色</span>
                    <select
                      className={layerErrors.soilColor ? "input-error" : ""}
                      value={layerForm.soilColor}
                      onChange={(e) => handleLayerInputChange("soilColor", e.target.value)}
                    >
                      <option value="">选择土色</option>
                      {soilColorOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {layerErrors.soilColor && <em className="error-tip">{layerErrors.soilColor}</em>}
                  </label>
                  <label>
                    <span>密实度/状态</span>
                    <select
                      className={layerErrors.density ? "input-error" : ""}
                      value={layerForm.density}
                      onChange={(e) => handleLayerInputChange("density", e.target.value)}
                    >
                      <option value="">选择密实度/状态</option>
                      {densityOptions.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {layerErrors.density && <em className="error-tip">{layerErrors.density}</em>}
                  </label>
                  <label className="full-width">
                    <span>描述</span>
                    <input
                      placeholder="分层描述"
                      value={layerForm.description}
                      onChange={(e) => handleLayerInputChange("description", e.target.value)}
                    />
                  </label>
                </div>

                {layerValidationMessage && (
                  <div className="layer-validation-error">{layerValidationMessage}</div>
                )}

                {gapMessage && sortedLayers.length > 0 && (
                  <div className="layer-gap-warning">{gapMessage}</div>
                )}

                <div className="layer-form-actions">
                  {editingLayerId ? (
                    <>
                      <button className="secondary-btn" onClick={handleCancelEdit}>取消</button>
                      <button className="primary-action" onClick={handleUpdateLayer}>更新分层</button>
                    </>
                  ) : (
                    <button className="primary-action" onClick={handleAddLayer}>添加分层</button>
                  )}
                </div>

                <div className="layer-list-section">
                  <h4>分层列表</h4>
                  <div className="layer-table-wrapper">
                    <table className="layer-table">
                      <thead>
                        <tr>
                          <th>序号</th>
                          <th>深度范围(m)</th>
                          <th>岩性</th>
                          <th>土色</th>
                          <th>密实度</th>
                          <th>描述</th>
                          <th>操作</th>
                        </tr>
                      </thead>
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
                              <button className="small-btn" onClick={() => handleEditLayer(layer)}>编辑</button>
                              <button className="small-btn danger-btn" onClick={() => handleDeleteLayer(layer.id)}>删除</button>
                            </td>
                          </tr>
                        ))}
                        {sortedLayers.length === 0 && (
                          <tr>
                            <td colSpan={7} className="empty-row">暂无分层数据，请添加</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="spt-section">
                  <div className="spt-stats">
                    <div className="spt-stat-card">
                      <span>最高标贯</span>
                      <strong>{sptStats.maxBlow}击</strong>
                      <em>{sptStats.maxBlowLithology}</em>
                    </div>
                    <div className="spt-stat-card">
                      <span>记录总数</span>
                      <strong>{sptStats.totalCount}次</strong>
                      <em>有效试验</em>
                    </div>
                    <div className="spt-stat-card">
                      <span>异常点数</span>
                      <strong className={sptStats.abnormalCount > 0 ? "abnormal-count" : ""}>{sptStats.abnormalCount}个</strong>
                      <em>需复核</em>
                    </div>
                  </div>

                  <div className="spt-form-section">
                    <h4>{editingSPTId ? "编辑标贯记录" : "新增标贯记录"}</h4>
                    <div className="spt-form-grid">
                      <label>
                        <span>试验深度 (m)</span>
                        <input
                          type="number"
                          step="0.1"
                          className={sptErrors.depth ? "input-error" : ""}
                          placeholder="标贯试验深度"
                          value={sptForm.depth}
                          onChange={(e) => handleSPTInputChange("depth", e.target.value)}
                        />
                        {sptErrors.depth && <em className="error-tip">{sptErrors.depth}</em>}
                      </label>
                      <label>
                        <span>标贯击数</span>
                        <input
                          type="number"
                          step="1"
                          className={sptErrors.blowCount ? "input-error" : ""}
                          placeholder="击数"
                          value={sptForm.blowCount}
                          onChange={(e) => handleSPTInputChange("blowCount", e.target.value)}
                        />
                        {sptErrors.blowCount && <em className="error-tip">{sptErrors.blowCount}</em>}
                      </label>
                      <label className="checkbox-label">
                        <span>是否异常</span>
                        <div className="checkbox-wrapper">
                          <input
                            type="checkbox"
                            checked={sptForm.isAbnormal}
                            onChange={(e) => handleSPTInputChange("isAbnormal", e.target.checked)}
                          />
                          <span className="checkbox-text">{sptForm.isAbnormal ? "是（需复核）" : "否（正常）"}</span>
                        </div>
                      </label>
                      <label className="full-width">
                        <span>备注</span>
                        <input
                          placeholder="异常原因或其他说明"
                          value={sptForm.remark}
                          onChange={(e) => handleSPTInputChange("remark", e.target.value)}
                        />
                      </label>
                    </div>

                    {sptValidationMessage && (
                      <div className="spt-validation-error">{sptValidationMessage}</div>
                    )}

                    <div className="spt-form-actions">
                      {editingSPTId ? (
                        <>
                          <button className="secondary-btn" onClick={handleCancelSPTEdit}>取消</button>
                          <button className="primary-action" onClick={handleUpdateSPTRecord}>更新记录</button>
                        </>
                      ) : (
                        <button className="primary-action" onClick={handleAddSPTRecord}>添加标贯记录</button>
                      )}
                    </div>
                  </div>

                  <div className="spt-list-section">
                    <h4>标贯记录列表</h4>
                    <div className="spt-table-wrapper">
                      <table className="spt-table">
                        <thead>
                          <tr>
                            <th>序号</th>
                            <th>深度(m)</th>
                            <th>击数</th>
                            <th>岩性</th>
                            <th>状态</th>
                            <th>备注</th>
                            <th>操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedSPTRecords.map((record, idx) => (
                            <tr key={record.id} className={editingSPTId === record.id ? "editing-row" : ""}>
                              <td>{idx + 1}</td>
                              <td><strong>{record.depth}</strong></td>
                              <td>
                                <span className={`blow-count ${record.isAbnormal ? "blow-abnormal" : ""}`}>
                                  {record.blowCount}
                                </span>
                              </td>
                              <td><span className="tag">{getLayerLithology(record.layerId)}</span></td>
                              <td>
                                {record.isAbnormal ? (
                                  <span className="status-badge status-abnormal">异常</span>
                                ) : (
                                  <span className="status-badge status-normal">正常</span>
                                )}
                              </td>
                              <td className="spt-remark-cell">{record.remark || "-"}</td>
                              <td>
                                <button className="small-btn" onClick={() => handleEditSPTRecord(record)}>编辑</button>
                                <button className="small-btn danger-btn" onClick={() => handleDeleteSPTRecord(record.id)}>删除</button>
                              </td>
                            </tr>
                          ))}
                          {sortedSPTRecords.length === 0 && (
                            <tr>
                              <td colSpan={7} className="empty-row">暂无标贯记录，请添加</td>
                            </tr>
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
