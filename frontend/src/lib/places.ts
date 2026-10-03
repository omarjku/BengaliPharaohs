import placesJson from "../../public/data/places.json";
import type { Region, Season } from "./engine/types";

export type Upazila = { code: string; en: string; bn: string; region: Region; north: boolean };
export type Variety = { id: string; en: string; bn: string; type: "sub1" | "conventional" | "unknown"; season?: Season; flag?: string };

export const PLACES = placesJson as unknown as { upazilas: Upazila[]; varieties: Variety[] };

export const upazilaByCode = (code?: string) => PLACES.upazilas.find((u) => u.code === code);
export const varietyById = (id?: string) => PLACES.varieties.find((v) => v.id === id);
