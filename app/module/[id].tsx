import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity,
  Dimensions, Alert, ActivityIndicator,
} from "react-native";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Rect as SvgRect } from "react-native-svg";
import client from "../../api/client";

const { width: SW } = Dimensions.get("window");

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

// ── Assets ───────────────────────────────────────────────────────────────────
const modAstrologyImg = require("../../assets/module-astrology.png");
const modTarotImg     = require("../../assets/module-tarot.png");
const modManifestImg  = require("../../assets/module-manifestation.png");
const modHypnosisImg  = require("../../assets/module-hypnosis.png");
const modHealingImg   = require("../../assets/module-healing.png");
const modDreamsImg    = require("../../assets/module-dreams.png");

// ── Types ─────────────────────────────────────────────────────────────────────
interface ModuleTool { id: string; icon: IoniconName; name: string; desc: string; }
interface ModuleConfig {
  title: string; tagline: string; description: string;
  img: ReturnType<typeof require>; accentColor: string;
  specialties: string[]; tools: ModuleTool[];
}
interface HealerCard {
  _id: string; name: string; avatar: string; isOnline: boolean;
  trainerRole: string; specialties: string[];
  experience: string; sessionsDisplay: string; rating: number;
  sessionPricePaise?: number; isVerifiedBadge: boolean;
}

// ── Module Configurations ────────────────────────────────────────────────────
const MODULES: Record<string, ModuleConfig> = {
  astrology: {
    title:"Astrology", tagline:"Discover your cosmic path",
    description:"Explore how celestial movements shape your personality, relationships and life purpose. Get personalised insights from expert astrologers and Vedic practitioners.",
    img:modAstrologyImg, accentColor:"#f59e0b",
    specialties:["Astrology","Vedic","Numerology","Jyotish","Vastu","Horoscope"],
    tools:[
      { id:"birth-chart",   icon:"planet-outline",       name:"Birth Chart",     desc:"Your cosmic blueprint"   },
      { id:"zodiac",        icon:"star-outline",          name:"Zodiac Sign",     desc:"Find your archetype"     },
      { id:"kundli",        icon:"grid-outline",          name:"Kundli",          desc:"Vedic natal chart"       },
      { id:"compatibility", icon:"heart-outline",         name:"Compatibility",   desc:"Relationship harmony"    },
      { id:"horoscope",     icon:"calendar-outline",      name:"Daily Horoscope", desc:"Today's insights"        },
      { id:"numerology",    icon:"calculator-outline",    name:"Numerology",      desc:"Numbers & destiny"       },
    ],
  },
  tarot: {
    title:"Tarot", tagline:"Find clarity through the cards",
    description:"Tarot offers deep symbolic guidance for life's crossroads. Connect with expert readers who illuminate your path with ancient wisdom and intuitive insight.",
    img:modTarotImg, accentColor:"#60a5fa",
    specialties:["Tarot","Card Reading","Oracle","Divination","Psychic"],
    tools:[
      { id:"daily-card",  icon:"today-outline",         name:"Daily Card",       desc:"Your card of the day"    },
      { id:"3-card",      icon:"layers-outline",         name:"3-Card Spread",   desc:"Past · Present · Future" },
      { id:"yes-no",      icon:"help-circle-outline",    name:"Yes / No",         desc:"Quick clarity reading"   },
      { id:"celtic",      icon:"apps-outline",           name:"Celtic Cross",     desc:"Deep life spread"        },
      { id:"love-tarot",  icon:"heart-circle-outline",   name:"Love Tarot",       desc:"Relationship guidance"   },
      { id:"career",      icon:"briefcase-outline",      name:"Career Path",      desc:"Work & purpose"          },
    ],
  },
  manifestation: {
    title:"Manifestation", tagline:"Turn intention into reality",
    description:"Manifestation combines intention, belief and inspired action. Learn proven techniques from expert coaches to align your mindset and energy with your deepest goals.",
    img:modManifestImg, accentColor:"#60a5fa",
    specialties:["Manifestation","Law of Attraction","NLP","Life Coach","Mindset","Coaching"],
    tools:[
      { id:"affirmations",  icon:"megaphone-outline",       name:"Affirmations",    desc:"Daily reprogramming"     },
      { id:"369-method",    icon:"create-outline",          name:"369 Method",      desc:"Tesla's technique"       },
      { id:"visualization", icon:"eye-outline",             name:"Visualization",   desc:"See it to achieve it"    },
      { id:"gratitude",     icon:"document-text-outline",   name:"Gratitude Log",   desc:"Shift your energy daily" },
      { id:"scripting",     icon:"pencil-outline",          name:"Scripting",       desc:"Write your future self"  },
      { id:"vision-board",  icon:"images-outline",          name:"Vision Board",    desc:"Anchor your dreams"      },
    ],
  },
  hypnosis: {
    title:"Hypnosis", tagline:"Reprogram your mind",
    description:"Clinical hypnotherapy accesses the subconscious mind to dissolve limiting beliefs, deep-seated fears and unwanted patterns. Guided by India's certified practitioners.",
    img:modHypnosisImg, accentColor:"#34d399",
    specialties:["Hypnosis","Hypnotherapy","NLP","Trance","Subconscious","Clinical Hypnotherapy"],
    tools:[
      { id:"sleep-hypnosis", icon:"moon-outline",           name:"Sleep Hypnosis",  desc:"Deep restful sleep"      },
      { id:"confidence",     icon:"shield-outline",         name:"Confidence",      desc:"Unshakeable self-belief" },
      { id:"fear-release",   icon:"lock-open-outline",      name:"Fear Release",    desc:"Dissolve what holds you" },
      { id:"inner-child",    icon:"heart-circle-outline",   name:"Inner Child",     desc:"Heal childhood wounds"   },
      { id:"stress-detox",   icon:"leaf-outline",           name:"Stress Detox",    desc:"Nervous system reset"    },
      { id:"memory",         icon:"bulb-outline",           name:"Memory Boost",    desc:"Enhanced retention"      },
    ],
  },
  healing: {
    title:"Healing", tagline:"Restore your inner balance",
    description:"Energy healing works with the body's natural intelligence to release blockages and restore flow. Connect with certified Reiki masters, Pranic healers and energy workers.",
    img:modHealingImg, accentColor:"#f472b6",
    specialties:["Healing","Reiki","Energy Healing","Chakra","Emotional Healing","Pranic"],
    tools:[
      { id:"chakra-scan",    icon:"color-wand-outline",     name:"Chakra Scan",     desc:"7-chakra alignment"      },
      { id:"reiki-session",  icon:"flash-outline",          name:"Reiki Session",   desc:"Universal life energy"   },
      { id:"box-breathing",  icon:"fitness-outline",        name:"Box Breathing",   desc:"4-4-4-4 instant calm"    },
      { id:"gratitude-med",  icon:"heart-outline",          name:"Gratitude Med",   desc:"Heart-opening practice"  },
      { id:"anger-release",  icon:"water-outline",          name:"Anger Release",   desc:"Safe emotional release"  },
      { id:"chakra-balance", icon:"radio-outline",          name:"Chakra Balance",  desc:"Energy alignment"        },
    ],
  },
  dreams: {
    title:"Dreams", tagline:"Explore the world within",
    description:"Dreams are windows to the subconscious. Explore past life regression, lucid dreaming and Akashic Records to access deep soul wisdom with certified practitioners.",
    img:modDreamsImg, accentColor:"#818cf8",
    specialties:["Dreams","Past Life","Regression","Akashic","Lucid","Subconscious"],
    tools:[
      { id:"dream-journal",   icon:"document-text-outline",  name:"Dream Journal",      desc:"Record & reflect"        },
      { id:"lucid-dreaming",  icon:"eye-outline",            name:"Lucid Dreaming",     desc:"Control your dreamscape" },
      { id:"past-life",       icon:"time-outline",           name:"Past Life Reg.",     desc:"Soul-level healing"      },
      { id:"akashic-records", icon:"book-outline",           name:"Akashic Records",    desc:"Access soul wisdom"      },
      { id:"sleep-hypnosis",  icon:"moon-outline",           name:"Sleep Hypnosis",     desc:"Dream induction"         },
      { id:"night-aff",       icon:"star-outline",           name:"Night Affirmations", desc:"Program while you sleep" },
    ],
  },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function ModuleDiscoveryPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [healers, setHealers]         = useState<HealerCard[]>([]);
  const [loadingHealers, setLoading]  = useState(true);

  const mod = MODULES[id as string];

  useEffect(() => {
    if (!mod) { setLoading(false); return; }
    const kws = mod.specialties.map(s => s.toLowerCase());
    client.get("/chat/online-educators")
      .then(({ data }) => {
        const all: HealerCard[] = data.educators ?? [];
        const matched = all.filter(h => {
          const role  = (h.trainerRole ?? "").toLowerCase();
          const specs = (h.specialties ?? []).map((s: string) => s.toLowerCase());
          return kws.some(kw => role.includes(kw) || specs.some(s => s.includes(kw)));
        });
        setHealers(matched.length > 0 ? matched.slice(0, 5) : all.slice(0, 4));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (!mod) {
    return (
      <View style={{ flex:1, backgroundColor:"#0c2461", alignItems:"center", justifyContent:"center" }}>
        <TouchableOpacity
          style={{ position:"absolute", top:insets.top + 12, left:16 }}
          onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={{ color:"rgba(255,255,255,0.45)", fontSize:15 }}>Module not found</Text>
      </View>
    );
  }

  const HERO_H = SW * 0.72 + insets.top;

  return (
    <View style={{ flex:1, backgroundColor:"#0c2461" }}>

      {/* ── Floating back button ────────────────────────────────────────────── */}
      <View style={{ position:"absolute", top:insets.top + 10, left:14, zIndex:200 }}>
        <TouchableOpacity
          style={{
            width:40, height:40, borderRadius:20,
            backgroundColor:"rgba(12,36,97,0.75)",
            alignItems:"center", justifyContent:"center",
            borderWidth:1, borderColor:"rgba(255,255,255,0.18)",
          }}
          onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom:120 }}>

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <View style={{ height:HERO_H, backgroundColor:"#0c2461" }}>
          <Image source={mod.img} style={{ position:"absolute", width:"100%", height:"100%" }} contentFit="cover" />
          <View pointerEvents="none" style={{ position:"absolute", bottom:0, left:0, right:0, height:HERO_H * 0.65 }}>
            <Svg width={SW} height={HERO_H * 0.65} viewBox={`0 0 ${SW} ${HERO_H * 0.65}`} preserveAspectRatio="none">
              <Defs>
                <SvgGradient id="modHeroFade" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0"    stopColor="#0c2461" stopOpacity="0"   />
                  <Stop offset="0.3"  stopColor="#0c2461" stopOpacity="0"   />
                  <Stop offset="0.65" stopColor="#0c2461" stopOpacity="0.72"/>
                  <Stop offset="1"    stopColor="#0c2461" stopOpacity="1"   />
                </SvgGradient>
              </Defs>
              <SvgRect x="0" y="0" width={SW} height={HERO_H * 0.65} fill="url(#modHeroFade)" />
            </Svg>
          </View>
          <View style={{ position:"absolute", bottom:28, left:20, right:20 }}>
            <View style={{
              alignSelf:"flex-start", borderRadius:20, paddingHorizontal:12, paddingVertical:4, marginBottom:10,
              backgroundColor: mod.accentColor + "22", borderWidth:1, borderColor: mod.accentColor + "55",
            }}>
              <Text style={{ color:mod.accentColor, fontSize:11, fontWeight:"700", letterSpacing:1.5, textTransform:"uppercase" }}>
                {mod.tagline}
              </Text>
            </View>
            <Text style={{ color:"#fff", fontSize:34, fontWeight:"900", lineHeight:40 }}>
              {mod.title}
            </Text>
          </View>
        </View>

        {/* ── Description ──────────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal:20, paddingTop:20, paddingBottom:4 }}>
          <Text style={{ color:"rgba(255,255,255,0.58)", fontSize:14, lineHeight:22 }}>
            {mod.description}
          </Text>
        </View>

        {/* ── Tools ────────────────────────────────────────────────────────── */}
        <View style={{ paddingTop:28 }}>
          <Text style={{ paddingHorizontal:20, color:"#fff", fontSize:18, fontWeight:"800", marginBottom:14 }}>
            {mod.title} Tools
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal:16, gap:10 }}>
            {mod.tools.map(tool => (
              <TouchableOpacity key={tool.id}
                style={{
                  width:118, backgroundColor:"rgba(255,255,255,0.05)", borderRadius:16,
                  padding:14, borderWidth:1, borderColor: mod.accentColor + "33",
                  alignItems:"flex-start",
                }}
                activeOpacity={0.8}
                onPress={() => Alert.alert(tool.name, `${tool.desc}\n\nConnect with a ${mod.title} expert for a personalised session.`, [
                  { text:"Find Expert", onPress:() => router.push("/(tabs)/consultation" as any) },
                  { text:"Close", style:"cancel" },
                ])}>
                <View style={{
                  width:38, height:38, borderRadius:12,
                  alignItems:"center", justifyContent:"center", marginBottom:10,
                  backgroundColor: mod.accentColor + "22", borderWidth:1, borderColor: mod.accentColor + "44",
                }}>
                  <Ionicons name={tool.icon} size={18} color={mod.accentColor} />
                </View>
                <Text style={{ color:"#fff", fontSize:12, fontWeight:"700", lineHeight:16, marginBottom:4 }}>{tool.name}</Text>
                <Text style={{ color:"rgba(255,255,255,0.42)", fontSize:10, lineHeight:14 }}>{tool.desc}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Experts ──────────────────────────────────────────────────────── */}
        <View style={{ paddingTop:32, paddingHorizontal:20 }}>
          <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <Text style={{ color:"#fff", fontSize:18, fontWeight:"800" }}>{mod.title} Experts</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/consultation" as any)}>
              <Text style={{ color:mod.accentColor, fontSize:13, fontWeight:"700" }}>View All →</Text>
            </TouchableOpacity>
          </View>

          {loadingHealers ? (
            <ActivityIndicator color={mod.accentColor} style={{ paddingVertical:32 }} />
          ) : healers.length === 0 ? (
            <View style={{
              alignItems:"center", paddingVertical:32, borderRadius:16,
              backgroundColor:"rgba(255,255,255,0.03)", borderWidth:1, borderColor:"rgba(255,255,255,0.07)",
            }}>
              <Text style={{ color:"rgba(255,255,255,0.38)", fontSize:13, marginBottom:16 }}>
                No {mod.title.toLowerCase()} specialists listed yet
              </Text>
              <TouchableOpacity
                style={{ borderRadius:20, paddingHorizontal:22, paddingVertical:10, backgroundColor: mod.accentColor + "cc" }}
                onPress={() => router.push("/(tabs)/consultation" as any)}>
                <Text style={{ color:"#fff", fontSize:13, fontWeight:"700" }}>Browse All Experts</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap:10 }}>
              {healers.map(h => (
                <TouchableOpacity key={h._id}
                  style={{
                    backgroundColor:"rgba(255,255,255,0.04)", borderRadius:16,
                    borderWidth:1, borderColor:"rgba(255,255,255,0.07)",
                    padding:14, flexDirection:"row", gap:12, alignItems:"flex-start",
                  }}
                  activeOpacity={0.85}
                  onPress={() => router.push("/(tabs)/consultation" as any)}>

                  {/* Avatar */}
                  {h.avatar ? (
                    <Image source={{ uri:h.avatar }}
                      style={{ width:56, height:56, borderRadius:28, borderWidth:2, borderColor: mod.accentColor + "66" }}
                      contentFit="cover" cachePolicy="disk" />
                  ) : (
                    <View style={{ width:56, height:56, borderRadius:28, alignItems:"center", justifyContent:"center", borderWidth:2, borderColor: mod.accentColor + "55", backgroundColor: mod.accentColor + "22" }}>
                      <Text style={{ color:mod.accentColor, fontSize:22, fontWeight:"800" }}>{h.name[0]}</Text>
                    </View>
                  )}

                  {/* Info */}
                  <View style={{ flex:1 }}>
                    <View style={{ flexDirection:"row", justifyContent:"space-between", alignItems:"center", marginBottom:2 }}>
                      <Text style={{ color:"#fff", fontSize:14, fontWeight:"700", flex:1 }} numberOfLines={1}>{h.name}</Text>
                      {h.isOnline && (
                        <View style={{ flexDirection:"row", alignItems:"center", gap:4, marginLeft:8 }}>
                          <View style={{ width:6, height:6, borderRadius:3, backgroundColor:"#22c55e" }} />
                          <Text style={{ color:"#22c55e", fontSize:10, fontWeight:"600" }}>Online</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ color:"rgba(255,255,255,0.5)", fontSize:12, marginBottom:6 }} numberOfLines={1}>
                      {h.trainerRole}
                    </Text>
                    <View style={{ flexDirection:"row", gap:8, flexWrap:"wrap", alignItems:"center" }}>
                      {h.rating > 0 && (
                        <Text style={{ color:"#f59e0b", fontSize:12, fontWeight:"700" }}>⭐ {h.rating.toFixed(1)}</Text>
                      )}
                      {!!h.experience && (
                        <Text style={{ color:"rgba(255,255,255,0.38)", fontSize:11 }}>{h.experience}</Text>
                      )}
                      {!!h.sessionsDisplay && (
                        <Text style={{ color:"rgba(255,255,255,0.38)", fontSize:11 }}>{h.sessionsDisplay} sessions</Text>
                      )}
                    </View>
                    {(h.sessionPricePaise ?? 0) > 0 && (
                      <Text style={{ color:mod.accentColor, fontSize:12, fontWeight:"700", marginTop:6 }}>
                        ₹{Math.round((h.sessionPricePaise ?? 0) / 100)} / session
                      </Text>
                    )}
                  </View>

                  {/* Arrow */}
                  <View style={{ justifyContent:"center", paddingTop:2 }}>
                    <View style={{ width:32, height:32, borderRadius:16, alignItems:"center", justifyContent:"center", backgroundColor: mod.accentColor + "22", borderWidth:1, borderColor: mod.accentColor + "44" }}>
                      <Ionicons name="arrow-forward" size={14} color={mod.accentColor} />
                    </View>
                  </View>

                </TouchableOpacity>
              ))}

              <TouchableOpacity
                style={{
                  marginTop:6, borderRadius:14, paddingVertical:14, alignItems:"center",
                  backgroundColor: mod.accentColor + "18", borderWidth:1, borderColor: mod.accentColor + "30",
                }}
                onPress={() => router.push("/(tabs)/consultation" as any)}>
                <Text style={{ color:mod.accentColor, fontSize:14, fontWeight:"700" }}>
                  View All {mod.title} Experts →
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}
