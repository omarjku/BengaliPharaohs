import placesJson from "../../public/data/places.json";
import type { Region, Season } from "./engine/types";

export type District = { code: string; en: string; bn: string; division: string; region: Region; north: boolean };
export type Upazila = { code: string; en: string; bn: string; region: Region; north: boolean; district?: string; name_en?: string; name_bn?: string };
export type VarietyGroup = "unknown" | "flood" | "brri" | "bina" | "hybrid" | "local" | "other";
export type Variety = { id: string; en: string; bn: string; type: "sub1" | "conventional" | "unknown"; season?: Season; flag?: string; group?: VarietyGroup };

export const PLACES = placesJson as unknown as {
  aliases?: Record<string, string>;
  variety_aliases?: Record<string, string>;
  districts: District[];
  upazilas: Upazila[];
  varieties: Variety[];
};

/** Old/placeholder codes (e.g. "SIR") still resolve, so profiles saved on phones keep working. */
export const upazilaByCode = (code?: string) => {
  if (!code) return undefined;
  const real = PLACES.aliases?.[code] ?? code;
  return PLACES.upazilas.find((u) => u.code === real);
};
export const varietyById = (id?: string) => {
  if (!id) return undefined;
  const real = PLACES.variety_aliases?.[id] ?? id;
  return PLACES.varieties.find((v) => v.id === real);
};
export const districtByCode = (code?: string) => PLACES.districts.find((d) => d.code === code);
export const upazilasOf = (district?: string) => PLACES.upazilas.filter((u) => u.district === district);
