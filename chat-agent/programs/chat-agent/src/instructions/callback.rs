use anchor_lang::{prelude::*, system_program::{Transfer, transfer}};
use solana_llm_oracle::Config;

use crate::{Response, error::ChatError, response};

pub struct Callback<'info> {
    pub identity: Account<'info, Config>,

    /// CHECK: the user account we send with account metas at inference
    pub user: UncheckedAccount<'info>,

    #[account(mut)]
    #[account(
        mut,
        seeds=[b"response", user.key().as_ref()],
        bump
    )]
    pub response: Account<'info, Response>,

    pub system_program: Program<'info, System>
}

impl Callback<'info> {
    pub fn callback(&mut self, ai_response: String) -> Result<()> {
        
        if !self.identity.to_account_info().is_signer() {
            return Err(ChatError::InvalidOracleIdentity.into());
        }

        let rent = Rent::get()?;
        let required_space = Response::space(&ai_response);
        let response_info = self.response.to_account_info();
        let current_space = response_info.data_len();

        response_info.resize(required_space)?;

        let required_rent = rent.minimum_balance(required_space);
        let additional_rent  = required_rent.saturating_sub(rent.minimum_balance(current_space));

        if additional_rent > 0 {
            let cpi_context = CpiContext::new(self.system_program.to_account_info(), 
            Transfer {
                    from: self.user.to_account_info(),
                    to: self.response.to_account_info()
                }
            );

            transfer(cpi_context, additional_rent)?;
        }

        self.response.response = ai_response;

        Ok(())
    }
}