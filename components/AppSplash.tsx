import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  View,
} from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');

// Each blob: position as fraction of screen, size, color, start displacement
const BLOBS = [
  { cx: 0.50, cy: 0.40, rx: 0.52, ry: 0.40, color: '#7c3aed', alpha: 0.80, delay: 0,   dy: 90  },
  { cx: 0.25, cy: 0.30, rx: 0.34, ry: 0.26, color: '#a78bfa', alpha: 0.60, delay: 100, dy: 110 },
  { cx: 0.75, cy: 0.36, rx: 0.32, ry: 0.30, color: '#5b21b6', alpha: 0.65, delay: 60,  dy: 75  },
  { cx: 0.50, cy: 0.58, rx: 0.44, ry: 0.32, color: '#3b0764', alpha: 0.50, delay: 180, dy: 50  },
  { cx: 0.65, cy: 0.20, rx: 0.26, ry: 0.20, color: '#c4b5fd', alpha: 0.45, delay: 140, dy: 100 },
  { cx: 0.32, cy: 0.50, rx: 0.28, ry: 0.22, color: '#9333ea', alpha: 0.55, delay: 50,  dy: 65  },
  { cx: 0.60, cy: 0.65, rx: 0.30, ry: 0.20, color: '#7e22ce', alpha: 0.40, delay: 220, dy: 45  },
];

interface Props {
  onDone: () => void;
}

export default function AppSplash({ onDone }: Props) {
  // Master fade out
  const masterOpacity = useRef(new Animated.Value(1)).current;

  // Per-blob: entrance opacity, entrance scale, entrance translateY, drift loop
  const blobOpacity = useRef(BLOBS.map(() => new Animated.Value(0))).current;
  const blobScale   = useRef(BLOBS.map(() => new Animated.Value(0.35))).current;
  const blobTy      = useRef(BLOBS.map((b) => new Animated.Value(b.dy))).current;
  const blobDrift   = useRef(BLOBS.map(() => new Animated.Value(0))).current;

  // Logo
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale   = useRef(new Animated.Value(0.12)).current;
  const logoShine   = useRef(new Animated.Value(0)).current; // 0→1 shimmer sweep

  // Glow halo behind logo
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const glowPulse   = useRef(new Animated.Value(0.85)).current;

  // Two staggered expanding rings
  const r1Scale   = useRef(new Animated.Value(0.6)).current;
  const r1Opacity = useRef(new Animated.Value(0)).current;
  const r2Scale   = useRef(new Animated.Value(0.6)).current;
  const r2Opacity = useRef(new Animated.Value(0)).current;

  // Text
  const textOpacity    = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // ── 1. Smoke entrance (parallel with delays) ──────────────────────────────
    const smokeEntrance = BLOBS.map((blob, i) =>
      Animated.sequence([
        Animated.delay(blob.delay),
        Animated.parallel([
          Animated.timing(blobOpacity[i], { toValue: blob.alpha, duration: 950, useNativeDriver: true }),
          Animated.spring(blobScale[i],   { toValue: 1, friction: 7, tension: 28, useNativeDriver: true }),
          Animated.timing(blobTy[i],      { toValue: 0, duration: 1100, useNativeDriver: true }),
        ]),
      ])
    );

    // ── 2. Glow + logo entrance (starts at 320ms) ─────────────────────────────
    const logoEntrance = Animated.sequence([
      Animated.delay(320),
      Animated.parallel([
        Animated.timing(glowOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 4,
          tension: 48,
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 520, useNativeDriver: true }),
      ]),
    ]);

    // ── 3. Text cascade ───────────────────────────────────────────────────────
    const textEntrance = Animated.sequence([
      Animated.delay(680),
      Animated.timing(textOpacity,    { toValue: 1, duration: 480, useNativeDriver: true }),
      Animated.delay(180),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
    ]);

    // ── Run all entrance phases in parallel ───────────────────────────────────
    Animated.parallel([...smokeEntrance, logoEntrance, textEntrance]).start(() => {

      // ── 4a. Glow pulse loop ────────────────────────────────────────────────
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowPulse, { toValue: 1.16, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowPulse, { toValue: 0.84, duration: 1500, useNativeDriver: true }),
        ])
      ).start();

      // ── 4b. Blob drift (slow breathe) ─────────────────────────────────────
      BLOBS.forEach((_, i) => {
        const breathe = () => {
          Animated.sequence([
            Animated.timing(blobDrift[i], { toValue: -(10 + i * 2), duration: 2100 + i * 250, useNativeDriver: true }),
            Animated.timing(blobDrift[i], { toValue: 6 + i,          duration: 2300 + i * 150, useNativeDriver: true }),
          ]).start(({ finished }) => { if (finished) breathe(); });
        };
        breathe();
      });

      // ── 4c. Expanding ring loops ──────────────────────────────────────────
      const runRing = (
        scaleAnim: Animated.Value,
        opacityAnim: Animated.Value,
        startDelay: number
      ) => {
        const cycle = () => {
          scaleAnim.setValue(0.65);
          opacityAnim.setValue(0.6);
          Animated.parallel([
            Animated.timing(scaleAnim,   { toValue: 2.8, duration: 2400, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 0,   duration: 2400, useNativeDriver: true }),
          ]).start(({ finished }) => { if (finished) cycle(); });
        };
        setTimeout(cycle, startDelay);
      };

      runRing(r1Scale, r1Opacity, 0);
      runRing(r2Scale, r2Opacity, 1200);

      // ── 4d. Logo shimmer once ─────────────────────────────────────────────
      Animated.timing(logoShine, { toValue: 1, duration: 900, useNativeDriver: true }).start();

      // ── 5. Exit after minimum display time ───────────────────────────────
      setTimeout(() => {
        Animated.timing(masterOpacity, {
          toValue: 0,
          duration: 750,
          useNativeDriver: true,
        }).start(() => onDone());
      }, 2600);
    });
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: masterOpacity }]}>

      {/* ── Smoke blobs ─────────────────────────────────────────────────── */}
      {BLOBS.map((blob, i) => (
        <Animated.View
          key={i}
          style={[
            StyleSheet.absoluteFill,
            {
              opacity: blobOpacity[i],
              transform: [
                { scale: blobScale[i] },
                { translateY: Animated.add(blobTy[i], blobDrift[i]) },
              ],
            },
          ]}
        >
          <Svg width={W} height={H}>
            <Defs>
              <RadialGradient id={`rg${i}`} cx="50%" cy="50%" r="50%">
                <Stop offset="0%"   stopColor={blob.color} stopOpacity="1" />
                <Stop offset="48%"  stopColor={blob.color} stopOpacity="0.55" />
                <Stop offset="100%" stopColor={blob.color} stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Ellipse
              cx={blob.cx * W}
              cy={blob.cy * H}
              rx={blob.rx * W}
              ry={blob.ry * H}
              fill={`url(#rg${i})`}
            />
          </Svg>
        </Animated.View>
      ))}

      {/* ── Center stage ────────────────────────────────────────────────── */}
      <View style={styles.stage}>

        {/* Expanding rings */}
        <Animated.View style={[styles.ring, { opacity: r1Opacity, transform: [{ scale: r1Scale }] }]} />
        <Animated.View style={[styles.ring, styles.ringThin, { opacity: r2Opacity, transform: [{ scale: r2Scale }] }]} />

        {/* Glow halo */}
        <Animated.View
          style={[
            styles.glow,
            { opacity: glowOpacity, transform: [{ scale: glowPulse }] },
          ]}
        />

        {/* Logo with shimmer */}
        <Animated.Image
          source={require('../assets/BSH-logo-02.png')}
          style={[
            styles.logo,
            { opacity: logoOpacity, transform: [{ scale: logoScale }] },
          ]}
          resizeMode="contain"
        />
      </View>

      {/* ── App name & tagline ───────────────────────────────────────────── */}
      <View style={styles.textBlock} pointerEvents="none">
        <Animated.Text style={[styles.appName, { opacity: textOpacity }]}>
          BSH Healers
        </Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>
          HEAL  ·  LEARN  ·  GROW
        </Animated.Text>
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a0914',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -72,
  },
  ring: {
    position: 'absolute',
    width: 172,
    height: 172,
    borderRadius: 86,
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.75)',
  },
  ringThin: {
    borderWidth: 1,
    borderColor: 'rgba(167,139,250,0.55)',
  },
  glow: {
    position: 'absolute',
    width: 216,
    height: 216,
    borderRadius: 108,
    backgroundColor: 'rgba(124,58,237,0.24)',
  },
  logo: {
    width: 148,
    height: 148,
  },
  textBlock: {
    position: 'absolute',
    alignItems: 'center',
    bottom: H * 0.26,
  },
  appName: {
    color: '#f5f3ff',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 1.8,
    marginBottom: 10,
    textShadowColor: 'rgba(167,139,250,0.6)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },
  tagline: {
    color: 'rgba(196,181,253,0.78)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 5.5,
  },
});
