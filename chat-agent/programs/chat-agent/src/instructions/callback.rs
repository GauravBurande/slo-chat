use anchor_lang::{prelude::*, system_program::{Transfer, transfer}};
use solana_llm_oracle::{Config};

use crate::{Response, error::ChatError};

#[derive(Accounts)]
pub struct CallbackFromAi<'info> {
     /// CHECK: this is checked by oracle program
    pub identity: Account<'info, Config>,

    /// CHECK: it's callback account bro good
    #[account(
        mut,
    )]
    pub response: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"vault", response.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    pub system_program: Program<'info, System>
}

impl CallbackFromAi<'_> {
    pub fn callback(&mut self, ai_response: String, bumps: &CallbackFromAiBumps) -> Result<()> {
        
        if !self.identity.to_account_info().is_signer {
            return Err(ChatError::InvalidOracleIdentity.into());
        }

        let rent = Rent::get()?;
        let required_space = Response::space(&ai_response);
        let response_info = self.response.to_account_info();
        let current_space = response_info.data_len();

        let required_rent = rent.minimum_balance(required_space);
        let additional_rent  = required_rent.saturating_sub(rent.minimum_balance(current_space));

        let response_pubkey = self.response.key();
        let signers_seeds: &[&[&[u8]]] = &[&[
            b"vault".as_ref(),
            response_pubkey.as_ref(),
            &[bumps.vault]
        ]];

        if additional_rent > 0 {
            let cpi_context = CpiContext::new_with_signer(self.system_program.to_account_info(), 
            Transfer {
                    from: self.vault.to_account_info(),
                    to: self.response.to_account_info()
                },
                signers_seeds
            );

            transfer(cpi_context, additional_rent)?;
        }
        
        let mut res_account = {
            let data = self.response.try_borrow_data()?;
            Response::try_deserialize_unchecked(&mut data.as_ref())?
        };

        res_account.response = ai_response;

        response_info.resize(required_space)?;

        let mut res_data = self.response.try_borrow_mut_data()?;
        res_account.try_serialize(&mut res_data.as_mut())?;
        Ok(())
    }
}