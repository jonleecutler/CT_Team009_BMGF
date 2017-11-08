using System;
using Microsoft.WindowsAzure.Storage.Table;

namespace CicoService.Storage.Contracts
{
    public class UserEntity : TableEntity
    {
        public UserEntity(string id, string firstName, string lastName)
        {
            if (string.IsNullOrWhiteSpace(id))
            {
                throw new ArgumentNullException(nameof(id));
            }

            this.PartitionKey = id;
            this.RowKey = id;
            this.FirstName = firstName;
            this.LastName = lastName;
            this.Rating = 5;
        }

        public UserEntity()
        {
        }

        public string FirstName { get; set; }

        public string LastName { get; set; }

        public int Rating { get; set; }
    }
}
