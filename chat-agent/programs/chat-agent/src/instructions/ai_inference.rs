use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction::create_account;
use anchor_lang::{prelude::*, system_program};
use anchor_lang::system_program::{Transfer, transfer};
use solana_llm_oracle::{ChatContext, Config, ORACLE_IDENTITY};
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

    pub chat_context: Account<'info, ChatContext>,

    /// CHECK: checked inside oracle program after creating
    #[account(mut)]
    pub inference: AccountInfo<'info>,

    /// CHECK: the seeds are enough other checks inside ixn
    #[account(
        mut,
        seeds=[b"response", user.key().as_ref()],
        bump
    )]
    pub response: AccountInfo<'info>,

    #[account(
        mut,
        seeds = [b"vault", response.key().as_ref()],
        bump
    )]
    pub vault: SystemAccount<'info>,

    /// CHECK: verified by the oracle
    #[account(address = solana_llm_oracle::ID)]
    pub oracle_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>
}

impl AiInference<'_> {
    pub fn ai_inference(&mut self,text: String, seed: u8, bumps:&AiInferenceBumps) -> Result<()> {
        let rent = Rent::get()?;
        let space = Response::space("");

        let lamports = rent.minimum_balance(space);

        if self.response.owner == &system_program::ID{
            let create_ixn = create_account(&self.user.key(), &self.response.key(), lamports, space as u64, &crate::ID);

            let account_infos = [self.user.to_account_info(), self.response.to_account_info(), self.system_program.to_account_info()];

            let user_pubkey = self.user.key();
            let signers_seeds: &[&[&[u8]]] = &[&[
                b"response".as_ref(),
                user_pubkey.as_ref(),
                &[bumps.response]
            ]];

            invoke_signed(&create_ixn, &account_infos, signers_seeds)?;
        };

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
                pubkey: self.response.key(),
                is_signer: false,
                is_writable: true
            },
            AccountMeta {
                pubkey: self.vault.key(),
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

        msg!("vault lamports: {}", self.vault.lamports());
msg!("vault owner: {}", self.vault.owner);
msg!("vault data len: {}", self.vault.data_len());

        let cpi_context = CpiContext::new(self.system_program.to_account_info(), Transfer {
            from: self.user.to_account_info(),
            to: self.vault.to_account_info()
        });

        transfer(cpi_context, 5_000_000)?;

        Ok(())
    }
}