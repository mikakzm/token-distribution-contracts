```mermaid
%%{init: {'securityLevel': 'loose', 'theme':'neutral'}}%%
graph TD
    A[master minter starts] --> B
    D --> |Failure| A
    D -->  |Success| E((minter removed))
    B[configureMinter] --> |Success| C((new minter added))
    B --> |Failure| A
    A --> D[removeMinter]
    A --> F[changeLevel]
    F --> |Failure| A
    F --> I{account is zero address or fund address?}
    I --> |True| F
    I --> |False| J{account new level is 0 or 1 or 2?}
    J --> |False| F
    J --> |True| G((account level changed))
```
