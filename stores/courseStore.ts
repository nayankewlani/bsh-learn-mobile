import { create } from "zustand";
import client from "../api/client";

export interface Course {
  _id: string;
  title: string;
  description: string;
  educator: { _id: string; name: string; avatar?: string };
  category: string;
  level: string;
  price: number;
  discountPrice?: number;
  thumbnail: string;
  rating: number;
  ratingCount: number;
  enrollmentCount: number;
  totalLessons: number;
  language: string;
}

interface CourseState {
  courses: Course[];
  featuredCourses: Course[];
  enrolledCourses: { course: Course; progress: number }[];
  isLoading: boolean;
  fetchCourses: (params?: Record<string, string | number>) => Promise<void>;
  fetchFeatured: () => Promise<void>;
  fetchMyCourses: () => Promise<void>;
}

export const useCourseStore = create<CourseState>((set) => ({
  courses: [],
  featuredCourses: [],
  enrolledCourses: [],
  isLoading: false,

  fetchCourses: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { data } = await client.get("/courses", { params });
      set({ courses: data.courses, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  fetchFeatured: async () => {
    try {
      const { data } = await client.get("/courses/featured");
      set({ featuredCourses: data.courses });
    } catch {}
  },

  fetchMyCourses: async () => {
    try {
      const { data } = await client.get("/my-courses");
      set({ enrolledCourses: data.enrollments.map((e: { course: Course; progress: number }) => ({ course: e.course, progress: e.progress })) });
    } catch {}
  },
}));
