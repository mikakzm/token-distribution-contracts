// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../Distribution/TokenWithDistribution.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract PayToken is TokenWithDistribution {
    using SafeMath for uint256;

    address private masterMinter;

    mapping(address => bool) internal minters;
    mapping(address => uint256) internal minterAllowed;

    event Mint(address indexed minter, address indexed to, uint256 amount);
    event MintAndDistribute(address indexed minter, uint256 amount);
    event MintForVIP(address indexed minter, address indexed to, uint256 amount);
    event MintForNormal(address indexed minter, address indexed to, uint256 amount);
    event Burn(address indexed burner, uint256 amount);
    event MinterConfigured(address indexed minter, uint256 minterAllowedAmount);
    event MinterRemoved(address indexed oldMinter);
    event MasterMinterChanged(address indexed newMasterMinter);

    event TransferWithReferralCode(address indexed from, address indexed to, uint256 amount, uint256 referralCode);

    function __Token_init(
        string memory _tokenName,
        string memory _tokenSymbol,
        address payable _tokenStorage,
        address _newMasterMinter,
        uint256 _initialSupply
    ) public initializer {
        TokenWithDistribution.__TokenWithDistribution_init(_tokenName, _tokenSymbol, _tokenStorage, _initialSupply);
        require(
            _newMasterMinter != address(0),
            "PayToken: new masterMinter is the zero address"
        );
        
        masterMinter = _newMasterMinter;
    }

    /**
     * @dev Throws if called by any account other than a minter
     */
    modifier onlyMinters() {
        require(minters[_msgSender()], "PayToken: caller is not a minter");
        _;
    }

    /**
     * @dev Function to mint tokens
     * @param _amount The amount of tokens to mint. Must be less than or equal
     * to the minterAllowance of the caller.
     * @return A boolean that indicates if the operation was successful.
     */
    function mintAndDistribute(uint256 _amount, uint256[3] memory distributionPercentage)
        external
        onlyMinters
        returns (bool)
    {
        uint256 mintingAllowedAmount = minterAllowed[_msgSender()];
        require(
            _amount <= mintingAllowedAmount,
            "PayToken: mint amount exceeds minterAllowance"
        );

        minterAllowed[_msgSender()] = mintingAllowedAmount.sub(_amount);
        _mintAndDistribute(_amount, distributionPercentage);
        emit MintAndDistribute(_msgSender(), _amount);
        return true;
    }

    // function mintForVIP(address account, uint256 amount)
    //     external
    //     onlyMinters
    //     returns (bool)
    // {
    //     _mintForVIP(account, amount);
    //     emit MintForVIP(_msgSender(), account, amount);
    //     return true;
    // }

    // function mintForNormal(address account, uint256 amount)
    //     external
    //     onlyMinters
    //     returns (bool)
    // {
    //     _mintForNormal(account, amount);
    //     emit MintForNormal(_msgSender(), account, amount);
    //     return true;
    // }

    /**
     * @dev Throws if called by any account other than the masterMinter
     */
    modifier onlyMasterMinter() {
        require(
            _msgSender() == masterMinter,
            "PayToken: caller is not the masterMinter"
        );
        _;
    }

    /**
     * @dev Get minter allowance for an account
     * @param minter The address of the minter
     */
    function minterAllowance(address minter) external view returns (uint256) {
        return minterAllowed[minter];
    }

    /**
     * @dev Get the master minter address
     */
    function theMasterMinter() external view returns (address) {
        return masterMinter;
    }

    /**
     * @dev Checks if account is a minter
     * @param account The address to check
     */
    function isMinter(address account) external view returns (bool) {
        return minters[account];
    }

    /**
     * @dev Function to add/update a new minter
     * @param minter The address of the minter
     * @param minterAllowedAmount The minting amount allowed for the minter
     * @return True if the operation was successful.
     */
    function configureMinter(address minter, uint256 minterAllowedAmount)
        external
        onlyMasterMinter
        returns (bool)
    {
        minters[minter] = true;
        minterAllowed[minter] = minterAllowedAmount;
        emit MinterConfigured(minter, minterAllowedAmount);
        return true;
    }

     /**
     * @dev Function to remove a minter
     * @param minter The address of the minter to remove
     * @return True if the operation was successful.
     */
    function removeMinter(address minter)
        external
        onlyMasterMinter
        returns (bool)
    {
        minters[minter] = false;
        minterAllowed[minter] = 0;
        emit MinterRemoved(minter);
        return true;
    }


    function changeLevel(address account, uint8 newLvl)
        external
        onlyMasterMinter
        returns (bool)
    {
        _changeLevel(account, newLvl);
        return true;
    }
   


    /**
     * @dev allows a minter to burn some of its own tokens
     * Validates that caller is a minter and that sender is not blacklisted
     * amount is less than or equal to the minter's account balance
     * @param _amount uint256 the amount of tokens to be burned
     */
    function burn(uint256 _amount)
        external
        onlyMinters
    {
        uint256 balance = balanceOf(_msgSender());
        require(_amount > 0, "PayToken: burn amount not greater than 0");
        require(balance >= _amount, "PayToken: burn amount exceeds balance");

        _burn(_msgSender(), _amount);
        emit Burn(_msgSender(), _amount);
    }

    function updateMasterMinter(address _newMasterMinter) external onlyOwner {
        require(
            _newMasterMinter != address(0),
            "PayToken: new masterMinter is the zero address"
        );
        masterMinter = _newMasterMinter;
        emit MasterMinterChanged(masterMinter);
    }

    function transferWithReferralCode(address _to, uint256 _amount, uint256 _refCode) public returns(bool) {
        _transfer(_msgSender(), _to, _amount);
        emit TransferWithReferralCode(_msgSender(), _to, _amount, _refCode);
        return true;
    }

    function transferFromWithReferralCode(address _from, address _to, uint256 _amount, uint256 _refCode) public returns(bool) {
        _transfer(_from, _to, _amount);
        emit TransferWithReferralCode(_from, _to, _amount, _refCode);
        return true;
    }

}
