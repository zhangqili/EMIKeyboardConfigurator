use palette::{Hsv, Srgb};
use serde::{Deserialize, Serialize};


#[derive(Default,Serialize,Deserialize,Clone,Copy)]
pub struct RGBConfig
{
    pub mode : u8,
    pub rgb : Srgb<u8>,
    pub hsv : Hsv,
    pub speed : f32,
}