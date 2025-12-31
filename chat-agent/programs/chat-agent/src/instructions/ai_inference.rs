use anchor_lang::prelude::*;
use solana_llm_oracle::ChatContext;
use solana_llm_oracle::cpi::{
    accounts::CreateLlmInference,
    create_llm_inference,
};
use solana_llm_oracle::state::AccountMeta;
use crate::callback;
use crate::state::response::Response;

#[derive(Accounts)]
pub struct AiInference<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub chat_context: Account<'info, ChatContext>,

    /// CHECK: checked inside oracle program after creating
    #[account(mut)]
    pub inference: AccountInfo<'info>,

    #[account(
        mut
        seeds=[b"response", user.key().as_ref()],
        bump
    )]
    pub response: Account<'info, Response>,

    /// CHECK: verified by the oracle
    #[account(address = solana_llm_oracle::ID)]
    pub oracle_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>
}

impl AiInference<'_> {
    pub fn ai_inference(&mut self,text: String, seed: u8) -> Result<()> {
        let cpi_program = self.oracle_program.to_account_info();

        let cpi_accounts = CreateLlmInference {
            user: self.user.to_account_info(),
            chat_context: self.chat_context.to_account_info(),
            inference: self.inference.to_account_info(),
            system_program: self.system_program.to_account_info()
        };

        let cpi_context = CpiContext::new(cpi_program, cpi_accounts);

        // todo: update with callback ixn discr
        // create and allocate space with rent for the response pda
        let callback_discriminator: Vec<u32> = crate::instruction::Callback::DISCRIMINATOR;

        create_llm_inference(cpi_context, text, crate::ID, callback_discriminator, Some(
            AccountMeta {
                pubkey: self.response.to_account_info(),
                is_signer: false,
                is_writable: true
            }
        ))?;

        Ok(())
    }
}