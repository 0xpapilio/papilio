// Papilio v1 — private trade-intent escrow (Aleo testnet only, Leo 4.x).
//
// A user locks a fixed denomination of a private test token under a
// commitment hash. Only the commitment and expiry become public. The
// relayer receives an encrypted IntentNote (pair, denomination, receiver),
// settles on CoW/Sepolia with its own funds, then claims the escrow.
// If it never does, the user refunds after expiry. See docs/design.md.

// Private payload bound by the commitment.
struct IntentData {
    pair_hash: field,
    denomination: u64,
    receiver: field,
}

program papilio_intent.aleo {

    // ---- records (private) ----

    // Test token. Private by construction: amount and owner are encrypted.
    record Token {
        owner: address,
        amount: u64,
    }

    // Held by the user; lets them reclaim the escrow after expiry.
    record RefundTicket {
        owner: address,
        amount: u64,
        commitment: field,
        expiry: u32,
    }

    // Encrypted to the relayer: everything it needs, nothing about the user.
    record IntentNote {
        owner: address,      // the relayer
        pair_hash: field,
        denomination: u64,
        receiver: field,     // Sepolia receiver address (160 bits, fits a field)
        commitment: field,
    }

    // ---- public state: commitment => escrow. Presence = open intent. ----
    mapping escrow_amount: field => u64;
    mapping escrow_relayer: field => address;
    mapping escrow_expiry: field => u32;

    // Open testnet mint so the demo can fund itself.
    fn mint(amount: u64) -> Token {
        return Token { owner: std::ctx::signer(), amount: amount };
    }

    // Consumes a private Token record. The network's proof verification is
    // what establishes "holds >= denomination" — the balance itself appears
    // in no public input; only the commitment and escrow terms do.
    fn lock_intent(
        token: Token,
        denomination: u64,
        pair_hash: field,
        receiver: field,
        relayer: address,
        expiry: u32,
        salt: scalar,
    ) -> (Token, RefundTicket, IntentNote, Final) {
        assert(token.amount >= denomination);
        assert(denomination > 0u64);

        let data: IntentData = IntentData {
            pair_hash: pair_hash,
            denomination: denomination,
            receiver: receiver,
        };
        let commitment: field = BHP256::commit_to_field(data, salt);

        let change: Token = Token {
            owner: token.owner,
            amount: token.amount - denomination,
        };
        let ticket: RefundTicket = RefundTicket {
            owner: token.owner,
            amount: denomination,
            commitment: commitment,
            expiry: expiry,
        };
        let note: IntentNote = IntentNote {
            owner: relayer,
            pair_hash: pair_hash,
            denomination: denomination,
            receiver: receiver,
            commitment: commitment,
        };
        return (change, ticket, note, final {
            assert(expiry > std::ctx::block_height());
            assert(!escrow_amount.contains(commitment));
            escrow_amount.set(commitment, denomination);
            escrow_relayer.set(commitment, relayer);
            escrow_expiry.set(commitment, expiry);
        });
    }

    // Relayer repays itself after settling on Sepolia.
    // v1 trust assumption (docs/design.md): nothing here proves the CoW
    // settlement happened. v2 gates this on a settlement proof.
    fn claim(commitment: field, amount: u64) -> (Token, Final) {
        let caller: address = std::ctx::signer();
        let payout: Token = Token { owner: caller, amount: amount };
        return (payout, final {
            assert_eq(escrow_relayer.get(commitment), caller);
            assert_eq(escrow_amount.get(commitment), amount);
            escrow_amount.remove(commitment);
            escrow_relayer.remove(commitment);
            escrow_expiry.remove(commitment);
        });
    }

    // User reclaims an unfilled intent after expiry.
    fn refund(ticket: RefundTicket) -> (Token, Final) {
        let back: Token = Token { owner: ticket.owner, amount: ticket.amount };
        let commitment: field = ticket.commitment;
        let amount: u64 = ticket.amount;
        return (back, final {
            assert(std::ctx::block_height() >= escrow_expiry.get(commitment));
            assert_eq(escrow_amount.get(commitment), amount);
            escrow_amount.remove(commitment);
            escrow_relayer.remove(commitment);
            escrow_expiry.remove(commitment);
        });
    }

    @noupgrade
    constructor() {}
}
