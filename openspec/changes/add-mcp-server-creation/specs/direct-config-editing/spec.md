# Direct Config Editing Delta

## ADDED Requirements

### Requirement: Direct server creation

The direct-edit server-management menu SHALL offer **Add a server** immediately above **Finish editing**, including when the selected configuration has no servers. On selection, the system SHALL prompt for a non-empty server name that does not already exist in the in-memory configuration, then prompt for a transport of `stdio`, `http`, or `sse`, and then open the normalized-JSON editor with a template for that transport. The system SHALL add the valid edited definition to the in-memory configuration and return to the updated menu. It SHALL not require a non-empty command or URL during this creation flow beyond the existing normalized JSON validation.

#### Scenario: User adds a server to an empty configuration

- **WHEN** the selected configuration has no servers and the user chooses **Add a server**, supplies a unique name and a transport, and saves a valid template-derived definition
- **THEN** the new server is shown in the server-management menu and is included in the configuration presented for write confirmation

#### Scenario: User attempts to use an existing server name

- **WHEN** the user enters a name that is already present in the in-memory configuration
- **THEN** the system rejects the name and does not open the transport prompt or editor until the user supplies a unique name

#### Scenario: Direct-edit summary includes a created server

- **WHEN** the user creates a server and reaches direct-edit review
- **THEN** the edit summary lists the server under **Added**
