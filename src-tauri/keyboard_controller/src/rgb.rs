use palette::Srgb;
use serde::{Deserialize, Serialize};


#[derive(Serialize, Deserialize, Clone, Copy)]
pub enum RGBMode {
    RgbModeFixed,
    RgbModeStatic,
    RgbModeCycle,
    RgbModeLinear,
    RgbModeTrigger,
    RgbModeString,
    RgbModeFadingString,
    RgbModeDiamondRipple,
    RgbModeFadingDiamondRipple,
    RgbModeJelly,
}

impl Default for RGBMode {
    fn default() -> Self {
        RGBMode::RgbModeFixed
    }
}

#[derive(Default,Serialize,Deserialize,Clone,Copy)]
pub struct RGBConfig
{
    pub mode : RGBMode,
    pub rgb : Srgb<u8>,
    pub speed : f32,
}
