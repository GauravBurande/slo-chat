use anchor_lang::prelude::*;
use solana_llm_oracle::Config;

use crate::{Response, error::ChatError, response};

pub struct Callback<'info> {
    pub identity: Account<'info, Config>,

    #[account(mut)]
    pub response: Account<'info, Response>
}

impl Callback<'info> {
    pub fn callback(&mut self, ai_response: String) -> Result<()> {
        
        if !self.identity.to_account_info().is_signer() {
            return Err(ChatError::InvalidOracleIdentity.into());
        }

        let response = self.response;
        response.response = ai_response;

        Ok(())
    }
}