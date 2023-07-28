// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


import "./DistributorERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
  
contract TokenWithDistribution is OwnableUpgradeable, IERC20Upgradeable {
    // ordinary users (OU) lvl 0
    // shareholders (SH) lvl 1 and 2 (lvl 2s are founder)

    using SafeMath for uint256;
    // fund wallet for regular shareholders
    address payable public fund_wallet;

    mapping (address => uint256) internal _balances;

    mapping (address => mapping (address => uint256)) private _allowances;

    uint256 internal _totalSupply;

    // lvl of address could be 0,1,2 as explained before
    mapping (address => uint8) internal levels;

    uint8 constant size = 3;
    // total balance of each lvl
    uint256[size] internal totalLevelSupply;
    
    // BC is balance coefficient of last time an address relaxed
    mapping (address => uint256) internal balanceCoefficients;

    // currentBC is current balance coefficient for every lvl
    uint256[size] internal currentBC;

    string private _name;
    string private _symbol;

    event ChangeLevel(address indexed account, uint256 level);

    function __TokenWithDistribution_init(string memory __name, string memory __symbol, address payable _fund_wallet, uint256 _initialSupply) internal onlyInitializing {
        OwnableUpgradeable.__Ownable_init();
        
        _name = __name;
        _symbol = __symbol;

        totalLevelSupply[0] = _initialSupply;
        totalLevelSupply[1] = 0;
        totalLevelSupply[2] = 0;

        currentBC[0] = 10**uint(decimals() * 2);
        currentBC[1] = 10**uint(decimals() * 2);
        currentBC[2] = 10**uint(decimals() * 2);

        _mint(_msgSender(), _initialSupply);
        fund_wallet = _fund_wallet;
    }

    function _mintAndDistribute(uint256 amount) internal {

        require(
            amount > 0,
            "Distribution: zero amount"
        );
        require(totalLevelSupply[1] > 0, "Distribution: total supply of VIP level one is zero");
        require(totalLevelSupply[2] > 0, "Distribution: total supply of VIP level two is zero");

        if (totalLevelSupply[2] != 0) {
            currentBC[2] = currentBC[2].mul((totalLevelSupply[2].add(amount.div(4))));
            currentBC[2] = currentBC[2].div(totalLevelSupply[2]);
        }
        if (totalLevelSupply[1] != 0) {
            currentBC[1] = currentBC[1].mul((totalLevelSupply[1].add(amount.div(4))));
            currentBC[1] = currentBC[1].div(totalLevelSupply[1]);
        }
      
        _balances[fund_wallet] = _balances[fund_wallet].add(amount.div(2));
        totalLevelSupply[0] = totalLevelSupply[0].add(amount.div(2));
        totalLevelSupply[1] = totalLevelSupply[1].add(amount.div(4));
        totalLevelSupply[2] = totalLevelSupply[2].add(amount.div(4)); 
        _totalSupply = _totalSupply.add(amount);
    }

    function _changeLevel(address account, uint8 newLvl) internal {
        require(
            account != address(0),
            "Distribution: can not change zero address level"
        );

        require(
            account != fund_wallet,
            "Distribution: can not change fund address level"
        );

        require(
            newLvl < 3,
            "Distribution: level exceeds"
        );

        relaxBalance(account);
        uint8 oldLvl = levels[account];
        levels[account] = newLvl;
        totalLevelSupply[oldLvl] = totalLevelSupply[oldLvl].sub(_balances[account]);
        totalLevelSupply[newLvl] = totalLevelSupply[newLvl].add(_balances[account]);
        balanceCoefficients[account] = currentBC[newLvl];

        emit ChangeLevel(account, newLvl);
    }

    function _mintForVIP(address account, uint256 amount) internal {
        require(levels[account] != 0, "Distribution: account is not VIP");
        require(totalLevelSupply[1] > 0, "Distribution: total supply of VIP level one is zero");
        require(totalLevelSupply[2] > 0, "Distribution: total supply of VIP level two is zero");

        relaxBalance(account);
        _balances[account] = _balances[account].add(amount);
        _balances[fund_wallet] = _balances[fund_wallet].add(amount.mul(2));

        uint8 other = 3 - levels[account];
        currentBC[other] = currentBC[other].mul((totalLevelSupply[other].add(amount)));
        currentBC[other] = currentBC[other].div(totalLevelSupply[other]);

        totalLevelSupply[0] = totalLevelSupply[0].add(amount.mul(2));
        totalLevelSupply[1] = totalLevelSupply[1].add(amount);
        totalLevelSupply[2] = totalLevelSupply[2].add(amount); 

        _totalSupply = _totalSupply.add(amount.mul(4));
    }

    function _mintForNormal(address account, uint256 amount) internal {
        require(levels[account] == 0, "Distribution: account is not normal");
        require(totalLevelSupply[1] > 0, "Distribution: total supply of VIP level one is zero");
        require(totalLevelSupply[2] > 0, "Distribution: total supply of VIP level two is zero");

        _balances[account] = _balances[account].add(amount);
        totalLevelSupply[0].add(amount);

        for (uint8 i = 1; i <= 2; i++) {
            currentBC[i] = currentBC[i].mul((totalLevelSupply[i].add(amount.div(2))));
            currentBC[i] = currentBC[i].div(totalLevelSupply[i]);
            totalLevelSupply[i] = totalLevelSupply[i].add(amount.div(2));
        }
        _totalSupply = _totalSupply.add(amount.mul(2));
    }

    /**
     * @dev Returns the name of the token.
     */
    function name() public view virtual returns (string memory) {
        return _name;
    }

    /**
     * @dev Returns the symbol of the token, usually a shorter version of the
     * name.
     */
    function symbol() public view virtual returns (string memory) {
        return _symbol;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation.
     * For example, if `decimals` equals `2`, a balance of `505` tokens should
     * be displayed to a user as `5,05` (`505 / 10 ** 2`).
     *
     * Tokens usually opt for a value of 18, imitating the relationship between
     * Ether and Wei. This is the value {ERC20} uses, unless this function is
     * overloaded;
     *
     * NOTE: This information is only used for _display_ purposes: it in
     * no way affects any of the arithmetic of the contract, including
     * {IERC20-balanceOf} and {IERC20-transfer}.
     */
    function decimals() public view virtual returns (uint8) {
        return 18;
    }

    /**
     * @dev See {IERC20-totalSupply}.
     */
    function totalSupply() public view virtual override returns (uint256) {
        return _totalSupply;
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function balanceOf(address account) public view virtual override returns (uint256) {
        if (levels[account] == 0)
            return _balances[account];
        return (
            currentBC[levels[account]].mul(_balances[account])).div(balanceCoefficients[account]
        );
    }

    /**
     * @dev See {IERC20-balanceOf}.
     */
    function levelOf(address account) public view virtual returns (uint8) {
        return levels[account];
    }

    /**
     * @dev See {IERC20-transfer}.
     *
     * Requirements:
     *
     * - `recipient` cannot be the zero address.
     * - the caller must have a balance of at least `amount`.
     */
    function transfer(address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /**
     * @dev See {IERC20-allowance}.
     */
    function allowance(address owner, address spender) public view virtual override returns (uint256) {
        return _allowances[owner][spender];
    }

    /**
     * @dev See {IERC20-approve}.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function approve(address spender, uint256 amount) public virtual override returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    /**
     * @dev See {IERC20-transferFrom}.
     *
     * Emits an {Approval} event indicating the updated allowance. This is not
     * required by the EIP. See the note at the beginning of {ERC20}.
     *
     * Requirements:
     *
     * - `sender` and `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     * - the caller must have allowance for ``sender``'s tokens of at least
     * `amount`.
     */
    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _transfer(sender, recipient, amount);

        uint256 currentAllowance = _allowances[sender][_msgSender()];
        require(currentAllowance >= amount, "ERC20: transfer amount exceeds allowance");
        _approve(sender, _msgSender(), currentAllowance - amount);

        return true;
    }

    /**
     * @dev Atomically increases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     */
    function increaseAllowance(address spender, uint256 addedValue) public virtual returns (bool) {
        _approve(_msgSender(), spender, _allowances[_msgSender()][spender] + addedValue);
        return true;
    }

    /**
     * @dev Atomically decreases the allowance granted to `spender` by the caller.
     *
     * This is an alternative to {approve} that can be used as a mitigation for
     * problems described in {IERC20-approve}.
     *
     * Emits an {Approval} event indicating the updated allowance.
     *
     * Requirements:
     *
     * - `spender` cannot be the zero address.
     * - `spender` must have allowance for the caller of at least
     * `subtractedValue`.
     */
    function decreaseAllowance(address spender, uint256 subtractedValue) public virtual returns (bool) {
        uint256 currentAllowance = _allowances[_msgSender()][spender];
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        _approve(_msgSender(), spender, currentAllowance - subtractedValue);

        return true;
    }

    /**
     * @dev Moves tokens `amount` from `sender` to `recipient`.
     *
     * This is internal function is equivalent to {transfer}, and can be used to
     * e.g. implement automatic token fees, slashing mechanisms, etc.
     *
     * Emits a {Transfer} event.
     *
     * Requirements:
     *
     * - `sender` cannot be the zero address.
     * - `recipient` cannot be the zero address.
     * - `sender` must have a balance of at least `amount`.
     */
    function _transfer(address sender, address recipient, uint256 amount) internal virtual {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");

        _beforeTokenTransfer(sender, recipient, amount);

        uint256 senderBalance = _balances[sender];
        require(senderBalance >= amount, "ERC20: transfer amount exceeds balance");
        _balances[sender] = senderBalance - amount;
        _balances[recipient] += amount;

        emit Transfer(sender, recipient, amount);
    }

    /** @dev Creates `amount` tokens and assigns them to `account`, increasing
     * the total supply.
     *
     * Emits a {Transfer} event with `from` set to the zero address.
     *
     * Requirements:
     *
     * - `to` cannot be the zero address.
     */
    function _mint(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: mint to the zero address");

        _beforeTokenTransfer(address(0), account, amount);

        _totalSupply += amount;
        _balances[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    /**
     * @dev Destroys `amount` tokens from `account`, reducing the
     * total supply.
     *
     * Emits a {Transfer} event with `to` set to the zero address.
     *
     * Requirements:
     *
     * - `account` cannot be the zero address.
     * - `account` must have at least `amount` tokens.
     */
    function _burn(address account, uint256 amount) internal virtual {
        require(account != address(0), "ERC20: burn from the zero address");

        _beforeTokenTransfer(account, address(0), amount);

        uint256 accountBalance = _balances[account];
        require(accountBalance >= amount, "ERC20: burn amount exceeds balance");
        _balances[account] = accountBalance - amount;
        _totalSupply -= amount;

        emit Transfer(account, address(0), amount);
    }

    /**
     * @dev Sets `amount` as the allowance of `spender` over the `owner` s tokens.
     *
     * This internal function is equivalent to `approve`, and can be used to
     * e.g. set automatic allowances for certain subsystems, etc.
     *
     * Emits an {Approval} event.
     *
     * Requirements:
     *
     * - `owner` cannot be the zero address.
     * - `spender` cannot be the zero address.
     */
    function _approve(address owner, address spender, uint256 amount) internal virtual {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /**
     * @dev Hook that is called before any transfer of tokens. This includes
     * minting and burning.
     *
     * Calling conditions:
     *
     * - when `from` and `to` are both non-zero, `amount` of ``from``'s tokens
     * will be to transferred to `to`.
     * - when `from` is zero, `amount` tokens will be minted for `to`.
     * - when `to` is zero, `amount` of ``from``'s tokens will be burned.
     * - `from` and `to` are never both zero.
     *
     * To learn more about hooks, head to xref:ROOT:extending-contracts.adoc#using-hooks[Using Hooks].
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual { 
        relaxBalance(from);
        relaxBalance(to);
        totalLevelSupply[levels[from]] = totalLevelSupply[levels[from]].sub(amount);
        totalLevelSupply[levels[to]] = totalLevelSupply[levels[to]].add(amount);
    }

    
    function relaxBalance(address account) internal {
        if (levels[account] == 0)
            return;
        _balances[account] = (currentBC[levels[account]].mul(_balances[account])).div(balanceCoefficients[account]);
        balanceCoefficients[account] = currentBC[levels[account]];
    }
}

