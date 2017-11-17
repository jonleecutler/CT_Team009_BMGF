using System;
using Microsoft.WindowsAzure.Storage.Table;

namespace CicoService.Storage.Contracts
{
    public class RequestEntity : TableEntity
    {
        public RequestEntity(string userId, string currency, decimal amount, string serialNumber, RequestType type)
        {
            if (string.IsNullOrWhiteSpace(userId))
            {
                throw new ArgumentNullException(nameof(userId));
            }

            if (string.IsNullOrWhiteSpace(currency))
            {
                throw new ArgumentNullException(nameof(currency));
            }

            if (amount <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(amount));
            }

            var id = Guid.NewGuid().ToString();

            this.PartitionKey = id;
            this.RowKey = id;
            this.UserId = userId;
            this.Currency = currency;
            this.Amount = amount.ToString();
            this.SerialNumber = serialNumber;
            this.Type = (int)type;
        }

        public RequestEntity()
        {
        }

        public string UserId { get; set; }

        public string Currency { get; set; }

        public string Amount { get; set; }

        public string SerialNumber { get; set; }

        public int Type { get; set; }
    }
}
