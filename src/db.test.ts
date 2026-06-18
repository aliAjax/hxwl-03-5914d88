import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ProjectData } from "./db";

vi.mock("./db", () => {
  const store = new Map<string, ProjectData>();

  return {
    saveProjectData: vi.fn(async (data: Omit<ProjectData, "lastSaved">) => {
      store.set("main-project", {
        ...data,
        lastSaved: new Date().toISOString(),
      });
    }),
    loadProjectData: vi.fn(async () => {
      return store.get("main-project") || null;
    }),
    clearProjectData: vi.fn(async () => {
      store.clear();
    }),
  };
});

import { saveProjectData, loadProjectData, clearProjectData } from "./db";

const mockDrillingRecord = {
  "钻孔编号": "ZK-01",
  "孔深": "20.5",
  "岩性分类": "黏土",
  "岩性描述": "黄褐色黏土",
  "土色": "黄褐色",
  "地下水位": "3.5",
};

const mockLayer = {
  id: "layer-1",
  startDepth: "0",
  endDepth: "5.0",
  lithology: "素填土",
  soilColor: "褐色",
  density: "松散",
  description: "人工填土",
};

const mockSPT = {
  id: "spt-1",
  depth: "2.5",
  blowCount: "12",
  isAbnormal: false,
  remark: "",
  layerId: "layer-1",
};

const mockSampling = {
  id: "spl-1",
  depth: "3.0",
  sampleType: "原状样",
  sampleNumber: "S001",
  remark: "",
  layerId: "layer-1",
};

const mockWaterLevel = {
  id: "wl-1",
  firstSeenLevel: "3.2",
  stableLevel: "3.5",
  observationTime: "2024-06-15 08:30",
  weatherRemark: "晴",
};

describe("IndexedDB 持久化 - 核心流程", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProjectData();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("saveProjectData - 保存数据", () => {
    it("应该成功保存完整的项目数据", async () => {
      const data: Omit<ProjectData, "lastSaved"> = {
        records: [mockDrillingRecord],
        boreholeLayers: { "ZK-01": [mockLayer] },
        sptRecords: { "ZK-01": [mockSPT] },
        samplingRecords: { "ZK-01": [mockSampling] },
        waterLevelRecords: { "ZK-01": [mockWaterLevel] },
        initialized: true,
      };

      await saveProjectData(data);

      expect(saveProjectData).toHaveBeenCalledTimes(1);
      expect(saveProjectData).toHaveBeenCalledWith(data);

      const saved = await loadProjectData();
      expect(saved).toBeDefined();
      expect(saved?.initialized).toBe(true);
      expect(saved?.records).toHaveLength(1);
      expect(saved?.records[0]["钻孔编号"]).toBe("ZK-01");
      expect(saved?.lastSaved).toBeDefined();
    });

    it("应该自动添加 lastSaved 时间戳", async () => {
      const beforeSave = Date.now();
      await saveProjectData({
        records: [mockDrillingRecord],
        boreholeLayers: {},
        sptRecords: {},
        samplingRecords: {},
        waterLevelRecords: {},
        initialized: true,
      });

      const saved = await loadProjectData();
      expect(saved?.lastSaved).toBeDefined();
      const savedTime = new Date(saved!.lastSaved).getTime();
      expect(savedTime).toBeGreaterThanOrEqual(beforeSave);
    });

    it("应该正确保存多钻孔数据", async () => {
      const data: Omit<ProjectData, "lastSaved"> = {
        records: [
          mockDrillingRecord,
          { ...mockDrillingRecord, "钻孔编号": "ZK-02", "孔深": "25.0" },
        ],
        boreholeLayers: {
          "ZK-01": [mockLayer],
          "ZK-02": [{ ...mockLayer, id: "layer-2", endDepth: "8.0" }],
        },
        sptRecords: {
          "ZK-01": [mockSPT],
          "ZK-02": [],
        },
        samplingRecords: {
          "ZK-01": [mockSampling],
          "ZK-02": [],
        },
        waterLevelRecords: {
          "ZK-01": [mockWaterLevel],
          "ZK-02": [],
        },
        initialized: true,
      };

      await saveProjectData(data);
      const saved = await loadProjectData();

      expect(saved?.records).toHaveLength(2);
      expect(Object.keys(saved!.boreholeLayers)).toHaveLength(2);
      expect(saved?.boreholeLayers["ZK-01"]).toHaveLength(1);
      expect(saved?.boreholeLayers["ZK-02"]).toHaveLength(1);
    });

    it("应该正确处理空数据", async () => {
      const data: Omit<ProjectData, "lastSaved"> = {
        records: [],
        boreholeLayers: {},
        sptRecords: {},
        samplingRecords: {},
        waterLevelRecords: {},
        initialized: false,
      };

      await saveProjectData(data);
      const saved = await loadProjectData();

      expect(saved?.records).toHaveLength(0);
      expect(saved?.initialized).toBe(false);
    });
  });

  describe("loadProjectData - 加载数据", () => {
    it("首次加载应该返回 null", async () => {
      const result = await loadProjectData();
      expect(result).toBeNull();
    });

    it("保存后应该能正确加载数据", async () => {
      const data: Omit<ProjectData, "lastSaved"> = {
        records: [mockDrillingRecord],
        boreholeLayers: { "ZK-01": [mockLayer] },
        sptRecords: { "ZK-01": [mockSPT] },
        samplingRecords: { "ZK-01": [mockSampling] },
        waterLevelRecords: { "ZK-01": [mockWaterLevel] },
        initialized: true,
      };

      await saveProjectData(data);
      const loaded = await loadProjectData();

      expect(loaded).not.toBeNull();
      expect(loaded?.records[0]).toEqual(mockDrillingRecord);
      expect(loaded?.boreholeLayers["ZK-01"][0]).toEqual(mockLayer);
      expect(loaded?.sptRecords["ZK-01"][0]).toEqual(mockSPT);
      expect(loaded?.samplingRecords["ZK-01"][0]).toEqual(mockSampling);
      expect(loaded?.waterLevelRecords["ZK-01"][0]).toEqual(mockWaterLevel);
    });

    it("应该保留所有字段完整性", async () => {
      const layerWithCheck = {
        ...mockLayer,
        isChecked: true,
        checkedBy: "岩土工程师",
        checkedAt: "2024-06-15T10:00:00.000Z",
        checkRemark: "数据无误",
      };

      const data: Omit<ProjectData, "lastSaved"> = {
        records: [mockDrillingRecord],
        boreholeLayers: { "ZK-01": [layerWithCheck] },
        sptRecords: {},
        samplingRecords: {},
        waterLevelRecords: {},
        initialized: true,
      };

      await saveProjectData(data);
      const loaded = await loadProjectData();

      const loadedLayer = loaded?.boreholeLayers["ZK-01"][0];
      expect(loadedLayer?.isChecked).toBe(true);
      expect(loadedLayer?.checkedBy).toBe("岩土工程师");
      expect(loadedLayer?.checkedAt).toBe("2024-06-15T10:00:00.000Z");
      expect(loadedLayer?.checkRemark).toBe("数据无误");
    });
  });

  describe("clearProjectData - 清空数据", () => {
    it("应该正确清空已保存的数据", async () => {
      await saveProjectData({
        records: [mockDrillingRecord],
        boreholeLayers: {},
        sptRecords: {},
        samplingRecords: {},
        waterLevelRecords: {},
        initialized: true,
      });

      expect(await loadProjectData()).not.toBeNull();

      await clearProjectData();

      expect(clearProjectData).toHaveBeenCalled();
      expect(await loadProjectData()).toBeNull();
    });

    it("清空空数据不应该报错", async () => {
      await expect(clearProjectData()).resolves.not.toThrow();
      expect(await loadProjectData()).toBeNull();
    });
  });

  describe("数据完整性验证", () => {
    it("多次保存应该覆盖之前的数据", async () => {
      await saveProjectData({
        records: [mockDrillingRecord],
        boreholeLayers: {},
        sptRecords: {},
        samplingRecords: {},
        waterLevelRecords: {},
        initialized: true,
      });

      const newRecord = { ...mockDrillingRecord, "钻孔编号": "ZK-02" };
      await saveProjectData({
        records: [newRecord],
        boreholeLayers: {},
        sptRecords: {},
        samplingRecords: {},
        waterLevelRecords: {},
        initialized: true,
      });

      const loaded = await loadProjectData();
      expect(loaded?.records).toHaveLength(1);
      expect(loaded?.records[0]["钻孔编号"]).toBe("ZK-02");
    });

    it("应该正确处理复杂的嵌套数据结构", async () => {
      const data: Omit<ProjectData, "lastSaved"> = {
        records: [
          { ...mockDrillingRecord, "钻孔编号": "ZK-01" },
          { ...mockDrillingRecord, "钻孔编号": "ZK-02" },
          { ...mockDrillingRecord, "钻孔编号": "ZK-03" },
        ],
        boreholeLayers: {
          "ZK-01": [
            { ...mockLayer, id: "l1", endDepth: "5" },
            { ...mockLayer, id: "l2", startDepth: "5", endDepth: "10" },
            { ...mockLayer, id: "l3", startDepth: "10", endDepth: "15" },
          ],
          "ZK-02": [
            { ...mockLayer, id: "l4", endDepth: "8" },
            { ...mockLayer, id: "l5", startDepth: "8", endDepth: "20" },
          ],
          "ZK-03": [],
        },
        sptRecords: {
          "ZK-01": [
            { ...mockSPT, id: "s1", depth: "2" },
            { ...mockSPT, id: "s2", depth: "7" },
            { ...mockSPT, id: "s3", depth: "12" },
          ],
          "ZK-02": [],
          "ZK-03": [],
        },
        samplingRecords: {
          "ZK-01": [{ ...mockSampling, id: "p1", depth: "3" }],
          "ZK-02": [],
          "ZK-03": [],
        },
        waterLevelRecords: {
          "ZK-01": [mockWaterLevel],
          "ZK-02": [mockWaterLevel],
          "ZK-03": [],
        },
        initialized: true,
      };

      await saveProjectData(data);
      const loaded = await loadProjectData();

      expect(loaded?.records).toHaveLength(3);
      expect(loaded?.boreholeLayers["ZK-01"]).toHaveLength(3);
      expect(loaded?.sptRecords["ZK-01"]).toHaveLength(3);
      expect(loaded?.samplingRecords["ZK-01"]).toHaveLength(1);
      expect(loaded?.waterLevelRecords["ZK-01"]).toHaveLength(1);
      expect(loaded?.waterLevelRecords["ZK-02"]).toHaveLength(1);
      expect(loaded?.boreholeLayers["ZK-03"]).toHaveLength(0);
    });
  });

  describe("与归档导入的集成", () => {
    it("应该正确保存从归档导入后的数据结构", async () => {
      const importedData: Omit<ProjectData, "lastSaved"> = {
        records: [
          { "钻孔编号": "ZK-IMP-01", "孔深": "30.0", "岩性分类": "粉质黏土", "岩性描述": "黄褐色，可塑", "土色": "黄褐色", "地下水位": "15.5" },
          { "钻孔编号": "ZK-IMP-02", "孔深": "25.0", "岩性分类": "粉土", "岩性描述": "褐黄色，稍密", "土色": "褐黄色", "地下水位": "12.0" },
        ],
        boreholeLayers: {
          "ZK-IMP-01": [
            { id: "imp-l1", startDepth: "0", endDepth: "5", lithology: "素填土", soilColor: "褐色", density: "松散", description: "人工填土", isChecked: true, checkedBy: "系统", checkedAt: new Date().toISOString() },
            { id: "imp-l2", startDepth: "5", endDepth: "15", lithology: "粉质黏土", soilColor: "黄褐色", density: "可塑", description: "含铁锰结核" },
          ],
          "ZK-IMP-02": [
            { id: "imp-l3", startDepth: "0", endDepth: "8", lithology: "粉土", soilColor: "褐黄色", density: "稍密", description: "湿" },
          ],
        },
        sptRecords: {
          "ZK-IMP-01": [
            { id: "imp-s1", depth: "3", blowCount: "12", isAbnormal: false, remark: "", layerId: "imp-l1" },
            { id: "imp-s2", depth: "10", blowCount: "18", isAbnormal: false, remark: "", layerId: "imp-l2" },
          ],
          "ZK-IMP-02": [],
        },
        samplingRecords: {
          "ZK-IMP-01": [
            { id: "imp-p1", depth: "2", sampleType: "原状样", sampleNumber: "IMP-S001", remark: "", layerId: "imp-l1" },
          ],
          "ZK-IMP-02": [],
        },
        waterLevelRecords: {
          "ZK-IMP-01": [
            { id: "imp-w1", firstSeenLevel: "10", stableLevel: "15.5", observationTime: "2024-01-01", weatherRemark: "晴" },
          ],
          "ZK-IMP-02": [
            { id: "imp-w2", firstSeenLevel: "8", stableLevel: "12", observationTime: "2024-01-02", weatherRemark: "多云" },
          ],
        },
        initialized: true,
      };

      await saveProjectData(importedData);
      const loaded = await loadProjectData();

      expect(loaded?.records).toHaveLength(2);
      expect(loaded?.records[0]["钻孔编号"]).toBe("ZK-IMP-01");
      expect(loaded?.boreholeLayers["ZK-IMP-01"]).toHaveLength(2);
      expect(loaded?.boreholeLayers["ZK-IMP-01"][0].isChecked).toBe(true);
      expect(loaded?.sptRecords["ZK-IMP-01"]).toHaveLength(2);
      expect(loaded?.samplingRecords["ZK-IMP-01"]).toHaveLength(1);
      expect(loaded?.waterLevelRecords["ZK-IMP-01"]).toHaveLength(1);
      expect(loaded?.waterLevelRecords["ZK-IMP-02"][0].stableLevel).toBe("12");
    });
  });
});
