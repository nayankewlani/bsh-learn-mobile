// ── Kundli Platform — Premium Vedic Astrology ─────────────────────────────────
// Full multi-step flow: birth input → place search → UTC confirm → dashboard
// Dashboard: Overview | North Indian Chart | Planets | Dasha

import React, { useState, useCallback, useRef, useMemo, useEffect } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, FlatList,
  ActivityIndicator, StyleSheet, Dimensions, Platform,
  KeyboardAvoidingView, Modal, NativeScrollEvent, NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Rect, Path as SvgPath, Circle as SvgCircle, Line as SvgLine, Text as SvgText } from "react-native-svg";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useThemeStore } from "../stores/themeStore";
import { API_URL } from "../constants";

const { width: SW } = Dimensions.get("window");

// ── Theme tokens ───────────────────────────────────────────────────────────────
const DARK = {
  bg: "#06080f", surface: "#0d1117", surface2: "#131929", card: "#0f1923",
  border: "#1e3a5f", accent: "#6366f1", accentSoft: "rgba(99,102,241,0.15)",
  gold: "#f59e0b", goldSoft: "rgba(245,158,11,0.12)", text: "#e8edf5",
  textMuted: "#7b9ab8", textDim: "#3d5878", green: "#10b981", red: "#ef4444", orange: "#f97316",
};
const LIGHT = {
  bg: "#f4f6fa", surface: "#ffffff", surface2: "#eef2f8", card: "#ffffff",
  border: "#cbd5e1", accent: "#4f46e5", accentSoft: "rgba(79,70,229,0.10)",
  gold: "#d97706", goldSoft: "rgba(217,119,6,0.10)", text: "#0f172a",
  textMuted: "#64748b", textDim: "#94a3b8", green: "#059669", red: "#dc2626", orange: "#ea580c",
};

// ── Astrology constants ────────────────────────────────────────────────────────
const SIGNS = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const SIGN_SHORT = ["Ari","Tau","Gem","Can","Leo","Vir","Lib","Sco","Sag","Cap","Aqu","Pis"];
const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// Pre-built static arrays — computed once at module load, never recreated
const YEARS: number[] = [];
for (let y = new Date().getFullYear(); y >= 1900; y--) YEARS.push(y);
const HOURS   = Array.from({length:24},(_,i)=>i);
const MINUTES = Array.from({length:60},(_,i)=>i);
const SECONDS = Array.from({length:60},(_,i)=>i);
const YEAR_ITEM_H = 44; // paddingVertical:11 + fontSize:16 lineHeight:22 = 44px

const PLANET_COLOR: Record<string,string> = {
  sun:"#f59e0b", moon:"#a78bfa", mars:"#ef4444", mercury:"#10b981",
  jupiter:"#f59e0b", venus:"#ec4899", saturn:"#64748b", rahu:"#6366f1", ketu:"#8b5cf6",
};
const PLANET_ABBR: Record<string,string> = {
  sun:"Su", moon:"Mo", mars:"Ma", mercury:"Me",
  jupiter:"Ju", venus:"Ve", saturn:"Sa", rahu:"Ra", ketu:"Ke",
};

// North Indian 4×4 grid: [row, col, house]
const NI_GRID: Array<[number,number,number]> = [
  [0,0,11],[0,1,12],[0,2,1],[0,3,2],
  [1,0,10],                 [1,3,3],
  [2,0,9],                  [2,3,4],
  [3,0,8],[3,1,7],[3,2,6],[3,3,5],
];

// ── Vedic astrology guidance data ────────────────────────────────────────────
const PLANET_RULERS: Record<number,string> = {
  0:"mars",1:"venus",2:"mercury",3:"moon",4:"sun",5:"mercury",
  6:"venus",7:"mars",8:"jupiter",9:"saturn",10:"saturn",11:"jupiter",
};
const PLANET_NUMBER: Record<string,number> = {
  sun:1,moon:2,mars:9,mercury:5,jupiter:3,venus:6,saturn:8,rahu:4,ketu:7,
};
const PLANET_COLORS_LUCKY: Record<string,string[]> = {
  sun:["Orange","Gold"],moon:["White","Silver"],mars:["Red","Coral"],
  mercury:["Green","Emerald"],jupiter:["Yellow","Cream"],venus:["White","Pink"],
  saturn:["Dark Blue","Black"],rahu:["Smoky Gray"],ketu:["Multi-color"],
};
const PLANET_GEMSTONE: Record<string,string> = {
  sun:"Ruby",moon:"Pearl",mars:"Red Coral",mercury:"Emerald",
  jupiter:"Yellow Sapphire",venus:"Diamond / White Sapphire",
  saturn:"Blue Sapphire",rahu:"Hessonite Garnet",ketu:"Cat's Eye",
};
const PLANET_MANTRA: Record<string,string> = {
  sun:"Om Hram Hrim Hraum Sah Suryaya Namah (108× at sunrise)",
  moon:"Om Shram Shrim Shraum Sah Chandraya Namah (108× on Monday)",
  mars:"Om Kram Krim Kraum Sah Bhaumaya Namah (108× on Tuesday)",
  mercury:"Om Bram Brim Braum Sah Budhaya Namah (108× on Wednesday)",
  jupiter:"Om Gram Grim Graum Sah Gurave Namah (108× on Thursday)",
  venus:"Om Dram Drim Draum Sah Shukraya Namah (108× on Friday)",
  saturn:"Om Pram Prim Praum Sah Shanaischaraya Namah (108× on Saturday)",
  rahu:"Om Bhram Bhrim Bhraum Sah Rahave Namah (18× daily)",
  ketu:"Om Shram Shrim Shraum Sah Ketave Namah (108× on Tuesday)",
};
const PLANET_FAST_DAY: Record<string,string> = {
  sun:"Sunday",moon:"Monday",mars:"Tuesday",mercury:"Wednesday",
  jupiter:"Thursday",venus:"Friday",saturn:"Saturday",rahu:"Saturday",ketu:"Tuesday",
};
const PLANET_CHARITY: Record<string,string> = {
  sun:"Wheat, jaggery, copper — donate to Brahmins on Sundays",
  moon:"Rice, milk, silver items — donate on Mondays",
  mars:"Red lentils, copper, red cloth — donate on Tuesdays",
  mercury:"Green moong dal, emerald-green cloth — donate on Wednesdays",
  jupiter:"Gram dal (chickpeas), turmeric, yellow cloth — donate on Thursdays",
  venus:"White rice, cow ghee, white cloth — donate on Fridays",
  saturn:"Black sesame seeds, iron, oil, black cloth — donate on Saturdays",
  rahu:"Coconut, dark cloth — donate to elderly on Saturdays",
  ketu:"Dog food, multi-color cloth — donate on Tuesdays",
};
const DASHA_SIGNIFICATION: Record<string,string> = {
  sun:"Authority, career, and identity come into focus. The Sun Mahadasha heightens leadership, ego, and your relationship with father figures. Government dealings, career advancement, and health are highlighted. Channel vitality purposefully — any recognition or promotion is likely now.",
  moon:"Emotions, intuition, and inner life take center stage. Your connection to your mother or maternal figures deepens. This reflective period is excellent for creative work, nurturing relationships, and travel near water. The mind is more receptive — use it to strengthen emotional intelligence.",
  mars:"A dynamic period of energy, ambition, and decisive action. Property matters, siblings, and physical ventures are highlighted. Passion runs high. Avoid impulsive decisions; discipline your Mars energy through regular exercise and purposeful goals.",
  mercury:"Intellect, communication, and commerce are highlighted. This is an excellent period for education, writing, business, and developing analytical skills. Short travels are likely. Your mind is sharp — use it for learning, networking, and new ventures.",
  jupiter:"A period of wisdom, expansion, and divine grace. Fortune opens doors in education, spirituality, finance, and through children. Jupiter's blessings attract new opportunities naturally. This is considered the most auspicious Mahadasha — embrace growth and share your wisdom with others.",
  venus:"Love, beauty, comfort, and relationships take priority. This period brings material pleasures, artistic pursuits, and romantic opportunities. Marriage or significant partnerships may form. Enjoy life's gifts while maintaining spiritual balance.",
  saturn:"A karmic period demanding discipline, patience, and service. Progress feels slow but what you build now is permanent. Release old patterns, serve others selflessly, and embrace simplicity. Saturn rewards sincere effort with lasting, tangible results.",
  rahu:"A period of ambition, transformation, and unconventional paths. Foreign influences, technology, and sudden changes feature prominently. Your desires intensify. Stay grounded and discerning — Rahu's gifts can come with illusion attached.",
  ketu:"A spiritual period of detachment and inner seeking. Material pursuits feel hollow. Past karma surfaces for resolution. This is the ideal time for meditation, pilgrimages, and moksha-oriented practices — trust the process of letting go and turning inward.",
};
const LOVE_BY_7TH: Record<number,{desc:string;remedy:string}> = {
  0:{desc:"Your 7th house falls in Aries, ruled by Mars. You attract energetic, bold, and courageous partners. Relationships begin with great passion and initiative. Learning to channel Mars fire into cooperation rather than competition sustains the bond.",
     remedy:"Offer red flowers at a Hanuman or Mangala temple on Tuesdays. Red coral (after a jyotishi consultation) can strengthen your relationship bhava and reduce conflict."},
  1:{desc:"Your 7th house falls in Taurus, ruled by Venus. You seek stable, sensual, and financially secure partners who value beauty and comfort. Long-term committed relationships suit you best. Your natural magnetism attracts devoted companions.",
     remedy:"Offer white lotus or white flowers to Goddess Lakshmi on Fridays. Wearing diamond or white sapphire (after proper consultation) strengthens the Venus energy in your 7th house."},
  2:{desc:"Your 7th house falls in Gemini, ruled by Mercury. Intellectual compatibility is your top priority — you need a partner who stimulates your mind. Variety and communication keep your relationships alive and thriving.",
     remedy:"Donate green items or green moong dal on Wednesdays. Recite the Mercury mantra for harmony in communication with your partner."},
  3:{desc:"Your 7th house falls in Cancer, ruled by the Moon. You deeply need emotional security from your partner. You attract sensitive, nurturing, and intuitive people. The bond is deeply karmic — an unspoken understanding defines your closest relationships.",
     remedy:"Offer milk to Lord Shiva on Mondays. Keep a silver item or moon yantra in your bedroom and light a white diya for marital harmony and emotional peace."},
  4:{desc:"Your 7th house falls in Leo, ruled by the Sun. You desire a confident, warm-hearted, and generous partner who commands respect. Mutual admiration and loyalty are the foundation of your partnerships. Power dynamics need conscious balancing.",
     remedy:"Offer water to the rising Sun each morning while facing East. Ruby or sunstone (after jyotishi consultation) can strengthen warmth and loyalty in your relationships."},
  5:{desc:"Your 7th house falls in Virgo, ruled by Mercury. You value reliability, practicality, and service-mindedness in a partner. Be mindful of over-analysis — learning to appreciate imperfection in your partner deepens intimacy and love.",
     remedy:"Donate green vegetables on Wednesdays. Practice gratitude journaling for your partner to overcome critical tendencies and invite more warmth into the relationship."},
  6:{desc:"Your 7th house falls in Libra, ruled by Venus — the most natural placement for partnership. Relationships are your greatest joy and focus. You attract refined, artistic, and balanced partners. A natural diplomat in love, you create harmony wherever you go.",
     remedy:"Worship Goddess Lakshmi with white lotus flowers on Fridays. Wearing white or light blue clothing attracts harmonious love energy and partnership blessings."},
  7:{desc:"Your 7th house falls in Scorpio, ruled by Mars and Ketu. Your relationships are intense, transformative, and deeply emotional. Trust issues may surface — building genuine vulnerability is the path to healing and lasting love.",
     remedy:"Offer red flowers to Mangala (Mars) on Tuesdays. Chant 'Om Mangalaya Namah' to reduce relationship intensity and bring clarity, trust, and mutual understanding."},
  8:{desc:"Your 7th house falls in Sagittarius, ruled by Jupiter. You seek a philosophical, adventurous, and spiritually aligned partner. Freedom is essential within relationships. Great fortune in marriage when the right person is found — Jupiter blesses this union.",
     remedy:"Offer turmeric or yellow flowers at a Vishnu temple on Thursdays. Yellow sapphire (after proper consultation and purification) blesses your marital fortune and harmony."},
  9:{desc:"Your 7th house falls in Capricorn, ruled by Saturn. Relationships tend to mature slowly, arrive later in life, or involve an older or more serious partner. Saturn's delay in love is purposeful — what comes will be deeply committed and lasting.",
     remedy:"Light sesame oil lamps for Shani Dev on Saturdays. Practice patience as your greatest remedy — trust Saturn's divine timing and avoid rushing into partnerships."},
  10:{desc:"Your 7th house falls in Aquarius, ruled by Saturn. You value equality, friendship, and freedom in relationships. Unconventional or long-distance relationships may be part of your love story. Finding someone who respects your individuality is key.",
     remedy:"Donate to social or community causes on Saturdays. Pray to Shani Dev for relationship clarity and for releasing past karma that may be limiting your love life."},
  11:{desc:"Your 7th house falls in Pisces, ruled by Jupiter. You seek a compassionate, spiritually attuned, and deeply empathetic partner. Love connections feel fated or divinely guided. Deep idealism in relationships — protect your heart while staying open.",
     remedy:"Offer yellow flowers at a Jupiter or Vishnu shrine on Thursdays. Practice loving-kindness meditation to align your energy with the compassionate partner your soul is seeking."},
};
const HEALTH_BY_6TH: Record<number,{desc:string;remedy:string}> = {
  0:{desc:"6th house in Aries — Mars governs your health sector. Be alert for head-related ailments, fevers, high blood pressure, and inflammatory conditions. The blood and muscular system need attention.",
     remedy:"Regular vigorous exercise channels Mars energy constructively. Donate red lentils on Tuesdays. Avoid excessive heat, spicy foods, and uncontrolled anger to maintain health."},
  1:{desc:"6th house in Taurus — Venus governs health. The throat, thyroid, neck, and digestive system need special attention. Rich, heavy, or overly sweet foods may create imbalance over time.",
     remedy:"Follow a plant-based, balanced diet with natural whole foods. Practice neck stretches and yoga poses for thyroid support. Donate white items on Fridays as a remedy."},
  2:{desc:"6th house in Gemini — Mercury governs your health house. The nervous system, lungs, respiratory health, and stress-related illness are primary concerns. Mental overactivity can manifest in the body.",
     remedy:"Daily Nadi Shodhana (alternate nostril pranayama) is highly beneficial. Reduce screen time before sleep. Chant the Mercury mantra for mental calm and nerve health."},
  3:{desc:"6th house in Cancer — the Moon governs health. Digestive health is closely tied to your emotional state. Stomach issues, water retention, and mood-driven eating patterns may arise.",
     remedy:"Eat home-cooked, fresh meals at regular times. Meditate during the full moon to release accumulated emotional tension. Fasting lightly on Mondays supports digestive balance."},
  4:{desc:"6th house in Leo — the Sun governs health. Heart health, spine, and the back require regular attention. Your vitality fluctuates with your emotional state and sense of purpose.",
     remedy:"Practice Surya Namaskar (Sun Salutation) daily at sunrise. Ensure adequate vitamin D and sunlight. Donate wheat or copper items on Sundays for solar health blessings."},
  5:{desc:"6th house in Virgo — Mercury strongly governs health here. Digestive disorders, food sensitivities, intestinal health, and nervous exhaustion are common patterns for this placement.",
     remedy:"Eat clean, easily digestible foods and establish consistent meal times. Avoid processed foods. Mercury mantra and green leafy vegetables actively support gut and nerve health."},
  6:{desc:"6th house in Libra — Venus governs health. Kidney health, lower back pain, hormonal balance, and the endocrine system need regular monitoring and support.",
     remedy:"Stay well-hydrated throughout the day. Practice lower back yoga poses (cat-cow, gentle twists). Donate white flowers to Goddess Lakshmi on Fridays for kidney health blessings."},
  7:{desc:"6th house in Scorpio — Mars and Ketu influence health. Reproductive system, detoxification pathways, elimination, and chronic hidden conditions need attention and periodic cleansing.",
     remedy:"Periodic light cleansing fasts support the detox pathways. Avoid toxins and processed foods. Offer water to Lord Shiva on Mondays and practice twisting yoga poses."},
  8:{desc:"6th house in Sagittarius — Jupiter governs health. Liver function, hips, thighs, and issues from overindulgence are the primary health themes. Excess in food or lifestyle creates imbalance.",
     remedy:"Maintain moderation in diet and lifestyle. Practice hip-opening yoga poses. Donate gram dal (chickpeas) or yellow items at temples on Thursdays for Jupiter health blessings."},
  9:{desc:"6th house in Capricorn — Saturn governs health. Joints, bones, skin, teeth, knees, and chronic slow-developing conditions may need attention. Cold and damp environments aggravate health.",
     remedy:"Regular low-impact exercise like walking, swimming, or yoga. Ensure adequate calcium and vitamin D intake. Sesame oil massage on Saturdays supports joint health and Saturn's blessings."},
  10:{desc:"6th house in Aquarius — Saturn influences health. The circulatory system, ankles, calves, and stress-related illness are key health areas. Irregular habits can accumulate over time.",
     remedy:"Establish a consistent sleep schedule and effective stress management practice. Restorative yoga and breathwork are highly beneficial. Donate to healthcare causes on Saturdays."},
  11:{desc:"6th house in Pisces — Jupiter governs health. Feet, lymphatic system, immune function, and energetic sensitivity need care. You absorb the energies around you easily — boundaries matter for health.",
     remedy:"Regular foot care, reflexology, and grounding practices are very beneficial. Establish healthy emotional and energetic boundaries. Light yellow items on Thursdays for immune strength."},
};

// ── Guidance computation ──────────────────────────────────────────────────────
function computeGuidance(k: any) {
  const ascSignIdx: number = k.ascendant?.signIndex ?? 0;
  const curMaha = k.dashas?.vimshottari?.find((d:any) => d.isCurrent);
  const curAntar = curMaha?.antardashas?.find((a:any) => a.isCurrent);
  const nakshatraLord: string = k.moonNakshatra?.lord ?? "moon";
  const luckyNumber: number = PLANET_NUMBER[nakshatraLord] ?? 7;
  const dashaLord: string = curMaha?.lord ?? PLANET_RULERS[ascSignIdx] ?? "jupiter";
  const ascRuler: string = PLANET_RULERS[ascSignIdx] ?? "jupiter";
  const luckyColors: string[] = [
    ...(PLANET_COLORS_LUCKY[dashaLord] ?? []),
    ...(PLANET_COLORS_LUCKY[ascRuler] ?? []),
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);
  const seventhSignIdx: number = (ascSignIdx + 6) % 12;
  const sixthSignIdx: number = (ascSignIdx + 5) % 12;
  const jupPlanet = k.planets?.find((p:any) => p.planet === "jupiter");
  const jupSignIdx: number = jupPlanet?.signIndex ?? 0;
  const currentYear = new Date().getFullYear();
  const luckyYears: number[] = [];
  for (let y = 0; y <= 12; y++) {
    const futureSign = (jupSignIdx + y) % 12;
    const houseFromLagna = (futureSign - ascSignIdx + 12) % 12;
    if ([0, 4, 8, 10].includes(houseFromLagna)) luckyYears.push(currentYear + y);
  }
  return { curMaha, curAntar, luckyNumber, luckyColors, seventhSignIdx, sixthSignIdx,
           dashaLord, nakshatraLord, luckyYears: luckyYears.slice(0, 4), ascRuler };
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Place {
  displayName:string; city:string; state:string; country:string;
  latitude:number; longitude:number; timezone:string; utcOffset:string; osmId?:string;
}
interface BirthForm {
  name:string; gender:"male"|"female"|"other";
  dob:string; time:string; placeQuery:string;
}
type Step = "input"|"places"|"confirm"|"loading"|"dashboard";
type DashTab = "overview"|"chart"|"navamsa"|"planets"|"dasha"|"guidance";

// ── API helpers ────────────────────────────────────────────────────────────────
async function apiPost(path:string, body:object) {
  const r = await fetch(`${API_URL}${path}`, {
    method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(body),
  });
  return r.json();
}
async function apiGet(path:string) {
  const r = await fetch(`${API_URL}${path}`);
  return r.json();
}

// ── Calendar helper fns ────────────────────────────────────────────────────────
function daysInMonth(y:number, m:number){ return new Date(y,m+1,0).getDate(); }
function firstWeekday(y:number, m:number){ return new Date(y,m,1).getDay(); }
function formatDob(dob:string):string {
  if (!dob) return "";
  const [y,mo,d] = dob.split("-").map(Number);
  const wd = new Date(y,mo-1,d).toLocaleDateString("en-US",{weekday:"long"});
  return `${String(d).padStart(2,"0")} ${MONTHS_LONG[mo-1]} ${y}  (${wd})`;
}

// ── Calendar Picker Modal ─────────────────────────────────────────────────────
// Year list uses FlatList with getItemLayout — only renders visible rows (~5),
// not all 127, so opening the picker is instant regardless of device speed.
const _today = new Date();
const _todayY = _today.getFullYear();
const _todayM = _today.getMonth();
const _todayD = _today.getDate();

function CalendarPicker({ t, visible, value, onChange, onClose }: {
  t:typeof DARK; visible:boolean; value:string; onChange:(v:string)=>void; onClose:()=>void;
}) {
  const initY = value ? +value.split("-")[0] : _todayY;
  const initM = value ? +value.split("-")[1]-1 : _todayM;

  const [vy, setVy] = useState(initY);
  const [vm, setVm] = useState(initM);
  const [yearMode, setYearMode] = useState(false);
  const yearListRef = useRef<FlatList<number>>(null);

  useEffect(() => {
    if (visible) {
      const cur  = value ? +value.split("-")[0] : _todayY;
      const curM = value ? +value.split("-")[1]-1 : _todayM;
      setVy(cur); setVm(curM); setYearMode(false);
    }
  }, [visible]);

  // Scroll year list to selected year when year mode opens
  useEffect(() => {
    if (yearMode) {
      const idx = YEARS.indexOf(vy);
      if (idx >= 0) {
        setTimeout(() => {
          yearListRef.current?.scrollToIndex({ index: idx, animated: false, viewPosition: 0.4 });
        }, 60);
      }
    }
  }, [yearMode]);

  const prevM = () => { if(vm===0){setVm(11);setVy(y=>y-1);}else setVm(m=>m-1); };
  const nextM = () => { if(vm===11){setVm(0);setVy(y=>y+1);}else setVm(m=>m+1); };

  // Build day-cell array — null for padding slots
  const totalDays = daysInMonth(vy, vm);
  const startDay  = firstWeekday(vy, vm);
  const cells = useMemo<(number|null)[]>(() => {
    const arr: (number|null)[] = [];
    for (let i=0; i<startDay; i++) arr.push(null);
    for (let i=1; i<=totalDays; i++) arr.push(i);
    while (arr.length < 42) arr.push(null);
    return arr;
  }, [vy, vm]);

  const toKey = (day:number) => `${vy}-${String(vm+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;

  // Cheap date comparisons — no Date construction per cell
  const isFuture = (day:number) =>
    vy > _todayY ||
    (vy === _todayY && vm > _todayM) ||
    (vy === _todayY && vm === _todayM && day > _todayD);
  const isToday = (day:number) => vy===_todayY && vm===_todayM && day===_todayD;
  const isSelected = (day:number) => value === toKey(day);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={ss.calOverlay} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[ss.calBox, {backgroundColor:t.card, borderColor:t.border}]}>
          {/* Month nav */}
          <View style={ss.calHead}>
            <TouchableOpacity onPress={prevM} style={ss.calNav}>
              <Ionicons name="chevron-back" size={20} color={t.text} />
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>setYearMode(m=>!m)} style={ss.calMonthBtn}>
              <Text style={[ss.calMonthTxt,{color:t.text}]}>{MONTHS_LONG[vm]} {vy}</Text>
              <Ionicons name={yearMode?"chevron-up":"chevron-down"} size={13} color={t.accent} />
            </TouchableOpacity>
            <TouchableOpacity onPress={nextM} style={ss.calNav}>
              <Ionicons name="chevron-forward" size={20} color={t.text} />
            </TouchableOpacity>
          </View>

          {yearMode ? (
            // FlatList virtualizes — only ~5 rows rendered at a time (not all 127)
            <FlatList<number>
              ref={yearListRef}
              data={YEARS}
              keyExtractor={y => String(y)}
              style={{ maxHeight: 220 }}
              showsVerticalScrollIndicator={false}
              getItemLayout={(_, index) => ({ length: YEAR_ITEM_H, offset: YEAR_ITEM_H * index, index })}
              onScrollToIndexFailed={({ index }) => {
                setTimeout(() => yearListRef.current?.scrollToIndex({ index, animated:false }), 100);
              }}
              renderItem={({ item: y }) => (
                <TouchableOpacity onPress={() => { setVy(y); setYearMode(false); }}
                  style={[ss.yearRow, y===vy && { backgroundColor: t.accentSoft }]}>
                  <Text style={[ss.yearTxt, { color: y===vy ? t.accent : t.text }]}>{y}</Text>
                </TouchableOpacity>
              )}
            />
          ) : (
            <>
              <View style={ss.calWdRow}>
                {WEEKDAYS_SHORT.map(d=>(
                  <Text key={d} style={[ss.calWdTxt,{color:t.textMuted}]}>{d}</Text>
                ))}
              </View>
              <View style={ss.calGrid}>
                {cells.map((day,i) => {
                  const sel = !!day && isSelected(day);
                  const tod = !!day && isToday(day);
                  const fut = !!day && isFuture(day);
                  return (
                    <TouchableOpacity key={i} disabled={!day||fut}
                      onPress={()=>day&&!fut&&(onChange(toKey(day)),onClose())}
                      style={[ss.calCell, sel&&{backgroundColor:t.accent}, tod&&!sel&&{borderWidth:1,borderColor:t.accent}]}>
                      {!!day&&(
                        <Text style={[ss.calCellTxt,{
                          color: sel?"#fff" : fut?t.textDim : tod?t.accent : t.text,
                          fontWeight: sel||tod?"800":"400",
                        }]}>{day}</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          <TouchableOpacity onPress={onClose} style={[ss.calCancelRow,{borderTopColor:t.border}]}>
            <Text style={{color:t.textMuted,fontSize:14}}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Time Wheel Picker Modal ───────────────────────────────────────────────────
const WHEEL_ITEM_H = 46;
const WHEEL_VISIBLE = 5;

function WheelCol({ t, scrollRef, values, selected, onScroll, label }: any) {
  return (
    <View style={ss.wheelCol}>
      <Text style={[ss.wheelLabel,{color:t.textMuted}]}>{label}</Text>
      <View style={{height:WHEEL_ITEM_H*WHEEL_VISIBLE,overflow:"hidden"}}>
        <View style={[ss.wheelHighlight,{top:WHEEL_ITEM_H*2,borderColor:t.accent}]} pointerEvents="none" />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={WHEEL_ITEM_H}
          decelerationRate="fast"
          contentContainerStyle={{paddingVertical:WHEEL_ITEM_H*2}}
          onMomentumScrollEnd={onScroll}
          onScrollEndDrag={onScroll}
        >
          {values.map((v:number) => (
            <View key={v} style={[ss.wheelItem,{height:WHEEL_ITEM_H}]}>
              <Text style={[ss.wheelItemTxt,{
                color: v===selected ? t.accent : t.textMuted,
                fontWeight: v===selected ? "800":"400",
                fontSize: v===selected ? 24 : 17,
              }]}>{String(v).padStart(2,"0")}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function TimeWheelPicker({ t, visible, value, onChange, onClose }: {
  t:typeof DARK; visible:boolean; value:string; onChange:(v:string)=>void; onClose:()=>void;
}) {
  const parse = (v:string) => {
    const [h=0,m=0,s=0] = (v||"00:00:00").split(":").map(Number);
    return {h,m,s};
  };
  const {h:ih,m:im,s:is} = parse(value);
  const [hour,setHour]     = useState(ih);
  const [minute,setMinute] = useState(im);
  const [second,setSecond] = useState(is);

  const hourRef = useRef<ScrollView>(null);
  const minRef  = useRef<ScrollView>(null);
  const secRef  = useRef<ScrollView>(null);

  // HOURS/MINUTES/SECONDS are module-level constants — not recreated on each render

  useEffect(() => {
    if (visible) {
      const {h,m,s} = parse(value);
      setHour(h); setMinute(m); setSecond(s);
      // 300ms: wait for the bottom-sheet slide animation to finish before scrolling
      setTimeout(() => {
        hourRef.current?.scrollTo({y:h*WHEEL_ITEM_H,animated:false});
        minRef.current?.scrollTo({y:m*WHEEL_ITEM_H,animated:false});
        secRef.current?.scrollTo({y:s*WHEEL_ITEM_H,animated:false});
      }, 300);
    }
  }, [visible]);

  const mkScroll = (setter:(n:number)=>void, arr:number[]) =>
    (e:NativeSyntheticEvent<NativeScrollEvent>) => {
      const idx = Math.round(e.nativeEvent.contentOffset.y / WHEEL_ITEM_H);
      setter(arr[Math.max(0,Math.min(idx,arr.length-1))]);
    };

  const confirm = () => {
    onChange(`${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:${String(second).padStart(2,"0")}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity activeOpacity={1} style={ss.tpOverlay} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={[ss.tpBox,{backgroundColor:t.card,borderColor:t.border}]}>
          <Text style={[ss.tpTitle,{color:t.text}]}>Set Birth Time</Text>
          <Text style={[ss.tpSub,{color:t.textMuted}]}>Scroll each column to set the exact time</Text>

          <View style={ss.wheelRow}>
            <WheelCol t={t} scrollRef={hourRef}   values={HOURS}   selected={hour}   label="Hour"   onScroll={mkScroll(setHour,HOURS)} />
            <Text style={[ss.wheelColon,{color:t.textMuted}]}>:</Text>
            <WheelCol t={t} scrollRef={minRef}    values={MINUTES} selected={minute} label="Min"    onScroll={mkScroll(setMinute,MINUTES)} />
            <Text style={[ss.wheelColon,{color:t.textMuted}]}>:</Text>
            <WheelCol t={t} scrollRef={secRef}    values={SECONDS} selected={second} label="Sec"    onScroll={mkScroll(setSecond,SECONDS)} />
          </View>

          {/* Preview */}
          <View style={[ss.tpPreview,{backgroundColor:t.accentSoft,borderColor:t.accent}]}>
            <MaterialCommunityIcons name="clock-time-four-outline" size={16} color={t.accent} />
            <Text style={[ss.tpPreviewTxt,{color:t.accent}]}>
              {String(hour).padStart(2,"0")}:{String(minute).padStart(2,"0")}:{String(second).padStart(2,"0")}
            </Text>
            <Text style={[{color:t.textMuted,fontSize:11}]}>
              {hour<12?"AM":"PM"}  ·  {hour>12?hour-12:hour||12}:{String(minute).padStart(2,"0")} {hour<12?"AM":"PM"}
            </Text>
          </View>

          <View style={{flexDirection:"row",gap:10,marginTop:12}}>
            <TouchableOpacity onPress={onClose} style={[ss.tpCancel,{borderColor:t.border}]}>
              <Text style={{color:t.textMuted,fontSize:15,fontWeight:"600"}}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirm} style={[ss.tpConfirm,{backgroundColor:t.accent}]}>
              <Text style={{color:"#fff",fontSize:15,fontWeight:"800"}}>Confirm Time</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function KundliScreen() {
  const router = useRouter();
  const isDark = useThemeStore((s) => s.isDark);
  const t = isDark ? DARK : LIGHT;

  const [step,setStep]         = useState<Step>("input");
  const [form,setForm]         = useState<BirthForm>({name:"",gender:"male",dob:"",time:"",placeQuery:""});
  const [places,setPlaces]     = useState<Place[]>([]);
  const [selPlace,setSelPlace] = useState<Place|null>(null);
  const [kundli,setKundli]     = useState<any>(null);
  const [error,setError]       = useState<string>("");
  const [searching,setSearching] = useState(false);
  const [tab,setTab]           = useState<DashTab>("overview");
  const [showCal,setShowCal]   = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const sf = (k:keyof BirthForm) => (v:string) => setForm(p=>({...p,[k]:v}));

  // Debounced place search
  const onPlaceChange = useCallback((v:string) => {
    setForm(p=>({...p,placeQuery:v}));
    setSelPlace(null);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (v.trim().length<2) { setPlaces([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await apiGet(`/kundli/places?q=${encodeURIComponent(v)}`);
        if (res.success) setPlaces(res.data??[]);
      } finally { setSearching(false); }
    }, 400);
  },[]);

  const selectPlace = (p:Place) => {
    setSelPlace(p);
    setForm(prev=>({...prev,placeQuery:`${p.city||p.displayName.split(",")[0]}, ${p.state?p.state+", ":""}${p.country}`}));
    setPlaces([]);
    setStep("confirm");
  };

  const calculate = async () => {
    if (!selPlace) return;
    setStep("loading"); setError("");
    try {
      const res = await apiPost("/kundli/calculate",{
        name:form.name, gender:form.gender, dob:form.dob,
        time:form.time.length===5?`${form.time}:00`:form.time,
        latitude:selPlace.latitude, longitude:selPlace.longitude,
        timezone:selPlace.timezone,
        placeLabel:`${selPlace.city||selPlace.displayName.split(",")[0]}, ${selPlace.country}`,
      });
      if (res.success) { setKundli(res.data); setStep("dashboard"); }
      else { setError(res.error?.message??"Calculation failed."); setStep("confirm"); }
    } catch { setError("Network error. Check your connection."); setStep("confirm"); }
  };

  const goToPlaces = () => {
    if (!form.name.trim())                          { setError("Please enter your name."); return; }
    if (!form.dob.match(/^\d{4}-\d{2}-\d{2}$/))    { setError("Please select your date of birth."); return; }
    if (!form.time.match(/^\d{2}:\d{2}/))           { setError("Please set your birth time."); return; }
    if (!selPlace && form.placeQuery.trim().length<2){ setError("Enter and select a birth place."); return; }
    setError("");
    if (selPlace) { setStep("confirm"); return; }
    setStep("places");
  };

  const s = useMemo(()=>makeStyles(t),[isDark]);

  if (step==="input") return (
    <>
      <CalendarPicker t={t} visible={showCal} value={form.dob} onClose={()=>setShowCal(false)}
        onChange={v=>{ setForm(p=>({...p,dob:v})); setShowCal(false); }} />
      <InputStep t={t} s={s} form={form} sf={sf} error={error}
        onPlaceChange={onPlaceChange} places={places} searching={searching}
        selectPlace={selectPlace} goToPlaces={goToPlaces}
        selPlace={selPlace}
        onClearPlace={()=>{ setSelPlace(null); setPlaces([]); setForm(p=>({...p,placeQuery:""})); }}
        onOpenCalendar={()=>setShowCal(true)}
        onBack={()=>router.back()} />
    </>
  );

  if (step==="places") return (
    <PlacesStep t={t} s={s} query={form.placeQuery}
      places={places} searching={searching} selectPlace={selectPlace} onBack={()=>setStep("input")} />
  );

  if (step==="confirm"&&selPlace) return (
    <ConfirmStep t={t} s={s} form={form} place={selPlace}
      error={error} onBack={()=>setStep("input")} onCalculate={calculate} />
  );

  if (step==="loading") return <LoadingStep t={t} />;

  if (step==="dashboard"&&kundli) return (
    <Dashboard t={t} s={s} kundli={kundli} tab={tab} setTab={setTab} onBack={()=>setStep("input")} />
  );

  return <LoadingStep t={t} />;
}

// ── Step 1: Birth Input ────────────────────────────────────────────────────────
function InputStep({ t, s, form, sf, error, onPlaceChange, places, searching, selectPlace, goToPlaces, selPlace, onClearPlace, onOpenCalendar, onOpenTime, onBack }: any) {
  return (
    <SafeAreaView style={[s.flex,{backgroundColor:t.bg}]}>
      <KeyboardAvoidingView behavior={Platform.OS==="ios"?"padding":"height"} style={s.flex}>
        <ScrollView contentContainerStyle={s.inputScroll} keyboardShouldPersistTaps="handled">
          <View style={s.header}>
            <TouchableOpacity onPress={onBack} style={s.backBtn}>
              <Ionicons name="arrow-back" size={22} color={t.textMuted} />
            </TouchableOpacity>
            <View style={s.headerStar}>
              <MaterialCommunityIcons name="star-four-points" size={26} color={t.accent} />
            </View>
          </View>

          <Text style={[s.heroTitle,{color:t.text}]}>Discover Your{"\n"}Cosmic Blueprint</Text>
          <Text style={[s.heroSub,{color:t.textMuted}]}>
            Worldwide Vedic astrology · Lahiri ayanamsa · Whole Sign houses
          </Text>

          {/* Name */}
          <FieldLabel t={t} label="Full Name" icon="person-outline" />
          <TextInput style={[s.input,{backgroundColor:t.surface,borderColor:t.border,color:t.text}]}
            placeholder="Enter your full name" placeholderTextColor={t.textDim}
            value={form.name} onChangeText={sf("name")} autoCapitalize="words" returnKeyType="next" />

          {/* Gender */}
          <FieldLabel t={t} label="Gender" icon="male-female-outline" />
          <View style={s.genderRow}>
            {(["male","female","other"] as const).map(g=>(
              <TouchableOpacity key={g} onPress={()=>sf("gender")(g)}
                style={[s.genderChip,form.gender===g&&{backgroundColor:t.accentSoft,borderColor:t.accent}]}>
                <Text style={[s.genderTxt,{color:form.gender===g?t.accent:t.textMuted}]}>
                  {g.charAt(0).toUpperCase()+g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Date of Birth — calendar picker */}
          <FieldLabel t={t} label="Date of Birth" icon="calendar-outline" />
          <TouchableOpacity onPress={onOpenCalendar}
            style={[s.pickerField,{backgroundColor:t.surface,borderColor:form.dob?t.accent:t.border}]}>
            <Ionicons name="calendar" size={17} color={form.dob?t.accent:t.textDim} />
            {form.dob ? (
              <Text style={[s.pickerValue,{color:t.text}]}>{formatDob(form.dob)}</Text>
            ) : (
              <Text style={[s.pickerPlaceholder,{color:t.textDim}]}>Tap to select birth date</Text>
            )}
            <Ionicons name="chevron-down" size={14} color={t.textDim} />
          </TouchableOpacity>

          {/* Time of Birth — direct numeric input */}
          <FieldLabel t={t} label="Time of Birth" icon="time-outline" />
          <View style={[s.pickerField,{backgroundColor:t.surface,borderColor:form.time?t.accent:t.border}]}>
            <Ionicons name="time" size={17} color={form.time?t.accent:t.textDim} />
            <TextInput
              style={[{flex:1,color:t.text,fontSize:15,fontWeight:"600"}]}
              placeholder="HH:MM  (e.g. 14:30)"
              placeholderTextColor={t.textDim}
              value={form.time}
              onChangeText={(raw) => {
                const digits = raw.replace(/[^0-9]/g, "");
                let formatted = digits;
                if (digits.length > 2) formatted = digits.slice(0,2) + ":" + digits.slice(2,4);
                sf("time")(formatted);
              }}
              keyboardType="numeric"
              maxLength={5}
              returnKeyType="done"
            />
            {form.time.length >= 5 && (
              <Text style={{color:t.textMuted,fontSize:12,marginRight:4}}>
                {+form.time.split(":")[0] < 12 ? "AM" : "PM"}
              </Text>
            )}
          </View>
          <Text style={[{color:t.textDim,fontSize:10,marginTop:4,marginLeft:4}]}>
            24-hr format · Unknown time? Type 12:00
          </Text>

          {/* Birth place */}
          <FieldLabel t={t} label="Birth Place" icon="location-outline" />
          <View style={[s.placeSearchBox,{backgroundColor:t.surface,borderColor:selPlace?t.accent:t.border}]}>
            <Ionicons name="search" size={16} color={t.textDim} style={{marginLeft:4}} />
            <TextInput style={[s.placeSearchInput,{color:t.text}]}
              placeholder="Search city, town or village worldwide..." placeholderTextColor={t.textDim}
              value={form.placeQuery} onChangeText={onPlaceChange} returnKeyType="search" />
            {!!form.placeQuery&&(
              <TouchableOpacity onPress={onClearPlace} style={s.placeSearchClear}>
                <Ionicons name="close-circle" size={16} color={t.textDim} />
              </TouchableOpacity>
            )}
            {searching && <ActivityIndicator size="small" color={t.accent} style={{marginRight:8}} />}
          </View>
          {!!selPlace&&(
            <View style={[ss.selectedPlace,{backgroundColor:t.accentSoft,borderColor:t.accent}]}>
              <Ionicons name="checkmark-circle" size={14} color={t.accent} />
              <Text style={[{color:t.accent,fontSize:12,fontWeight:"700",flex:1}]} numberOfLines={1}>
                {selPlace.city}, {selPlace.country}  ·  {selPlace.timezone}
              </Text>
            </View>
          )}

          {/* Inline place results */}
          {places.length>0&&(
            <View style={[s.placeCard,{backgroundColor:t.surface,borderColor:t.border}]}>
              {places.map((p:Place,i:number)=>(
                <TouchableOpacity key={i} onPress={()=>selectPlace(p)}
                  style={[s.placeRow,i<places.length-1&&{borderBottomWidth:1,borderColor:t.border}]}>
                  <Ionicons name="location" size={14} color={t.accent} style={{marginTop:2}} />
                  <View style={{flex:1}}>
                    <Text style={[s.placeCity,{color:t.text}]} numberOfLines={1}>
                      {p.city||p.displayName.split(",")[0]}
                    </Text>
                    <Text style={[s.placeDetail,{color:t.textMuted}]} numberOfLines={1}>
                      {[p.state,p.country].filter(Boolean).join(", ")}
                    </Text>
                  </View>
                  <Text style={[s.placeTz,{color:t.accent,fontSize:10}]}>{p.utcOffset}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {!!error&&<Text style={[s.errorTxt,{color:t.red}]}>{error}</Text>}

          <TouchableOpacity style={[s.cta,{backgroundColor:t.accent}]} onPress={goToPlaces} activeOpacity={0.85}>
            <Text style={s.ctaTxt}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          <Text style={[s.disclaimerTxt,{color:t.textDim}]}>
            Calculations use Lahiri ayanamsa · Whole Sign houses · Mean Rahu/Ketu · astronomy-engine
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Step 2: Places full-screen list ───────────────────────────────────────────
function PlacesStep({ t, s, query, places, searching, selectPlace, onBack }: any) {
  return (
    <SafeAreaView style={[s.flex,{backgroundColor:t.bg}]}>
      <View style={s.subHeader}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={t.textMuted} />
        </TouchableOpacity>
        <Text style={[s.subHeaderTxt,{color:t.text}]}>Select Birth Place</Text>
      </View>
      <Text style={[s.subHeaderSub,{color:t.textMuted,paddingHorizontal:20}]}>
        Showing results for "{query}"
      </Text>
      {searching
        ? <ActivityIndicator color={t.accent} style={{marginTop:40}} />
        : places.length===0
          ? <Text style={{color:t.textMuted,textAlign:"center",marginTop:40,fontSize:14}}>
              No places found. Try a different spelling.
            </Text>
          : (
            <FlatList data={places} keyExtractor={(_,i)=>String(i)}
              contentContainerStyle={{padding:16,gap:10}}
              renderItem={({item:p})=>(
                <TouchableOpacity onPress={()=>selectPlace(p)}
                  style={[s.placeListCard,{backgroundColor:t.card,borderColor:t.border}]}>
                  <View style={[s.placeListIcon,{backgroundColor:t.accentSoft}]}>
                    <Ionicons name="location" size={18} color={t.accent} />
                  </View>
                  <View style={{flex:1}}>
                    <Text style={[s.placeCity,{color:t.text,fontSize:15}]} numberOfLines={1}>
                      {p.city||p.displayName.split(",")[0]}
                    </Text>
                    <Text style={[s.placeDetail,{color:t.textMuted}]} numberOfLines={1}>
                      {[p.state,p.country].filter(Boolean).join(", ")}
                    </Text>
                    <View style={{flexDirection:"row",gap:10,marginTop:4}}>
                      <Text style={{color:t.textDim,fontSize:10}}>{p.latitude.toFixed(4)}° {p.longitude.toFixed(4)}°</Text>
                      <Text style={{color:t.accent,fontSize:10}}>{p.timezone}</Text>
                      <Text style={{color:t.textDim,fontSize:10}}>UTC {p.utcOffset}</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={t.textDim} />
                </TouchableOpacity>
              )}
            />
          )
      }
    </SafeAreaView>
  );
}

// ── Step 3: Confirm ────────────────────────────────────────────────────────────
function ConfirmStep({ t, s, form, place, error, onBack, onCalculate }: any) {
  return (
    <SafeAreaView style={[s.flex,{backgroundColor:t.bg}]}>
      <ScrollView contentContainerStyle={{padding:20,gap:16}}>
        <View style={s.subHeader}>
          <TouchableOpacity onPress={onBack} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={t.textMuted} />
          </TouchableOpacity>
          <Text style={[s.subHeaderTxt,{color:t.text}]}>Confirm Birth Moment</Text>
        </View>
        <View style={[s.confirmBadge,{backgroundColor:t.accentSoft,borderColor:t.accent}]}>
          <MaterialCommunityIcons name="check-decagram" size={22} color={t.accent} />
          <Text style={[s.confirmBadgeTxt,{color:t.accent}]}>Birth location confirmed</Text>
        </View>
        <View style={[s.confirmCard,{backgroundColor:t.card,borderColor:t.border}]}>
          <ConfirmRow t={t} icon="person-outline" label="Name" value={form.name} />
          <ConfirmRow t={t} icon="calendar-outline" label="Date" value={formatDob(form.dob)} />
          <ConfirmRow t={t} icon="time-outline" label="Time" value={form.time} />
          <ConfirmRow t={t} icon="location-outline" label="Place"
            value={`${place.city||place.displayName.split(",")[0]}, ${place.country}`} />
          <ConfirmRow t={t} icon="navigate-outline" label="Coordinates"
            value={`${place.latitude.toFixed(4)}°  ${place.longitude.toFixed(4)}°`} />
          <ConfirmRow t={t} icon="earth-outline" label="Timezone" value={place.timezone} />
          <ConfirmRow t={t} icon="swap-horizontal-outline" label="UTC Offset" value={`UTC ${place.utcOffset}`} last />
        </View>
        <View style={[s.utcNote,{backgroundColor:t.surface2,borderColor:t.border}]}>
          <Ionicons name="information-circle-outline" size={15} color={t.textMuted} />
          <Text style={[s.utcNoteTxt,{color:t.textMuted}]}>
            Historical timezone rules and DST are applied at the exact birth date for pinpoint accuracy.
          </Text>
        </View>
        {!!error&&<Text style={[s.errorTxt,{color:t.red}]}>{error}</Text>}
        <TouchableOpacity style={[s.cta,{backgroundColor:t.accent}]} onPress={onCalculate} activeOpacity={0.85}>
          <MaterialCommunityIcons name="star-four-points" size={18} color="#fff" />
          <Text style={s.ctaTxt}>Generate My Kundli</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ConfirmRow({ t, icon, label, value, last }: any) {
  return (
    <View style={[{flexDirection:"row",alignItems:"center",gap:12,paddingVertical:11},
      !last&&{borderBottomWidth:1,borderBottomColor:t.border}]}>
      <Ionicons name={icon} size={15} color={t.textMuted} />
      <Text style={{color:t.textMuted,fontSize:12,width:82}}>{label}</Text>
      <Text style={{color:t.text,fontSize:13,fontWeight:"600",flex:1}}>{value}</Text>
    </View>
  );
}

// ── Loading ────────────────────────────────────────────────────────────────────
function LoadingStep({ t }: any) {
  return (
    <View style={{flex:1,backgroundColor:t?.bg??"#06080f",alignItems:"center",justifyContent:"center",gap:20}}>
      <MaterialCommunityIcons name="star-four-points-outline" size={52} color={t?.accent??"#6366f1"} />
      <ActivityIndicator size="large" color={t?.accent??"#6366f1"} />
      <Text style={{color:t?.text??"#e8edf5",fontSize:16,fontWeight:"600"}}>Calculating your chart...</Text>
      <Text style={{color:t?.textMuted??"#7b9ab8",fontSize:13}}>Consulting the stars</Text>
    </View>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ t, s, kundli, tab, setTab, onBack }: any) {
  const TABS: Array<{id:DashTab;label:string;icon:string}> = [
    {id:"overview", label:"Overview", icon:"home-outline"},
    {id:"chart",    label:"D1 Chart", icon:"grid-outline"},
    {id:"navamsa",  label:"D9 Chart", icon:"apps-outline"},
    {id:"planets",  label:"Planets",  icon:"planet-outline"},
    {id:"dasha",    label:"Dasha",    icon:"timer-outline"},
    {id:"guidance", label:"Guidance", icon:"sparkles-outline"},
  ];
  return (
    <SafeAreaView style={[s.flex,{backgroundColor:t.bg}]}>
      <View style={[s.dashHeader,{borderBottomColor:t.border}]}>
        <TouchableOpacity onPress={onBack} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={t.textMuted} />
        </TouchableOpacity>
        <View style={{flex:1}}>
          <Text style={[s.dashName,{color:t.text}]} numberOfLines={1}>{kundli.person.name}</Text>
          <Text style={[s.dashSub,{color:t.textMuted}]}>
            {kundli.ascendant.signName} Lagna · {kundli.person.dob}
          </Text>
        </View>
        <MaterialCommunityIcons name="star-four-points" size={20} color={t.accent} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}
        style={[s.tabBarScroll,{backgroundColor:t.surface,borderBottomColor:t.border,borderBottomWidth:1}]}
        contentContainerStyle={{flexDirection:"row"}}>
        {TABS.map(tb=>(
          <TouchableOpacity key={tb.id} style={[s.tabBtn,tab===tb.id&&{borderBottomWidth:2,borderBottomColor:t.accent}]}
            onPress={()=>setTab(tb.id)}>
            <Ionicons name={tb.icon as any} size={15} color={tab===tb.id?t.accent:t.textMuted} />
            <Text style={[s.tabTxt,{color:tab===tb.id?t.accent:t.textMuted}]}>{tb.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {tab==="overview"&&<OverviewTab  t={t} s={s} k={kundli} />}
      {tab==="chart"   &&<ChartTab    t={t} s={s} k={kundli} />}
      {tab==="navamsa" &&<NavamsaTab  t={t} s={s} k={kundli} />}
      {tab==="planets" &&<PlanetsTab  t={t} s={s} k={kundli} />}
      {tab==="dasha"   &&<DashaTab    t={t} s={s} k={kundli} />}
      {tab==="guidance"&&<GuidanceTab t={t}     k={kundli} />}
    </SafeAreaView>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab({ t, s, k }: any) {
  const asc = k.ascendant;
  const moon = k.planets?.find((p:any)=>p.planet==="moon");
  const sun  = k.planets?.find((p:any)=>p.planet==="sun");
  const westernSunSign = sun ? SIGNS[Math.floor(sun.tropicalLongitude / 30) % 12] : null;
  const curMaha  = k.dashas?.vimshottari?.find((d:any)=>d.isCurrent);
  const curAntar = curMaha?.antardashas?.find((a:any)=>a.isCurrent);
  const activeYogas  = k.yogas?.filter((y:any)=>y.isPresent)??[];
  const activeDoshas = k.doshas?.filter((d:any)=>d.isPresent)??[];

  return (
    <ScrollView contentContainerStyle={{padding:16,gap:14}}>
      <View style={{flexDirection:"row",gap:10}}>
        <BigSignCard t={t} label="Lagna" sign={asc.signName} deg={`${asc.degree}°${asc.minute}'`} color={t.accent} />
        <BigSignCard t={t} label="Rashi" sign={moon?.signName??"-"} deg={moon?`${moon.degree}°${moon.minute}'`:"-"} color="#a78bfa" />
        <BigSignCard t={t} label="Sun (Vedic)" sign={sun?.signName??"-"} deg={sun?`${sun.degree}°${sun.minute}'`:"-"} color={t.gold} />
      </View>
      {westernSunSign && (
        <View style={{flexDirection:"row",alignItems:"center",gap:8,paddingHorizontal:4,paddingVertical:6,
          borderRadius:10,borderWidth:1,borderColor:t.border,backgroundColor:t.card,paddingLeft:12}}>
          <Text style={{fontSize:10,color:t.textMuted,fontWeight:"700",letterSpacing:0.5,textTransform:"uppercase"}}>
            Sun Sign (Western)
          </Text>
          <Text style={{fontSize:13,fontWeight:"900",color:"#d97706"}}>{westernSunSign}</Text>
          <Text style={{fontSize:10,color:t.textMuted}}>· Tropical zodiac</Text>
        </View>
      )}
      <View style={[s.infoCard,{backgroundColor:t.card,borderColor:t.border}]}>
        <Text style={[s.infoCardTitle,{color:t.textMuted}]}>Birth Star (Janma Nakshatra)</Text>
        <Text style={[s.infoCardVal,{color:t.text,fontSize:20}]}>{k.moonNakshatra?.name??"-"}</Text>
        <Text style={{color:t.textMuted,fontSize:12}}>
          Pada {k.moonNakshatra?.pada??"-"} · Lord: {cap(k.moonNakshatra?.lord??"")}
        </Text>
      </View>
      {curMaha&&(
        <View style={[s.infoCard,{backgroundColor:t.card,borderColor:t.accent}]}>
          <Text style={[s.infoCardTitle,{color:t.accent}]}>Current Dasha Period</Text>
          <Text style={[s.infoCardVal,{color:t.text,fontSize:18}]}>{curMaha.displayName} Mahadasha</Text>
          <Text style={{color:t.textMuted,fontSize:12,marginTop:3}}>{curMaha.startDate}  →  {curMaha.endDate}</Text>
          {curAntar&&(
            <View style={{marginTop:8,paddingTop:8,borderTopWidth:1,borderColor:t.border}}>
              <Text style={{color:t.textMuted,fontSize:11}}>Antardasha (Bhukti)</Text>
              <Text style={{color:t.text,fontSize:14,fontWeight:"700",marginTop:2}}>
                {curAntar.displayName}  ·  {curAntar.startDate} → {curAntar.endDate}
              </Text>
            </View>
          )}
        </View>
      )}
      {activeYogas.length>0&&(
        <View style={[s.infoCard,{backgroundColor:t.card,borderColor:t.border}]}>
          <Text style={[s.infoCardTitle,{color:t.textMuted}]}>Active Yogas</Text>
          {activeYogas.map((y:any)=>(
            <View key={y.name} style={{paddingVertical:6,borderBottomWidth:1,borderColor:t.border}}>
              <Text style={{color:t.green,fontSize:13,fontWeight:"700"}}>{y.name}</Text>
              <Text style={{color:t.textMuted,fontSize:11,marginTop:2}} numberOfLines={2}>{y.significance}</Text>
            </View>
          ))}
        </View>
      )}
      {activeDoshas.length>0&&(
        <View style={[s.infoCard,{backgroundColor:t.card,borderColor:t.border}]}>
          <Text style={[s.infoCardTitle,{color:t.textMuted}]}>Doshas</Text>
          {activeDoshas.map((d:any)=>(
            <View key={d.name} style={{paddingVertical:6,borderBottomWidth:1,borderColor:t.border}}>
              <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                <Text style={{color:t.orange,fontSize:13,fontWeight:"700"}}>{d.name}</Text>
                <View style={{backgroundColor:"rgba(249,115,22,0.12)",borderRadius:6,paddingHorizontal:6,paddingVertical:2}}>
                  <Text style={{color:t.orange,fontSize:10,fontWeight:"700"}}>{d.severity?.toUpperCase()}</Text>
                </View>
              </View>
              <Text style={{color:t.textMuted,fontSize:11,marginTop:2}} numberOfLines={2}>{d.description}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={[s.calcInfo,{backgroundColor:t.surface2,borderColor:t.border}]}>
        <Text style={{color:t.textDim,fontSize:10}}>
          Engine: {k.calculation?.engine}  ·  Ayanamsa: Lahiri {k.calculation?.ayanamsaValue?.toFixed(4)}°
        </Text>
        <Text style={{color:t.textDim,fontSize:10,marginTop:2}}>
          JD: {k.calculation?.julianDayUT?.toFixed(5)}  ·  Fingerprint: {k.fingerprint?.slice(0,16)}
        </Text>
      </View>
    </ScrollView>
  );
}

function cap(s:string){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : ""; }
function BigSignCard({ t, label, sign, deg, color }: any) {
  return (
    <View style={[{flex:1,borderRadius:14,padding:12,borderWidth:1,alignItems:"center"},
      {backgroundColor:t.card,borderColor:t.border}]}>
      <Text style={{fontSize:10,color:t.textMuted,fontWeight:"600",letterSpacing:0.5,textTransform:"uppercase",marginBottom:4}}>{label}</Text>
      <Text style={{fontSize:15,fontWeight:"900",color}}>{sign}</Text>
      <Text style={{fontSize:10,color:t.textMuted,marginTop:3}}>{deg}</Text>
    </View>
  );
}

// ── NI Chart SVG — shared by D1 and D9 ───────────────────────────────────────
type ChartPE = { abbr: string; deg: number; pKey: string; retro: boolean; };

function NiChartSvg({ t, signPlanets, ascSignIdx, centerName, centerSub, centerDate }: {
  t: typeof DARK;
  signPlanets: Record<number, ChartPE[]>;
  ascSignIdx: number;
  centerName: string;
  centerSub: string;
  centerDate?: string;
}) {
  const SIZE = Math.min(SW - 32, 344);
  const MID  = SIZE / 2;
  const houseSign = (h: number) => (ascSignIdx + h - 1) % 12;

  const textC   = t.text;
  const mutedC  = t.textMuted;
  const accentC = t.accent;
  const cardC   = t.card;
  const isDarkBg = t.bg === "#06080f";
  const lineC   = isDarkBg ? "rgba(251,146,60,0.75)" : "rgba(234,88,12,0.70)";

  // Planet anchor (centroid) per house — scaled from web's 480×480 design
  const HOUSE_ANCHORS: Record<number, [number, number]> = {
    1:  [MID,              SIZE * 0.250],
    2:  [SIZE * 0.250,     SIZE * 0.108],
    3:  [SIZE * 0.108,     SIZE * 0.250],
    4:  [SIZE * 0.250,     MID         ],
    5:  [SIZE * 0.108,     SIZE * 0.750],
    6:  [SIZE * 0.250,     SIZE * 0.892],
    7:  [MID,              SIZE * 0.750],
    8:  [SIZE * 0.750,     SIZE * 0.892],
    9:  [SIZE * 0.892,     SIZE * 0.750],
    10: [SIZE * 0.750,     MID         ],
    11: [SIZE * 0.892,     SIZE * 0.250],
    12: [SIZE * 0.750,     SIZE * 0.108],
  };

  // Rashi (sign) number label positions near the outer boundary of each house
  const RASHI_POS: Record<number, [number, number]> = {
    1:  [MID,              SIZE * 0.050],
    2:  [SIZE * 0.210,     SIZE * 0.092],
    3:  [SIZE * 0.062,     SIZE * 0.210],
    4:  [SIZE * 0.046,     MID         ],
    5:  [SIZE * 0.062,     SIZE * 0.785],
    6:  [SIZE * 0.210,     SIZE * 0.948],
    7:  [MID,              SIZE * 0.955],
    8:  [SIZE * 0.785,     SIZE * 0.948],
    9:  [SIZE * 0.948,     SIZE * 0.785],
    10: [SIZE * 0.955,     MID         ],
    11: [SIZE * 0.948,     SIZE * 0.210],
    12: [SIZE * 0.785,     SIZE * 0.092],
  };

  return (
    <Svg width={SIZE} height={SIZE}>
      {/* Background */}
      <Rect x={0} y={0} width={SIZE} height={SIZE} fill={cardC} rx={4} />

      {/* Outer border */}
      <Rect x={0.75} y={0.75} width={SIZE - 1.5} height={SIZE - 1.5}
        fill="none" stroke={lineC} strokeWidth={1.5} />

      {/* ── Traditional North Indian diamond structure ─────────────────
          8 corner lines (each corner → center + half-edge midpoint)
          ──────────────────────────────────────────────────────────── */}
      {/* Top-left corner */}
      <SvgLine x1={0}    y1={0}    x2={MID}  y2={MID}  stroke={lineC} strokeWidth={1.5} />
      <SvgLine x1={0}    y1={0}    x2={MID}  y2={0}    stroke={lineC} strokeWidth={1.5} />
      {/* Top-right corner */}
      <SvgLine x1={SIZE} y1={0}    x2={MID}  y2={MID}  stroke={lineC} strokeWidth={1.5} />
      <SvgLine x1={SIZE} y1={0}    x2={MID}  y2={0}    stroke={lineC} strokeWidth={1.5} />
      {/* Bottom-left corner */}
      <SvgLine x1={0}    y1={SIZE} x2={MID}  y2={MID}  stroke={lineC} strokeWidth={1.5} />
      <SvgLine x1={0}    y1={SIZE} x2={MID}  y2={SIZE} stroke={lineC} strokeWidth={1.5} />
      {/* Bottom-right corner */}
      <SvgLine x1={SIZE} y1={SIZE} x2={MID}  y2={MID}  stroke={lineC} strokeWidth={1.5} />
      <SvgLine x1={SIZE} y1={SIZE} x2={MID}  y2={SIZE} stroke={lineC} strokeWidth={1.5} />

      {/* ── Central diamond (midpoints connected) ─────────────────── */}
      <SvgLine x1={MID}  y1={0}    x2={SIZE} y2={MID}  stroke={lineC} strokeWidth={1.5} />
      <SvgLine x1={SIZE} y1={MID}  x2={MID}  y2={SIZE} stroke={lineC} strokeWidth={1.5} />
      <SvgLine x1={MID}  y1={SIZE} x2={0}    y2={MID}  stroke={lineC} strokeWidth={1.5} />
      <SvgLine x1={0}    y1={MID}  x2={MID}  y2={0}    stroke={lineC} strokeWidth={1.5} />

      {/* ── 12 houses ─────────────────────────────────────────────── */}
      {Array.from({length: 12}, (_, i) => i + 1).map((house) => {
        const signIdx     = houseSign(house);
        const planetsHere = signPlanets[signIdx] ?? [];
        const [ax, ay]    = HOUSE_ANCHORS[house];
        const [rx, ry]    = RASHI_POS[house];

        return (
          <React.Fragment key={house}>
            {/* Rashi number */}
            <SvgText x={rx} y={ry}
              fill={house === 1 ? accentC : "#f97316"}
              fontSize={8} fontWeight="400" textAnchor="middle">
              {signIdx + 1}
            </SvgText>

            {/* Planets */}
            {planetsHere.slice(0, 4).map(({ abbr, deg, pKey, retro }, pi) => {
              const fill = abbr === "As" ? accentC : (PLANET_COLOR[pKey] ?? textC);
              const displayAbbr = abbr + (retro ? "ᴿ" : "");
              const planetY = ay + pi * 14;
              const halfW = (displayAbbr.length * 5.5) / 2;
              return (
                <React.Fragment key={abbr + pi}>
                  <SvgText x={ax - (deg > 0 ? 4 : 0)} y={planetY}
                    fill={fill} fontSize={10}
                    fontWeight={abbr === "As" ? "900" : "700"} textAnchor="middle">
                    {displayAbbr}
                  </SvgText>
                  {deg > 0 && (
                    <SvgText x={ax - 4 + halfW + 3} y={planetY - 4}
                      fill={fill} fontSize={6.5} fontWeight="700"
                      textAnchor="start" opacity={0.85}>
                      {deg}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* Center labels */}
      <SvgText x={MID} y={MID - 12} fill={accentC} fontSize={9} fontWeight="900" textAnchor="middle">
        {centerName}
      </SvgText>
      <SvgText x={MID} y={MID + 6} fill={mutedC} fontSize={7.5} fontWeight="600" textAnchor="middle">
        {centerSub}
      </SvgText>
      {!!centerDate && (
        <SvgText x={MID} y={MID + 20} fill={mutedC} fontSize={6.5} textAnchor="middle">
          {centerDate}
        </SvgText>
      )}
    </Svg>
  );
}

// ── Chart Tab (D1 — Rashi / Lagna) ───────────────────────────────────────────
function ChartTab({ t, k }: any) {
  const SIZE = Math.min(SW - 32, 344);
  const ascSignIdx: number = k.ascendant?.signIndex ?? 0;
  const houseSign = (h: number) => (ascSignIdx + h - 1) % 12;

  const signPlanets: Record<number, ChartPE[]> = {};
  for (let i = 0; i < 12; i++) signPlanets[i] = [];
  signPlanets[ascSignIdx].unshift({
    abbr: "As", deg: k.ascendant?.degree ?? 0, pKey: "ascendant", retro: false,
  });
  for (const p of k.planets ?? []) {
    const abbr = PLANET_ABBR[p.planet] ?? p.planet.slice(0, 2);
    (signPlanets[p.signIndex] = signPlanets[p.signIndex] || []).push({
      abbr, deg: p.degree ?? 0, pKey: p.planet, retro: p.isRetrograde ?? false,
    });
  }

  const accentC = t.accent;
  const mutedC  = t.textMuted;
  const cardC   = t.card;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center", gap: 14, paddingBottom: 32 }}>
      {/* Chart badge — saffron style matching web */}
      <View style={{ paddingHorizontal:16, paddingVertical:7, borderRadius:20,
        backgroundColor: t.bg === "#06080f" ? "rgba(120,53,15,0.22)" : "#fffbeb",
        borderWidth:1, borderColor:"#d97706" }}>
        <Text style={{ color: t.bg === "#06080f" ? "#fbbf24" : "#92400e",
          fontSize:11, fontWeight:"800", letterSpacing:1.0, textTransform:"uppercase" }}>
          ✦ Rashi Chart (D1) · {k.ascendant?.signName} Lagna ✦
        </Text>
      </View>

      {/* Chart wrapped in decorative saffron corner frame */}
      <View style={{ width: SIZE + 12, height: SIZE + 12, alignSelf: "center" }}>
        <View style={{ position: "absolute", left: 6, top: 6 }}>
          <NiChartSvg
            t={t}
            signPlanets={signPlanets}
            ascSignIdx={ascSignIdx}
            centerName={k.person?.name?.split(" ")[0] ?? ""}
            centerSub={`${k.ascendant?.signName} Lagna`}
            centerDate={k.person?.dob ?? ""}
          />
        </View>
        <View pointerEvents="none" style={{ position:"absolute", left:0, top:0, width:SIZE+12, height:SIZE+12 }}>
          <Svg width={SIZE + 12} height={SIZE + 12}>
            {/* TL fan */}
            <SvgPath d="M10,0 A10,10 0 0 0 0,10" fill="none" stroke="#d97706" strokeWidth="2.5" />
            <SvgPath d="M19,0 A18,18 0 0 0 0,19" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            <SvgPath d="M27,0 A26,26 0 0 0 0,27" fill="none" stroke="#d97706" strokeWidth="0.7" strokeDasharray="2,2" />
            <SvgCircle cx={0} cy={0} r={3.5} fill="#d97706" />
            <SvgCircle cx={0} cy={0} r={1.5} fill={t.bg === "#06080f" ? "#06080f" : "#fffbeb"} />
            <SvgCircle cx={14} cy={3} r={1.3} fill="#f59e0b" />
            <SvgCircle cx={3} cy={14} r={1.3} fill="#f59e0b" />
            {/* TR fan */}
            <SvgPath d={`M${SIZE+2},0 A10,10 0 0 1 ${SIZE+12},10`} fill="none" stroke="#d97706" strokeWidth="2.5" />
            <SvgPath d={`M${SIZE-7},0 A18,18 0 0 1 ${SIZE+12},19`} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            <SvgPath d={`M${SIZE-15},0 A26,26 0 0 1 ${SIZE+12},27`} fill="none" stroke="#d97706" strokeWidth="0.7" strokeDasharray="2,2" />
            <SvgCircle cx={SIZE + 12} cy={0} r={3.5} fill="#d97706" />
            <SvgCircle cx={SIZE + 12} cy={0} r={1.5} fill={t.bg === "#06080f" ? "#06080f" : "#fffbeb"} />
            <SvgCircle cx={SIZE - 2} cy={3} r={1.3} fill="#f59e0b" />
            <SvgCircle cx={SIZE + 9} cy={14} r={1.3} fill="#f59e0b" />
            {/* BL fan */}
            <SvgPath d={`M10,${SIZE+12} A10,10 0 0 1 0,${SIZE+2}`} fill="none" stroke="#d97706" strokeWidth="2.5" />
            <SvgPath d={`M19,${SIZE+12} A18,18 0 0 1 0,${SIZE-7}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            <SvgPath d={`M27,${SIZE+12} A26,26 0 0 1 0,${SIZE-15}`} fill="none" stroke="#d97706" strokeWidth="0.7" strokeDasharray="2,2" />
            <SvgCircle cx={0} cy={SIZE + 12} r={3.5} fill="#d97706" />
            <SvgCircle cx={0} cy={SIZE + 12} r={1.5} fill={t.bg === "#06080f" ? "#06080f" : "#fffbeb"} />
            <SvgCircle cx={14} cy={SIZE + 9} r={1.3} fill="#f59e0b" />
            <SvgCircle cx={3} cy={SIZE - 2} r={1.3} fill="#f59e0b" />
            {/* BR fan */}
            <SvgPath d={`M${SIZE+2},${SIZE+12} A10,10 0 0 0 ${SIZE+12},${SIZE+2}`} fill="none" stroke="#d97706" strokeWidth="2.5" />
            <SvgPath d={`M${SIZE-7},${SIZE+12} A18,18 0 0 0 ${SIZE+12},${SIZE-7}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            <SvgPath d={`M${SIZE-15},${SIZE+12} A26,26 0 0 0 ${SIZE+12},${SIZE-15}`} fill="none" stroke="#d97706" strokeWidth="0.7" strokeDasharray="2,2" />
            <SvgCircle cx={SIZE + 12} cy={SIZE + 12} r={3.5} fill="#d97706" />
            <SvgCircle cx={SIZE + 12} cy={SIZE + 12} r={1.5} fill={t.bg === "#06080f" ? "#06080f" : "#fffbeb"} />
            <SvgCircle cx={SIZE - 2} cy={SIZE + 9} r={1.3} fill="#f59e0b" />
            <SvgCircle cx={SIZE + 9} cy={SIZE - 2} r={1.3} fill="#f59e0b" />
            {/* Edge dots */}
            {[0.25,0.5,0.75].map(f => <SvgCircle key={`t${f}`} cx={Math.round(f*(SIZE+12))} cy={0} r={2} fill="#f59e0b" opacity={0.85} />)}
            {[0.25,0.5,0.75].map(f => <SvgCircle key={`b${f}`} cx={Math.round(f*(SIZE+12))} cy={SIZE+12} r={2} fill="#f59e0b" opacity={0.85} />)}
            {[0.33,0.5,0.67].map(f => <SvgCircle key={`l${f}`} cx={0} cy={Math.round(f*(SIZE+12))} r={2} fill="#f59e0b" opacity={0.85} />)}
            {[0.33,0.5,0.67].map(f => <SvgCircle key={`r${f}`} cx={SIZE+12} cy={Math.round(f*(SIZE+12))} r={2} fill="#f59e0b" opacity={0.85} />)}
          </Svg>
        </View>
      </View>

      {/* Planet legend */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: SIZE }}>
        {Object.entries(PLANET_ABBR).map(([pid, abbr]) => (
          <View key={pid} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: PLANET_COLOR[pid] ?? t.textMuted }} />
            <Text style={{ color: t.textMuted, fontSize: 9 }}>{abbr}={cap(pid)}</Text>
          </View>
        ))}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: accentC }} />
          <Text style={{ color: t.textMuted, fontSize: 9 }}>As=Lagna</Text>
        </View>
      </View>

      {/* House-Sign reference */}
      <View style={{ width: SIZE, borderWidth: 1, borderRadius: 12, padding: 12,
        backgroundColor: cardC, borderColor: t.border }}>
        <Text style={{ color: mutedC, fontSize: 10, fontWeight: "700", letterSpacing: 0.5,
          textTransform: "uppercase", marginBottom: 8 }}>House → Sign (Whole Sign)</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {NI_GRID.map(([, , house]) => {
            const signIdx = houseSign(house);
            return (
              <View key={house} style={{ flexDirection: "row", gap: 3, alignItems: "center",
                backgroundColor: t.surface2, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                <Text style={{ color: mutedC, fontSize: 9 }}>H{house}</Text>
                <Text style={{ color: t.text, fontSize: 9, fontWeight: "700" }}>{SIGN_SHORT[signIdx]}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ── Navamsa Tab (D9) ──────────────────────────────────────────────────────────
function NavamsaTab({ t, k }: any) {
  const d9 = k.charts?.d9;
  const SIZE = Math.min(SW - 32, 344);
  const accentC = t.accent;
  const mutedC  = t.textMuted;
  const cardC   = t.card;

  if (!d9?.positions?.length) {
    return (
      <View style={{ flex:1, alignItems:"center", justifyContent:"center", padding:30, gap:14 }}>
        <MaterialCommunityIcons name="apps" size={52} color={t.textDim} />
        <Text style={{ color:t.textMuted, fontSize:14, fontWeight:"600", textAlign:"center" }}>
          Navamsa (D9) chart not available
        </Text>
        <Text style={{ color:t.textDim, fontSize:12, textAlign:"center", lineHeight:18 }}>
          Regenerate the kundli to get the Navamsa chart data.
        </Text>
      </View>
    );
  }

  const positions: any[] = d9.positions;
  const d9Asc = positions.find((p: any) => p.planet === "ascendant");
  const d9AscSignIdx: number = d9Asc?.signIndex ?? 0;

  const d9SignPlanets: Record<number, ChartPE[]> = {};
  for (let i = 0; i < 12; i++) d9SignPlanets[i] = [];
  if (d9Asc) {
    d9SignPlanets[d9AscSignIdx].unshift({
      abbr: "As", deg: d9Asc.degree ?? 0, pKey: "ascendant", retro: false,
    });
  }
  for (const p of positions) {
    if (p.planet === "ascendant") continue;
    const abbr = PLANET_ABBR[p.planet] ?? (p.planet as string).slice(0, 2);
    (d9SignPlanets[p.signIndex] = d9SignPlanets[p.signIndex] || []).push({
      abbr, deg: p.degree ?? 0, pKey: p.planet, retro: false,
    });
  }

  const houseSign = (h: number) => (d9AscSignIdx + h - 1) % 12;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center", gap: 14, paddingBottom: 32 }}>
      {/* Chart badge — saffron style matching web */}
      <View style={{ paddingHorizontal:16, paddingVertical:7, borderRadius:20,
        backgroundColor: t.bg === "#06080f" ? "rgba(120,53,15,0.22)" : "#fffbeb",
        borderWidth:1, borderColor:"#d97706" }}>
        <Text style={{ color: t.bg === "#06080f" ? "#fbbf24" : "#92400e",
          fontSize:11, fontWeight:"800", letterSpacing:1.0, textTransform:"uppercase" }}>
          ✦ Navamsa Chart (D9) · {SIGNS[d9AscSignIdx]} Lagna ✦
        </Text>
      </View>

      {/* Chart wrapped in decorative saffron corner frame */}
      <View style={{ width: SIZE + 12, height: SIZE + 12, alignSelf: "center" }}>
        <View style={{ position: "absolute", left: 6, top: 6 }}>
          <NiChartSvg
            t={t}
            signPlanets={d9SignPlanets}
            ascSignIdx={d9AscSignIdx}
            centerName="D9"
            centerSub={`${SIGNS[d9AscSignIdx]} Lagna`}
          />
        </View>
        <View pointerEvents="none" style={{ position:"absolute", left:0, top:0, width:SIZE+12, height:SIZE+12 }}>
          <Svg width={SIZE + 12} height={SIZE + 12}>
            <SvgPath d="M10,0 A10,10 0 0 0 0,10" fill="none" stroke="#d97706" strokeWidth="2.5" />
            <SvgPath d="M19,0 A18,18 0 0 0 0,19" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            <SvgPath d="M27,0 A26,26 0 0 0 0,27" fill="none" stroke="#d97706" strokeWidth="0.7" strokeDasharray="2,2" />
            <SvgCircle cx={0} cy={0} r={3.5} fill="#d97706" />
            <SvgCircle cx={0} cy={0} r={1.5} fill={t.bg === "#06080f" ? "#06080f" : "#fffbeb"} />
            <SvgCircle cx={14} cy={3} r={1.3} fill="#f59e0b" />
            <SvgCircle cx={3} cy={14} r={1.3} fill="#f59e0b" />
            <SvgPath d={`M${SIZE+2},0 A10,10 0 0 1 ${SIZE+12},10`} fill="none" stroke="#d97706" strokeWidth="2.5" />
            <SvgPath d={`M${SIZE-7},0 A18,18 0 0 1 ${SIZE+12},19`} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            <SvgPath d={`M${SIZE-15},0 A26,26 0 0 1 ${SIZE+12},27`} fill="none" stroke="#d97706" strokeWidth="0.7" strokeDasharray="2,2" />
            <SvgCircle cx={SIZE + 12} cy={0} r={3.5} fill="#d97706" />
            <SvgCircle cx={SIZE + 12} cy={0} r={1.5} fill={t.bg === "#06080f" ? "#06080f" : "#fffbeb"} />
            <SvgCircle cx={SIZE - 2} cy={3} r={1.3} fill="#f59e0b" />
            <SvgCircle cx={SIZE + 9} cy={14} r={1.3} fill="#f59e0b" />
            <SvgPath d={`M10,${SIZE+12} A10,10 0 0 1 0,${SIZE+2}`} fill="none" stroke="#d97706" strokeWidth="2.5" />
            <SvgPath d={`M19,${SIZE+12} A18,18 0 0 1 0,${SIZE-7}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            <SvgPath d={`M27,${SIZE+12} A26,26 0 0 1 0,${SIZE-15}`} fill="none" stroke="#d97706" strokeWidth="0.7" strokeDasharray="2,2" />
            <SvgCircle cx={0} cy={SIZE + 12} r={3.5} fill="#d97706" />
            <SvgCircle cx={0} cy={SIZE + 12} r={1.5} fill={t.bg === "#06080f" ? "#06080f" : "#fffbeb"} />
            <SvgCircle cx={14} cy={SIZE + 9} r={1.3} fill="#f59e0b" />
            <SvgCircle cx={3} cy={SIZE - 2} r={1.3} fill="#f59e0b" />
            <SvgPath d={`M${SIZE+2},${SIZE+12} A10,10 0 0 0 ${SIZE+12},${SIZE+2}`} fill="none" stroke="#d97706" strokeWidth="2.5" />
            <SvgPath d={`M${SIZE-7},${SIZE+12} A18,18 0 0 0 ${SIZE+12},${SIZE-7}`} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
            <SvgPath d={`M${SIZE-15},${SIZE+12} A26,26 0 0 0 ${SIZE+12},${SIZE-15}`} fill="none" stroke="#d97706" strokeWidth="0.7" strokeDasharray="2,2" />
            <SvgCircle cx={SIZE + 12} cy={SIZE + 12} r={3.5} fill="#d97706" />
            <SvgCircle cx={SIZE + 12} cy={SIZE + 12} r={1.5} fill={t.bg === "#06080f" ? "#06080f" : "#fffbeb"} />
            <SvgCircle cx={SIZE - 2} cy={SIZE + 9} r={1.3} fill="#f59e0b" />
            <SvgCircle cx={SIZE + 9} cy={SIZE - 2} r={1.3} fill="#f59e0b" />
            {[0.25,0.5,0.75].map(f => <SvgCircle key={`t${f}`} cx={Math.round(f*(SIZE+12))} cy={0} r={2} fill="#f59e0b" opacity={0.85} />)}
            {[0.25,0.5,0.75].map(f => <SvgCircle key={`b${f}`} cx={Math.round(f*(SIZE+12))} cy={SIZE+12} r={2} fill="#f59e0b" opacity={0.85} />)}
            {[0.33,0.5,0.67].map(f => <SvgCircle key={`l${f}`} cx={0} cy={Math.round(f*(SIZE+12))} r={2} fill="#f59e0b" opacity={0.85} />)}
            {[0.33,0.5,0.67].map(f => <SvgCircle key={`r${f}`} cx={SIZE+12} cy={Math.round(f*(SIZE+12))} r={2} fill="#f59e0b" opacity={0.85} />)}
          </Svg>
        </View>
      </View>

      {/* D9 explanation */}
      <View style={{ width: SIZE, borderWidth:1, borderRadius:12, padding:14,
        backgroundColor: cardC, borderColor: t.border }}>
        <Text style={{ color:accentC, fontSize:11, fontWeight:"800", letterSpacing:0.4,
          textTransform:"uppercase", marginBottom:6 }}>About Navamsa (D9)</Text>
        <Text style={{ color:t.text, fontSize:12, lineHeight:19 }}>
          The Navamsa chart divides each sign into 9 equal parts (3°20′ each). It is the most important
          divisional chart in Vedic astrology — used to assess the strength of planets, dharma, and the
          deeper qualities of marriage and partnerships.
        </Text>
        <Text style={{ color:mutedC, fontSize:11, lineHeight:17, marginTop:8 }}>
          Planets well-placed in D9 (in own sign or exaltation) are considered Vargottama — powerfully amplified in their D1 effects.
        </Text>
      </View>

      {/* D9 House-Sign reference */}
      <View style={{ width: SIZE, borderWidth: 1, borderRadius: 12, padding: 12,
        backgroundColor: cardC, borderColor: t.border }}>
        <Text style={{ color: mutedC, fontSize: 10, fontWeight: "700", letterSpacing: 0.5,
          textTransform: "uppercase", marginBottom: 8 }}>D9 House → Sign</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {NI_GRID.map(([, , house]) => {
            const signIdx = houseSign(house);
            return (
              <View key={house} style={{ flexDirection: "row", gap: 3, alignItems: "center",
                backgroundColor: t.surface2, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3 }}>
                <Text style={{ color: mutedC, fontSize: 9 }}>H{house}</Text>
                <Text style={{ color: t.text, fontSize: 9, fontWeight: "700" }}>{SIGN_SHORT[signIdx]}</Text>
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

// ── Planets Tab ───────────────────────────────────────────────────────────────
function PlanetsTab({ t, k }: any) {
  const planets = [
    k.ascendant?{...k.ascendant,planet:"ascendant",displayName:"Lagna",abbr:"As",isRetrograde:false}:null,
    ...(k.planets??[])
  ].filter(Boolean);

  return (
    <ScrollView contentContainerStyle={{padding:16}}>
      <View style={{flexDirection:"row",padding:10,backgroundColor:t.surface2,borderRadius:10,marginBottom:4,borderWidth:1,borderColor:t.border}}>
        {["Planet","Sign","Deg","Nakshatra","Pd","H","R"].map(h=>(
          <Text key={h} style={{flex:1,fontSize:9,fontWeight:"700",textTransform:"uppercase",letterSpacing:0.5,color:t.textMuted,textAlign:"center"}}>{h}</Text>
        ))}
      </View>
      {planets.map((p:any,i:number)=>p&&(
        <View key={p.planet} style={{flexDirection:"row",alignItems:"center",paddingHorizontal:10,paddingVertical:9,borderWidth:1,borderRadius:8,marginBottom:3,backgroundColor:i%2===0?t.card:t.surface,borderColor:t.border}}>
          <View style={{flex:2,flexDirection:"row",alignItems:"center",gap:6}}>
            <View style={{width:6,height:6,borderRadius:3,backgroundColor:PLANET_COLOR[p.planet]||t.textMuted}} />
            <Text style={{color:t.text,fontSize:11,fontWeight:"700"}}>{p.displayName||p.abbr}</Text>
          </View>
          <Text style={{flex:1,fontSize:10,textAlign:"center",color:t.text}}>{SIGN_SHORT[p.signIndex]}</Text>
          <Text style={{flex:1,fontSize:10,textAlign:"center",color:t.text}}>{p.degree}°{p.minute}'</Text>
          <Text style={{flex:1,fontSize:9,textAlign:"center",color:t.textMuted}} numberOfLines={1}>{p.nakshatraName?.slice(0,6)??"—"}</Text>
          <Text style={{flex:1,fontSize:10,textAlign:"center",color:t.textMuted}}>{p.pada??"-"}</Text>
          <Text style={{flex:1,fontSize:10,textAlign:"center",color:t.accent,fontWeight:"700"}}>{p.house??"-"}</Text>
          <Text style={{flex:1,fontSize:10,textAlign:"center",color:p.isRetrograde?t.orange:t.textDim,fontWeight:"700"}}>
            {p.isRetrograde?"R":"D"}
          </Text>
        </View>
      ))}
      <View style={{borderWidth:1,borderRadius:10,padding:10,backgroundColor:t.surface2,borderColor:t.border,marginTop:12}}>
        <Text style={{color:t.textDim,fontSize:10}}>R = Retrograde · Pd = Pada · H = House (Whole Sign)</Text>
      </View>
    </ScrollView>
  );
}

// ── Dasha Tab ─────────────────────────────────────────────────────────────────
function DashaTab({ t, k }: any) {
  const [expanded,setExpanded] = useState<string|null>(null);
  const dashas = k.dashas?.vimshottari??[];
  return (
    <ScrollView contentContainerStyle={{padding:16,gap:8}}>
      <Text style={{color:t.textMuted,fontSize:12,marginBottom:4}}>
        Vimshottari Dasha · Birth nakshatra: {k.moonNakshatra?.name}
      </Text>
      {dashas.map((d:any)=>(
        <View key={d.lord} style={{borderWidth:1,borderRadius:14,overflow:"hidden",
          backgroundColor:d.isCurrent?t.accentSoft:t.card,borderColor:d.isCurrent?t.accent:t.border}}>
          <TouchableOpacity onPress={()=>setExpanded(expanded===d.lord?null:d.lord)}
            style={{flexDirection:"row",alignItems:"center",padding:14}}>
            <View style={{flex:1}}>
              <View style={{flexDirection:"row",alignItems:"center",gap:8}}>
                <View style={{width:10,height:10,borderRadius:5,backgroundColor:PLANET_COLOR[d.lord]||t.textMuted}} />
                <Text style={{color:d.isCurrent?t.accent:t.text,fontSize:15,fontWeight:"800"}}>{d.displayName}</Text>
                {d.isCurrent&&<View style={{backgroundColor:t.accent,borderRadius:6,paddingHorizontal:6,paddingVertical:2}}>
                  <Text style={{color:"#fff",fontSize:9,fontWeight:"800"}}>CURRENT</Text>
                </View>}
              </View>
              <Text style={{color:t.textMuted,fontSize:11,marginTop:3}}>
                {d.startDate}  →  {d.endDate}  ·  {d.durationYears?.toFixed(1)} yrs
              </Text>
            </View>
            <Ionicons name={expanded===d.lord?"chevron-up":"chevron-down"} size={16} color={t.textMuted} />
          </TouchableOpacity>
          {expanded===d.lord&&(
            <View style={{borderTopWidth:1,borderColor:t.border,paddingTop:8,paddingBottom:4}}>
              {d.antardashas?.map((a:any)=>(
                <View key={a.lord} style={{flexDirection:"row",alignItems:"center",gap:8,paddingVertical:5,
                  backgroundColor:a.isCurrent?t.goldSoft:"transparent",borderRadius:6,paddingHorizontal:10,marginHorizontal:4}}>
                  <View style={{width:6,height:6,borderRadius:3,backgroundColor:PLANET_COLOR[a.lord]||t.textMuted}} />
                  <Text style={{color:a.isCurrent?t.gold:t.text,fontSize:12,fontWeight:a.isCurrent?"800":"500",width:72}}>{a.displayName}</Text>
                  <Text style={{color:t.textMuted,fontSize:10,flex:1}}>{a.startDate} → {a.endDate}</Text>
                  {a.isCurrent&&<Text style={{color:t.gold,fontSize:9,fontWeight:"800"}}>NOW</Text>}
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

// ── Guidance Tab ──────────────────────────────────────────────────────────────
function colorNameToHex(name: string): string {
  const m: Record<string,string> = {
    "Orange":"#f97316","Gold":"#f59e0b","White":"#f1f5f9","Silver":"#94a3b8",
    "Red":"#ef4444","Coral":"#fb923c","Green":"#22c55e","Emerald":"#10b981",
    "Yellow":"#eab308","Cream":"#fef9c3","Pink":"#ec4899",
    "Dark Blue":"#1e3a8a","Black":"#0f172a","Smoky Gray":"#6b7280","Multi-color":"#a855f7",
  };
  return m[name] ?? "#6366f1";
}

function GSection({ t, icon, title, accentColor, children }: any) {
  return (
    <View style={{ borderWidth:1, borderRadius:16, overflow:"hidden",
      backgroundColor:t.card, borderColor:t.border }}>
      <View style={{ flexDirection:"row", alignItems:"center", gap:8, padding:14,
        borderBottomWidth:1, borderBottomColor:t.border }}>
        <Ionicons name={icon as any} size={15} color={accentColor} />
        <Text style={{ color:t.text, fontSize:13, fontWeight:"800", flex:1 }}>{title}</Text>
      </View>
      <View style={{ padding:14 }}>{children}</View>
    </View>
  );
}

function RemedyRow({ t, icon, label, value, note, last }: any) {
  return (
    <View style={{ paddingVertical:10,
      borderBottomWidth:last?0:1, borderBottomColor:t.border, gap:3 }}>
      <View style={{ flexDirection:"row", alignItems:"center", gap:5 }}>
        <Ionicons name={icon as any} size={11} color={t.textMuted} />
        <Text style={{ color:t.textMuted, fontSize:9, fontWeight:"800",
          textTransform:"uppercase", letterSpacing:0.6 }}>{label}</Text>
      </View>
      <Text style={{ color:t.text, fontSize:12, fontWeight:"600", marginTop:1 }}>{value}</Text>
      {!!note && <Text style={{ color:t.textDim, fontSize:10, marginTop:1 }}>{note}</Text>}
    </View>
  );
}

function GuidanceTab({ t, k }: any) {
  const g = useMemo(() => computeGuidance(k), [k]);
  const gemstone = PLANET_GEMSTONE[g.dashaLord] ?? "";
  const mantra   = PLANET_MANTRA[g.dashaLord] ?? "";
  const fastDay  = PLANET_FAST_DAY[g.dashaLord] ?? "";
  const charity  = PLANET_CHARITY[g.dashaLord] ?? "";
  const timing   = DASHA_SIGNIFICATION[g.dashaLord] ?? "";
  const love     = LOVE_BY_7TH[g.seventhSignIdx];
  const health   = HEALTH_BY_6TH[g.sixthSignIdx];

  const venusPlanet = k.planets?.find((p:any) => p.planet === "venus");

  return (
    <ScrollView contentContainerStyle={{ padding:16, gap:14, paddingBottom:40 }}>

      {/* ── Current Cosmic Timing ── */}
      <GSection t={t} icon="timer-outline" title="Your Cosmic Timing Right Now"
        accentColor={t.accent}>
        {g.curMaha ? (
          <View style={{ gap:6 }}>
            <View style={{ flexDirection:"row", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <View style={{ width:10, height:10, borderRadius:5,
                backgroundColor:PLANET_COLOR[g.dashaLord]??t.accent }} />
              <Text style={{ color:t.text, fontSize:15, fontWeight:"900" }}>
                {g.curMaha.displayName} Mahadasha
              </Text>
              <View style={{ backgroundColor:t.accentSoft, borderRadius:6,
                paddingHorizontal:7, paddingVertical:2 }}>
                <Text style={{ color:t.accent, fontSize:9, fontWeight:"800" }}>ACTIVE NOW</Text>
              </View>
            </View>
            <Text style={{ color:t.textMuted, fontSize:11 }}>
              {g.curMaha.startDate}  →  {g.curMaha.endDate}  ·  {g.curMaha.durationYears?.toFixed(1)} years
            </Text>
            {g.curAntar && (
              <View style={{ backgroundColor:t.goldSoft, borderRadius:8,
                padding:8, borderWidth:1, borderColor:t.gold, marginTop:2 }}>
                <Text style={{ color:t.gold, fontSize:10, fontWeight:"800" }}>CURRENT ANTARDASHA (BHUKTI)</Text>
                <Text style={{ color:t.text, fontSize:13, fontWeight:"700", marginTop:3 }}>
                  {g.curAntar.displayName}  ·  {g.curAntar.startDate} → {g.curAntar.endDate}
                </Text>
              </View>
            )}
            <Text style={{ color:t.text, fontSize:13, lineHeight:21, marginTop:6 }}>
              {timing}
            </Text>
          </View>
        ) : (
          <Text style={{ color:t.textMuted, fontSize:13 }}>
            Dasha period data unavailable for this chart.
          </Text>
        )}
      </GSection>

      {/* ── Remedies ── */}
      <GSection t={t} icon="sparkles-outline"
        title={`Remedies — ${cap(g.dashaLord)} Mahadasha`} accentColor={t.gold}>
        <RemedyRow t={t} icon="diamond-outline" label="Gemstone" value={gemstone}
          note="Always consult a qualified jyotishi before wearing gemstones" />
        <RemedyRow t={t} icon="musical-notes-outline" label="Mantra" value={mantra} />
        <RemedyRow t={t} icon="sunny-outline" label="Fasting Day" value={`Fast on ${fastDay}s for strength and clarity`} />
        <RemedyRow t={t} icon="heart-outline" label="Charity / Donation" value={charity} last />
      </GSection>

      {/* ── Love & Relationships ── */}
      <GSection t={t} icon="heart-outline" title="Love & Relationship Guidance"
        accentColor="#ec4899">
        <Text style={{ color:t.text, fontSize:13, lineHeight:21, marginBottom:12 }}>
          {love?.desc}
        </Text>
        {venusPlanet && (
          <View style={{ backgroundColor:t.surface2, borderRadius:10, padding:10,
            borderWidth:1, borderColor:t.border, marginBottom:10 }}>
            <Text style={{ color:t.textMuted, fontSize:10, fontWeight:"800",
              textTransform:"uppercase", marginBottom:4 }}>Your Venus (Planet of Love)</Text>
            <Text style={{ color:t.text, fontSize:13, fontWeight:"700" }}>
              Venus in {venusPlanet.signName} · House {venusPlanet.house}
              {venusPlanet.isRetrograde ? "  (Retrograde)" : ""}
            </Text>
            <Text style={{ color:t.textMuted, fontSize:11, marginTop:3 }}>
              This shapes your love language, physical attractiveness, and relationship style.
            </Text>
          </View>
        )}
        <View style={{ backgroundColor:"rgba(236,72,153,0.08)", borderRadius:10, padding:12,
          borderWidth:1, borderColor:"rgba(236,72,153,0.25)" }}>
          <Text style={{ color:"#ec4899", fontSize:10, fontWeight:"800",
            textTransform:"uppercase", marginBottom:5 }}>Remedy</Text>
          <Text style={{ color:t.textMuted, fontSize:12, lineHeight:19 }}>{love?.remedy}</Text>
        </View>
      </GSection>

      {/* ── Health Guidance ── */}
      <GSection t={t} icon="fitness-outline" title="Health Guidance" accentColor={t.green}>
        <Text style={{ color:t.text, fontSize:13, lineHeight:21, marginBottom:12 }}>
          {health?.desc}
        </Text>
        <View style={{ backgroundColor:"rgba(16,185,129,0.08)", borderRadius:10, padding:12,
          borderWidth:1, borderColor:"rgba(16,185,129,0.25)" }}>
          <Text style={{ color:t.green, fontSize:10, fontWeight:"800",
            textTransform:"uppercase", marginBottom:5 }}>Remedy & Lifestyle</Text>
          <Text style={{ color:t.textMuted, fontSize:12, lineHeight:19 }}>{health?.remedy}</Text>
        </View>
      </GSection>

      {/* ── Lucky Indicators ── */}
      <GSection t={t} icon="star-outline" title="Lucky Indicators" accentColor={t.gold}>

        {/* Number + Colors row */}
        <View style={{ flexDirection:"row", gap:10, marginBottom:12 }}>
          {/* Lucky number */}
          <View style={{ flex:1, borderRadius:12, padding:12, backgroundColor:t.surface2,
            borderWidth:1, borderColor:t.border, alignItems:"center", justifyContent:"center" }}>
            <Text style={{ color:t.textMuted, fontSize:9, fontWeight:"800",
              textTransform:"uppercase", marginBottom:6, letterSpacing:0.5 }}>Lucky Number</Text>
            <Text style={{ color:t.gold, fontSize:40, fontWeight:"900",
              fontVariant:["tabular-nums"] as any }}>{g.luckyNumber}</Text>
            <Text style={{ color:t.textDim, fontSize:9, marginTop:2, textAlign:"center" }}>
              {cap(g.nakshatraLord)} nakshatra lord
            </Text>
          </View>
          {/* Lucky colors */}
          <View style={{ flex:2, borderRadius:12, padding:12, backgroundColor:t.surface2,
            borderWidth:1, borderColor:t.border }}>
            <Text style={{ color:t.textMuted, fontSize:9, fontWeight:"800",
              textTransform:"uppercase", marginBottom:8, letterSpacing:0.5 }}>Lucky Colors</Text>
            {g.luckyColors.map((col: string) => (
              <View key={col} style={{ flexDirection:"row", alignItems:"center", gap:8, marginBottom:5 }}>
                <View style={{ width:14, height:14, borderRadius:7,
                  backgroundColor:colorNameToHex(col), borderWidth:1, borderColor:t.border }} />
                <Text style={{ color:t.text, fontSize:12, fontWeight:"600" }}>{col}</Text>
              </View>
            ))}
            <Text style={{ color:t.textDim, fontSize:9, marginTop:2 }}>
              from {cap(g.dashaLord)} dasha + {cap(g.ascRuler)} lagna lord
            </Text>
          </View>
        </View>

        {/* Lucky years */}
        {g.luckyYears.length > 0 && (
          <View style={{ borderRadius:12, padding:14, backgroundColor:t.goldSoft,
            borderWidth:1, borderColor:t.gold }}>
            <Text style={{ color:t.gold, fontSize:10, fontWeight:"800",
              letterSpacing:0.5, textTransform:"uppercase", marginBottom:10 }}>
              Upcoming Lucky Years — Jupiter Transits
            </Text>
            <View style={{ flexDirection:"row", flexWrap:"wrap", gap:8, marginBottom:10 }}>
              {g.luckyYears.map((yr: number) => (
                <View key={yr} style={{ backgroundColor:t.card, borderRadius:9,
                  paddingHorizontal:14, paddingVertical:7,
                  borderWidth:1, borderColor:t.gold }}>
                  <Text style={{ color:t.gold, fontSize:16, fontWeight:"900",
                    fontVariant:["tabular-nums"] as any }}>{yr}</Text>
                </View>
              ))}
            </View>
            <Text style={{ color:t.textMuted, fontSize:11, lineHeight:17 }}>
              When Jupiter transits your 1st, 5th, 9th, or 11th house from the ascendant —
              traditionally auspicious periods for fortune, growth, and new beginnings in Vedic astrology.
            </Text>
          </View>
        )}

        {/* Disclaimer */}
        <View style={{ marginTop:12, padding:10, backgroundColor:t.surface2,
          borderRadius:8, borderWidth:1, borderColor:t.border }}>
          <Text style={{ color:t.textDim, fontSize:10, lineHeight:16 }}>
            Guidance derived from Vimshottari Dasha (Lahiri ayanamsa), natal planet placements, and Whole Sign house analysis.
            All remedies are traditional Vedic — consult a qualified jyotishi for personalised advice before wearing gemstones or performing major rituals.
          </Text>
        </View>
      </GSection>

      <View style={{ height:16 }} />
    </ScrollView>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
function FieldLabel({ t, label, icon }: any) {
  return (
    <View style={{flexDirection:"row",alignItems:"center",gap:6,marginTop:16,marginBottom:6}}>
      <Ionicons name={icon} size={14} color={t.textMuted} />
      <Text style={{color:t.textMuted,fontSize:12,fontWeight:"600",letterSpacing:0.4}}>{label}</Text>
    </View>
  );
}

// ── Styles (dynamic) ──────────────────────────────────────────────────────────
function makeStyles(t: typeof DARK) {
  return StyleSheet.create({
    flex:             { flex:1 },
    inputScroll:      { padding:20, paddingBottom:40 },
    header:           { flexDirection:"row", alignItems:"center", justifyContent:"space-between", marginBottom:26 },
    headerStar:       { width:44, height:44, borderRadius:22, backgroundColor:t.accentSoft, alignItems:"center", justifyContent:"center" },
    backBtn:          { width:40, height:40, borderRadius:20, backgroundColor:t.surface, alignItems:"center", justifyContent:"center" },
    heroTitle:        { fontSize:27, fontWeight:"900", lineHeight:34, marginBottom:8 },
    heroSub:          { fontSize:12, lineHeight:18, marginBottom:22, color:t.textMuted },
    input:            { borderWidth:1, borderRadius:12, padding:14, fontSize:14 },
    genderRow:        { flexDirection:"row", gap:8, marginBottom:2 },
    genderChip:       { flex:1, borderWidth:1, borderColor:t.border, borderRadius:10, paddingVertical:10, alignItems:"center" },
    genderTxt:        { fontSize:13, fontWeight:"600" },
    pickerField:      { flexDirection:"row", alignItems:"center", gap:10, borderWidth:1, borderRadius:12, padding:14 },
    pickerValue:      { flex:1, fontSize:14, fontWeight:"600" },
    pickerPlaceholder:{ flex:1, fontSize:14 },
    placeSearchBox:   { flexDirection:"row", alignItems:"center", gap:8, borderWidth:1, borderRadius:12, paddingHorizontal:12, paddingVertical:10 },
    placeSearchInput: { flex:1, fontSize:14, paddingVertical:0 },
    placeSearchClear: { padding:2 },
    placeCard:        { borderWidth:1, borderRadius:12, overflow:"hidden", marginTop:4 },
    placeRow:         { flexDirection:"row", alignItems:"flex-start", gap:8, padding:12 },
    placeCity:        { fontSize:13, fontWeight:"700" },
    placeDetail:      { fontSize:11, marginTop:2 },
    placeTz:          { fontSize:10, marginTop:2 },
    placeListCard:    { borderWidth:1, borderRadius:14, padding:14, flexDirection:"row", alignItems:"center", gap:12 },
    placeListIcon:    { width:38, height:38, borderRadius:19, alignItems:"center", justifyContent:"center" },
    errorTxt:         { fontSize:13, fontWeight:"600", marginTop:8 },
    cta:              { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:10, padding:16, borderRadius:14, marginTop:22 },
    ctaTxt:           { color:"#fff", fontSize:16, fontWeight:"800" },
    disclaimerTxt:    { fontSize:10, textAlign:"center", marginTop:14, color:t.textDim },
    subHeader:        { flexDirection:"row", alignItems:"center", gap:12, padding:16 },
    subHeaderTxt:     { fontSize:18, fontWeight:"800" },
    subHeaderSub:     { fontSize:12, marginBottom:8 },
    confirmBadge:     { flexDirection:"row", alignItems:"center", gap:8, padding:12, borderRadius:12, borderWidth:1 },
    confirmBadgeTxt:  { fontSize:13, fontWeight:"700" },
    confirmCard:      { borderWidth:1, borderRadius:16, paddingHorizontal:16, overflow:"hidden" },
    utcNote:          { flexDirection:"row", alignItems:"flex-start", gap:8, padding:12, borderRadius:12, borderWidth:1 },
    utcNoteTxt:       { fontSize:11, lineHeight:16, flex:1 },
    dashHeader:       { flexDirection:"row", alignItems:"center", gap:12, padding:16, borderBottomWidth:1 },
    dashName:         { fontSize:16, fontWeight:"900" },
    dashSub:          { fontSize:11, marginTop:2 },
    tabBar:           { flexDirection:"row", borderBottomWidth:1 },
    tabBarScroll:     { flexGrow:0 },
    tabBtn:           { alignItems:"center", justifyContent:"center", paddingVertical:10, paddingHorizontal:14, gap:3 },
    tabTxt:           { fontSize:10, fontWeight:"700" },
    infoCard:         { borderWidth:1, borderRadius:16, padding:14 },
    infoCardTitle:    { fontSize:10, fontWeight:"700", letterSpacing:0.5, textTransform:"uppercase", marginBottom:6 },
    infoCardVal:      { fontSize:18, fontWeight:"900" },
    calcInfo:         { borderWidth:1, borderRadius:10, padding:10 },
  });
}

// ── Static styles for modals ──────────────────────────────────────────────────
const ss = StyleSheet.create({
  // Calendar
  calOverlay:   { flex:1, backgroundColor:"rgba(0,0,0,0.6)", alignItems:"center", justifyContent:"center", padding:20 },
  calBox:       { width:"100%", maxWidth:360, borderRadius:20, borderWidth:1, overflow:"hidden" },
  calHead:      { flexDirection:"row", alignItems:"center", justifyContent:"space-between", padding:16, paddingBottom:8 },
  calNav:       { width:36, height:36, alignItems:"center", justifyContent:"center" },
  calMonthBtn:  { flexDirection:"row", alignItems:"center", gap:6 },
  calMonthTxt:  { fontSize:17, fontWeight:"800" },
  calWdRow:     { flexDirection:"row", paddingHorizontal:12, paddingBottom:6 },
  calWdTxt:     { flex:1, textAlign:"center", fontSize:11, fontWeight:"700", letterSpacing:0.5 },
  calGrid:      { flexDirection:"row", flexWrap:"wrap", paddingHorizontal:12, paddingBottom:8 },
  calCell:      { width:"14.28%", aspectRatio:1, alignItems:"center", justifyContent:"center", borderRadius:100 },
  calCellTxt:   { fontSize:14 },
  calCancelRow: { borderTopWidth:1, alignItems:"center", padding:14 },
  yearRow:      { paddingVertical:11, paddingHorizontal:20, borderRadius:8, marginHorizontal:10 },
  yearTxt:      { fontSize:16, fontWeight:"600", textAlign:"center" },
  selectedPlace:{ flexDirection:"row", alignItems:"center", gap:8, padding:8, borderRadius:8, borderWidth:1, marginTop:6 },
  // Time wheel
  tpOverlay:    { flex:1, backgroundColor:"rgba(0,0,0,0.6)", justifyContent:"flex-end" },
  tpBox:        { borderTopLeftRadius:24, borderTopRightRadius:24, borderWidth:1, padding:20, paddingBottom:36 },
  tpTitle:      { fontSize:20, fontWeight:"900", textAlign:"center", marginBottom:4 },
  tpSub:        { fontSize:12, textAlign:"center", marginBottom:16 },
  wheelRow:     { flexDirection:"row", alignItems:"center", justifyContent:"center", gap:4 },
  wheelCol:     { alignItems:"center", width:80 },
  wheelLabel:   { fontSize:11, fontWeight:"700", letterSpacing:0.5, textTransform:"uppercase", marginBottom:6 },
  wheelHighlight:{ position:"absolute", left:0, right:0, height:WHEEL_ITEM_H, borderTopWidth:1, borderBottomWidth:1, borderRadius:8, zIndex:1 },
  wheelItem:    { alignItems:"center", justifyContent:"center" },
  wheelItemTxt: { fontVariant:["tabular-nums"] as any },
  wheelColon:   { fontSize:22, fontWeight:"900", marginTop:24, marginHorizontal:2 },
  tpPreview:    { flexDirection:"row", alignItems:"center", gap:10, padding:12, borderRadius:12, borderWidth:1, marginTop:16 },
  tpPreviewTxt: { fontSize:18, fontWeight:"900", fontVariant:["tabular-nums"] as any },
  tpCancel:     { flex:1, padding:14, alignItems:"center", borderRadius:12, borderWidth:1 },
  tpConfirm:    { flex:2, padding:14, alignItems:"center", borderRadius:12 },
});
