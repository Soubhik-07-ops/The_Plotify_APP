import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, TextInput, Image, StyleSheet } from 'react-native';
import { useDebouncedCallback } from 'use-debounce';
import { palette } from '@/constants/theme';
import icons from '@/constants/icons';

interface SearchBarProps {
    value?: string;
    onChange: (text: string) => void;
    onSubmit?: () => void;
    placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
    value = '',
    onChange,
    onSubmit,
    placeholder = 'Search for properties, locations...',
}) => {
    // Use local state that's independent of parent
    const [localValue, setLocalValue] = useState(value);
    const inputRef = useRef<TextInput>(null);
    const isInternalUpdate = useRef(false);
    const lastSyncedValue = useRef(value);
    const onChangeRef = useRef(onChange);
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Keep onChange ref updated
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Only sync with external value if it changed externally and we're not typing
    useEffect(() => {
        // Only update if value changed externally (not from our debounced update)
        if (value !== lastSyncedValue.current && !isInternalUpdate.current) {
            setLocalValue(value);
            lastSyncedValue.current = value;
        }
        isInternalUpdate.current = false;
    }, [value]);

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    const handleTextChange = useCallback((text: string) => {
        // Update local state immediately for responsive UI
        setLocalValue(text);

        // Clear existing timer
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        // Set new debounced timer
        debounceTimerRef.current = setTimeout(() => {
            isInternalUpdate.current = true;
            lastSyncedValue.current = text;
            onChangeRef.current(text);
        }, 500); // 500ms debounce
    }, []);

    const handleSubmit = useCallback(() => {
        // Clear any pending debounced calls
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
            debounceTimerRef.current = null;
        }

        // Update immediately
        isInternalUpdate.current = true;
        lastSyncedValue.current = localValue;
        onChangeRef.current(localValue);
        if (onSubmit) {
            onSubmit();
        }
    }, [onSubmit, localValue]);

    return (
        <View style={styles.container}>
            <View style={styles.searchContainer}>
                <Image
                    source={icons.search}
                    style={styles.searchIcon}
                />
                <TextInput
                    ref={inputRef}
                    style={styles.input}
                    placeholder={placeholder}
                    placeholderTextColor={palette.textMuted}
                    value={localValue}
                    onChangeText={handleTextChange}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                    blurOnSubmit={false}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        marginBottom: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: palette.surfaceMuted,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: palette.border,
    },
    searchIcon: {
        width: 20,
        height: 20,
        tintColor: palette.textMuted,
        marginRight: 12,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: palette.textPrimary,
        padding: 0, // Remove default padding
    },
});

export default React.memo(SearchBar);

