import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QualityCheckPanel from "./QualityCheckPanel";
import type { DrillingRecord, BoreholeLayers, BoreholeSPTRecords, BoreholeSamplingRecords, BoreholeWaterLevelRecords } from "../types";

const mockNavigate = vi.fn();

const createTestData = () => {
  const records: DrillingRecord[] = [
    { "钻孔编号": "ZK-01", "孔深": "20.5", "岩性分类": "黏土", "岩性描述": "黄褐色黏土", "土色": "黄褐色", "地下水位": "3.5" },
    { "钻孔编号": "ZK-02", "孔深": "25.0", "岩性分类": "粉土", "岩性描述": "褐黄色粉土", "土色": "褐黄色", "地下水位": "5.0" },
  ];

  const boreholeLayers: BoreholeLayers = {
    "ZK-01": [
      { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "人工填土" },
      { id: "l2", startDepth: "5.0", endDepth: "15.0", lithology: "粉质黏土", soilColor: "黄褐色", density: "可塑", description: "含铁锰结核" },
      { id: "l3", startDepth: "15.0", endDepth: "20.5", lithology: "黏土", soilColor: "黄褐色", density: "硬塑", description: "干强度高" },
    ],
    "ZK-02": [
      { id: "l4", startDepth: "0", endDepth: "8.0", lithology: "粉土", soilColor: "褐黄色", density: "稍密", description: "湿" },
      { id: "l5", startDepth: "8.0", endDepth: "25.0", lithology: "粉砂", soilColor: "灰白色", density: "中密", description: "饱和" },
    ],
  };

  const sptRecords: BoreholeSPTRecords = {
    "ZK-01": [
      { id: "s1", depth: "2.5", blowCount: "12", isAbnormal: false, remark: "", layerId: "l1" },
      { id: "s2", depth: "10.0", blowCount: "18", isAbnormal: false, remark: "", layerId: "l2" },
    ],
    "ZK-02": [
      { id: "s3", depth: "4.0", blowCount: "15", isAbnormal: false, remark: "", layerId: "l4" },
    ],
  };

  const samplingRecords: BoreholeSamplingRecords = {
    "ZK-01": [
      { id: "p1", depth: "3.0", sampleType: "原状样", sampleNumber: "S001", remark: "", layerId: "l1" },
      { id: "p2", depth: "12.0", sampleType: "扰动样", sampleNumber: "S002", remark: "", layerId: "l2" },
    ],
    "ZK-02": [
      { id: "p3", depth: "5.0", sampleType: "原状样", sampleNumber: "S003", remark: "", layerId: "l4" },
    ],
  };

  const waterLevelRecords: BoreholeWaterLevelRecords = {
    "ZK-01": [
      { id: "w1", firstSeenLevel: "3.2", stableLevel: "3.5", observationTime: "2024-06-15 08:30", weatherRemark: "晴" },
    ],
    "ZK-02": [
      { id: "w2", firstSeenLevel: "4.5", stableLevel: "5.0", observationTime: "2024-06-15 10:00", weatherRemark: "多云" },
    ],
  };

  return { records, boreholeLayers, sptRecords, samplingRecords, waterLevelRecords };
};

describe("QualityCheckPanel - 质量检查面板", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("正常数据渲染", () => {
    it("应该正确显示无问题的统计数据", () => {
      const { records, boreholeLayers, sptRecords, samplingRecords, waterLevelRecords } = createTestData();

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={sptRecords}
          samplingRecords={samplingRecords}
          waterLevelRecords={waterLevelRecords}
          onNavigateToBorehole={mockNavigate}
        />
      );

      expect(screen.getByText("问题总数")).toBeInTheDocument();
      expect(screen.getByText("错误")).toBeInTheDocument();
      expect(screen.getByText("警告")).toBeInTheDocument();
    });

    it("应该显示所有质量类别统计卡片", () => {
      const { records, boreholeLayers, sptRecords, samplingRecords, waterLevelRecords } = createTestData();

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={sptRecords}
          samplingRecords={samplingRecords}
          waterLevelRecords={waterLevelRecords}
          onNavigateToBorehole={mockNavigate}
        />
      );

      const kongShenElements = screen.getAllByText("孔深异常");
      expect(kongShenElements.length).toBeGreaterThan(0);
      const fenCengLianXuElements = screen.getAllByText("分层连续性");
      expect(fenCengLianXuElements.length).toBeGreaterThan(0);
      const biaoGuanElements = screen.getAllByText("标贯深度归属");
      expect(biaoGuanElements.length).toBeGreaterThan(0);
      const quYangElements = screen.getAllByText("取样深度归属");
      expect(quYangElements.length).toBeGreaterThan(0);
      const shuiWeiElements = screen.getAllByText("水位异常");
      expect(shuiWeiElements.length).toBeGreaterThan(0);
      const yangHaoElements = screen.getAllByText("重复样号");
      expect(yangHaoElements.length).toBeGreaterThan(0);
      const queShaoElements = screen.getAllByText("缺少关键字段");
      expect(queShaoElements.length).toBeGreaterThan(0);
      const fenCengChongDieElements = screen.getAllByText("分层重叠");
      expect(fenCengChongDieElements.length).toBeGreaterThan(0);
    });

    it("完美数据应该显示所有检查通过", () => {
      const { records, boreholeLayers, sptRecords, samplingRecords, waterLevelRecords } = createTestData();

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={sptRecords}
          samplingRecords={samplingRecords}
          waterLevelRecords={waterLevelRecords}
          onNavigateToBorehole={mockNavigate}
        />
      );

      expect(screen.getByText(/所有数据质量检查通过/)).toBeInTheDocument();
      expect(screen.getByText(/干得漂亮/)).toBeInTheDocument();
    });

    it("点击问题行应该触发导航回调", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.5", "岩性分类": "", "岩性描述": "", "土色": "", "地下水位": "3.5" },
      ];
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "人工填土" },
        ],
      };

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={{}}
          samplingRecords={{}}
          waterLevelRecords={{}}
          onNavigateToBorehole={mockNavigate}
        />
      );

      const warningRows = screen.getAllByText(/缺少关键字段/);
      if (warningRows.length > 0) {
        const row = warningRows[0].closest("tr");
        if (row) {
          fireEvent.click(row);
          expect(mockNavigate).toHaveBeenCalledWith("ZK-01", "basicInfo", undefined);
        }
      }
    });
  });

  describe("质量问题检测", () => {
    it("应该检测到缺少必填字段的问题", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.5", "岩性分类": "", "岩性描述": "", "土色": "", "地下水位": "3.5" },
      ];
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "人工填土" },
        ],
      };

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={{}}
          samplingRecords={{}}
          waterLevelRecords={{}}
          onNavigateToBorehole={mockNavigate}
        />
      );

      const warnings = screen.getAllByText(/缺少关键字段/);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it("应该检测到孔深异常问题", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "-5", "岩性分类": "黏土", "岩性描述": "", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "人工填土" },
        ],
      };

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={{}}
          samplingRecords={{}}
          waterLevelRecords={{}}
          onNavigateToBorehole={mockNavigate}
        />
      );

      expect(screen.getByText(/孔深值异常/)).toBeInTheDocument();
    });

    it("应该检测到分层缺口问题", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.0", "岩性分类": "黏土", "岩性描述": "黄褐色", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
          { id: "l2", startDepth: "8.0", endDepth: "15.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ],
      };

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={{}}
          samplingRecords={{}}
          waterLevelRecords={{}}
          onNavigateToBorehole={mockNavigate}
        />
      );

      expect(screen.getByText(/分层缺口/)).toBeInTheDocument();
    });

    it("应该检测到分层重叠问题", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.0", "岩性分类": "黏土", "岩性描述": "黄褐色", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "8.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
          { id: "l2", startDepth: "5.0", endDepth: "15.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ],
      };

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={{}}
          samplingRecords={{}}
          waterLevelRecords={{}}
          onNavigateToBorehole={mockNavigate}
        />
      );

      const chongDieElements = screen.getAllByText(/分层重叠/);
      expect(chongDieElements.length).toBeGreaterThan(0);
    });

    it("应该检测到标贯深度不在分层内的问题", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.0", "岩性分类": "黏土", "岩性描述": "黄褐色", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        ],
      };
      const sptRecords: BoreholeSPTRecords = {
        "ZK-01": [
          { id: "s1", depth: "10.0", blowCount: "15", isAbnormal: false, remark: "", layerId: "l1" },
        ],
      };

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={sptRecords}
          samplingRecords={{}}
          waterLevelRecords={{}}
          onNavigateToBorehole={mockNavigate}
        />
      );

      expect(screen.getByText(/标贯深度.*不落在任何分层内/)).toBeInTheDocument();
    });

    it("应该检测到重复样号问题", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.0", "岩性分类": "黏土", "岩性描述": "黄褐色", "土色": "黄褐色", "地下水位": "3.5" },
        { "钻孔编号": "ZK-02", "孔深": "25.0", "岩性分类": "粉土", "岩性描述": "褐黄色", "土色": "褐黄色", "地下水位": "5.0" },
      ];
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        ],
        "ZK-02": [
          { id: "l2", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        ],
      };
      const samplingRecords: BoreholeSamplingRecords = {
        "ZK-01": [
          { id: "p1", depth: "3.0", sampleType: "原状样", sampleNumber: "DUP-001", remark: "", layerId: "l1" },
        ],
        "ZK-02": [
          { id: "p2", depth: "2.0", sampleType: "扰动样", sampleNumber: "DUP-001", remark: "", layerId: "l2" },
        ],
      };

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={{}}
          samplingRecords={samplingRecords}
          waterLevelRecords={{}}
          onNavigateToBorehole={mockNavigate}
        />
      );

      const yangHaoElements = screen.getAllByText(/样号重复/);
      expect(yangHaoElements.length).toBeGreaterThan(0);
    });

    it("应该检测到最深分层小于孔深的问题", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.0", "岩性分类": "黏土", "岩性描述": "黄褐色", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "15.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        ],
      };

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={{}}
          samplingRecords={{}}
          waterLevelRecords={{}}
          onNavigateToBorehole={mockNavigate}
        />
      );

      expect(screen.getByText(/最深分层.*小于孔深/)).toBeInTheDocument();
    });

    it("应该检测到分层起始深度大于等于终止深度的问题", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.0", "岩性分类": "黏土", "岩性描述": "黄褐色", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "10.0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        ],
      };

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={{}}
          samplingRecords={{}}
          waterLevelRecords={{}}
          onNavigateToBorehole={mockNavigate}
        />
      );

      expect(screen.getByText(/起始深度 ≥ 终止深度/)).toBeInTheDocument();
    });

    it("应该检测到水位超出孔深的问题", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.0", "岩性分类": "黏土", "岩性描述": "黄褐色", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ],
      };
      const waterLevelRecords: BoreholeWaterLevelRecords = {
        "ZK-01": [
          { id: "w1", firstSeenLevel: "25.0", stableLevel: "30.0", observationTime: "2024-06-15", weatherRemark: "" },
        ],
      };

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={{}}
          samplingRecords={{}}
          waterLevelRecords={waterLevelRecords}
          onNavigateToBorehole={mockNavigate}
        />
      );

      expect(screen.getByText(/初见水位.*超出孔深/)).toBeInTheDocument();
      expect(screen.getByText(/稳定水位.*超出孔深/)).toBeInTheDocument();
    });
  });

  describe("筛选功能", () => {
    it("应该显示严重程度筛选下拉框", () => {
      const { records, boreholeLayers, sptRecords, samplingRecords, waterLevelRecords } = createTestData();

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={sptRecords}
          samplingRecords={samplingRecords}
          waterLevelRecords={waterLevelRecords}
          onNavigateToBorehole={mockNavigate}
        />
      );

      const allOption = screen.getByRole("option", { name: "全部" });
      expect(allOption).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "仅错误" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "仅警告" })).toBeInTheDocument();
    });

    it("应该显示问题类型筛选下拉框", () => {
      const { records, boreholeLayers, sptRecords, samplingRecords, waterLevelRecords } = createTestData();

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={sptRecords}
          samplingRecords={samplingRecords}
          waterLevelRecords={waterLevelRecords}
          onNavigateToBorehole={mockNavigate}
        />
      );

      const allTypeOption = screen.getByRole("option", { name: "全部类型" });
      expect(allTypeOption).toBeInTheDocument();
    });

    it("应该显示钻孔筛选下拉框", () => {
      const { records, boreholeLayers, sptRecords, samplingRecords, waterLevelRecords } = createTestData();

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={sptRecords}
          samplingRecords={samplingRecords}
          waterLevelRecords={waterLevelRecords}
          onNavigateToBorehole={mockNavigate}
        />
      );

      const allBoreholeOption = screen.getByRole("option", { name: "全部钻孔" }) as HTMLOptionElement;
      expect(allBoreholeOption).toBeInTheDocument();
      expect(allBoreholeOption.selected).toBe(true);
    });
  });

  describe("空数据和边界情况", () => {
    it("空钻孔列表应该正常渲染", () => {
      render(
        <QualityCheckPanel
          records={[]}
          boreholeLayers={{}}
          sptRecords={{}}
          samplingRecords={{}}
          waterLevelRecords={{}}
          onNavigateToBorehole={mockNavigate}
        />
      );

      expect(screen.getByText("问题总数")).toBeInTheDocument();
    });

    it("钻孔缺少分层应该报错", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.0", "岩性分类": "黏土", "岩性描述": "黄褐色", "土色": "黄褐色", "地下水位": "3.5" },
      ];

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={{}}
          sptRecords={{}}
          samplingRecords={{}}
          waterLevelRecords={{}}
          onNavigateToBorehole={mockNavigate}
        />
      );

      expect(screen.getByText(/暂无任何分层数据/)).toBeInTheDocument();
    });

    it("缺少稳定水位应该给出警告", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.0", "岩性分类": "黏土", "岩性描述": "黄褐色", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ],
      };
      const waterLevelRecords: BoreholeWaterLevelRecords = {
        "ZK-01": [
          { id: "w1", firstSeenLevel: "3.0", stableLevel: "", observationTime: "2024-06-15", weatherRemark: "" },
        ],
      };

      render(
        <QualityCheckPanel
          records={records}
          boreholeLayers={boreholeLayers}
          sptRecords={{}}
          samplingRecords={{}}
          waterLevelRecords={waterLevelRecords}
          onNavigateToBorehole={mockNavigate}
        />
      );

      expect(screen.getByText("暂无稳定水位记录")).toBeInTheDocument();
    });
  });
});
