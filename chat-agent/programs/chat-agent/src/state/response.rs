use anchor_lang::prelude::*;

#[account]
pub struct Response {
    pub response: String,
}

impl Response {
    pub fn space(text: &str) -> usize {
        8 + 4 + text.as_bytes().len() + 8 //padding
    }
}