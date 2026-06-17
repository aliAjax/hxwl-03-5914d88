export interface StratumLayer {
  id: string;
  startDepth: string;
  endDepth: string;
  lithology: string;
  soilColor: string;
  density: string;
  description: string;
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
  canClearData: boolean;
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
    canClearData: true,
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
    canClearData: false,
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
    canClearData: false,
  },
};

export const roleDescriptions: Record<Role, string> = {
  "现场编录员": "可新增、编辑和删除所有记录",
  "岩土工程师": "仅可校核分层和标贯数据的异常标记和备注",
  "项目负责人": "仅查看看板和导出摘要",
};
