mod accs;

use accs::*;
use anchor_lang::prelude::*;


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

}


// Instructions Validations
#[derive(Accounts)]
pub struct Initialize<'info> {
    // Signer account
    #[account(mut)]
    user: Signer<'info>,
    // VotesCounter account
    #[account(
        init,
        payer = user,
        space = 8 + 2*8,
        seeds = [b"votes_counter".as_ref()],
        bump
    )]
    votes_counter: Account<'info, VotesCounter>,
    // System Program itself
    system_program: Program<'info, System>,
}



