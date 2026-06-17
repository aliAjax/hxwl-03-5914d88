import { useMemo } from "react";
import type { StratumLayer, SPTRecord, WaterLevelRecord } from "../types";

interface BoreholeChartProps {
  boreholeId: string;
  holeDepth: number;
  layers: StratumLayer[];
  sptRecords: SPTRecord[];
  waterLevelRecords: WaterLevelRecord[];
}

interface ValidationIssue {
  type: "error" | "warning";
  message: string;
  severity: number;
}

const lithologyColors: Record<string, string> = {
  "黏土": "#d4a574",
  "粉质黏土": "#e8c9a0",
  "粉土": "#f5deb3",
  "粉砂": "#f0e68c",
  "细砂": "#daa520",
  "中砂": "#cd853f",
  "粗砂": "#8b4513",
  "卵石": "#696969",
  "圆砾": "#808080",
  "强风化岩": "#a0522d",
  "中风化岩": "#8b0000",
  "微风化岩": "#4a0000",
};

const getLithologyColor = (lithology: string): string => {
  return lithologyColors[lithology] || "#cccccc";
};

const getLithologyPattern = (lithology: string): string => {
  const patterns: Record<string, string> = {
    "黏土": "dotted",
    "粉质黏土": "dotted",
    "粉土": "dotted",
    "粉砂": "dotted",
    "细砂": "dashed",
    "中砂": "dashed",
    "粗砂": "dashed",
    "卵石": "dotted",
    "圆砾": "dotted",
    "强风化岩": "double",
    "中风化岩": "double",
    "微风化岩": "double",
  };
  return patterns[lithology] || "solid";
};

const validateData = (
  holeDepth: number,
  layers: StratumLayer[],
  sptRecords: SPTRecord[],
  waterLevelRecords: WaterLevelRecord[]
): { valid: boolean; issues: ValidationIssue[] } => {
  const issues: ValidationIssue[] = [];

  if (holeDepth <= 0) {
    issues.push({
      type: "error",
      message: `钻孔深度无效：${holeDepth}m，必须大于0`,
      severity: 10,
    });
    return { valid: false, issues };
  }

  if (layers.length === 0) {
    issues.push({
      type: "error",
      message: "暂无地层分层数据，无法绘制柱状图",
      severity: 10,
    });
    return { valid: false, issues };
  }

  const sortedLayers = [...layers].sort(
    (a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth)
  );

  const firstLayerStart = parseFloat(sortedLayers[0].startDepth);
  if (firstLayerStart > 0.001) {
    issues.push({
      type: "error",
      message: `第一层起始深度 ${firstLayerStart}m 大于0，地表至 ${firstLayerStart}m 无数据`,
      severity: 9,
    });
  }

  let prevEnd = 0;
  for (let i = 0; i < sortedLayers.length; i++) {
    const layer = sortedLayers[i];
    const start = parseFloat(layer.startDepth);
    const end = parseFloat(layer.endDepth);

    if (isNaN(start) || isNaN(end)) {
      issues.push({
        type: "error",
        message: `第 ${i + 1} 层深度数据无效：起始深度="${layer.startDepth}"，终止深度="${layer.endDepth}"`,
        severity: 10,
      });
      continue;
    }

    if (start >= end) {
      issues.push({
        type: "error",
        message: `第 ${i + 1} 层（${layer.lithology}）终止深度 ${end}m 必须大于起始深度 ${start}m`,
        severity: 10,
      });
    }

    if (Math.abs(start - prevEnd) > 0.001) {
      if (start > prevEnd) {
        issues.push({
          type: "error",
          message: `分层缺口：${prevEnd.toFixed(2)}m ~ ${start.toFixed(2)}m 无地层数据`,
          severity: 9,
        });
      } else {
        issues.push({
          type: "error",
          message: `分层重叠：${start.toFixed(2)}m ~ ${prevEnd.toFixed(2)}m 存在重复`,
          severity: 9,
        });
      }
    }

    if (end > holeDepth + 0.001) {
      issues.push({
        type: "error",
        message: `第 ${i + 1} 层（${layer.lithology}）终止深度 ${end}m 超过钻孔深度 ${holeDepth}m`,
        severity: 8,
      });
    }

    if (!layer.lithology.trim()) {
      issues.push({
        type: "warning",
        message: `第 ${i + 1} 层（${start}~${end}m）岩性未填写`,
        severity: 5,
      });
    }

    prevEnd = Math.max(prevEnd, end);
  }

  const lastLayerEnd = parseFloat(sortedLayers[sortedLayers.length - 1].endDepth);
  if (lastLayerEnd < holeDepth - 0.001) {
    issues.push({
      type: "warning",
      message: `最深分层终止于 ${lastLayerEnd}m，小于钻孔深度 ${holeDepth}m，${lastLayerEnd}m 以下无数据`,
      severity: 6,
    });
  }

  for (const spt of sptRecords) {
    const depth = parseFloat(spt.depth);
    const blowCount = parseFloat(spt.blowCount);

    if (isNaN(depth) || depth < 0) {
      issues.push({
        type: "error",
        message: `标贯记录深度无效："${spt.depth}"m`,
        severity: 7,
      });
      continue;
    }

    if (depth > holeDepth) {
      issues.push({
        type: "warning",
        message: `标贯深度 ${depth}m 超过钻孔深度 ${holeDepth}m`,
        severity: 4,
      });
    }

    if (isNaN(blowCount) || blowCount < 0) {
      issues.push({
        type: "warning",
        message: `深度 ${depth}m 处标贯击数无效："${spt.blowCount}"`,
        severity: 4,
      });
    }

    let inLayer = false;
    for (const layer of sortedLayers) {
      const ls = parseFloat(layer.startDepth);
      const le = parseFloat(layer.endDepth);
      if (depth >= ls && depth <= le) {
        inLayer = true;
        break;
      }
    }
    if (!inLayer) {
      issues.push({
        type: "warning",
        message: `标贯深度 ${depth}m 不在任何分层范围内`,
        severity: 5,
      });
    }
  }

  for (const wl of waterLevelRecords) {
    const firstSeen = parseFloat(wl.firstSeenLevel);
    const stable = parseFloat(wl.stableLevel);

    if (wl.firstSeenLevel.trim() && (isNaN(firstSeen) || firstSeen < 0)) {
      issues.push({
        type: "warning",
        message: `初见水位无效："${wl.firstSeenLevel}"m`,
        severity: 3,
      });
    }

    if (wl.stableLevel.trim() && (isNaN(stable) || stable < 0)) {
      issues.push({
        type: "warning",
        message: `稳定水位无效："${wl.stableLevel}"m`,
        severity: 3,
      });
    }

    if (firstSeen > holeDepth) {
      issues.push({
        type: "warning",
        message: `初见水位 ${firstSeen}m 超过钻孔深度 ${holeDepth}m`,
        severity: 2,
      });
    }
  }

  const hasErrors = issues.some((i) => i.type === "error");
  return { valid: !hasErrors, issues };
};

const MIN_LAYER_HEIGHT = 28;

export default function BoreholeChart({
  boreholeId,
  holeDepth,
  layers,
  sptRecords,
  waterLevelRecords,
}: BoreholeChartProps) {
  const { valid, issues } = useMemo(
    () => validateData(holeDepth, layers, sptRecords, waterLevelRecords),
    [holeDepth, layers, sptRecords, waterLevelRecords]
  );

  const sortedLayers = useMemo(
    () => [...layers].sort((a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth)),
    [layers]
  );

  const sortedSPT = useMemo(
    () => [...sptRecords].sort((a, b) => parseFloat(a.depth) - parseFloat(b.depth)),
    [sptRecords]
  );

  const latestWaterLevel = useMemo(() => {
    if (waterLevelRecords.length === 0) return null;
    const sorted = [...waterLevelRecords].sort((a, b) => {
      const timeA = a.observationTime ? new Date(a.observationTime).getTime() : 0;
      const timeB = b.observationTime ? new Date(b.observationTime).getTime() : 0;
      return timeB - timeA;
    });
    return sorted[0];
  }, [waterLevelRecords]);

  const stableWaterLevel = useMemo(() => {
    for (const record of waterLevelRecords) {
      if (record.stableLevel && record.stableLevel.trim()) {
        const level = parseFloat(record.stableLevel);
        if (!isNaN(level) && level >= 0) return level;
      }
    }
    return null;
  }, [waterLevelRecords]);

  const chartData = useMemo(() => {
    if (!valid || sortedLayers.length === 0) return null;

    const totalDepth = holeDepth;
    const chartHeight = Math.max(600, totalDepth * 30);

    const layerHeights: { layer: StratumLayer; top: number; height: number; expanded: boolean }[] = [];
    let currentTop = 0;

    const minHeightPerMeter = MIN_LAYER_HEIGHT / 0.5;

    for (const layer of sortedLayers) {
      const start = parseFloat(layer.startDepth);
      const end = parseFloat(layer.endDepth);
      const thickness = end - start;

      let height = (thickness / totalDepth) * chartHeight;
      let expanded = false;

      if (height < MIN_LAYER_HEIGHT) {
        height = MIN_LAYER_HEIGHT;
        expanded = true;
      }

      const minHeightByThickness = thickness * minHeightPerMeter;
      if (height < minHeightByThickness) {
        height = minHeightByThickness;
        expanded = true;
      }

      layerHeights.push({
        layer,
        top: currentTop,
        height,
        expanded,
      });
      currentTop += height;
    }

    const actualChartHeight = currentTop;

    const depthToY = (depth: number): number => {
      for (const { layer, top, height } of layerHeights) {
        const ls = parseFloat(layer.startDepth);
        const le = parseFloat(layer.endDepth);
        if (depth >= ls && depth <= le) {
          const layerThickness = le - ls;
          const positionInLayer = depth - ls;
          return top + (positionInLayer / layerThickness) * height;
        }
      }

      if (depth < parseFloat(sortedLayers[0].startDepth)) {
        return (depth / totalDepth) * actualChartHeight;
      }

      const lastLayer = layerHeights[layerHeights.length - 1];
      const lastEnd = parseFloat(lastLayer.layer.endDepth);
      if (depth > lastEnd) {
        const extraHeight = ((depth - lastEnd) / totalDepth) * actualChartHeight;
        return lastLayer.top + lastLayer.height + extraHeight;
      }

      return (depth / totalDepth) * actualChartHeight;
    };

    const generateTickMarks = (): { depth: number; y: number; major: boolean }[] => {
      const ticks: { depth: number; y: number; major: boolean }[] = [];
      let interval = 1;
      if (totalDepth > 50) interval = 5;
      else if (totalDepth > 20) interval = 2;

      for (let d = 0; d <= totalDepth; d += interval) {
        ticks.push({ depth: d, y: depthToY(d), major: d % (interval * 5) === 0 });
      }
      if (totalDepth % interval !== 0) {
        ticks.push({ depth: totalDepth, y: depthToY(totalDepth), major: true });
      }
      return ticks;
    };

    return {
      layerHeights,
      chartHeight: actualChartHeight,
      depthToY,
      tickMarks: generateTickMarks(),
      totalDepth,
    };
  }, [valid, sortedLayers, holeDepth]);

  const handlePrint = () => {
    window.print();
  };

  const errorIssues = issues.filter((i) => i.type === "error");
  const warningIssues = issues.filter((i) => i.type === "warning");
  const hasBlockingErrors = errorIssues.some((i) => i.severity >= 8);

  return (
    <div className="borehole-chart-container">
      <div className="chart-header">
        <div className="chart-title">
          <h3>钻孔柱状图 · {boreholeId}</h3>
          <span className="chart-subtitle">孔深 {holeDepth}m · 共 {sortedLayers.length} 层</span>
        </div>
        <div className="chart-actions">
          <button className="print-btn" onClick={handlePrint}>
            🖨️ 打印
          </button>
        </div>
      </div>

      {(issues.length > 0) && (
        <div className={`data-issues ${hasBlockingErrors ? "has-critical-errors" : ""}`}>
          <div className="issues-header">
            <strong>⚠️ 数据检查结果</strong>
            <span className="issue-count">
              {errorIssues.length > 0 && <span className="error-count">{errorIssues.length} 个错误</span>}
              {warningIssues.length > 0 && <span className="warning-count">{warningIssues.length} 个警告</span>}
            </span>
          </div>
          <ul className="issues-list">
            {[...errorIssues, ...warningIssues].map((issue, idx) => (
              <li key={idx} className={`issue-item issue-${issue.type}`}>
                <span className="issue-icon">{issue.type === "error" ? "❌" : "⚠️"}</span>
                <span className="issue-text">{issue.message}</span>
              </li>
            ))}
          </ul>
          {hasBlockingErrors && (
            <div className="issues-footer">
              <p>存在严重数据问题，柱状图可能不准确。请先修正数据后再使用。</p>
            </div>
          )}
        </div>
      )}

      {!chartData ? (
        <div className="chart-empty">
          <div className="empty-icon">📊</div>
          <p>数据验证未通过，暂不绘制柱状图</p>
        </div>
      ) : (
        <div className="chart-wrapper">
          <div
            className="borehole-chart"
            style={{ height: `${chartData.chartHeight + 60}px` }}
          >
            <div className="chart-scale">
              <div className="scale-title">深度(m)</div>
              {chartData.tickMarks.map((tick, idx) => (
                <div
                  key={idx}
                  className={`scale-tick ${tick.major ? "major" : "minor"}`}
                  style={{ top: `${tick.y}px` }}
                >
                  <span className="tick-label">{tick.depth.toFixed(tick.depth % 1 === 0 ? 0 : 1)}</span>
                  <span className="tick-line"></span>
                </div>
              ))}
            </div>

            <div className="chart-columns">
              <div className="column column-depth">
                <div className="column-header">层底深度</div>
                <div className="column-body" style={{ height: `${chartData.chartHeight}px` }}>
                  {chartData.layerHeights.map(({ layer, top, height }, idx) => (
                    <div
                      key={layer.id}
                      className={`depth-cell ${chartData.layerHeights[idx].expanded ? "expanded" : ""}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <span className="depth-value">{layer.endDepth}m</span>
                      <span className="thickness-value">
                        {(parseFloat(layer.endDepth) - parseFloat(layer.startDepth)).toFixed(2)}m
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="column column-lithology">
                <div className="column-header">岩性柱状</div>
                <div className="column-body" style={{ height: `${chartData.chartHeight}px` }}>
                  {chartData.layerHeights.map(({ layer, top, height, expanded }, idx) => (
                    <div
                      key={layer.id}
                      className={`lithology-cell ${expanded ? "expanded" : ""}`}
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: getLithologyColor(layer.lithology),
                        borderStyle: getLithologyPattern(layer.lithology),
                      }}
                    >
                      <div className="lithology-pattern"></div>
                      <div className="lithology-label">
                        <span className="lithology-name">{layer.lithology}</span>
                        {layer.density && <span className="lithology-density">{layer.density}</span>}
                        {layer.soilColor && <span className="lithology-color">{layer.soilColor}</span>}
                      </div>
                      {expanded && <span className="expanded-indicator">≠</span>}
                    </div>
                  ))}

                  {stableWaterLevel !== null && (
                    <div
                      className="water-level-line"
                      style={{ top: `${chartData.depthToY(stableWaterLevel)}px` }}
                    >
                      <span className="water-level-label">
                        地下水位 {stableWaterLevel}m
                      </span>
                      <span className="water-level-symbol">▼</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="column column-spt">
                <div className="column-header">标贯试验</div>
                <div className="column-body" style={{ height: `${chartData.chartHeight}px` }}>
                  {sortedSPT.map((spt) => {
                    const depth = parseFloat(spt.depth);
                    const y = chartData.depthToY(depth);
                    const blowCount = parseFloat(spt.blowCount);
                    return (
                      <div
                        key={spt.id}
                        className={`spt-marker ${spt.isAbnormal ? "abnormal" : ""}`}
                        style={{ top: `${y}px` }}
                      >
                        <span className="spt-depth">{spt.depth}m</span>
                        <span className={`spt-blow ${spt.isAbnormal ? "abnormal" : ""}`}>
                          {isNaN(blowCount) ? spt.blowCount : blowCount}击
                        </span>
                        {spt.isAbnormal && <span className="spt-abnormal-badge">异常</span>}
                      </div>
                    );
                  })}
                  {sortedSPT.length === 0 && (
                    <div className="column-empty">无标贯记录</div>
                  )}
                </div>
              </div>

              <div className="column column-description">
                <div className="column-header">岩性描述</div>
                <div className="column-body" style={{ height: `${chartData.chartHeight}px` }}>
                  {chartData.layerHeights.map(({ layer, top, height, expanded }, idx) => (
                    <div
                      key={layer.id}
                      className={`description-cell ${expanded ? "expanded" : ""}`}
                      style={{ top: `${top}px`, height: `${height}px` }}
                    >
                      <div className="description-layer-index">第{idx + 1}层</div>
                      <div className="description-text">
                        {layer.description || "无描述"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="chart-legend">
            <div className="legend-title">图例</div>
            <div className="legend-items">
              <div className="legend-item">
                <span className="legend-symbol water-symbol">▼</span>
                <span>地下水位线</span>
              </div>
              <div className="legend-item">
                <span className="legend-symbol spt-symbol">◆</span>
                <span>标贯点位</span>
              </div>
              <div className="legend-item">
                <span className="legend-symbol abnormal-symbol">✕</span>
                <span>异常数据</span>
              </div>
              <div className="legend-item">
                <span className="legend-symbol expanded-symbol">≠</span>
                <span>厚度非比例（薄层放大）</span>
              </div>
            </div>
          </div>

          {latestWaterLevel && (
            <div className="water-level-info">
              <strong>水位观测：</strong>
              {latestWaterLevel.firstSeenLevel && <span>初见水位 {latestWaterLevel.firstSeenLevel}m</span>}
              {latestWaterLevel.stableLevel && <span>｜稳定水位 {latestWaterLevel.stableLevel}m</span>}
              {latestWaterLevel.observationTime && <span>｜观测时间 {latestWaterLevel.observationTime}</span>}
              {latestWaterLevel.weatherRemark && <span>｜{latestWaterLevel.weatherRemark}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
