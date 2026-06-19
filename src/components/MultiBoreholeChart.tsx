import { useMemo } from "react";
import type { StratumLayer, SPTRecord, WaterLevelRecord } from "../types";

interface BoreholeData {
  boreholeId: string;
  holeDepth: number;
  layers: StratumLayer[];
  sptRecords: SPTRecord[];
  waterLevelRecords: WaterLevelRecord[];
}

interface MultiBoreholeChartProps {
  boreholes: BoreholeData[];
}

interface ValidationIssue {
  type: "error" | "warning";
  message: string;
  severity: number;
  boreholeId: string;
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

const validateBoreholeData = (
  boreholeId: string,
  holeDepth: number,
  layers: StratumLayer[],
  sptRecords: SPTRecord[],
  waterLevelRecords: WaterLevelRecord[]
): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];

  if (holeDepth <= 0) {
    issues.push({
      type: "error",
      message: `钻孔深度无效：${holeDepth}m，必须大于0`,
      severity: 10,
      boreholeId,
    });
    return issues;
  }

  if (layers.length === 0) {
    issues.push({
      type: "error",
      message: "暂无地层分层数据，无法绘制柱状图",
      severity: 10,
      boreholeId,
    });
    return issues;
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
      boreholeId,
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
        boreholeId,
      });
      continue;
    }

    if (start >= end) {
      issues.push({
        type: "error",
        message: `第 ${i + 1} 层（${layer.lithology}）终止深度 ${end}m 必须大于起始深度 ${start}m`,
        severity: 10,
        boreholeId,
      });
    }

    if (Math.abs(start - prevEnd) > 0.001) {
      if (start > prevEnd) {
        issues.push({
          type: "error",
          message: `分层缺口：${prevEnd.toFixed(2)}m ~ ${start.toFixed(2)}m 无地层数据`,
          severity: 9,
          boreholeId,
        });
      } else {
        issues.push({
          type: "error",
          message: `分层重叠：${start.toFixed(2)}m ~ ${prevEnd.toFixed(2)}m 存在重复`,
          severity: 9,
          boreholeId,
        });
      }
    }

    if (end > holeDepth + 0.001) {
      issues.push({
        type: "error",
        message: `第 ${i + 1} 层（${layer.lithology}）终止深度 ${end}m 超过钻孔深度 ${holeDepth}m`,
        severity: 8,
        boreholeId,
      });
    }

    if (!layer.lithology.trim()) {
      issues.push({
        type: "warning",
        message: `第 ${i + 1} 层（${start}~${end}m）岩性未填写`,
        severity: 5,
        boreholeId,
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
      boreholeId,
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
        boreholeId,
      });
      continue;
    }

    if (depth > holeDepth) {
      issues.push({
        type: "warning",
        message: `标贯深度 ${depth}m 超过钻孔深度 ${holeDepth}m`,
        severity: 4,
        boreholeId,
      });
    }

    if (isNaN(blowCount) || blowCount < 0) {
      issues.push({
        type: "warning",
        message: `深度 ${depth}m 处标贯击数无效："${spt.blowCount}"`,
        severity: 4,
        boreholeId,
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
        boreholeId,
      });
    }
  }

  for (let i = 0; i < waterLevelRecords.length; i++) {
    const wl = waterLevelRecords[i];
    const firstSeen = parseFloat(wl.firstSeenLevel);
    const stable = parseFloat(wl.stableLevel);

    if (wl.firstSeenLevel.trim()) {
      if (isNaN(firstSeen) || firstSeen < 0) {
        issues.push({
          type: "error",
          message: `第 ${i + 1} 条水位记录初见水位无效："${wl.firstSeenLevel}"m，必须为非负数`,
          severity: 8,
          boreholeId,
        });
      } else if (firstSeen > holeDepth) {
        issues.push({
          type: "error",
          message: `第 ${i + 1} 条水位记录初见水位 ${firstSeen}m 超过钻孔深度 ${holeDepth}m`,
          severity: 8,
          boreholeId,
        });
      }
    }

    if (wl.stableLevel.trim()) {
      if (isNaN(stable) || stable < 0) {
        issues.push({
          type: "error",
          message: `第 ${i + 1} 条水位记录稳定水位无效："${wl.stableLevel}"m，必须为非负数`,
          severity: 8,
          boreholeId,
        });
      } else if (stable > holeDepth) {
        issues.push({
          type: "error",
          message: `第 ${i + 1} 条水位记录稳定水位 ${stable}m 超过钻孔深度 ${holeDepth}m`,
          severity: 8,
          boreholeId,
        });
      }
    }
  }

  if (waterLevelRecords.length === 0) {
    issues.push({
      type: "warning",
      message: "缺少水位观测数据",
      severity: 5,
      boreholeId,
    });
  } else {
    const hasStableLevel = waterLevelRecords.some(wl => wl.stableLevel && wl.stableLevel.trim());
    if (!hasStableLevel) {
      issues.push({
        type: "warning",
        message: "缺少稳定水位数据",
        severity: 6,
        boreholeId,
      });
    }
  }

  return issues;
};

const MIN_LABEL_HEIGHT = 22;

export default function MultiBoreholeChart({ boreholes }: MultiBoreholeChartProps) {
  const allIssues = useMemo(() => {
    const issues: ValidationIssue[] = [];
    for (const bh of boreholes) {
      issues.push(...validateBoreholeData(
        bh.boreholeId,
        bh.holeDepth,
        bh.layers,
        bh.sptRecords,
        bh.waterLevelRecords
      ));
    }
    return issues;
  }, [boreholes]);

  const maxDepth = useMemo(() => {
    let max = 0;
    for (const bh of boreholes) {
      if (bh.holeDepth > max) max = bh.holeDepth;
    }
    return max;
  }, [boreholes]);

  const minDepth = useMemo(() => {
    let min = Infinity;
    for (const bh of boreholes) {
      if (bh.holeDepth < min && bh.holeDepth > 0) min = bh.holeDepth;
    }
    return min === Infinity ? 0 : min;
  }, [boreholes]);

  const hasDepthDifference = useMemo(() => {
    if (boreholes.length < 2) return false;
    return Math.abs(maxDepth - minDepth) > 0.001;
  }, [boreholes, maxDepth, minDepth]);

  const chartBase = useMemo(() => {
    if (boreholes.length === 0 || maxDepth <= 0) return null;

    const totalDepth = maxDepth;
    const baseChartHeight = Math.max(500, totalDepth * 25);
    const pixelsPerMeter = baseChartHeight / totalDepth;

    const depthToY = (depth: number): number => {
      return depth * pixelsPerMeter;
    };

    const generateTickMarks = (): { depth: number; y: number; major: boolean }[] => {
      const ticks: { depth: number; y: number; major: boolean }[] = [];
      let interval = 1;
      if (totalDepth > 100) interval = 10;
      else if (totalDepth > 50) interval = 5;
      else if (totalDepth > 20) interval = 2;

      for (let d = 0; d <= totalDepth; d += interval) {
        ticks.push({ depth: d, y: depthToY(d), major: d % (interval * 5) === 0 });
      }
      if (Math.abs(totalDepth % interval) > 0.001) {
        ticks.push({ depth: totalDepth, y: depthToY(totalDepth), major: true });
      }
      return ticks;
    };

    const boreholeCharts = boreholes.map(bh => {
      const sortedLayers = [...bh.layers].sort(
        (a, b) => parseFloat(a.startDepth) - parseFloat(b.startDepth)
      );

      const layerHeights: {
        layer: StratumLayer;
        top: number;
        height: number;
        isThin: boolean;
      }[] = [];

      for (const layer of sortedLayers) {
        const start = parseFloat(layer.startDepth);
        const end = parseFloat(layer.endDepth);
        const thickness = end - start;

        const height = thickness * pixelsPerMeter;
        const top = start * pixelsPerMeter;
        const isThin = height < MIN_LABEL_HEIGHT;

        layerHeights.push({
          layer,
          top,
          height,
          isThin,
        });
      }

      const sortedSPT = [...bh.sptRecords].sort(
        (a, b) => parseFloat(a.depth) - parseFloat(b.depth)
      );

      const sptMarkers = sortedSPT
        .filter((spt) => {
          const depth = parseFloat(spt.depth);
          return !isNaN(depth) && depth >= 0 && depth <= bh.holeDepth;
        })
        .map((spt) => ({
          record: spt,
          y: depthToY(parseFloat(spt.depth)),
        }));

      const stableWaterLevel = (() => {
        for (const record of bh.waterLevelRecords) {
          if (record.stableLevel && record.stableLevel.trim()) {
            const level = parseFloat(record.stableLevel);
            if (!isNaN(level) && level >= 0 && level <= bh.holeDepth) return level;
          }
        }
        return null;
      })();

      const latestWaterLevel = (() => {
        if (bh.waterLevelRecords.length === 0) return null;
        const sorted = [...bh.waterLevelRecords].sort((a, b) => {
          const timeA = a.observationTime ? new Date(a.observationTime).getTime() : 0;
          const timeB = b.observationTime ? new Date(b.observationTime).getTime() : 0;
          return timeB - timeA;
        });
        return sorted[0];
      })();

      const bhIssues = allIssues.filter(i => i.boreholeId === bh.boreholeId);
      const hasErrors = bhIssues.some(i => i.type === "error");
      const hasWarnings = bhIssues.some(i => i.type === "warning");

      return {
        boreholeId: bh.boreholeId,
        holeDepth: bh.holeDepth,
        layerHeights,
        sptMarkers,
        stableWaterLevel,
        latestWaterLevel,
        hasErrors,
        hasWarnings,
        errorCount: bhIssues.filter(i => i.type === "error").length,
        warningCount: bhIssues.filter(i => i.type === "warning").length,
      };
    });

    return {
      chartHeight: baseChartHeight,
      depthToY,
      tickMarks: generateTickMarks(),
      totalDepth,
      pixelsPerMeter,
      boreholeCharts,
    };
  }, [boreholes, maxDepth, allIssues]);

  const errorIssues = allIssues.filter((i) => i.type === "error");
  const warningIssues = allIssues.filter((i) => i.type === "warning");
  const hasBlockingErrors = errorIssues.some((i) => i.severity >= 8);

  const issuesByBorehole = useMemo(() => {
    const map: Record<string, ValidationIssue[]> = {};
    for (const issue of allIssues) {
      if (!map[issue.boreholeId]) map[issue.boreholeId] = [];
      map[issue.boreholeId].push(issue);
    }
    return map;
  }, [allIssues]);

  if (boreholes.length === 0) {
    return (
      <div className="multi-borehole-chart-container">
        <div className="chart-empty">
          <div className="empty-icon">📊</div>
          <p>请选择至少一个钻孔进行对比</p>
          <p className="empty-hint">在左侧钻孔列表中勾选多个钻孔</p>
        </div>
      </div>
    );
  }

  return (
    <div className="multi-borehole-chart-container">
      <div className="chart-header">
        <div className="chart-title">
          <h3>多钻孔对比视图 · 共 {boreholes.length} 个钻孔</h3>
          <span className="chart-subtitle">
            统一深度比例 · 最大孔深 {maxDepth}m
            {hasDepthDifference && (
              <span className="depth-diff-hint">
                （孔深差异 {Math.abs(maxDepth - minDepth).toFixed(1)}m，已按最大深度对齐）
              </span>
            )}
          </span>
        </div>
      </div>

      {allIssues.length > 0 && (
        <div className={`data-issues multi-issues ${hasBlockingErrors ? "has-critical-errors" : ""}`}>
          <div className="issues-header">
            <strong>⚠️ 数据检查结果</strong>
            <span className="issue-count">
              {errorIssues.length > 0 && (
                <span className="error-count">{errorIssues.length} 个错误</span>
              )}
              {warningIssues.length > 0 && (
                <span className="warning-count">{warningIssues.length} 个警告</span>
              )}
            </span>
          </div>
          <div className="multi-issues-grid">
            {boreholes.map(bh => {
              const bhIssues = issuesByBorehole[bh.boreholeId] || [];
              if (bhIssues.length === 0) return null;
              const bhErrors = bhIssues.filter(i => i.type === "error");
              const bhWarnings = bhIssues.filter(i => i.type === "warning");
              return (
                <div key={bh.boreholeId} className="borehole-issues-block">
                  <div className="borehole-issues-title">
                    <span className="borehole-id-tag">{bh.boreholeId}</span>
                    {bhErrors.length > 0 && (
                      <span className="error-count">{bhErrors.length} 错误</span>
                    )}
                    {bhWarnings.length > 0 && (
                      <span className="warning-count">{bhWarnings.length} 警告</span>
                    )}
                  </div>
                  <ul className="issues-list">
                    {bhIssues.map((issue, idx) => (
                      <li key={idx} className={`issue-item issue-${issue.type}`}>
                        <span className="issue-icon">{issue.type === "error" ? "❌" : "⚠️"}</span>
                        <span className="issue-text">{issue.message}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!chartBase ? (
        <div className="chart-empty">
          <div className="empty-icon">📊</div>
          <p>数据验证未通过，暂不绘制柱状图</p>
          <p className="empty-hint">请检查上方列出的数据问题并修正</p>
        </div>
      ) : (
        <div className="chart-wrapper">
          <div className="chart-scroll-container">
            <div
              className="multi-borehole-chart"
              style={{ height: `${chartBase.chartHeight + 40}px` }}
            >
              <div className="chart-scale multi-scale">
                <div className="scale-title">深度(m)</div>
                {chartBase.tickMarks.map((tick, idx) => (
                  <div
                    key={idx}
                    className={`scale-tick ${tick.major ? "major" : "minor"}`}
                    style={{ top: `${tick.y}px` }}
                  >
                    <span className="tick-label">
                      {tick.depth.toFixed(tick.depth % 1 === 0 ? 0 : 1)}
                    </span>
                    <span className="tick-line"></span>
                  </div>
                ))}
              </div>

              <div className="multi-chart-columns">
                {chartBase.boreholeCharts.map((bh) => (
                  <div key={bh.boreholeId} className="borehole-column">
                    <div className="borehole-column-header">
                      <div className="borehole-name">{bh.boreholeId}</div>
                      <div className="borehole-meta">
                        <span>孔深 {bh.holeDepth}m</span>
                        {bh.hasErrors && <span className="status-badge error-badge">有错误</span>}
                        {!bh.hasErrors && bh.hasWarnings && <span className="status-badge warning-badge">有警告</span>}
                      </div>
                    </div>
                    <div
                      className="borehole-column-body"
                      style={{ height: `${chartBase.chartHeight}px` }}
                    >
                      <div className="column-lithology multi-lithology">
                        <div
                          className="column-body"
                          style={{ height: `${chartBase.chartHeight}px` }}
                        >
                          {bh.layerHeights.map(
                            ({ layer, top, height, isThin }, _idx) => (
                              <div
                                key={layer.id}
                                className={`lithology-cell ${isThin ? "thin-layer" : ""}`}
                                style={{
                                  top: `${top}px`,
                                  height: `${height}px`,
                                  backgroundColor: getLithologyColor(layer.lithology),
                                  borderStyle: getLithologyPattern(layer.lithology),
                                }}
                                title={`${layer.lithology} ${layer.startDepth}~${layer.endDepth}m`}
                              >
                                <div className="lithology-pattern"></div>
                                {!isThin && (
                                  <div className="lithology-label">
                                    <span className="lithology-name">{layer.lithology}</span>
                                    {layer.density && (
                                      <span className="lithology-density">{layer.density}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          )}

                          {bh.stableWaterLevel !== null && (
                            <div
                              className="water-level-line"
                              style={{ top: `${chartBase.depthToY(bh.stableWaterLevel)}px` }}
                            >
                              <span className="water-level-symbol">▼</span>
                              <span className="water-level-label">
                                稳定水位 {bh.stableWaterLevel}m
                              </span>
                            </div>
                          )}

                          {bh.holeDepth < maxDepth && (
                            <div
                              className="hole-end-marker"
                              style={{ top: `${chartBase.depthToY(bh.holeDepth)}px` }}
                            >
                              <div className="hole-end-line"></div>
                              <span className="hole-end-label">孔底 {bh.holeDepth}m</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="column-spt multi-spt">
                        <div
                          className="column-body"
                          style={{ height: `${chartBase.chartHeight}px` }}
                        >
                          {bh.sptMarkers.map(({ record, y }) => {
                            const blowCount = parseFloat(record.blowCount);
                            return (
                              <div
                                key={record.id}
                                className={`spt-marker ${record.isAbnormal ? "abnormal" : ""}`}
                                style={{ top: `${y}px` }}
                                title={`标贯 ${record.depth}m · ${record.blowCount}击${record.isAbnormal ? " · 异常" : ""}`}
                              >
                                <span className="spt-diamond">◆</span>
                                <span className="spt-blow">{isNaN(blowCount) ? record.blowCount : blowCount}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="borehole-column-footer">
                      <div className="layer-count">共 {bh.layerHeights.length} 层</div>
                      <div className="spt-count">标贯 {bh.sptMarkers.length} 次</div>
                      {bh.latestWaterLevel && bh.latestWaterLevel.stableLevel && (
                        <div className="water-level-info-mini">
                          水位 {bh.latestWaterLevel.stableLevel}m
                        </div>
                      )}
                      {(!bh.latestWaterLevel || !bh.latestWaterLevel.stableLevel) && (
                        <div className="water-level-info-mini missing">
                          无稳定水位
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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
                <span className="legend-symbol hole-end-symbol">―</span>
                <span>钻孔底部</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
