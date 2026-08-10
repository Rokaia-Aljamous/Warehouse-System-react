import type { Section, SectionProduct } from "@/lib/manager-api";

export interface OrientationFit {
  length_fit: number;
  width_fit: number;
  height_fit: number;
  capacity: number;
}

export interface CapacityResult {
  section_volume: number;
  parcel_volume: number | null;
  used_volume: number;
  remaining_volume: number;
  volume_usage_percentage: number;
  max_parcels_capacity: number | null;
  remaining_parcels_capacity: number | null;
  quantity_parcels: number;
  quantity_units: number | null;
  remaining_units_capacity: number | null;
  capacity_usage_percentage: number | null;
  best_orientation: OrientationFit | null;
}

const roundVolume = (value: number): number => Math.round(value * 10000) / 10000;
const round2 = (value: number): number => Math.round(value * 100) / 100;

function bestOrientation(
  sectionLength: number,
  sectionWidth: number,
  sectionHeight: number,
  parcelLength: number,
  parcelWidth: number,
  parcelHeight: number,
): OrientationFit {
  const orientations = [
    [parcelLength, parcelWidth, parcelHeight],
    [parcelLength, parcelHeight, parcelWidth],
    [parcelWidth, parcelLength, parcelHeight],
    [parcelWidth, parcelHeight, parcelLength],
    [parcelHeight, parcelLength, parcelWidth],
    [parcelHeight, parcelWidth, parcelLength],
  ];

  const unique = new Map<string, { length: number; width: number; height: number }>();
  for (const [length, width, height] of orientations) {
    unique.set([length, width, height].join("|"), { length, width, height });
  }

  let best: OrientationFit = { length_fit: 0, width_fit: 0, height_fit: 0, capacity: 0 };

  for (const { length, width, height } of unique.values()) {
    const lengthFit = length > 0 ? Math.floor(sectionLength / length) : 0;
    const widthFit = width > 0 ? Math.floor(sectionWidth / width) : 0;
    const heightFit = height > 0 ? Math.floor(sectionHeight / height) : 0;
    const capacity = lengthFit * widthFit * heightFit;

    if (capacity > best.capacity) {
      best = { length_fit: lengthFit, width_fit: widthFit, height_fit: heightFit, capacity };
    }
  }

  return best;
}

export function calculateSectionCapacity(
  sectionLength: number,
  sectionWidth: number,
  sectionHeight: number,
  quantityParcels: number,
  product: SectionProduct | null,
): CapacityResult {
  const sectionVolume = roundVolume(sectionLength * sectionWidth * sectionHeight);

  if (!product) {
    return {
      section_volume: sectionVolume,
      parcel_volume: null,
      used_volume: 0,
      remaining_volume: sectionVolume,
      volume_usage_percentage: 0,
      max_parcels_capacity: null,
      remaining_parcels_capacity: null,
      quantity_parcels: quantityParcels,
      quantity_units: null,
      remaining_units_capacity: null,
      capacity_usage_percentage: null,
      best_orientation: null,
    };
  }

  const parcelLength = product.parcel_dimensions?.length ?? 0;
  const parcelWidth = product.parcel_dimensions?.width ?? 0;
  const parcelHeight = product.parcel_dimensions?.height ?? 0;
  const unitsPerPacking = product.units_per_packing || 1;

  const parcelVolume = roundVolume(parcelLength * parcelWidth * parcelHeight);
  const usedVolume = roundVolume(quantityParcels * parcelVolume);
  const remainingVolume = roundVolume(Math.max(0, sectionVolume - usedVolume));

  const orientation = bestOrientation(
    sectionLength,
    sectionWidth,
    sectionHeight,
    parcelLength,
    parcelWidth,
    parcelHeight,
  );
  const maxParcelsCapacity = orientation.capacity;
  const remainingParcelsCapacity = Math.max(0, maxParcelsCapacity - quantityParcels);

  return {
    section_volume: sectionVolume,
    parcel_volume: parcelVolume,
    used_volume: usedVolume,
    remaining_volume: remainingVolume,
    volume_usage_percentage:
      sectionVolume > 0 ? round2(Math.min(100, (usedVolume / sectionVolume) * 100)) : 0,
    max_parcels_capacity: maxParcelsCapacity,
    remaining_parcels_capacity: remainingParcelsCapacity,
    quantity_parcels: quantityParcels,
    quantity_units: quantityParcels * unitsPerPacking,
    remaining_units_capacity: remainingParcelsCapacity * unitsPerPacking,
    capacity_usage_percentage:
      maxParcelsCapacity > 0
        ? round2(Math.min(100, (quantityParcels / maxParcelsCapacity) * 100))
        : 0,
    best_orientation: orientation,
  };
}

export type SlotFillState = "filled" | "partial" | "empty";

export interface VisualSlot {
  row: number;
  col: number;
  label: string;
  state: SlotFillState;
  stacked: number;
}

export interface SectionSlotGrid {
  rows: number;
  cols: number;
  maxPerStack: number;
  maxSlots: number;
  slots: VisualSlot[];
}

export function buildSectionSlotGrid(section: Section): SectionSlotGrid | null {
  const orientation = section.capacity?.best_orientation;
  if (!orientation) return null;

  const rows = Math.max(1, orientation.width_fit);
  const cols = Math.max(1, orientation.length_fit);
  const maxPerStack = Math.max(1, orientation.height_fit);
  const maxSlots = rows * cols;
  const filled = Math.min(
    section.quantity_parcels,
    section.capacity.max_parcels_capacity ?? section.quantity_parcels,
  );

  const rowLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const slots: VisualSlot[] = [];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      const filledInThisSlot = Math.max(0, filled - index * maxPerStack);
      let state: SlotFillState = "empty";
      if (filledInThisSlot >= maxPerStack) state = "filled";
      else if (filledInThisSlot > 0) state = "partial";

      slots.push({
        row: r,
        col: c,
        label: `${rowLetters[r] ?? r + 1}${c + 1}`,
        state,
        stacked: Math.max(0, Math.min(maxPerStack, filledInThisSlot)),
      });
    }
  }

  return { rows, cols, maxPerStack, maxSlots, slots };
}
