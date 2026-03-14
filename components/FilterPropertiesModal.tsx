import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { palette } from "@/constants/theme";

export type PropertyMode = "buy" | "rent";

export type ExploreFiltersState = {
  propertyMode?: PropertyMode;
  priceMin?: number;
  priceMax?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  amenities: string[];
};

type Props = {
  visible: boolean;
  onClose: () => void;
  initialFilters: ExploreFiltersState;
  onApply: (filters: ExploreFiltersState) => void;
  onReset: () => void;
  minimumPrice?: number;
  maximumPrice?: number;
};

const PROPERTY_TYPES = ["Apartment", "House", "Studio", "Villa", "Townhouse", "Condo"];

const BEDROOM_OPTIONS = ["1", "2", "3", "4+"];
const BATHROOM_OPTIONS = ["1", "2", "3", "4+"];

const AMENITIES = ["Wifi", "Parking", "Garage", "Garden", "Gym", "Swimming Pool", "Security"];

const DEFAULT_MIN_PRICE = 0;
const DEFAULT_MAX_PRICE = 100000000;

const FilterPropertiesModal: React.FC<Props> = ({
  visible,
  onClose,
  initialFilters,
  onApply,
  onReset,
  minimumPrice = DEFAULT_MIN_PRICE,
  maximumPrice = DEFAULT_MAX_PRICE,
}) => {
  const [localFilters, setLocalFilters] = useState<ExploreFiltersState>({
    propertyMode: initialFilters.propertyMode,
    priceMin: initialFilters.priceMin ?? minimumPrice,
    priceMax: initialFilters.priceMax ?? maximumPrice,
    propertyType: initialFilters.propertyType,
    bedrooms: initialFilters.bedrooms,
    bathrooms: initialFilters.bathrooms,
    amenities: initialFilters.amenities ?? [],
  });

  useEffect(() => {
    if (visible) {
      setLocalFilters({
        propertyMode: initialFilters.propertyMode,
        priceMin: initialFilters.priceMin ?? minimumPrice,
        priceMax: initialFilters.priceMax ?? maximumPrice,
        propertyType: initialFilters.propertyType,
        bedrooms: initialFilters.bedrooms,
        bathrooms: initialFilters.bathrooms,
        amenities: initialFilters.amenities ?? [],
      });
    }
  }, [visible, initialFilters, minimumPrice, maximumPrice]);

  const handleToggleMode = (mode: PropertyMode) => {
    setLocalFilters((prev) => ({
      ...prev,
      propertyMode: prev.propertyMode === mode ? undefined : mode,
    }));
  };

  const handleSelectPropertyType = (type: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      propertyType: prev.propertyType === type ? undefined : type,
    }));
  };

  const handleBedroomsChange = (value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      bedrooms: prev.bedrooms === parseBedrooms(value) ? undefined : parseBedrooms(value),
    }));
  };

  const handleBathroomsChange = (value: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      bathrooms: prev.bathrooms === parseBedrooms(value) ? undefined : parseBedrooms(value),
    }));
  };

  const handleToggleAmenity = (amenity: string) => {
    setLocalFilters((prev) => {
      const current = prev.amenities ?? [];
      if (current.includes(amenity)) {
        return { ...prev, amenities: current.filter((a) => a !== amenity) };
      }
      return { ...prev, amenities: [...current, amenity] };
    });
  };

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    onReset();
    setLocalFilters({
      propertyMode: undefined,
      priceMin: minimumPrice,
      priceMax: maximumPrice,
      propertyType: undefined,
      bedrooms: undefined,
      bathrooms: undefined,
      amenities: [],
    });
  };

  const hasActiveFilters = useMemo(() => {
    const lf = localFilters;
    return Boolean(
      lf.propertyMode ||
        lf.propertyType ||
        lf.bedrooms ||
        lf.bathrooms ||
        (lf.amenities && lf.amenities.length > 0) ||
        lf.priceMin !== minimumPrice ||
        lf.priceMax !== maximumPrice
    );
  }, [localFilters, minimumPrice, maximumPrice]);

  const handlePriceChange = (direction: "min" | "max", delta: number) => {
    setLocalFilters((prev) => {
      const currentMin = prev.priceMin ?? minimumPrice;
      const currentMax = prev.priceMax ?? maximumPrice;

      if (direction === "min") {
        const nextMin = Math.max(minimumPrice, Math.min(currentMin + delta, currentMax));
        return { ...prev, priceMin: nextMin };
      }

      const nextMax = Math.min(maximumPrice, Math.max(currentMax + delta, currentMin));
      return { ...prev, priceMax: nextMax };
    });
  };

  const formattedPriceRange = useMemo(() => {
    const min = localFilters.priceMin ?? minimumPrice;
    const max = localFilters.priceMax ?? maximumPrice;
    const format = (v: number) => {
      if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)} Cr`;
      if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
      if (v === 0) return "₹0";
      return `₹${v.toLocaleString("en-IN")}`;
    };
    return `${format(min)} - ${format(max)}`;
  }, [localFilters.priceMin, localFilters.priceMax, minimumPrice, maximumPrice]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <SafeAreaView style={styles.sheetContainer} edges={["bottom"]}>
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <Text style={styles.title}>Filter Properties</Text>
            {hasActiveFilters ? (
              <Text style={styles.activeFiltersText}>Filters applied</Text>
            ) : null}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Property Mode */}
            <Section title="Property Mode">
              <View style={styles.chipRow}>
                <ToggleChip
                  label="Buy"
                  active={localFilters.propertyMode === "buy"}
                  onPress={() => handleToggleMode("buy")}
                />
                <ToggleChip
                  label="Rent"
                  active={localFilters.propertyMode === "rent"}
                  onPress={() => handleToggleMode("rent")}
                />
              </View>
            </Section>

            {/* Price Range */}
            <Section title="Price Range">
              <Text style={styles.priceRangeValue}>{formattedPriceRange}</Text>
              <View style={styles.priceSliderContainer}>
                <View style={styles.priceSliderTrack}>
                  <View style={styles.priceSliderTrackFilled} />
                </View>
                <View style={styles.priceButtonsRow}>
                  <StepperButton
                    label="-"
                    onPress={() => handlePriceChange("min", -500000)}
                  />
                  <Text style={styles.priceHintText}>Adjust Min</Text>
                  <StepperButton
                    label="+"
                    onPress={() => handlePriceChange("min", 500000)}
                  />
                </View>
                <View style={styles.priceButtonsRow}>
                  <StepperButton
                    label="-"
                    onPress={() => handlePriceChange("max", -500000)}
                  />
                  <Text style={styles.priceHintText}>Adjust Max</Text>
                  <StepperButton
                    label="+"
                    onPress={() => handlePriceChange("max", 500000)}
                  />
                </View>
              </View>
            </Section>

            {/* Property Type */}
            <Section title="Property Type">
              <View style={styles.chipWrapRow}>
                {PROPERTY_TYPES.map((type) => (
                  <ToggleChip
                    key={type}
                    label={type}
                    active={localFilters.propertyType === type}
                    onPress={() => handleSelectPropertyType(type)}
                  />
                ))}
              </View>
            </Section>

            {/* Bedrooms */}
            <Section title="Bedrooms">
              <View style={styles.chipRow}>
                {BEDROOM_OPTIONS.map((option) => (
                  <ToggleChip
                    key={option}
                    label={option}
                    active={localFilters.bedrooms === parseBedrooms(option)}
                    onPress={() => handleBedroomsChange(option)}
                  />
                ))}
              </View>
            </Section>

            {/* Bathrooms */}
            <Section title="Bathrooms">
              <View style={styles.chipRow}>
                {BATHROOM_OPTIONS.map((option) => (
                  <ToggleChip
                    key={option}
                    label={option}
                    active={localFilters.bathrooms === parseBedrooms(option)}
                    onPress={() => handleBathroomsChange(option)}
                  />
                ))}
              </View>
            </Section>

            {/* Amenities */}
            <Section title="Amenities">
              <View style={styles.amenitiesWrap}>
                {AMENITIES.map((amenity) => {
                  const isSelected = (localFilters.amenities ?? []).includes(amenity);
                  return (
                    <TouchableOpacity
                      key={amenity}
                      style={styles.amenityRow}
                      onPress={() => handleToggleAmenity(amenity)}
                      activeOpacity={0.9}
                    >
                      <View
                        style={[
                          styles.checkbox,
                          isSelected && styles.checkboxChecked,
                        ]}
                      >
                        {isSelected ? (
                          <Ionicons
                            name="checkmark"
                            size={16}
                            color={palette.surface}
                          />
                        ) : null}
                      </View>
                      <Text style={styles.amenityLabel}>{amenity}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Section>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleReset}
              style={styles.resetButton}
              activeOpacity={0.9}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleApply}
              style={styles.applyButton}
              activeOpacity={0.9}
            >
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const ToggleChip: React.FC<{
  label: string;
  active: boolean;
  onPress: () => void;
}> = ({ label, active, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.9}
    style={[
      styles.chip,
      active && styles.chipActive,
    ]}
  >
    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const StepperButton: React.FC<{
  label: string;
  onPress: () => void;
}> = ({ label, onPress }) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.stepperButton}
    activeOpacity={0.9}
  >
    <Text style={styles.stepperLabel}>{label}</Text>
  </TouchableOpacity>
);

const parseBedrooms = (value: string): number => {
  if (value.endsWith("+")) {
    const num = parseInt(value.replace("+", ""), 10);
    if (!Number.isNaN(num)) {
      return num;
    }
  }
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return 0;
  return n;
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingHorizontal: 20,
    maxHeight: "90%",
  },
  handle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: palette.textPrimary,
  },
  activeFiltersText: {
    fontSize: 12,
    color: palette.primary,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: palette.textSecondary,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipWrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surfaceMuted,
  },
  chipActive: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipLabel: {
    fontSize: 13,
    color: palette.textPrimary,
  },
  chipLabelActive: {
    color: palette.surface,
    fontWeight: "600",
  },
  priceRangeValue: {
    fontSize: 14,
    fontWeight: "500",
    color: palette.textPrimary,
    marginBottom: 8,
  },
  priceSliderContainer: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 12,
    backgroundColor: palette.surfaceMuted,
  },
  priceSliderTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
    overflow: "hidden",
    marginBottom: 12,
  },
  priceSliderTrackFilled: {
    flex: 1,
    backgroundColor: palette.primary,
  },
  priceButtonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priceHintText: {
    fontSize: 12,
    color: palette.textMuted,
  },
  stepperButton: {
    width: 36,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surface,
  },
  stepperLabel: {
    fontSize: 18,
    color: palette.textPrimary,
    fontWeight: "500",
  },
  amenitiesWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 12,
    rowGap: 8,
  },
  amenityRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: palette.surface,
  },
  checkboxChecked: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  amenityLabel: {
    fontSize: 13,
    color: palette.textPrimary,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    gap: 12,
  },
  resetButton: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.surfaceMuted,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: "500",
    color: palette.textPrimary,
  },
  applyButton: {
    flex: 1.1,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: palette.surface,
  },
});

export default FilterPropertiesModal;

