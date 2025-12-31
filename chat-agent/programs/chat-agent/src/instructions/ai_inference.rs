use anchor_lang::prelude::*;
use anchor_lang::system_program::{Transfer, transfer};
use solana_llm_oracle::{ChatContext, ORACLE_IDENTITY};
use solana_llm_oracle::cpi::{
    accounts::CreateLlmInference,
    create_llm_inference,
};
use solana_llm_oracle::state::AccountMeta;
use crate::state::response::Response;

#[derive(Accounts)]
#[instruction(seed: u8)]
pub struct AiInference<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut,
        seeds = [b"chat_context", user.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump
    )]
    pub chat_context: Account<'info, ChatContext>,

    /// CHECK: checked inside oracle program after creating
    #[account(mut)]
    pub inference: AccountInfo<'info>,

    #[account(
        init_if_needed,
        payer=user,
        seeds=[b"response", user.key().as_ref()],
        space = 9,
        bump
    )]
    pub response: Account<'info, Response>,

    /// CHECK: oracle identity wallet
    #[account(mut, address = ORACLE_IDENTITY)]
    pub oracle_identity: UncheckedAccount<'info>,

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

        let callback_discriminator: [u8; 8] = crate::instruction::CallbackFromAi::DISCRIMINATOR.try_into().expect("Discriminator must be 8 bytes");

        create_llm_inference(cpi_context, text, crate::ID, callback_discriminator, Some(
            vec![
                AccountMeta {
                pubkey: self.user.key(),
                is_signer: false,
                is_writable: false
            },
            AccountMeta {
                pubkey: self.response.key(),
                is_signer: false,
                is_writable: true
            },
            AccountMeta {
                pubkey: self.system_program.key(),
                is_signer: false,
                is_writable: false
            }
            ]
        ))?;

        let cpi_context = CpiContext::new(self.system_program.to_account_info(), Transfer {
            from: self.user.to_account_info(),
            to: self.oracle_identity.to_account_info()
        });

        transfer(cpi_context, 5_000_000)?;

        Ok(())
    }
}