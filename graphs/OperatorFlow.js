```mermaid
%%{init: {'securityLevel': 'loose', 'theme':'neutral'}}%%
graph TD
    A[operator starts] --> |set master minter| B
    B[deploy Token contract] -->  D
    D{want to update master minter?} --> |No| C
    D --> |Yes| F 
    F[updateMasterMinter] --> E
    E{new minter is  zero address?} --> |Yes| F
    E --> |No| C
    C((contract deployed and master minter set successfully))
    B --> |Failure| A

```
