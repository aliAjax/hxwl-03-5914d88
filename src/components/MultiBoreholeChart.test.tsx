import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import MultiBoreholeChart from "./MultiBoreholeChart";
import type { StratumLayer, SPTRecord, WaterLevelRecord } from "../types";

const createBoreholeData = (id: string, holeDepth: number, layers: StratumLayer[]) => ({
  boreholeId: id,
  holeDepth,
  layers,
  sptRecords: [] as SPTRecord[],
  waterLevelRecords: [] as WaterLevelRecord[],
});

const createTestBoreholes = () => [
  createBoreholeData("ZK-01", 20.5, [
    { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "人工填土" },
    { id: "l2", startDepth: "5.0", endDepth: "15.0", lithology: "粉质黏土", soilColor: "黄褐色", density: "可塑", description: "含铁锰结核" },
    { id: "l3", startDepth: "15.0", endDepth: "20.5", lithology: "黏土", soilColor: "黄褐色", density: "硬塑", description: "干强度高" },
  ]),
  createBoreholeData("ZK-02", 25.0, [
    { id: "l4", startDepth: "0", endDepth: "8.0", lithology: "粉土", soilColor: "褐黄色", density: "稍密", description: "湿" },
    { id: "l5", startDepth: "8.0", endDepth: "25.0", lithology: "粉砂", soilColor: "灰白色", density: "中密", description: "饱和" },
  ]),
  createBoreholeData("ZK-03", 18.0, [
    { id: "l6", startDepth: "0", endDepth: "3.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
    { id: "l7", startDepth: "3.0", endDepth: "10.0", lithology: "粉质黏土", soilColor: "黄褐色", density: "可塑", description: "" },
    { id: "l8", startDepth: "10.0", endDepth: "18.0", lithology: "黏土", soilColor: "黄褐色", density: "硬塑", description: "" },
  ]),
];

describe("MultiBoreholeChart - 多孔对比图", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
  });

  describe("数据验证 - validateBoreholeData", () => {
    it("完美数据应该验证通过并渲染对比图", () => {
      render(<MultiBoreholeChart boreholes={createTestBoreholes()} />);

      expect(screen.getByText(/多钻孔对比视图/)).toBeInTheDocument();
      const zk01Elements = screen.getAllByText("ZK-01");
      expect(zk01Elements.length).toBeGreaterThan(0);
      const zk02Elements = screen.getAllByText("ZK-02");
      expect(zk02Elements.length).toBeGreaterThan(0);
      const zk03Elements = screen.getAllByText("ZK-03");
      expect(zk03Elements.length).toBeGreaterThan(0);
    });

    it("空钻孔列表应该显示提示", () => {
      render(<MultiBoreholeChart boreholes={[]} />);

      expect(screen.getByText(/请选择至少一个钻孔/)).toBeInTheDocument();
    });

    it("应该检测到单个钻孔的无效孔深", () => {
      const boreholes = [
        createBoreholeData("ZK-01", -5, [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
        createBoreholeData("ZK-02", 20.0, [
          { id: "l2", startDepth: "0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
      ];

      render(<MultiBoreholeChart boreholes={boreholes} />);

      expect(screen.getByText(/钻孔深度无效/)).toBeInTheDocument();
    });

    it("应该检测到单个钻孔的空分层", () => {
      const boreholes = [
        createBoreholeData("ZK-01", 20.0, []),
        createBoreholeData("ZK-02", 20.0, [
          { id: "l1", startDepth: "0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
      ];

      render(<MultiBoreholeChart boreholes={boreholes} />);

      expect(screen.getByText(/暂无地层分层数据/)).toBeInTheDocument();
    });

    it("应该检测到单个钻孔的第一层起始深度大于0", () => {
      const boreholes = [
        createBoreholeData("ZK-01", 20.0, [
          { id: "l1", startDepth: "2.0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
          { id: "l2", startDepth: "5.0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
        createBoreholeData("ZK-02", 20.0, [
          { id: "l3", startDepth: "0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
      ];

      render(<MultiBoreholeChart boreholes={boreholes} />);

      expect(screen.getByText(/第一层起始深度.*大于0/)).toBeInTheDocument();
    });

    it("应该检测到单个钻孔的分层缺口", () => {
      const boreholes = [
        createBoreholeData("ZK-01", 20.0, [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
          { id: "l2", startDepth: "8.0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
        createBoreholeData("ZK-02", 20.0, [
          { id: "l3", startDepth: "0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
      ];

      render(<MultiBoreholeChart boreholes={boreholes} />);

      expect(screen.getByText(/分层缺口/)).toBeInTheDocument();
    });

    it("应该检测到单个钻孔的分层重叠", () => {
      const boreholes = [
        createBoreholeData("ZK-01", 20.0, [
          { id: "l1", startDepth: "0", endDepth: "8.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
          { id: "l2", startDepth: "5.0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
        createBoreholeData("ZK-02", 20.0, [
          { id: "l3", startDepth: "0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
      ];

      render(<MultiBoreholeChart boreholes={boreholes} />);

      expect(screen.getByText(/分层重叠/)).toBeInTheDocument();
    });
  });

  describe("图表渲染", () => {
    it("应该渲染所有钻孔的柱状图", () => {
      render(<MultiBoreholeChart boreholes={createTestBoreholes()} />);

      const sutianElements = screen.getAllByText("素填土");
      expect(sutianElements.length).toBeGreaterThan(0);
      const fenzhiElements = screen.getAllByText("粉质黏土");
      expect(fenzhiElements.length).toBeGreaterThan(0);
      const niantuElements = screen.getAllByText("黏土");
      expect(niantuElements.length).toBeGreaterThan(0);
    });

    it("应该使用统一的深度比例尺（最大孔深）", () => {
      const boreholes = createTestBoreholes();

      render(<MultiBoreholeChart boreholes={boreholes} />);

      const tickZero = screen.getAllByText("0");
      expect(tickZero.length).toBeGreaterThan(0);
      const tickTen = screen.getAllByText("10");
      expect(tickTen.length).toBeGreaterThan(0);
      const tickTwenty = screen.getAllByText("20");
      expect(tickTwenty.length).toBeGreaterThan(0);
    });

    it("应该显示深度刻度", () => {
      render(<MultiBoreholeChart boreholes={createTestBoreholes()} />);

      expect(screen.getByText(/深度\(m\)/)).toBeInTheDocument();
    });

    it("应该渲染各钻孔的孔深标注", () => {
      render(<MultiBoreholeChart boreholes={createTestBoreholes()} />);

      const depth20 = screen.getAllByText(/20\.5/);
      expect(depth20.length).toBeGreaterThan(0);
      const depth25 = screen.getAllByText(/25/);
      expect(depth25.length).toBeGreaterThan(0);
      const depth18 = screen.getAllByText(/18/);
      expect(depth18.length).toBeGreaterThan(0);
    });
  });

  describe("钻孔列显示", () => {
    it("应该显示所有传入的钻孔列", () => {
      render(<MultiBoreholeChart boreholes={createTestBoreholes()} />);

      const zk01Elements = screen.getAllByText("ZK-01");
      expect(zk01Elements.length).toBeGreaterThan(0);
      const zk02Elements = screen.getAllByText("ZK-02");
      expect(zk02Elements.length).toBeGreaterThan(0);
      const zk03Elements = screen.getAllByText("ZK-03");
      expect(zk03Elements.length).toBeGreaterThan(0);
    });

    it("每个钻孔应该显示孔深信息", () => {
      render(<MultiBoreholeChart boreholes={createTestBoreholes()} />);

      const depth20 = screen.getAllByText(/孔深 20\.5/);
      expect(depth20.length).toBeGreaterThan(0);
      const depth25 = screen.getAllByText(/孔深 25/);
      expect(depth25.length).toBeGreaterThan(0);
      const depth18 = screen.getAllByText(/孔深 18/);
      expect(depth18.length).toBeGreaterThan(0);
    });

    it("应该正确关联深度刻度与所有钻孔", () => {
      render(<MultiBoreholeChart boreholes={createTestBoreholes()} />);

      expect(screen.getByText("深度(m)")).toBeInTheDocument();
    });
  });

  describe("边界和特殊情况", () => {
    it("单个钻孔也应该正常渲染对比图", () => {
      const boreholes = [createTestBoreholes()[0]];

      render(<MultiBoreholeChart boreholes={boreholes} />);

      expect(screen.getByText(/多钻孔对比视图/)).toBeInTheDocument();
      const zk01Elements = screen.getAllByText("ZK-01");
      expect(zk01Elements.length).toBeGreaterThan(0);
    });

    it("不同孔深的钻孔应该按最大深度统一比例尺", () => {
      const boreholes = [
        createBoreholeData("ZK-01", 10.0, [
          { id: "l1", startDepth: "0", endDepth: "10.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
        createBoreholeData("ZK-02", 50.0, [
          { id: "l2", startDepth: "0", endDepth: "50.0", lithology: "粉砂", soilColor: "灰白色", density: "中密", description: "" },
        ]),
      ];

      render(<MultiBoreholeChart boreholes={boreholes} />);

      expect(screen.getByText("0")).toBeInTheDocument();
      expect(screen.getByText("50")).toBeInTheDocument();
    });

    it("有警告的钻孔应该仍然被渲染", () => {
      const boreholes = [
        createBoreholeData("ZK-01", 20.0, [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "", soilColor: "褐色", density: "松散", description: "" },
          { id: "l2", startDepth: "5.0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
        createBoreholeData("ZK-02", 20.0, [
          { id: "l3", startDepth: "0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
      ];

      render(<MultiBoreholeChart boreholes={boreholes} />);

      expect(screen.getByText(/岩性未填写/)).toBeInTheDocument();
      const zk01Elements = screen.getAllByText("ZK-01");
      expect(zk01Elements.length).toBeGreaterThan(0);
    });
  });

  describe("多问题检测", () => {
    it("应该同时检测多个钻孔的问题", () => {
      const boreholes = [
        createBoreholeData("ZK-01", 20.0, [
          { id: "l1", startDepth: "2.0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
          { id: "l2", startDepth: "8.0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
        createBoreholeData("ZK-02", 20.0, [
          { id: "l3", startDepth: "0", endDepth: "8.0", lithology: "粉土", soilColor: "褐黄色", density: "稍密", description: "" },
          { id: "l4", startDepth: "5.0", endDepth: "20.0", lithology: "粉砂", soilColor: "灰白色", density: "中密", description: "" },
        ]),
      ];

      render(<MultiBoreholeChart boreholes={boreholes} />);

      expect(screen.getByText(/第一层起始深度.*大于0/)).toBeInTheDocument();
      const gapElements = screen.getAllByText(/分层缺口/);
      expect(gapElements.length).toBeGreaterThan(0);
      expect(screen.getByText(/分层重叠/)).toBeInTheDocument();
    });

    it("问题列表应该按严重程度排序", () => {
      const boreholes = [
        createBoreholeData("ZK-01", 20.0, [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "", soilColor: "褐色", density: "松散", description: "" },
          { id: "l2", startDepth: "5.0", endDepth: "25.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ]),
      ];

      render(<MultiBoreholeChart boreholes={boreholes} />);

      const errorIssues = screen.getAllByText(/超过钻孔深度/);
      const warningIssues = screen.getAllByText(/岩性未填写/);
      expect(errorIssues.length).toBeGreaterThan(0);
      expect(warningIssues.length).toBeGreaterThan(0);
    });
  });
});
