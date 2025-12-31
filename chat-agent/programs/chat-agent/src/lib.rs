pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("oTEBPw8FxjnpDhPtiC5QzfNMcDn1n4AJ1i5NidvQecf");

#[program]
pub mod chat_agent {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, seed: u8) -> Result<()> {
        ctx.accounts.initalize(seed)?;
    }

    pub fn ai_inference(ctx: Context<AiInference>, text: String, seed: u8) -> Result<()> {
        ctx.accounts.ai_inference(text, seed)?;
    }

    pub fn callback(ctx: Context<Callback>, response: String) -> Result<()> {
        ctx.accounts.callback(ai_response)?;
    }
}
