export interface StratumLayer {
  id: string;
  startDepth: string;
  endDepth: string;
  lithology: string;
  soilColor: string;
  density: string;
  description: string;
  isChecked?: boolean;
  checkedBy?: string;
  checkedAt?: string;
  checkRemark?: string;
}

export interface BoreholeLayers {
  [boreholeId: string]: StratumLayer[];
}

export interface SPTRecord {
  id: string;
  depth: string;
  blowCount: string;
  isAbnormal: boolean;
  remark: string;
  layerId: string;
  isChecked?: boolean;
  checkedBy?: string;
  checkedAt?: string;
  checkRemark?: string;
}

export interface BoreholeSPTRecords {
  [boreholeId: string]: SPTRecord[];
}

export interface SamplingRecord {
  id: string;
  depth: string;
  sampleType: string;
  sampleNumber: string;
  remark: string;
  layerId: string;
  isChecked?: boolean;
  checkedBy?: string;
  checkedAt?: string;
  checkRemark?: string;
}

export interface BoreholeSamplingRecords {
  [boreholeId: string]: SamplingRecord[];
}

export interface WaterLevelRecord {
  id: string;
  firstSeenLevel: string;
  stableLevel: string;
  observationTime: string;
  weatherRemark: string;
  isChecked?: boolean;
  checkedBy?: string;
  checkedAt?: string;
  checkRemark?: string;
}

export interface BoreholeWaterLevelRecords {
  [boreholeId: string]: WaterLevelRecord[];
}

export interface DrillingRecord {
  "钻孔编号": string;
  "孔深": string;
  "岩性分类": string;
  "岩性描述": string;
  "土色": string;
  "地下水位": string;
}

export type Role = "现场编录员" | "岩土工程师" | "项目负责人";

export interface Permissions {
  canAddRecord: boolean;
  canEditRecord: boolean;
  canDeleteRecord: boolean;
  canEditLayer: boolean;
  canCheckLayer: boolean;
  canEditSPT: boolean;
  canCheckSPT: boolean;
  canEditSampling: boolean;
  canEditWaterLevel: boolean;
  canExportSummary: boolean;
  canViewChart: boolean;
  canClearData: boolean;
  canExportArchive: boolean;
  canImportArchive: boolean;
  canViewReviewWorkbench: boolean;
}

export const rolePermissions: Record<Role, Permissions> = {
  "现场编录员": {
    canAddRecord: true,
    canEditRecord: true,
    canDeleteRecord: true,
    canEditLayer: true,
    canCheckLayer: false,
    canEditSPT: true,
    canCheckSPT: false,
    canEditSampling: true,
    canEditWaterLevel: true,
    canExportSummary: true,
    canViewChart: true,
    canClearData: true,
    canExportArchive: true,
    canImportArchive: true,
    canViewReviewWorkbench: true,
  },
  "岩土工程师": {
    canAddRecord: false,
    canEditRecord: false,
    canDeleteRecord: false,
    canEditLayer: true,
    canCheckLayer: true,
    canEditSPT: true,
    canCheckSPT: true,
    canEditSampling: false,
    canEditWaterLevel: false,
    canExportSummary: true,
    canViewChart: true,
    canClearData: false,
    canExportArchive: true,
    canImportArchive: false,
    canViewReviewWorkbench: true,
  },
  "项目负责人": {
    canAddRecord: false,
    canEditRecord: false,
    canDeleteRecord: false,
    canEditLayer: false,
    canCheckLayer: false,
    canEditSPT: false,
    canCheckSPT: false,
    canEditSampling: false,
    canEditWaterLevel: false,
    canExportSummary: true,
    canViewChart: true,
    canClearData: false,
    canExportArchive: true,
    canImportArchive: false,
    canViewReviewWorkbench: true,
  },
};

export const roleDescriptions: Record<Role, string> = {
  "现场编录员": "可新增、编辑和删除所有记录，可导入导出项目归档，可查看看板",
  "岩土工程师": "可在校核工作台集中校核分层和标贯数据、标记异常并填写校核说明，可导出项目归档",
  "项目负责人": "仅查看看板（含校核工作台）和导出摘要，可导出项目归档",
};

export const ARCHIVE_VERSION = "1.0.0";

export interface ArchiveMeta {
  version: string;
  projectId: string;
  exportedAt: string;
  exportedBy: string;
  recordCount: number;
  totalDepth: string;
}

export interface ArchiveData {
  meta: ArchiveMeta;
  records: DrillingRecord[];
  boreholeLayers: BoreholeLayers;
  sptRecords: BoreholeSPTRecords;
  samplingRecords: BoreholeSamplingRecords;
  waterLevelRecords: BoreholeWaterLevelRecords;
}

export type ImportStatus = "new" | "overwrite" | "conflict" | "unrecognized";

export interface DepthNormalizationChange {
  field: string;
  original: string;
  normalized: string;
}

export interface BoreholeCheckInfo {
  layerCheckedCount: number;
  layerTotalCount: number;
  sptCheckedCount: number;
  sptTotalCount: number;
  samplingCheckedCount: number;
  samplingTotalCount: number;
  waterLevelCheckedCount: number;
  waterLevelTotalCount: number;
  hasAnyChecked: boolean;
}

export interface BoreholeImportItem {
  boreholeId: string;
  status: ImportStatus;
  conflictFields?: string[];
  details?: string;
  normalizationChanges?: DepthNormalizationChange[];
  checkInfo?: BoreholeCheckInfo;
  isDuplicateInArchive?: boolean;
  duplicateIndex?: number;
}

export interface NormalizationStats {
  totalChanges: number;
  boreholeDepthCount: number;
  waterLevelCount: number;
  layerDepthCount: number;
  sptDepthCount: number;
  samplingDepthCount: number;
  unitConvertedCount: number;
}

export interface ImportPreviewResult {
  archiveMeta: ArchiveMeta;
  boreholes: BoreholeImportItem[];
  newCount: number;
  overwriteCount: number;
  conflictCount: number;
  unrecognizedCount: number;
  duplicateInArchiveCount: number;
  warnings: string[];
  normalizedData: ArchiveData;
  normalizationStats: NormalizationStats;
  checkedBoreholeCount: number;
  totalBoreholeCount: number;
  archiveBoreholeIds: string[];
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  skippedCount: number;
  resumedFromProgress?: boolean;
  error?: string;
  warnings: string[];
}

export interface UncheckedLayerItem {
  type: "layer";
  boreholeId: string;
  layerId: string;
  startDepth: string;
  endDepth: string;
  lithology: string;
  description: string;
  checkRemark?: string;
}

export interface AbnormalSPTItem {
  type: "spt";
  boreholeId: string;
  sptId: string;
  depth: string;
  blowCount: string;
  remark: string;
  checkRemark?: string;
}

export interface LayerGapItem {
  type: "gap";
  boreholeId: string;
  gapStart: string;
  gapEnd: string;
  description: string;
}

export interface DepthAnomalyItem {
  type: "depth";
  boreholeId: string;
  holeDepth: string;
  lastLayerEnd: string;
  description: string;
}

export type ReviewItem = UncheckedLayerItem | AbnormalSPTItem | LayerGapItem | DepthAnomalyItem;

export interface ReviewWorkbenchStats {
  uncheckedLayers: number;
  abnormalSPT: number;
  layerGaps: number;
  depthAnomalies: number;
  total: number;
}
