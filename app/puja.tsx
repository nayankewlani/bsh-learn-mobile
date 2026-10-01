// ── Puja — Sacred Rituals & Mantras ───────────────────────────────────────────
import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

// ── Theme ─────────────────────────────────────────────────────────────────────
const C = {
  bg:"#0f0800", card:"#1a1000", border:"#3d2000", surface:"#241400",
  accent:"#f59e0b", accentSoft:"rgba(245,158,11,0.12)", gold:"#fbbf24",
  text:"#fef3c7", muted:"#92703a", red:"#ef4444", green:"#34d399",
};

// ── Puja data ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { id:"prosperity", icon:"💰", title:"Prosperity & Wealth", color:"#f59e0b",
    description:"Attract abundance and financial blessings. Ideal before new business ventures, career moves, or financial goals.",
    pujas:["Lakshmi Puja","Kuber Puja","Mahalakshmi Vrat","Dhan Trayodashi Puja"],
    benefits:["Removes financial obstacles","Invites prosperity and wealth","Strengthens career opportunities","Attracts positive opportunities"],
    bestDays:"Friday and Diwali", deity:"Goddess Lakshmi" },
  { id:"health", icon:"🌿", title:"Health & Healing", color:"#10b981",
    description:"Restore physical and mental wellbeing. Powerful for recovery, chronic conditions, or preventive spiritual health.",
    pujas:["Dhanvantari Puja","Maha Mrityunjaya Japa","Sudarshana Homa","Navagraha Puja"],
    benefits:["Supports healing and recovery","Reduces disease and suffering","Strengthens life force (prana)","Brings mental peace"],
    bestDays:"Sunday and Purnima", deity:"Lord Dhanvantari" },
  { id:"marriage", icon:"💒", title:"Marriage & Love", color:"#ec4899",
    description:"Bless relationships, resolve marriage delays, and attract a soulmate. For existing couples to deepen their bond.",
    pujas:["Gauri Puja","Swayamvara Parvathi Homa","Uma Maheshwara Puja","Kanya Daan"],
    benefits:["Removes marriage obstacles","Attracts compatible partner","Strengthens marital harmony","Deepens emotional bond"],
    bestDays:"Friday and Auspicious Muhurta", deity:"Goddess Parvati" },
  { id:"education", icon:"📚", title:"Education & Knowledge", color:"#60a5fa",
    description:"For students, scholars, and seekers of wisdom. Enhances memory, concentration, and intellectual clarity.",
    pujas:["Saraswati Puja","Vidya Ganapathi Homa","Hayagriva Puja","Aksharabhyasam"],
    benefits:["Improves memory and focus","Removes learning obstacles","Blessings for exams","Enhances creative intelligence"],
    bestDays:"Wednesday and Vasant Panchami", deity:"Goddess Saraswati" },
  { id:"protection", icon:"🛡️", title:"Protection & Removal of Obstacles", color:"#8b5cf6",
    description:"Shield yourself from negative energies, black magic, and life obstacles. Invoke divine protection.",
    pujas:["Ganesh Puja","Sudarshana Homa","Durga Saptashati","Nazar Nivaran Puja"],
    benefits:["Removes black magic effects","Clears path of obstacles","Invokes divine protection","Removes bad luck"],
    bestDays:"Tuesday and Navratri", deity:"Lord Ganesha & Goddess Durga" },
  { id:"ancestor", icon:"🙏", title:"Pitru Dosha & Ancestor Blessings", color:"#6b7280",
    description:"Resolve ancestral karma, seek blessings from departed souls, and bring peace to the family lineage.",
    pujas:["Pitru Puja","Shraddha Ceremony","Narayan Bali","Nagbali"],
    benefits:["Resolves ancestral debt","Brings peace to departed souls","Removes Pitru Dosha effects","Blesses family lineage"],
    bestDays:"Amavasya and Pitru Paksha", deity:"Lord Vishnu & Pitru Devatas" },
];

const MANTRAS = [
  { deity:"Ganesh", mantra:"ॐ गं गणपतये नमः", transliteration:"Om Gam Ganapataye Namah", benefit:"Removes obstacles, auspicious start" },
  { deity:"Lakshmi", mantra:"ॐ श्रीं महालक्ष्म्यै नमः", transliteration:"Om Shreem Mahalakshmyai Namah", benefit:"Prosperity, abundance, blessings" },
  { deity:"Saraswati", mantra:"ॐ ऐं सरस्वत्यै नमः", transliteration:"Om Aim Saraswatyai Namah", benefit:"Knowledge, wisdom, creativity" },
  { deity:"Shiva", mantra:"ॐ नमः शिवाय", transliteration:"Om Namah Shivaya", benefit:"Protection, liberation, peace" },
  { deity:"Durga", mantra:"ॐ दुं दुर्गायै नमः", transliteration:"Om Dum Durgayai Namah", benefit:"Courage, protection, strength" },
  { deity:"Vishnu", mantra:"ॐ नमो भगवते वासुदेवाय", transliteration:"Om Namo Bhagavate Vasudevaya", benefit:"Peace, harmony, divine grace" },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function Puja() {
  const router = useRouter();
  const [expanded, setExpanded] = useState<string|null>(null);
  const [showMantras, setShowMantras] = useState(false);

  const toggle = (id:string) => setExpanded(prev => prev===id ? null : id);

  const contactWhatsApp = (pujaTitle:string) => {
    const msg = encodeURIComponent(`Namaste 🙏\n\nI am interested in booking a ${pujaTitle}.\n\nPlease share more details about the puja, timings, and prasad arrangements.`);
    Linking.openURL(`https://wa.me/918485871750?text=${msg}`).catch(()=>{});
  };

  return (
    <SafeAreaView style={{flex:1,backgroundColor:C.bg}} edges={["top"]}>
      <View style={s.header}>
        <TouchableOpacity onPress={()=>router.back()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={22} color={C.text}/>
        </TouchableOpacity>
        <View>
          <Text style={s.headerTitle}>🪔 Puja</Text>
          <Text style={s.headerSub}>Sacred rituals & divine blessings</Text>
        </View>
      </View>

      <ScrollView style={{flex:1}} contentContainerStyle={{padding:16,paddingBottom:48}}>

        {/* Intro banner */}
        <View style={[s.introBanner]}>
          <Text style={{fontSize:32,marginBottom:8}}>🕉️</Text>
          <Text style={s.introTitle}>Book a Sacred Puja</Text>
          <Text style={s.introSub}>
            Our experienced pandits perform authentic Vedic pujas with the correct vidhi (procedure),
            mantras, and offerings — customised for your specific need and birth chart.
          </Text>
        </View>

        {/* Category cards */}
        <Text style={s.sectionLabel}>Choose Your Puja Purpose</Text>
        {CATEGORIES.map(cat=>{
          const open = expanded===cat.id;
          return (
            <View key={cat.id} style={[s.catCard,{borderColor:cat.color+"44"},open&&{borderColor:cat.color}]}>
              <TouchableOpacity onPress={()=>toggle(cat.id)} style={s.catHeader} activeOpacity={0.75}>
                <View style={[s.catIcon,{backgroundColor:cat.color+"18",borderColor:cat.color+"33"}]}>
                  <Text style={{fontSize:22}}>{cat.icon}</Text>
                </View>
                <View style={{flex:1}}>
                  <Text style={{fontSize:14,fontWeight:"800",color:cat.color}}>{cat.title}</Text>
                  <Text style={{fontSize:12,color:C.muted,marginTop:2}} numberOfLines={open?undefined:1}>{cat.description}</Text>
                </View>
                <Ionicons name={open?"chevron-up":"chevron-down"} size={18} color={cat.color}/>
              </TouchableOpacity>

              {open&&(
                <View style={{paddingTop:12,borderTopWidth:1,borderColor:cat.color+"22",marginTop:10}}>
                  <Text style={{fontSize:10,fontWeight:"800",color:C.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Deity</Text>
                  <Text style={{fontSize:13,fontWeight:"700",color:cat.color,marginBottom:12}}>{cat.deity}</Text>

                  <Text style={{fontSize:10,fontWeight:"800",color:C.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Specific Pujas</Text>
                  <View style={{flexDirection:"row",flexWrap:"wrap",gap:6,marginBottom:12}}>
                    {cat.pujas.map(p=>(
                      <View key={p} style={[s.pujaChip,{borderColor:cat.color+"55",backgroundColor:cat.color+"12"}]}>
                        <Text style={{fontSize:11,fontWeight:"700",color:cat.color}}>{p}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={{fontSize:10,fontWeight:"800",color:C.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:6}}>Key Benefits</Text>
                  {cat.benefits.map((b,i)=>(
                    <View key={i} style={{flexDirection:"row",alignItems:"flex-start",gap:8,marginBottom:6}}>
                      <Ionicons name="checkmark-circle" size={14} color={cat.color} style={{marginTop:1}}/>
                      <Text style={{fontSize:12,color:C.text,flex:1,lineHeight:18}}>{b}</Text>
                    </View>
                  ))}

                  <Text style={{fontSize:10,fontWeight:"700",color:C.muted,marginTop:8}}>
                    Best on: <Text style={{color:cat.color}}>{cat.bestDays}</Text>
                  </Text>

                  <TouchableOpacity style={[s.bookBtn,{backgroundColor:cat.color}]} onPress={()=>contactWhatsApp(cat.title)} activeOpacity={0.8}>
                    <Ionicons name="logo-whatsapp" size={16} color="#fff"/>
                    <Text style={s.bookBtnTxt}>Book This Puja</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Mantras section */}
        <TouchableOpacity style={s.mantraToggle} onPress={()=>setShowMantras(v=>!v)} activeOpacity={0.8}>
          <Text style={{fontSize:14,fontWeight:"800",color:C.gold}}>📿 Daily Mantras & Stotras</Text>
          <Ionicons name={showMantras?"chevron-up":"chevron-down"} size={18} color={C.gold}/>
        </TouchableOpacity>

        {showMantras&&(
          <View style={{gap:10}}>
            {MANTRAS.map(m=>(
              <View key={m.deity} style={[s.mantraCard]}>
                <Text style={{fontSize:12,fontWeight:"800",color:C.gold,marginBottom:4}}>{m.deity}</Text>
                <Text style={{fontSize:18,fontWeight:"900",color:C.text,letterSpacing:1,marginBottom:6,lineHeight:28}}>{m.mantra}</Text>
                <Text style={{fontSize:12,color:C.muted,fontStyle:"italic",marginBottom:4}}>{m.transliteration}</Text>
                <View style={{flexDirection:"row",alignItems:"center",gap:4}}>
                  <Ionicons name="sparkles" size={11} color={C.accent}/>
                  <Text style={{fontSize:11,color:C.accent}}>{m.benefit}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* General booking CTA */}
        <View style={s.ctaCard}>
          <Text style={{fontSize:16,fontWeight:"900",color:C.gold,marginBottom:8}}>🙏 Custom Puja Consultation</Text>
          <Text style={{fontSize:13,color:C.muted,lineHeight:19,marginBottom:14}}>
            Not sure which puja suits your situation? Our jyotishi can analyse your birth chart and recommend
            the most effective puja for your current planetary period.
          </Text>
          <TouchableOpacity style={[s.bookBtn,{backgroundColor:C.accent}]} onPress={()=>contactWhatsApp("Custom Puja Consultation")} activeOpacity={0.8}>
            <Ionicons name="logo-whatsapp" size={16} color="#fff"/>
            <Text style={s.bookBtnTxt}>Get Free Consultation</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:{flexDirection:"row",alignItems:"center",gap:14,paddingHorizontal:16,paddingVertical:12,borderBottomWidth:1,borderColor:C.border},
  backBtn:{padding:6},
  headerTitle:{fontSize:20,fontWeight:"900",color:C.text},
  headerSub:{fontSize:11,color:C.muted,marginTop:1},
  introBanner:{backgroundColor:C.card,borderRadius:16,borderWidth:1,borderColor:C.border,padding:20,alignItems:"center",textAlign:"center",marginBottom:16},
  introTitle:{fontSize:20,fontWeight:"900",color:C.gold,marginBottom:6},
  introSub:{fontSize:13,color:C.muted,lineHeight:20,textAlign:"center"},
  sectionLabel:{fontSize:11,fontWeight:"800",color:C.muted,textTransform:"uppercase",letterSpacing:0.5,marginBottom:12},
  catCard:{backgroundColor:C.card,borderRadius:16,borderWidth:1,borderColor:C.border,padding:14,marginBottom:12},
  catHeader:{flexDirection:"row",alignItems:"flex-start",gap:12},
  catIcon:{width:46,height:46,borderRadius:14,borderWidth:1,alignItems:"center",justifyContent:"center"},
  pujaChip:{borderRadius:20,paddingHorizontal:10,paddingVertical:5,borderWidth:1},
  bookBtn:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,borderRadius:12,paddingVertical:13,marginTop:16},
  bookBtnTxt:{color:"#fff",fontSize:14,fontWeight:"800"},
  mantraToggle:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",backgroundColor:C.card,borderRadius:14,borderWidth:1,borderColor:C.border,padding:16,marginTop:4,marginBottom:12},
  mantraCard:{backgroundColor:C.card,borderRadius:14,borderWidth:1,borderColor:C.border,padding:14},
  ctaCard:{backgroundColor:C.surface,borderRadius:16,borderWidth:1,borderColor:C.accent+"33",padding:16,marginTop:8},
});
