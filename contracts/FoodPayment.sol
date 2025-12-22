// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;


/**
 * @title FoodPayment
 * @dev Smart contract for processing food delivery payments
 * Converts VND to ETH and records transactions on blockchain
 */
contract FoodPayment {
    // Owner of the contract (restaurant)
    address public owner;
    
    // Exchange rate: 1 ETH = 25,000 VND (configurable)
    uint256 public exchangeRate = 25000;
    
    // Transaction structure
    struct Transaction {
        address customer;           // Customer wallet address
        uint256 amountVND;         // Amount in VND
        uint256 amountETH;         // Amount in ETH
        string orderNumber;        // Order ID from Appwrite
        uint256 timestamp;         // Block timestamp
        bool completed;            // Payment status
        string cardLast4;          // Last 4 digits of card (for reference)
    }
    
    // Mapping: orderNumber => Transaction
    mapping(string => Transaction) public transactions;
    
    // Mapping: customer address => total spent (for loyalty)
    mapping(address => uint256) public customerSpending;
    
    // Array of all order numbers (for admin dashboard)
    string[] public orderHistory;
    
    // Events
    event PaymentProcessed(
        string indexed orderNumber,
        address indexed customer,
        uint256 amountVND,
        uint256 amountETH,
        uint256 timestamp
    );
    
    event RefundIssued(
        string indexed orderNumber,
        address indexed customer,
        uint256 amountETH
    );
    
    event ExchangeRateUpdated(
        uint256 oldRate,
        uint256 newRate
    );
    
    // Constructor
    constructor() {
        owner = msg.sender;
    }
    
    // Modifier: Only owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }
    
    /**
     * @dev Process payment for an order
     * @param orderNumber Unique order ID
     * @param amountVND Total amount in VND
     * @param cardLast4 Last 4 digits of credit card (for receipt)
     */
    function processPayment(
        string memory orderNumber,
        uint256 amountVND,
        string memory cardLast4
    ) public payable {
        // Calculate required ETH based on VND amount
        uint256 requiredETH = (amountVND * 1 ether) / exchangeRate;
        
        // Verify payment amount
        require(msg.value >= requiredETH, "Insufficient payment");
        
        // Ensure order doesn't exist
        require(
            transactions[orderNumber].completed == false,
            "Order already paid"
        );
        
        // Create transaction record
        transactions[orderNumber] = Transaction({
            customer: msg.sender,
            amountVND: amountVND,
            amountETH: msg.value,
            orderNumber: orderNumber,
            timestamp: block.timestamp,
            completed: true,
            cardLast4: cardLast4
        });
        
        // Update customer spending (for loyalty program)
        customerSpending[msg.sender] += amountVND;
        
        // Add to order history
        orderHistory.push(orderNumber);
        
        // Emit event
        emit PaymentProcessed(
            orderNumber,
            msg.sender,
            amountVND,
            msg.value,
            block.timestamp
        );
        
        // Refund excess payment if any
        if (msg.value > requiredETH) {
            payable(msg.sender).transfer(msg.value - requiredETH);
        }
    }
    
    /**
     * @dev Verify if order has been paid
     * @param orderNumber Order ID to check
     */
    function verifyPayment(string memory orderNumber) 
        public 
        view 
        returns (bool) 
    {
        return transactions[orderNumber].completed;
    }
    
    /**
     * @dev Get transaction details
     * @param orderNumber Order ID
     */
    function getTransaction(string memory orderNumber)
        public
        view
        returns (
            address customer,
            uint256 amountVND,
            uint256 amountETH,
            uint256 timestamp,
            bool completed,
            string memory cardLast4
        )
    {
        Transaction memory txn = transactions[orderNumber];
        return (
            txn.customer,
            txn.amountVND,
            txn.amountETH,
            txn.timestamp,
            txn.completed,
            txn.cardLast4
        );
    }
    
    /**
     * @dev Issue refund for cancelled order (owner only)
     * @param orderNumber Order to refund
     */
    function issueRefund(string memory orderNumber) public onlyOwner {
        Transaction storage txn = transactions[orderNumber];
        
        require(txn.completed, "Transaction not found");
        require(txn.amountETH > 0, "Nothing to refund");
        
        // Mark as refunded
        txn.completed = false;
        
        // Send ETH back to customer
        payable(txn.customer).transfer(txn.amountETH);
        
        emit RefundIssued(orderNumber, txn.customer, txn.amountETH);
    }
    
    /**
     * @dev Update exchange rate (owner only)
     * @param newRate New VND per ETH rate
     */
    function updateExchangeRate(uint256 newRate) public onlyOwner {
        uint256 oldRate = exchangeRate;
        exchangeRate = newRate;
        emit ExchangeRateUpdated(oldRate, newRate);
    }
    
    /**
     * @dev Get customer loyalty points (1 point = 1000 VND spent)
     * @param customer Customer address
     */
    function getLoyaltyPoints(address customer) 
        public 
        view 
        returns (uint256) 
    {
        return customerSpending[customer] / 1000;
    }
    
    /**
     * @dev Withdraw contract balance (owner only)
     */
    function withdraw() public onlyOwner {
        payable(owner).transfer(address(this).balance);
    }
    
    /**
     * @dev Get total orders count
     */
    function getTotalOrders() public view returns (uint256) {
        return orderHistory.length;
    }
    
    /**
     * @dev Get contract balance
     */
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}