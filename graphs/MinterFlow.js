```mermaid
%%{init: {'securityLevel': 'loose', 'theme':'neutral'}}%%
graph TD
    A[minter starts] --> B[mintForVIP]
    B --> |Failure| A
    B --> C{0 < amount and account is VIP?}
    C --> |False| B
    C --> |True| D{total supply vip level 1 and 2 > 0?}
    D --> |False| B
    D --> |True| E((mint for vip account successfully)) 


    A --> K[mintForNormal]
    K --> |Failure| A
    K --> L{0 < amount and account is normal?}
    L --> |False| K
    L --> |True| M{total supply vip level 1 and 2 > 0?}
    M --> |False| K
    M --> |True| N((mint for normal account successfully))


    A --> F[mintAndDistribute]
    F --> |Failure| A
    F --> I{0 < amount <= minterAllowed?}
    I --> |False| F
    I --> |True| J{total supply vip level 1 and 2 > 0?}
    J --> |False| F
    J --> |True| G((regular mint successfully))

```
