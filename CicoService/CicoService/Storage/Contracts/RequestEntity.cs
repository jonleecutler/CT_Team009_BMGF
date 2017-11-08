using System;
using Microsoft.WindowsAzure.Storage.Table;

namespace CicoService.Storage.Contracts
{
    public class RequestEntity : TableEntity
    {
        public RequestEntity(string currency, decimal amount, RequestType type)
        {
            if (string.IsNullOrWhiteSpace(currency))
            {
                throw new ArgumentNullException(nameof(currency));
            }

            if (Amount <= 0)
            {
                throw new ArgumentOutOfRangeException(nameof(amount));
            }

            var id = Guid.NewGuid().ToString();

            this.PartitionKey = id;
            this.RowKey = id;
            this.Currency = currency;
            this.Amount = amount;
            this.Type = type;
        }

        public RequestEntity()
        {
        }

        public string Currency { get; set; }

        public decimal Amount { get; set; }

        public RequestType Type { get; set; }
    }
}
