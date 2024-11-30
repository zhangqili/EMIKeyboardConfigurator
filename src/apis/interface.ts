

// Enum for KeyMode
export enum KeyMode {
    KeyDigitalMode = "KeyDigitalMode",
    KeyAnalogNormalMode = "KeyAnalogNormalMode",
    KeyAnalogRapidMode = "KeyAnalogRapidMode",
    KeyAnalogSpeedMode = "KeyAnalogSpeedMode",
}

// Enum for CalibrationMode
export enum CalibrationMode {
    KeyNoCalibration = "KeyNoCalibration",
    KeyAutoCalibrationPositive = "KeyAutoCalibrationPositive",
    KeyAutoCalibrationNegative = "KeyAutoCalibrationNegative",
}

// Interface for AdvancedKey
export interface IAdvancedKey {
    state: boolean;
    value: number;
    raw: number;
    maximum: number;
    minimum: number;

    mode: KeyMode;
    calibration_mode: CalibrationMode;
    activation_value: number;
    phantom_lower_deadzone: number;
    trigger_distance: number;
    release_distance: number;
    schmitt_parameter: number;
    trigger_speed: number;
    release_speed: number;
    upper_deadzone: number;
    lower_deadzone: number;
    upper_bound: number;
    lower_bound: number;
}

// Generic color interfaces
export interface Srgb {
    r: number;
    g: number;
    b: number;
}

export interface Hsv {
    h: number; // Hue
    s: number; // Saturation
    v: number; // Value (brightness)
}

// Interface for RGBConfig
export interface IRGBConfig {
    mode: number;
    rgb: Srgb;
    hsv: Hsv;
    speed: number;
}