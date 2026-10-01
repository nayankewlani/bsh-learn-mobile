/**
 * AppSplash — Water Splash
 * 0.00–0.35s  Teardrop falls from above to screen center
 * 0.35s       Impact: flash + 4 ripple rings + water column + 20 droplets
 * 0.35–1.40s  Droplets arc up (parabolic gravity) and fall off screen
 * 0.35–2.70s  Ripple rings slowly expand across full screen
 * 1.10–1.70s  Logo fades in, brand text floats up
 * 2.30–3.00s  Master fades → Home revealed
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';
import Svg, {
  Circle, Defs, Ellipse, LinearGradient, RadialGradient, Rect, Stop,
} from 'react-native-svg';

const { width: W, height: H } = Dimensions.get('window');
const CX = W / 2;
const CY = H / 2;
const RIP_R   = Math.min(W, H) * 0.065;
const RIP_MAX = (Math.sqrt(W * W + H * H) / 2 / RIP_R) * 1.1;
const FALL_Y  = H * 0.72;

const RIPPLES = [
  { delay:   0, dur: 1900, color: '#38bdf8', sw: 4.5, glow: 20, peak: 0.92 },
  { delay: 200, dur: 2100, color: '#0ea5e9', sw: 3.5, glow: 16, peak: 0.72 },
  { delay: 400, dur: 2300, color: '#7dd3fc', sw: 2.5, glow: 12, peak: 0.55 },
  { delay: 600, dur: 2500, color: '#bae6fd', sw: 2.0, glow:  9, peak: 0.38 },
];

type Drop = { tx: number; riseY: number; delay: number; dur: number; sz: number; c: string };

const DROPS: Drop[] = [
  { tx:   3, riseY: -H*.50, delay:  0, dur:1100, sz:11, c:'#e0f2fe' },
  { tx:  -5, riseY: -H*.52, delay: 12, dur:1120, sz: 8, c:'#bae6fd' },
  { tx:  14, riseY: -H*.46, delay: 22, dur:1060, sz: 7, c:'#7dd3fc' },
  { tx: -13, riseY: -H*.47, delay: 18, dur:1070, sz: 8, c:'#bae6fd' },
  { tx:  W*.10, riseY:-H*.44, delay: 28, dur:1010, sz: 9, c:'#38bdf8' },
  { tx: -W*.10, riseY:-H*.44, delay: 26, dur:1015, sz: 9, c:'#38bdf8' },
  { tx:  W*.18, riseY:-H*.38, delay: 42, dur: 965, sz: 8, c:'#7dd3fc' },
  { tx: -W*.18, riseY:-H*.38, delay: 40, dur: 970, sz: 8, c:'#7dd3fc' },
  { tx:  W*.27, riseY:-H*.30, delay: 55, dur: 920, sz: 7, c:'#0ea5e9' },
  { tx: -W*.27, riseY:-H*.30, delay: 52, dur: 925, sz: 7, c:'#0ea5e9' },
  { tx:  W*.36, riseY:-H*.22, delay: 68, dur: 875, sz: 6, c:'#38bdf8' },
  { tx: -W*.36, riseY:-H*.22, delay: 65, dur: 878, sz: 6, c:'#38bdf8' },
  { tx:  W*.43, riseY:-H*.14, delay: 80, dur: 830, sz: 5, c:'#7dd3fc' },
  { tx: -W*.43, riseY:-H*.14, delay: 78, dur: 833, sz: 5, c:'#7dd3fc' },
  { tx:  W*.47, riseY:-H*.07, delay: 90, dur: 790, sz: 4, c:'#bae6fd' },
  { tx: -W*.47, riseY:-H*.07, delay: 88, dur: 793, sz: 4, c:'#bae6fd' },
  { tx:  W*.06, riseY:-H*.49, delay:  8, dur:1055, sz: 5, c:'#e0f2fe' },
  { tx: -W*.06, riseY:-H*.49, delay: 10, dur:1060, sz: 5, c:'#e0f2fe' },
  { tx:  W*.14, riseY:-H*.41, delay: 34, dur: 985, sz: 6, c:'#bae6fd' },
  { tx: -W*.14, riseY:-H*.41, delay: 32, dur: 988, sz: 6, c:'#bae6fd' },
];

interface Props { onDone: () => void }

export default function AppSplash({ onDone }: Props) {
  const master  = useRef(new Animated.Value(1)).current;

  const dropTY  = useRef(new Animated.Value(-H * 0.65)).current;
  const dropOp  = useRef(new Animated.Value(1)).current;
  const dropSqY = useRef(new Animated.Value(1.55)).current;

  const flashOp = useRef(new Animated.Value(0)).current;
  const flashSc = useRef(new Animated.Value(0.15)).current;

  const ripSc   = useRef(RIPPLES.map(() => new Animated.Value(0.12))).current;
  const ripOp   = useRef(RIPPLES.map(() => new Animated.Value(0))).current;

  const colSY   = useRef(new Animated.Value(0)).current;
  const colOp   = useRef(new Animated.Value(0)).current;

  const dX      = useRef(DROPS.map(() => new Animated.Value(0))).current;
  const dY      = useRef(DROPS.map(() => new Animated.Value(0))).current;
  const dOp     = useRef(DROPS.map(() => new Animated.Value(0))).current;

  const logoOp  = useRef(new Animated.Value(0)).current;
  const logoSc  = useRef(new Animated.Value(0.82)).current;
  const nameOp  = useRef(new Animated.Value(0)).current;
  const nameTy  = useRef(new Animated.Value(14)).current;
  const tagOp   = useRef(new Animated.Value(0)).current;
  const tagTy   = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const eOut = Easing.out(Easing.quad);
    const eCub = Easing.out(Easing.cubic);
    const eIn  = Easing.in(Easing.quad);

    // 1. Teardrop falls (0–0.35s)
    Animated.parallel([
      Animated.timing(dropTY, { toValue: 0, duration: 350, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.sequence([
        Animated.timing(dropSqY, { toValue: 1.8, duration: 270, easing: eIn, useNativeDriver: true }),
        Animated.timing(dropSqY, { toValue: 0.2, duration: 80,  easing: eIn, useNativeDriver: true }),
      ]),
    ]).start();
    setTimeout(() => Animated.timing(dropOp, { toValue: 0, duration: 80, useNativeDriver: true }).start(), 320);

    // 2. Impact flash (0.30–0.70s)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(flashOp, { toValue: 1,    duration: 140, easing: eOut, useNativeDriver: true }),
        Animated.timing(flashSc, { toValue: 0.68, duration: 240, easing: eOut, useNativeDriver: true }),
      ]).start();
      setTimeout(() => Animated.timing(flashOp, { toValue: 0, duration: 400, easing: eIn, useNativeDriver: true }).start(), 140);
    }, 300);

    // 3. Ripple rings (0.30–2.70s)
    RIPPLES.forEach((rip, i) => {
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(ripSc[i], { toValue: RIP_MAX, duration: rip.dur, easing: eOut, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(ripOp[i], { toValue: rip.peak, duration: 110, easing: eOut, useNativeDriver: true }),
            Animated.timing(ripOp[i], { toValue: 0, duration: rip.dur - 110, easing: eIn, useNativeDriver: true }),
          ]),
        ]).start();
      }, 300 + rip.delay);
    });

    // 4. Water column (0.30–0.90s)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(colOp, { toValue: 0.88, duration: 160, easing: eOut, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(colSY, { toValue: 1, duration: 460, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.timing(colSY, { toValue: 0, duration: 340, easing: eIn, useNativeDriver: true }),
        ]),
      ]).start();
      setTimeout(() => Animated.timing(colOp, { toValue: 0, duration: 340, easing: eIn, useNativeDriver: true }).start(), 460);
    }, 300);

    // 5. Splash droplets — parabolic arcs (0.30–1.40s)
    DROPS.forEach((d, i) => {
      setTimeout(() => {
        const rDur = d.dur * 0.35;
        const fDur = d.dur * 0.65;

        Animated.timing(dX[i], { toValue: d.tx, duration: d.dur, easing: Easing.linear, useNativeDriver: true }).start();
        Animated.sequence([
          Animated.timing(dY[i], { toValue: d.riseY, duration: rDur, easing: eOut, useNativeDriver: true }),
          Animated.timing(dY[i], { toValue: FALL_Y,  duration: fDur, easing: eIn,  useNativeDriver: true }),
        ]).start();
        Animated.sequence([
          Animated.timing(dOp[i], { toValue: 1, duration: 80,             useNativeDriver: true }),
          Animated.timing(dOp[i], { toValue: 1, duration: d.dur * 0.48,   useNativeDriver: true }),
          Animated.timing(dOp[i], { toValue: 0, duration: d.dur * 0.52 - 80, easing: eIn, useNativeDriver: true }),
        ]).start();
      }, 300 + d.delay);
    });

    // 6. Logo + text (1.10–1.70s)
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(logoOp, { toValue: 1, duration: 520, easing: eOut, useNativeDriver: true }),
        Animated.timing(logoSc, { toValue: 1, duration: 600, easing: eCub, useNativeDriver: true }),
      ]).start();
    }, 1100);
    Animated.sequence([
      Animated.delay(1290),
      Animated.parallel([
        Animated.timing(nameOp, { toValue: 1, duration: 360, easing: eOut, useNativeDriver: true }),
        Animated.timing(nameTy, { toValue: 0, duration: 400, easing: eOut, useNativeDriver: true }),
      ]),
      Animated.delay(80),
      Animated.parallel([
        Animated.timing(tagOp, { toValue: 1, duration: 300, easing: eOut, useNativeDriver: true }),
        Animated.timing(tagTy, { toValue: 0, duration: 340, easing: eOut, useNativeDriver: true }),
      ]),
    ]).start();

    // 7. Fade out (2.30–3.00s)
    const exitT = setTimeout(() => {
      Animated.timing(master, { toValue: 0, duration: 700, easing: eIn, useNativeDriver: true }).start(() => onDone());
    }, 2300);

    return () => clearTimeout(exitT);
  }, []);

  return (
    <Animated.View style={[styles.root, { opacity: master }]}>

      {/* Ripple rings — slow water surface waves */}
      {RIPPLES.map((rip, i) => (
        <Animated.View
          key={`r${i}`}
          renderToHardwareTextureAndroid
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, { opacity: ripOp[i], transform: [{ scale: ripSc[i] }] }]}
        >
          <Svg width={W} height={H}>
            <Circle cx={CX} cy={CY} r={RIP_R} stroke={rip.color} strokeWidth={rip.glow} strokeOpacity={0.26} fill="none" />
            <Circle cx={CX} cy={CY} r={RIP_R} stroke={rip.color} strokeWidth={rip.sw}   strokeOpacity={0.92} fill="none" />
          </Svg>
        </Animated.View>
      ))}

      {/* White-blue impact flash */}
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: flashOp, transform: [{ scale: flashSc }] }]}
      >
        <Svg width={W} height={H}>
          <Defs>
            <RadialGradient id="flash" cx="50%" cy="50%" r="50%">
              <Stop offset="0%"   stopColor="#ffffff" stopOpacity="1"    />
              <Stop offset="12%"  stopColor="#e0f2fe" stopOpacity="0.97" />
              <Stop offset="30%"  stopColor="#38bdf8" stopOpacity="0.85" />
              <Stop offset="55%"  stopColor="#0369a1" stopOpacity="0.42" />
              <Stop offset="100%" stopColor="#04060f" stopOpacity="0"    />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width={W} height={H} fill="url(#flash)" />
        </Svg>
      </Animated.View>

      {/* Central water column */}
      <Animated.View
        renderToHardwareTextureAndroid
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { opacity: colOp, transform: [{ scaleY: colSY }] }]}
      >
        <Svg width={W} height={H}>
          <Defs>
            <LinearGradient id="col" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%"   stopColor="#bae6fd" stopOpacity="0"    />
              <Stop offset="28%"  stopColor="#7dd3fc" stopOpacity="0.85" />
              <Stop offset="50%"  stopColor="#ffffff" stopOpacity="1"    />
              <Stop offset="72%"  stopColor="#7dd3fc" stopOpacity="0.85" />
              <Stop offset="100%" stopColor="#bae6fd" stopOpacity="0"    />
            </LinearGradient>
          </Defs>
          <Ellipse cx={CX} cy={CY} rx={12} ry={H * 0.46} fill="url(#col)" />
        </Svg>
      </Animated.View>

      {/* 20 water droplets — parabolic arcs */}
      {DROPS.map((d, i) => (
        <Animated.View
          key={`d${i}`}
          pointerEvents="none"
          style={{
            position:        'absolute',
            left:            CX - d.sz,
            top:             CY - d.sz,
            width:           d.sz * 2,
            height:          d.sz * 2,
            borderRadius:    d.sz,
            backgroundColor: d.c,
            opacity:         dOp[i],
            transform:       [{ translateX: dX[i] }, { translateY: dY[i] }],
          }}
        />
      ))}

      {/* Falling teardrop (pre-impact) */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left:     CX - 9,
          top:      CY - 13,
          width:    18,
          height:   26,
          opacity:  dropOp,
          transform:[{ translateY: dropTY }, { scaleY: dropSqY }],
        }}
      >
        <Svg width={18} height={26}>
          <Defs>
            <RadialGradient id="drop" cx="50%" cy="55%" r="50%">
              <Stop offset="0%"   stopColor="#ffffff" stopOpacity="1"    />
              <Stop offset="60%"  stopColor="#7dd3fc" stopOpacity="0.90" />
              <Stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.80" />
            </RadialGradient>
          </Defs>
          <Ellipse cx={9} cy={13} rx={7} ry={10} fill="url(#drop)" />
        </Svg>
      </Animated.View>

      {/* BSH logo */}
      <View style={styles.stage} pointerEvents="none">
        <Animated.Image
          source={require('../assets/BSH-logo-02.png')}
          style={[styles.logo, { opacity: logoOp, transform: [{ scale: logoSc }] }]}
          resizeMode="contain"
        />
      </View>

      {/* Brand text */}
      <View style={styles.textBlock} pointerEvents="none">
        <Animated.Text style={[styles.appName, { opacity: nameOp, transform: [{ translateY: nameTy }] }]}>
          BSH Healers
        </Animated.Text>
        <Animated.Text style={[styles.tagline, { opacity: tagOp, transform: [{ translateY: tagTy }] }]}>
          HEAL  ·  LEARN  ·  GROW
        </Animated.Text>
      </View>

    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#04060f',
    alignItems:      'center',
    justifyContent:  'center',
    zIndex:          9999,
  },
  stage: {
    alignItems:     'center',
    justifyContent: 'center',
    marginTop:      -70,
  },
  logo: {
    width:  146,
    height: 146,
  },
  textBlock: {
    position:   'absolute',
    alignItems: 'center',
    bottom:     H * 0.22,
  },
  appName: {
    color:            '#e0f2fe',
    fontSize:         28,
    fontWeight:       '700',
    letterSpacing:    1.6,
    marginBottom:     10,
    textShadowColor:  'rgba(56,189,248,0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  tagline: {
    color:         'rgba(186,230,253,0.70)',
    fontSize:      10.5,
    fontWeight:    '600',
    letterSpacing: 5.8,
  },
});
