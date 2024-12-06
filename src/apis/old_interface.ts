

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

export enum RGBMode {
    RgbModeFixed = "RgbModeFixed",
    RgbModeStatic = "RgbModeStatic",
    RgbModeCycle = "RgbModeCycle",
    RgbModeLinear = "RgbModeLinear",
    RgbModeTrigger = "RgbModeTrigger",
    RgbModeString = "RgbModeString",
    RgbModeFadingString = "RgbModeFadingString",
    RgbModeDiamondRipple = "RgbModeDiamondRipple",
    RgbModeFadingDiamondRipple = "RgbModeFadingDiamondRipple",
    RgbModeJelly = "RgbModeJelly",
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
    red: number;
    green: number;
    blue: number;
}

// Interface for RGBConfig
export interface IRGBConfig {
    mode: RGBMode;
    rgb: Srgb;
    speed: number;
}