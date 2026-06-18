import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BoreholeChart from "./BoreholeChart";
import type { StratumLayer, SPTRecord, WaterLevelRecord } from "../types";

const createTestLayers = (): StratumLayer[] => [
  { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "人工填土" },
  { id: "l2", startDepth: "5.0", endDepth: "15.0", lithology: "粉质黏土", soilColor: "黄褐色", density: "可塑", description: "含铁锰结核" },
  { id: "l3", startDepth: "15.0", endDepth: "20.5", lithology: "黏土", soilColor: "黄褐色", density: "硬塑", description: "干强度高" },
];

const createTestSPTRecords = (): SPTRecord[] => [
  { id: "s1", depth: "2.5", blowCount: "12", isAbnormal: false, remark: "", layerId: "l1" },
  { id: "s2", depth: "10.0", blowCount: "18", isAbnormal: false, remark: "", layerId: "l2" },
  { id: "s3", depth: "17.5", blowCount: "24", isAbnormal: false, remark: "", layerId: "l3" },
];

const createTestWaterLevelRecords = (): WaterLevelRecord[] => [
  { id: "w1", firstSeenLevel: "3.2", stableLevel: "3.5", observationTime: "2024-06-15 08:30", weatherRemark: "晴" },
];

describe("BoreholeChart - 单孔柱状图", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
  });

  describe("数据验证 - validateData", () => {
    it("完美数据应该验证通过", () => {
      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={createTestSPTRecords()}
          waterLevelRecords={createTestWaterLevelRecords()}
        />
      );

      expect(screen.getByText(/钻孔柱状图 · ZK-01/)).toBeInTheDocument();
      expect(screen.getByText(/孔深 20.5m · 共 3 层/)).toBeInTheDocument();
      expect(screen.queryByText(/数据检查结果/)).not.toBeInTheDocument();
    });

    it("应该检测到无效孔深（≤0）", () => {
      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={-5}
          layers={createTestLayers()}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/钻孔深度无效/)).toBeInTheDocument();
      expect(screen.getByText(/数据验证未通过/)).toBeInTheDocument();
    });

    it("应该检测到零孔深", () => {
      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={0}
          layers={createTestLayers()}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/钻孔深度无效/)).toBeInTheDocument();
    });

    it("应该检测到空分层数据", () => {
      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={[]}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/暂无地层分层数据/)).toBeInTheDocument();
      expect(screen.getByText(/数据验证未通过/)).toBeInTheDocument();
    });

    it("应该检测到第一层起始深度大于0", () => {
      const layers = [
        { id: "l1", startDepth: "2.0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        { id: "l2", startDepth: "5.0", endDepth: "15.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={15.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/第一层起始深度.*大于0/)).toBeInTheDocument();
    });

    it("应该检测到分层深度数据无效（非数字）", () => {
      const layers = [
        { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        { id: "l2", startDepth: "5.0", endDepth: "abc", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={15.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/深度数据无效/)).toBeInTheDocument();
    });

    it("应该检测到起始深度大于等于终止深度", () => {
      const layers = [
        { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        { id: "l2", startDepth: "10.0", endDepth: "5.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={15.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/终止深度.*必须大于起始深度/)).toBeInTheDocument();
    });

    it("应该检测到分层缺口", () => {
      const layers = [
        { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        { id: "l2", startDepth: "8.0", endDepth: "15.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={15.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/分层缺口/)).toBeInTheDocument();
    });

    it("应该检测到分层重叠", () => {
      const layers = [
        { id: "l1", startDepth: "0", endDepth: "8.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        { id: "l2", startDepth: "5.0", endDepth: "15.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={15.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/分层重叠/)).toBeInTheDocument();
    });

    it("应该检测到分层终止深度超过孔深", () => {
      const layers = [
        { id: "l1", startDepth: "0", endDepth: "10.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        { id: "l2", startDepth: "10.0", endDepth: "25.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/超过钻孔深度/)).toBeInTheDocument();
    });

    it("应该检测到岩性未填写", () => {
      const layers = [
        { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "", soilColor: "褐色", density: "松散", description: "" },
        { id: "l2", startDepth: "5.0", endDepth: "15.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={15.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/岩性未填写/)).toBeInTheDocument();
    });

    it("应该检测到最深分层小于孔深（警告）", () => {
      const layers = [
        { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        { id: "l2", startDepth: "5.0", endDepth: "15.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/最深分层终止于.*小于钻孔深度/)).toBeInTheDocument();
    });

    it("应该检测到标贯深度无效", () => {
      const sptRecords: SPTRecord[] = [
        { id: "s1", depth: "-2", blowCount: "12", isAbnormal: false, remark: "", layerId: "l1" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={sptRecords}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/标贯记录深度无效/)).toBeInTheDocument();
    });

    it("应该检测到标贯深度超过孔深", () => {
      const sptRecords: SPTRecord[] = [
        { id: "s1", depth: "25.0", blowCount: "12", isAbnormal: false, remark: "", layerId: "l1" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={sptRecords}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/标贯深度.*超过钻孔深度/)).toBeInTheDocument();
    });

    it("应该检测到标贯击数无效", () => {
      const sptRecords: SPTRecord[] = [
        { id: "s1", depth: "2.5", blowCount: "-5", isAbnormal: false, remark: "", layerId: "l1" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={sptRecords}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/标贯击数无效/)).toBeInTheDocument();
    });

    it("应该检测到标贯深度不在任何分层范围内", () => {
      const sptRecords: SPTRecord[] = [
        { id: "s1", depth: "30.0", blowCount: "12", isAbnormal: false, remark: "", layerId: "l1" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={sptRecords}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/不在任何分层范围内/)).toBeInTheDocument();
    });

    it("应该检测到无效初见水位", () => {
      const waterLevelRecords: WaterLevelRecord[] = [
        { id: "w1", firstSeenLevel: "-2", stableLevel: "", observationTime: "", weatherRemark: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={[]}
          waterLevelRecords={waterLevelRecords}
        />
      );

      expect(screen.getByText(/初见水位无效/)).toBeInTheDocument();
    });

    it("应该检测到初见水位超过孔深", () => {
      const waterLevelRecords: WaterLevelRecord[] = [
        { id: "w1", firstSeenLevel: "25.0", stableLevel: "", observationTime: "", weatherRemark: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={[]}
          waterLevelRecords={waterLevelRecords}
        />
      );

      expect(screen.getByText(/初见水位.*超过钻孔深度/)).toBeInTheDocument();
    });

    it("应该检测到无效稳定水位", () => {
      const waterLevelRecords: WaterLevelRecord[] = [
        { id: "w1", firstSeenLevel: "", stableLevel: "-3", observationTime: "", weatherRemark: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={[]}
          waterLevelRecords={waterLevelRecords}
        />
      );

      expect(screen.getByText(/稳定水位无效/)).toBeInTheDocument();
    });

    it("应该检测到稳定水位超过孔深", () => {
      const waterLevelRecords: WaterLevelRecord[] = [
        { id: "w1", firstSeenLevel: "", stableLevel: "30.0", observationTime: "", weatherRemark: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={[]}
          waterLevelRecords={waterLevelRecords}
        />
      );

      expect(screen.getByText(/稳定水位.*超过钻孔深度/)).toBeInTheDocument();
    });
  });

  describe("图表渲染", () => {
    it("应该正确渲染深度刻度", () => {
      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText("深度(m)")).toBeInTheDocument();
      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument();
    });

    it("应该正确渲染层底深度列", () => {
      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText("层底深度")).toBeInTheDocument();
      expect(screen.getByText("5.0m")).toBeInTheDocument();
      expect(screen.getByText("15.0m")).toBeInTheDocument();
      expect(screen.getByText("20.5m")).toBeInTheDocument();
    });

    it("应该正确渲染岩性柱状列", () => {
      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText("岩性柱状")).toBeInTheDocument();
      expect(screen.getByText("素填土")).toBeInTheDocument();
      expect(screen.getByText("粉质黏土")).toBeInTheDocument();
      expect(screen.getByText("黏土")).toBeInTheDocument();
    });

    it("应该正确渲染岩性描述列", () => {
      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText("岩性描述")).toBeInTheDocument();
      expect(screen.getByText("人工填土")).toBeInTheDocument();
      expect(screen.getByText("含铁锰结核")).toBeInTheDocument();
    });

    it("应该渲染标贯试验列和标记", () => {
      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={createTestSPTRecords()}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText("标贯试验")).toBeInTheDocument();
      expect(screen.getByText("12击")).toBeInTheDocument();
      expect(screen.getByText("18击")).toBeInTheDocument();
    });

    it("应该渲染稳定水位线", () => {
      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={[]}
          waterLevelRecords={createTestWaterLevelRecords()}
        />
      );

      const waterLevelElements = screen.getAllByText(/稳定水位/);
      expect(waterLevelElements.length).toBeGreaterThan(0);
    });
  });

  describe("交互功能", () => {
    it("点击打印按钮应该调用 window.print", () => {
      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={createTestSPTRecords()}
          waterLevelRecords={[]}
        />
      );

      const printBtn = screen.getAllByText(/打印/)[0];
      fireEvent.click(printBtn);

      expect(window.print).toHaveBeenCalledTimes(1);
    });
  });

  describe("数据排序和计算", () => {
    it("应该按深度自动排序分层（乱序输入）", () => {
      const unsortedLayers: StratumLayer[] = [
        { id: "l3", startDepth: "15.0", endDepth: "20.5", lithology: "黏土", soilColor: "黄褐色", density: "硬塑", description: "" },
        { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        { id: "l2", startDepth: "5.0", endDepth: "15.0", lithology: "粉质黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={unsortedLayers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      const depthValues = screen.getAllByText(/m$/).filter(el => el.className.includes("depth-value") || el.textContent?.match(/^\d+\.\d+m$/));
      expect(depthValues[0]).toHaveTextContent("5.0m");
    });

    it("应该按深度自动排序标贯记录（乱序输入）", () => {
      const unsortedSPT: SPTRecord[] = [
        { id: "s3", depth: "17.5", blowCount: "24", isAbnormal: false, remark: "", layerId: "l3" },
        { id: "s1", depth: "2.5", blowCount: "12", isAbnormal: false, remark: "", layerId: "l1" },
        { id: "s2", depth: "10.0", blowCount: "18", isAbnormal: false, remark: "", layerId: "l2" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={unsortedSPT}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText("标贯试验")).toBeInTheDocument();
      expect(screen.getByText("12击")).toBeInTheDocument();
      expect(screen.getByText("18击")).toBeInTheDocument();
      expect(screen.getByText("24击")).toBeInTheDocument();
    });

    it("应该使用最新的水位记录（按时间排序）", () => {
      const waterLevelRecords: WaterLevelRecord[] = [
        { id: "w1", firstSeenLevel: "3.0", stableLevel: "3.2", observationTime: "2024-06-14 10:00", weatherRemark: "" },
        { id: "w2", firstSeenLevel: "3.5", stableLevel: "3.8", observationTime: "2024-06-15 08:30", weatherRemark: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={[]}
          waterLevelRecords={waterLevelRecords}
        />
      );

      expect(screen.getByText(/稳定水位.*3.8/)).toBeInTheDocument();
    });
  });

  describe("边界和特殊情况", () => {
    it("薄层应该使用引线标注", () => {
      const layersWithThinLayer: StratumLayer[] = [
        { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        { id: "l2", startDepth: "5.0", endDepth: "5.2", lithology: "粉土", soilColor: "褐黄色", density: "稍密", description: "薄层" },
        { id: "l3", startDepth: "5.2", endDepth: "15.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={15.0}
          layers={layersWithThinLayer}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      const fanotuElements = screen.getAllByText("粉土");
      expect(fanotuElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/薄层说明/)).toBeInTheDocument();
    });

    it("浅孔（<20m）应该使用 1m 间隔刻度", () => {
      const layers: StratumLayer[] = [
        { id: "l1", startDepth: "0", endDepth: "10.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={10.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
    });

    it("中深孔（20-50m）应该使用 2m 间隔刻度", () => {
      const layers: StratumLayer[] = [
        { id: "l1", startDepth: "0", endDepth: "30.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={30.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("20")).toBeInTheDocument();
      expect(screen.getByText("30")).toBeInTheDocument();
    });

    it("深孔（50-100m）应该使用 5m 间隔刻度", () => {
      const layers: StratumLayer[] = [
        { id: "l1", startDepth: "0", endDepth: "60.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={60.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("超深孔（>100m）应该使用 10m 间隔刻度", () => {
      const layers: StratumLayer[] = [
        { id: "l1", startDepth: "0", endDepth: "120.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={120.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
      expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("空标贯和空水位应该正常渲染", () => {
      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.5}
          layers={createTestLayers()}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/钻孔柱状图 · ZK-01/)).toBeInTheDocument();
      expect(screen.queryByText(/数据检查结果/)).not.toBeInTheDocument();
    });

    it("未知岩性应该使用默认颜色", () => {
      const layers: StratumLayer[] = [
        { id: "l1", startDepth: "0", endDepth: "10.0", lithology: "未知岩性", soilColor: "", density: "", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={10.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText("未知岩性")).toBeInTheDocument();
    });
  });

  describe("严重错误阻塞", () => {
    it("严重错误（severity >= 8）应该显示阻塞提示", () => {
      const layers: StratumLayer[] = [
        { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        { id: "l2", startDepth: "5.0", endDepth: "25.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={20.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.getByText(/存在严重数据问题/)).toBeInTheDocument();
    });

    it("只有警告（severity < 8）应该允许绘制图表", () => {
      const layers: StratumLayer[] = [
        { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "", soilColor: "褐色", density: "松散", description: "" },
        { id: "l2", startDepth: "5.0", endDepth: "15.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
      ];

      render(
        <BoreholeChart
          boreholeId="ZK-01"
          holeDepth={15.0}
          layers={layers}
          sptRecords={[]}
          waterLevelRecords={[]}
        />
      );

      expect(screen.queryByText(/数据验证未通过/)).not.toBeInTheDocument();
      expect(screen.getByText("岩性柱状")).toBeInTheDocument();
    });
  });
});
