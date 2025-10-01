import { TagType } from "@prisma/client";
import { TAG_OPTIONS, TagCategory, normalizeTagKey, getTagLabel } from "./catalog";

export const TAG_TYPE_TO_CATEGORY: Record<TagType, TagCategory | "topic"> = {
  [TagType.ROTATION]: "rotation",
  [TagType.RESOURCE]: "resource",
  [TagType.SUBJECT]: "discipline",
  [TagType.SYSTEM]: "system",
  [TagType.TOPIC]: "topic",
  [TagType.MODE]: "mode",
};

export const CATEGORY_TO_TAG_TYPE: Record<TagCategory, TagType> = {
  rotation: TagType.ROTATION,
  resource: TagType.RESOURCE,
  discipline: TagType.SUBJECT,
  system: TagType.SYSTEM,
  mode: TagType.MODE,
};

export function canonicalizeTagValue(type: TagType, rawValue: string): string {
  const trimmed = rawValue.trim();
  if (!trimmed) return "";
  const category = TAG_TYPE_TO_CATEGORY[type];
  if (!category || category === "topic") {
    return trimmed;
  }
  return normalizeTagKey(category, trimmed) ?? trimmed;
}

export function labelForTag(type: TagType, value: string): string {
  const category = TAG_TYPE_TO_CATEGORY[type];
  if (!category || category === "topic") {
    return value;
  }
  return getTagLabel(category, value) ?? value;
}

export function listKeysForType(type: TagType): string[] {
  const category = TAG_TYPE_TO_CATEGORY[type];
  if (!category || category === "topic") return [];
  return TAG_OPTIONS[category].map((option) => option.key);
}

export function expandTagValues(type: TagType, rawValues: string[]): string[] {
  const set = new Set<string>();
  const category = TAG_TYPE_TO_CATEGORY[type];

  for (const raw of rawValues) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    set.add(trimmed);
  }

  if (!category || category === "topic") {
    return Array.from(set);
  }

  const options = TAG_OPTIONS[category];
  const byKey = new Map(options.map((option) => [option.key, option]));

  for (const raw of rawValues) {
    if (!raw) continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const canonical = canonicalizeTagValue(type, trimmed);
    if (!canonical) continue;
    set.add(canonical);

    const option = byKey.get(canonical);
    if (option) {
      set.add(option.label);
      option.aliases?.forEach((alias) => {
        if (alias) set.add(alias);
      });
    }
  }

  const normalized = Array.from(set)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

  return Array.from(new Set(normalized));
}
