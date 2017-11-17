using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Table;

using CicoService.Storage.Contracts;

namespace CicoService.Storage
{
    public class StorageProvider
    {
        private const string UserTable = "users";
        private const string RequestTable = "requests";

        private Lazy<CloudStorageAccount> storageAccount;
        private Lazy<CloudTableClient> tableClient;
        private AsyncLazy<CloudTable> userTable;
        private AsyncLazy<CloudTable> requestTable;

        public StorageProvider(string connectionString)
        {
            this.storageAccount = new Lazy<CloudStorageAccount>(() =>
            {
                return CloudStorageAccount.Parse(connectionString);
            });

            this.tableClient = new Lazy<CloudTableClient>(() =>
            {
                return storageAccount.Value.CreateCloudTableClient();
            });

            this.userTable = new AsyncLazy<CloudTable>(async () =>
            {
                var table = tableClient.Value.GetTableReference(UserTable);
                await table.CreateIfNotExistsAsync();
                return table;
            });

            this.requestTable = new AsyncLazy<CloudTable>(async () =>
            {
                var table = tableClient.Value.GetTableReference(RequestTable);
                await table.CreateIfNotExistsAsync();
                return table;
            });
        }

        public async Task<UserEntity> RetrieveUser(string id)
        {
            var table = await userTable.Value;
            var retrieveOperation = TableOperation.Retrieve<UserEntity>(id, id);

            var tableResult = await table.ExecuteAsync(retrieveOperation);

            return (UserEntity)tableResult.Result;
        }

        public async Task<string> CreateOrUpdateUser(string id, string name, string address)
        {
            var table = await userTable.Value;
            var user = new UserEntity(id, name, address);
            var insertOperation = TableOperation.InsertOrMerge(user);

            await table.ExecuteAsync(insertOperation);

            return user.RowKey;
        }

        public async Task<RequestEntity> RetrieveRequest(string id)
        {
            var table = await requestTable.Value;
            var retrieveOperation = TableOperation.Retrieve<RequestEntity>(id, id);

            var tableResult = await table.ExecuteAsync(retrieveOperation);

            return (RequestEntity)tableResult.Result;
        }

        public async Task DeleteRequest(RequestEntity request)
        {
            var table = await requestTable.Value;
            var deleteOperation = TableOperation.Delete(request);

            await table.ExecuteAsync(deleteOperation);
        }

        public async Task<IEnumerable<RequestEntity>> RetrieveRequests(RequestType type)
        {
            var table = await requestTable.Value;
            var retrieveQueryFilter = TableQuery.GenerateFilterConditionForInt("Type", QueryComparisons.Equal, (int)type);
            var retrieveQuery = new TableQuery<RequestEntity>()
            {
                FilterString = retrieveQueryFilter
            };

            var continuationToken = default(TableContinuationToken);
            var tableResult = await table.ExecuteQuerySegmentedAsync(retrieveQuery, continuationToken);

            return tableResult.Results;
        }

        public async Task<string> CreateRequest(string userId, string currency, decimal amount, string serialNumber, RequestType type)
        {
            var table = await requestTable.Value;
            var request = new RequestEntity(userId, currency, amount, serialNumber, type);
            var insertOperation = TableOperation.InsertOrReplace(request);

            await table.ExecuteAsync(insertOperation);

            return request.RowKey;
        }
    }
}
