use anchor_lang::prelude::*;

use crate::types::VoteOptions;

// Data storage
#[account]
pub struct VotesCounter {
    pub yes: u64,
    pub no: u64,
}

// Data storage
#[account]
pub struct UserVote {
    pub bump: u8,
    pub vote: VoteOptions,
}