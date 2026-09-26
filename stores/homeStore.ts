import { create } from "zustand";
import { InteractionManager } from "react-native";
import client from "../api/client";

const TTL = 2 * 60 * 1000; // 2-minute cache

// Module-level flag prevents double-fetches without a premature set() that
// triggers a wasted re-render before any data arrives.
let isFetching = false;

interface HomeStoreState {
  heroBanners: any[];
  upcomingClasses: any[];
  liveHeroSessions: any[];
  homeTrainers: any[];
  trainersLoaded: boolean;
  apiPrograms: any[];
  apiBatches: any[];
  homeClasses: any[];
  lastFetched: number | null;
  fetchHomeData: () => void;
}

export const useHomeStore = create<HomeStoreState>((set, get) => ({
  heroBanners: [],
  upcomingClasses: [],
  liveHeroSessions: [],
  homeTrainers: [],
  trainersLoaded: false,
  apiPrograms: [],
  apiBatches: [],
  homeClasses: [],
  lastFetched: null,

  fetchHomeData: () => {
    const { lastFetched } = get();
    if (lastFetched !== null && Date.now() - lastFetched < TTL) return;
    if (isFetching) return;
    isFetching = true;

    InteractionManager.runAfterInteractions(async () => {
      try {
        // Fire ALL requests in parallel — one set() at the end = ONE re-render
        const [banners, upcoming, live, sched, trainers, programs, batches, classes] =
          await Promise.allSettled([
            client.get("/hero-banners"),
            client.get("/upcoming-classes"),
            client.get("/live-classes?status=live"),
            client.get("/live-classes?status=scheduled"),
            client.get("/chat/online-educators"),
            client.get("/courses/programs/public"),
            client.get("/courses/featured"),
            client.get("/home-classes"),
          ]);

        set({
          // lastFetched merged here so there's only ONE store set() → ONE re-render
          lastFetched: Date.now(),
          heroBanners: banners.status === "fulfilled"
            ? (banners.value.data.banners ?? []).map((b: any) => ({ ...b, _type: "banner" as const }))
            : [],
          upcomingClasses: upcoming.status === "fulfilled"
            ? upcoming.value.data.classes ?? []
            : [],
          liveHeroSessions: (live.status === "fulfilled" && sched.status === "fulfilled")
            ? [...(live.value.data.classes ?? []), ...(sched.value.data.classes ?? [])].slice(0, 8)
            : [],
          homeTrainers: trainers.status === "fulfilled"
            ? trainers.value.data.educators ?? []
            : [],
          trainersLoaded: true,
          apiPrograms: programs.status === "fulfilled"
            ? programs.value.data.programs ?? []
            : [],
          apiBatches: batches.status === "fulfilled"
            ? batches.value.data.courses ?? []
            : [],
          homeClasses: classes.status === "fulfilled"
            ? classes.value.data.classes ?? []
            : [],
        });
      } finally {
        isFetching = false;
      }
    });
  },
}));
