use anchor_lang::prelude::*;
use solana_llm_oracle::cpi::{
    accounts::CreateChat,
    create_chat,
};

use crate::Agent;

const AGENT_DESC: &str = "You are a helpful assistant.";

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: checked in the oracle program
    #[account(mut)]
    pub chat_context: AccountInfo<'info>,

    /// CHECK: verified by the oracle
    #[account(address = solana_llm_oracle::ID)]
    pub oracle_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>
}

impl Initialize<'_> {
    pub fn initialize(&mut self, seed: u8) -> Result<()> {
        let cpi_program = self.oracle_program.to_account_info();

        let cpi_accounts = CreateChat {
            user: self.user.to_account_info(),
            chat_context: self.chat_context.to_account_info(),
            system_program: self.system_program.to_account_info()
        };

        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

        create_chat(cpi_context, AGENT_DESC.to_string(), seed)?;
        Ok(())
    }
}