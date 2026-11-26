use anchor_lang::prelude::*;

#[error_code]
pub enum BountyError {
    #[msg("The workspace is currently paused.")]
    WorkspacePaused,

    #[msg("The reward amount must be greater than zero.")]
    InvalidRewardAmount,

    #[msg("The deadline must be in the future.")]
    InvalidDeadline,

    #[msg("State transition not permitted for the current state.")]
    InvalidStateTransition,

    #[msg("The signature does not belong to an authorized reviewer for the space.")]
    UnauthorizedReviewer,

    #[msg("The signature does not belong to an arbitrator assigned to the dispute.")]
    UnauthorizedArbiter,

    #[msg("There are too many reviewers; only 8 are permitted.")]
    TooManyReviewers,

    #[msg("It is not permitted to approve or charge for one's own task, or one that has been self-approved.")]
    SelfApprovalNotAllowed,

    #[msg("The minimum required quorum has not been reached.")]
    QuorumNotReached,

    #[msg("The time window has not yet expired.")]
    WindowNotExpired,

    #[msg("The time window has expired.")]
    WindowExpired,

    #[msg("The bond amount is insufficient.")]
    InsufficientBond,

    #[msg("A duplicate vote or action has already been recorded.")]
    DuplicateAction,

    #[msg("Arithmetic overflow in the calculation of funds or score")]
    MathOverflow,

    #[msg("Duplicate reviewer detected in the reviewer list.")]
    DuplicateReviewer,

    #[msg("The quorum threshold must be greater than zero.")]
    InvalidQuorumThreshold,

    #[msg("The quorum threshold cannot exceed the number of reviewers.")]
    QuorumExceedsReviewers,

    #[msg("The maximum submission attempts must be greater than zero.")]
    InvalidMaxSubmissionAttempts,

    #[msg("The window duration must be greater than zero.")]
    InvalidWindowDuration,

    #[msg("The provided contributor does not match the bounty claimant.")]
    InvalidClaimant,

    #[msg("The provided bounty ID does not match the account bounty ID.")]
    BountyIdMismatch,

    #[msg("The fee or bond basis points cannot exceed the maximum of 10,000.")]
    InvalidBps,

    #[msg("The maximum submission attempts has been reached.")]
    MaxAttemptsReached,

    #[msg("The challenger and respondent do not form a valid dispute pair.")]
    InvalidChallenger,
}
