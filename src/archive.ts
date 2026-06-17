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
} from "./types";
import { ARCHIVE_VERSION } from "./types";
import { saveProjectData, loadProjectData, type ProjectData } from "./db";

const IMPORT_PROGRESS_KEY = "hxwl-03-import-progress";
const ARCHIVE_FILE_PREFIX = "hxwl-archive";

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

        if (!data.meta || typeof data.meta.version !== "string") {
          reject(new Error("归档文件缺少版本信息，可能不是有效的项目归档文件"));
          return;
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

export const normalizeDepthValue = (value: string): string => {
  if (!value || value.trim() === "") return "";

  let cleaned = value.trim();
  cleaned = cleaned.replace(/m$/, "");
  cleaned = cleaned.replace(/米$/, "");
  cleaned = cleaned.trim();

  const num = parseFloat(cleaned);
  if (isNaN(num)) return value;

  if (num > 1000) {
    return (num / 1000).toFixed(2);
  }

  return String(num);
};

const normalizeStratumLayer = (layer: any, warnings: string[], boreholeId: string): StratumLayer => {
  const normalized: StratumLayer = {
    id: layer.id || generateId(),
    startDepth: normalizeDepthValue(layer.startDepth ?? ""),
    endDepth: normalizeDepthValue(layer.endDepth ?? ""),
    lithology: layer.lithology ?? "",
    soilColor: layer.soilColor ?? "",
    density: layer.density ?? "",
    description: layer.description ?? "",
  };

  if (layer.isChecked !== undefined) normalized.isChecked = !!layer.isChecked;
  if (layer.checkedBy) normalized.checkedBy = layer.checkedBy;
  if (layer.checkedAt) normalized.checkedAt = layer.checkedAt;
  if (layer.checkRemark) normalized.checkRemark = layer.checkRemark;

  if (!layer.id) {
    warnings.push(`钻孔 ${boreholeId} 的分层缺少 id，已自动生成`);
  }
  if (layer.startDepth !== undefined && layer.startDepth !== normalized.startDepth) {
    warnings.push(`钻孔 ${boreholeId} 分层起始深度格式已归一化：${layer.startDepth} → ${normalized.startDepth}`);
  }
  if (layer.endDepth !== undefined && layer.endDepth !== normalized.endDepth) {
    warnings.push(`钻孔 ${boreholeId} 分层终止深度格式已归一化：${layer.endDepth} → ${normalized.endDepth}`);
  }

  return normalized;
};

const normalizeSPTRecord = (spt: any, warnings: string[], boreholeId: string): SPTRecord => {
  const normalized: SPTRecord = {
    id: spt.id || generateId(),
    depth: normalizeDepthValue(spt.depth ?? ""),
    blowCount: spt.blowCount ?? "",
    isAbnormal: !!spt.isAbnormal,
    remark: spt.remark ?? "",
    layerId: spt.layerId ?? "",
  };

  if (spt.isChecked !== undefined) normalized.isChecked = !!spt.isChecked;
  if (spt.checkedBy) normalized.checkedBy = spt.checkedBy;
  if (spt.checkedAt) normalized.checkedAt = spt.checkedAt;
  if (spt.checkRemark) normalized.checkRemark = spt.checkRemark;

  if (!spt.id) {
    warnings.push(`钻孔 ${boreholeId} 的标贯记录缺少 id，已自动生成`);
  }
  if (spt.depth !== undefined && spt.depth !== normalized.depth) {
    warnings.push(`钻孔 ${boreholeId} 标贯深度格式已归一化：${spt.depth} → ${normalized.depth}`);
  }

  return normalized;
};

const normalizeSamplingRecord = (spl: any, warnings: string[], boreholeId: string): SamplingRecord => {
  const normalized: SamplingRecord = {
    id: spl.id || generateId(),
    depth: normalizeDepthValue(spl.depth ?? ""),
    sampleType: spl.sampleType ?? "",
    sampleNumber: spl.sampleNumber ?? "",
    remark: spl.remark ?? "",
    layerId: spl.layerId ?? "",
  };

  if (spl.isChecked !== undefined) normalized.isChecked = !!spl.isChecked;
  if (spl.checkedBy) normalized.checkedBy = spl.checkedBy;
  if (spl.checkedAt) normalized.checkedAt = spl.checkedAt;
  if (spl.checkRemark) normalized.checkRemark = spl.checkRemark;

  if (!spl.id) {
    warnings.push(`钻孔 ${boreholeId} 的取样记录缺少 id，已自动生成`);
  }
  if (spl.depth !== undefined && spl.depth !== normalized.depth) {
    warnings.push(`钻孔 ${boreholeId} 取样深度格式已归一化：${spl.depth} → ${normalized.depth}`);
  }

  return normalized;
};

const normalizeWaterLevelRecord = (wl: any, warnings: string[], boreholeId: string): WaterLevelRecord => {
  const normalized: WaterLevelRecord = {
    id: wl.id || generateId(),
    firstSeenLevel: normalizeDepthValue(wl.firstSeenLevel ?? ""),
    stableLevel: normalizeDepthValue(wl.stableLevel ?? ""),
    observationTime: wl.observationTime ?? "",
    weatherRemark: wl.weatherRemark ?? "",
  };

  if (wl.isChecked !== undefined) normalized.isChecked = !!wl.isChecked;
  if (wl.checkedBy) normalized.checkedBy = wl.checkedBy;
  if (wl.checkedAt) normalized.checkedAt = wl.checkedAt;
  if (wl.checkRemark) normalized.checkRemark = wl.checkRemark;

  if (!wl.id) {
    warnings.push(`钻孔 ${boreholeId} 的水位记录缺少 id，已自动生成`);
  }

  return normalized;
};

export const normalizeArchiveData = (archive: ArchiveData): { data: ArchiveData; warnings: string[] } => {
  const warnings: string[] = [];

  const version = archive.meta?.version || "0.0.0";
  if (version !== ARCHIVE_VERSION) {
    warnings.push(`归档版本为 v${version}，当前系统版本为 v${ARCHIVE_VERSION}，已自动兼容处理`);
  }

  if (!archive.records || !Array.isArray(archive.records)) {
    warnings.push("归档文件缺少钻孔记录数据");
    return { data: { ...archive, records: [] }, warnings };
  }

  const normalizedRecords: DrillingRecord[] = archive.records.map((rec) => {
    const record = { ...rec };
    if (record["孔深"]) {
      const normalized = normalizeDepthValue(record["孔深"]);
      if (record["孔深"] !== normalized) {
        warnings.push(`钻孔 ${record["钻孔编号"]} 孔深格式已归一化：${record["孔深"]} → ${normalized}`);
        record["孔深"] = normalized;
      }
    }
    if (record["地下水位"]) {
      const normalized = normalizeDepthValue(record["地下水位"]);
      if (record["地下水位"] !== normalized) {
        warnings.push(`钻孔 ${record["钻孔编号"]} 地下水位格式已归一化：${record["地下水位"]} → ${normalized}`);
        record["地下水位"] = normalized;
      }
    }
    return record;
  });

  const normalizedBoreholeLayers: BoreholeLayers = {};
  if (archive.boreholeLayers && typeof archive.boreholeLayers === "object") {
    for (const boreholeId of Object.keys(archive.boreholeLayers)) {
      const layers = archive.boreholeLayers[boreholeId];
      if (Array.isArray(layers)) {
        normalizedBoreholeLayers[boreholeId] = layers.map((l) => normalizeStratumLayer(l, warnings, boreholeId));
      } else {
        warnings.push(`钻孔 ${boreholeId} 的分层数据格式异常，已跳过`);
      }
    }
  } else {
    warnings.push("归档文件缺少分层数据");
  }

  const normalizedSPTRecords: BoreholeSPTRecords = {};
  if (archive.sptRecords && typeof archive.sptRecords === "object") {
    for (const boreholeId of Object.keys(archive.sptRecords)) {
      const spts = archive.sptRecords[boreholeId];
      if (Array.isArray(spts)) {
        normalizedSPTRecords[boreholeId] = spts.map((s) => normalizeSPTRecord(s, warnings, boreholeId));
      } else {
        warnings.push(`钻孔 ${boreholeId} 的标贯数据格式异常，已跳过`);
      }
    }
  }

  const normalizedSamplingRecords: BoreholeSamplingRecords = {};
  if (archive.samplingRecords && typeof archive.samplingRecords === "object") {
    for (const boreholeId of Object.keys(archive.samplingRecords)) {
      const spls = archive.samplingRecords[boreholeId];
      if (Array.isArray(spls)) {
        normalizedSamplingRecords[boreholeId] = spls.map((s) => normalizeSamplingRecord(s, warnings, boreholeId));
      } else {
        warnings.push(`钻孔 ${boreholeId} 的取样数据格式异常，已跳过`);
      }
    }
  }

  const normalizedWaterLevelRecords: BoreholeWaterLevelRecords = {};
  if (archive.waterLevelRecords && typeof archive.waterLevelRecords === "object") {
    for (const boreholeId of Object.keys(archive.waterLevelRecords)) {
      const wls = archive.waterLevelRecords[boreholeId];
      if (Array.isArray(wls)) {
        normalizedWaterLevelRecords[boreholeId] = wls.map((w) => normalizeWaterLevelRecord(w, warnings, boreholeId));
      } else {
        warnings.push(`钻孔 ${boreholeId} 的水位数据格式异常，已跳过`);
      }
    }
  }

  const normalizedData: ArchiveData = {
    ...archive,
    records: normalizedRecords,
    boreholeLayers: normalizedBoreholeLayers,
    sptRecords: normalizedSPTRecords,
    samplingRecords: normalizedSamplingRecords,
    waterLevelRecords: normalizedWaterLevelRecords,
  };

  return { data: normalizedData, warnings };
};

export const previewImport = async (archive: ArchiveData): Promise<ImportPreviewResult> => {
  const { data: normalizedData, warnings } = normalizeArchiveData(archive);

  const currentData = await loadProjectData();
  const currentRecords = currentData?.records || [];
  const currentRecordMap = new Map(currentRecords.map((r) => [r["钻孔编号"], r]));

  const boreholeItems: BoreholeImportItem[] = [];
  let newCount = 0;
  let overwriteCount = 0;
  let conflictCount = 0;
  let unrecognizedCount = 0;

  const validBoreholeIds = new Set(normalizedData.records.map((r) => r["钻孔编号"]).filter((id) => id));

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

    const existingRecord = currentRecordMap.get(boreholeId);

    if (!existingRecord) {
      newCount++;
      const layerCount = normalizedData.boreholeLayers[boreholeId]?.length || 0;
      const sptCount = normalizedData.sptRecords[boreholeId]?.length || 0;
      boreholeItems.push({
        boreholeId,
        status: "new",
        details: `孔深${record["孔深"]}m · ${layerCount}层 · ${sptCount}次标贯`,
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

      if (conflictFields.length > 0) {
        conflictCount++;
        boreholeItems.push({
          boreholeId,
          status: "conflict",
          conflictFields,
          details: `存在 ${conflictFields.length} 处差异：${conflictFields.join("、")}`,
        });
      } else {
        overwriteCount++;
        boreholeItems.push({
          boreholeId,
          status: "overwrite",
          details: "数据内容一致，将覆盖更新",
        });
      }
    }
  }

  if (normalizedData.boreholeLayers) {
    for (const boreholeId of Object.keys(normalizedData.boreholeLayers)) {
      if (!validBoreholeIds.has(boreholeId)) {
        unrecognizedCount++;
        boreholeItems.push({
          boreholeId,
          status: "unrecognized",
          details: "分层数据找不到对应钻孔记录",
        });
      }
    }
  }

  return {
    archiveMeta: normalizedData.meta,
    boreholes: boreholeItems,
    newCount,
    overwriteCount,
    conflictCount,
    unrecognizedCount,
    warnings,
    normalizedData,
  };
};

export const applyImport = async (
  previewResult: ImportPreviewResult,
  options: { includeNew: boolean; includeOverwrite: boolean; includeConflict: boolean }
): Promise<ImportResult> => {
  const { normalizedData } = previewResult;
  const warnings: string[] = [];
  let importedCount = 0;
  let skippedCount = 0;

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

  saveImportProgress({
    total: previewResult.boreholes.length,
    current: 0,
    startTime: Date.now(),
    status: "in-progress",
  });

  try {
    for (const item of previewResult.boreholes) {
      const boreholeId = item.boreholeId;

      if (item.status === "new" && options.includeNew) {
        const record = normalizedData.records.find((r) => r["钻孔编号"] === boreholeId);
        if (record) {
          newRecords.push(record);
        }
        if (normalizedData.boreholeLayers[boreholeId]) {
          newBoreholeLayers[boreholeId] = normalizedData.boreholeLayers[boreholeId];
        }
        if (normalizedData.sptRecords[boreholeId]) {
          newSPTRecords[boreholeId] = normalizedData.sptRecords[boreholeId];
        }
        if (normalizedData.samplingRecords[boreholeId]) {
          newSamplingRecords[boreholeId] = normalizedData.samplingRecords[boreholeId];
        }
        if (normalizedData.waterLevelRecords[boreholeId]) {
          newWaterLevelRecords[boreholeId] = normalizedData.waterLevelRecords[boreholeId];
        }
        importedCount++;
      } else if (item.status === "overwrite" && options.includeOverwrite) {
        const record = normalizedData.records.find((r) => r["钻孔编号"] === boreholeId);
        if (record) {
          const idx = newRecords.findIndex((r) => r["钻孔编号"] === boreholeId);
          if (idx >= 0) newRecords[idx] = record;
        }
        if (normalizedData.boreholeLayers[boreholeId]) {
          newBoreholeLayers[boreholeId] = normalizedData.boreholeLayers[boreholeId];
        }
        if (normalizedData.sptRecords[boreholeId]) {
          newSPTRecords[boreholeId] = normalizedData.sptRecords[boreholeId];
        }
        if (normalizedData.samplingRecords[boreholeId]) {
          newSamplingRecords[boreholeId] = normalizedData.samplingRecords[boreholeId];
        }
        if (normalizedData.waterLevelRecords[boreholeId]) {
          newWaterLevelRecords[boreholeId] = normalizedData.waterLevelRecords[boreholeId];
        }
        importedCount++;
      } else if (item.status === "conflict" && options.includeConflict) {
        const record = normalizedData.records.find((r) => r["钻孔编号"] === boreholeId);
        if (record) {
          const idx = newRecords.findIndex((r) => r["钻孔编号"] === boreholeId);
          if (idx >= 0) newRecords[idx] = record;
        }
        if (normalizedData.boreholeLayers[boreholeId]) {
          newBoreholeLayers[boreholeId] = normalizedData.boreholeLayers[boreholeId];
        }
        if (normalizedData.sptRecords[boreholeId]) {
          newSPTRecords[boreholeId] = normalizedData.sptRecords[boreholeId];
        }
        if (normalizedData.samplingRecords[boreholeId]) {
          newSamplingRecords[boreholeId] = normalizedData.samplingRecords[boreholeId];
        }
        if (normalizedData.waterLevelRecords[boreholeId]) {
          newWaterLevelRecords[boreholeId] = normalizedData.waterLevelRecords[boreholeId];
        }
        importedCount++;
        warnings.push(`已覆盖冲突钻孔：${boreholeId}`);
      } else {
        skippedCount++;
      }
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
      warnings,
    };
  } catch (err) {
    saveImportProgress({
      total: previewResult.boreholes.length,
      current: importedCount,
      startTime: Date.now(),
      status: "interrupted",
      error: err instanceof Error ? err.message : "未知错误",
    });

    return {
      success: false,
      importedCount,
      skippedCount,
      error: err instanceof Error ? err.message : "导入过程中发生错误",
      warnings,
    };
  }
};

interface ImportProgress {
  total: number;
  current: number;
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
      return JSON.parse(stored) as ImportProgress;
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
