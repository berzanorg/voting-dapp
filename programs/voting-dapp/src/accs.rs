use anchor_lang::prelude::*;

// Data storage
#[account]
pub struct VotesCounter {
    pub yes: u64,
    pub no: u64,
}