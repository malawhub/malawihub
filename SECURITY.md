# MalawiHub Security

## Ownership

The GitHub account `malawhub` is the source-of-truth owner of this repository. MalawiHub must not depend on a phone, Termux installation, local computer, or an AI contributor for ownership or recovery.

## Recovery priority

If the main phone is lost or Termux is uninstalled:

1. Recover the `malawhub` GitHub account from another trusted device.
2. Open the repository at https://github.com/malawhub/malawihub
3. Confirm the live site at https://malawihub.pages.dev/
4. Sign in to the Cloudflare account that owns the Pages deployment.
5. Sign in to the Supabase account that owns the backend project.

## Account protection

- Enable GitHub 2FA.
- Register at least one additional authentication method such as a passkey or security key.
- Generate GitHub recovery codes and keep them outside the phone.
- Enable Cloudflare 2FA and save Cloudflare backup codes outside the phone.
- Never share passwords, 2FA codes, recovery codes, private keys, or API secrets.
- Keep the primary email account independently secured and recoverable.

## Secrets

Never commit Supabase service-role keys, private signing keys, passwords, recovery codes, TURN credentials, or other private secrets to this repository. Public frontend keys must only be used where their exposure is intended and protected by database policies.

## Local-device independence

The repository and deployed application are cloud-hosted. Do not treat Termux, downloaded project files, browser storage, or the phone as the authoritative copy.

## Disaster recovery

A true independent backup should be maintained outside the primary GitHub account. A backup destination must use credentials controlled by the owner and must not be stored in the repository.
