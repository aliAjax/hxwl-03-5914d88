import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import {
  normalizeDepthValue,
  normalizeArchiveData,
  previewImport,
} from "./archive";
import type { ArchiveData } from "./types";
import { ARCHIVE_VERSION } from "./types";
import * as dbModule from "./db";

vi.mock("./db", () => ({
  loadProjectData: vi.fn(),
  saveProjectData: vi.fn(),
  clearProjectData: vi.fn(),
}));

describe("normalizeDepthValue - 深度值归一化", () => {
  describe("米(m)单位", () => {
    it("应该解析带小写m后缀的数值", () => {
      const result = normalizeDepthValue("15.5m");
      expect(result.normalized).toBe("15.5");
      expect(result.wasConverted).toBe(true);
    });

    it("应该解析带大写M后缀的数值", () => {
      const result = normalizeDepthValue("20M");
      expect(result.normalized).toBe("20");
      expect(result.wasConverted).toBe(true);
    });

    it("应该解析中文米后缀的数值", () => {
      const result = normalizeDepthValue("30.5米");
      expect(result.normalized).toBe("30.5");
      expect(result.wasConverted).toBe(true);
    });

    it("应该解析纯数字（无单位）且不标记转换", () => {
      const result = normalizeDepthValue("25.3");
      expect(result.normalized).toBe("25.3");
      expect(result.wasConverted).toBe(false);
    });

    it("应该解析整数米", () => {
      const result = normalizeDepthValue("40m");
      expect(result.normalized).toBe("40");
      expect(result.wasConverted).toBe(true);
    });
  });

  describe("厘米(cm)单位", () => {
    it("应该将cm转换为米（小写）", () => {
      const result = normalizeDepthValue("150cm");
      expect(result.normalized).toBe("1.50");
      expect(result.wasConverted).toBe(true);
    });

    it("应该将cm转换为米（大写）", () => {
      const result = normalizeDepthValue("200CM");
      expect(result.normalized).toBe("2.00");
      expect(result.wasConverted).toBe(true);
    });

    it("应该将厘后缀转换为米", () => {
      const result = normalizeDepthValue("250厘");
      expect(result.normalized).toBe("2.50");
      expect(result.wasConverted).toBe(true);
    });

    it("应该正确处理小数厘米", () => {
      const result = normalizeDepthValue("123.5cm");
      expect(result.normalized).toBe("1.24");
      expect(result.wasConverted).toBe(true);
    });
  });

  describe("毫米(mm)单位", () => {
    it("应该将mm转换为米（小写）", () => {
      const result = normalizeDepthValue("1500mm");
      expect(result.normalized).toBe("1.50");
      expect(result.wasConverted).toBe(true);
    });

    it("应该将mm转换为米（大写）", () => {
      const result = normalizeDepthValue("2000MM");
      expect(result.normalized).toBe("2.00");
      expect(result.wasConverted).toBe(true);
    });

    it("应该将毫后缀转换为米", () => {
      const result = normalizeDepthValue("3000毫");
      expect(result.normalized).toBe("3.00");
      expect(result.wasConverted).toBe(true);
    });

    it("应该正确处理小数毫米", () => {
      const result = normalizeDepthValue("1234.5mm");
      expect(result.normalized).toBe("1.23");
      expect(result.wasConverted).toBe(true);
    });
  });

  describe("全角字符兼容", () => {
    it("应该处理全角大写Ｍ", () => {
      const result = normalizeDepthValue("25Ｍ");
      expect(result.normalized).toBe("25");
      expect(result.wasConverted).toBe(true);
    });

    it("应该处理全角小写ｍ", () => {
      const result = normalizeDepthValue("30ｍ");
      expect(result.normalized).toBe("30");
      expect(result.wasConverted).toBe(true);
    });
  });

  describe("空格和特殊格式", () => {
    it("应该去除前后空格", () => {
      const result = normalizeDepthValue("  15.5m  ");
      expect(result.normalized).toBe("15.5");
      expect(result.wasConverted).toBe(true);
    });

    it("应该去除中间空格", () => {
      const result = normalizeDepthValue("15 . 5 m");
      expect(result.normalized).toBe("15.5");
      expect(result.wasConverted).toBe(true);
    });
  });

  describe("边界和特殊值", () => {
    it("空字符串应返回空", () => {
      const result = normalizeDepthValue("");
      expect(result.normalized).toBe("");
      expect(result.wasConverted).toBe(false);
    });

    it("仅空格应返回空", () => {
      const result = normalizeDepthValue("   ");
      expect(result.normalized).toBe("");
      expect(result.wasConverted).toBe(false);
    });

    it("非数字值应原样返回", () => {
      const result = normalizeDepthValue("abc");
      expect(result.normalized).toBe("abc");
      expect(result.wasConverted).toBe(false);
    });

    it("大于1000的无单位数字应视为毫米自动转换", () => {
      const result = normalizeDepthValue("1500");
      expect(result.normalized).toBe("1.50");
      expect(result.wasConverted).toBe(true);
    });
  });
});

describe("normalizeArchiveData - 归档数据归一化（含旧字段映射）", () => {
  const createLegacyArchive = (): any => ({
    meta: {
      version: "0.0.1-legacy",
      projectId: "test-project",
      exportedAt: "2024-01-01T00:00:00.000Z",
      exportedBy: "test-user",
      recordCount: 1,
      totalDepth: "30m",
    },
    records: [
      {
        holeId: "ZK01",
        holeDepth: "3000cm",
        lithologyType: "粉质黏土",
        lithologyDesc: "黄褐色，可塑",
        soilColor: "黄褐色",
        groundwater: "15.5m",
      },
    ],
    boreholeLayers: {
      ZK01: [
        {
          fromDepth: "0m",
          toDepth: "500cm",
          lithology: "素填土",
          colour: "褐色",
          state: "松散",
          desc: "人工填土",
        },
        {
          topDepth: "5m",
          bottomDepth: "15000mm",
          rockType: "粉质黏土",
          soilColor: "黄褐色",
          condition: "可塑",
          remark: "含铁锰结核",
        },
      ],
    },
    sptRecords: {
      ZK01: [
        {
          testDepth: "3m",
          blowCounts: "12",
          abnormal: false,
          note: "正常",
        },
        {
          testDepth: "1000cm",
          count: "15",
          isAbnormal: true,
          remark: "异常",
        },
      ],
    },
    samplingRecords: {
      ZK01: [
        {
          sampleDepth: "200cm",
          type: "原状土",
          sampleId: "S001",
          note: "一级样",
        },
        {
          sampleDepth: "8m",
          sampleType: "扰动土",
          no: "S002",
          remark: "二级样",
        },
      ],
    },
    waterLevelRecords: {
      ZK01: [
        {
          firstSeen: "10m",
          stable: "12m",
          observedAt: "2024-01-01",
          weather: "晴",
        },
        {
          firstLevel: "1500cm",
          stableWater: "1800cm",
          time: "2024-01-02",
          remark: "多云",
        },
      ],
    },
  });

  it("应该正确归一化钻孔记录中的孔深（cm→m）和地下水位", () => {
    const archive = createLegacyArchive();
    const result = normalizeArchiveData(archive as ArchiveData);

    const record = result.data.records[0];
    expect(record["钻孔编号"]).toBe("ZK01");
    expect(record["孔深"]).toBe("30.00");
    expect(record["地下水位"]).toBe("15.5");
    expect(record["岩性分类"]).toBe("粉质黏土");
    expect(record["岩性描述"]).toBe("黄褐色，可塑");
    expect(record["土色"]).toBe("黄褐色");
  });

  it("应该正确映射并归一化分层起止深度", () => {
    const archive = createLegacyArchive();
    const result = normalizeArchiveData(archive as ArchiveData);

    const layers = result.data.boreholeLayers["ZK01"];
    expect(layers).toHaveLength(2);

    expect(layers[0].startDepth).toBe("0");
    expect(layers[0].endDepth).toBe("5.00");
    expect(layers[0].lithology).toBe("素填土");
    expect(layers[0].soilColor).toBe("褐色");
    expect(layers[0].density).toBe("松散");
    expect(layers[0].description).toBe("人工填土");

    expect(layers[1].startDepth).toBe("5");
    expect(layers[1].endDepth).toBe("15.00");
    expect(layers[1].lithology).toBe("粉质黏土");
    expect(layers[1].density).toBe("可塑");
    expect(layers[1].description).toBe("含铁锰结核");
  });

  it("应该正确映射并归一化标贯深度", () => {
    const archive = createLegacyArchive();
    const result = normalizeArchiveData(archive as ArchiveData);

    const spts = result.data.sptRecords["ZK01"];
    expect(spts).toHaveLength(2);

    expect(spts[0].depth).toBe("3");
    expect(spts[0].blowCount).toBe("12");
    expect(spts[0].isAbnormal).toBe(false);
    expect(spts[0].remark).toBe("正常");

    expect(spts[1].depth).toBe("10.00");
    expect(spts[1].blowCount).toBe("15");
    expect(spts[1].isAbnormal).toBe(true);
    expect(spts[1].remark).toBe("异常");
  });

  it("应该正确映射并归一化取样深度", () => {
    const archive = createLegacyArchive();
    const result = normalizeArchiveData(archive as ArchiveData);

    const samples = result.data.samplingRecords["ZK01"];
    expect(samples).toHaveLength(2);

    expect(samples[0].depth).toBe("2.00");
    expect(samples[0].sampleType).toBe("原状土");
    expect(samples[0].sampleNumber).toBe("S001");
    expect(samples[0].remark).toBe("一级样");

    expect(samples[1].depth).toBe("8");
    expect(samples[1].sampleType).toBe("扰动土");
    expect(samples[1].sampleNumber).toBe("S002");
    expect(samples[1].remark).toBe("二级样");
  });

  it("应该正确映射并归一化水位记录", () => {
    const archive = createLegacyArchive();
    const result = normalizeArchiveData(archive as ArchiveData);

    const waterLevels = result.data.waterLevelRecords["ZK01"];
    expect(waterLevels).toHaveLength(2);

    expect(waterLevels[0].firstSeenLevel).toBe("10");
    expect(waterLevels[0].stableLevel).toBe("12");
    expect(waterLevels[0].observationTime).toBe("2024-01-01");
    expect(waterLevels[0].weatherRemark).toBe("晴");

    expect(waterLevels[1].firstSeenLevel).toBe("15.00");
    expect(waterLevels[1].stableLevel).toBe("18.00");
    expect(waterLevels[1].observationTime).toBe("2024-01-02");
    expect(waterLevels[1].weatherRemark).toBe("多云");
  });

  it("应该返回正确的归一化统计数据", () => {
    const archive = createLegacyArchive();
    const result = normalizeArchiveData(archive as ArchiveData);

    const stats = result.normalizationStats;
    expect(stats.totalChanges).toBeGreaterThan(0);
    expect(stats.boreholeDepthCount).toBe(1);
    expect(stats.waterLevelCount).toBe(5);
    expect(stats.layerDepthCount).toBe(4);
    expect(stats.sptDepthCount).toBe(2);
    expect(stats.samplingDepthCount).toBe(2);
    expect(stats.unitConvertedCount).toBeGreaterThan(0);
  });

  it("应该生成版本迁移警告", () => {
    const archive = createLegacyArchive();
    const result = normalizeArchiveData(archive as ArchiveData);

    expect(result.warnings.some((w) => w.includes("兼容迁移"))).toBe(true);
  });

  it("应该升级归档版本到当前版本", () => {
    const archive = createLegacyArchive();
    const result = normalizeArchiveData(archive as ArchiveData);

    expect(result.data.meta.version).toBe(ARCHIVE_VERSION);
  });

  it("应该返回每个钻孔的归一化变更记录", () => {
    const archive = createLegacyArchive();
    const result = normalizeArchiveData(archive as ArchiveData);

    const changes = result.boreholeNormalizationChanges.get("ZK01");
    expect(changes).toBeDefined();
    expect(changes!.length).toBeGreaterThan(0);

    const holeDepthChange = changes!.find((c) => c.field === "孔深");
    expect(holeDepthChange).toBeDefined();
    expect(holeDepthChange!.original).toBe("3000cm");
    expect(holeDepthChange!.normalized).toBe("30.00");
  });

  it("空归档数据应该被正确初始化", () => {
    const archive: any = {
      meta: { version: "0.0.1" },
    };
    const result = normalizeArchiveData(archive as ArchiveData);

    expect(Array.isArray(result.data.records)).toBe(true);
    expect(typeof result.data.boreholeLayers).toBe("object");
    expect(typeof result.data.sptRecords).toBe("object");
    expect(typeof result.data.samplingRecords).toBe("object");
    expect(typeof result.data.waterLevelRecords).toBe("object");
  });

  it("应该正确处理全角单位字符", () => {
    const archive: any = {
      meta: { version: "0.0.1", projectId: "test", exportedAt: "", exportedBy: "", recordCount: 1, totalDepth: "" },
      records: [
        {
          boreholeId: "ZK02",
          holeDepth: "25Ｍ",
          groundwater: "10ｍ",
          lithologyType: "黏土",
          soilColor: "灰色",
          lithologyDesc: "",
        },
      ],
      boreholeLayers: {},
      sptRecords: {},
      samplingRecords: {},
      waterLevelRecords: {},
    };
    const result = normalizeArchiveData(archive as ArchiveData);

    expect(result.data.records[0]["孔深"]).toBe("25");
    expect(result.data.records[0]["地下水位"]).toBe("10");
  });
});

describe("previewImport - 导入预览", () => {
  const mockLoadProjectData = vi.mocked(dbModule.loadProjectData);

  beforeEach(() => {
    vi.clearAllMocks();
    mockLoadProjectData.mockResolvedValue(null);
  });

  const createTestArchive = (): ArchiveData => ({
    meta: {
      version: ARCHIVE_VERSION,
      projectId: "test-project",
      exportedAt: "2024-01-01T00:00:00.000Z",
      exportedBy: "test-user",
      recordCount: 2,
      totalDepth: "60.0m",
    },
    records: [
      {
        "钻孔编号": "ZK01",
        "孔深": "30.5",
        "岩性分类": "粉质黏土",
        "岩性描述": "黄褐色，可塑",
        "土色": "黄褐色",
        "地下水位": "15.0",
      },
      {
        "钻孔编号": "ZK02",
        "孔深": "25",
        "岩性分类": "粉土",
        "岩性描述": "褐黄色，稍密",
        "土色": "褐黄色",
        "地下水位": "12",
      },
    ],
    boreholeLayers: {
      ZK01: [
        {
          id: "l1",
          startDepth: "0",
          endDepth: "5",
          lithology: "素填土",
          soilColor: "褐色",
          density: "松散",
          description: "人工填土",
        },
        {
          id: "l2",
          startDepth: "5",
          endDepth: "15",
          lithology: "粉质黏土",
          soilColor: "黄褐色",
          density: "可塑",
          description: "含铁锰结核",
        },
      ],
      ZK02: [
        {
          id: "l3",
          startDepth: "0",
          endDepth: "8",
          lithology: "粉土",
          soilColor: "褐黄色",
          density: "稍密",
          description: "湿",
        },
      ],
    },
    sptRecords: {
      ZK01: [
        {
          id: "s1",
          depth: "3",
          blowCount: "12",
          isAbnormal: false,
          remark: "",
          layerId: "l1",
        },
        {
          id: "s2",
          depth: "10",
          blowCount: "18",
          isAbnormal: false,
          remark: "",
          layerId: "l2",
        },
      ],
    },
    samplingRecords: {
      ZK01: [
        {
          id: "sp1",
          depth: "2",
          sampleType: "原状土",
          sampleNumber: "S001",
          remark: "",
          layerId: "l1",
        },
      ],
    },
    waterLevelRecords: {
      ZK01: [
        {
          id: "w1",
          firstSeenLevel: "10",
          stableLevel: "12",
          observationTime: "2024-01-01",
          weatherRemark: "晴",
        },
      ],
    },
  });

  it("本地无数据时，所有钻孔状态应为new", async () => {
    mockLoadProjectData.mockResolvedValue(null);
    const archive = createTestArchive();
    const result = await previewImport(archive);

    expect(result.newCount).toBe(2);
    expect(result.totalBoreholeCount).toBe(2);
    expect(result.boreholes.filter((b) => b.status === "new")).toHaveLength(2);
  });

  it("应该返回正确的归档元数据", async () => {
    const archive = createTestArchive();
    const result = await previewImport(archive);

    expect(result.archiveMeta.version).toBe(ARCHIVE_VERSION);
    expect(result.archiveMeta.projectId).toBe("test-project");
    expect(result.archiveMeta.recordCount).toBe(2);
  });

  it("应该返回归一化统计数据", async () => {
    const archive = createTestArchive();
    const result = await previewImport(archive);

    expect(result.normalizationStats).toBeDefined();
    expect(typeof result.normalizationStats.totalChanges).toBe("number");
  });

  it("应该返回钻孔ID列表", async () => {
    const archive = createTestArchive();
    const result = await previewImport(archive);

    expect(result.archiveBoreholeIds).toContain("ZK01");
    expect(result.archiveBoreholeIds).toContain("ZK02");
  });

  it("深度带单位的归档在预览时应该被归一化", async () => {
    const archive: any = {
      meta: {
        version: "0.0.1-legacy",
        projectId: "test-depth",
        exportedAt: "",
        exportedBy: "",
        recordCount: 1,
        totalDepth: "",
      },
      records: [
        {
          boreholeId: "ZK-D",
          holeDepth: "3000cm",
          lithologyType: "黏土",
          soilColor: "灰色",
          lithologyDesc: "",
          groundwater: "15000mm",
        },
      ],
      boreholeLayers: {
        "ZK-D": [
          {
            fromDepth: "0m",
            toDepth: "1000cm",
            lithology: "填土",
            soilColor: "",
            state: "",
            desc: "",
          },
        ],
      },
      sptRecords: {
        "ZK-D": [
          {
            testDepth: "500cm",
            blowCounts: "10",
            abnormal: false,
            note: "",
          },
        ],
      },
      samplingRecords: {
        "ZK-D": [
          {
            sampleDepth: "2000mm",
            type: "原状",
            sampleId: "S1",
            note: "",
          },
        ],
      },
      waterLevelRecords: {
        "ZK-D": [
          {
            firstSeen: "1000cm",
            stable: "1500cm",
            observedAt: "",
            weather: "",
          },
        ],
      },
    };

    const result = await previewImport(archive as ArchiveData);
    const normalized = result.normalizedData;

    expect(normalized.records[0]["孔深"]).toBe("30.00");
    expect(normalized.records[0]["地下水位"]).toBe("15.00");
    expect(normalized.boreholeLayers["ZK-D"][0].endDepth).toBe("10.00");
    expect(normalized.sptRecords["ZK-D"][0].depth).toBe("5.00");
    expect(normalized.samplingRecords["ZK-D"][0].depth).toBe("2.00");
    expect(normalized.waterLevelRecords["ZK-D"][0].firstSeenLevel).toBe("10.00");
    expect(normalized.waterLevelRecords["ZK-D"][0].stableLevel).toBe("15.00");
  });

  it("缺少编号的钻孔应标记为unrecognized", async () => {
    const archive: any = {
      meta: {
        version: ARCHIVE_VERSION,
        projectId: "test",
        exportedAt: "",
        exportedBy: "",
        recordCount: 1,
        totalDepth: "",
      },
      records: [
        {
          "钻孔编号": "",
          "孔深": "20",
          "岩性分类": "黏土",
          "岩性描述": "",
          "土色": "",
          "地下水位": "",
        },
      ],
      boreholeLayers: {},
      sptRecords: {},
      samplingRecords: {},
      waterLevelRecords: {},
    };

    const result = await previewImport(archive as ArchiveData);
    expect(result.unrecognizedCount).toBe(1);
    expect(result.boreholes[0].status).toBe("unrecognized");
  });

  it("归档内重复钻孔应标记为unrecognized", async () => {
    const archive: any = {
      meta: {
        version: ARCHIVE_VERSION,
        projectId: "test",
        exportedAt: "",
        exportedBy: "",
        recordCount: 2,
        totalDepth: "",
      },
      records: [
        {
          "钻孔编号": "ZK-DUP",
          "孔深": "20",
          "岩性分类": "黏土",
          "岩性描述": "",
          "土色": "",
          "地下水位": "",
        },
        {
          "钻孔编号": "ZK-DUP",
          "孔深": "25",
          "岩性分类": "粉土",
          "岩性描述": "",
          "土色": "",
          "地下水位": "",
        },
      ],
      boreholeLayers: {},
      sptRecords: {},
      samplingRecords: {},
      waterLevelRecords: {},
    };

    const result = await previewImport(archive as ArchiveData);
    expect(result.duplicateInArchiveCount).toBe(2);
    expect(result.boreholes.filter((b) => b.isDuplicateInArchive)).toHaveLength(2);
  });

  it("子数据找不到对应钻孔应标记为unrecognized", async () => {
    const archive: any = {
      meta: {
        version: ARCHIVE_VERSION,
        projectId: "test",
        exportedAt: "",
        exportedBy: "",
        recordCount: 1,
        totalDepth: "",
      },
      records: [
        {
          "钻孔编号": "ZK01",
          "孔深": "20",
          "岩性分类": "黏土",
          "岩性描述": "",
          "土色": "",
          "地下水位": "",
        },
      ],
      boreholeLayers: {
        ZK99: [],
      },
      sptRecords: {},
      samplingRecords: {},
      waterLevelRecords: {},
    };

    const result = await previewImport(archive as ArchiveData);
    const orphanItem = result.boreholes.find((b) => b.boreholeId === "ZK99");
    expect(orphanItem).toBeDefined();
    expect(orphanItem!.status).toBe("unrecognized");
  });
});

describe("各深度类别的归一化统计计数", () => {
  it("孔深、水位、分层、标贯、取样深度变更应分别正确计数", () => {
    const archive: any = {
      meta: {
        version: "0.0.1-legacy",
        projectId: "test-count",
        exportedAt: "",
        exportedBy: "",
        recordCount: 1,
        totalDepth: "",
      },
      records: [
        {
          holeId: "ZK-CNT",
          holeDepth: "3000cm",
          groundwater: "1500cm",
          lithologyType: "粉质黏土",
          lithologyDesc: "",
          soilColor: "",
        },
      ],
      boreholeLayers: {
        "ZK-CNT": [
          {
            fromDepth: "0m",
            toDepth: "500cm",
            lithology: "",
            colour: "",
            state: "",
            desc: "",
          },
          {
            topDepth: "500cm",
            bottomDepth: "1500cm",
            lithology: "",
            soilColor: "",
            condition: "",
            remark: "",
          },
        ],
      },
      sptRecords: {
        "ZK-CNT": [
          { testDepth: "300cm", blowCounts: "10", abnormal: false, note: "" },
          { testDepth: "1000cm", blowCounts: "15", abnormal: false, note: "" },
          { testDepth: "1200cm", blowCounts: "20", abnormal: false, note: "" },
        ],
      },
      samplingRecords: {
        "ZK-CNT": [
          { sampleDepth: "200cm", type: "", sampleId: "S1", note: "" },
          { sampleDepth: "800cm", type: "", sampleId: "S2", note: "" },
        ],
      },
      waterLevelRecords: {
        "ZK-CNT": [
          { firstSeen: "1000cm", stable: "1200cm", observedAt: "", weather: "" },
        ],
      },
    };

    const result = normalizeArchiveData(archive as ArchiveData);
    const stats = result.normalizationStats;

    expect(stats.boreholeDepthCount).toBe(1);
    expect(stats.layerDepthCount).toBe(4);
    expect(stats.sptDepthCount).toBe(3);
    expect(stats.samplingDepthCount).toBe(2);
    expect(stats.waterLevelCount).toBe(3);
    expect(stats.totalChanges).toBe(1 + 4 + 3 + 2 + 3);
  });
});
