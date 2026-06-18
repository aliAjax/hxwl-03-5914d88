import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLayerDepthValidation } from "./useLayerDepthValidation";
import type { BoreholeLayers, StratumLayer, DrillingRecord } from "../types";

vi.useFakeTimers();

const createTestLayers = (): StratumLayer[] => [
  { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "人工填土" },
  { id: "l2", startDepth: "5.0", endDepth: "15.0", lithology: "粉质黏土", soilColor: "黄褐色", density: "可塑", description: "含铁锰结核" },
  { id: "l3", startDepth: "15.0", endDepth: "20.5", lithology: "黏土", soilColor: "黄褐色", density: "硬塑", description: "干强度高" },
];

const createInitialBoreholeLayers = (): BoreholeLayers => ({
  "ZK-01": createTestLayers(),
});

const createHookWrapper = (
  initialBoreholeLayers: BoreholeLayers = createInitialBoreholeLayers(),
  selectedBorehole: string | null = "ZK-01",
  holeDepth: number = 20.5,
  isCheckMode: boolean = false,
  currentRole: string = "编录员"
) => {
  let boreholeLayers = initialBoreholeLayers;
  const setBoreholeLayers = vi.fn((updater) => {
    if (typeof updater === "function") {
      boreholeLayers = updater(boreholeLayers);
    } else {
      boreholeLayers = updater;
    }
    return boreholeLayers;
  });
  const getBoreholeLayers = () => boreholeLayers;

  return {
    render: () =>
      renderHook(() =>
        useLayerDepthValidation(
          boreholeLayers,
          setBoreholeLayers,
          selectedBorehole,
          holeDepth,
          isCheckMode,
          currentRole
        )
      ),
    setBoreholeLayers,
    getBoreholeLayers,
  };
};

describe("useLayerDepthValidation - 分层深度验证 Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe("基础状态管理", () => {
    it("应该正确初始化空表单状态", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      expect(result.current.layerForm.startDepth).toBe("");
      expect(result.current.layerForm.endDepth).toBe("");
      expect(result.current.layerForm.lithology).toBe("");
      expect(result.current.layerForm.soilColor).toBe("");
      expect(result.current.layerForm.density).toBe("");
      expect(result.current.layerForm.description).toBe("");
      expect(result.current.editingLayerId).toBeNull();
      expect(Object.keys(result.current.layerErrors).length).toBe(0);
    });

    it("currentLayers 应该返回选中钻孔的分层列表", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      expect(result.current.currentLayers.length).toBe(3);
      expect(result.current.currentLayers[0].id).toBe("l1");
      expect(result.current.currentLayers[1].id).toBe("l2");
      expect(result.current.currentLayers[2].id).toBe("l3");
    });

    it("未选中钻孔时 currentLayers 应该返回空数组", () => {
      const { render } = createHookWrapper(createInitialBoreholeLayers(), null);
      const { result } = render();

      expect(result.current.currentLayers.length).toBe(0);
    });

    it("sortedLayers 应该按起始深度排序", () => {
      const unsortedLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l3", startDepth: "15.0", endDepth: "20.5", lithology: "黏土", soilColor: "黄褐色", density: "硬塑", description: "" },
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
          { id: "l2", startDepth: "5.0", endDepth: "15.0", lithology: "粉质黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ],
      };
      const { render } = createHookWrapper(unsortedLayers);
      const { result } = render();

      expect(result.current.sortedLayers[0].id).toBe("l1");
      expect(result.current.sortedLayers[1].id).toBe("l2");
      expect(result.current.sortedLayers[2].id).toBe("l3");
    });
  });

  describe("查找和查询功能", () => {
    it("findLayerByDepth 应该返回包含指定深度的分层", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      const layer = result.current.findLayerByDepth(10.0);
      expect(layer).not.toBeNull();
      expect(layer?.id).toBe("l2");
      expect(layer?.lithology).toBe("粉质黏土");
    });

    it("findLayerByDepth 对于边界深度应该正确匹配", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      const layerAtBoundary = result.current.findLayerByDepth(5.0);
      expect(layerAtBoundary).not.toBeNull();
      expect(layerAtBoundary?.id).toBe("l1");
    });

    it("findLayerByDepth 对于不在任何分层内的深度应该返回 null", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      const layer = result.current.findLayerByDepth(30.0);
      expect(layer).toBeNull();
    });

    it("getLayerLithology 应该根据 ID 返回岩性", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      expect(result.current.getLayerLithology("l1")).toBe("素填土");
      expect(result.current.getLayerLithology("l2")).toBe("粉质黏土");
      expect(result.current.getLayerLithology("l3")).toBe("黏土");
      expect(result.current.getLayerLithology("nonexistent")).toBe("-");
    });
  });

  describe("表单验证 - validateLayerForm", () => {
    it("空表单应该验证失败并返回所有必填字段错误", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      const { valid, errors } = result.current.validateLayerForm();
      expect(valid).toBe(false);
      expect(errors.startDepth).toBe("起始深度不能为空");
      expect(errors.endDepth).toBe("终止深度不能为空");
      expect(errors.lithology).toBe("岩性不能为空");
      expect(errors.soilColor).toBe("土色不能为空");
      expect(errors.density).toBe("密实度/状态不能为空");
    });

    it("负深度应该验证失败", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.setLayerForm({
          startDepth: "-5",
          endDepth: "10",
          lithology: "黏土",
          soilColor: "黄褐色",
          density: "可塑",
          description: "",
        });
      });

      const { valid, errors } = result.current.validateLayerForm();
      expect(valid).toBe(false);
      expect(errors.startDepth).toBe("起始深度必须为非负数");
    });

    it("无效数字深度应该验证失败", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.setLayerForm({
          startDepth: "abc",
          endDepth: "xyz",
          lithology: "黏土",
          soilColor: "黄褐色",
          density: "可塑",
          description: "",
        });
      });

      const { valid, errors } = result.current.validateLayerForm();
      expect(valid).toBe(false);
      expect(errors.startDepth).toBe("起始深度必须为非负数");
      expect(errors.endDepth).toBe("终止深度必须为非负数");
    });

    it("起始深度大于等于终止深度应该验证失败", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.setLayerForm({
          startDepth: "10",
          endDepth: "5",
          lithology: "黏土",
          soilColor: "黄褐色",
          density: "可塑",
          description: "",
        });
      });

      const { valid, errors } = result.current.validateLayerForm();
      expect(valid).toBe(false);
      expect(errors.endDepth).toBe("终止深度必须大于起始深度");
    });

    it("终止深度超过孔深应该验证失败", () => {
      const { render } = createHookWrapper(createInitialBoreholeLayers(), "ZK-01", 20.5);
      const { result } = render();

      act(() => {
        result.current.setLayerForm({
          startDepth: "18",
          endDepth: "25",
          lithology: "黏土",
          soilColor: "黄褐色",
          density: "可塑",
          description: "",
        });
      });

      const { valid, errors } = result.current.validateLayerForm();
      expect(valid).toBe(false);
      expect(errors.endDepth).toBe("终止深度不能超过钻孔深度(20.5m)");
    });

    it("完整有效表单应该验证通过", () => {
      const { render } = createHookWrapper(
        createInitialBoreholeLayers(),
        "ZK-01",
        30.0,
        false,
        "编录员"
      );
      const { result } = render();

      act(() => {
        result.current.setLayerForm({
          startDepth: "20.5",
          endDepth: "25.0",
          lithology: "黏土",
          soilColor: "黄褐色",
          density: "硬塑",
          description: "新增层",
        });
      });

      const { valid, errors } = result.current.validateLayerForm();
      expect(valid).toBe(true);
      expect(Object.keys(errors).length).toBe(0);
    });
  });

  describe("重叠和缺口检测 - checkOverlapAndGaps", () => {
    it("不重叠的新分层应该返回无重叠", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.setLayerForm({
          startDepth: "20.5",
          endDepth: "25.0",
          lithology: "黏土",
          soilColor: "黄褐色",
          density: "硬塑",
          description: "",
        });
      });

      const { hasOverlap, gaps } = result.current.checkOverlapAndGaps();
      expect(hasOverlap).toBe(false);
      expect(gaps.length).toBe(0);
    });

    it("重叠的分层应该检测到重叠", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.setLayerForm({
          startDepth: "3.0",
          endDepth: "8.0",
          lithology: "黏土",
          soilColor: "黄褐色",
          density: "可塑",
          description: "",
        });
      });

      const { hasOverlap } = result.current.checkOverlapAndGaps();
      expect(hasOverlap).toBe(true);
    });

    it("应该检测到分层缺口", () => {
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
          { id: "l2", startDepth: "8.0", endDepth: "15.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ],
      };
      const { render } = createHookWrapper(boreholeLayers);
      const { result } = render();

      act(() => {
        result.current.setLayerForm({
          startDepth: "15.0",
          endDepth: "20.0",
          lithology: "黏土",
          soilColor: "黄褐色",
          density: "硬塑",
          description: "",
        });
      });

      const { gaps } = result.current.checkOverlapAndGaps();
      expect(gaps.length).toBeGreaterThan(0);
      expect(gaps.some((g) => g.includes("5.00"))).toBe(true);
    });

    it("最深分层小于孔深时应该检测到底部缺口", () => {
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "10.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ],
      };
      const { render } = createHookWrapper(boreholeLayers, "ZK-01", 20.0);
      const { result } = render();

      act(() => {
        result.current.setLayerForm({
          startDepth: "10.0",
          endDepth: "15.0",
          lithology: "黏土",
          soilColor: "黄褐色",
          density: "硬塑",
          description: "",
        });
      });

      const { gaps } = result.current.checkOverlapAndGaps();
      expect(gaps.some((g) => g.includes("15.00") && g.includes("20.00"))).toBe(true);
    });

    it("编辑模式下应该排除正在编辑的分层进行重叠检测", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.handleEditLayer(result.current.currentLayers[0]);
      });

      const { hasOverlap } = result.current.checkOverlapAndGaps();
      expect(hasOverlap).toBe(false);
    });
  });

  describe("深度验证 - checkDepthInLayers", () => {
    it("有效深度应该验证通过并返回对应分层", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      const { valid, message, layer } = result.current.checkDepthInLayers(10.0);
      expect(valid).toBe(true);
      expect(message).toBe("");
      expect(layer).not.toBeNull();
      expect(layer?.id).toBe("l2");
    });

    it("无分层数据时应该返回错误", () => {
      const { render } = createHookWrapper({}, "ZK-01");
      const { result } = render();

      const { valid, message } = result.current.checkDepthInLayers(10.0);
      expect(valid).toBe(false);
      expect(message).toContain("暂无地层分层数据");
    });

    it("深度小于最浅分层时应该返回错误", () => {
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "2.0", endDepth: "10.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ],
      };
      const { render } = createHookWrapper(boreholeLayers);
      const { result } = render();

      const { valid, message } = result.current.checkDepthInLayers(1.0);
      expect(valid).toBe(false);
      expect(message).toContain("位于地层之上");
    });

    it("深度大于最深分层时应该返回错误", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      const { valid, message } = result.current.checkDepthInLayers(30.0);
      expect(valid).toBe(false);
      expect(message).toContain("超出最深分层");
    });

    it("深度落在分层缺口时应该返回错误", () => {
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
          { id: "l2", startDepth: "8.0", endDepth: "15.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ],
      };
      const { render } = createHookWrapper(boreholeLayers);
      const { result } = render();

      const { valid, message } = result.current.checkDepthInLayers(6.5);
      expect(valid).toBe(false);
      expect(message).toContain("落在分层缺口处");
    });
  });

  describe("缺口检测 - hasLayerGap", () => {
    it("无缺口的分层应该返回 false", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.5", "岩性分类": "黏土", "岩性描述": "", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const { render } = createHookWrapper();
      const { result } = render();

      const hasGap = result.current.hasLayerGap("ZK-01", records);
      expect(hasGap).toBe(false);
    });

    it("有中间缺口的分层应该返回 true", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.0", "岩性分类": "黏土", "岩性描述": "", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
          { id: "l2", startDepth: "8.0", endDepth: "20.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ],
      };
      const { render } = createHookWrapper(boreholeLayers);
      const { result } = render();

      const hasGap = result.current.hasLayerGap("ZK-01", records);
      expect(hasGap).toBe(true);
    });

    it("最深分层小于孔深应该返回 true", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.0", "岩性分类": "黏土", "岩性描述": "", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "15.0", lithology: "黏土", soilColor: "黄褐色", density: "可塑", description: "" },
        ],
      };
      const { render } = createHookWrapper(boreholeLayers);
      const { result } = render();

      const hasGap = result.current.hasLayerGap("ZK-01", records);
      expect(hasGap).toBe(true);
    });

    it("空分层应该返回 false", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "20.0", "岩性分类": "黏土", "岩性描述": "", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const { render } = createHookWrapper({}, "ZK-01");
      const { result } = render();

      const hasGap = result.current.hasLayerGap("ZK-01", records);
      expect(hasGap).toBe(false);
    });

    it("零孔深应该返回 false", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-01", "孔深": "0", "岩性分类": "黏土", "岩性描述": "", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const { render } = createHookWrapper();
      const { result } = render();

      const hasGap = result.current.hasLayerGap("ZK-01", records);
      expect(hasGap).toBe(false);
    });

    it("不存在的钻孔应该返回 false", () => {
      const records: DrillingRecord[] = [
        { "钻孔编号": "ZK-999", "孔深": "20.0", "岩性分类": "黏土", "岩性描述": "", "土色": "黄褐色", "地下水位": "3.5" },
      ];
      const { render } = createHookWrapper();
      const { result } = render();

      const hasGap = result.current.hasLayerGap("ZK-999", records);
      expect(hasGap).toBe(false);
    });
  });

  describe("相邻层影响检测 - checkAdjacentLayerImpact", () => {
    it("新建从地表开始的分层应该提示接续正确", () => {
      const boreholeLayers: BoreholeLayers = { "ZK-01": [] };
      const { render } = createHookWrapper(boreholeLayers);
      const { result } = render();

      const newForm = {
        startDepth: "0",
        endDepth: "5.0",
        lithology: "素填土",
        soilColor: "褐色",
        density: "松散",
        description: "",
      };

      act(() => {
        result.current.setLayerForm(newForm);
      });

      act(() => {
        result.current.checkAdjacentLayerImpact(newForm);
      });

      expect(result.current.adjacentLayerHint).toContain("起始于地表 0m");
      expect(result.current.adjacentLayerHint).toContain("接续正确");
    });

    it("新建完美接续上一层的分层应该提示完美接续", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      const newForm = {
        startDepth: "20.5",
        endDepth: "25.0",
        lithology: "黏土",
        soilColor: "黄褐色",
        density: "硬塑",
        description: "",
      };

      act(() => {
        result.current.setLayerForm(newForm);
      });

      act(() => {
        result.current.checkAdjacentLayerImpact(newForm);
      });

      expect(result.current.adjacentLayerHint).toContain("完美接续");
    });

    it("编辑模式下修改分层与上一层重叠应该提示重叠", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.handleEditLayer(result.current.currentLayers[1]);
      });

      const updatedForm = {
        ...result.current.layerForm,
        startDepth: "3.0",
        endDepth: "15.0",
      };

      act(() => {
        result.current.setLayerForm(updatedForm);
      });

      act(() => {
        result.current.checkAdjacentLayerImpact(updatedForm);
      });

      expect(result.current.adjacentLayerHint).toContain("重叠");
    });

    it("新建与上一层有间隙的分层应该提示间隙", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      const newForm = {
        startDepth: "22.0",
        endDepth: "25.0",
        lithology: "黏土",
        soilColor: "黄褐色",
        density: "硬塑",
        description: "",
      };

      act(() => {
        result.current.setLayerForm(newForm);
      });

      act(() => {
        result.current.checkAdjacentLayerImpact(newForm);
      });

      expect(result.current.adjacentLayerHint).toContain("间隙");
    });

    it("编辑模式下应该同时检查上下层", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.handleEditLayer(result.current.currentLayers[1]);
      });

      const updatedForm = {
        ...result.current.layerForm,
        startDepth: "5.0",
        endDepth: "15.0",
      };

      act(() => {
        result.current.setLayerForm(updatedForm);
      });

      act(() => {
        result.current.checkAdjacentLayerImpact(updatedForm);
      });

      expect(result.current.adjacentLayerHint).toContain("与上一层");
      expect(result.current.adjacentLayerHint).toContain("与下一层");
    });
  });

  describe("表单交互 - handleLayerInputChange", () => {
    it("应该更新表单字段值", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.handleLayerInputChange("lithology", "黏土");
      });

      expect(result.current.layerForm.lithology).toBe("黏土");
    });

    it("修改起始/终止深度时应该触发相邻层影响检查", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.setLayerForm({
          startDepth: "20.5",
          endDepth: "25.0",
          lithology: "黏土",
          soilColor: "黄褐色",
          density: "硬塑",
          description: "",
        });
      });

      act(() => {
        result.current.handleLayerInputChange("startDepth", "22.0");
      });

      expect(result.current.adjacentLayerHint).not.toBe("");
    });

    it("修改非深度字段时应该清除该字段的错误", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.setLayerErrors({ lithology: "岩性不能为空" });
      });

      act(() => {
        result.current.handleLayerInputChange("lithology", "黏土");
      });

      expect(result.current.layerErrors.lithology).toBeUndefined();
    });

    it("修改起始深度时应该清除自动填充标记", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.setAutoFilledStartDepth(true);
        result.current.handleLayerInputChange("startDepth", "0");
      });

      expect(result.current.autoFilledStartDepth).toBe(false);
    });
  });

  describe("新增分层 - handleAddLayer", () => {
    it("表单无效时不应该添加分层", () => {
      const { render, setBoreholeLayers } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.handleAddLayer();
      });

      expect(setBoreholeLayers).not.toHaveBeenCalled();
      expect(Object.keys(result.current.layerErrors).length).toBeGreaterThan(0);
    });

    it("重叠时不应该添加分层并显示错误信息", () => {
      const { render, setBoreholeLayers } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.setLayerForm({
          startDepth: "3.0",
          endDepth: "8.0",
          lithology: "黏土",
          soilColor: "黄褐色",
          density: "可塑",
          description: "",
        });
      });

      act(() => {
        result.current.handleAddLayer();
      });

      expect(setBoreholeLayers).not.toHaveBeenCalled();
      expect(result.current.layerValidationMessage).toContain("深度重叠");
    });

    it("有效数据应该成功添加分层", () => {
      const { render, setBoreholeLayers } = createHookWrapper(
        createInitialBoreholeLayers(),
        "ZK-01",
        30.0,
        false,
        "编录员"
      );
      const { result } = render();

      act(() => {
        result.current.setLayerForm({
          startDepth: "20.5",
          endDepth: "25.0",
          lithology: "黏土",
          soilColor: "黄褐色",
          density: "硬塑",
          description: "新增层",
        });
      });

      act(() => {
        result.current.handleAddLayer();
      });

      expect(setBoreholeLayers).toHaveBeenCalled();
    });

    it("未选中钻孔时不应该添加分层", () => {
      const { render, setBoreholeLayers } = createHookWrapper(createInitialBoreholeLayers(), null);
      const { result } = render();

      act(() => {
        result.current.setLayerForm({
          startDepth: "0",
          endDepth: "5.0",
          lithology: "素填土",
          soilColor: "褐色",
          density: "松散",
          description: "",
        });
      });

      act(() => {
        result.current.handleAddLayer();
      });

      expect(setBoreholeLayers).not.toHaveBeenCalled();
    });
  });

  describe("编辑分层 - handleEditLayer", () => {
    it("应该正确填充表单并进入编辑模式", () => {
      const { render } = createHookWrapper();
      const { result } = render();
      const layerToEdit = result.current.currentLayers[0];

      act(() => {
        result.current.handleEditLayer(layerToEdit);
      });

      expect(result.current.editingLayerId).toBe(layerToEdit.id);
      expect(result.current.layerForm.startDepth).toBe(layerToEdit.startDepth);
      expect(result.current.layerForm.endDepth).toBe(layerToEdit.endDepth);
      expect(result.current.layerForm.lithology).toBe(layerToEdit.lithology);
      expect(result.current.layerForm.soilColor).toBe(layerToEdit.soilColor);
      expect(result.current.layerForm.density).toBe(layerToEdit.density);
      expect(result.current.layerForm.description).toBe(layerToEdit.description);
    });

    it("应该清除所有错误状态", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.setLayerErrors({ lithology: "测试错误" });
        result.current.setLayerValidationMessage("测试验证消息");
        result.current.setGapMessage("测试缺口提示");
        result.current.setAutoFilledStartDepth(true);
      });

      act(() => {
        result.current.handleEditLayer(result.current.currentLayers[0]);
      });

      expect(Object.keys(result.current.layerErrors).length).toBe(0);
      expect(result.current.layerValidationMessage).toBe("");
      expect(result.current.adjacentLayerHint).toBe("");
      expect(result.current.autoFilledStartDepth).toBe(false);
    });
  });

  describe("更新分层 - handleUpdateLayer", () => {
    it("表单无效时不应该更新分层", () => {
      const { render, setBoreholeLayers } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.handleEditLayer(result.current.currentLayers[0]);
      });

      act(() => {
        result.current.setLayerForm({ ...result.current.layerForm, lithology: "" });
      });

      act(() => {
        result.current.handleUpdateLayer();
      });

      expect(setBoreholeLayers).not.toHaveBeenCalled();
      expect(result.current.layerErrors.lithology).toBeDefined();
    });

    it("重叠时不应该更新分层并显示错误", () => {
      const { render, setBoreholeLayers } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.handleEditLayer(result.current.currentLayers[0]);
      });

      act(() => {
        result.current.setLayerForm({ ...result.current.layerForm, endDepth: "10.0" });
      });

      act(() => {
        result.current.handleUpdateLayer();
      });

      expect(setBoreholeLayers).not.toHaveBeenCalled();
      expect(result.current.layerValidationMessage).toContain("深度重叠");
    });

    it("有效数据应该成功更新分层", () => {
      const { render, setBoreholeLayers } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.handleEditLayer(result.current.currentLayers[0]);
      });

      act(() => {
        result.current.setLayerForm({
          ...result.current.layerForm,
          description: "更新后的描述",
        });
      });

      act(() => {
        result.current.handleUpdateLayer();
      });

      expect(setBoreholeLayers).toHaveBeenCalled();
      expect(result.current.editingLayerId).toBeNull();
    });

    it("校核模式下应该只更新校核相关字段", () => {
      const { render, setBoreholeLayers } = createHookWrapper(
        createInitialBoreholeLayers(),
        "ZK-01",
        20.5,
        true,
        "校核工程师"
      );
      const { result } = render();
      const layerToEdit = result.current.currentLayers[0];

      act(() => {
        result.current.handleEditLayer(layerToEdit);
      });

      act(() => {
        result.current.setLayerForm({
          ...result.current.layerForm,
          description: "校核通过，数据准确",
          startDepth: "1.0",
          lithology: "应该不会被修改",
        });
      });

      act(() => {
        result.current.handleUpdateLayer();
      });

      expect(setBoreholeLayers).toHaveBeenCalled();
      const updateFn = setBoreholeLayers.mock.calls[0][0];
      const updated = updateFn(createInitialBoreholeLayers());
      const updatedLayer = updated["ZK-01"].find((l: StratumLayer) => l.id === layerToEdit.id);

      expect(updatedLayer?.isChecked).toBe(true);
      expect(updatedLayer?.checkedBy).toBe("校核工程师");
      expect(updatedLayer?.checkRemark).toBe("校核通过，数据准确");
      expect(updatedLayer?.lithology).toBe(layerToEdit.lithology);
      expect(updatedLayer?.startDepth).toBe(layerToEdit.startDepth);
    });
  });

  describe("删除分层 - handleDeleteLayer", () => {
    it("应该删除指定的分层", () => {
      const { render, setBoreholeLayers } = createHookWrapper();
      const { result } = render();
      const layerToDelete = result.current.currentLayers[0];

      act(() => {
        result.current.handleDeleteLayer(layerToDelete.id);
      });

      expect(setBoreholeLayers).toHaveBeenCalled();
      const updateFn = setBoreholeLayers.mock.calls[0][0];
      const updated = updateFn(createInitialBoreholeLayers());
      expect(updated["ZK-01"].some((l: StratumLayer) => l.id === layerToDelete.id)).toBe(false);
    });

    it("删除正在编辑的分层时应该退出编辑模式", () => {
      const { render, setBoreholeLayers } = createHookWrapper();
      const { result } = render();
      const layerToDelete = result.current.currentLayers[0];

      act(() => {
        result.current.handleEditLayer(layerToDelete);
      });

      act(() => {
        result.current.handleDeleteLayer(layerToDelete.id);
      });

      expect(result.current.editingLayerId).toBeNull();
      expect(setBoreholeLayers).toHaveBeenCalled();
    });

    it("未选中钻孔时不应该删除", () => {
      const { render, setBoreholeLayers } = createHookWrapper(createInitialBoreholeLayers(), null);
      const { result } = render();

      act(() => {
        result.current.handleDeleteLayer("l1");
      });

      expect(setBoreholeLayers).not.toHaveBeenCalled();
    });
  });

  describe("取消编辑 - handleCancelEdit", () => {
    it("应该清除编辑状态并重置表单", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.handleEditLayer(result.current.currentLayers[0]);
      });

      act(() => {
        result.current.handleCancelEdit();
      });

      expect(result.current.editingLayerId).toBeNull();
      expect(Object.keys(result.current.layerErrors).length).toBe(0);
      expect(result.current.layerValidationMessage).toBe("");
      expect(result.current.adjacentLayerHint).toBe("");
    });
  });

  describe("更新校核状态 - handleUpdateLayerCheck", () => {
    it("应该正确更新分层的校核状态", () => {
      const { render, setBoreholeLayers } = createHookWrapper(
        createInitialBoreholeLayers(),
        "ZK-01",
        20.5,
        false,
        "校核工程师"
      );
      const { result } = render();
      const layerToCheck = result.current.currentLayers[0];

      act(() => {
        result.current.handleUpdateLayerCheck("ZK-01", layerToCheck.id, "数据准确，校核通过");
      });

      expect(setBoreholeLayers).toHaveBeenCalled();
      const updateFn = setBoreholeLayers.mock.calls[0][0];
      const updated = updateFn(createInitialBoreholeLayers());
      const checkedLayer = updated["ZK-01"].find((l: StratumLayer) => l.id === layerToCheck.id);

      expect(checkedLayer?.isChecked).toBe(true);
      expect(checkedLayer?.checkedBy).toBe("校核工程师");
      expect(checkedLayer?.checkRemark).toBe("数据准确，校核通过");
      expect(checkedLayer?.checkedAt).toBeDefined();
    });

    it("应该将校核备注填充到描述字段（如果描述为空）", () => {
      const layers: BoreholeLayers = {
        "ZK-01": [
          { id: "l1", startDepth: "0", endDepth: "5.0", lithology: "素填土", soilColor: "褐色", density: "松散", description: "" },
        ],
      };
      const { render, setBoreholeLayers } = createHookWrapper(layers);
      const { result } = render();

      act(() => {
        result.current.handleUpdateLayerCheck("ZK-01", "l1", "人工填土，松散");
      });

      const updateFn = setBoreholeLayers.mock.calls[0][0];
      const updated = updateFn(layers);
      const checkedLayer = updated["ZK-01"][0];

      expect(checkedLayer.description).toBe("人工填土，松散");
    });
  });

  describe("准备新表单 - prepareNewLayerForm", () => {
    it("有现有分层时应该自动填充起始深度为上一层的终止深度", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.prepareNewLayerForm();
      });

      expect(result.current.layerForm.startDepth).toBe("20.5");
      expect(result.current.autoFilledStartDepth).toBe(true);
    });

    it("无现有分层时应该自动填充起始深度为 0", () => {
      const { render } = createHookWrapper({}, "ZK-01");
      const { result } = render();

      act(() => {
        result.current.prepareNewLayerForm();
      });

      expect(result.current.layerForm.startDepth).toBe("0");
      expect(result.current.autoFilledStartDepth).toBe(true);
    });

    it("应该清除所有错误和消息", () => {
      const { render } = createHookWrapper();
      const { result } = render();

      act(() => {
        result.current.setLayerErrors({ lithology: "测试错误" });
        result.current.setLayerValidationMessage("测试消息");
        result.current.setGapMessage("测试提示");
      });

      act(() => {
        result.current.prepareNewLayerForm();
      });

      expect(Object.keys(result.current.layerErrors).length).toBe(0);
      expect(result.current.layerValidationMessage).toBe("");
      expect(result.current.adjacentLayerHint).toBe("");
    });

    it("可以指定钻孔 ID 准备该钻孔的新分层表单", () => {
      const boreholeLayers: BoreholeLayers = {
        "ZK-01": createTestLayers(),
        "ZK-02": [
          { id: "l4", startDepth: "0", endDepth: "10.0", lithology: "粉土", soilColor: "褐黄色", density: "稍密", description: "" },
        ],
      };
      const { render } = createHookWrapper(boreholeLayers, "ZK-01");
      const { result } = render();

      act(() => {
        result.current.prepareNewLayerForm("ZK-02");
      });

      expect(result.current.layerForm.startDepth).toBe("10.0");
    });
  });
});
