import React, { useState, useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS,
} from "react-native-reanimated";

interface PriceRangeSliderProps {
  min: number;
  max: number;
  currentMin: number;
  currentMax: number;
  onRangeChange: (min: number, max: number) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SLIDER_WIDTH = SCREEN_WIDTH - 64; // Account for padding
const HANDLE_SIZE = 24;
const TRACK_HEIGHT = 4;

export function PriceRangeSlider({
  min,
  max,
  currentMin,
  currentMax,
  onRangeChange,
}: PriceRangeSliderProps) {
  const [minValue, setMinValue] = useState(currentMin);
  const [maxValue, setMaxValue] = useState(currentMax);
  const trackRef = useRef<View>(null);
  const [trackLayout, setTrackLayout] = useState({ x: 0, width: SLIDER_WIDTH });

  const minPosition = useSharedValue(0);
  const maxPosition = useSharedValue(0);

  useEffect(() => {
    setMinValue(currentMin);
    setMaxValue(currentMax);
    updatePositions(currentMin, currentMax);
  }, [currentMin, currentMax]);

  useEffect(() => {
    updatePositions(minValue, maxValue);
  }, [trackLayout.width]);

  const updatePositions = (minVal: number, maxVal: number) => {
    if (trackLayout.width === 0) return;
    const range = max - min;
    if (range === 0) {
      minPosition.value = 0;
      maxPosition.value = trackLayout.width;
      return;
    }
    const minPercent = ((minVal - min) / range) * 100;
    const maxPercent = ((maxVal - min) / range) * 100;
    minPosition.value = (minPercent / 100) * trackLayout.width;
    maxPosition.value = (maxPercent / 100) * trackLayout.width;
  };

  const getValueFromPosition = (position: number) => {
    const percentage = position / trackLayout.width;
    const value = min + percentage * (max - min);
    return Math.max(min, Math.min(max, Math.round(value)));
  };

  const updateMinValue = (newMin: number) => {
    if (newMin < maxValue) {
      setMinValue(newMin);
      onRangeChange(newMin, maxValue);
    }
  };

  const updateMaxValue = (newMax: number) => {
    if (newMax > minValue) {
      setMaxValue(newMax);
      onRangeChange(minValue, newMax);
    }
  };

  const minGesture = Gesture.Pan()
    .onUpdate((e) => {
      const newPosition = Math.max(0, Math.min(e.x, maxPosition.value - HANDLE_SIZE));
      minPosition.value = newPosition;
      const newValue = getValueFromPosition(newPosition);
      runOnJS(updateMinValue)(newValue);
    });

  const maxGesture = Gesture.Pan()
    .onUpdate((e) => {
      const newPosition = Math.max(minPosition.value + HANDLE_SIZE, Math.min(e.x, trackLayout.width));
      maxPosition.value = newPosition;
      const newValue = getValueFromPosition(newPosition);
      runOnJS(updateMaxValue)(newValue);
    });

  const minHandleStyle = useAnimatedStyle(() => ({
    left: minPosition.value - HANDLE_SIZE / 2,
  }));

  const maxHandleStyle = useAnimatedStyle(() => ({
    left: maxPosition.value - HANDLE_SIZE / 2,
  }));

  const activeTrackStyle = useAnimatedStyle(() => ({
    left: minPosition.value,
    width: maxPosition.value - minPosition.value,
  }));

  return (
    <View style={styles.container}>
      <View
        ref={trackRef}
        style={styles.trackContainer}
        onLayout={(event) => {
          const { width } = event.nativeEvent.layout;
          setTrackLayout({ x: 0, width });
          updatePositions(minValue, maxValue);
        }}
      >
        {/* Background track */}
        <View style={styles.trackBackground} />

        {/* Active track */}
        <Animated.View style={[styles.trackActive, activeTrackStyle]} />

        {/* Min handle */}
        <GestureDetector gesture={minGesture}>
          <Animated.View style={[styles.handle, styles.handleMin, minHandleStyle]}>
            <View style={styles.handleInner} />
          </Animated.View>
        </GestureDetector>

        {/* Max handle */}
        <GestureDetector gesture={maxGesture}>
          <Animated.View style={[styles.handle, styles.handleMax, maxHandleStyle]}>
            <View style={styles.handleInner} />
          </Animated.View>
        </GestureDetector>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SLIDER_WIDTH,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  trackContainer: {
    width: SLIDER_WIDTH,
    height: TRACK_HEIGHT,
    position: "relative",
  },
  trackBackground: {
    position: "absolute",
    left: 0,
    right: 0,
    height: TRACK_HEIGHT,
    backgroundColor: "#E5E7EB",
    borderRadius: TRACK_HEIGHT / 2,
  },
  trackActive: {
    position: "absolute",
    height: TRACK_HEIGHT,
    backgroundColor: "#10B981",
    borderRadius: TRACK_HEIGHT / 2,
  },
  handle: {
    position: "absolute",
    width: HANDLE_SIZE,
    height: HANDLE_SIZE,
    borderRadius: HANDLE_SIZE / 2,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  handleMin: {
    zIndex: 2,
  },
  handleMax: {
    zIndex: 2,
  },
  handleActive: {
    transform: [{ scale: 1.2 }],
    borderColor: "#059669",
  },
  handleInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
});
