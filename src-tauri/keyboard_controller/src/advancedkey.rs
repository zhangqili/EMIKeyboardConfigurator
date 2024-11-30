use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, PartialEq, Serialize, Deserialize)]
pub enum KeyMode {
    KeyDigitalMode,
    KeyAnalogNormalMode,
    KeyAnalogRapidMode,
    KeyAnalogSpeedMode,
}

#[derive(Serialize, Deserialize, Clone, Copy)]
pub enum CalibrationMode {
    KeyNoCalibration,
    KeyAutoCalibrationPositive,
    KeyAutoCalibrationNegative,
}

#[derive(Serialize, Deserialize, Clone, Copy)]
#[repr(C)]
pub struct AdvancedKey {
    pub state: bool,
    pub value: f32,
    pub raw: f32,
    pub maximum: f32,
    pub minimum: f32,

    pub mode: KeyMode,
    pub calibration_mode: CalibrationMode,
    pub activation_value: f32,
    pub phantom_lower_deadzone: f32,
    pub trigger_distance: f32,
    pub release_distance: f32,
    pub schmitt_parameter: f32,
    pub trigger_speed: f32,
    pub release_speed: f32,
    pub upper_deadzone: f32,
    pub lower_deadzone: f32,
    pub upper_bound: f32,
    pub lower_bound: f32,
}

impl Default for AdvancedKey {
    fn default() -> Self {
        Self {
            state: false,
            value: 0.0,
            raw: 0.0,
            mode: KeyMode::KeyAnalogRapidMode,
            calibration_mode: CalibrationMode::KeyAutoCalibrationNegative,
            maximum: 0.0,
            minimum: 0.0,
            activation_value: 0.5,
            phantom_lower_deadzone: 0.2,
            trigger_distance: 0.08,
            release_distance: 0.08,
            schmitt_parameter: 0.01,
            trigger_speed: 0.01,
            release_speed: 0.01,
            upper_deadzone: 0.04,
            lower_deadzone: 0.2,
            upper_bound: 4096.0,
            lower_bound: 0.0,
        }
    }
}


impl AdvancedKey {
    // 将结构体的内容序列化为一个字节数组
    pub fn to_bytes(&self) -> [u8; 45] {
        let mut bytes = [0u8; 45];
        bytes[0] = self.mode as u8;

        // 每个 f32 字段的大小是 4 个字节，按顺序将它们转换为字节并填充数组
        let mut offset = 1;
        for &field in [
            self.activation_value,
            self.phantom_lower_deadzone,
            self.trigger_distance,
            self.release_distance,
            self.schmitt_parameter,
            self.trigger_speed,
            self.release_speed,
            self.upper_deadzone,
            self.lower_deadzone,
            self.upper_bound,
            self.lower_bound,
        ]
        .iter()
        {
            bytes[offset..offset + 4].copy_from_slice(&field.to_le_bytes());
            offset += 4;
        }

        bytes
    }
    
    pub fn update(&mut self, value: &f32) {
        let mut state = self.state;
        match self.mode {
            KeyMode::KeyDigitalMode => {
                state = *value != 0.0;
            }
            KeyMode::KeyAnalogNormalMode => {
                self.value = *value;
                if self.value - self.schmitt_parameter > self.activation_value {
                    state = true;
                }
                if self.value + self.schmitt_parameter < self.activation_value {
                    state = false;
                }
            }
            KeyMode::KeyAnalogRapidMode => {
                self.value = *value;
                if self.value <= self.upper_deadzone {
                    state = false;
                    self.minimum = self.value;
                } else if self.value >= 1.0 - self.lower_deadzone {
                    state = true;
                    self.maximum = self.value;
                } else if self.state {
                    if self.value - self.minimum >= self.trigger_distance {
                        if self.value > self.maximum {
                            self.maximum = self.value;
                        }
                    }
                    if self.maximum - self.value >= self.release_distance {
                        self.minimum = self.value;
                        state = false;
                    }
                } else {
                    if self.value - self.minimum >= self.trigger_distance {
                        self.maximum = self.value;
                        state = true;
                    }
                    if self.maximum - self.value >= self.release_distance {
                        if self.value < self.minimum {
                            self.minimum = self.value;
                        }
                    }
                }
            }
            KeyMode::KeyAnalogSpeedMode => {
                if value - self.value > self.trigger_speed {
                    state = true;
                }
                if value - self.value < self.release_speed {
                    state = false;
                }
                self.value = *value;
            }
        }
        self.state = state;
    }
    pub fn update_raw(&mut self, value: &f32) {
        self.raw = *value;
        match self.calibration_mode {
            CalibrationMode::KeyAutoCalibrationNegative => {
                if *value > self.lower_bound {
                    self.lower_bound = *value;
                }
            }
            CalibrationMode::KeyAutoCalibrationPositive => {
                if *value < self.lower_bound {
                    self.lower_bound = *value;
                }
            }
            CalibrationMode::KeyNoCalibration => {}
        }
        if self.mode == KeyMode::KeyDigitalMode {
            self.update(value);
        } else {
            let normalized_vale = self.normalize(value);
            self.update(&normalized_vale);
        }
    }

    pub fn normalize(&mut self, value: &f32) -> f32 {
        return (self.upper_bound - value) / (self.upper_bound - self.lower_bound);
    }
}
