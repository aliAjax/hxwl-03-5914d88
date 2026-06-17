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
