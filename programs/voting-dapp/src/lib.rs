mod accs;
mod types;

use accs::*;
use types::*;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction::transfer;


declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod voting_dapp {
    use super::*;

    // Method to initalize a Votes Counter
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let votes_counter = &mut ctx.accounts.votes_counter;
        votes_counter.no = 0;
        votes_counter.yes = 0;
        msg!("Votes Counter Initalized");
        Ok(())
    }

    // Method to vote
    pub fn vote(ctx: Context<Vote>, vote: VoteOptions) -> Result<()> {
        let votes_counter = &mut ctx.accounts.votes_counter;
        match vote {
            VoteOptions::Yes => votes_counter.yes += 1,
            VoteOptions::No => votes_counter.no += 1,
        }

        let user_vote = &mut ctx.accounts.user_vote;
        user_vote.bump = *ctx.bumps.get("user_vote").unwrap();
        user_vote.vote = vote;

        let voting_fee = 2_000_000; // Fee in lmaports

        // Create the instructions
        let voting_fee_transfer = transfer(
            &ctx.accounts.user.key(),
            &votes_counter.key(),
            voting_fee
        );

        // Call the system program
        invoke(
            &voting_fee_transfer,
            &[
                ctx.accounts.user.to_account_info(),
                votes_counter.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
            ]
        )?;

        Ok(())
    }
}


// Instructions Validations
#[derive(Accounts)]
pub struct Initialize<'info> {
    // Signer account
    #[account(mut)]
    pub user: Signer<'info>,
    // VotesCounter account
    #[account(
        init,
        payer = user,
        space = 8 + 2*8,
        seeds = [b"votes_counter".as_ref()],
        bump
    )]
    pub votes_counter: Account<'info, VotesCounter>,
    // System Program itself
    pub system_program: Program<'info, System>,
}

// Instructions Validations
#[derive(Accounts)]
#[instruction(vote: VoteOptions)]
pub struct Vote<'info> {
    // Signer account
    #[account(mut)]
    pub user: Signer<'info>,
    // User Vote account
    #[account(
        init,
        payer = user,
        space = 8 + 1 + 2,
        seeds = [b"user_vote".as_ref(), user.key().as_ref()],
        bump
    )]
    pub user_vote: Account<'info, UserVote>,
    #[account(mut)]
    pub votes_counter: Account<'info, VotesCounter>,
    pub system_program: Program<'info, System>,
}
