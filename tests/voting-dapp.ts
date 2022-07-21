import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { assert, expect } from "chai";
import { VotingDapp } from "../target/types/voting_dapp";

const { SystemProgram, PublicKey, SendTransactionError, LAMPORTS_PER_SOL, Keypair } = anchor.web3
const VOTING_FEE = 2_000_000

describe("voting-dapp", () => {
    const ANCHOR_PROGRAM = anchor.workspace.VotingDapp as Program<VotingDapp>;
    let votes_counter_initial_balance = null

    function getNewProgramInteraction() {
        const user = Keypair.generate()
        const provider = new anchor.AnchorProvider(anchor.AnchorProvider.local().connection, new anchor.Wallet(user), {})
        const program = new anchor.Program(ANCHOR_PROGRAM.idl as anchor.Idl, ANCHOR_PROGRAM.programId, provider) as Program<VotingDapp>
        return { user, provider, program}
    }

    async function addFunds(user: anchor.web3.Keypair) {
        const airdropSig = await base_provider.connection.requestAirdrop(user.publicKey, 1e9)
        const latestBlock = await base_provider.connection.getLatestBlockhash()
        await base_provider.connection.confirmTransaction({
            blockhash: latestBlock.blockhash,
            lastValidBlockHeight: latestBlock.lastValidBlockHeight,
            signature: airdropSig,
        })
    }

    const { user: base_user, provider: base_provider, program: base_program } = getNewProgramInteraction()



    it("Base user: Initialize OK - counter with 0 votes for 'yes' and 'no'!", async () => {
        // Add your test here.
        await addFunds(base_user);

        const tx = base_program.methods.initialize().accounts({
            user: base_user.publicKey,
            systemProgram: SystemProgram.programId,
        })

        const keys = await tx.pubkeys()
        await tx.rpc()

        const votesCounterAccount = await base_program.account.votesCounter.fetch(keys.votesCounter)

        assert.equal(votesCounterAccount.yes.toString(), '0')
        assert.equal(votesCounterAccount.no.toString(), '0')

        votes_counter_initial_balance = await base_provider.connection.getBalance(keys.votesCounter)
    })

    it("Base user: Vote OK - votes for 'yes' and pays voting service fee!", async () => {
        const [votesCounterPDA, _] = await PublicKey.findProgramAddress(
            [anchor.utils.bytes.utf8.encode("votes_counter")],
            base_program.programId
        )

        let votesCounterAccount = await base_program.account.votesCounter.fetch(votesCounterPDA)

        assert.equal(votesCounterAccount.yes.toString(), '0')
        assert.equal(votesCounterAccount.no.toString(), '0')

        const tx = base_program.methods.vote({ yes: {} }).accounts({
            user: base_user.publicKey,
            votesCounter: votesCounterPDA,
            systemProgram: SystemProgram.programId,
        })

        const keys = await tx.pubkeys()

        await tx.rpc()

        votesCounterAccount = await base_program.account.votesCounter.fetch(votesCounterPDA)

        assert.equal(votesCounterAccount.yes.toString(), '1')
        assert.equal(votesCounterAccount.no.toString(), '0')

        const userVoteAccount = await base_program.account.userVote.fetch(keys.userVote)

        assert.deepEqual(userVoteAccount.vote, { yes: {} })

        const updatedBalances = await base_provider.connection.getBalance(keys.votesCounter)

        const expectedBalance = votes_counter_initial_balance + VOTING_FEE;
        
        assert.equal(updatedBalances, expectedBalance)
    })


    it("New user: Vote OK - votes for 'no' and pays voting service fee!", async () => {
        const {user: newUser, program: newProgram, provider: newProvider} = getNewProgramInteraction()
        await addFunds(newUser)

        const [votesCounterPDA, _] = await PublicKey.findProgramAddress(
            [anchor.utils.bytes.utf8.encode("votes_counter")],
            newProgram.programId
        )

        let votesCounterAccount = await newProgram.account.votesCounter.fetch(votesCounterPDA)

        assert.equal(votesCounterAccount.yes.toString(), '1')
        assert.equal(votesCounterAccount.no.toString(), '0')

        const tx = base_program.methods.vote({ no: {} }).accounts({
            user: newUser.publicKey,
            votesCounter: votesCounterPDA,
            systemProgram: SystemProgram.programId,
        }).signers([newUser])

        const keys = await tx.pubkeys()

        await tx.rpc()

        votesCounterAccount = await newProgram.account.votesCounter.fetch(votesCounterPDA)

        assert.equal(votesCounterAccount.yes.toString(), '1')
        assert.equal(votesCounterAccount.no.toString(), '1')

        const userVoteAccount = await newProgram.account.userVote.fetch(keys.userVote)

        assert.deepEqual(userVoteAccount.vote, { no: {} })

        const updatedBalances = await newProvider.connection.getBalance(keys.votesCounter)

        const expectedBalance = votes_counter_initial_balance + 2 * VOTING_FEE;
        
        assert.equal(updatedBalances, expectedBalance)
    })

    it("Base user: Vote ERROR - Fails to vote again", async () => {
        const [votesCounterPDA, _] = await PublicKey.findProgramAddress(
            [anchor.utils.bytes.utf8.encode("votes_counter")],
            base_program.programId
        )

        try {
            const tx = await base_program.methods.vote({ yes: {}}).accounts({
                user: base_user.publicKey,
                votesCounter: votesCounterPDA,
                systemProgram: SystemProgram.programId,
            }).rpc()
            assert.ok("This should have failed")

        } catch (err) {
            expect(err).to.be.instanceOf(SendTransactionError)
        }
    })
})
