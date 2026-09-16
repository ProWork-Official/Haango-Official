What does this mean?

Having RazorpayX API credentials (Key ID and Key Secret) alone is not enough to send real payouts.

For automatic withdrawals/payouts to work successfully, you need:

Your RazorpayX account must be activated.
Your KYC must be completed and approved.
Your account/user must have payout permissions.
You must have sufficient available balance in your RazorpayX account.
You must use Live API credentials for real payouts.
The recipient's Contact and Fund Account must be created correctly.
Your payout API configuration must be set up correctly.
How to add balance to RazorpayX

If your RazorpayX Current Account is activated, you can add money to it using:

NEFT
RTGS
IMPS
UPI
Steps
Log in to your Razorpay Dashboard.
Open RazorpayX.
Go to your Current Account / Account Details.
Find your RazorpayX Account Number and IFSC.
From your normal bank account or UPI-enabled bank account, transfer money to those RazorpayX bank details.
Wait for the transfer to be credited.
Check your RazorpayX balance.
Once sufficient funds are available, your application can use the RazorpayX Payout API to send money to customers.
Example

If a customer wants to withdraw ₹1,000:

Customer withdrawal request:

₹1,000

Your RazorpayX account should have enough available balance to cover:

₹1,000 + applicable payout fees/taxes

For example, if you have ₹10,000 available:

₹10,000 RazorpayX balance

You can make payouts such as:

Customer A → ₹500
Customer B → ₹1,000
Customer C → ₹2,000

The payouts are deducted from your RazorpayX available balance.

Important

RazorpayX API credentials do not contain money.

The API credentials only allow your application to communicate with RazorpayX.

The actual payout money must be available in your RazorpayX account.

Also, Test Mode balance is not real money and cannot be used to send real payouts.

For real automatic withdrawals, use:

RazorpayX Activated Account

Completed KYC
Payout Permissions
Sufficient RazorpayX Balance
Correct Recipient/Fund Account
Live API Credentials
Correct API Configuration

Then your application can automatically create and send payouts to customer bank accounts.