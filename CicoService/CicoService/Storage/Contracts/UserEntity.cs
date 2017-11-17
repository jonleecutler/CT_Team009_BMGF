using System;
using Microsoft.WindowsAzure.Storage.Table;

namespace CicoService.Storage.Contracts
{
    public class UserEntity : TableEntity
    {
        public UserEntity(string id, string name, string address)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                throw new ArgumentNullException(nameof(id));
            }

            this.PartitionKey = id;
            this.RowKey = id;
            this.Name = name;
            this.Address = address;
            this.Rating = 0;
            this.ImageUri = null;
        }

        public UserEntity()
        {
        }

        public string Name { get; set; }

        public string Address { get; set; }

        public int Rating { get; set; }

        public string ImageUri { get; set; }
    }
}
