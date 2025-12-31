use anchor_lang::prelude::*;

#[error_code]
pub enum ChatError {
    #[msg("Invalid account or oracle sent the callback!")]
    InvalidOracleIdentity,
}
