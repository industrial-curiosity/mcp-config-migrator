## REMOVED Requirements

### Requirement: Pre-write backup

**Reason**: Replaced by the opt-in, config-only, versioned backup described in the new `backup-and-restore` capability. Backing up is no longer an automatic, unconditional part of writing a merged configuration.
**Migration**: No action needed for existing users — there is no prior data to migrate. Going forward, back up via the opt-in prompt (or `config backup` to set a persistent preference) rather than relying on an automatic `.bak.<timestamp>` file.
