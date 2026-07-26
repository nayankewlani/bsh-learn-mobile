import React, { useRef, useState, useCallback, useEffect } from "react";
import { View, PanResponder, StyleSheet, LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";

export interface WbStroke {
  id: string; tool: string; color: string; size: number;
  points: number[][]; userId: string; ts: number;
}

interface Props {
  strokes: WbStroke[];
  canDraw: boolean;
  tool: "pen" | "eraser";
  color: string;
  size: number;
  onStrokeDone: (stroke: WbStroke) => void;
}

const BG = "#1a1730";

const pathFromPoints = (points: number[][], w: number, h: number): string => {
  if (points.length < 2) return "";
  const [x0, y0] = points[0];
  let d = `M ${x0 * w} ${y0 * h}`;
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i];
    d += ` L ${x * w} ${y * h}`;
  }
  return d;
};

const Whiteboard: React.FC<Props> = ({ strokes, canDraw, tool, color, size, onStrokeDone }) => {
  const [dims, setDims] = useState({ w: 0, h: 0 });
  const pointsRef = useRef<number[][]>([]);
  const [liveStroke, setLiveStroke] = useState<number[][] | null>(null);

  // The PanResponder below is frozen at first mount (see comment further down), so it
  // can never see a fresh `dims` from React state/useCallback — it would stay stuck
  // normalizing against {w:0,h:0} forever. Keep a ref in sync instead and read that.
  const dimsRef = useRef(dims);
  useEffect(() => { dimsRef.current = dims; }, [dims]);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setDims({ w: width, h: height });
  };

  const toNorm = useCallback((x: number, y: number): [number, number] => {
    const { w, h } = dimsRef.current;
    if (w === 0 || h === 0) return [0, 0];
    return [Math.min(1, Math.max(0, x / w)), Math.min(1, Math.max(0, y / h))];
  }, []);

  // PanResponder.create() runs exactly once (it's wrapped in useRef below), so any
  // prop read directly inside its callbacks gets frozen to its value at first mount.
  // canDraw/tool/color/size all change after that (e.g. canDraw flips true once the
  // join finishes, or the user switches tools) — mirror them into refs so the
  // callbacks always see the live value instead of the stale first-render snapshot.
  const canDrawRef = useRef(canDraw);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const sizeRef = useRef(size);
  useEffect(() => { canDrawRef.current = canDraw; }, [canDraw]);
  useEffect(() => { toolRef.current = tool; }, [tool]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { sizeRef.current = size; }, [size]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => canDrawRef.current,
      onMoveShouldSetPanResponder: () => canDrawRef.current,
      onPanResponderGrant: (e) => {
        if (!canDrawRef.current) return;
        const { locationX, locationY } = e.nativeEvent;
        pointsRef.current = [toNorm(locationX, locationY)];
        setLiveStroke([...pointsRef.current]);
      },
      onPanResponderMove: (e) => {
        if (!canDrawRef.current) return;
        const { locationX, locationY } = e.nativeEvent;
        pointsRef.current.push(toNorm(locationX, locationY));
        setLiveStroke([...pointsRef.current]);
      },
      onPanResponderRelease: () => {
        if (!canDrawRef.current) return;
        if (pointsRef.current.length >= 2) {
          onStrokeDone({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            tool: toolRef.current, color: colorRef.current, size: sizeRef.current,
            points: pointsRef.current, userId: "", ts: Date.now(),
          });
        }
        pointsRef.current = [];
        setLiveStroke(null);
      },
    })
  ).current;

  return (
    <View style={styles.container} onLayout={onLayout} {...panResponder.panHandlers}>
      {dims.w > 0 && (
        <Svg width={dims.w} height={dims.h} style={StyleSheet.absoluteFill}>
          {strokes.map(s => (
            <Path key={s.id}
              d={pathFromPoints(s.points, dims.w, dims.h)}
              stroke={s.tool === "eraser" ? BG : s.color}
              strokeWidth={s.size} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
          {liveStroke && (
            <Path d={pathFromPoints(liveStroke, dims.w, dims.h)}
              stroke={tool === "eraser" ? BG : color}
              strokeWidth={size} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          )}
        </Svg>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, overflow: "hidden" },
});

export default Whiteboard;
