import type {
  DrillingRecord,
  BoreholeLayers,
  BoreholeSPTRecords,
  BoreholeSamplingRecords,
  BoreholeWaterLevelRecords,
  StratumLayer,
  SPTRecord,
  SamplingRecord,
  WaterLevelRecord,
  ArchiveData,
  ArchiveMeta,
  ImportPreviewResult,
  BoreholeImportItem,
  ImportResult,
  DepthNormalizationChange,
  BoreholeCheckInfo,
  NormalizationStats,
  ConflictCategory,
  FieldDiff,
  RecordDiff,
  CategoryDiff,
  BoreholeConflictDetails,
  ConflictResolution,
} from "./types";
import { ARCHIVE_VERSION, CATEGORY_LABELS } from "./types";
import { saveProjectData, loadProjectData, type ProjectData } from "./db";

const IMPORT_PROGRESS_KEY = "hxwl-03-import-progress";
const ARCHIVE_FILE_PREFIX = "hxwl-archive";

const LEGACY_FIELD_MAP: Record<string, keyof DrillingRecord> = {
  boreholeId: "钻孔编号",
  holeId: "钻孔编号",
  holeNo: "钻孔编号",
  boreholeNo: "钻孔编号",
  holeDepth: "孔深",
  depth: "孔深",
  lithologyType: "岩性分类",
  lithologyCategory: "岩性分类",
  lithologyDesc: "岩性描述",
  description: "岩性描述",
  soilColor: "土色",
  color: "土色",
  groundwater: "地下水位",
  waterLevel: "地下水位",
};

const LEGACY_LAYER_FIELD_MAP: Record<string, keyof StratumLayer> = {
  fromDepth: "startDepth",
  topDepth: "startDepth",
  toDepth: "endDepth",
  bottomDepth: "endDepth",
  lithology: "lithology",
  rockType: "lithology",
  colour: "soilColor",
  state: "density",
  condition: "density",
  desc: "description",
  remark: "description",
};

const LEGACY_SPT_FIELD_MAP: Record<string, keyof SPTRecord> = {
  testDepth: "depth",
  blowCounts: "blowCount",
  count: "blowCount",
  abnormal: "isAbnormal",
  note: "remark",
};

const LEGACY_SAMPLING_FIELD_MAP: Record<string, keyof SamplingRecord> = {
  sampleDepth: "depth",
  type: "sampleType",
  sampleId: "sampleNumber",
  no: "sampleNumber",
  note: "remark",
};

const LEGACY_WATERLEVEL_FIELD_MAP: Record<string, keyof WaterLevelRecord> = {
  firstSeen: "firstSeenLevel",
  firstLevel: "firstSeenLevel",
  stable: "stableLevel",
  stableWater: "stableLevel",
  observedAt: "observationTime",
  time: "observationTime",
  weather: "weatherRemark",
  remark: "weatherRemark",
};

export const createArchive = (
  projectId: string,
  records: DrillingRecord[],
  boreholeLayers: BoreholeLayers,
  sptRecords: BoreholeSPTRecords,
  samplingRecords: BoreholeSamplingRecords,
  waterLevelRecords: BoreholeWaterLevelRecords,
  exportedBy: string
): ArchiveData => {
  const totalDepth = records.reduce((sum, r) => sum + (parseFloat(r["孔深"]) || 0), 0).toFixed(1);

  const meta: ArchiveMeta = {
    version: ARCHIVE_VERSION,
    projectId,
    exportedAt: new Date().toISOString(),
    exportedBy,
    recordCount: records.length,
    totalDepth: totalDepth + "m",
  };

  return {
    meta,
    records: deepClone(records),
    boreholeLayers: deepClone(boreholeLayers),
    sptRecords: deepClone(sptRecords),
    samplingRecords: deepClone(samplingRecords),
    waterLevelRecords: deepClone(waterLevelRecords),
  };
};

export const downloadArchive = (archive: ArchiveData): void => {
  const jsonStr = JSON.stringify(archive, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const dateStr = formatDateForFilename(archive.meta.exportedAt);
  const filename = `${ARCHIVE_FILE_PREFIX}-${archive.meta.projectId}-${dateStr}.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const parseArchiveFile = (file: File): Promise<ArchiveData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (!data || typeof data !== "object") {
          reject(new Error("归档文件格式无效"));
          return;
        }

        if (!data.meta || !data.meta.version) {
          data.meta = data.meta || {};
          data.meta.version = data.meta.version || "0.0.1-legacy";
        }

        if (!data.meta.projectId) {
          data.meta.projectId = data.meta.projectId || "unknown-project";
        }

        resolve(data as ArchiveData);
      } catch (err) {
        reject(new Error("归档文件解析失败：" + (err instanceof Error ? err.message : "未知错误")));
      }
    };

    reader.onerror = () => {
      reject(new Error("文件读取失败"));
    };

    reader.readAsText(file);
  });
};

export const normalizeDepthValue = (value: string): { normalized: string; wasConverted: boolean } => {
  if (!value || value.trim() === "") return { normalized: "", wasConverted: false };

  let wasConverted = false;
  let cleaned = value.trim();
  cleaned = cleaned.replace(/\s+/g, "");

  cleaned = cleaned.replace(/Ｍ$/g, "M").replace(/ｍ$/g, "m").replace(/毫$/, "mm").replace(/厘$/, "cm");

  if (/mm$/i.test(cleaned)) {
    cleaned = cleaned.replace(/mm$/i, "");
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      wasConverted = true;
      return { normalized: (num / 1000).toFixed(2), wasConverted };
    }
  }

  if (/cm$/i.test(cleaned)) {
    cleaned = cleaned.replace(/cm$/i, "");
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      wasConverted = true;
      return { normalized: (num / 100).toFixed(2), wasConverted };
    }
  }

  const original = cleaned;
  cleaned = cleaned.replace(/[mM]$/, "");
  cleaned = cleaned.replace(/米$/, "");
  cleaned = cleaned.trim();

  const num = parseFloat(cleaned);
  if (isNaN(num)) return { normalized: value, wasConverted: false };

  if (num > 1000) {
    wasConverted = true;
    return { normalized: (num / 1000).toFixed(2), wasConverted };
  }

  if (original !== cleaned && (original.endsWith("m") || original.endsWith("M") || original.endsWith("米"))) {
    wasConverted = true;
  }

  return { normalized: String(num), wasConverted };
};

const mapLegacyFields = <T>(obj: any, fieldMap: Record<string, keyof T>): T => {
  const result: any = {};
  for (const key of Object.keys(obj)) {
    if (fieldMap[key] && obj[key] !== undefined && obj[key] !== "") {
      result[fieldMap[key]] = obj[key];
    } else {
      result[key] = obj[key];
    }
  }
  return result as T;
};

const normalizeDrillingRecord = (
  rec: any,
  warnings: string[],
  changes: DepthNormalizationChange[],
  normStats: NormalizationStats
): DrillingRecord => {
  const mapped = mapLegacyFields<DrillingRecord>(rec, LEGACY_FIELD_MAP);
  const record: any = {
    "钻孔编号": mapped["钻孔编号"] || "",
    "孔深": mapped["孔深"] || "",
    "岩性分类": mapped["岩性分类"] || "",
    "岩性描述": mapped["岩性描述"] || "",
    "土色": mapped["土色"] || "",
    "地下水位": mapped["地下水位"] || "",
  };

  const missingFields: string[] = [];
  for (const k of Object.keys(record) as (keyof DrillingRecord)[]) {
    if (!record[k] && k !== "地下水位" && k !== "岩性描述") {
      missingFields.push(k);
    }
  }
  if (missingFields.length > 0) {
    warnings.push(`钻孔 ${record["钻孔编号"] || "(无编号)"} 缺少字段：${missingFields.join("、")}，已填充空值`);
  }

  if (record["孔深"]) {
    const { normalized, wasConverted } = normalizeDepthValue(record["孔深"]);
    if (record["孔深"] !== normalized) {
      changes.push({ field: "孔深", original: record["孔深"], normalized });
      normStats.boreholeDepthCount++;
      normStats.totalChanges++;
      if (wasConverted) normStats.unitConvertedCount++;
      record["孔深"] = normalized;
    }
  }
  if (record["地下水位"]) {
    const { normalized, wasConverted } = normalizeDepthValue(record["地下水位"]);
    if (record["地下水位"] !== normalized) {
      changes.push({ field: "地下水位", original: record["地下水位"], normalized });
      normStats.waterLevelCount++;
      normStats.totalChanges++;
      if (wasConverted) normStats.unitConvertedCount++;
      record["地下水位"] = normalized;
    }
  }

  return record as DrillingRecord;
};

const normalizeStratumLayer = (
  layer: any,
  warnings: string[],
  boreholeId: string,
  changes: DepthNormalizationChange[],
  normStats: NormalizationStats
): StratumLayer => {
  const mapped = mapLegacyFields<StratumLayer>(layer, LEGACY_LAYER_FIELD_MAP);
  const normalized: StratumLayer = {
    id: mapped.id || generateId(),
    startDepth: mapped.startDepth ?? "",
    endDepth: mapped.endDepth ?? "",
    lithology: mapped.lithology ?? "",
    soilColor: mapped.soilColor ?? "",
    density: mapped.density ?? "",
    description: mapped.description ?? "",
  };

  if (layer.isChecked !== undefined) normalized.isChecked = !!layer.isChecked;
  if (layer.checkedBy) normalized.checkedBy = layer.checkedBy;
  if (layer.checkedAt) normalized.checkedAt = layer.checkedAt;
  if (layer.checkRemark) normalized.checkRemark = layer.checkRemark;

  if (!layer.id) {
    warnings.push(`钻孔 ${boreholeId} 的分层缺少 id，已自动生成`);
  }

  if (normalized.startDepth) {
    const { normalized: normDepth, wasConverted } = normalizeDepthValue(normalized.startDepth);
    if (normalized.startDepth !== normDepth) {
      changes.push({ field: `分层起始深度`, original: normalized.startDepth, normalized: normDepth });
      normStats.layerDepthCount++;
      normStats.totalChanges++;
      if (wasConverted) normStats.unitConvertedCount++;
      normalized.startDepth = normDepth;
    }
  }
  if (normalized.endDepth) {
    const { normalized: normDepth, wasConverted } = normalizeDepthValue(normalized.endDepth);
    if (normalized.endDepth !== normDepth) {
      changes.push({ field: `分层终止深度`, original: normalized.endDepth, normalized: normDepth });
      normStats.layerDepthCount++;
      normStats.totalChanges++;
      if (wasConverted) normStats.unitConvertedCount++;
      normalized.endDepth = normDepth;
    }
  }

  return normalized;
};

const normalizeSPTRecord = (
  spt: any,
  warnings: string[],
  boreholeId: string,
  changes: DepthNormalizationChange[],
  normStats: NormalizationStats
): SPTRecord => {
  const mapped = mapLegacyFields<SPTRecord>(spt, LEGACY_SPT_FIELD_MAP);
  const normalized: SPTRecord = {
    id: mapped.id || generateId(),
    depth: mapped.depth ?? "",
    blowCount: mapped.blowCount ?? "",
    isAbnormal: !!mapped.isAbnormal,
    remark: mapped.remark ?? "",
    layerId: mapped.layerId ?? "",
  };

  if (spt.isChecked !== undefined) normalized.isChecked = !!spt.isChecked;
  if (spt.checkedBy) normalized.checkedBy = spt.checkedBy;
  if (spt.checkedAt) normalized.checkedAt = spt.checkedAt;
  if (spt.checkRemark) normalized.checkRemark = spt.checkRemark;

  if (!spt.id) {
    warnings.push(`钻孔 ${boreholeId} 的标贯记录缺少 id，已自动生成`);
  }
  if (normalized.depth) {
    const { normalized: normDepth, wasConverted } = normalizeDepthValue(normalized.depth);
    if (normalized.depth !== normDepth) {
      changes.push({ field: `标贯深度`, original: normalized.depth, normalized: normDepth });
      normStats.sptDepthCount++;
      normStats.totalChanges++;
      if (wasConverted) normStats.unitConvertedCount++;
      normalized.depth = normDepth;
    }
  }

  return normalized;
};

const normalizeSamplingRecord = (
  spl: any,
  warnings: string[],
  boreholeId: string,
  changes: DepthNormalizationChange[],
  normStats: NormalizationStats
): SamplingRecord => {
  const mapped = mapLegacyFields<SamplingRecord>(spl, LEGACY_SAMPLING_FIELD_MAP);
  const normalized: SamplingRecord = {
    id: mapped.id || generateId(),
    depth: mapped.depth ?? "",
    sampleType: mapped.sampleType ?? "",
    sampleNumber: mapped.sampleNumber ?? "",
    remark: mapped.remark ?? "",
    layerId: mapped.layerId ?? "",
  };

  if (spl.isChecked !== undefined) normalized.isChecked = !!spl.isChecked;
  if (spl.checkedBy) normalized.checkedBy = spl.checkedBy;
  if (spl.checkedAt) normalized.checkedAt = spl.checkedAt;
  if (spl.checkRemark) normalized.checkRemark = spl.checkRemark;

  if (!spl.id) {
    warnings.push(`钻孔 ${boreholeId} 的取样记录缺少 id，已自动生成`);
  }
  if (normalized.depth) {
    const { normalized: normDepth, wasConverted } = normalizeDepthValue(normalized.depth);
    if (normalized.depth !== normDepth) {
      changes.push({ field: `取样深度`, original: normalized.depth, normalized: normDepth });
      normStats.samplingDepthCount++;
      normStats.totalChanges++;
      if (wasConverted) normStats.unitConvertedCount++;
      normalized.depth = normDepth;
    }
  }

  return normalized;
};

const normalizeWaterLevelRecord = (
  wl: any,
  warnings: string[],
  boreholeId: string,
  changes: DepthNormalizationChange[],
  normStats: NormalizationStats
): WaterLevelRecord => {
  const mapped = mapLegacyFields<WaterLevelRecord>(wl, LEGACY_WATERLEVEL_FIELD_MAP);
  const normalized: WaterLevelRecord = {
    id: mapped.id || generateId(),
    firstSeenLevel: mapped.firstSeenLevel ?? "",
    stableLevel: mapped.stableLevel ?? "",
    observationTime: mapped.observationTime ?? "",
    weatherRemark: mapped.weatherRemark ?? "",
  };

  if (wl.isChecked !== undefined) normalized.isChecked = !!wl.isChecked;
  if (wl.checkedBy) normalized.checkedBy = wl.checkedBy;
  if (wl.checkedAt) normalized.checkedAt = wl.checkedAt;
  if (wl.checkRemark) normalized.checkRemark = wl.checkRemark;

  if (!wl.id) {
    warnings.push(`钻孔 ${boreholeId} 的水位记录缺少 id，已自动生成`);
  }
  if (normalized.firstSeenLevel) {
    const { normalized: normDepth, wasConverted } = normalizeDepthValue(normalized.firstSeenLevel);
    if (normalized.firstSeenLevel !== normDepth) {
      changes.push({ field: `初见水位`, original: normalized.firstSeenLevel, normalized: normDepth });
      normStats.waterLevelCount++;
      normStats.totalChanges++;
      if (wasConverted) normStats.unitConvertedCount++;
      normalized.firstSeenLevel = normDepth;
    }
  }
  if (normalized.stableLevel) {
    const { normalized: normDepth, wasConverted } = normalizeDepthValue(normalized.stableLevel);
    if (normalized.stableLevel !== normDepth) {
      changes.push({ field: `稳定水位`, original: normalized.stableLevel, normalized: normDepth });
      normStats.waterLevelCount++;
      normStats.totalChanges++;
      if (wasConverted) normStats.unitConvertedCount++;
      normalized.stableLevel = normDepth;
    }
  }

  return normalized;
};

const computeBoreholeCheckInfo = (
  boreholeId: string,
  layers: StratumLayer[],
  spts: SPTRecord[],
  samplings: SamplingRecord[],
  waterLevels: WaterLevelRecord[]
): BoreholeCheckInfo => {
  const layerChecked = layers.filter((l) => l.isChecked).length;
  const sptChecked = spts.filter((s) => s.isChecked).length;
  const samplingChecked = samplings.filter((s) => s.isChecked).length;
  const waterChecked = waterLevels.filter((w) => w.isChecked).length;

  return {
    layerCheckedCount: layerChecked,
    layerTotalCount: layers.length,
    sptCheckedCount: sptChecked,
    sptTotalCount: spts.length,
    samplingCheckedCount: samplingChecked,
    samplingTotalCount: samplings.length,
    waterLevelCheckedCount: waterChecked,
    waterLevelTotalCount: waterLevels.length,
    hasAnyChecked: layerChecked + sptChecked + samplingChecked + waterChecked > 0,
  };
};

const mergeCheckStatus = (
  localItems: (StratumLayer | SPTRecord | SamplingRecord | WaterLevelRecord)[],
  archiveItems: (StratumLayer | SPTRecord | SamplingRecord | WaterLevelRecord)[],
  matchKey: "depth" | "startDepth" | "sampleNumber" | "observationTime" | "id"
): (StratumLayer | SPTRecord | SamplingRecord | WaterLevelRecord)[] => {
  const result = [...archiveItems];
  for (const local of localItems) {
    const localVal = (local as any)[matchKey];
    if (!localVal) continue;
    const archiveIdx = result.findIndex((a) => (a as any)[matchKey] === localVal);
    if (archiveIdx >= 0) {
      if (local.isChecked && !result[archiveIdx].isChecked) {
        result[archiveIdx] = { ...result[archiveIdx], ...local };
      }
    }
  }
  return result;
};

const BASIC_INFO_FIELDS: Array<{ key: keyof DrillingRecord; label: string }> = [
  { key: "钻孔编号", label: "钻孔编号" },
  { key: "孔深", label: "孔深" },
  { key: "岩性分类", label: "岩性分类" },
  { key: "岩性描述", label: "岩性描述" },
  { key: "土色", label: "土色" },
  { key: "地下水位", label: "地下水位" },
];

const LAYER_FIELDS: Array<{ key: keyof StratumLayer; label: string }> = [
  { key: "startDepth", label: "层顶深度" },
  { key: "endDepth", label: "层底深度" },
  { key: "lithology", label: "岩性" },
  { key: "soilColor", label: "土色" },
  { key: "density", label: "状态/密度" },
  { key: "description", label: "描述" },
];

const SPT_FIELDS: Array<{ key: keyof SPTRecord; label: string }> = [
  { key: "depth", label: "试验深度" },
  { key: "blowCount", label: "击数" },
  { key: "isAbnormal", label: "是否异常" },
  { key: "remark", label: "备注" },
];

const SAMPLING_FIELDS: Array<{ key: keyof SamplingRecord; label: string }> = [
  { key: "depth", label: "取样深度" },
  { key: "sampleType", label: "样品类型" },
  { key: "sampleNumber", label: "样品编号" },
  { key: "remark", label: "备注" },
];

const WATERLEVEL_FIELDS: Array<{ key: keyof WaterLevelRecord; label: string }> = [
  { key: "firstSeenLevel", label: "初见水位" },
  { key: "stableLevel", label: "稳定水位" },
  { key: "observationTime", label: "观测时间" },
  { key: "weatherRemark", label: "天气/备注" },
];

const createEmptyCategoryDiff = (category: ConflictCategory): CategoryDiff => ({
  category,
  hasConflict: false,
  addedCount: 0,
  removedCount: 0,
  modifiedCount: 0,
  fieldDiffs: [],
  recordDiffs: [],
});

const createEmptyConflictDetails = (): BoreholeConflictDetails => ({
  hasConflict: false,
  categories: {
    basicInfo: createEmptyCategoryDiff("basicInfo"),
    layers: createEmptyCategoryDiff("layers"),
    spt: createEmptyCategoryDiff("spt"),
    sampling: createEmptyCategoryDiff("sampling"),
    waterLevel: createEmptyCategoryDiff("waterLevel"),
  },
});

const valueEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  const aStr = a === undefined || a === null ? "" : String(a);
  const bStr = b === undefined || b === null ? "" : String(b);
  return aStr === bStr;
};

const compareBasicInfo = (
  localRecord: DrillingRecord,
  archiveRecord: DrillingRecord
): CategoryDiff => {
  const diff: CategoryDiff = createEmptyCategoryDiff("basicInfo");
  const fieldDiffs: FieldDiff[] = [];

  for (const { key, label } of BASIC_INFO_FIELDS) {
    if (key === "钻孔编号") continue;
    const localVal = localRecord[key] || "";
    const archiveVal = archiveRecord[key] || "";
    if (!valueEqual(localVal, archiveVal)) {
      fieldDiffs.push({
        field: key,
        fieldLabel: label,
        localValue: localVal,
        archiveValue: archiveVal,
      });
    }
  }

  if (fieldDiffs.length > 0) {
    diff.hasConflict = true;
    diff.modifiedCount = fieldDiffs.length;
    diff.fieldDiffs = fieldDiffs;
  }

  return diff;
};

interface RecordCompareConfig {
  matchKey: string;
  matchLabel: string;
  fields: Array<{ key: string; label: string }>;
  excludeFields?: string[];
}

const compareRecordArrays = (
  localItems: Record<string, any>[],
  archiveItems: Record<string, any>[],
  config: RecordCompareConfig,
  category: ConflictCategory
): CategoryDiff => {
  const diff: CategoryDiff = createEmptyCategoryDiff(category);
  const { matchKey, matchLabel, fields, excludeFields = [] } = config;

  const localMap = new Map<string, Record<string, any>>();
  for (const item of localItems) {
    const key = String(item[matchKey] ?? item.id ?? "");
    if (key) localMap.set(key, item);
  }

  const archiveMap = new Map<string, Record<string, any>>();
  for (const item of archiveItems) {
    const key = String(item[matchKey] ?? item.id ?? "");
    if (key) archiveMap.set(key, item);
  }

  const recordDiffs: RecordDiff[] = [];
  let addedCount = 0;
  let removedCount = 0;
  let modifiedCount = 0;

  for (const [key, archiveRec] of archiveMap) {
    const localRec = localMap.get(key);
    if (!localRec) {
      addedCount++;
      const fieldDiffs: FieldDiff[] = fields
        .filter((f) => !excludeFields.includes(f.key))
        .map((f) => ({
          field: f.key,
          fieldLabel: f.label,
          localValue: "",
          archiveValue: String(archiveRec[f.key] ?? ""),
        }));
      recordDiffs.push({
        diffType: "added",
        matchKey,
        matchValue: key,
        fields: fieldDiffs,
        archiveRecord: archiveRec,
      });
    } else {
      const fieldDiffs: FieldDiff[] = [];
      for (const { key: fKey, label } of fields) {
        if (excludeFields.includes(fKey)) continue;
        const localVal = localRec[fKey];
        const archiveVal = archiveRec[fKey];
        if (!valueEqual(localVal, archiveVal)) {
          fieldDiffs.push({
            field: fKey,
            fieldLabel: label,
            localValue: String(localVal ?? ""),
            archiveValue: String(archiveVal ?? ""),
          });
        }
      }
      if (fieldDiffs.length > 0) {
        modifiedCount++;
        recordDiffs.push({
          diffType: "modified",
          matchKey,
          matchValue: key,
          fields: fieldDiffs,
          localRecord: localRec,
          archiveRecord: archiveRec,
        });
      }
    }
  }

  for (const [key, localRec] of localMap) {
    if (!archiveMap.has(key)) {
      removedCount++;
      const fieldDiffs: FieldDiff[] = fields
        .filter((f) => !excludeFields.includes(f.key))
        .map((f) => ({
          field: f.key,
          fieldLabel: f.label,
          localValue: String(localRec[f.key] ?? ""),
          archiveValue: "",
        }));
      recordDiffs.push({
        diffType: "removed",
        matchKey,
        matchValue: key,
        fields: fieldDiffs,
        localRecord: localRec,
      });
    }
  }

  if (addedCount > 0 || removedCount > 0 || modifiedCount > 0) {
    diff.hasConflict = true;
    diff.addedCount = addedCount;
    diff.removedCount = removedCount;
    diff.modifiedCount = modifiedCount;
    diff.recordDiffs = recordDiffs;
  }

  return diff;
};

const computeBoreholeConflictDetails = (
  localRecord: DrillingRecord,
  archiveRecord: DrillingRecord,
  localLayers: StratumLayer[],
  archiveLayers: StratumLayer[],
  localSPT: SPTRecord[],
  archiveSPT: SPTRecord[],
  localSampling: SamplingRecord[],
  archiveSampling: SamplingRecord[],
  localWater: WaterLevelRecord[],
  archiveWater: WaterLevelRecord[]
): BoreholeConflictDetails => {
  const details = createEmptyConflictDetails();

  details.categories.basicInfo = compareBasicInfo(localRecord, archiveRecord);

  details.categories.layers = compareRecordArrays(
    localLayers as any,
    archiveLayers as any,
    {
      matchKey: "startDepth",
      matchLabel: "层顶深度",
      fields: LAYER_FIELDS,
      excludeFields: ["id", "isChecked", "checkedBy", "checkedAt", "checkRemark", "layerId"],
    },
    "layers"
  );

  details.categories.spt = compareRecordArrays(
    localSPT as any,
    archiveSPT as any,
    {
      matchKey: "depth",
      matchLabel: "试验深度",
      fields: SPT_FIELDS,
      excludeFields: ["id", "isChecked", "checkedBy", "checkedAt", "checkRemark", "layerId"],
    },
    "spt"
  );

  details.categories.sampling = compareRecordArrays(
    localSampling as any,
    archiveSampling as any,
    {
      matchKey: "sampleNumber",
      matchLabel: "样品编号",
      fields: SAMPLING_FIELDS,
      excludeFields: ["id", "isChecked", "checkedBy", "checkedAt", "checkRemark", "layerId"],
    },
    "sampling"
  );

  details.categories.waterLevel = compareRecordArrays(
    localWater as any,
    archiveWater as any,
    {
      matchKey: "observationTime",
      matchLabel: "观测时间",
      fields: WATERLEVEL_FIELDS,
      excludeFields: ["id", "isChecked", "checkedBy", "checkedAt", "checkRemark"],
    },
    "waterLevel"
  );

  details.hasConflict = Object.values(details.categories).some((c) => c.hasConflict);

  return details;
};

const applyCategoryResolution = <T>(
  localItems: T[],
  archiveItems: T[],
  resolution: ConflictResolution,
  matchKey: string
): T[] => {
  if (resolution === "archive") {
    return archiveItems;
  }
  return localItems;
};

const applyBasicInfoResolution = (
  localRecord: DrillingRecord,
  archiveRecord: DrillingRecord,
  resolution: ConflictResolution
): DrillingRecord => {
  if (resolution === "archive") {
    return archiveRecord;
  }
  return localRecord;
};

export const normalizeArchiveData = (archive: ArchiveData): {
  data: ArchiveData;
  warnings: string[];
  normalizationStats: NormalizationStats;
  boreholeNormalizationChanges: Map<string, DepthNormalizationChange[]>;
  boreholeCheckInfoMap: Map<string, BoreholeCheckInfo>;
} => {
  const warnings: string[] = [];
  const normStats: NormalizationStats = {
    totalChanges: 0,
    boreholeDepthCount: 0,
    waterLevelCount: 0,
    layerDepthCount: 0,
    sptDepthCount: 0,
    samplingDepthCount: 0,
    unitConvertedCount: 0,
  };
  const boreholeChanges = new Map<string, DepthNormalizationChange[]>();
  const boreholeCheckMap = new Map<string, BoreholeCheckInfo>();

  const version = archive.meta?.version || "0.0.0";
  if (version !== ARCHIVE_VERSION) {
    warnings.push(`归档版本为 v${version}，当前系统版本为 v${ARCHIVE_VERSION}，已执行兼容迁移（含旧字段名映射和默认值填充）`);
  }

  if (!archive.records || !Array.isArray(archive.records)) {
    warnings.push("归档文件缺少钻孔记录数组，已初始化为空");
    archive.records = [];
  }
  if (!archive.boreholeLayers || typeof archive.boreholeLayers !== "object") {
    warnings.push("归档文件缺少分层数据，已初始化为空");
    archive.boreholeLayers = {};
  }
  if (!archive.sptRecords || typeof archive.sptRecords !== "object") {
    archive.sptRecords = {};
  }
  if (!archive.samplingRecords || typeof archive.samplingRecords !== "object") {
    archive.samplingRecords = {};
  }
  if (!archive.waterLevelRecords || typeof archive.waterLevelRecords !== "object") {
    archive.waterLevelRecords = {};
  }

  const normalizedRecords: DrillingRecord[] = archive.records.map((rec) => {
    const changes: DepthNormalizationChange[] = [];
    const record = normalizeDrillingRecord(rec, warnings, changes, normStats);
    if (changes.length > 0) {
      boreholeChanges.set(record["钻孔编号"] || "(无编号)", changes);
    }
    return record;
  });

  const normalizedBoreholeLayers: BoreholeLayers = {};
  for (const boreholeId of Object.keys(archive.boreholeLayers)) {
    const layers = archive.boreholeLayers[boreholeId];
    if (Array.isArray(layers)) {
      const changes = boreholeChanges.get(boreholeId) || [];
      normalizedBoreholeLayers[boreholeId] = layers.map((l) =>
        normalizeStratumLayer(l, warnings, boreholeId, changes, normStats)
      );
      if (changes.length > 0) boreholeChanges.set(boreholeId, changes);
    } else {
      warnings.push(`钻孔 ${boreholeId} 的分层数据格式异常，已跳过`);
      normalizedBoreholeLayers[boreholeId] = [];
    }
  }

  const normalizedSPTRecords: BoreholeSPTRecords = {};
  for (const boreholeId of Object.keys(archive.sptRecords)) {
    const spts = archive.sptRecords[boreholeId];
    if (Array.isArray(spts)) {
      const changes = boreholeChanges.get(boreholeId) || [];
      normalizedSPTRecords[boreholeId] = spts.map((s) =>
        normalizeSPTRecord(s, warnings, boreholeId, changes, normStats)
      );
      if (changes.length > 0) boreholeChanges.set(boreholeId, changes);
    } else {
      warnings.push(`钻孔 ${boreholeId} 的标贯数据格式异常，已跳过`);
      normalizedSPTRecords[boreholeId] = [];
    }
  }

  const normalizedSamplingRecords: BoreholeSamplingRecords = {};
  for (const boreholeId of Object.keys(archive.samplingRecords)) {
    const spls = archive.samplingRecords[boreholeId];
    if (Array.isArray(spls)) {
      const changes = boreholeChanges.get(boreholeId) || [];
      normalizedSamplingRecords[boreholeId] = spls.map((s) =>
        normalizeSamplingRecord(s, warnings, boreholeId, changes, normStats)
      );
      if (changes.length > 0) boreholeChanges.set(boreholeId, changes);
    } else {
      warnings.push(`钻孔 ${boreholeId} 的取样数据格式异常，已跳过`);
      normalizedSamplingRecords[boreholeId] = [];
    }
  }

  const normalizedWaterLevelRecords: BoreholeWaterLevelRecords = {};
  for (const boreholeId of Object.keys(archive.waterLevelRecords)) {
    const wls = archive.waterLevelRecords[boreholeId];
    if (Array.isArray(wls)) {
      const changes = boreholeChanges.get(boreholeId) || [];
      normalizedWaterLevelRecords[boreholeId] = wls.map((w) =>
        normalizeWaterLevelRecord(w, warnings, boreholeId, changes, normStats)
      );
      if (changes.length > 0) boreholeChanges.set(boreholeId, changes);
    } else {
      warnings.push(`钻孔 ${boreholeId} 的水位数据格式异常，已跳过`);
      normalizedWaterLevelRecords[boreholeId] = [];
    }
  }

  for (const rec of normalizedRecords) {
    const bid = rec["钻孔编号"];
    if (!bid) continue;
    boreholeCheckMap.set(
      bid,
      computeBoreholeCheckInfo(
        bid,
        normalizedBoreholeLayers[bid] || [],
        normalizedSPTRecords[bid] || [],
        normalizedSamplingRecords[bid] || [],
        normalizedWaterLevelRecords[bid] || []
      )
    );
  }

  const normalizedData: ArchiveData = {
    ...archive,
    meta: {
      ...archive.meta,
      version: ARCHIVE_VERSION,
      projectId: archive.meta.projectId || "unknown-project",
      exportedAt: archive.meta.exportedAt || new Date(0).toISOString(),
      exportedBy: archive.meta.exportedBy || "未知用户",
      recordCount: normalizedRecords.length,
      totalDepth: archive.meta.totalDepth || "0m",
    },
    records: normalizedRecords,
    boreholeLayers: normalizedBoreholeLayers,
    sptRecords: normalizedSPTRecords,
    samplingRecords: normalizedSamplingRecords,
    waterLevelRecords: normalizedWaterLevelRecords,
  };

  return {
    data: normalizedData,
    warnings,
    normalizationStats: normStats,
    boreholeNormalizationChanges: boreholeChanges,
    boreholeCheckInfoMap: boreholeCheckMap,
  };
};

export const previewImport = async (archive: ArchiveData): Promise<ImportPreviewResult> => {
  const {
    data: normalizedData,
    warnings,
    normalizationStats,
    boreholeNormalizationChanges,
    boreholeCheckInfoMap,
  } = normalizeArchiveData(archive);

  const currentData = await loadProjectData();
  const currentRecords = currentData?.records || [];
  const currentRecordMap = new Map(currentRecords.map((r) => [r["钻孔编号"], r]));

  const boreholeItems: BoreholeImportItem[] = [];
  let newCount = 0;
  let overwriteCount = 0;
  let conflictCount = 0;
  let unrecognizedCount = 0;
  let duplicateInArchiveCount = 0;

  const idCount = new Map<string, number>();
  for (const rec of normalizedData.records) {
    const id = rec["钻孔编号"] || "(无编号)";
    idCount.set(id, (idCount.get(id) || 0) + 1);
  }

  const validBoreholeIds = new Set(
    normalizedData.records.map((r) => r["钻孔编号"]).filter((id) => id)
  );

  for (const record of normalizedData.records) {
    const boreholeId = record["钻孔编号"];
    if (!boreholeId) {
      unrecognizedCount++;
      boreholeItems.push({
        boreholeId: "(未知编号)",
        status: "unrecognized",
        details: "缺少钻孔编号",
      });
      continue;
    }

    const dupCount = idCount.get(boreholeId) || 0;
    const isDupInArchive = dupCount > 1;
    let duplicateIndex: number | undefined;
    if (isDupInArchive) {
      duplicateInArchiveCount++;
      duplicateIndex = normalizedData.records
        .filter((r) => r["钻孔编号"] === boreholeId)
        .findIndex((r) => r === record);
    }

    const existingRecord = currentRecordMap.get(boreholeId);
    const checkInfo = boreholeCheckInfoMap.get(boreholeId);
    const normChanges = boreholeNormalizationChanges.get(boreholeId) || [];

    let detailParts: string[] = [];
    const layerCount = normalizedData.boreholeLayers[boreholeId]?.length || 0;
    const sptCount = normalizedData.sptRecords[boreholeId]?.length || 0;
    detailParts.push(`孔深${record["孔深"]}m · ${layerCount}层 · ${sptCount}次标贯`);

    if (checkInfo?.hasAnyChecked) {
      const totalChecked =
        checkInfo.layerCheckedCount +
        checkInfo.sptCheckedCount +
        checkInfo.samplingCheckedCount +
        checkInfo.waterLevelCheckedCount;
      detailParts.push(`✓ 已校核${totalChecked}项`);
    }

    if (isDupInArchive) {
      detailParts.unshift(`归档内重复(#${(duplicateIndex ?? 0) + 1}/${dupCount})`);
      detailParts.push("需整理后重新导入");
      unrecognizedCount++;
      boreholeItems.push({
        boreholeId,
        status: "unrecognized",
        details: detailParts.join(" | "),
        normalizationChanges: normChanges.length > 0 ? normChanges : undefined,
        checkInfo,
        isDuplicateInArchive: true,
        duplicateIndex,
      });
      continue;
    }

    if (!existingRecord) {
      newCount++;
      boreholeItems.push({
        boreholeId,
        status: "new",
        details: detailParts.join(" | "),
        normalizationChanges: normChanges.length > 0 ? normChanges : undefined,
        checkInfo,
        isDuplicateInArchive: false,
      });
    } else {
      const conflictFields: string[] = [];

      if (existingRecord["孔深"] !== record["孔深"]) conflictFields.push("孔深");
      if (existingRecord["岩性分类"] !== record["岩性分类"]) conflictFields.push("岩性分类");
      if (existingRecord["岩性描述"] !== record["岩性描述"]) conflictFields.push("岩性描述");
      if (existingRecord["土色"] !== record["土色"]) conflictFields.push("土色");
      if (existingRecord["地下水位"] !== record["地下水位"]) conflictFields.push("地下水位");

      const existingLayers = currentData?.boreholeLayers[boreholeId] || [];
      const newLayers = normalizedData.boreholeLayers[boreholeId] || [];
      if (existingLayers.length !== newLayers.length) conflictFields.push("分层数量");

      const existingSPT = currentData?.sptRecords[boreholeId] || [];
      const newSPT = normalizedData.sptRecords[boreholeId] || [];
      if (existingSPT.length !== newSPT.length) conflictFields.push("标贯数量");

      const existingSampling = currentData?.samplingRecords[boreholeId] || [];
      const newSampling = normalizedData.samplingRecords[boreholeId] || [];
      if (existingSampling.length !== newSampling.length) conflictFields.push("取样数量");

      const existingWater = currentData?.waterLevelRecords[boreholeId] || [];
      const newWater = normalizedData.waterLevelRecords[boreholeId] || [];
      if (existingWater.length !== newWater.length) conflictFields.push("水位观测数量");

      if (checkInfo) {
        const localCheckInfo = computeBoreholeCheckInfo(
          boreholeId,
          existingLayers,
          existingSPT,
          existingSampling,
          existingWater
        );
        if (localCheckInfo.hasAnyChecked && !checkInfo.hasAnyChecked) {
          detailParts.push("⚠ 本地已校核，归档未校核");
        }
        if (!localCheckInfo.hasAnyChecked && checkInfo.hasAnyChecked) {
          detailParts.push("归档含校核数据");
        }
        if (localCheckInfo.hasAnyChecked && checkInfo.hasAnyChecked) {
          detailParts.push("双方均含校核数据");
        }
      }

      if (conflictFields.length > 0) {
        conflictCount++;
        const conflictDetails = computeBoreholeConflictDetails(
          existingRecord,
          record,
          existingLayers,
          newLayers,
          existingSPT,
          newSPT,
          existingSampling,
          newSampling,
          existingWater,
          newWater
        );

        const defaultResolutions: Partial<Record<ConflictCategory, ConflictResolution>> = {};
        (Object.keys(conflictDetails.categories) as ConflictCategory[]).forEach((cat) => {
          if (conflictDetails.categories[cat].hasConflict) {
            defaultResolutions[cat] = "archive";
          }
        });

        const categorySummary: string[] = [];
        (Object.keys(conflictDetails.categories) as ConflictCategory[]).forEach((cat) => {
          const cd = conflictDetails.categories[cat];
          if (cd.hasConflict) {
            const parts: string[] = [];
            if (cd.modifiedCount > 0) parts.push(`修改${cd.modifiedCount}`);
            if (cd.addedCount > 0) parts.push(`新增${cd.addedCount}`);
            if (cd.removedCount > 0) parts.push(`删除${cd.removedCount}`);
            categorySummary.push(`${CATEGORY_LABELS[cat]}(${parts.join("/")})`);
          }
        });

        boreholeItems.push({
          boreholeId,
          status: "conflict",
          conflictFields,
          details: `存在 ${conflictFields.length} 处差异：${categorySummary.join(" | ")} | ${detailParts.join(" | ")}`,
          normalizationChanges: normChanges.length > 0 ? normChanges : undefined,
          checkInfo,
          isDuplicateInArchive: false,
          conflictDetails,
          resolutions: defaultResolutions,
        });
      } else {
        overwriteCount++;
        boreholeItems.push({
          boreholeId,
          status: "overwrite",
          details: `数据内容一致，将覆盖更新 | ${detailParts.join(" | ")}`,
          normalizationChanges: normChanges.length > 0 ? normChanges : undefined,
          checkInfo,
          isDuplicateInArchive: false,
        });
      }
    }
  }

  const allDataKeys = new Set<string>();
  [
    normalizedData.boreholeLayers,
    normalizedData.sptRecords,
    normalizedData.samplingRecords,
    normalizedData.waterLevelRecords,
  ].forEach((dict) => {
    if (dict) Object.keys(dict).forEach((k) => allDataKeys.add(k));
  });

  for (const boreholeId of allDataKeys) {
    if (!validBoreholeIds.has(boreholeId)) {
      unrecognizedCount++;
      boreholeItems.push({
        boreholeId,
        status: "unrecognized",
        details: "子数据找不到对应钻孔记录",
      });
    }
  }

  const checkedBoreholeCount = Array.from(boreholeCheckInfoMap.values()).filter((c) => c.hasAnyChecked).length;

  return {
    archiveMeta: normalizedData.meta,
    boreholes: boreholeItems,
    newCount,
    overwriteCount,
    conflictCount,
    unrecognizedCount,
    duplicateInArchiveCount,
    warnings,
    normalizedData,
    normalizationStats,
    checkedBoreholeCount,
    totalBoreholeCount: validBoreholeIds.size,
    archiveBoreholeIds: Array.from(validBoreholeIds),
  };
};

export const applyImport = async (
  previewResult: ImportPreviewResult,
  options: { includeNew: boolean; includeOverwrite: boolean; includeConflict: boolean; preserveChecked: boolean },
  resumeFromProgress?: ImportProgress | null
): Promise<ImportResult> => {
  const { normalizedData } = previewResult;
  const warnings: string[] = [];
  let importedCount = 0;
  let skippedCount = 0;
  const resumedFromProgress = !!resumeFromProgress && resumeFromProgress.status === "interrupted";

  const processedIds = new Set<string>(resumeFromProgress?.processedBoreholeIds || []);

  const currentData = await loadProjectData();
  const currentRecords = currentData?.records || [];
  const currentBoreholeLayers = currentData?.boreholeLayers || {};
  const currentSPTRecords = currentData?.sptRecords || {};
  const currentSamplingRecords = currentData?.samplingRecords || {};
  const currentWaterLevelRecords = currentData?.waterLevelRecords || {};

  const newRecords: DrillingRecord[] = [...currentRecords];
  const newBoreholeLayers: BoreholeLayers = { ...currentBoreholeLayers };
  const newSPTRecords: BoreholeSPTRecords = { ...currentSPTRecords };
  const newSamplingRecords: BoreholeSamplingRecords = { ...currentSamplingRecords };
  const newWaterLevelRecords: BoreholeWaterLevelRecords = { ...currentWaterLevelRecords };

  const progress: ImportProgress = {
    total: previewResult.boreholes.length,
    current: processedIds.size,
    processedBoreholeIds: Array.from(processedIds),
    startTime: Date.now(),
    status: "in-progress",
  };
  saveImportProgress(progress);

  try {
    for (const item of previewResult.boreholes) {
      const boreholeId = item.boreholeId;
      const itemKey = item.duplicateIndex === undefined
        ? `${boreholeId}:${item.status}`
        : `${boreholeId}:${item.status}:${item.duplicateIndex}`;

      if (processedIds.has(itemKey)) {
        skippedCount++;
        continue;
      }

      if (item.isDuplicateInArchive) {
        warnings.push(`归档内重复钻孔 ${boreholeId} 已跳过，请整理归档后重新导入`);
        skippedCount++;
        processedIds.add(itemKey);
        progress.current = processedIds.size;
        progress.processedBoreholeIds = Array.from(processedIds);
        saveImportProgress(progress);
        continue;
      }

      let shouldProcess = false;
      if (item.status === "new" && options.includeNew) shouldProcess = true;
      else if (item.status === "overwrite" && options.includeOverwrite) shouldProcess = true;
      else if (item.status === "conflict" && options.includeConflict) shouldProcess = true;

      if (!shouldProcess) {
        skippedCount++;
        processedIds.add(itemKey);
        progress.current = processedIds.size;
        progress.processedBoreholeIds = Array.from(processedIds);
        saveImportProgress(progress);
        continue;
      }

      const archiveRecord = normalizedData.records.find((r) => r["钻孔编号"] === boreholeId);
      const archiveLayers = normalizedData.boreholeLayers[boreholeId] || [];
      const archiveSPT = normalizedData.sptRecords[boreholeId] || [];
      const archiveSampling = normalizedData.samplingRecords[boreholeId] || [];
      const archiveWater = normalizedData.waterLevelRecords[boreholeId] || [];

      const localRecord = currentRecords.find((r) => r["钻孔编号"] === boreholeId);
      const localLayers = currentBoreholeLayers[boreholeId] || [];
      const localSPT = currentSPTRecords[boreholeId] || [];
      const localSampling = currentSamplingRecords[boreholeId] || [];
      const localWater = currentWaterLevelRecords[boreholeId] || [];

      const resolutions = item.resolutions || {};

      const basicInfoResolution: ConflictResolution = resolutions.basicInfo || "archive";
      const layersResolution: ConflictResolution = resolutions.layers || "archive";
      const sptResolution: ConflictResolution = resolutions.spt || "archive";
      const samplingResolution: ConflictResolution = resolutions.sampling || "archive";
      const waterLevelResolution: ConflictResolution = resolutions.waterLevel || "archive";

      let finalRecord = archiveRecord;
      let finalLayers = archiveLayers;
      let finalSPT = archiveSPT;
      let finalSampling = archiveSampling;
      let finalWater = archiveWater;

      if (item.status === "conflict") {
        if (localRecord && archiveRecord) {
          finalRecord = applyBasicInfoResolution(localRecord, archiveRecord, basicInfoResolution);
        }
        finalLayers = applyCategoryResolution(localLayers, archiveLayers, layersResolution, "startDepth");
        finalSPT = applyCategoryResolution(localSPT, archiveSPT, sptResolution, "depth");
        finalSampling = applyCategoryResolution(localSampling, archiveSampling, samplingResolution, "sampleNumber");
        finalWater = applyCategoryResolution(localWater, archiveWater, waterLevelResolution, "observationTime");

        if (options.preserveChecked) {
          finalLayers = mergeCheckStatus(localLayers, finalLayers, "startDepth") as StratumLayer[];
          finalSPT = mergeCheckStatus(localSPT, finalSPT, "depth") as SPTRecord[];
          finalSampling = mergeCheckStatus(localSampling, finalSampling, "sampleNumber") as SamplingRecord[];
          finalWater = mergeCheckStatus(localWater, finalWater, "observationTime") as WaterLevelRecord[];
        }
      } else {
        if (options.preserveChecked) {
          finalLayers = mergeCheckStatus(localLayers, archiveLayers, "startDepth") as StratumLayer[];
          finalSPT = mergeCheckStatus(localSPT, archiveSPT, "depth") as SPTRecord[];
          finalSampling = mergeCheckStatus(localSampling, archiveSampling, "sampleNumber") as SamplingRecord[];
          finalWater = mergeCheckStatus(localWater, archiveWater, "observationTime") as WaterLevelRecord[];
        }
      }

      if (finalRecord) {
        const idx = newRecords.findIndex((r) => r["钻孔编号"] === boreholeId);
        if (idx >= 0) {
          newRecords[idx] = finalRecord;
        } else {
          newRecords.push(finalRecord);
        }
      }

      if (finalLayers.length > 0 || Object.keys(newBoreholeLayers).includes(boreholeId)) {
        newBoreholeLayers[boreholeId] = finalLayers;
      }
      if (finalSPT.length > 0 || Object.keys(newSPTRecords).includes(boreholeId)) {
        newSPTRecords[boreholeId] = finalSPT;
      }
      if (finalSampling.length > 0 || Object.keys(newSamplingRecords).includes(boreholeId)) {
        newSamplingRecords[boreholeId] = finalSampling;
      }
      if (finalWater.length > 0 || Object.keys(newWaterLevelRecords).includes(boreholeId)) {
        newWaterLevelRecords[boreholeId] = finalWater;
      }

      if (item.status === "conflict") {
        const resolvedParts: string[] = [];
        (Object.keys(item.conflictDetails?.categories || {}) as ConflictCategory[]).forEach((cat) => {
          const catDiff = item.conflictDetails?.categories[cat];
          if (catDiff?.hasConflict) {
            const res = resolutions[cat] || "archive";
            resolvedParts.push(`${CATEGORY_LABELS[cat]}${res === "archive" ? "用归档" : "留本地"}`);
          }
        });
        warnings.push(`已处理冲突钻孔：${boreholeId}（${resolvedParts.join("，")}）${options.preserveChecked ? " · 保留本地已校核数据" : ""}`);
      }
      importedCount++;
      processedIds.add(itemKey);
      progress.current = processedIds.size;
      progress.processedBoreholeIds = Array.from(processedIds);
      saveImportProgress(progress);
    }

    await saveProjectData({
      records: newRecords,
      boreholeLayers: newBoreholeLayers,
      sptRecords: newSPTRecords,
      samplingRecords: newSamplingRecords,
      waterLevelRecords: newWaterLevelRecords,
      initialized: true,
    });

    clearImportProgress();

    return {
      success: true,
      importedCount,
      skippedCount,
      resumedFromProgress,
      warnings,
    };
  } catch (err) {
    saveImportProgress({
      ...progress,
      status: "interrupted",
      error: err instanceof Error ? err.message : "未知错误",
    });

    return {
      success: false,
      importedCount,
      skippedCount,
      resumedFromProgress,
      error: err instanceof Error ? err.message : "导入过程中发生错误",
      warnings,
    };
  }
};

export interface ImportProgress {
  total: number;
  current: number;
  processedBoreholeIds: string[];
  startTime: number;
  status: "in-progress" | "interrupted" | "completed";
  error?: string;
}

const saveImportProgress = (progress: ImportProgress): void => {
  try {
    localStorage.setItem(IMPORT_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
};

export const clearImportProgress = (): void => {
  try {
    localStorage.removeItem(IMPORT_PROGRESS_KEY);
  } catch {
    // ignore
  }
};

export const getImportProgress = (): ImportProgress | null => {
  try {
    const stored = localStorage.getItem(IMPORT_PROGRESS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ImportProgress;
      if (!parsed.processedBoreholeIds) {
        parsed.processedBoreholeIds = [];
      }
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
};

const generateId = (): string => Math.random().toString(36).slice(2, 11);

const deepClone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const formatDateForFilename = (isoString: string): string => {
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
};

export const mergeArchiveData = (
  current: ProjectData,
  archive: ArchiveData
): ProjectData => {
  const archiveRecordMap = new Map(archive.records.map((r) => [r["钻孔编号"], r]));

  const mergedRecords: DrillingRecord[] = [];
  const seenIds = new Set<string>();

  for (const rec of current.records) {
    const id = rec["钻孔编号"];
    if (archiveRecordMap.has(id)) {
      mergedRecords.push(archiveRecordMap.get(id)!);
    } else {
      mergedRecords.push(rec);
    }
    seenIds.add(id);
  }

  for (const rec of archive.records) {
    const id = rec["钻孔编号"];
    if (!seenIds.has(id)) {
      mergedRecords.push(rec);
    }
  }

  const mergedBoreholeLayers: BoreholeLayers = { ...current.boreholeLayers };
  for (const id of Object.keys(archive.boreholeLayers)) {
    mergedBoreholeLayers[id] = archive.boreholeLayers[id];
  }

  const mergedSPTRecords: BoreholeSPTRecords = { ...current.sptRecords };
  for (const id of Object.keys(archive.sptRecords)) {
    mergedSPTRecords[id] = archive.sptRecords[id];
  }

  const mergedSamplingRecords: BoreholeSamplingRecords = { ...current.samplingRecords };
  for (const id of Object.keys(archive.samplingRecords)) {
    mergedSamplingRecords[id] = archive.samplingRecords[id];
  }

  const mergedWaterLevelRecords: BoreholeWaterLevelRecords = { ...current.waterLevelRecords };
  for (const id of Object.keys(archive.waterLevelRecords)) {
    mergedWaterLevelRecords[id] = archive.waterLevelRecords[id];
  }

  return {
    ...current,
    records: mergedRecords,
    boreholeLayers: mergedBoreholeLayers,
    sptRecords: mergedSPTRecords,
    samplingRecords: mergedSamplingRecords,
    waterLevelRecords: mergedWaterLevelRecords,
  };
};
