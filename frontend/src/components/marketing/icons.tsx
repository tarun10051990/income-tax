import {
  BadgeIndianRupee,
  BookOpen,
  Building2,
  ChartPie,
  HeartHandshake,
  Landmark,
  LifeBuoy,
  Lock,
  Percent,
  Receipt,
  Rocket,
  Scale,
  ShieldCheck,
  Timer,
  Users,
  type LucideIcon,
} from "lucide-react";
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaYoutube } from "react-icons/fa6";
import type { IconType } from "react-icons";
import type { ServiceIconName } from "@/content/services";
import type { FeatureIconName } from "@/content/marketing";

export const serviceIcons: Record<ServiceIconName, LucideIcon> = {
  receipt: Receipt,
  percent: Percent,
  "book-open": BookOpen,
  landmark: Landmark,
  "shield-check": ShieldCheck,
  building: Building2,
  rocket: Rocket,
  "pie-chart": ChartPie,
  scale: Scale,
};

export const featureIcons: Record<FeatureIconName, LucideIcon> = {
  users: Users,
  "badge-indian-rupee": BadgeIndianRupee,
  timer: Timer,
  lock: Lock,
  "heart-handshake": HeartHandshake,
  "life-buoy": LifeBuoy,
};

export const socialIcons: Record<string, IconType> = {
  linkedin: FaLinkedinIn,
  instagram: FaInstagram,
  facebook: FaFacebookF,
  youtube: FaYoutube,
};
